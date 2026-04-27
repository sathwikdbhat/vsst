package com.logipulse.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

@Entity
@Table(name = "partner_companies")
public class PartnerCompany {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // "Maersk Line", "Emirates SkyCargo", "Deutsche Bahn Cargo"
    @Column(nullable = false)
    private String name;

    // SHIPPING_LINE | AIRLINE | RAILWAY
    @Column(nullable = false)
    private String companyType;

    @Column
    private String country;

    @Column
    private String contactEmail;

    @Column
    private String contactPhone;

    @Column
    private String website;

    // Short description / notes
    @Column
    private String description;

    // Which VSST admin registered this partner
    @Column
    private Long ownerId;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    // ---- Getters & Setters ----
    public Long getId()                          { return id; }
    public void setId(Long id)                   { this.id = id; }

    public String getName()                      { return name; }
    public void setName(String n)                { this.name = n; }

    public String getCompanyType()               { return companyType; }
    public void setCompanyType(String t)         { this.companyType = t; }

    public String getCountry()                   { return country; }
    public void setCountry(String c)             { this.country = c; }

    public String getContactEmail()              { return contactEmail; }
    public void setContactEmail(String e)        { this.contactEmail = e; }

    public String getContactPhone()              { return contactPhone; }
    public void setContactPhone(String p)        { this.contactPhone = p; }

    public String getWebsite()                   { return website; }
    public void setWebsite(String w)             { this.website = w; }

    public String getDescription()               { return description; }
    public void setDescription(String d)         { this.description = d; }

    public Long getOwnerId()                     { return ownerId; }
    public void setOwnerId(Long o)               { this.ownerId = o; }

    public LocalDateTime getCreatedAt()          { return createdAt; }
    public void setCreatedAt(LocalDateTime c)    { this.createdAt = c; }
}