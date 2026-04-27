package com.logipulse.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class GlobalRouteService {

    @Autowired
    private RouteGeometryService routeGeometryService;

    // ================================================================
    // SEA LANE WAYPOINTS
    // ================================================================
    private static final double[] MALACCA   = {  1.35,  103.82 };
    private static final double[] LOMBOK    = { -8.75,  115.75 };
    private static final double[] SUEZ_S    = { 27.50,   34.00 }; // Red Sea entry
    private static final double[] SUEZ_N    = { 31.25,   32.35 }; // Port Said
    private static final double[] ADEN      = { 12.78,   44.98 };
    private static final double[] DJIBOUTI  = { 11.59,   43.15 };
    private static final double[] GIBRALTAR = { 36.00,   -5.36 };
    private static final double[] CAPE_HOPE = {-34.36,   18.48 };
    private static final double[] PANAMA    = {  9.06,  -79.68 };
    private static final double[] HORMUZ    = { 26.56,   56.27 };
    private static final double[] BOSPHORUS = { 41.11,   29.02 };

    // North Pacific waypoint (for trans-Pacific great circle arc)
    private static final double[] N_PACIFIC = { 45.00, -170.00 };
    // South Pacific (Southern routes)
    private static final double[] S_PACIFIC = {-20.00, -160.00 };
    // Mid-Atlantic
    private static final double[] MID_ATLANTIC = { 30.00, -40.00 };
    // Indian Ocean
    private static final double[] INDIAN_OCEAN  = { -5.00,  75.00 };

    // ================================================================
    // RAIL WAYPOINTS
    // ================================================================
    // Trans-Siberian / Silk Road corridor
    private static final double[] MOSCOW    = { 55.75,   37.62 };
    private static final double[] NOVOSIBIRSK = { 54.98,  82.90 };
    private static final double[] IRKUTSK   = { 52.30,  104.30 };
    private static final double[] BEIJING_RAIL = { 39.90, 116.40 };
    private static final double[] URUMQI    = { 43.80,   87.60 };
    private static final double[] ALMATY    = { 43.26,   76.91 };
    private static final double[] TASHKENT  = { 41.30,   69.27 };
    private static final double[] TEHRAN    = { 35.69,   51.39 };
    private static final double[] ISTANBUL_R = { 41.01,  28.98 };

    // China-India via Myanmar
    private static final double[] KUNMING   = { 25.04,  102.71 };
    private static final double[] MANDALAY  = { 21.97,   96.09 };
    private static final double[] DHAKA_R   = { 23.81,   90.41 };
    private static final double[] KOLKATA_R = { 22.57,   88.36 };

    // ================================================================
    // MAIN ENTRY
    // ================================================================
    public String fetchRoute(double fromLat, double fromLng,
                             double toLat,   double toLng,
                             String transportMode) {
        String mode = transportMode == null ? "TRUCK" : transportMode.toUpperCase();
        switch (mode) {
            case "SHIP":  return fetchSeaRoute(fromLat, fromLng, toLat, toLng, false);
            case "PLANE": return fetchAirRoute(fromLat, fromLng, toLat, toLng, false);
            case "TRAIN": return fetchRailRoute(fromLat, fromLng, toLat, toLng);
            default:      return routeGeometryService.fetchRoadRoute(
                    fromLat, fromLng, toLat, toLng);
        }
    }

    public String fetchAlternateRoute(double fromLat, double fromLng,
                                      double toLat,   double toLng,
                                      String transportMode) {
        String mode = transportMode == null ? "TRUCK" : transportMode.toUpperCase();
        switch (mode) {
            case "SHIP":  return fetchSeaRoute(fromLat, fromLng, toLat, toLng, true);
            case "PLANE": return fetchAirRoute(fromLat, fromLng, toLat, toLng, true);
            case "TRAIN": return fetchRailAlt(fromLat, fromLng, toLat, toLng);
            default:      return routeGeometryService.fetchAlternateRoute(
                    fromLat, fromLng, toLat, toLng);
        }
    }

    // ================================================================
    // SEA ROUTE — Realistic waypoints
    // ================================================================
    private String fetchSeaRoute(double fromLat, double fromLng,
                                 double toLat,   double toLng,
                                 boolean alternate) {

        List<double[]> wps = determineSeaWaypoints(
                fromLat, fromLng, toLat, toLng, alternate);

        return buildWaypointRoute(fromLat, fromLng, toLat, toLng, wps, 15, false);
    }

    private List<double[]> determineSeaWaypoints(
            double fromLat, double fromLng,
            double toLat,   double toLng,
            boolean alternate) {

        List<double[]> wps = new ArrayList<>();

        // Region detection (simplified, robust)
        boolean fromAmericas   = fromLng < -25;
        boolean toAmericas     = toLng   < -25;
        boolean fromWAmericas  = fromLng < -75;  // West coast
        boolean toWAmericas    = toLng   < -75;
        boolean fromEAmericas  = fromLng >= -75 && fromLng < -25; // East coast
        boolean toEAmericas    = toLng   >= -75 && toLng   < -25;

        boolean fromEurope     = fromLng > -12 && fromLng < 45 && fromLat > 35;
        boolean toEurope       = toLng   > -12 && toLng   < 45 && toLat   > 35;

        boolean fromMediterranean = fromLng > -5 && fromLng < 37 && fromLat > 30 && fromLat < 45;
        boolean toMediterranean   = toLng > -5 && toLng < 37 && toLat > 30 && toLat < 45;

        boolean fromEAsia      = fromLng > 100 && fromLat > -15 && fromLat < 55;
        boolean toEAsia        = toLng   > 100 && toLat   > -15 && toLat   < 55;

        boolean fromSEAsia     = fromLng > 90  && fromLng < 125 && fromLat > -10 && fromLat < 25;
        boolean toSEAsia       = toLng   > 90  && toLng   < 125 && toLat   > -10 && toLat   < 25;

        boolean fromIndianOcean = fromLng > 45 && fromLng < 100 && fromLat > -35 && fromLat < 30;
        boolean toIndianOcean   = toLng > 45 && toLng < 100 && toLat > -35 && toLat < 30;

        boolean fromPersGulf   = fromLng > 45 && fromLng < 62 && fromLat > 20 && fromLat < 32;
        boolean toPersGulf     = toLng   > 45 && toLng   < 62 && toLat   > 20 && toLat   < 32;

        boolean fromRedSea     = fromLng > 32 && fromLng < 45 && fromLat > 12 && fromLat < 30;
        boolean toRedSea       = toLng   > 32 && toLng   < 45 && toLat   > 12 && toLat   < 30;

        boolean fromAfrica     = fromLng > -20 && fromLng < 55 && fromLat > -38 && fromLat < 38;
        boolean toAfrica       = toLng   > -20 && toLng   < 55 && toLat   > -38 && toLat   < 38;
        boolean fromSAfrica    = fromLat < -25;
        boolean toSAfrica      = toLat   < -25;

        boolean fromOceania    = fromLat < -10 && fromLng > 100;
        boolean toOceania      = toLat   < -10 && toLng   > 100;

        // ==============================================================
        // TRANS-PACIFIC ROUTES (Americas ↔ East Asia / Oceania)
        // Key: do NOT route through Suez Canal
        // ==============================================================
        boolean transPacific = (fromAmericas && (toEAsia || toOceania)) ||
                ((fromEAsia || fromOceania) && toAmericas);

        if (transPacific) {
            if (alternate) {
                // Southern route via South Pacific
                wps.add(S_PACIFIC);
            } else {
                // Standard North Pacific great circle arc
                // For routes at higher latitudes, arc goes north
                if (fromLat > 15 && toLat > 15) {
                    wps.add(N_PACIFIC);
                }
                // For southern routes (e.g., Chile to Australia), via South Pacific
                if (fromLat < 0 || toLat < 0) {
                    wps.add(S_PACIFIC);
                }
            }
            return wps; // NO Suez/Indian Ocean waypoints for Pacific routes
        }

        // ==============================================================
        // TRANS-ATLANTIC ROUTES (Americas ↔ Europe / W.Africa)
        // ==============================================================
        boolean transAtlantic = (fromAmericas && (toEurope || (toAfrica && toLng < 15))) ||
                ((fromEurope || (fromAfrica && fromLng < 15)) && toAmericas);

        if (transAtlantic) {
            // Mid-Atlantic waypoint for natural curve
            if (!alternate) {
                wps.add(MID_ATLANTIC);
            } else {
                // Alternate: go via Caribbean / Azores
                double midLat = (fromLat + toLat) * 0.5;
                double midLng = (fromLng + toLng) * 0.5;
                wps.add(new double[]{midLat + 5, midLng + 10}); // Slightly offset
            }
            return wps;
        }

        // ==============================================================
        // PERSIAN GULF entry/exit via Hormuz
        // ==============================================================
        if (fromPersGulf || toPersGulf) {
            wps.add(HORMUZ);
        }

        // ==============================================================
        // RED SEA → SUEZ CANAL (for Asia ↔ Europe trade)
        // ==============================================================
        boolean needsSuez = false;

        // Asia / Indian Ocean → Europe / Mediterranean
        if ((fromEAsia || fromSEAsia || fromIndianOcean || fromPersGulf) &&
                (toEurope || toMediterranean)) {
            needsSuez = true;
        }
        // Europe / Mediterranean → Asia / Indian Ocean
        if ((fromEurope || fromMediterranean) &&
                (toEAsia || toSEAsia || toIndianOcean || toPersGulf)) {
            needsSuez = true;
        }
        // Red Sea ports directly
        if (fromRedSea && (toEurope || toMediterranean)) needsSuez = false; // Already in Red Sea
        if (fromRedSea && toIndianOcean) needsSuez = false; // Going south via Aden

        if (needsSuez) {
            if (!alternate) {
                // Standard: through Suez Canal
                if (fromEAsia || fromSEAsia) {
                    if (!fromPersGulf) wps.add(MALACCA); // Via Malacca first
                }
                wps.add(INDIAN_OCEAN);
                wps.add(DJIBOUTI);
                wps.add(ADEN);
                wps.add(SUEZ_S);
                wps.add(SUEZ_N);
                if (toEurope && toLng > 5) {
                    wps.add(GIBRALTAR);
                }
            } else {
                // Alternate: Via Cape of Good Hope (+14 days in real life)
                if (fromEAsia || fromSEAsia) {
                    wps.add(LOMBOK); // Avoid Malacca
                }
                wps.add(INDIAN_OCEAN);
                wps.add(CAPE_HOPE);
                wps.add(MID_ATLANTIC);
                if (toEurope) wps.add(GIBRALTAR);
            }
            return wps;
        }

        // ==============================================================
        // SE ASIA ↔ Indian Subcontinent (Mumbai, Chennai, Colombo)
        // ==============================================================
        if ((fromSEAsia && toIndianOcean) || (fromIndianOcean && toSEAsia)) {
            wps.add(MALACCA);
            return wps;
        }

        // ==============================================================
        // RED SEA / EAST AFRICA ↔ Indian Ocean
        // (e.g., Jeddah → Kochi, Mombasa → Mumbai)
        // ==============================================================
        if ((fromRedSea || (fromAfrica && fromLng > 35)) &&
                (toIndianOcean)) {
            wps.add(DJIBOUTI);
            wps.add(ADEN);
            return wps;
        }
        if (fromIndianOcean &&
                (toRedSea || (toAfrica && toLng > 35))) {
            wps.add(ADEN);
            wps.add(DJIBOUTI);
            return wps;
        }

        // ==============================================================
        // CAPE OF GOOD HOPE ROUTES
        // Asia / Indian Ocean ↔ West Africa / Americas (via Cape)
        // ==============================================================
        boolean needsCape = (fromEAsia || fromSEAsia || fromIndianOcean) &&
                ((toAfrica && toLng < 20) || (toSAfrica));
        needsCape = needsCape || (fromSAfrica || toSAfrica);

        if (needsCape) {
            if (fromEAsia || fromSEAsia) wps.add(MALACCA);
            wps.add(INDIAN_OCEAN);
            wps.add(CAPE_HOPE);
            return wps;
        }

        // ==============================================================
        // WITHIN EUROPE / MEDITERRANEAN
        // ==============================================================
        if (fromEurope && toEurope) {
            // Within Europe — may pass through Bosphorus for Black Sea
            if ((fromLng > 28 && fromLng < 40) || (toLng > 28 && toLng < 40)) {
                wps.add(BOSPHORUS);
            }
            return wps;
        }

        // ==============================================================
        // PANAMA CANAL
        // West Americas ↔ East Americas / Caribbean
        // ==============================================================
        boolean needsPanama = fromAmericas && toAmericas &&
                ((fromWAmericas && toEAmericas) || (fromEAmericas && toWAmericas));
        if (needsPanama) {
            wps.add(PANAMA);
            return wps;
        }

        // Default: direct route (no waypoints)
        return wps;
    }

    // ================================================================
    // AIR ROUTE — Great circle with beautiful arc
    // ================================================================
    private String fetchAirRoute(double fromLat, double fromLng,
                                 double toLat,   double toLng,
                                 boolean alternate) {

        int    steps     = 22;
        double curveMult = alternate ? -1.0 : 1.0;
        List<String> points = new ArrayList<>();

        // Handle longitude wrapping (Pacific crossing)
        double dLng = toLng - fromLng;
        if (dLng > 180)  dLng -= 360;
        if (dLng < -180) dLng += 360;

        for (int i = 0; i <= steps; i++) {
            double t   = (double) i / steps;

            // Interpolate with longitude wrapping
            double lat = fromLat + (toLat - fromLat) * t;
            double lng = fromLng + dLng * t;

            // Great circle correction — planes arc toward poles on long routes
            double dist = Math.abs(dLng);
            if (dist > 50) {
                // Northern hemisphere: arc northward; Southern: arc southward
                double midT     = 4.0 * t * (1.0 - t);
                double arcAmt   = dist * 0.08 * curveMult;

                // Polar arc — routes naturally go near poles
                double polarPull = (fromLat + toLat) > 20 ? 1.0 : -1.0;
                lat += midT * arcAmt * polarPull;
            }

            // Normalize longitude
            while (lng >  180) lng -= 360;
            while (lng < -180) lng += 360;

            points.add("[" + lat + "," + lng + "]");
        }

        return "[" + String.join(",", points) + "]";
    }

    // ================================================================
    // RAIL ROUTE — Land-following with realistic waypoints
    // ================================================================
    private String fetchRailRoute(double fromLat, double fromLng,
                                  double toLat,   double toLng) {
        List<double[]> wps = determineRailWaypoints(fromLat, fromLng, toLat, toLng);
        return buildWaypointRoute(fromLat, fromLng, toLat, toLng, wps, 12, true);
    }

    private String fetchRailAlt(double fromLat, double fromLng,
                                double toLat,   double toLng) {
        List<double[]> wps = determineRailWaypoints(fromLat, fromLng, toLat, toLng);
        // Add a slight detour for alternate
        double midLat = (fromLat + toLat) / 2 + 1.5;
        double midLng = (fromLng + toLng) / 2 + 1.5;
        if (wps.isEmpty()) wps.add(new double[]{midLat, midLng});
        return buildWaypointRoute(fromLat, fromLng, toLat, toLng, wps, 12, true);
    }

    private List<double[]> determineRailWaypoints(
            double fromLat, double fromLng,
            double toLat,   double toLng) {

        List<double[]> wps = new ArrayList<>();

        // Region flags
        boolean fromChina    = fromLng > 100 && fromLng < 140 && fromLat > 18 && fromLat < 55;
        boolean toChina      = toLng   > 100 && toLng   < 140 && toLat   > 18 && toLat   < 55;
        boolean fromIndia    = fromLng > 65  && fromLng < 98  && fromLat > 6  && fromLat < 35;
        boolean toIndia      = toLng   > 65  && toLng   < 98  && toLat   > 6  && toLat   < 35;
        boolean fromSEAsia   = fromLng > 95  && fromLng < 125 && fromLat > -5 && fromLat < 30;
        boolean toSEAsia     = toLng   > 95  && toLng   < 125 && toLat   > -5 && toLat   < 30;
        boolean fromEurope   = fromLng > -12 && fromLng < 45  && fromLat > 35;
        boolean toEurope     = toLng   > -12 && toLng   < 45  && toLat   > 35;
        boolean fromCentralA = fromLng > 50  && fromLng < 90  && fromLat > 35 && fromLat < 55;
        boolean toCentralA   = toLng   > 50  && toLng   < 90  && toLat   > 35 && toLat   < 55;
        boolean fromRussia   = fromLat > 50  && fromLng > 30;
        boolean toRussia     = toLat   > 50  && toLng   > 30;

        // ==============================================================
        // CHINA ↔ INDIA: Through Myanmar / Bangladesh
        // This is the MOST IMPORTANT fix — must go OVERLAND
        // ==============================================================
        if ((fromChina && toIndia) || (fromIndia && toChina)) {
            wps.add(KUNMING);    // Southwest China hub
            wps.add(MANDALAY);   // Myanmar land crossing
            wps.add(DHAKA_R);    // Bangladesh entry
            wps.add(KOLKATA_R);  // India entry
            return wps;
        }

        // ==============================================================
        // CHINA ↔ EUROPE: Belt and Road (Trans-Siberian / Silk Road)
        // ==============================================================
        if (fromChina && toEurope) {
            wps.add(BEIJING_RAIL);
            // Two possible routes:
            if (fromLng > 105) {
                // Northern route: Trans-Mongolian / Trans-Siberian
                wps.add(new double[]{50.0, 107.0}); // Near Ulan Bator
                wps.add(IRKUTSK);
                wps.add(NOVOSIBIRSK);
                wps.add(MOSCOW);
            } else {
                // Southern route: New Silk Road
                wps.add(URUMQI);
                wps.add(ALMATY);
                wps.add(TASHKENT);
                wps.add(TEHRAN);
                wps.add(ISTANBUL_R);
            }
            return wps;
        }

        if (fromEurope && toChina) {
            wps.add(ISTANBUL_R);
            wps.add(TEHRAN);
            wps.add(TASHKENT);
            wps.add(ALMATY);
            wps.add(URUMQI);
            wps.add(BEIJING_RAIL);
            return wps;
        }

        // ==============================================================
        // EUROPE ↔ RUSSIA: Direct overland
        // ==============================================================
        if ((fromEurope && toRussia) || (fromRussia && toEurope)) {
            wps.add(MOSCOW);
            return wps;
        }

        // ==============================================================
        // RUSSIA / SIBERIA ↔ CHINA (Trans-Siberian)
        // ==============================================================
        if ((fromRussia && toChina) || (fromChina && toRussia)) {
            wps.add(IRKUTSK);
            wps.add(new double[]{50.0, 107.0}); // Near Mongolia
            return wps;
        }

        // ==============================================================
        // SOUTHEAST ASIA ↔ INDIA (through Myanmar)
        // ==============================================================
        if ((fromSEAsia && toIndia) || (fromIndia && toSEAsia)) {
            wps.add(MANDALAY);
            return wps;
        }

        // ==============================================================
        // INDIA ↔ CENTRAL ASIA / MIDDLE EAST
        // ==============================================================
        if ((fromIndia && toCentralA) || (fromCentralA && toIndia)) {
            wps.add(new double[]{28.0, 77.0}); // North India connection
            wps.add(new double[]{34.0, 62.0}); // Afghanistan area
            return wps;
        }

        // ==============================================================
        // EUROPE ↔ MIDDLE EAST (via Bosphorus)
        // ==============================================================
        if (fromEurope && toLng > 30 && toLng < 65 && toLat < 40) {
            wps.add(ISTANBUL_R);
            return wps;
        }
        if (fromLng > 30 && fromLng < 65 && fromLat < 40 && toEurope) {
            wps.add(ISTANBUL_R);
            return wps;
        }

        // Default: direct interpolated
        return wps;
    }

    // ================================================================
    // BUILD ROUTE FROM WAYPOINTS (Bezier-smooth)
    // ================================================================
    private String buildWaypointRoute(double fromLat, double fromLng,
                                      double toLat,   double toLng,
                                      List<double[]> waypoints,
                                      int stepsPerSegment,
                                      boolean addNoise) {

        List<double[]> all = new ArrayList<>();
        all.add(new double[]{fromLat, fromLng});
        all.addAll(waypoints);
        all.add(new double[]{toLat, toLng});

        List<String> result = new ArrayList<>();

        for (int seg = 0; seg < all.size() - 1; seg++) {
            double[] p1 = all.get(seg);
            double[] p2 = all.get(seg + 1);

            int startI = (seg == 0) ? 0 : 1; // Avoid duplicate points at seams

            for (int i = startI; i <= stepsPerSegment; i++) {
                double t = (double) i / stepsPerSegment;

                // Handle longitude wrapping
                double dLng = p2[1] - p1[1];
                if (dLng >  180) dLng -= 360;
                if (dLng < -180) dLng += 360;

                double lat = p1[0] + (p2[0] - p1[0]) * t;
                double lng = p1[1] + dLng * t;

                // Bezier arc — slight curve for natural appearance
                double segDist = Math.sqrt(
                        Math.pow(p2[0] - p1[0], 2) + Math.pow(dLng, 2)
                );
                if (segDist > 5) {
                    // Perpendicular offset for curve
                    double perp  = 4 * t * (1 - t) * segDist * 0.04;
                    double dLatN = -(dLng) / Math.max(segDist, 0.001);
                    double dLngN =  (p2[0] - p1[0]) / Math.max(segDist, 0.001);
                    lat += dLatN * perp;
                    lng += dLngN * perp;
                }

                // Small noise for organic appearance
                if (addNoise && i > 0 && i < stepsPerSegment) {
                    lat += (Math.random() - 0.5) * 0.02;
                    lng += (Math.random() - 0.5) * 0.02;
                }

                // Normalize longitude
                while (lng >  180) lng -= 360;
                while (lng < -180) lng += 360;

                result.add("[" + lat + "," + lng + "]");
            }
        }

        return "[" + String.join(",", result) + "]";
    }
}