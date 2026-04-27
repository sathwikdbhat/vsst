package com.logipulse.service;

import com.logipulse.model.RouteAnomaly;
import com.logipulse.model.Shipment;
import com.logipulse.model.ShipmentMilestone;
import com.logipulse.model.User;
import com.logipulse.repository.MilestoneRepository;
import com.logipulse.repository.RouteAnomalyRepository;
import com.logipulse.repository.ShipmentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Random;

@Service
public class ShipmentService {

    @Autowired private ShipmentRepository    shipmentRepository;
    @Autowired private RouteAnomalyRepository routeAnomalyRepository;
    @Autowired private MilestoneRepository   milestoneRepository;
    @Autowired private NewsService           newsService;
    @Autowired private RouteGeometryService  routeGeometryService;
    @Autowired private UserService           userService;

    // Autowired GlobalRouteService
    @Autowired private GlobalRouteService globalRouteService;

    // ----------------------------------------------------------------
    // CREATE SHIPMENT — isolated by owner
    // ----------------------------------------------------------------
    public Shipment createShipment(Map<String, Object> data, User currentUser) {
        LocalDateTime now = LocalDateTime.now();

        // BRANDING UPDATE: Tracking IDs now start with VSST-
        String trackingId = "VSST-" + System.currentTimeMillis() % 100000;

        double originLat = Double.parseDouble(data.get("originLat").toString());
        double originLng = Double.parseDouble(data.get("originLng").toString());
        double destLat   = Double.parseDouble(data.get("destLat").toString());
        double destLng   = Double.parseDouble(data.get("destLng").toString());

        String originStr = (String) data.get("origin");
        String destStr   = (String) data.get("destination");

        String mode = data.get("transportMode") != null
                ? data.get("transportMode").toString().toUpperCase() : "TRUCK";

        // Route validation — reject unrealistic mode/route combos
        try {
            validateRouteForMode(mode, originLat, originLng, destLat, destLng,
                    originStr, destStr);
        } catch (RuntimeException e) {
            throw e; // Let controller return 400 with the message
        }

        // ---- ETA SCALING LOGIC ----
        int etaHoursInput = 1;
        if (data.get("etaHours") != null) {
            try { etaHoursInput = Integer.parseInt(data.get("etaHours").toString()); }
            catch (NumberFormatException ignored) {}
        }
        etaHoursInput = Math.max(1, etaHoursInput);

        // Convert realistic hours → demo minutes
        // Truck: max 5 min | Train: max 10 min | Plane: max 15 min | Ship: max 20 min
        int etaMinutes = convertHoursToDemoMinutes(etaHoursInput, mode);

        Shipment s = new Shipment();
        s.setTrackingId(trackingId);
        s.setCargoType((String) data.getOrDefault("cargoType", "General Cargo"));
        s.setCustomerName((String) data.getOrDefault("customerName", "Unknown"));
        s.setWeightKg(data.get("weightKg") != null
                ? Double.parseDouble(data.get("weightKg").toString()) : 0.0);
        s.setPriority((String) data.getOrDefault("priority", "NORMAL"));
        s.setOrigin(originStr);
        s.setOriginLat(originLat);
        s.setOriginLng(originLng);
        s.setDestination(destStr);
        s.setDestLat(destLat);
        s.setDestLng(destLng);
        s.setCurrentLat(originLat);
        s.setCurrentLng(originLng);
        s.setStatus("IN_TRANSIT");
        s.setDispatchTime(now);

        // Store realistic hours for display
        s.setEtaHoursInput(etaHoursInput);

        // Calculate delivery time using the scaled demo minutes
        s.setEstimatedDeliveryTime(now.plusMinutes(etaMinutes));

        // Set tenant ownership
        Long ownerId = userService.resolveOwnerId(currentUser);
        s.setOwnerId(ownerId);

        if (data.get("vehicleId") != null && !data.get("vehicleId").toString().isBlank()) {
            s.setVehicleId(Long.parseLong(data.get("vehicleId").toString()));
        }
        if (data.get("assignedDriverName") != null) {
            s.setAssignedDriverName((String) data.get("assignedDriverName"));
        }

        s.setTransportMode(mode);

        if (data.get("carrierId") != null && !data.get("carrierId").toString().isBlank()) {
            s.setCarrierId(Long.parseLong(data.get("carrierId").toString()));
        }

        // Fetch road/sea/air/rail route based on mode
        String routeGeometry = globalRouteService.fetchRoute(
                originLat, originLng, destLat, destLng, mode
        );

        // Fallback to interpolated straight line if route fetch fails
        if (routeGeometry == null) {
            routeGeometry = routeGeometryService.straightLineWithPoints(
                    originLat, originLng, destLat, destLng
            );
        }
        s.setRouteGeometry(routeGeometry);

        Shipment saved = shipmentRepository.save(s);
        addMilestone(saved.getId(), "DISPATCHED",
                "Shipment dispatched from " + saved.getOrigin(), saved.getOrigin());

        System.out.println("✅ Created: " + trackingId + " | owner: " + ownerId +
                " | ETA: " + etaMinutes + " minutes (from " + etaHoursInput + "h input)" +
                " | mode: " + mode +
                " | route: " + (routeGeometry != null ? "mapped" : "straight"));
        return saved;
    }

    // ----------------------------------------------------------------
    // GET ALL — filtered by owner
    // ----------------------------------------------------------------
    public List<Shipment> getShipmentsForUser(User user) {
        Long ownerId = userService.resolveOwnerId(user);
        return shipmentRepository.findByOwnerId(ownerId);
    }

    // ----------------------------------------------------------------
    // GET ALL (used by scheduler — no tenant filter needed)
    // ----------------------------------------------------------------
    public List<Shipment> getAllShipments() {
        return shipmentRepository.findAll();
    }

    public Optional<Shipment> getShipmentById(Long id) {
        return shipmentRepository.findById(id);
    }

    public List<RouteAnomaly> getAnomaliesForShipment(Long shipmentId) {
        return routeAnomalyRepository.findByShipmentId(shipmentId);
    }

    // ----------------------------------------------------------------
    // REROUTE — fetch alternate multi-modal route
    // ----------------------------------------------------------------
    public Shipment rerouteShipment(Long id) {
        Optional<Shipment> opt = shipmentRepository.findById(id);
        if (opt.isEmpty()) return null;
        Shipment s = opt.get();
        s.setStatus("REROUTED");

        s.setEstimatedDeliveryTime(
                (s.getEstimatedDeliveryTime() != null
                        ? s.getEstimatedDeliveryTime()
                        : LocalDateTime.now())
                        .plusMinutes(2) // Extended by 2 demo minutes for reroutes
        );

        if (s.getOriginLat() != null && s.getDestLat() != null) {
            // Mode-aware alternate route
            String mode = s.getTransportMode() != null ? s.getTransportMode() : "TRUCK";
            String altRoute = globalRouteService.fetchAlternateRoute(
                    s.getCurrentLat(), s.getCurrentLng(),
                    s.getDestLat(),    s.getDestLng(),
                    mode
            );

            if (altRoute == null) {
                altRoute = routeGeometryService.straightLineWithPoints(
                        s.getCurrentLat(), s.getCurrentLng(),
                        s.getDestLat(), s.getDestLng()
                );
            }
            s.setRouteGeometry(altRoute);
        }

        Shipment saved = shipmentRepository.save(s);
        addMilestone(saved.getId(), "REROUTED",
                "AI Auto-Reroute: Alternate corridor selected. ETA extended.", saved.getOrigin());
        return saved;
    }

    // ----------------------------------------------------------------
    // MARK DELIVERED
    // ----------------------------------------------------------------
    public Shipment markDelivered(Long id) {
        Optional<Shipment> opt = shipmentRepository.findById(id);
        if (opt.isEmpty()) return null;
        Shipment s = opt.get();
        s.setStatus("DELIVERED");
        if (s.getDestLat() != null) {
            s.setCurrentLat(s.getDestLat());
            s.setCurrentLng(s.getDestLng());
        }
        Shipment saved = shipmentRepository.save(s);
        addMilestone(saved.getId(), "DELIVERED",
                "Shipment delivered to " + saved.getDestination(), saved.getDestination());
        return saved;
    }

    // ----------------------------------------------------------------
    // UPDATE
    // ----------------------------------------------------------------
    public Shipment updateShipment(Long id, Map<String, Object> data) {
        Optional<Shipment> opt = shipmentRepository.findById(id);
        if (opt.isEmpty()) return null;
        Shipment s = opt.get();
        if (data.get("cargoType")         != null) s.setCargoType((String) data.get("cargoType"));
        if (data.get("customerName")      != null) s.setCustomerName((String) data.get("customerName"));
        if (data.get("priority")          != null) s.setPriority((String) data.get("priority"));
        if (data.get("weightKg")          != null) s.setWeightKg(Double.parseDouble(data.get("weightKg").toString()));
        if (data.get("assignedDriverName") != null) s.setAssignedDriverName((String) data.get("assignedDriverName"));
        return shipmentRepository.save(s);
    }

    // ----------------------------------------------------------------
    // DELETE
    // ----------------------------------------------------------------
    public boolean deleteShipment(Long id) {
        if (!shipmentRepository.existsById(id)) return false;
        routeAnomalyRepository.findByShipmentId(id).forEach(routeAnomalyRepository::delete);
        milestoneRepository.findByShipmentIdOrderByOccurredAtAsc(id).forEach(milestoneRepository::delete);
        shipmentRepository.deleteById(id);
        return true;
    }

    // ----------------------------------------------------------------
    // TRIGGER ANOMALY (still available for auto-disruption scheduler)
    // ----------------------------------------------------------------
    public RouteAnomaly triggerAnomaly() {
        List<Shipment> inTransit = shipmentRepository.findByStatus("IN_TRANSIT");
        if (inTransit.isEmpty()) return null;
        Random random = new Random();
        Shipment target = inTransit.get(random.nextInt(inTransit.size()));
        target.setStatus("DELAYED");
        shipmentRepository.save(target);

        String desc = "Auto-disruption on the " +
                (target.getOrigin()      != null ? target.getOrigin().split(",")[0]      : "origin") +
                " → " +
                (target.getDestination() != null ? target.getDestination().split(",")[0] : "destination") +
                " corridor detected by monitoring system.";

        RouteAnomaly anomaly = new RouteAnomaly();
        anomaly.setShipmentId(target.getId());
        anomaly.setSeverity("MEDIUM");
        anomaly.setDescription(desc);
        anomaly.setDetectedAt(LocalDateTime.now());
        RouteAnomaly saved = routeAnomalyRepository.save(anomaly);
        addMilestone(target.getId(), "DELAYED", desc, target.getOrigin());
        return saved;
    }

    // ----------------------------------------------------------------
    // MILESTONES
    // ----------------------------------------------------------------
    public ShipmentMilestone addMilestone(Long shipmentId, String eventType,
                                          String description, String location) {
        ShipmentMilestone m = new ShipmentMilestone();
        m.setShipmentId(shipmentId);
        m.setEventType(eventType);
        m.setDescription(description);
        m.setLocation(location != null ? location : "");
        m.setOccurredAt(LocalDateTime.now());
        return milestoneRepository.save(m);
    }

    public List<ShipmentMilestone> getMilestonesForShipment(Long id) {
        return milestoneRepository.findByShipmentIdOrderByOccurredAtAsc(id);
    }

    // ================================================================
    // ROUTE VALIDATION — rejects unrealistic mode/route combinations
    // ================================================================
    private void validateRouteForMode(String mode, double fromLat, double fromLng,
                                      double toLat, double toLng,
                                      String origin, String dest) {

        double distKm = haversineKm(fromLat, fromLng, toLat, toLng);

        String fromContinent = detectContinent(fromLat, fromLng);
        String toContinent   = detectContinent(toLat,   toLng);
        boolean crossesOcean = requiresOceanCrossing(fromContinent, toContinent);

        String originCity = origin != null ? origin.split(",")[0] : "origin";
        String destCity   = dest   != null ? dest.split(",")[0]   : "destination";

        switch (mode.toUpperCase()) {

            case "TRUCK":
                if (crossesOcean) {
                    throw new RuntimeException(
                            "🚛 Truck routes cannot cross oceans. " +
                                    "The route from " + originCity + " (" + fromContinent + ") to " +
                                    destCity + " (" + toContinent + ") requires ocean transport. " +
                                    "Please use SHIP or PLANE instead."
                    );
                }
                if (distKm > 6000) {
                    throw new RuntimeException(
                            "🚛 Truck route too long (" + Math.round(distKm) + " km). " +
                                    "Maximum realistic truck distance is 6,000 km. " +
                                    "Consider SHIP, PLANE, or TRAIN for this distance."
                    );
                }
                break;

            case "TRAIN":
                if (crossesOcean) {
                    throw new RuntimeException(
                            "🚂 Train routes cannot cross oceans. " +
                                    "The route from " + originCity + " to " + destCity +
                                    " crosses " + getOceanName(fromContinent, toContinent) + ". " +
                                    "Please use SHIP or PLANE instead."
                    );
                }
                if (distKm > 15000) {
                    throw new RuntimeException(
                            "🚂 Train route too long (" + Math.round(distKm) + " km). " +
                                    "Maximum realistic rail distance is 15,000 km " +
                                    "(longest is Trans-Siberian at ~9,000 km). " +
                                    "Please use PLANE for this route."
                    );
                }
                // Special case: Americas trains don't connect to Eurasia
                if (!fromContinent.equals(toContinent) &&
                        !isConnectedLandmass(fromContinent, toContinent)) {
                    throw new RuntimeException(
                            "🚂 No rail connection exists between " +
                                    fromContinent + " and " + toContinent + ". " +
                                    "Please use SHIP or PLANE for this route."
                    );
                }
                break;

            case "SHIP":
            case "PLANE":
                // Ships and planes have no realistic distance restrictions
                // But same city check
                if (distKm < 10) {
                    throw new RuntimeException(
                            "Origin and destination are the same location.");
                }
                break;

            default:
                break;
        }
    }

    private double haversineKm(double lat1, double lng1, double lat2, double lng2) {
        double R    = 6371;
        double dLat = (lat2 - lat1) * Math.PI / 180;
        double dLng = (lng2 - lng1) * Math.PI / 180;
        double a    = Math.sin(dLat/2)*Math.sin(dLat/2) +
                Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*
                        Math.sin(dLng/2)*Math.sin(dLng/2);
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    }

    private String detectContinent(double lat, double lng) {
        // Americas — west of -30°
        if (lng < -30) return "AMERICAS";
        // Oceania — southern hemisphere east of 100°
        if (lat < -10 && lng > 100) return "OCEANIA";
        // Africa — latitude band, specific longitude range
        if (lat > -38 && lat < 38 && lng > -20 && lng < 52) return "AFRICA";
        // Europe — north of 35°, west of 45°
        if (lat > 35 && lng > -15 && lng < 45) return "EUROPE";
        // Asia — everything else east of 25° (includes Middle East, S/SE/E/Central Asia)
        if (lng > 25) return "ASIA";
        return "UNKNOWN";
    }

    private boolean requiresOceanCrossing(String cont1, String cont2) {
        if (cont1.equals(cont2)) return false;
        // Europe ↔ Asia: same landmass (Eurasia) — connected by land
        if (isEurasia(cont1) && isEurasia(cont2)) return false;
        // Europe ↔ Africa: connected near Suez/Sinai — technically land route possible
        // but Mediterranean separates them for most practical routes
        // We'll allow Europe-Africa for truck (Morocco-Spain via ferry is common)
        // but flag Americas and Oceania as ocean crossings
        if (cont1.equals("AMERICAS") || cont2.equals("AMERICAS")) return true;
        if (cont1.equals("OCEANIA")  || cont2.equals("OCEANIA"))  return true;
        return false;
    }

    private boolean isEurasia(String continent) {
        return "EUROPE".equals(continent) || "ASIA".equals(continent);
    }

    private boolean isConnectedLandmass(String cont1, String cont2) {
        // For train purposes: Eurasia is one connected rail network
        // Africa connects to Eurasia via Suez (but no through train)
        // Americas are separate
        if (isEurasia(cont1) && isEurasia(cont2)) return true;
        // Africa-Europe rail: technically possible via ferry but not continuous
        // We'll block Africa-Europe trains for realism
        return false;
    }

    private String getOceanName(String cont1, String cont2) {
        boolean hasAmericas = cont1.equals("AMERICAS") || cont2.equals("AMERICAS");
        boolean hasAsia     = cont1.equals("ASIA")     || cont2.equals("ASIA");
        boolean hasEurope   = cont1.equals("EUROPE")   || cont2.equals("EUROPE");
        boolean hasOceania  = cont1.equals("OCEANIA")  || cont2.equals("OCEANIA");

        if (hasAmericas && (hasEurope || cont1.equals("AFRICA") || cont2.equals("AFRICA")))
            return "the Atlantic Ocean";
        if (hasAmericas && (hasAsia || hasOceania))
            return "the Pacific Ocean";
        if (hasOceania && (hasEurope || cont1.equals("AFRICA") || cont2.equals("AFRICA")))
            return "the Indian Ocean";
        return "an ocean";
    }

    // ================================================================
    // ETA SCALING — Realistic hours input → Demo minutes for completion
    //
    // The user inputs realistic hours (e.g. 15 days ship = 360 hours)
    // We scale proportionally but cap at mode-specific demo maximums.
    //
    // Mode maximums:
    //   TRUCK:  max  5 demo minutes (realistic max ~72h  = 3 days road)
    //   TRAIN:  max 10 demo minutes (realistic max ~168h = 7 days rail)
    //   PLANE:  max 15 demo minutes (realistic max ~20h  = longest flight)
    //   SHIP:   max 20 demo minutes (realistic max ~720h = 30 days ocean)
    // ================================================================
    private int convertHoursToDemoMinutes(int etaHours, String mode) {
        int maxDemoMinutes;
        int maxRealisticHours;

        switch (mode == null ? "TRUCK" : mode.toUpperCase()) {
            case "PLANE":
                maxDemoMinutes    = 15;
                maxRealisticHours = 20;   // ~20h = New York → Singapore
                break;
            case "TRAIN":
                maxDemoMinutes    = 10;
                maxRealisticHours = 168;  // ~7 days = Trans-Siberian
                break;
            case "SHIP":
                maxDemoMinutes    = 20;
                maxRealisticHours = 720;  // ~30 days = Shanghai → Rotterdam
                break;
            default: // TRUCK
                maxDemoMinutes    = 5;
                maxRealisticHours = 72;   // ~3 days = cross-country truck
                break;
        }

        // Proportional scale: small ETA hours → shorter demo time
        double ratio   = (double) etaHours / maxRealisticHours;
        int    scaled  = (int) Math.round(ratio * maxDemoMinutes);

        // Clamp: minimum 1 minute, never exceeds mode maximum
        int result = Math.max(1, Math.min(maxDemoMinutes, scaled));

        System.out.println("ETA scaling [" + mode + "]: " + etaHours +
                " realistic hours → " + result + " demo minutes");
        return result;
    }
}