package com.flixbook.flixbook_backend.config;

import com.flixbook.flixbook_backend.service.ReminderService;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

@Component
public class StartupConfig {

    @Autowired
    private ReminderService reminderService;

    @PostConstruct
    public void init() {
        reminderService.sendRemindersOnStartup();
    }
}