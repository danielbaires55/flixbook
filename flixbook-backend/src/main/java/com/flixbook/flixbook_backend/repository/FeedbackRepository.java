package com.flixbook.flixbook_backend.repository;

import com.flixbook.flixbook_backend.model.Feedback;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

// import java.util.List;
import java.util.Optional;

@Repository
public interface FeedbackRepository extends JpaRepository<Feedback, Long> {
    Optional<Feedback> findByAppuntamentoId(Long appuntamentoId);
}