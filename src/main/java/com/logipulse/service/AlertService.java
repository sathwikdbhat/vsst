package com.logipulse.service;

import com.logipulse.model.AppNotification;
import com.logipulse.model.Shipment;
import com.logipulse.model.User;
import com.logipulse.repository.CarrierRepository;
import com.logipulse.repository.NotificationRepository;
import com.logipulse.repository.ShipmentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class AlertService {

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private ShipmentRepository shipmentRepository;

    @Autowired
    private CarrierRepository carrierRepository;

    @Autowired
    private UserService userService;

    // ----------------------------------------------------------------
    // CREATE DISRUPTION ALERT (In-App Only)
    // ----------------------------------------------------------------
    public AppNotification createDisruptionAlert(Long shipmentId, String trackingId,
                                                 String severity, String description, String origin, String destination) {

        AppNotification n = new AppNotification();
        n.setType("DISRUPTION");
        n.setSeverity("HIGH".equals(severity) ? "DANGER" : "WARNING");
        n.setTitle("⚡ Route Disruption — " + trackingId);
        n.setMessage(description);
        n.setTrackingId(trackingId);
        n.setShipmentId(shipmentId);
        n.setRead(false);
        n.setEmailSent(false); // Kept for database compatibility, but no longer used
        n.setCreatedAt(LocalDateTime.now());

        System.out.println("AlertService: In-App Disruption Alert created for " + trackingId);
        return notificationRepository.save(n);
    }

    // ----------------------------------------------------------------
    // CREATE DELIVERY ALERT (In-App Only)
    // ----------------------------------------------------------------
    public AppNotification createDeliveryAlert(Shipment s) {
        AppNotification n = new AppNotification();
        n.setType("DELIVERED");
        n.setSeverity("SUCCESS");
        n.setTitle("✅ Delivered — " + s.getTrackingId());
        n.setMessage(s.getCargoType() + " delivered to " +
                (s.getDestination() != null ? s.getDestination() : "destination") +
                (s.getCustomerName() != null ? " for " + s.getCustomerName() : "") + ".");
        n.setTrackingId(s.getTrackingId());
        n.setShipmentId(s.getId());
        n.setRead(false);
        n.setEmailSent(false);
        n.setCreatedAt(LocalDateTime.now());

        System.out.println("AlertService: In-App Delivery Alert created for " + s.getTrackingId());
        return notificationRepository.save(n);
    }

    // ----------------------------------------------------------------
    // CREATE REROUTE ALERT (In-App Only)
    // ----------------------------------------------------------------
    public AppNotification createRerouteAlert(Shipment s) {
        AppNotification n = new AppNotification();
        n.setType("REROUTE");
        n.setSeverity("WARNING");
        n.setTitle("🔄 Rerouted — " + s.getTrackingId());
        n.setMessage("Shipment rerouted via alternate corridor. " +
                "New ETA: " + (s.getEstimatedDeliveryTime() != null
                ? s.getEstimatedDeliveryTime().toString().replace("T", " at ")
                  .substring(0, Math.min(18, s.getEstimatedDeliveryTime().toString().length()))
                : "recalculated") + ".");
        n.setTrackingId(s.getTrackingId());
        n.setShipmentId(s.getId());
        n.setRead(false);
        n.setEmailSent(false);
        n.setCreatedAt(LocalDateTime.now());

        System.out.println("AlertService: In-App Reroute Alert created for " + s.getTrackingId());
        return notificationRepository.save(n);
    }

    // ----------------------------------------------------------------
    // CREATE HIGH RISK ALERT (In-App Only)
    // ----------------------------------------------------------------
    public AppNotification createHighRiskAlert(Shipment s) {
        AppNotification n = new AppNotification();
        n.setType("HIGH_RISK");
        n.setSeverity("DANGER");
        n.setTitle("🚨 High Risk — " + s.getTrackingId());
        n.setMessage("HIGH priority shipment (" + s.getCargoType() +
                ") is DELAYED. Immediate rerouting recommended.");
        n.setTrackingId(s.getTrackingId());
        n.setShipmentId(s.getId());
        n.setRead(false);
        n.setEmailSent(false);
        n.setCreatedAt(LocalDateTime.now());
        return notificationRepository.save(n);
    }

    // ----------------------------------------------------------------
    // FETCH
    // ----------------------------------------------------------------
    public List<AppNotification> getAllNotifications() {
        return notificationRepository.findAllByOrderByCreatedAtDesc();
    }

    public long getUnreadCount() {
        return notificationRepository.countByReadFalse();
    }

    // ----------------------------------------------------------------
    // GET — filtered by shipment owner/role
    // ----------------------------------------------------------------
    public List<AppNotification> getNotificationsForUser(User user) {
        Long ownerId = userService.resolveOwnerId(user);

        // Drivers see notifications for shipments assigned to them
        if ("DRIVER".equals(user.getRole())) {
            List<Long> assignedShipmentIds = shipmentRepository.findAll().stream()
                    .filter(s -> user.getFullName().equalsIgnoreCase(s.getAssignedDriverName())
                            || user.getUsername().equalsIgnoreCase(s.getAssignedDriverName()))
                    .map(Shipment::getId).toList();

            return notificationRepository.findAllByOrderByCreatedAtDesc().stream()
                    .filter(n -> n.getShipmentId() != null && assignedShipmentIds.contains(n.getShipmentId()))
                    .toList();
        }

        // Partners see notifications for shipments using their carriers
        if ("PARTNER".equals(user.getRole()) && user.getPartnerCompanyId() != null) {
            List<Long> partnerShipmentIds = shipmentRepository.findAll().stream()
                    .filter(s -> {
                        if (s.getCarrierId() == null) return false;
                        return carrierRepository.findById(s.getCarrierId())
                                .map(c -> user.getPartnerCompanyId().equals(c.getPartnerCompanyId()))
                                .orElse(false);
                    })
                    .map(Shipment::getId).toList();

            return notificationRepository.findAllByOrderByCreatedAtDesc().stream()
                    .filter(n -> n.getShipmentId() != null && partnerShipmentIds.contains(n.getShipmentId()))
                    .toList();
        }

        // Admins/Operators see notifications owned by their tenant ID
        List<Long> ownedShipmentIds = shipmentRepository.findByOwnerId(ownerId)
                .stream().map(Shipment::getId).toList();

        return notificationRepository.findAllByOrderByCreatedAtDesc()
                .stream()
                .filter(n -> n.getShipmentId() == null || ownedShipmentIds.contains(n.getShipmentId()))
                .toList();
    }

    public long getUnreadCountForUser(User user) {
        return getNotificationsForUser(user).stream()
                .filter(n -> !n.isRead()).count();
    }

    // ----------------------------------------------------------------
    // MARK READ
    // ----------------------------------------------------------------
    public void markAsRead(Long id) {
        notificationRepository.findById(id).ifPresent(n -> {
            n.setRead(true);
            notificationRepository.save(n);
        });
    }

    public void markAllAsRead() {
        List<AppNotification> unread = notificationRepository.findByReadFalseOrderByCreatedAtDesc();
        unread.forEach(n -> n.setRead(true));
        notificationRepository.saveAll(unread);
    }

    public void clearAll() {
        notificationRepository.deleteAll();
    }

    // ----------------------------------------------------------------
    // SCHEDULED — check high-risk every 2 minutes
    // ----------------------------------------------------------------
    @Scheduled(fixedRate = 120000)
    public void checkHighRiskShipments() {
        List<Shipment> highRiskDelayed = shipmentRepository.findAll().stream()
                .filter(s -> "DELAYED".equals(s.getStatus()) && "HIGH".equals(s.getPriority()))
                .toList();

        highRiskDelayed.forEach(s -> {
            boolean alreadyAlerted = notificationRepository
                    .findByTypeOrderByCreatedAtDesc("HIGH_RISK")
                    .stream()
                    .anyMatch(n -> s.getTrackingId().equals(n.getTrackingId()));

            if (!alreadyAlerted) {
                createHighRiskAlert(s);
                System.out.println("AlertService: High-risk alert for " + s.getTrackingId());
            }
        });
    }
}