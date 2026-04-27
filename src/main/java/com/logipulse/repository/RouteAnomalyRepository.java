package com.logipulse.repository;

import com.logipulse.model.RouteAnomaly;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RouteAnomalyRepository extends JpaRepository<RouteAnomaly, Long> {

    /**
     * Find all anomalies linked to a specific shipment ID.
     * Spring Data JPA automatically implements this method
     * based on the method name — no SQL needed.
     * Example usage: findByShipmentId(3L)
     */
    List<RouteAnomaly> findByShipmentId(Long shipmentId);
}