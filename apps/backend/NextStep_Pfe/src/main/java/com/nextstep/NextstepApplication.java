package com.nextstep;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableAsync
public class NextstepApplication {
    public static void main(String[] args) {
        SpringApplication.run(NextstepApplication.class, args);
    }
}