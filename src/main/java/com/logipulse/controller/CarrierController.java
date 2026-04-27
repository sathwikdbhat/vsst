package com.logipulse.controller;

import com.logipulse.model.Carrier;
import com.logipulse.model.User;
import com.logipulse.service.CarrierService;
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
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/carriers")
@CrossOrigin(origins = "*")
public class CarrierController {

    @Autowired private CarrierService carrierService;
    @Autowired private UserService    userService;

    private User getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() ||
                "anonymousUser".equals(auth.getPrincipal())) return null;
        return userService.findByUsername(auth.getName()).orElse(null);
    }

    // GET /api/carriers?type=SHIP
    @GetMapping
    public ResponseEntity<?> getCarriers(
            @RequestParam(required = false) String type) {
        User user = getCurrentUser();
        if (user == null) return ResponseEntity.status(401)
                .body(Map.of("error", "Not authenticated"));

        List<Carrier> carriers = (type != null && !type.isBlank())
                ? carrierService.getCarriersByType(user, type)
                : carrierService.getCarriersForUser(user);
        return ResponseEntity.ok(carriers);
    }

    // GET /api/carriers/available?type=SHIP
    @GetMapping("/available")
    public ResponseEntity<?> getAvailable(
            @RequestParam(required = false) String type) {
        User user = getCurrentUser();
        if (user == null) return ResponseEntity.status(401)
                .body(Map.of("error", "Not authenticated"));

        List<Carrier> available = (type != null && !type.isBlank())
                ? carrierService.getAvailableByType(user, type)
                : carrierService.getCarriersForUser(user);
        return ResponseEntity.ok(available);
    }

    // POST /api/carriers
    @PostMapping
    public ResponseEntity<?> createCarrier(@RequestBody Map<String, Object> body) {
        User user = getCurrentUser();
        if (user == null) return ResponseEntity.status(401)
                .body(Map.of("error", "Not authenticated"));
        if (!"ADMIN".equals(user.getRole())) return ResponseEntity.status(403)
                .body(Map.of("error", "Only admins can register carriers"));

        try {
            Carrier created = carrierService.createCarrier(body, user);
            return ResponseEntity.status(201).body(Map.of(
                    "carrier", created,
                    "message", created.getCarrierType() + " '" + created.getIdentifier()
                            + "' registered successfully"
            ));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // PUT /api/carriers/{id}
    @PutMapping("/{id}")
    public ResponseEntity<?> updateCarrier(@PathVariable Long id,
                                           @RequestBody Map<String, Object> body) {
        User user = getCurrentUser();
        if (user == null) return ResponseEntity.status(401)
                .body(Map.of("error", "Not authenticated"));

        Optional<Carrier> opt = carrierService.getById(id);
        if (opt.isEmpty()) return ResponseEntity.status(404)
                .body(Map.of("error", "Carrier not found"));

        Carrier c = opt.get();
        if (body.get("status")       != null) c.setStatus((String) body.get("status"));
        if (body.get("operatorName") != null) c.setOperatorName((String) body.get("operatorName"));
        if (body.get("flag")         != null) c.setFlag((String) body.get("flag"));

        return ResponseEntity.ok(Map.of("carrier", carrierService.save(c),
                "message", "Carrier updated"));
    }

    // DELETE /api/carriers/{id}
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteCarrier(@PathVariable Long id) {
        User user = getCurrentUser();
        if (user == null) return ResponseEntity.status(401)
                .body(Map.of("error", "Not authenticated"));
        if (!"ADMIN".equals(user.getRole())) return ResponseEntity.status(403)
                .body(Map.of("error", "Only admins can delete carriers"));

        try {
            carrierService.deleteCarrier(id);
            return ResponseEntity.ok(Map.of("message", "Carrier deleted"));
        } catch (RuntimeException e) {
            return ResponseEntity.status(404).body(Map.of("error", e.getMessage()));
        }
    }
}