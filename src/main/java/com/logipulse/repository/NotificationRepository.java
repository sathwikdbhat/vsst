package com.logipulse.repository;

import com.logipulse.model.AppNotification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NotificationRepository
        extends JpaRepository<AppNotification, Long> {

    // All notifications, newest first
    List<AppNotification> findAllByOrderByCreatedAtDesc();

    // Only unread notifications
    List<AppNotification> findByReadFalseOrderByCreatedAtDesc();

    // Count of unread
    long countByReadFalse();

    // Notifications not yet emailed
    List<AppNotification> findByEmailSentFalse();

    // By type
    List<AppNotification> findByTypeOrderByCreatedAtDesc(String type);

    // Recent — last 50
    @Query("SELECT n FROM AppNotification n ORDER BY n.createdAt DESC")
    List<AppNotification> findTop50();
}