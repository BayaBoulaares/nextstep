package com.nextstep.config;

// WebSocketConfig.java

import com.nextstep.handlers.VncWebSocketHandler;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.*;

@Configuration
@EnableWebSocket
@RequiredArgsConstructor
public class WebSocketConfig implements WebSocketConfigurer {

    private final VncWebSocketHandler vncWebSocketHandler;

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry
                .addHandler(vncWebSocketHandler, "/api/vms/{namespace}/{name}/vnc-ws")
                .setAllowedOrigins("*"); // ✅ iframe vnc-proxy vient de localhost:3000
    }
}