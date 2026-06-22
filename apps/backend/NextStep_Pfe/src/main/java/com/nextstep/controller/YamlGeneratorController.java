package com.nextstep.controller;


import com.nextstep.dto.GenerateRequest;
import com.nextstep.dto.GenerateResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

@RestController
@RequestMapping("/api/generate")
@CrossOrigin(origins = "*")
public class YamlGeneratorController {

    private final WebClient webClient;

    public YamlGeneratorController(
            @Value("${services.yaml-generator.url}") String serviceUrl
    ) {
        this.webClient = WebClient.builder().baseUrl(serviceUrl).build();
    }

    @PostMapping(produces = MediaType.APPLICATION_JSON_VALUE)
    public Mono<GenerateResponse> generate(@RequestBody GenerateRequest request) {
        return webClient.post()
                .uri("/generate")
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(request)
                .retrieve()
                .bodyToMono(GenerateResponse.class);
    }
}
// ce controlleur fait quoi , c'est quoi un webclient et c'est quoi son role pourquoi faire un controlleur tant qu'il ya le fastapi