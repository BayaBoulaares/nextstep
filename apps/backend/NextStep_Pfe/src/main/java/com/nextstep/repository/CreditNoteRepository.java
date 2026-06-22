package com.nextstep.repository;

import com.nextstep.entity.Abonnement;
import com.nextstep.entity.CreditNote;
import com.nextstep.entity.CreditNoteStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface CreditNoteRepository extends JpaRepository<CreditNote, Long> {
    List<CreditNote> findByClientIdAndStatus(UUID clientId, CreditNoteStatus status);

}
