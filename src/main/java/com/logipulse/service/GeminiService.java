package com.logipulse.service;

import com.logipulse.model.RouteAnomaly;
import com.logipulse.model.Shipment;
import com.logipulse.repository.RouteAnomalyRepository;
import com.logipulse.repository.ShipmentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class GeminiService {

    // PUT YOUR NEW API KEY HERE
    private static final String GEMINI_API_KEY = "AIzaSyDmX4XaMBGKITYNOK9LfLBbbN_Imb-tHEc";

    // THIS IS THE EXACT CORRECT URL - DO NOT MODIFY
    private static final String GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=";

    @Autowired
    private ShipmentRepository shipmentRepository;

    @Autowired
    private RouteAnomalyRepository routeAnomalyRepository;

    // ----------------------------------------------------------------
    // Build rich context from live database
    // ----------------------------------------------------------------
    private String buildSystemContext() {
        List<Shipment>     shipments = shipmentRepository.findAll();
        List<RouteAnomaly> anomalies = routeAnomalyRepository.findAll();

        // Mode breakdown
        long trucks  = shipments.stream().filter(s -> "TRUCK".equals(s.getTransportMode()) || s.getTransportMode() == null).count();
        long ships   = shipments.stream().filter(s -> "SHIP".equals(s.getTransportMode())).count();
        long planes  = shipments.stream().filter(s -> "PLANE".equals(s.getTransportMode())).count();
        long trains  = shipments.stream().filter(s -> "TRAIN".equals(s.getTransportMode())).count();

        long inTransit = shipments.stream().filter(s -> "IN_TRANSIT".equals(s.getStatus())).count();
        long delayed   = shipments.stream().filter(s -> "DELAYED".equals(s.getStatus())).count();
        long rerouted  = shipments.stream().filter(s -> "REROUTED".equals(s.getStatus())).count();
        long delivered = shipments.stream().filter(s -> "DELIVERED".equals(s.getStatus())).count();

        StringBuilder ctx = new StringBuilder();
        ctx.append("You are VSST AI — Virtual Supply Chain & Smart Transit assistant. ")
                .append("VSST is a GLOBAL multi-modal supply chain platform covering ")
                .append("trucks, ships, planes, and trains across 200+ cities on 6 continents. ")
                .append("Be concise (2-4 sentences max). Use emoji mode icons: 🚛🚢✈️🚂. ")
                .append("Reference specific tracking IDs from the data below.\n\n")
                .append("=== LIVE DATA (")
                .append(LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd MMM yyyy HH:mm")))
                .append(") ===\n\n")
                .append("FLEET SUMMARY:\n")
                .append("Total=").append(shipments.size())
                .append(" | InTransit=").append(inTransit)
                .append(" | Delayed=").append(delayed)
                .append(" | Rerouted=").append(rerouted)
                .append(" | Delivered=").append(delivered).append("\n")
                .append("BY MODE: 🚛").append(trucks)
                .append(" 🚢").append(ships)
                .append(" ✈️").append(planes)
                .append(" 🚂").append(trains)
                .append(" | Disruptions=").append(anomalies.size()).append("\n\n")
                .append("SHIPMENTS:\n");

        shipments.forEach(s -> {
            String modeIcon = s.getTransportMode() == null ? "🚛" :
                    switch (s.getTransportMode()) {
                        case "SHIP"  -> "🚢";
                        case "PLANE" -> "✈️";
                        case "TRAIN" -> "🚂";
                        default      -> "🚛";
                    };
            ctx.append(modeIcon).append(" ").append(s.getTrackingId())
                    .append(" [").append(s.getStatus()).append("]")
                    .append(" ").append(s.getCargoType())
                    .append(" | ")
                    .append(s.getOrigin() != null ? s.getOrigin().split(",")[0] : "?")
                    .append("→")
                    .append(s.getDestination() != null ? s.getDestination().split(",")[0] : "?")
                    .append(" | ").append(s.getAssignedDriverName() != null ? s.getAssignedDriverName() : "No driver")
                    .append(" | ETA:")
                    .append(s.getEstimatedDeliveryTime() != null
                            ? s.getEstimatedDeliveryTime().format(DateTimeFormatter.ofPattern("dd MMM HH:mm"))
                            : "N/A")
                    .append("\n");
        });

        if (!anomalies.isEmpty()) {
            ctx.append("\nACTIVE DISRUPTIONS:\n");
            anomalies.stream().limit(5).forEach(a ->
                    ctx.append("• Shipment #").append(a.getShipmentId())
                            .append(" [").append(a.getSeverity()).append("] ")
                            .append(a.getDescription() != null
                                    ? a.getDescription().substring(0, Math.min(80, a.getDescription().length()))
                                    : "").append("\n")
            );
        }

        ctx.append("\nKEY VSST CAPABILITIES: Global routes, sea lane piracy detection, " +
                "airspace restrictions, Suez/Panama canal status, partner company management.\n");
        ctx.append("Answer in context of the live data above. Be specific.");

        return ctx.toString();
    }

    // ----------------------------------------------------------------
    // Main chat method — tries Gemini first, falls back to rule engine
    // ----------------------------------------------------------------
    public String chat(String userMessage) {
        try {
            String geminiResponse = callGeminiAPIWithRetries(userMessage);
            if (geminiResponse != null && !geminiResponse.isBlank()) {
                return geminiResponse;
            }
        } catch (Exception e) {
            System.err.println("GeminiService: API completely failed — " + e.getMessage());
        }
        // Rule-based fallback if API is permanently down or out of quota
        return analyseAndRespond(userMessage);
    }

    // ----------------------------------------------------------------
    // Gemini API call with Exponential Backoff (Fixes HTTP 429)
    // ----------------------------------------------------------------
    private String callGeminiAPIWithRetries(String userMessage) throws Exception {
        String systemContext = buildSystemContext();
        String fullPrompt    = systemContext + "\n\nUser: " + userMessage + "\n\nAssistant:";

        String requestBody = "{"
                + "\"contents\":[{\"parts\":[{\"text\":"
                + escapeJson(fullPrompt) + "}]}],"
                + "\"generationConfig\":{"
                + "\"temperature\":0.3,"
                + "\"maxOutputTokens\":500,"
                + "\"topP\":0.8"
                + "}}";

        int maxRetries = 3;
        int delayMs = 2000; // Start with 2 second delay

        for (int attempt = 1; attempt <= maxRetries; attempt++) {
            URL url = new URL(GEMINI_URL + GEMINI_API_KEY);
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("POST");
            conn.setRequestProperty("Content-Type", "application/json");
            conn.setDoOutput(true);
            conn.setConnectTimeout(12000);
            conn.setReadTimeout(12000);

            try (OutputStream os = conn.getOutputStream()) {
                os.write(requestBody.getBytes(StandardCharsets.UTF_8));
            }

            int status = conn.getResponseCode();

            // Handle HTTP 429 (Too Many Requests)
            if (status == 429) {
                System.err.println("Gemini API Rate Limited (429). Attempt " + attempt + " of " + maxRetries + " failed. Waiting " + delayMs + "ms...");
                if (attempt == maxRetries) {
                    return null; // Give up and let the fallback rule engine handle it
                }
                Thread.sleep(delayMs);
                delayMs *= 2; // Exponential backoff (2s, 4s, 8s...)
                continue; // Try again
            }

            // Handle standard errors
            if (status != 200) {
                System.err.println("Gemini API Error HTTP " + status);
                return null;
            }

            // Handle Success
            try (BufferedReader br = new BufferedReader(new InputStreamReader(conn.getInputStream(), StandardCharsets.UTF_8))) {
                StringBuilder sb = new StringBuilder();
                String line;
                while ((line = br.readLine()) != null) sb.append(line);
                return extractGeminiText(sb.toString());
            }
        }
        return null;
    }

    // ----------------------------------------------------------------
    // Extract text from Gemini JSON
    // ----------------------------------------------------------------
    private String extractGeminiText(String json) {
        try {
            // Find "text": " pattern
            String marker = "\"text\":\"";
            int start = json.indexOf(marker);
            if (start < 0) return null;
            start += marker.length();

            StringBuilder result = new StringBuilder();
            int i = start;
            while (i < json.length()) {
                char c = json.charAt(i);
                if (c == '"' && (i == 0 || json.charAt(i - 1) != '\\')) break;
                if (c == '\\' && i + 1 < json.length()) {
                    char next = json.charAt(i + 1);
                    switch (next) {
                        case 'n': result.append('\n'); i += 2; continue;
                        case 't': result.append('\t'); i += 2; continue;
                        case '"': result.append('"');  i += 2; continue;
                        case '\\': result.append('\\'); i += 2; continue;
                        default: result.append(c); i++; continue;
                    }
                }
                result.append(c);
                i++;
            }
            String text = result.toString().trim();
            return text.isEmpty() ? null : text;
        } catch (Exception e) {
            System.err.println("GeminiService: Parse error — " + e.getMessage());
            return null;
        }
    }

    // ================================================================
    // INTELLIGENT RULE-BASED FALLBACK
    // ================================================================
    private String analyseAndRespond(String input) {
        String msg   = input.toLowerCase().trim();
        List<Shipment> all = shipmentRepository.findAll();

        // ----------------------------------------------------------
        // INTENT: Mode-specific queries
        // ----------------------------------------------------------
        if (hasAny(msg, "ship", "vessel", "maritime", "sea", "ocean", "port")) {
            return buildModeResponse(all, "SHIP", "🚢", "Ship / Maritime");
        }
        if (hasAny(msg, "plane", "flight", "air", "aviation", "aircraft", "airport")) {
            return buildModeResponse(all, "PLANE", "✈️", "Air / Aviation");
        }
        if (hasAny(msg, "train", "rail", "railway", "locomotive")) {
            return buildModeResponse(all, "TRAIN", "🚂", "Rail / Train");
        }
        if (hasAny(msg, "truck", "road", "highway", "lorry")) {
            return buildModeResponse(all, "TRUCK", "🚛", "Truck / Road");
        }

        // ----------------------------------------------------------
        // INTENT: Strategic Waterways
        // ----------------------------------------------------------
        if (hasAny(msg, "suez", "canal", "panama", "hormuz", "malacca", "strait")) {
            return "🗺️ **Strategic Waterway Status:**\n" +
                    "• Suez Canal — Normal transit time\n" +
                    "• Panama Canal — Normal operations\n" +
                    "• Strait of Malacca — High traffic, monitoring\n" +
                    "• Strait of Hormuz — Elevated caution\n\n" +
                    "Ship disruptions are auto-detected when vessels enter risk zones. " +
                    "Check Control Tower for live sea lane status.";
        }

        // ----------------------------------------------------------
        // INTENT: Global Summary
        // ----------------------------------------------------------
        if (hasAny(msg, "global", "worldwide", "continent", "international")) {
            return buildGlobalSummary(all);
        }

        // ----------------------------------------------------------
        // INTENT: Greeting
        // ----------------------------------------------------------
        if (hasAny(msg, "hello", "hi", "hey", "good morning", "good evening",
                "good afternoon", "howdy", "namaste", "hola", "what's up", "sup")) {
            long delayed = all.stream().filter(s -> "DELAYED".equals(s.getStatus())).count();
            String alert = delayed > 0
                    ? " ⚠️ Alert: " + delayed + " shipment(s) need attention."
                    : " ✅ All shipments are operating normally.";
            return "👋 Hello! I'm VSST AI, your supply chain assistant." + alert +
                    " Ask me about shipments, delays, routes, weather impact, or fleet status!";
        }

        // ----------------------------------------------------------
        // INTENT: Help / Capabilities
        // ----------------------------------------------------------
        if (hasAny(msg, "help", "what can you", "what do you", "how do you",
                "capabilities", "features", "assist", "commands", "options")) {
            return "🤖 I can help you with:\n" +
                    "• **Shipment status** — 'Which shipments are delayed?'\n" +
                    "• **Fleet summary** — 'Give me a fleet overview'\n" +
                    "• **Specific shipment** — 'What is the status of LP-BLR-001?'\n" +
                    "• **Driver info** — 'Which driver has the most shipments?'\n" +
                    "• **Risk analysis** — 'Show me high risk shipments'\n" +
                    "• **Route info** — 'What routes are active?'\n" +
                    "• **Cargo info** — 'What cargo types are in transit?'\n" +
                    "• **Weather impact** — 'Is weather affecting any shipments?'\n" +
                    "Just ask me anything in plain English!";
        }

        // ----------------------------------------------------------
        // INTENT: Fleet / Summary / Overview
        // ----------------------------------------------------------
        if (hasAny(msg, "summary", "overview", "fleet", "total", "how many",
                "count", "statistics", "stats", "status", "all shipment",
                "give me", "show me all", "list all")) {
            return buildFleetSummary(all);
        }

        // ----------------------------------------------------------
        // INTENT: Delayed shipments
        // ----------------------------------------------------------
        if (hasAny(msg, "delay", "delayed", "late", "behind", "stuck",
                "not moving", "slow", "overdue", "issue", "problem",
                "trouble", "disruption")) {
            return buildDelayedResponse(all);
        }

        // ----------------------------------------------------------
        // INTENT: Rerouted shipments
        // ----------------------------------------------------------
        if (hasAny(msg, "reroute", "rerouted", "alternate route", "bypass",
                "diverted", "divert", "changed route")) {
            return buildReroutedResponse(all);
        }

        // ----------------------------------------------------------
        // INTENT: Delivered / Completed
        // ----------------------------------------------------------
        if (hasAny(msg, "delivered", "completed", "arrived", "reached",
                "done", "finished", "successful")) {
            return buildDeliveredResponse(all);
        }

        // ----------------------------------------------------------
        // INTENT: In transit / Active / Moving
        // ----------------------------------------------------------
        if (hasAny(msg, "in transit", "transit", "moving", "on the way",
                "active", "travelling", "traveling", "en route")) {
            return buildInTransitResponse(all);
        }

        // ----------------------------------------------------------
        // INTENT: High priority / Risk / Critical
        // ----------------------------------------------------------
        if (hasAny(msg, "high", "risk", "critical", "urgent", "priority",
                "important", "emergency", "severe", "danger", "alert")) {
            return buildHighRiskResponse(all);
        }

        // ----------------------------------------------------------
        // INTENT: Driver information
        // ----------------------------------------------------------
        if (hasAny(msg, "driver", "who is driving", "assigned driver",
                "driver performance", "which driver")) {
            return buildDriverResponse(all);
        }

        // ----------------------------------------------------------
        // INTENT: Cargo / freight information
        // ----------------------------------------------------------
        if (hasAny(msg, "cargo", "freight", "shipment type", "goods",
                "material", "product", "load", "weight", "kg", "ton")) {
            return buildCargoResponse(all);
        }

        // ----------------------------------------------------------
        // INTENT: Route / corridor information
        // ----------------------------------------------------------
        if (hasAny(msg, "route", "corridor", "path", "way",
                "from where", "origin", "destination", "where is",
                "from", "to", "source", "going to", "coming from")) {
            return buildRouteResponse(all, msg);
        }

        // ----------------------------------------------------------
        // INTENT: Weather
        // ----------------------------------------------------------
        if (hasAny(msg, "weather", "rain", "storm", "flood", "wind",
                "temperature", "climate", "forecast", "humidity")) {
            List<Shipment> delayed = all.stream()
                    .filter(s -> "DELAYED".equals(s.getStatus()))
                    .collect(Collectors.toList());

            StringBuilder sb = new StringBuilder("🌤️ **Weather Impact on Fleet:**\n\n");

            if (delayed.isEmpty()) {
                sb.append("✅ No weather-related delays at this time. " +
                        "Weather is being monitored at all shipment GPS positions.\n\n");
            } else {
                sb.append("⚠️ **" + delayed.size() + " shipment(s) currently delayed** " +
                        "— weather may be a contributing factor:\n");
                delayed.forEach(s -> sb.append("• **").append(s.getTrackingId())
                        .append("** — ").append(s.getOrigin() != null
                                ? s.getOrigin().split(",")[0] : "?")
                        .append(" → ").append(s.getDestination() != null
                                ? s.getDestination().split(",")[0] : "?")
                        .append("\n"));
                sb.append("\n");
            }

            sb.append("💡 Weather is checked in real-time via OpenWeatherMap at each " +
                    "shipment's current GPS position. Hazardous conditions trigger " +
                    "automatic disruptions and AI rerouting.\n");
            sb.append("📍 Click any map marker on the Control Tower to see live " +
                    "weather at that location.");

            return sb.toString();
        }

        // ----------------------------------------------------------
        // INTENT: ETA / Time / When
        // ----------------------------------------------------------
        if (hasAny(msg, "eta", "when", "time", "arrive", "arrival",
                "expected", "delivery time", "how long", "soon")) {
            return buildEtaResponse(all);
        }

        // ----------------------------------------------------------
        // INTENT: Specific tracking ID mentioned
        // ----------------------------------------------------------
        for (Shipment s : all) {
            if (s.getTrackingId() != null &&
                    msg.contains(s.getTrackingId().toLowerCase())) {
                return buildSingleShipmentResponse(s);
            }
        }

        // ----------------------------------------------------------
        // INTENT: City / location mentioned
        // ----------------------------------------------------------
        String cityMatch = findCityMention(msg, all);
        if (cityMatch != null) return cityMatch;

        // ----------------------------------------------------------
        // INTENT: Affirmative/Negative responses
        // ----------------------------------------------------------
        if (hasAny(msg, "yes", "ok", "okay", "sure", "alright",
                "proceed", "confirm", "go ahead", "correct")) {
            return "✅ Understood! Let me know what specific information you need — " +
                    "shipment status, delays, route details, or fleet summary?";
        }

        if (hasAny(msg, "no", "nope", "cancel", "stop", "never mind",
                "exit", "quit", "bye", "goodbye", "thanks", "thank you")) {
            return "👍 Got it! I'm here whenever you need supply chain assistance. " +
                    "Your fleet currently has " + all.size() + " shipments being tracked.";
        }

        // ----------------------------------------------------------
        // INTENT: Performance / Analytics
        // ----------------------------------------------------------
        if (hasAny(msg, "performance", "analytics", "analysis", "report",
                "metric", "kpi", "efficiency", "on time", "rate")) {
            return buildPerformanceResponse(all);
        }

        // ----------------------------------------------------------
        // DEFAULT: Smart fallback with system status
        // ----------------------------------------------------------
        return buildSmartDefault(all, input);
    }

    // ================================================================
    // RESPONSE BUILDERS
    // ================================================================

    private String buildFleetSummary(List<Shipment> all) {
        long inTransit = all.stream().filter(s -> "IN_TRANSIT".equals(s.getStatus())).count();
        long delayed   = all.stream().filter(s -> "DELAYED".equals(s.getStatus())).count();
        long rerouted  = all.stream().filter(s -> "REROUTED".equals(s.getStatus())).count();
        long delivered = all.stream().filter(s -> "DELIVERED".equals(s.getStatus())).count();
        long highPrio  = all.stream().filter(s -> "HIGH".equals(s.getPriority())).count();

        double totalTons = all.stream()
                .mapToDouble(s -> s.getWeightKg() != null ? s.getWeightKg() : 0).sum() / 1000;

        int health = all.isEmpty() ? 100
                : (int)Math.round(((inTransit + delivered + rerouted * 0.6) / (double)all.size()) * 100);

        return "📊 **Fleet Summary**\n" +
                "• Total shipments: **" + all.size() + "**\n" +
                "• 🚛 In Transit: **" + inTransit + "**\n" +
                "• ⚠️ Delayed: **" + delayed + "**\n" +
                "• 🔄 Rerouted: **" + rerouted + "**\n" +
                "• ✅ Delivered: **" + delivered + "**\n" +
                "• ⚡ High Priority: **" + highPrio + "**\n" +
                "• 📦 Total cargo: **" + String.format("%.1f", totalTons) + " tonnes**\n" +
                "• 📈 Route health: **" + health + "%**";
    }

    private String buildDelayedResponse(List<Shipment> all) {
        List<Shipment> delayed = all.stream()
                .filter(s -> "DELAYED".equals(s.getStatus()))
                .collect(Collectors.toList());

        if (delayed.isEmpty()) {
            return "✅ Great news! No shipments are currently delayed. " +
                    "All " + all.size() + " shipments are operating normally. " +
                    "Route health is optimal.";
        }

        StringBuilder sb = new StringBuilder();
        sb.append("⚠️ **").append(delayed.size()).append(" delayed shipment(s):**\n");
        delayed.forEach(s -> {
            String from = s.getOrigin()      != null ? s.getOrigin().split(",")[0]      : "?";
            String to   = s.getDestination() != null ? s.getDestination().split(",")[0] : "?";
            sb.append("• **").append(s.getTrackingId()).append("** — ")
                    .append(from).append(" → ").append(to)
                    .append(" (").append(s.getCargoType()).append(")\n");
        });
        sb.append("\n💡 Use **Calculate Reroute** on each delayed shipment to get AI-suggested alternate routes.");
        return sb.toString();
    }

    private String buildReroutedResponse(List<Shipment> all) {
        List<Shipment> rerouted = all.stream()
                .filter(s -> "REROUTED".equals(s.getStatus()))
                .collect(Collectors.toList());

        if (rerouted.isEmpty()) {
            return "🔄 No shipments are currently rerouted. " +
                    "All active shipments are on their original planned routes.";
        }

        StringBuilder sb = new StringBuilder();
        sb.append("🔄 **").append(rerouted.size()).append(" rerouted shipment(s):**\n");
        rerouted.forEach(s -> {
            String from = s.getOrigin()      != null ? s.getOrigin().split(",")[0]      : "?";
            String to   = s.getDestination() != null ? s.getDestination().split(",")[0] : "?";
            String eta  = s.getEstimatedDeliveryTime() != null
                    ? s.getEstimatedDeliveryTime().format(DateTimeFormatter.ofPattern("dd MMM HH:mm"))
                    : "N/A";
            sb.append("• **").append(s.getTrackingId()).append("** — ")
                    .append(from).append(" → ").append(to)
                    .append(" | ETA: ").append(eta).append("\n");
        });
        return sb.toString();
    }

    private String buildDeliveredResponse(List<Shipment> all) {
        List<Shipment> delivered = all.stream()
                .filter(s -> "DELIVERED".equals(s.getStatus()))
                .collect(Collectors.toList());

        if (delivered.isEmpty()) {
            return "📦 No shipments have been delivered yet in this session. " +
                    "There are " + all.size() + " active shipments currently being tracked.";
        }

        double totalKg = delivered.stream()
                .mapToDouble(s -> s.getWeightKg() != null ? s.getWeightKg() : 0).sum();

        StringBuilder sb = new StringBuilder();
        sb.append("✅ **").append(delivered.size()).append(" delivered shipment(s):**\n");
        delivered.forEach(s ->
                sb.append("• **").append(s.getTrackingId()).append("** — ")
                        .append(s.getCargoType()).append(" to ")
                        .append(s.getDestination() != null ? s.getDestination().split(",")[0] : "?")
                        .append("\n")
        );
        sb.append("\n📦 Total cargo delivered: **")
                .append(String.format("%.1f", totalKg / 1000)).append(" tonnes**");
        return sb.toString();
    }

    private String buildInTransitResponse(List<Shipment> all) {
        List<Shipment> moving = all.stream()
                .filter(s -> "IN_TRANSIT".equals(s.getStatus()))
                .collect(Collectors.toList());

        if (moving.isEmpty()) {
            return "🚛 No shipments are currently in transit. " +
                    "Check the Shipments page to create new shipments or view rerouted ones.";
        }

        StringBuilder sb = new StringBuilder();
        sb.append("🚛 **").append(moving.size()).append(" shipment(s) in transit:**\n");
        moving.forEach(s -> {
            String from = s.getOrigin()      != null ? s.getOrigin().split(",")[0]      : "?";
            String to   = s.getDestination() != null ? s.getDestination().split(",")[0] : "?";
            String eta  = s.getEstimatedDeliveryTime() != null
                    ? s.getEstimatedDeliveryTime().format(DateTimeFormatter.ofPattern("dd MMM HH:mm"))
                    : "N/A";
            sb.append("• **").append(s.getTrackingId()).append("** — ")
                    .append(from).append(" → ").append(to)
                    .append(" | ETA: ").append(eta).append("\n");
        });
        return sb.toString();
    }

    private String buildHighRiskResponse(List<Shipment> all) {
        List<Shipment> highRisk = all.stream()
                .filter(s -> "DELAYED".equals(s.getStatus()) || "HIGH".equals(s.getPriority()))
                .collect(Collectors.toList());

        if (highRisk.isEmpty()) {
            return "✅ No high-risk shipments at this time. " +
                    "All shipments are operating within normal parameters.";
        }

        StringBuilder sb = new StringBuilder();
        sb.append("🚨 **High-risk / priority shipments:**\n");
        highRisk.forEach(s -> {
            sb.append("• **").append(s.getTrackingId()).append("**")
                    .append(" [").append(s.getStatus()).append("]")
                    .append(" [Priority: ").append(s.getPriority() != null ? s.getPriority() : "NORMAL").append("]")
                    .append(" — ").append(s.getCargoType())
                    .append("\n");
        });
        sb.append("\n💡 Immediate action: Click **Calculate Reroute** for delayed shipments on the Control Tower.");
        return sb.toString();
    }

    private String buildDriverResponse(List<Shipment> all) {
        if (all.isEmpty()) {
            return "No shipment or driver data available yet.";
        }

        java.util.Map<String, Long> driverCounts = all.stream()
                .filter(s -> s.getAssignedDriverName() != null)
                .collect(Collectors.groupingBy(
                        Shipment::getAssignedDriverName,
                        Collectors.counting()
                ));

        if (driverCounts.isEmpty()) {
            return "👤 No drivers are currently assigned to any shipments. " +
                    "Assign drivers through the Fleet Management page.";
        }

        StringBuilder sb = new StringBuilder();
        sb.append("👤 **Driver Assignments:**\n");
        driverCounts.entrySet().stream()
                .sorted((a,b) -> Long.compare(b.getValue(), a.getValue()))
                .forEach(e -> {
                    long delayed = all.stream()
                            .filter(s -> e.getKey().equals(s.getAssignedDriverName())
                                    && "DELAYED".equals(s.getStatus()))
                            .count();
                    sb.append("• **").append(e.getKey()).append("** — ")
                            .append(e.getValue()).append(" shipment(s)")
                            .append(delayed > 0 ? " ⚠️ " + delayed + " delayed" : " ✅")
                            .append("\n");
                });

        long unassigned = all.stream()
                .filter(s -> s.getAssignedDriverName() == null || s.getAssignedDriverName().isBlank())
                .count();
        if (unassigned > 0) {
            sb.append("• **Unassigned** — ").append(unassigned).append(" shipment(s)\n");
        }
        return sb.toString();
    }

    private String buildCargoResponse(List<Shipment> all) {
        if (all.isEmpty()) return "No cargo data available yet.";

        java.util.Map<String, Long> cargoCounts = all.stream()
                .collect(Collectors.groupingBy(
                        s -> s.getCargoType() != null ? s.getCargoType() : "Unknown",
                        Collectors.counting()
                ));

        double totalTons = all.stream()
                .mapToDouble(s -> s.getWeightKg() != null ? s.getWeightKg() : 0).sum() / 1000;

        StringBuilder sb = new StringBuilder();
        sb.append("📦 **Cargo in Network:**\n");
        cargoCounts.entrySet().stream()
                .sorted((a,b) -> Long.compare(b.getValue(), a.getValue()))
                .limit(8)
                .forEach(e ->
                        sb.append("• ").append(e.getKey()).append(": **")
                                .append(e.getValue()).append("** shipment(s)\n")
                );
        sb.append("\n📊 Total cargo weight: **")
                .append(String.format("%.1f", totalTons)).append(" tonnes**");
        return sb.toString();
    }

    private String buildRouteResponse(List<Shipment> all, String msg) {
        if (all.isEmpty()) return "No route data available yet.";

        String cityResponse = findCityMention(msg, all);
        if (cityResponse != null) return cityResponse;

        java.util.Map<String, Long> routeCounts = all.stream()
                .collect(Collectors.groupingBy(s -> {
                    String from = s.getOrigin()      != null ? s.getOrigin().split(",")[0]      : "Unknown";
                    String to   = s.getDestination() != null ? s.getDestination().split(",")[0] : "Unknown";
                    return from + " → " + to;
                }, Collectors.counting()));

        StringBuilder sb = new StringBuilder();
        sb.append("🗺️ **Active Route Corridors:**\n");
        routeCounts.entrySet().stream()
                .sorted((a,b) -> Long.compare(b.getValue(), a.getValue()))
                .forEach(e ->
                        sb.append("• ").append(e.getKey())
                                .append(": **").append(e.getValue()).append("** shipment(s)\n")
                );
        return sb.toString();
    }

    private String buildEtaResponse(List<Shipment> all) {
        List<Shipment> active = all.stream()
                .filter(s -> !"DELIVERED".equals(s.getStatus()))
                .filter(s -> s.getEstimatedDeliveryTime() != null)
                .collect(Collectors.toList());

        if (active.isEmpty()) {
            return "📅 No active shipments with ETA data available at the moment.";
        }

        StringBuilder sb = new StringBuilder();
        sb.append("⏱️ **Upcoming ETAs:**\n");
        active.stream()
                .sorted((a,b) -> a.getEstimatedDeliveryTime().compareTo(b.getEstimatedDeliveryTime()))
                .limit(6)
                .forEach(s -> {
                    String eta = s.getEstimatedDeliveryTime()
                            .format(DateTimeFormatter.ofPattern("dd MMM, hh:mm a"));
                    String dest = s.getDestination() != null ? s.getDestination().split(",")[0] : "?";
                    String flag = "DELAYED".equals(s.getStatus()) ? " ⚠️" :
                            "REROUTED".equals(s.getStatus()) ? " 🔄" : " ✅";
                    sb.append("• **").append(s.getTrackingId()).append("**")
                            .append(flag).append(" → ").append(dest)
                            .append(" | ").append(eta).append("\n");
                });
        return sb.toString();
    }

    private String buildPerformanceResponse(List<Shipment> all) {
        if (all.isEmpty()) return "No performance data available yet.";

        long delivered = all.stream().filter(s -> "DELIVERED".equals(s.getStatus())).count();
        long delayed   = all.stream().filter(s -> "DELAYED".equals(s.getStatus())).count();
        long rerouted  = all.stream().filter(s -> "REROUTED".equals(s.getStatus())).count();
        long anomalies = routeAnomalyRepository.count();

        int onTimeRate = all.isEmpty() ? 0
                : (int) Math.round(((double)(all.size() - delayed) / all.size()) * 100);

        return "📈 **Performance Metrics:**\n" +
                "• On-Time Rate: **" + onTimeRate + "%**\n" +
                "• Delay Rate: **" + (100 - onTimeRate) + "%**\n" +
                "• Completed Deliveries: **" + delivered + "** of " + all.size() + "\n" +
                "• Reroutes executed: **" + rerouted + "**\n" +
                "• Total disruptions: **" + anomalies + "**\n" +
                "\n💡 View the full **Analytics Dashboard** for detailed charts and corridor performance.";
    }

    private String buildSingleShipmentResponse(Shipment s) {
        String from = s.getOrigin()      != null ? s.getOrigin()      : "Unknown";
        String to   = s.getDestination() != null ? s.getDestination() : "Unknown";
        String eta  = s.getEstimatedDeliveryTime() != null
                ? s.getEstimatedDeliveryTime().format(DateTimeFormatter.ofPattern("dd MMM yyyy, hh:mm a"))
                : "N/A";
        String driver = s.getAssignedDriverName() != null ? s.getAssignedDriverName() : "Unassigned";

        String statusIcon = "IN_TRANSIT".equals(s.getStatus()) ? "🚛" :
                "DELAYED".equals(s.getStatus())    ? "⚠️" :
                "REROUTED".equals(s.getStatus())   ? "🔄" : "✅";

        String actionHint = "DELAYED".equals(s.getStatus())
                ? "\n💡 Action: Use **Calculate Reroute** on the Control Tower to get alternate routes."
                : "";

        return "📦 **Shipment " + s.getTrackingId() + "**\n" +
                "• Status: " + statusIcon + " **" + s.getStatus() + "**\n" +
                "• Cargo: **" + s.getCargoType() + "**" +
                (s.getWeightKg() != null ? " (" + s.getWeightKg() + " kg)" : "") + "\n" +
                "• Route: " + from.split(",")[0] + " → " + to.split(",")[0] + "\n" +
                "• Customer: **" + (s.getCustomerName() != null ? s.getCustomerName() : "Unknown") + "**\n" +
                "• Driver: **" + driver + "**\n" +
                "• Priority: **" + (s.getPriority() != null ? s.getPriority() : "NORMAL") + "**\n" +
                "• ETA: **" + eta + "**" +
                actionHint;
    }

    private String findCityMention(String msg, List<Shipment> all) {
        for (Shipment s : all) {
            String origin = s.getOrigin() != null ? s.getOrigin().toLowerCase() : "";
            String dest   = s.getDestination() != null ? s.getDestination().toLowerCase() : "";

            String originCity = origin.contains(",") ? origin.split(",")[0].trim() : origin;
            String destCity   = dest.contains(",")   ? dest.split(",")[0].trim()   : dest;

            if ((!originCity.isEmpty() && msg.contains(originCity)) ||
                    (!destCity.isEmpty()   && msg.contains(destCity))) {

                List<Shipment> matching = all.stream()
                        .filter(x -> {
                            String xo = x.getOrigin()      != null ? x.getOrigin().toLowerCase()      : "";
                            String xd = x.getDestination() != null ? x.getDestination().toLowerCase() : "";
                            return xo.contains(originCity) || xd.contains(destCity) ||
                                    xo.contains(destCity)   || xd.contains(originCity);
                        })
                        .collect(Collectors.toList());

                if (!matching.isEmpty()) {
                    String cityName = !originCity.isEmpty() ? originCity : destCity;
                    cityName = cityName.substring(0,1).toUpperCase() + cityName.substring(1);

                    StringBuilder sb = new StringBuilder();
                    sb.append("🗺️ **Shipments involving ").append(cityName).append(":**\n");
                    matching.forEach(x ->
                            sb.append("• **").append(x.getTrackingId()).append("** [")
                                    .append(x.getStatus()).append("] — ")
                                    .append(x.getOrigin() != null ? x.getOrigin().split(",")[0] : "?")
                                    .append(" → ")
                                    .append(x.getDestination() != null ? x.getDestination().split(",")[0] : "?")
                                    .append("\n")
                    );
                    return sb.toString();
                }
            }
        }
        return null;
    }

    private String buildSmartDefault(List<Shipment> all, String originalInput) {
        long delayed = all.stream().filter(s -> "DELAYED".equals(s.getStatus())).count();
        String status = delayed > 0
                ? "⚠️ Note: " + delayed + " shipment(s) currently need attention."
                : "✅ Fleet is operating normally.";

        return "🤖 I understood: \"" + originalInput + "\"\n\n" +
                "I'm not sure exactly what you're looking for. " + status + "\n\n" +
                "Try asking:\n" +
                "• \"Show delayed shipments\"\n" +
                "• \"Fleet summary\"\n" +
                "• \"Status of LP-BLR-001\"\n" +
                "• \"Which driver has delays?\"\n" +
                "• \"Show high priority shipments\"";
    }

    private boolean hasAny(String msg, String... keywords) {
        for (String kw : keywords) {
            if (msg.contains(kw)) return true;
        }
        return false;
    }

    private String escapeJson(String text) {
        return "\"" + text
                .replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\n", "\\n")
                .replace("\r", "\\r")
                .replace("\t", "\\t")
                + "\"";
    }

    // ================================================================
    // MODE & GLOBAL HELPERS
    // ================================================================

    private String buildModeResponse(List<Shipment> all, String mode, String icon, String label) {
        List<Shipment> modeShipments = all.stream()
                .filter(s -> mode.equals(s.getTransportMode()) ||
                        (mode.equals("TRUCK") && s.getTransportMode() == null))
                .collect(Collectors.toList());

        if (modeShipments.isEmpty()) {
            return icon + " No " + label + " shipments currently active. " +
                    "Create one from the Shipments page!";
        }

        long delayed   = modeShipments.stream().filter(s -> "DELAYED".equals(s.getStatus())).count();
        long rerouted  = modeShipments.stream().filter(s -> "REROUTED".equals(s.getStatus())).count();
        long delivered = modeShipments.stream().filter(s -> "DELIVERED".equals(s.getStatus())).count();

        StringBuilder sb = new StringBuilder(
                icon + " **" + label + " Shipments (" + modeShipments.size() + " total):**\n");
        sb.append("• ✅ Delivered: **").append(delivered).append("**\n");
        if (delayed > 0) sb.append("• ⚠️ Delayed: **").append(delayed).append("**\n");
        if (rerouted > 0) sb.append("• 🔄 Rerouted: **").append(rerouted).append("**\n");
        sb.append("\n");
        modeShipments.stream().filter(s -> !"DELIVERED".equals(s.getStatus())).limit(5)
                .forEach(s -> sb.append("• **").append(s.getTrackingId()).append("** [")
                        .append(s.getStatus()).append("] — ")
                        .append(s.getOrigin()      != null ? s.getOrigin().split(",")[0]      : "?")
                        .append(" → ")
                        .append(s.getDestination() != null ? s.getDestination().split(",")[0] : "?")
                        .append("\n"));
        return sb.toString();
    }

    private String buildGlobalSummary(List<Shipment> all) {
        java.util.Map<String, Long> byContinent = new java.util.LinkedHashMap<>();
        // Simple continent detection from city names (approximate)
        List<String> asiaCities = List.of("Mumbai", "Delhi", "Shanghai", "Singapore",
                "Tokyo", "Dubai", "Bangkok", "Jakarta", "Seoul", "Hong Kong");
        List<String> europeCities = List.of("London", "Rotterdam", "Hamburg", "Paris",
                "Amsterdam", "Frankfurt", "Istanbul", "Barcelona", "Antwerp");
        List<String> americasCities = List.of("New York", "Los Angeles", "Houston",
                "Chicago", "Toronto", "São Paulo", "Buenos Aires");

        long asia = all.stream().filter(s ->
                s.getOrigin() != null && asiaCities.stream().anyMatch(c ->
                        s.getOrigin().contains(c))).count();
        long europe = all.stream().filter(s ->
                s.getOrigin() != null && europeCities.stream().anyMatch(c ->
                        s.getOrigin().contains(c))).count();
        long americas = all.stream().filter(s ->
                s.getOrigin() != null && americasCities.stream().anyMatch(c ->
                        s.getOrigin().contains(c))).count();

        long trucks = all.stream().filter(s -> "TRUCK".equals(s.getTransportMode()) || s.getTransportMode() == null).count();
        long ships  = all.stream().filter(s -> "SHIP".equals(s.getTransportMode())).count();
        long planes = all.stream().filter(s -> "PLANE".equals(s.getTransportMode())).count();
        long trains = all.stream().filter(s -> "TRAIN".equals(s.getTransportMode())).count();

        return "🌍 **Global Supply Chain Status:**\n" +
                "**By Mode:** 🚛" + trucks + " 🚢" + ships + " ✈️" + planes + " 🚂" + trains + "\n\n" +
                "**By Region:**\n" +
                "• 🌏 Asia: " + asia + " origin(s)\n" +
                "• 🌍 Europe: " + europe + " origin(s)\n" +
                "• 🌎 Americas: " + americas + " origin(s)\n\n" +
                "Use the mode filter buttons on Control Tower to view specific transport types.";
    }
}