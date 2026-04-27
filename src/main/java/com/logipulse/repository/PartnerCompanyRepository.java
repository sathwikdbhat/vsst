package com.logipulse.repository;

import com.logipulse.model.PartnerCompany;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface PartnerCompanyRepository
        extends JpaRepository<PartnerCompany, Long> {

    List<PartnerCompany> findByOwnerId(Long ownerId);

    List<PartnerCompany> findByOwnerIdAndCompanyType(Long ownerId, String companyType);

    boolean existsByNameAndOwnerId(String name, Long ownerId);
}