package com.logipulse.controller;

import com.logipulse.service.GeminiService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/chat")
@CrossOrigin(origins = "*")
public class ChatController {

    @Autowired
    private GeminiService geminiService;

    @PostMapping("/message")
    public ResponseEntity<Map<String, String>> chat(
            @RequestBody Map<String, String> body) {

        String userMessage = body.get("message");

        if (userMessage == null || userMessage.isBlank()) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Message cannot be empty");
            return ResponseEntity.badRequest().body(error);
        }

        try {
            String response = geminiService.chat(userMessage.trim());
            Map<String, String> result = new HashMap<>();
            result.put("response", response);
            result.put("message",  userMessage);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Failed to communicate with AI Engine. Please try again.");
            return ResponseEntity.internalServerError().body(error);
        }
    }
}