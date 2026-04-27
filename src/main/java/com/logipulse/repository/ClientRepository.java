package com.logipulse.repository;

import com.logipulse.model.Client;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ClientRepository extends JpaRepository<Client, Long> {
    List<Client> findByClientType(String clientType);
    List<Client> findByCompanyNameContainingIgnoreCase(String keyword);
    List<Client> findByOwnerId(Long ownerId);
    List<Client> findByOwnerIdAndClientType(Long ownerId, String clientType);
}