package com.logipulse.controller;

import com.logipulse.model.Client;
import com.logipulse.model.ShipmentMilestone;
import com.logipulse.model.User;
import com.logipulse.service.ClientService;
import com.logipulse.service.ShipmentService;
import com.logipulse.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/clients")
@CrossOrigin(origins = "*")
public class ClientController {

    @Autowired
    private ClientService clientService;

    @Autowired
    private ShipmentService shipmentService;

    @Autowired
    private UserService userService;

    private User getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() ||
                "anonymousUser".equals(auth.getPrincipal())) return null;
        return userService.findByUsername(auth.getName()).orElse(null);
    }

    // GET /api/clients — only this user's clients
    @GetMapping
    public ResponseEntity<?> getAllClients() {
        User user = getCurrentUser();
        if (user == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Not authenticated"));
        }
        return ResponseEntity.ok(clientService.getClientsForUser(user));
    }

    // GET /api/clients/senders
    @GetMapping("/senders")
    public ResponseEntity<?> getSenders() {
        User user = getCurrentUser();
        if (user == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Not authenticated"));
        }
        return ResponseEntity.ok(clientService.getSendersForUser(user));
    }

    // GET /api/clients/receivers
    @GetMapping("/receivers")
    public ResponseEntity<?> getReceivers() {
        User user = getCurrentUser();
        if (user == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Not authenticated"));
        }
        return ResponseEntity.ok(clientService.getReceiversForUser(user));
    }

    // GET /api/clients/{id}
    @GetMapping("/{id}")
    public ResponseEntity<?> getById(@PathVariable Long id) {
        User user = getCurrentUser();
        if (user == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Not authenticated"));
        }
        Optional<Client> opt = clientService.getById(id);
        if (opt.isEmpty()) {
            return ResponseEntity.status(404).body(Map.of("error", "Client not found"));
        }
        return ResponseEntity.ok(opt.get());
    }

    // POST /api/clients — create (only 5 fields needed)
    @PostMapping
    public ResponseEntity<?> createClient(@RequestBody Map<String, String> body) {
        User user = getCurrentUser();
        if (user == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Not authenticated"));
        }

        if (body.get("companyName") == null || body.get("companyName").isBlank()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "Company name is required."));
        }

        try {
            Client created = clientService.createClient(body, user);
            return ResponseEntity.status(201).body(Map.of(
                    "client",  created,
                    "message", created.getCompanyName() + " added to " +
                            created.getClientType() + " directory"
            ));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // DELETE /api/clients/{id}
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteClient(@PathVariable Long id) {
        User user = getCurrentUser();
        if (user == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Not authenticated"));
        }
        if (!"ADMIN".equals(user.getRole())) {
            return ResponseEntity.status(403)
                    .body(Map.of("error", "Only admins can delete clients."));
        }

        boolean deleted = clientService.deleteClient(id);
        if (deleted) {
            return ResponseEntity.ok(Map.of("message", "Client deleted"));
        }
        return ResponseEntity.status(404).body(Map.of("error", "Client not found"));
    }

    // GET /api/shipments/{id}/milestones — via client controller for backward compat
    @GetMapping("/milestones/{shipmentId}")
    public ResponseEntity<?> getMilestones(@PathVariable Long shipmentId) {
        User user = getCurrentUser();
        if (user == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Not authenticated"));
        }
        List<ShipmentMilestone> milestones =
                shipmentService.getMilestonesForShipment(shipmentId);
        return ResponseEntity.ok(milestones);
    }
}