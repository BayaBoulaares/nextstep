// VncWebSocketHandler.java
/*package com.nextstep.handlers;

import com.nextstep.service.VncProxyService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.*;
import org.springframework.web.socket.handler.AbstractWebSocketHandler;

import java.io.*;
import java.net.Socket;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
@Slf4j
@RequiredArgsConstructor
public class VncWebSocketHandler extends AbstractWebSocketHandler {

    private final VncProxyService vncProxyService;
    private final Map<String, Socket> upstreamSockets = new ConcurrentHashMap<>();

    @Override
    public void afterConnectionEstablished(WebSocketSession browserSession) throws Exception {
        String path      = browserSession.getUri().getPath();
        String[] parts   = path.split("/");
        String namespace = parts[3];
        String vmName    = parts[4];

        int port = vncProxyService.startProxy(vmName, namespace);
        log.info("[VNC-PROXY] Connexion TCP → virtctl sur port {}", port);

        // ✅ Connexion TCP brute vers virtctl (pas WebSocket client)
        Socket socket = new Socket("localhost", port);
        socket.setTcpNoDelay(true);
        upstreamSockets.put(browserSession.getId(), socket);

        // ✅ Thread : virtctl → browser (lecture continue)
        /*Thread.ofVirtual().start(() -> {
            try {
                InputStream in = socket.getInputStream();
                byte[] buf = new byte[4096];
                int n;
                while ((n = in.read(buf)) != -1) {
                    if (browserSession.isOpen()) {
                        browserSession.sendMessage(
                                new BinaryMessage(java.nio.ByteBuffer.wrap(buf, 0, n))
                        );
                    }
                }
            } catch (Exception e) {
                log.info("[VNC-PROXY] Upstream → browser terminé: {}", e.getMessage());
                try { browserSession.close(CloseStatus.GOING_AWAY); } catch (Exception ignored) {}
            }
        });*/
        // VncWebSocketHandler.java — dans le thread de lecture
        /*Thread.ofVirtual().start(() -> {
            try {
                InputStream in = socket.getInputStream();
                byte[] buf = new byte[4096];
                int n;
                while ((n = in.read(buf)) != -1) {
                    if (browserSession.isOpen()) {
                        browserSession.sendMessage(
                                new BinaryMessage(java.nio.ByteBuffer.wrap(buf, 0, n))
                        );
                    }
                }
                log.info("[VNC-PROXY] Stream upstream terminé pour session {}", browserSession.getId());
            } catch (Exception e) {
                log.info("[VNC-PROXY] Upstream → browser terminé: {}", e.getMessage());
                try { browserSession.close(CloseStatus.GOING_AWAY); } catch (Exception ignored) {}
            }
        });

        log.info("[VNC-PROXY] ✅ Connecté à virtctl sur port {}", port);
    }

    @Override
    protected void handleBinaryMessage(WebSocketSession browserSession, BinaryMessage msg) throws Exception {
        // browser → virtctl
        Socket socket = upstreamSockets.get(browserSession.getId());
        if (socket != null && !socket.isClosed()) {
            byte[] data = new byte[msg.getPayload().remaining()];
            msg.getPayload().get(data);
            socket.getOutputStream().write(data);
            socket.getOutputStream().flush();
        }
    }

    @Override
    protected void handleTextMessage(WebSocketSession browserSession, TextMessage msg) throws Exception {
        // Convertir texte en binaire si nécessaire
        Socket socket = upstreamSockets.get(browserSession.getId());
        if (socket != null && !socket.isClosed()) {
            socket.getOutputStream().write(msg.getPayload().getBytes());
            socket.getOutputStream().flush();
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession browserSession, CloseStatus status) throws Exception {
        Socket socket = upstreamSockets.remove(browserSession.getId());
        if (socket != null && !socket.isClosed()) {
            socket.close();
        }
        log.info("[VNC-PROXY] Browser déconnecté: {}", status);
    }

    @Override
    public void handleTransportError(WebSocketSession browserSession, Throwable ex) {
        log.error("[VNC-PROXY] Erreur transport: {}", ex.getMessage());
    }
}*/
// VncWebSocketHandler.java
/*package com.nextstep.handlers;

import com.nextstep.service.VncProxyService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.*;
import org.springframework.web.socket.handler.AbstractWebSocketHandler;

import java.io.InputStream;
import java.io.OutputStream;
import java.net.Socket;
import java.nio.ByteBuffer;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
@Slf4j
@RequiredArgsConstructor
public class VncWebSocketHandler extends AbstractWebSocketHandler {

    private final VncProxyService vncProxyService;

    private final Map<String, Socket>       sockets = new ConcurrentHashMap<>();
    private final Map<String, OutputStream> outputs = new ConcurrentHashMap<>();

    @Override
    public void afterConnectionEstablished(WebSocketSession browserSession) throws Exception {
        String path      = browserSession.getUri().getPath();
        String[] parts   = path.split("/");
        // /api/vms/{namespace}/{name}/vnc-ws
        String namespace = parts[3];
        String vmName    = parts[4];

        log.info("[VNC-PROXY] Connexion browser pour {}/{}", namespace, vmName);

        // ✅ Récupérer la socket déjà connectée à virtctl
        VncProxyService.ProxyResult proxy = vncProxyService.startProxy(vmName, namespace);
        Socket socket = proxy.socket();

        sockets.put(browserSession.getId(), socket);
        outputs.put(browserSession.getId(), socket.getOutputStream());

        log.info("[VNC-PROXY] ✅ Socket TCP prête pour {}", vmName);

        // virtctl → browser (lecture continue en arrière-plan)
        Thread.ofVirtual().start(() -> {
            try {
                InputStream in  = socket.getInputStream();
                byte[]      buf = new byte[65536];
                int n;
                while ((n = in.read(buf)) != -1) {
                    if (browserSession.isOpen()) {
                        browserSession.sendMessage(
                                new BinaryMessage(ByteBuffer.wrap(buf, 0, n))
                        );
                    }
                }
                log.info("[VNC-PROXY] Stream virtctl terminé pour {}", vmName);
                if (browserSession.isOpen())
                    browserSession.close(CloseStatus.NORMAL);
            } catch (Exception e) {
                log.warn("[VNC-PROXY] Lecture upstream: {}", e.getMessage());
                try {
                    if (browserSession.isOpen())
                        browserSession.close(CloseStatus.GOING_AWAY);
                } catch (Exception ignored) {}
            }
        });
    }

    // browser → virtctl
    @Override
    protected void handleBinaryMessage(WebSocketSession session, BinaryMessage msg) throws Exception {
        OutputStream out = outputs.get(session.getId());
        if (out != null) {
            byte[] data = new byte[msg.getPayload().remaining()];
            msg.getPayload().get(data);
            out.write(data);
            out.flush();
        }
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage msg) throws Exception {
        OutputStream out = outputs.get(session.getId());
        if (out != null) {
            out.write(msg.getPayload().getBytes());
            out.flush();
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
        cleanup(session.getId());
        log.info("[VNC-PROXY] Browser déconnecté: {}", status);
    }

    @Override
    public void handleTransportError(WebSocketSession session, Throwable ex) {
        log.error("[VNC-PROXY] Erreur transport: {}", ex.getMessage());
        cleanup(session.getId());
    }

    private void cleanup(String sessionId) {
        outputs.remove(sessionId);
        Socket socket = sockets.remove(sessionId);
        if (socket != null && !socket.isClosed()) {
            try { socket.close(); } catch (Exception ignored) {}
        }
    }
}*/
// VncWebSocketHandler.java — version finale avec oc proxy
/*package com.nextstep.handlers;

import com.nextstep.service.VncProxyService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.*;
import org.springframework.web.socket.client.WebSocketClient;
import org.springframework.web.socket.client.standard.StandardWebSocketClient;
import org.springframework.web.socket.handler.AbstractWebSocketHandler;

import java.net.URI;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
@Slf4j
@RequiredArgsConstructor
public class VncWebSocketHandler extends AbstractWebSocketHandler {

    private final VncProxyService vncProxyService;
    private final Map<String, WebSocketSession> upstreams = new ConcurrentHashMap<>();

    /*@Override
    public void afterConnectionEstablished(WebSocketSession browserSession) throws Exception {
        String path      = browserSession.getUri().getPath();
        String[] parts   = path.split("/");
        String namespace = parts[3];
        String vmName    = parts[4];

        log.info("[VNC-PROXY] Connexion browser pour {}/{}", namespace, vmName);

        // ✅ URL via oc proxy (HTTP local → pas de problème SSL/port)
        String wsUrl = vncProxyService.getVncWsUrl(vmName, namespace);
        log.info("[VNC-PROXY] URL upstream: {}", wsUrl);

        WebSocketHandler upstreamHandler = new AbstractWebSocketHandler() {
            @Override
            protected void handleBinaryMessage(WebSocketSession s, BinaryMessage msg) throws Exception {
                if (browserSession.isOpen()) browserSession.sendMessage(msg);
            }
            @Override
            protected void handleTextMessage(WebSocketSession s, TextMessage msg) throws Exception {
                if (browserSession.isOpen()) browserSession.sendMessage(msg);
            }
            @Override
            public void afterConnectionClosed(WebSocketSession s, CloseStatus status) {
                log.info("[VNC-PROXY] Upstream fermé: {}", status);
                try { if (browserSession.isOpen()) browserSession.close(status); }
                catch (Exception ignored) {}
            }
            @Override
            public void handleTransportError(WebSocketSession s, Throwable ex) {
                log.error("[VNC-PROXY] Erreur upstream: {}", ex.getMessage());
            }
        };

        WebSocketClient client = new StandardWebSocketClient();
        WebSocketSession upstream = client
                .execute(upstreamHandler, new WebSocketHttpHeaders(), URI.create(wsUrl))
                .get();

        upstreams.put(browserSession.getId(), upstream);
        log.info("[VNC-PROXY] ✅ WebSocket upstream connecté pour {}", vmName);
    }*/

    /*@Override
    protected void handleBinaryMessage(WebSocketSession session, BinaryMessage msg) throws Exception {
        WebSocketSession upstream = upstreams.get(session.getId());
        if (upstream != null && upstream.isOpen()) upstream.sendMessage(msg);
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage msg) throws Exception {
        WebSocketSession upstream = upstreams.get(session.getId());
        if (upstream != null && upstream.isOpen()) upstream.sendMessage(msg);
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
        WebSocketSession upstream = upstreams.remove(session.getId());
        if (upstream != null && upstream.isOpen()) upstream.close(status);
        log.info("[VNC-PROXY] Browser déconnecté: {}", status);
    }

    @Override
    public void handleTransportError(WebSocketSession session, Throwable ex) {
        log.error("[VNC-PROXY] Erreur transport: {}", ex.getMessage());
        WebSocketSession upstream = upstreams.remove(session.getId());
        if (upstream != null) {
            try { upstream.close(CloseStatus.SERVER_ERROR); } catch (Exception ignored) {}
        }
    }
    // VncWebSocketHandler.java
    @Override
    public void afterConnectionEstablished(WebSocketSession browserSession) throws Exception {
        String path      = browserSession.getUri().getPath();
        String[] parts   = path.split("/");
        String namespace = parts[3];
        String vmName    = parts[4];

        String wsUrl = vncProxyService.getVncWsUrl(vmName, namespace);
        log.info("[VNC-PROXY] URL upstream: {}", wsUrl);

        WebSocketHandler upstreamHandler = new AbstractWebSocketHandler() {
            @Override
            protected void handleBinaryMessage(WebSocketSession s, BinaryMessage msg) throws Exception {
                if (browserSession.isOpen()) browserSession.sendMessage(msg);
            }
            @Override
            protected void handleTextMessage(WebSocketSession s, TextMessage msg) throws Exception {
                if (browserSession.isOpen()) browserSession.sendMessage(msg);
            }
            @Override
            public void afterConnectionClosed(WebSocketSession s, CloseStatus status) {
                log.info("[VNC-PROXY] Upstream fermé: {}", status);
                try { if (browserSession.isOpen()) browserSession.close(status); }
                catch (Exception ignored) {}
            }
            @Override
            public void handleTransportError(WebSocketSession s, Throwable ex) {
                log.error("[VNC-PROXY] Erreur upstream: {}", ex.getMessage());
            }
        };

        // ✅ Ajouter le sous-protocole requis par KubeVirt VNC
        WebSocketHttpHeaders headers = new WebSocketHttpHeaders();
        headers.setSecWebSocketProtocol(List.of("base64.binary.k8s.io"));

        WebSocketClient client = new StandardWebSocketClient();
        WebSocketSession upstream = client
                .execute(upstreamHandler, headers, URI.create(wsUrl))
                .get();

        upstreams.put(browserSession.getId(), upstream);
        log.info("[VNC-PROXY] ✅ Connecté pour {}", vmName);
    }
}*/
// VncWebSocketHandler.java — version finale
package com.nextstep.handlers;

import com.nextstep.service.VncProxyService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.*;
import org.springframework.web.socket.client.WebSocketClient;
import org.springframework.web.socket.client.standard.StandardWebSocketClient;
import org.springframework.web.socket.handler.AbstractWebSocketHandler;

import java.net.URI;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
@Slf4j
public class VncWebSocketHandler extends AbstractWebSocketHandler {

    private final VncProxyService vncProxyService;

    @Value("${openshift.token}")
    private String openshiftToken;

    private final Map<String, WebSocketSession> upstreams = new ConcurrentHashMap<>();

    public VncWebSocketHandler(VncProxyService vncProxyService) {
        this.vncProxyService = vncProxyService;
    }

    /*@Override
    public void afterConnectionEstablished(WebSocketSession browserSession) throws Exception {
        String path      = browserSession.getUri().getPath();
        String[] parts   = path.split("/");
        String namespace = parts[3];
        String vmName    = parts[4];

        String wsUrl = vncProxyService.getVncWsUrl(vmName, namespace);
        log.info("[VNC-PROXY] URL upstream: {}", wsUrl);

        WebSocketHandler upstreamHandler = new AbstractWebSocketHandler() {
            @Override
            protected void handleBinaryMessage(WebSocketSession s, BinaryMessage msg) throws Exception {
                if (browserSession.isOpen()) browserSession.sendMessage(msg);
            }
            @Override
            protected void handleTextMessage(WebSocketSession s, TextMessage msg) throws Exception {
                if (browserSession.isOpen()) browserSession.sendMessage(msg);
            }
            @Override
            public void afterConnectionClosed(WebSocketSession s, CloseStatus status) {
                log.info("[VNC-PROXY] Upstream fermé: {}", status);
                try { if (browserSession.isOpen()) browserSession.close(status); }
                catch (Exception ignored) {}
            }
            @Override
            public void handleTransportError(WebSocketSession s, Throwable ex) {
                log.error("[VNC-PROXY] Erreur upstream: {}", ex.getMessage());
            }
        };

        // ✅ Token Bearer — pas de sous-protocole (oc proxy gère l'auth)
        WebSocketHttpHeaders headers = new WebSocketHttpHeaders();
        headers.add("Authorization", "Bearer " + openshiftToken);

        WebSocketClient client = new StandardWebSocketClient();
        WebSocketSession upstream = client
                .execute(upstreamHandler, headers, URI.create(wsUrl))
                .get();

        upstreams.put(browserSession.getId(), upstream);
        log.info("[VNC-PROXY] ✅ Connecté pour {}", vmName);
    }*/
    // VncWebSocketHandler.java — transmettre le sous-protocole du browser vers upstream
    @Override
    public void afterConnectionEstablished(WebSocketSession browserSession) throws Exception {
        String path      = browserSession.getUri().getPath();
        String[] parts   = path.split("/");
        String namespace = parts[3];
        String vmName    = parts[4];

        String wsUrl = vncProxyService.getVncWsUrl(vmName, namespace);
        log.info("[VNC-PROXY] URL upstream: {}", wsUrl);

        WebSocketHandler upstreamHandler = new AbstractWebSocketHandler() {
            @Override
            protected void handleBinaryMessage(WebSocketSession s, BinaryMessage msg) throws Exception {
                if (browserSession.isOpen()) browserSession.sendMessage(msg);
            }
            @Override
            protected void handleTextMessage(WebSocketSession s, TextMessage msg) throws Exception {
                if (browserSession.isOpen()) browserSession.sendMessage(msg);
            }
            @Override
            public void afterConnectionClosed(WebSocketSession s, CloseStatus status) {
                log.info("[VNC-PROXY] Upstream fermé: {}", status);
                try { if (browserSession.isOpen()) browserSession.close(status); }
                catch (Exception ignored) {}
            }
            @Override
            public void handleTransportError(WebSocketSession s, Throwable ex) {
                log.error("[VNC-PROXY] Erreur upstream: {}", ex.getMessage());
            }
        };

        WebSocketHttpHeaders headers = new WebSocketHttpHeaders();
        headers.add("Authorization", "Bearer " + openshiftToken);
        // ✅ Transmettre le même sous-protocole que le browser
        headers.setSecWebSocketProtocol(List.of("base64.binary.k8s.io"));

        WebSocketClient client = new StandardWebSocketClient();
        WebSocketSession upstream = client
                .execute(upstreamHandler, headers, URI.create(wsUrl))
                .get();

        upstreams.put(browserSession.getId(), upstream);
        log.info("[VNC-PROXY] ✅ Connecté pour {} avec protocole base64.binary.k8s.io", vmName);
    }

    @Override
    protected void handleBinaryMessage(WebSocketSession session, BinaryMessage msg) throws Exception {
        WebSocketSession upstream = upstreams.get(session.getId());
        if (upstream != null && upstream.isOpen()) upstream.sendMessage(msg);
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage msg) throws Exception {
        WebSocketSession upstream = upstreams.get(session.getId());
        if (upstream != null && upstream.isOpen()) upstream.sendMessage(msg);
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
        WebSocketSession upstream = upstreams.remove(session.getId());
        if (upstream != null && upstream.isOpen()) upstream.close(status);
        log.info("[VNC-PROXY] Browser déconnecté: {}", status);
    }

    @Override
    public void handleTransportError(WebSocketSession session, Throwable ex) {
        log.error("[VNC-PROXY] Erreur transport: {}", ex.getMessage());
        WebSocketSession upstream = upstreams.remove(session.getId());
        if (upstream != null) {
            try { upstream.close(CloseStatus.SERVER_ERROR); } catch (Exception ignored) {}
        }
    }
}