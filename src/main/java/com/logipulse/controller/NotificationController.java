package com.logipulse.controller;

import com.logipulse.model.AppNotification;
import com.logipulse.model.User;
import com.logipulse.service.AlertService;
import com.logipulse.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
@CrossOrigin(origins = "*")
public class NotificationController {

    @Autowired
    private AlertService alertService;

    @Autowired
    private UserService userService;

    private User getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() ||
                "anonymousUser".equals(auth.getPrincipal())) {
            return null;
        }
        return userService.findByUsername(auth.getName()).orElse(null);
    }

    // GET all notifications for this user
    @GetMapping
    public ResponseEntity<?> getAll() {
        User user = getCurrentUser();
        if (user == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Not authenticated"));
        }
        List<AppNotification> notifications = alertService.getNotificationsForUser(user);
        return ResponseEntity.ok(notifications);
    }

    // GET unread count
    @GetMapping("/unread-count")
    public ResponseEntity<?> getUnreadCount() {
        User user = getCurrentUser();
        if (user == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Not authenticated"));
        }
        long count = alertService.getUnreadCountForUser(user);
        return ResponseEntity.ok(Map.of("count", count));
    }

    // PUT mark one as read
    @PutMapping("/{id}/read")
    public ResponseEntity<?> markRead(@PathVariable Long id) {
        User user = getCurrentUser();
        if (user == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Not authenticated"));
        }
        alertService.markAsRead(id);
        return ResponseEntity.ok(Map.of("message", "Marked as read"));
    }

    // PUT mark all as read
    @PutMapping("/mark-all-read")
    public ResponseEntity<?> markAllRead() {
        User user = getCurrentUser();
        if (user == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Not authenticated"));
        }
        alertService.markAllAsRead();
        return ResponseEntity.ok(Map.of("message", "All marked as read"));
    }

    // DELETE clear all
    @DeleteMapping("/clear")
    public ResponseEntity<?> clearAll() {
        User user = getCurrentUser();
        if (user == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Not authenticated"));
        }
        alertService.clearAll();
        return ResponseEntity.ok(Map.of("message", "Cleared"));
    }
}