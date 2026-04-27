package com.logipulse.service;

import com.logipulse.model.Carrier;
import com.logipulse.model.User;
import com.logipulse.repository.CarrierRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class CarrierService {

    @Autowired
    private CarrierRepository carrierRepository;

    @Autowired
    private UserService userService;

    // ----------------------------------------------------------------
    // GET — filtered by owner
    // ----------------------------------------------------------------
    public List<Carrier> getCarriersForUser(User user) {
        return carrierRepository.findByOwnerId(userService.resolveOwnerId(user));
    }

    public List<Carrier> getCarriersByType(User user, String carrierType) {
        Long ownerId = userService.resolveOwnerId(user);
        return carrierRepository.findByOwnerIdAndCarrierType(ownerId, carrierType.toUpperCase());
    }

    public List<Carrier> getAvailableByType(User user, String carrierType) {
        Long ownerId = userService.resolveOwnerId(user);
        return carrierRepository.findByOwnerIdAndCarrierTypeAndStatus(
                ownerId, carrierType.toUpperCase(), "AVAILABLE");
    }

    public Optional<Carrier> getById(Long id) {
        return carrierRepository.findById(id);
    }

    // ----------------------------------------------------------------
    // CREATE CARRIER
    // ----------------------------------------------------------------
    public Carrier createCarrier(Map<String, Object> data, User currentUser) {
        String identifier   = (String) data.get("identifier");
        String carrierType  = ((String) data.getOrDefault("carrierType", "SHIP")).toUpperCase();
        Long   ownerId      = userService.resolveOwnerId(currentUser);

        if (identifier == null || identifier.isBlank()) {
            throw new RuntimeException("Carrier identifier is required.");
        }

        if (carrierRepository.existsByIdentifierAndOwnerId(
                identifier.trim().toUpperCase(), ownerId)) {
            throw new RuntimeException(
                    "Carrier '" + identifier + "' is already registered.");
        }

        Carrier c = new Carrier();
        c.setIdentifier(identifier.trim().toUpperCase());
        c.setCarrierType(carrierType);
        c.setOperatorName((String) data.getOrDefault("operatorName", "Unknown"));
        c.setCapacityTons(data.get("capacityTons") != null
                ? Double.parseDouble(data.get("capacityTons").toString()) : 0.0);
        c.setStatus("AVAILABLE");
        c.setFlag((String) data.getOrDefault("flag", ""));
        c.setRouteType((String) data.getOrDefault("routeType", "INTERNATIONAL"));
        c.setOwnerId(ownerId);
        c.setCreatedAt(LocalDateTime.now());

        return carrierRepository.save(c);
    }

    // ----------------------------------------------------------------
    // UPDATE STATUS
    // ----------------------------------------------------------------
    public void updateStatus(Long carrierId, String status) {
        carrierRepository.findById(carrierId).ifPresent(c -> {
            c.setStatus(status);
            carrierRepository.save(c);
        });
    }

    // ----------------------------------------------------------------
    // DELETE
    // ----------------------------------------------------------------
    public void deleteCarrier(Long id) {
        Carrier c = carrierRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Carrier not found"));
        carrierRepository.delete(c);
    }

    public Carrier save(Carrier carrier) {
        return carrierRepository.save(carrier);
    }
}