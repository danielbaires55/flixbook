// package com.flixbook.flixbook_backend.config;

// import com.flixbook.flixbook_backend.service.ReminderService;
// import com.flixbook.flixbook_backend.service.FeedbackService;
// import jakarta.annotation.PostConstruct;
// import org.springframework.beans.factory.annotation.Autowired;
// import org.springframework.stereotype.Component;

// @Component
// public class StartupConfig {

//     @Autowired
//     private ReminderService reminderService;
    
//     @Autowired
//     private FeedbackService feedbackService;

//     @PostConstruct
//     public void init() {
//         reminderService.sendRemindersOnStartup();
//         feedbackService.sendFeedbackRequestsOnStartup();
//     }
// }