// VncProxyService.java
/*package com.nextstep.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

@Service
@Slf4j
public class VncProxyService {

    private final Map<String, ProcessInfo> vmProxies = new ConcurrentHashMap<>();
    private final AtomicInteger portCounter = new AtomicInteger(15900);
    @Value("${virtctl.path:virtctl}")
    private String virtctlPath;
    public record ProcessInfo(Process process, int port) {}

    public int startProxy(String vmName, String namespace) throws Exception {
        log.info("[VNC] PATH utilisé: {}", System.getenv("PATH"));
        log.info("[VNC] virtctl path: {}",
                new ProcessBuilder("where", "virtctl").start()
                        .inputReader().readLine()
        );
        String key = namespace + "/" + vmName;

        ProcessInfo existing = vmProxies.get(key);
        if (existing != null && existing.process().isAlive()) {
            log.info("[VNC] Proxy déjà actif pour {} sur port {}", vmName, existing.port());
            return existing.port();
        }

        int port = portCounter.getAndIncrement();

        ProcessBuilder pb = new ProcessBuilder(
                virtctlPath, "vnc",
                "--proxy-only",
                "--port=" + port,
                "--timeout=10m",  // ✅ 10 minutes au lieu de 1 minute
                vmName,
                "-n", namespace
        );
        pb.redirectErrorStream(true); // merge stdout + stderr

        Process process = pb.start();

        // ✅ Attendre la ligne {"port":XXXX} qui indique que virtctl est prêt
        CountDownLatch ready = new CountDownLatch(1);

        Thread readerThread = Thread.ofVirtual().start(() -> {
            try (BufferedReader reader = new BufferedReader(
                    new InputStreamReader(process.getInputStream()))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    log.info("[VNC] virtctl: {}", line);
                    // virtctl affiche {"port":XXXX} quand il est prêt
                    if (line.contains("\"port\"")) {
                        ready.countDown();
                    }
                }
            } catch (Exception e) {
                log.warn("[VNC] Reader thread terminé: {}", e.getMessage());
            }
        });

        // Attendre max 10 secondes que virtctl soit prêt
        boolean started = ready.await(10, TimeUnit.SECONDS);

        if (!started || !process.isAlive()) {
            process.destroy();
            throw new RuntimeException("virtctl proxy n'a pas démarré pour " + vmName);
        }

        vmProxies.put(key, new ProcessInfo(process, port));
        log.info("[VNC] ✅ Proxy prêt pour {} sur port {}", vmName, port);
        return port;
    }

    public void stopProxy(String vmName, String namespace) {
        String key = namespace + "/" + vmName;
        ProcessInfo info = vmProxies.remove(key);
        if (info != null && info.process().isAlive()) {
            info.process().destroy();
            log.info("[VNC] Proxy arrêté pour {}", vmName);
        }
    }
}*/
// VncProxyService.java
/*package com.nextstep.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.Socket;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

@Service
@Slf4j
public class VncProxyService {

    @Value("${virtctl.path:C:/Windows/System32/virtctl.exe}")
    private String virtctlPath;

    private final Map<String, ProxyResult> vmProxies = new ConcurrentHashMap<>();
    private final AtomicInteger portCounter = new AtomicInteger(15900);

    public record ProxyResult(Process process, int port, Socket socket) {}

    public ProxyResult startProxy(String vmName, String namespace) throws Exception {
        String key = namespace + "/" + vmName;

        // Réutiliser le process existant si encore vivant
        ProxyResult existing = vmProxies.get(key);
        if (existing != null && existing.process().isAlive()) {
            // Créer une nouvelle socket sur le même port
            try {
                Socket s = new Socket("localhost", existing.port());
                s.setTcpNoDelay(true);
                s.setKeepAlive(true);
                log.info("[VNC] Nouvelle socket sur port existant {}", existing.port());
                return new ProxyResult(existing.process(), existing.port(), s);
            } catch (Exception e) {
                log.warn("[VNC] Port existant inaccessible — redémarrage: {}", e.getMessage());
                vmProxies.remove(key);
            }
        }

        if (existing != null) {
            vmProxies.remove(key);
        }

        int port = portCounter.getAndIncrement();
        log.info("[VNC] Démarrage virtctl pour {} sur port {}", vmName, port);

        ProcessBuilder pb = new ProcessBuilder(
                virtctlPath, "vnc",
                "--proxy-only",
                "--port=" + port,
                vmName,
                "-n", namespace
        );
        pb.redirectErrorStream(true);
        Process process = pb.start();

        // Lire stdout en arrière-plan
        Thread.ofVirtual().start(() -> {
            try (BufferedReader reader = new BufferedReader(
                    new InputStreamReader(process.getInputStream()))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    log.info("[VNC] virtctl[{}]: {}", vmName, line);
                }
            } catch (Exception e) {
                log.warn("[VNC] Reader terminé pour {}: {}", vmName, e.getMessage());
            }
        });

        // ✅ Connecter et garder la socket ouverte — virtctl prend ~15-20s
        Socket socket = connectWithRetry("localhost", port, 30_000);

        if (!process.isAlive()) {
            socket.close();
            throw new RuntimeException("virtctl mort pour " + vmName);
        }

        ProxyResult result = new ProxyResult(process, port, socket);
        vmProxies.put(key, result);
        log.info("[VNC] ✅ Proxy + socket prêts pour {} sur port {}", vmName, port);
        return result;
    }

    private Socket connectWithRetry(String host, int port, long timeoutMs) throws Exception {
        long deadline = System.currentTimeMillis() + timeoutMs;
        Exception last = null;
        while (System.currentTimeMillis() < deadline) {
            try {
                Socket s = new Socket(host, port);
                s.setTcpNoDelay(true);
                s.setKeepAlive(true);
                log.info("[VNC] Socket connectée au port {} ✅", port);
                return s;
            } catch (Exception e) {
                last = e;
                Thread.sleep(500);
            }
        }
        throw new RuntimeException(
                "Impossible de se connecter au port " + port +
                        " après " + timeoutMs + "ms: " +
                        (last != null ? last.getMessage() : "")
        );
    }

    public void stopProxy(String vmName, String namespace) {
        String key = namespace + "/" + vmName;
        ProxyResult info = vmProxies.remove(key);
        if (info != null) {
            try { info.socket().close(); } catch (Exception ignored) {}
            if (info.process().isAlive()) {
                info.process().destroy();
            }
            log.info("[VNC] Proxy arrêté pour {}", vmName);
        }
    }
}*/
// VncProxyService.java — utiliser oc proxy
/*package com.nextstep.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

@Service
@Slf4j
public class VncProxyService {

    @Value("${oc.path:oc}")
    private String ocPath;

    // Un seul oc proxy pour tous — port fixe 8001
    private static final int OC_PROXY_PORT = 8001;
    private volatile Process ocProxyProcess = null;

    private final Map<String, Integer> vmPorts = new ConcurrentHashMap<>();

    public synchronized void ensureOcProxy() throws Exception {
        if (ocProxyProcess != null && ocProxyProcess.isAlive()) return;

        log.info("[VNC] Démarrage oc proxy sur port {}", OC_PROXY_PORT);
        ProcessBuilder pb = new ProcessBuilder(
                ocPath, "proxy", "--port=" + OC_PROXY_PORT
        );
        pb.redirectErrorStream(true);
        ocProxyProcess = pb.start();

        CountDownLatch ready = new CountDownLatch(1);
        Thread.ofVirtual().start(() -> {
            try (BufferedReader r = new BufferedReader(
                    new InputStreamReader(ocProxyProcess.getInputStream()))) {
                String line;
                while ((line = r.readLine()) != null) {
                    log.info("[VNC] oc-proxy: {}", line);
                    if (line.contains("Starting to serve")) ready.countDown();
                }
            } catch (Exception e) {
                log.warn("[VNC] oc-proxy reader: {}", e.getMessage());
            } finally {
                ready.countDown();
            }
        });

        ready.await(10, TimeUnit.SECONDS);
        if (!ocProxyProcess.isAlive())
            throw new RuntimeException("oc proxy mort au démarrage");

        log.info("[VNC] ✅ oc proxy prêt sur port {}", OC_PROXY_PORT);
    }

    // Retourne l'URL WebSocket VNC pour une VM donnée
    public String getVncWsUrl(String vmName, String namespace) throws Exception {
        ensureOcProxy();
        // oc proxy expose l'API en HTTP local → ws:// pour WebSocket
        return String.format(
                "ws://localhost:%d/apis/subresources.kubevirt.io/v1" +
                        "/namespaces/%s/virtualmachineinstances/%s/vnc",
                OC_PROXY_PORT, namespace, vmName
        );
    }

    public void stopAll() {
        if (ocProxyProcess != null && ocProxyProcess.isAlive()) {
            ocProxyProcess.destroy();
            log.info("[VNC] oc proxy arrêté");
        }
    }
}*/
// VncProxyService.java — version simplifiée, suppose oc proxy externe
package com.nextstep.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
@Slf4j
public class VncProxyService {

    @Value("${oc.proxy.port:8001}")
    private int ocProxyPort;

    // ✅ Pas de gestion du process — oc proxy tourne en externe
    public String getVncWsUrl(String vmName, String namespace) {
        String url = String.format(
                "ws://localhost:%d/apis/subresources.kubevirt.io/v1" +
                        "/namespaces/%s/virtualmachineinstances/%s/vnc",
                ocProxyPort, namespace, vmName
        );
        log.info("[VNC] URL upstream: {}", url);
        return url;
    }
}