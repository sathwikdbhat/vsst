package com.logipulse.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

@Entity
@Table(name = "carriers")
public class Carrier {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // SHIP | PLANE | TRAIN | TRUCK
    @Column(nullable = false)
    private String carrierType;

    // Unique identifier: IMO number (ship), ICAO/IATA code (plane),
    // train number, or registration plate (truck)
    @Column(nullable = false)
    private String identifier;

    // Operator: Maersk, Singapore Airlines, Amtrak, etc.
    @Column
    private String operatorName;

    // Capacity in tonnes (for ships/trains) or passengers (planes)
    @Column
    private Double capacityTons;

    // AVAILABLE | IN_USE | MAINTENANCE | DOCKED | GROUNDED
    @Column(nullable = false)
    private String status;

    // Country of registration / flag state
    @Column
    private String flag;

    // Route type: DOMESTIC | INTERNATIONAL
    @Column
    private String routeType;

    // Which admin registered this carrier
    @Column
    private Long ownerId;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    // ---- ADD to existing Carrier entity ----

    // Links this carrier to a registered partner company
// Null = internally managed truck
    @Column
    private Long partnerCompanyId;

    // Denormalized for fast display: "Maersk Line", "Emirates SkyCargo"
    @Column
    private String partnerCompanyName;

    // ---- ADD getters/setters ----
    public Long getPartnerCompanyId()              { return partnerCompanyId; }
    public void setPartnerCompanyId(Long p)        { this.partnerCompanyId = p; }

    public String getPartnerCompanyName()          { return partnerCompanyName; }
    public void setPartnerCompanyName(String n)    { this.partnerCompanyName = n; }

    // ---- Getters & Setters ----
    public Long getId()                       { return id; }
    public void setId(Long id)                { this.id = id; }

    public String getCarrierType()            { return carrierType; }
    public void setCarrierType(String t)      { this.carrierType = t; }

    public String getIdentifier()             { return identifier; }
    public void setIdentifier(String i)       { this.identifier = i; }

    public String getOperatorName()           { return operatorName; }
    public void setOperatorName(String o)     { this.operatorName = o; }

    public Double getCapacityTons()           { return capacityTons; }
    public void setCapacityTons(Double c)     { this.capacityTons = c; }

    public String getStatus()                 { return status; }
    public void setStatus(String s)           { this.status = s; }

    public String getFlag()                   { return flag; }
    public void setFlag(String f)             { this.flag = f; }

    public String getRouteType()              { return routeType; }
    public void setRouteType(String r)        { this.routeType = r; }

    public Long getOwnerId()                  { return ownerId; }
    public void setOwnerId(Long o)            { this.ownerId = o; }

    public LocalDateTime getCreatedAt()       { return createdAt; }
    public void setCreatedAt(LocalDateTime c) { this.createdAt = c; }
}