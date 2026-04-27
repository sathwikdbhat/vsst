package com.logipulse.service;

import com.logipulse.model.RouteAnomaly;
import com.logipulse.model.Shipment;
import com.logipulse.repository.RouteAnomalyRepository;
import com.logipulse.repository.ShipmentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;

@Service
public class GlobalDisruptionService {

    @Autowired private ShipmentRepository     shipmentRepository;
    @Autowired private RouteAnomalyRepository anomalyRepository;
    @Autowired private NewsService            newsService;
    @Autowired private WeatherService         weatherService;

    private final Random rng = new Random();

    // ----------------------------------------------------------------
    // SEA LANE DISRUPTION ZONES (lat, lng, radius degrees, name)
    // ----------------------------------------------------------------
    private static final double[][] SEA_DISRUPTION_ZONES = {
            { 11.5,  43.1, 3.0, 1 }, // Gulf of Aden / Djibouti (piracy)
            { 12.5,  44.5, 2.5, 1 }, // Bab-el-Mandeb Strait
            { 26.5,  56.3, 2.0, 2 }, // Strait of Hormuz (geopolitical)
            { 1.3,  103.8, 3.0, 3 }, // Malacca Strait (congestion)
            { 30.5,  32.3, 1.5, 4 }, // Suez Canal
            {-34.4,  18.5, 5.0, 5 }, // Cape of Good Hope (storms)
            { 9.0,  -79.7, 1.5, 6 }, // Panama Canal
            { 5.4,    3.4, 4.0, 7 }, // Gulf of Guinea (piracy)
    };

    private static final String[] SEA_ZONE_NAMES = {
            "", "Gulf of Aden", "Strait of Hormuz", "Malacca Strait",
            "Suez Canal", "Cape of Good Hope", "Panama Canal", "Gulf of Guinea"
    };

    private static final String[] SEA_ZONE_TYPES = {
            "", "piracy", "geopolitical", "congestion",
            "congestion", "weather", "congestion", "piracy"
    };

    // ----------------------------------------------------------------
    // AIRSPACE DISRUPTION ZONES
    // ----------------------------------------------------------------
    private static final double[][] AIR_DISRUPTION_ZONES = {
            { 50.0,  30.0, 5.0, 1 }, // Eastern European airspace
            { 35.0,  45.0, 4.0, 2 }, // Middle East airspace
            { 65.0,  15.0, 6.0, 3 }, // North Atlantic turbulence
            {-5.0,   35.0, 5.0, 4 }, // Central Africa ITCZ
            { 55.0, 130.0, 4.0, 5 }, // Russian Far East
    };

    private static final String[] AIR_ZONE_NAMES = {
            "", "Eastern European airspace",
            "Middle East airspace", "North Atlantic corridor",
            "Central Africa ITCZ", "Russian Far East airspace"
    };

    // ================================================================
    // CHECK DISRUPTIONS FOR A SHIPMENT
    // ================================================================
    public Map<String, Object> checkDisruptionForShipment(Shipment s) {
        String mode = s.getTransportMode() != null
                ? s.getTransportMode().toUpperCase() : "TRUCK";

        return switch (mode) {
            case "SHIP"  -> checkMaritimeDisruption(s);
            case "PLANE" -> checkAviationDisruption(s);
            case "TRAIN" -> checkRailDisruption(s);
            default      -> checkRoadDisruption(s);
        };
    }

    // ----------------------------------------------------------------
    // MARITIME DISRUPTIONS
    // ----------------------------------------------------------------
    private Map<String, Object> checkMaritimeDisruption(Shipment s) {
        if (s.getCurrentLat() == null) return null;

        // Check if ship is near a disruption zone
        for (double[] zone : SEA_DISRUPTION_ZONES) {
            double dist = Math.sqrt(
                    Math.pow(s.getCurrentLat() - zone[0], 2) +
                            Math.pow(s.getCurrentLng() - zone[1], 2));

            if (dist < zone[2]) {
                int zoneId = (int) zone[3];
                String zoneName = SEA_ZONE_NAMES[zoneId];
                String zoneType = SEA_ZONE_TYPES[zoneId];

                // 25% chance of disruption when in a risk zone
                if (rng.nextDouble() < 0.25) {
                    return buildDisruptionResult(
                            "MARITIME",
                            getSeverityForSeaZone(zoneType),
                            buildSeaDisruptionMsg(s, zoneName, zoneType)
                    );
                }
            }
        }

        // Also check weather for severe ocean conditions
        return checkWeatherDisruption(s, "ocean storms, high waves");
    }

    // ----------------------------------------------------------------
    // AVIATION DISRUPTIONS
    // ----------------------------------------------------------------
    private Map<String, Object> checkAviationDisruption(Shipment s) {
        if (s.getCurrentLat() == null) return null;

        // Check restricted/disrupted airspace zones
        for (double[] zone : AIR_DISRUPTION_ZONES) {
            double dist = Math.sqrt(
                    Math.pow(s.getCurrentLat() - zone[0], 2) +
                            Math.pow(s.getCurrentLng() - zone[1], 2));

            if (dist < zone[2]) {
                int    zoneId   = (int) zone[3];
                String zoneName = AIR_ZONE_NAMES[zoneId];

                // 20% chance of disruption when in airspace risk zone
                if (rng.nextDouble() < 0.20) {
                    return buildDisruptionResult(
                            "AVIATION",
                            "MEDIUM",
                            "✈️ Airspace disruption: " + zoneName +
                                    " — ATC rerouting required for " + s.getTrackingId() +
                                    " (" + getRouteLabel(s) + "). " +
                                    "Flight path adjustment +15-40 min."
                    );
                }
            }
        }

        // Weather check for aviation
        return checkWeatherDisruption(s, "severe turbulence, thunderstorms");
    }

    // ----------------------------------------------------------------
    // RAIL DISRUPTIONS
    // ----------------------------------------------------------------
    private Map<String, Object> checkRailDisruption(Shipment s) {
        if (s.getCurrentLat() == null) return null;

        // Check origin/destination states in news
        try {
            Map<String, String> news = newsService.getNewsForRoute(
                    s.getOrigin(), s.getDestination());

            if (news != null) {
                String combined = (news.getOrDefault("title", "") + " " +
                        news.getOrDefault("description", "")).toLowerCase();

                boolean railKeyword =
                        combined.contains("rail")    || combined.contains("train") ||
                                combined.contains("track")   || combined.contains("derail") ||
                                combined.contains("railway") || combined.contains("flood") ||
                                combined.contains("landslide");

                if (railKeyword && isRouteRegionMatch(combined, s)) {
                    return buildDisruptionResult(
                            "RAIL",
                            combined.contains("derail") || combined.contains("flood") ? "HIGH" : "MEDIUM",
                            "🚂 Rail disruption on " + getRouteLabel(s) + " corridor. " +
                                    news.getOrDefault("title", "Service affected by reported incident.") +
                                    " Alternate routing via connecting services."
                    );
                }
            }
        } catch (Exception e) {
            System.err.println("GlobalDisruption rail check: " + e.getMessage());
        }

        return null;
    }

    // ----------------------------------------------------------------
    // ROAD DISRUPTIONS (existing logic — kept for trucks)
    // ----------------------------------------------------------------
    private Map<String, Object> checkRoadDisruption(Shipment s) {
        if (s.getCurrentLat() == null) return null;

        // Weather first
        Map<String, Object> weatherResult = checkWeatherDisruption(s, "road conditions");
        if (weatherResult != null) return weatherResult;

        // News
        try {
            Map<String, String> news = newsService.getNewsForRoute(
                    s.getOrigin(), s.getDestination());

            if (news != null) {
                String combined = (news.getOrDefault("title", "") + " " +
                        news.getOrDefault("description", "")).toLowerCase();

                if (isRoadDisruption(combined) && isRouteRegionMatch(combined, s)) {
                    String severity = combined.contains("flood") ||
                            combined.contains("cyclone") ||
                            combined.contains("landslide") ? "HIGH" : "MEDIUM";
                    return buildDisruptionResult("ROAD", severity,
                            "🚛 Road disruption on " + getRouteLabel(s) +
                                    " — " + news.getOrDefault("title", "Incident reported on route."));
                }
            }
        } catch (Exception e) {
            System.err.println("GlobalDisruption road check: " + e.getMessage());
        }

        return null;
    }

    // ----------------------------------------------------------------
    // WEATHER CHECK (shared across modes)
    // ----------------------------------------------------------------
    private Map<String, Object> checkWeatherDisruption(Shipment s, String context) {
        if (s.getCurrentLat() == null) return null;
        try {
            Map<String, Object> weather = weatherService.getWeather(
                    s.getCurrentLat(), s.getCurrentLng());

            if (!Boolean.TRUE.equals(weather.get("isHazardous"))) return null;

            String main = (String) weather.getOrDefault("main", "Severe Weather");
            String desc = (String) weather.getOrDefault("description", context);
            String mode = s.getTransportMode() != null
                    ? s.getTransportMode().toUpperCase() : "TRUCK";
            String modeIcon = switch (mode) {
                case "SHIP"  -> "🚢";
                case "PLANE" -> "✈️";
                case "TRAIN" -> "🚂";
                default      -> "🚛";
            };

            return buildDisruptionResult(
                    "WEATHER",
                    "HIGH",
                    modeIcon + " Weather alert: " + main + " (" + desc + ") " +
                            "detected on the " + getRouteLabel(s) + " corridor. " +
                            "Operations restricted."
            );
        } catch (Exception e) {
            return null;
        }
    }

    // ================================================================
    // DIGITAL TWIN SCENARIOS
    // ================================================================
    public Map<String, Object> simulateGlobalScenario(
            String scenarioType, List<Shipment> shipments) {

        List<Shipment> affected;
        String title, description, severity;

        switch (scenarioType.toUpperCase()) {
            case "SUEZ_BLOCKAGE":
                affected = shipments.stream()
                        .filter(s -> "SHIP".equals(s.getTransportMode()) &&
                                isNearSuez(s))
                        .toList();
                title       = "🚨 Suez Canal Blockage";
                description = "Suez Canal blocked — all transiting vessels diverted " +
                        "via Cape of Good Hope (+14 days). " + affected.size() +
                        " ship shipment(s) affected.";
                severity    = "HIGH";
                break;

            case "AIRPORT_STRIKE":
                affected = shipments.stream()
                        .filter(s -> "PLANE".equals(s.getTransportMode()))
                        .toList();
                title       = "✈️ Major Airport Strike";
                description = "Ground staff strike at major hub airports. " +
                        "All cargo flights delayed 4-8 hours. " + affected.size() +
                        " air shipment(s) affected.";
                severity    = "HIGH";
                break;

            case "VOLCANIC_ASH":
                affected = shipments.stream()
                        .filter(s -> "PLANE".equals(s.getTransportMode()) &&
                                isOverEurope(s))
                        .toList();
                title       = "🌋 Volcanic Ash Cloud";
                description = "Volcanic eruption detected — European airspace partially " +
                        "closed. Flights rerouting via southern corridors (+2-3 hours). " +
                        affected.size() + " air shipment(s) in affected zone.";
                severity    = "MEDIUM";
                break;

            case "PORT_STRIKE":
                affected = shipments.stream()
                        .filter(s -> "SHIP".equals(s.getTransportMode()))
                        .limit(3)
                        .toList();
                title       = "⚓ Major Port Strike";
                description = "Dock workers strike at Rotterdam and Hamburg. " +
                        "All vessel calls suspended for 48-72 hours. " + affected.size() +
                        " ship shipment(s) holding at anchor.";
                severity    = "HIGH";
                break;

            case "SEVERE_WEATHER":
                affected = shipments.stream()
                        .filter(s -> "TRUCK".equals(s.getTransportMode()) ||
                                s.getTransportMode() == null)
                        .toList();
                title       = "⛈ Severe Weather System";
                description = "Extreme weather system disrupting road networks. " +
                        affected.size() + " truck shipment(s) delayed. " +
                        "Emergency rerouting in progress.";
                severity    = "HIGH";
                break;

            case "RAIL_CLOSURE":
                affected = shipments.stream()
                        .filter(s -> "TRAIN".equals(s.getTransportMode()))
                        .toList();
                title       = "🚂 Rail Network Closure";
                description = "Critical rail junction failure causing network-wide delays. " +
                        affected.size() + " train shipment(s) held at interchange stations.";
                severity    = "MEDIUM";
                break;

            default:
                affected    = List.of();
                title       = "⚙️ System Simulation";
                description = "Generic disruption scenario triggered.";
                severity    = "MEDIUM";
        }

        Map<String, Object> result = new HashMap<>();
        result.put("title",            title);
        result.put("description",      description);
        result.put("severity",         severity);
        result.put("affectedCount",    affected.size());
        result.put("affectedIds",
                affected.stream().map(Shipment::getId).toList());
        result.put("affectedTrackingIds",
                affected.stream().map(Shipment::getTrackingId).toList());
        return result;
    }

    // ================================================================
    // HELPERS
    // ================================================================
    private Map<String, Object> buildDisruptionResult(
            String type, String severity, String description) {
        Map<String, Object> r = new HashMap<>();
        r.put("type",        type);
        r.put("severity",    severity);
        r.put("description", description);
        r.put("detectedAt",  LocalDateTime.now().toString());
        return r;
    }

    private String buildSeaDisruptionMsg(Shipment s, String zone, String type) {
        String typeDesc = switch (type) {
            case "piracy"        -> "Piracy alert";
            case "geopolitical"  -> "Geopolitical tension";
            case "congestion"    -> "Heavy vessel congestion";
            case "weather"       -> "Severe ocean weather";
            default              -> "Navigation hazard";
        };
        return "🚢 " + typeDesc + " reported at " + zone +
                " on the " + getRouteLabel(s) + " sea lane. " +
                "Vessel holding pending maritime authority clearance.";
    }

    private String getSeverityForSeaZone(String zoneType) {
        return switch (zoneType) {
            case "piracy", "geopolitical" -> "HIGH";
            default                       -> "MEDIUM";
        };
    }

    private boolean isRoadDisruption(String text) {
        return text.contains("road")     || text.contains("highway") ||
                text.contains("flood")   || text.contains("accident") ||
                text.contains("traffic") || text.contains("landslide") ||
                text.contains("blocked") || text.contains("bridge") ||
                text.contains("storm")   || text.contains("cyclone");
    }

    private boolean isRouteRegionMatch(String newsText, Shipment s) {
        String os = extractState(s.getOrigin()).toLowerCase();
        String ds = extractState(s.getDestination()).toLowerCase();
        return (!os.isBlank() && newsText.contains(os)) ||
                (!ds.isBlank() && newsText.contains(ds)) ||
                Math.random() < 0.20; // 20% chance for generic national news
    }

    private String extractState(String location) {
        if (location == null || location.isBlank()) return "";
        String[] parts = location.split(",");
        return parts.length > 1 ? parts[parts.length - 1].trim() : location.trim();
    }

    private String getRouteLabel(Shipment s) {
        String from = s.getOrigin()      != null ? s.getOrigin().split(",")[0]      : "?";
        String to   = s.getDestination() != null ? s.getDestination().split(",")[0] : "?";
        return from + " → " + to;
    }

    private boolean isNearSuez(Shipment s) {
        if (s.getCurrentLat() == null) return false;
        // Suez Canal corridor: roughly 28-33°N, 32-33°E
        return s.getCurrentLat() > 28 && s.getCurrentLat() < 33 &&
                s.getCurrentLng() > 31 && s.getCurrentLng() < 34;
    }

    private boolean isOverEurope(Shipment s) {
        if (s.getCurrentLat() == null) return false;
        return s.getCurrentLat() > 35 && s.getCurrentLat() < 72 &&
                s.getCurrentLng() > -12 && s.getCurrentLng() < 45;
    }
}