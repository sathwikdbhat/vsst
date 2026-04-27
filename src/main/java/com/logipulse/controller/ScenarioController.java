package com.logipulse.controller;

import com.logipulse.model.RouteAnomaly;
import com.logipulse.model.Shipment;
import com.logipulse.model.User;
import com.logipulse.repository.RouteAnomalyRepository;
import com.logipulse.repository.ShipmentRepository;
import com.logipulse.service.AlertService;
import com.logipulse.service.GlobalDisruptionService;
import com.logipulse.service.ShipmentService;
import com.logipulse.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/scenarios")
@CrossOrigin(origins = "*")
public class ScenarioController {

    @Autowired private ShipmentRepository     shipmentRepository;
    @Autowired private RouteAnomalyRepository anomalyRepository;
    @Autowired private ShipmentService        shipmentService;
    @Autowired private GlobalDisruptionService globalDisruptionService;
    @Autowired private UserService            userService;

    @Autowired
    @Lazy
    private AlertService alertService;

    private User getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() ||
                "anonymousUser".equals(auth.getPrincipal())) return null;
        return userService.findByUsername(auth.getName()).orElse(null);
    }

    @PostMapping("/simulate")
    public ResponseEntity<?> simulate(@RequestBody Map<String, String> body) {
        User user = getCurrentUser();
        if (user == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Not authenticated"));
        }

        String scenarioType = body.getOrDefault("type", "SEVERE_WEATHER").toUpperCase();

        // Get all active shipments for this user
        List<Shipment> userShipments = shipmentService.getShipmentsForUser(user).stream()
                .filter(s -> !"DELIVERED".equals(s.getStatus()))
                .toList();

        // Run scenario simulation
        Map<String, Object> scenarioResult =
                globalDisruptionService.simulateGlobalScenario(scenarioType, userShipments);

        // Apply disruptions to affected shipments
        @SuppressWarnings("unchecked")
        List<Long> affectedIds = (List<Long>) scenarioResult.get("affectedIds");
        String     description = (String) scenarioResult.get("description");
        String     severity    = (String) scenarioResult.get("severity");
        int        disrupted   = 0;

        if (affectedIds != null) {
            for (Long sid : affectedIds) {
                try {
                    Shipment s = shipmentRepository.findById(sid).orElse(null);
                    if (s == null) continue;

                    s.setStatus("DELAYED");
                    shipmentRepository.save(s);

                    RouteAnomaly anomaly = new RouteAnomaly();
                    anomaly.setShipmentId(sid);
                    anomaly.setSeverity(severity);
                    anomaly.setDescription(description);
                    anomaly.setDetectedAt(LocalDateTime.now());
                    anomalyRepository.save(anomaly);

                    shipmentService.addMilestone(sid, "DELAYED", description, s.getOrigin());

                    try {
                        alertService.createDisruptionAlert(sid, s.getTrackingId(),
                                severity, description,
                                s.getOrigin()      != null ? s.getOrigin()      : "Unknown",
                                s.getDestination() != null ? s.getDestination() : "Unknown");
                    } catch (Exception e) {
                        System.err.println("Scenario alert: " + e.getMessage());
                    }
                    disrupted++;
                } catch (Exception e) {
                    System.err.println("Scenario apply failed: " + e.getMessage());
                }
            }
        }

        Map<String, Object> response = new HashMap<>(scenarioResult);
        response.put("actuallyDisrupted", disrupted);
        response.put("message",
                disrupted > 0
                        ? disrupted + " shipment(s) disrupted by " + scenarioResult.get("title")
                        : "No active shipments of the required type were available to disrupt."
        );

        System.out.println("Scenario [" + scenarioType + "]: " +
                disrupted + " shipments disrupted");
        return ResponseEntity.ok(response);
    }
}