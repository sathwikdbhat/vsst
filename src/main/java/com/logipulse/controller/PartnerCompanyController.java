package com.logipulse.controller;

import com.logipulse.model.Carrier;
import com.logipulse.model.PartnerCompany;
import com.logipulse.model.User;
import com.logipulse.service.PartnerCompanyService;
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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/partners")
@CrossOrigin(origins = "*")
public class PartnerCompanyController {

    @Autowired private PartnerCompanyService partnerCompanyService;
    @Autowired private UserService           userService;

    private User getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() ||
                "anonymousUser".equals(auth.getPrincipal())) return null;
        return userService.findByUsername(auth.getName()).orElse(null);
    }

    // GET /api/partners?type=SHIPPING_LINE
    @GetMapping
    public ResponseEntity<?> getPartners(
            @RequestParam(required = false) String type) {
        User user = getCurrentUser();
        if (user == null) return ResponseEntity.status(401)
                .body(Map.of("error", "Not authenticated"));

        List<PartnerCompany> list = (type != null && !type.isBlank())
                ? partnerCompanyService.getPartnersByType(user, type)
                : partnerCompanyService.getPartnersForUser(user);
        return ResponseEntity.ok(list);
    }

    // GET /api/partners/{id}/carriers
    @GetMapping("/{id}/carriers")
    public ResponseEntity<?> getCarriers(@PathVariable Long id) {
        User user = getCurrentUser();
        if (user == null) return ResponseEntity.status(401)
                .body(Map.of("error", "Not authenticated"));
        List<Carrier> carriers = partnerCompanyService.getCarriersForPartner(id);
        return ResponseEntity.ok(carriers);
    }

    // POST /api/partners
    @PostMapping
    public ResponseEntity<?> createPartner(@RequestBody Map<String, Object> body) {
        User user = getCurrentUser();
        if (user == null) return ResponseEntity.status(401)
                .body(Map.of("error", "Not authenticated"));
        if (!"ADMIN".equals(user.getRole())) return ResponseEntity.status(403)
                .body(Map.of("error", "Admin access required"));

        try {
            PartnerCompany created = partnerCompanyService.createPartner(body, user);
            return ResponseEntity.status(201).body(Map.of(
                    "partner", created,
                    "message", created.getName() + " registered as partner"
            ));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // POST /api/partners/{id}/carriers
    @PostMapping("/{id}/carriers")
    public ResponseEntity<?> addCarrier(@PathVariable Long id,
                                        @RequestBody Map<String, Object> body) {
        User user = getCurrentUser();
        if (user == null) return ResponseEntity.status(401)
                .body(Map.of("error", "Not authenticated"));
        if (!"ADMIN".equals(user.getRole())) return ResponseEntity.status(403)
                .body(Map.of("error", "Admin access required"));

        try {
            Carrier carrier = partnerCompanyService.addCarrierToPartner(id, body, user);
            return ResponseEntity.status(201).body(Map.of(
                    "carrier", carrier,
                    "message", carrier.getIdentifier() + " added to partner fleet"
            ));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // DELETE /api/partners/{id}
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deletePartner(@PathVariable Long id) {
        User user = getCurrentUser();
        if (user == null) return ResponseEntity.status(401)
                .body(Map.of("error", "Not authenticated"));
        if (!"ADMIN".equals(user.getRole())) return ResponseEntity.status(403)
                .body(Map.of("error", "Admin access required"));
        try {
            partnerCompanyService.deletePartner(id);
            return ResponseEntity.ok(Map.of("message", "Partner company removed"));
        } catch (RuntimeException e) {
            return ResponseEntity.status(404).body(Map.of("error", e.getMessage()));
        }
    }
}