package com.logipulse.repository;

import com.logipulse.model.Shipment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ShipmentRepository extends JpaRepository<Shipment, Long> {

    /**
     * Find all shipments that currently have a given status.
     * Spring Data JPA automatically implements this method
     * based on the method name — no SQL needed.
     * Example usage: findByStatus("IN_TRANSIT")
     */
    List<Shipment> findByStatus(String status);
    List<Shipment> findByOwnerId(Long ownerId);
    List<Shipment> findByOwnerIdAndStatus(Long ownerId, String status);
}