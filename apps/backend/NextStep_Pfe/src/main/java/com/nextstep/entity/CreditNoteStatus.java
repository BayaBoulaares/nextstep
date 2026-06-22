package com.nextstep.entity;

public enum CreditNoteStatus {
    PENDING,   // avoir émis, non encore appliqué
    APPLIED,   // déduit sur une facture
    EXPIRED    // non utilisé et périmé
}