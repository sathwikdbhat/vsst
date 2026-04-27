package com.logipulse.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

@Entity
@Table(name = "clients")
public class Client {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // SENDER or RECEIVER
    @Column(nullable = false)
    private String clientType;

    // Company name — one entry covers all branches
    @Column(nullable = false)
    private String companyName;

    // Contact email
    @Column
    private String email;

    // Contact phone
    @Column
    private String phone;

    // GST Identification Number
    @Column
    private String gstin;

    // Which admin created this client
    @Column
    private Long ownerId;

    @Column
    private LocalDateTime createdAt;

    // ---- Getters & Setters ----

    public Long getId()                          { return id; }
    public void setId(Long id)                   { this.id = id; }

    public String getClientType()                { return clientType; }
    public void setClientType(String t)          { this.clientType = t; }

    public String getCompanyName()               { return companyName; }
    public void setCompanyName(String n)         { this.companyName = n; }

    public String getEmail()                     { return email; }
    public void setEmail(String e)               { this.email = e; }

    public String getPhone()                     { return phone; }
    public void setPhone(String p)               { this.phone = p; }

    public String getGstin()                     { return gstin; }
    public void setGstin(String g)               { this.gstin = g; }

    public Long getOwnerId()                     { return ownerId; }
    public void setOwnerId(Long o)               { this.ownerId = o; }

    public LocalDateTime getCreatedAt()          { return createdAt; }
    public void setCreatedAt(LocalDateTime c)    { this.createdAt = c; }
}