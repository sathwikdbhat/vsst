package com.logipulse.scheduler;

import com.logipulse.model.Shipment;
import com.logipulse.repository.ShipmentRepository;
import com.logipulse.service.AlertService;
import com.logipulse.service.CarrierService;
import com.logipulse.service.VehicleService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Component
public class DeliveryScheduler {

    @Autowired
    private ShipmentRepository shipmentRepository;

    @Autowired
    private VehicleService vehicleService;

    @Autowired
    private CarrierService carrierService;

    @Autowired
    @Lazy
    private AlertService alertService;

    // ----------------------------------------------------------------
    // AUTO-DELIVER — every 10 seconds
    // Handles ALL transport modes
    // ----------------------------------------------------------------
    @Scheduled(fixedRate = 10000)
    public void autoDeliverExpiredShipments() {
        LocalDateTime now = LocalDateTime.now();

        List<Shipment> expired = shipmentRepository.findAll().stream()
                .filter(s ->
                        ("IN_TRANSIT".equals(s.getStatus()) || "REROUTED".equals(s.getStatus()))
                                && s.getEstimatedDeliveryTime() != null
                                && s.getEstimatedDeliveryTime().isBefore(now)
                )
                .toList();

        for (Shipment s : expired) {
            s.setStatus("DELIVERED");
            if (s.getDestLat() != null) {
                s.setCurrentLat(s.getDestLat());
                s.setCurrentLng(s.getDestLng());
            }
            shipmentRepository.save(s);

            // Free carrier based on mode
            freeCarrier(s);

            try { alertService.createDeliveryAlert(s); }
            catch (Exception e) {
                System.err.println("DeliveryScheduler: alert failed — " + e.getMessage());
            }

            System.out.println("✅ AutoDeliver [" + getModeIcon(s.getTransportMode())
                    + "]: " + s.getTrackingId());
        }
    }

    // ----------------------------------------------------------------
    // SIMULATE MOVEMENT — every 3 seconds
    // Speed varies dramatically by transport mode
    // ----------------------------------------------------------------
    @Scheduled(fixedRate = 3000)
    public void simulateRealisticMovement() {
        LocalDateTime now = LocalDateTime.now();

        List<Shipment> moving = shipmentRepository.findAll().stream()
                .filter(s ->
                        ("IN_TRANSIT".equals(s.getStatus()) || "REROUTED".equals(s.getStatus()))
                                && s.getDestLat() != null
                                && s.getEstimatedDeliveryTime() != null
                                && s.getEstimatedDeliveryTime().isAfter(now)
                                && s.getCurrentLat() != null
                )
                .toList();

        for (Shipment s : moving) {
            double currLat = s.getCurrentLat();
            double currLng = s.getCurrentLng();
            double dLat    = s.getDestLat() - currLat;
            double dLng    = s.getDestLng() - currLng;

            // Longitude wrapping for trans-Pacific routes
            if (dLng > 180)  dLng -= 360;
            if (dLng < -180) dLng += 360;

            double distDeg = Math.sqrt(dLat * dLat + dLng * dLng);
            if (distDeg < 0.002) continue;

            long secondsLeft = ChronoUnit.SECONDS.between(
                    now, s.getEstimatedDeliveryTime());
            if (secondsLeft <= 0) continue;

            // Mode-aware speed multiplier
            // Planes move much faster in degree-space, ships much slower
            double speedMultiplier = getModeSpeedMultiplier(
                    s.getTransportMode(), s.getStatus());

            double stepsRemaining = Math.max(1, secondsLeft / 3.0);
            double baseStep       = distDeg / stepsRemaining;
            double jitter         = 0.88 + (Math.random() * 0.24);
            // Planes: larger step; Ships: smaller relative step
            double step           = Math.min(
                    baseStep * jitter * speedMultiplier,
                    distDeg * 0.09 * speedMultiplier
            );

            s.setCurrentLat(currLat + (dLat / distDeg) * step);
            // Handle longitude wrap
            double newLng = currLng + (dLng / distDeg) * step;
            if (newLng > 180)  newLng -= 360;
            if (newLng < -180) newLng += 360;
            s.setCurrentLng(newLng);

            shipmentRepository.save(s);
        }
    }

    // ----------------------------------------------------------------
    // Speed multiplier per mode (vs base truck speed)
    // TRUCK: 1.0 (30-80 km/h)
    // SHIP:  0.5 (15-45 km/h — slower)
    // PLANE: 12.0 (800-950 km/h — much faster)
    // TRAIN: 2.5 (80-250 km/h — faster than truck)
    // ----------------------------------------------------------------
    private double getModeSpeedMultiplier(String mode, String status) {
        double base;
        switch (mode == null ? "TRUCK" : mode.toUpperCase()) {
            case "PLANE": base = 12.0; break;
            case "TRAIN": base = 2.5;  break;
            case "SHIP":  base = 0.5;  break;
            default:      base = 1.0;  break; // TRUCK
        }
        // Delayed mode = slower
        if ("DELAYED".equals(status)) base *= 0.3;
        // Add small jitter
        return base * (0.9 + Math.random() * 0.2);
    }

    // ----------------------------------------------------------------
    // Free carrier/vehicle on delivery
    // ----------------------------------------------------------------
    private void freeCarrier(Shipment s) {
        String mode = s.getTransportMode() != null
                ? s.getTransportMode().toUpperCase() : "TRUCK";

        if ("TRUCK".equals(mode) && s.getVehicleId() != null) {
            try { vehicleService.updateStatus(s.getVehicleId(), "AVAILABLE"); }
            catch (Exception e) {
                System.err.println("DeliveryScheduler: vehicle status update failed");
            }
        } else if (s.getCarrierId() != null) {
            try { carrierService.updateStatus(s.getCarrierId(), "AVAILABLE"); }
            catch (Exception e) {
                System.err.println("DeliveryScheduler: carrier status update failed");
            }
        }
    }

    private String getModeIcon(String mode) {
        if (mode == null) return "🚛";
        switch (mode.toUpperCase()) {
            case "SHIP":  return "🚢";
            case "PLANE": return "✈️";
            case "TRAIN": return "🚂";
            default:      return "🚛";
        }
    }
}