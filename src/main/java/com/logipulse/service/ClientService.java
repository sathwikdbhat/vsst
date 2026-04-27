package com.logipulse.service;

import com.logipulse.model.Client;
import com.logipulse.model.User;
import com.logipulse.repository.ClientRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class ClientService {

    @Autowired
    private ClientRepository clientRepository;

    @Autowired
    private UserService userService;

    // ----------------------------------------------------------------
    // GET — filtered by owner
    // ----------------------------------------------------------------
    public List<Client> getClientsForUser(User user) {
        Long ownerId = userService.resolveOwnerId(user);
        return clientRepository.findByOwnerId(ownerId);
    }

    public List<Client> getSendersForUser(User user) {
        Long ownerId = userService.resolveOwnerId(user);
        return clientRepository.findByOwnerIdAndClientType(ownerId, "SENDER");
    }

    public List<Client> getReceiversForUser(User user) {
        Long ownerId = userService.resolveOwnerId(user);
        return clientRepository.findByOwnerIdAndClientType(ownerId, "RECEIVER");
    }

    public Optional<Client> getById(Long id) {
        return clientRepository.findById(id);
    }

    // ----------------------------------------------------------------
    // CREATE — only 5 fields needed
    // ----------------------------------------------------------------
    public Client createClient(Map<String, String> data, User currentUser) {
        if (data.get("companyName") == null || data.get("companyName").isBlank()) {
            throw new RuntimeException("Company name is required.");
        }

        Client c = new Client();
        c.setClientType(data.getOrDefault("clientType", "SENDER").toUpperCase());
        c.setCompanyName(data.get("companyName").trim());
        c.setEmail(data.getOrDefault("email", ""));
        c.setPhone(data.getOrDefault("phone", ""));
        c.setGstin(data.getOrDefault("gstin", ""));
        c.setOwnerId(userService.resolveOwnerId(currentUser));
        c.setCreatedAt(LocalDateTime.now());

        return clientRepository.save(c);
    }

    // ----------------------------------------------------------------
    // DELETE
    // ----------------------------------------------------------------
    public boolean deleteClient(Long id) {
        if (!clientRepository.existsById(id)) return false;
        clientRepository.deleteById(id);
        return true;
    }

    // ----------------------------------------------------------------
    // Kept for backward compat used by some controllers
    // ----------------------------------------------------------------
    public List<Client> getAllClients() {
        return clientRepository.findAll();
    }

    public List<Client> getSenders() {
        return clientRepository.findByClientType("SENDER");
    }

    public List<Client> getReceivers() {
        return clientRepository.findByClientType("RECEIVER");
    }
}