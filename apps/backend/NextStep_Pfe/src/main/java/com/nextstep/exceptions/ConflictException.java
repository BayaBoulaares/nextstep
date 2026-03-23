package com.nextstep.exceptions;

/** Lancée quand une règle d'unicité métier est violée (HTTP 409). */
public class ConflictException extends RuntimeException {
    public ConflictException(String message) { super(message); }
}