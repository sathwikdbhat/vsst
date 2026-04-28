package com.logipulse.scheduler;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import java.net.HttpURLConnection;
import java.net.URL;

@Component
public class KeepAliveScheduler {

    // Ping self every 14 minutes to prevent Render from sleeping
    // Only runs in production
    @Scheduled(fixedRate = 840000)
    public void keepAlive() {
        String appUrl = System.getenv("https://vsst-app.onrender.com");
        if (appUrl == null || appUrl.isBlank()) return; // Skip in local dev

        try {
            URL url = new URL(appUrl + "/welcome.html");
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("GET");
            conn.setConnectTimeout(5000);
            conn.setReadTimeout(5000);
            conn.getResponseCode();
            conn.disconnect();
            System.out.println("KeepAlive: ping sent to " + appUrl);
        } catch (Exception e) {
            // Silent — don't crash if ping fails
        }
    }
}