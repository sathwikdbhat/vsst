package com.logipulse.service;

import com.logipulse.model.Carrier;
import com.logipulse.model.PartnerCompany;
import com.logipulse.model.User;
import com.logipulse.repository.CarrierRepository;
import com.logipulse.repository.PartnerCompanyRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class PartnerCompanyService {

    @Autowired
    private PartnerCompanyRepository partnerCompanyRepository;

    @Autowired
    private CarrierRepository carrierRepository;

    @Autowired
    private UserService userService;

    // ----------------------------------------------------------------
    // GET all partners for a user
    // ----------------------------------------------------------------
    public List<PartnerCompany> getPartnersForUser(User user) {
        return partnerCompanyRepository.findByOwnerId(
                userService.resolveOwnerId(user));
    }

    public List<PartnerCompany> getPartnersByType(User user, String type) {
        return partnerCompanyRepository.findByOwnerIdAndCompanyType(
                userService.resolveOwnerId(user), type.toUpperCase());
    }

    public Optional<PartnerCompany> getById(Long id) {
        return partnerCompanyRepository.findById(id);
    }

    // ----------------------------------------------------------------
    // CREATE partner company
    // ----------------------------------------------------------------
    public PartnerCompany createPartner(Map<String, Object> data, User currentUser) {
        String name = (String) data.get("name");
        String type = (String) data.getOrDefault("companyType", "SHIPPING_LINE");
        Long ownerId = userService.resolveOwnerId(currentUser);

        if (name == null || name.isBlank()) {
            throw new RuntimeException("Company name is required.");
        }

        if (partnerCompanyRepository.existsByNameAndOwnerId(name.trim(), ownerId)) {
            throw new RuntimeException(
                    "Partner company '" + name + "' is already registered.");
        }

        PartnerCompany pc = new PartnerCompany();
        pc.setName(name.trim());
        pc.setCompanyType(type.toUpperCase());
        pc.setCountry((String) data.getOrDefault("country", ""));
        pc.setContactEmail((String) data.getOrDefault("contactEmail", ""));
        pc.setContactPhone((String) data.getOrDefault("contactPhone", ""));
        pc.setWebsite((String) data.getOrDefault("website", ""));
        pc.setDescription((String) data.getOrDefault("description", ""));
        pc.setOwnerId(ownerId);
        pc.setCreatedAt(LocalDateTime.now());

        return partnerCompanyRepository.save(pc);
    }

    // ----------------------------------------------------------------
    // DELETE partner company
    // ----------------------------------------------------------------
    public void deletePartner(Long id) {
        PartnerCompany pc = partnerCompanyRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Partner not found"));
        // Unlink carriers from this company
        List<Carrier> carriers = carrierRepository.findAll().stream()
                .filter(c -> id.equals(c.getPartnerCompanyId()))
                .toList();
        carriers.forEach(c -> {
            c.setPartnerCompanyId(null);
            c.setPartnerCompanyName(null);
            carrierRepository.save(c);
        });
        partnerCompanyRepository.delete(pc);
    }

    // ----------------------------------------------------------------
    // GET carriers belonging to a partner company
    // ----------------------------------------------------------------
    public List<Carrier> getCarriersForPartner(Long partnerCompanyId) {
        return carrierRepository.findAll().stream()
                .filter(c -> partnerCompanyId.equals(c.getPartnerCompanyId()))
                .toList();
    }

    // ----------------------------------------------------------------
    // ADD a carrier to a partner company
    // ----------------------------------------------------------------
    public Carrier addCarrierToPartner(Long partnerCompanyId,
                                       Map<String, Object> data, User currentUser) {
        PartnerCompany pc = partnerCompanyRepository.findById(partnerCompanyId)
                .orElseThrow(() -> new RuntimeException("Partner company not found"));

        Long ownerId = userService.resolveOwnerId(currentUser);

        // Map company type to carrier type
        String carrierType = switch (pc.getCompanyType()) {
            case "AIRLINE"  -> "PLANE";
            case "RAILWAY"  -> "TRAIN";
            default         -> "SHIP";
        };

        data.put("carrierType", carrierType);
        data.put("operatorName", pc.getName());

        // Check duplicate
        String identifier = data.get("identifier") != null
                ? data.get("identifier").toString().trim().toUpperCase() : "";
        if (identifier.isBlank()) throw new RuntimeException("Carrier identifier required");

        if (carrierRepository.existsByIdentifierAndOwnerId(identifier, ownerId)) {
            throw new RuntimeException("Carrier '" + identifier + "' already registered");
        }

        Carrier c = new Carrier();
        c.setIdentifier(identifier);
        c.setCarrierType(carrierType);
        c.setOperatorName(pc.getName());
        c.setCapacityTons(data.get("capacityTons") != null
                ? Double.parseDouble(data.get("capacityTons").toString()) : 0.0);
        c.setStatus("AVAILABLE");
        c.setFlag(pc.getCountry());
        c.setRouteType("INTERNATIONAL");
        c.setPartnerCompanyId(partnerCompanyId);
        c.setPartnerCompanyName(pc.getName());
        c.setOwnerId(ownerId);
        c.setCreatedAt(LocalDateTime.now());

        return carrierRepository.save(c);
    }
}