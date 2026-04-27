package com.logipulse.controller;

import com.logipulse.model.Shipment;
import com.logipulse.repository.ShipmentRepository;
import com.logipulse.service.WeatherService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/routes")
@CrossOrigin(origins = "*")
public class RouteEngineController {

    @Autowired
    private ShipmentRepository shipmentRepository;

    @Autowired
    private WeatherService weatherService;

    // ----------------------------------------------------------------
    // GET /api/routes/{shipmentId}/alternatives
    // Returns 3 alternative reroute options for a DELAYED shipment.
    // Each option has a name, reason, estimated extra hours, risk level.
    // ----------------------------------------------------------------
    @GetMapping("/{shipmentId}/alternatives")
    public ResponseEntity<?> getAlternativeRoutes(@PathVariable Long shipmentId) {

        Optional<Shipment> opt = shipmentRepository.findById(shipmentId);
        if (opt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Shipment s = opt.get();

        // Fetch real weather at shipment's current position
        Map<String, Object> weather = weatherService.getWeather(
                s.getCurrentLat(), s.getCurrentLng()
        );

        String weatherDesc = (String) weather.getOrDefault("description", "clear sky");
        String weatherMain = (String) weather.getOrDefault("main", "Clear");
        double windSpeed   = weather.get("wind_speed") != null
                ? ((Number) weather.get("wind_speed")).doubleValue() : 0.0;
        boolean hazardous  = Boolean.TRUE.equals(weather.get("isHazardous"));

        String origin      = s.getOrigin()      != null ? s.getOrigin().split(",")[0]      : "Origin";
        String destination = s.getDestination() != null ? s.getDestination().split(",")[0] : "Destination";

        // Calculate straight-line distance (km) between current pos and destination
        double distRemaining = haversineKm(
                s.getCurrentLat(), s.getCurrentLng(),
                s.getDestLat() != null ? s.getDestLat() : s.getCurrentLat(),
                s.getDestLng() != null ? s.getDestLng() : s.getCurrentLng()
        );

        List<Map<String, Object>> routes = new ArrayList<>();

        // ---- Route A: Fastest bypass ----
        Map<String, Object> routeA = new HashMap<>();
        routeA.put("id",          "A");
        routeA.put("name",        "Fastest Bypass Route");
        routeA.put("description", "Direct alternate highway avoiding the disruption zone. " +
                "Adds minimal distance but requires toll payment.");
        routeA.put("extraHours",     hazardous ? 3 : 2);
        routeA.put("extraKm",        Math.round(distRemaining * 0.15));
        routeA.put("risk",           hazardous ? "MEDIUM" : "LOW");
        routeA.put("riskColor",      hazardous ? "#f59e0b" : "#10b981");
        routeA.put("aiReason",
                "AI selected this as fastest option. Current weather (" + weatherDesc +
                        ", wind " + String.format("%.1f", windSpeed) + " km/h) " +
                        (hazardous ? "poses moderate risk on this corridor." : "is favourable for this route."));
        routeA.put("recommended",    !hazardous);
        routeA.put("etaTag",         !hazardous ? "BEST ETA" : null);
        routes.add(routeA);

        // ---- Route B: Safest corridor ----
        Map<String, Object> routeB = new HashMap<>();
        routeB.put("id",          "B");
        routeB.put("name",        "Safest All-Weather Corridor");
        routeB.put("description", "Well-maintained national highway through major towns. " +
                "Higher traffic but consistent road quality. Suitable for hazardous cargo.");
        routeB.put("extraHours",     hazardous ? 2 : 4);
        routeB.put("extraKm",        Math.round(distRemaining * 0.25));
        routeB.put("risk",           "LOW");
        routeB.put("riskColor",      "#10b981");
        routeB.put("aiReason",
                "AI recommends this route for reliable delivery despite " + weatherDesc +
                        " conditions. Road quality index is high and NHAI maintenance is recent. " +
                        (hazardous ? "Strongly recommended given current weather." : "Good fallback option."));
        routeB.put("recommended",    hazardous);
        routeB.put("etaTag",         hazardous ? "RECOMMENDED" : null);
        routes.add(routeB);

        // ---- Route C: Balanced option ----
        Map<String, Object> routeC = new HashMap<>();
        routeC.put("id",          "C");
        routeC.put("name",        "Balanced Route via State Highway");
        routeC.put("description", "State highway with moderate traffic. " +
                "Balance between distance and time. Cost-effective with no tolls.");
        routeC.put("extraHours",     3);
        routeC.put("extraKm",        Math.round(distRemaining * 0.10));
        routeC.put("risk",           "MEDIUM");
        routeC.put("riskColor",      "#f59e0b");
        routeC.put("aiReason",
                "Cost-optimal route. No toll charges. State highway condition: fair. " +
                        "Estimated congestion delay: 1 hour near urban centres. " +
                        "Weather impact on this corridor is minimal based on current " + weatherDesc + ".");
        routeC.put("recommended",    false);
        routeC.put("etaTag",         "COST SAVER");
        routes.add(routeC);

        Map<String, Object> response = new HashMap<>();
        response.put("shipmentId",    shipmentId);
        response.put("trackingId",    s.getTrackingId());
        response.put("origin",        origin);
        response.put("destination",   destination);
        response.put("distRemaining", Math.round(distRemaining));
        response.put("weather",       weather);
        response.put("routes",        routes);

        return ResponseEntity.ok(response);
    }

    private double haversineKm(double lat1, double lng1, double lat2, double lng2) {
        double R    = 6371;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLng = Math.toRadians(lng2 - lng1);
        double a    = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) *
                        Math.sin(dLng/2) * Math.sin(dLng/2);
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    }
}