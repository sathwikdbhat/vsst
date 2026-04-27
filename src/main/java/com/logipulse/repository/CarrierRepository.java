package com.logipulse.repository;

import com.logipulse.model.Carrier;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface CarrierRepository extends JpaRepository<Carrier, Long> {

    List<Carrier> findByOwnerId(Long ownerId);

    List<Carrier> findByOwnerIdAndCarrierType(Long ownerId, String carrierType);

    List<Carrier> findByOwnerIdAndStatus(Long ownerId, String status);

    List<Carrier> findByOwnerIdAndCarrierTypeAndStatus(
            Long ownerId, String carrierType, String status);

    Optional<Carrier> findByIdentifierAndOwnerId(String identifier, Long ownerId);

    boolean existsByIdentifierAndOwnerId(String identifier, Long ownerId);
}