package com.logipulse.scheduler;

import com.logipulse.model.RouteAnomaly;
import com.logipulse.model.Shipment;
import com.logipulse.repository.RouteAnomalyRepository;
import com.logipulse.repository.ShipmentRepository;
import com.logipulse.service.AlertService;
import com.logipulse.service.GlobalDisruptionService;
import com.logipulse.service.ShipmentService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Component
public class AutoDisruptionScheduler {

    @Autowired private ShipmentRepository      shipmentRepository;
    @Autowired private RouteAnomalyRepository  routeAnomalyRepository;
    @Autowired private GlobalDisruptionService globalDisruptionService;
    @Autowired private ShipmentService         shipmentService;

    @Autowired
    @Lazy
    private AlertService alertService;

    // ----------------------------------------------------------------
    // AUTO-DISRUPTION — every 3 minutes, max 1 disruption per cycle
    // ----------------------------------------------------------------
    @Scheduled(fixedRate = 180000)
    public void checkForDisruptions() {
        List<Shipment> inTransit = shipmentRepository.findByStatus("IN_TRANSIT");
        if (inTransit.isEmpty()) return;

        int disrupted = 0;

        for (Shipment s : inTransit) {
            if (disrupted >= 1) break;

            // Skip if recently disrupted
            boolean recentAnomaly = routeAnomalyRepository
                    .findByShipmentId(s.getId()).stream()
                    .anyMatch(a -> a.getDetectedAt() != null &&
                            a.getDetectedAt().isAfter(LocalDateTime.now().minusMinutes(10)));
            if (recentAnomaly) continue;

            // Use GlobalDisruptionService for mode-aware check
            try {
                Map<String, Object> disruption =
                        globalDisruptionService.checkDisruptionForShipment(s);

                if (disruption != null) {
                    applyDisruption(s,
                            (String) disruption.getOrDefault("severity",   "MEDIUM"),
                            (String) disruption.getOrDefault("description", "Disruption detected")
                    );
                    disrupted++;
                }
            } catch (Exception e) {
                System.err.println("AutoDisruption check failed: " + e.getMessage());
            }
        }
    }

    // ----------------------------------------------------------------
    // AUTO-REROUTE — every 30 seconds, reroutes after 60s of DELAYED
    // ----------------------------------------------------------------
    @Scheduled(fixedRate = 30000)
    public void autoRerouteDelayedShipments() {
        List<Shipment> delayed = shipmentRepository.findByStatus("DELAYED");

        for (Shipment s : delayed) {
            List<RouteAnomaly> anomalies =
                    routeAnomalyRepository.findByShipmentId(s.getId());

            if (anomalies.isEmpty()) {
                performAutoReroute(s); continue;
            }

            RouteAnomaly latest = anomalies.stream()
                    .filter(a -> a.getDetectedAt() != null)
                    .max((a, b) -> a.getDetectedAt().compareTo(b.getDetectedAt()))
                    .orElse(null);

            if (latest == null ||
                    latest.getDetectedAt().isBefore(LocalDateTime.now().minusSeconds(60))) {
                performAutoReroute(s);
            }
        }
    }

    // ----------------------------------------------------------------
    // Apply disruption to shipment
    // ----------------------------------------------------------------
    private void applyDisruption(Shipment s, String severity, String description) {
        s.setStatus("DELAYED");
        shipmentRepository.save(s);

        RouteAnomaly anomaly = new RouteAnomaly();
        anomaly.setShipmentId(s.getId());
        anomaly.setSeverity(severity);
        anomaly.setDescription(description);
        anomaly.setDetectedAt(LocalDateTime.now());
        routeAnomalyRepository.save(anomaly);

        shipmentService.addMilestone(s.getId(), "DELAYED", description, s.getOrigin());

        try {
            alertService.createDisruptionAlert(
                    s.getId(), s.getTrackingId(), severity, description,
                    s.getOrigin()      != null ? s.getOrigin()      : "Unknown",
                    s.getDestination() != null ? s.getDestination() : "Unknown"
            );
        } catch (Exception e) {
            System.err.println("AutoDisruption alert failed: " + e.getMessage());
        }

        System.out.println("AutoDisruption [" + getModeIcon(s.getTransportMode()) +
                "]: " + s.getTrackingId() + " — " +
                description.substring(0, Math.min(60, description.length())));
    }

    // ----------------------------------------------------------------
    // Auto-reroute with mode-aware ETA extension
    // ----------------------------------------------------------------
    private void performAutoReroute(Shipment s) {
        try {
            s.setStatus("REROUTED");

            // Mode-aware ETA extension
            String mode = s.getTransportMode() != null
                    ? s.getTransportMode().toUpperCase() : "TRUCK";
            int extensionMinutes = switch (mode) {
                case "SHIP"  -> 8;   // Ships take longer to reroute
                case "PLANE" -> 4;   // Planes reroute faster
                case "TRAIN" -> 5;   // Trains moderate
                default      -> 3;   // Trucks quickest
            };

            LocalDateTime newEta = s.getEstimatedDeliveryTime() != null
                    ? s.getEstimatedDeliveryTime().plusMinutes(extensionMinutes)
                    : LocalDateTime.now().plusMinutes(extensionMinutes);
            s.setEstimatedDeliveryTime(newEta);

            shipmentRepository.save(s);

            shipmentService.addMilestone(s.getId(), "REROUTED",
                    getModeIcon(mode) + " AI Auto-Reroute: Safest alternate " +
                            getModeRouteName(mode) + " selected. ETA +" + extensionMinutes + " min.",
                    s.getOrigin());

            alertService.createRerouteAlert(s);

            System.out.println("AutoReroute [" + getModeIcon(mode) + "]: " +
                    s.getTrackingId() + " → REROUTED (+" + extensionMinutes + "min)");

        } catch (Exception e) {
            System.err.println("AutoReroute failed: " + e.getMessage());
        }
    }

    private String getModeIcon(String mode) {
        if (mode == null) return "🚛";
        return switch (mode.toUpperCase()) {
            case "SHIP"  -> "🚢";
            case "PLANE" -> "✈️";
            case "TRAIN" -> "🚂";
            default      -> "🚛";
        };
    }

    private String getModeRouteName(String mode) {
        if (mode == null) return "corridor";
        return switch (mode.toUpperCase()) {
            case "SHIP"  -> "sea lane";
            case "PLANE" -> "flight path";
            case "TRAIN" -> "rail corridor";
            default      -> "road corridor";
        };
    }
}