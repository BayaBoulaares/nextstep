package com.nextstep.dto;



import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class VmEventDTO {
    private String type;      // "Normal" | "Warning"
    private String reason;    // ex: "Started", "Pulling"
    private String message;   // description lisible
    private String lastTime;  // ex: "09:46" (formaté côté service)
    private int    count;     // nombre d'occurrences
}