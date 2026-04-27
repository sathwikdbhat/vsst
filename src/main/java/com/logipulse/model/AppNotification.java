package com.logipulse.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.LocalDateTime;

@Entity
@Table(name = "notifications")
public class AppNotification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // DISRUPTION, REROUTE, DELIVERED, HIGH_RISK, WEATHER, SYSTEM
    @Column(nullable = false)
    private String type;

    // INFO, WARNING, DANGER, SUCCESS
    @Column(nullable = false)
    private String severity;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false, length = 1000)
    private String message;

    // Optional: tracking ID if related to a shipment
    @Column
    private String trackingId;

    @Column
    private Long shipmentId;

    // Whether this alert was read in the UI
    @Column(nullable = false)
    private boolean read = false;

    // Whether email was sent for this alert
    @Column(nullable = false)
    private boolean emailSent = false;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    public AppNotification() {}

    // ---- Getters & Setters ----

    public Long getId()                    { return id; }
    public void setId(Long id)             { this.id = id; }

    public String getType()                { return type; }
    public void setType(String type)       { this.type = type; }

    public String getSeverity()            { return severity; }
    public void setSeverity(String s)      { this.severity = s; }

    public String getTitle()               { return title; }
    public void setTitle(String title)     { this.title = title; }

    public String getMessage()             { return message; }
    public void setMessage(String m)       { this.message = m; }

    public String getTrackingId()          { return trackingId; }
    public void setTrackingId(String t)    { this.trackingId = t; }

    public Long getShipmentId()            { return shipmentId; }
    public void setShipmentId(Long s)      { this.shipmentId = s; }

    public boolean isRead()                { return read; }
    public void setRead(boolean read)      { this.read = read; }

    public boolean isEmailSent()           { return emailSent; }
    public void setEmailSent(boolean e)    { this.emailSent = e; }

    public LocalDateTime getCreatedAt()    { return createdAt; }
    public void setCreatedAt(LocalDateTime c) { this.createdAt = c; }
}