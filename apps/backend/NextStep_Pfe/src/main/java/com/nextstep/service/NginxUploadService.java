package com.nextstep.service;

import io.fabric8.kubernetes.client.KubernetesClient;
import io.fabric8.kubernetes.client.dsl.ExecListener;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayOutputStream;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
@Slf4j
public class NginxUploadService {

    private final KubernetesClient k8sClient;
    private final NamespaceService namespaceService;

    @Value("${openshift.namespace-prefix}")
    private String namespacePrefix;

    //private static final String NGINX_HTML_PATH = "/usr/share/nginx/html";
    private static final String NGINX_HTML_PATH = "/opt/app-root/src";

    // ── Upload d'un fichier ───────────────────────────────────────────────────

    public void uploadFile(String username, MultipartFile file, String subPath) {
        String namespace    = namespaceService.getNamespaceForUser(sanitize(username));
        String appName      = "nginx-" + sanitize(username);
        String podName      = getRunningPodName(namespace, appName);
        String safeFileName = sanitizeFilename(file.getOriginalFilename());

        // ✅ Vérifier que le pod est bien Ready avant d'exec
        var pod = k8sClient.pods().inNamespace(namespace).withName(podName).get();
        if (pod == null) throw new RuntimeException("Pod introuvable : " + podName);

        Boolean ready = pod.getStatus().getConditions().stream()
                .filter(c -> "Ready".equals(c.getType()))
                .map(c -> "True".equals(c.getStatus()))
                .findFirst().orElse(false);
        if (!ready) throw new RuntimeException("Pod non Ready : " + podName);

        String targetDir  = NGINX_HTML_PATH + (subPath.startsWith("/") ? subPath : "/" + subPath);
        String targetFile = targetDir.endsWith("/")
                ? targetDir + safeFileName
                : targetDir + "/" + safeFileName;

        try {
            byte[] content = file.getBytes();
            execAndWait(namespace, podName, 10, "mkdir", "-p", targetDir);

            CountDownLatch latch = new CountDownLatch(1);
            try (var exec = k8sClient.pods()
                    .inNamespace(namespace)
                    .withName(podName)
                    .redirectingInput()
                    .writingOutput(ByteArrayOutputStream.nullOutputStream())
                    .writingError(System.err)
                    .usingListener(new ExecListener() {
                        @Override public void onClose(int code, String reason) { latch.countDown(); }
                        @Override public void onFailure(Throwable t, Response r) {
                            log.error("[UPLOAD] exec failure: {}", t != null ? t.getMessage() : "null");
                            latch.countDown();
                        }
                    })
                    .exec("sh", "-c", "cat > " + shellQuote(targetFile))) {

                exec.getInput().write(content);
                exec.getInput().flush();
                exec.getInput().close();
                boolean done = latch.await(30, TimeUnit.SECONDS);
                if (!done) log.warn("[UPLOAD] Timeout écriture fichier {}", targetFile);
            }
            log.info("[UPLOAD] ✅ {} → {}", file.getOriginalFilename(), targetFile);

        } catch (Exception e) {
            log.error("[UPLOAD] Échec {} : {}", file.getOriginalFilename(), e.getMessage());
            throw new RuntimeException("Upload échoué : " + e.getMessage(), e);
        }
    }

    // ── Lister les fichiers ───────────────────────────────────────────────────

    public List<Map<String, Object>> listFiles(String username) {
        String namespace = namespaceService.getNamespaceForUser(sanitize(username));
        String appName   = "nginx-" + sanitize(username);

        // ✅ Vérifier pod disponible avant d'appeler getRunningPodName
        try {
            String podName = getRunningPodName(namespace, appName);
            ByteArrayOutputStream output = new ByteArrayOutputStream();
            CountDownLatch latch = new CountDownLatch(1);

            try (var exec = k8sClient.pods()
                    .inNamespace(namespace)
                    .withName(podName)
                    .redirectingInput()
                    .writingOutput(output)
                    .writingError(ByteArrayOutputStream.nullOutputStream())
                    .usingListener(new ExecListener() {
                        @Override public void onClose(int code, String reason) { latch.countDown(); }
                        @Override public void onFailure(Throwable t, Response r) { latch.countDown(); }
                    })
                    // ✅ Commande POSIX compatible — pas de -printf GNU
                    .exec("sh", "-c",
                            "find " + NGINX_HTML_PATH + " -maxdepth 3 -type f 2>/dev/null | " +
                                    "while read f; do " +
                                    "name=$(basename \"$f\"); " +
                                    "size=$(stat -c%s \"$f\" 2>/dev/null || echo 0); " +
                                    "mtime=$(stat -c%Y \"$f\" 2>/dev/null || echo 0); " +
                                    "printf '%s\\t%s\\t%s\\n' \"$name\" \"$size\" \"$mtime\"; " +
                                    "done")) {
                exec.getInput().close();
                latch.await(10, TimeUnit.SECONDS);
            }

            return Arrays.stream(output.toString().split("\n"))
                    .filter(line -> !line.isBlank())
                    .map(line -> {
                        String[] parts = line.split("\t", 3);
                        return Map.<String, Object>of(
                                "name",     parts.length > 0 ? parts[0] : "",
                                "size",     parts.length > 1 ? parseLong(parts[1]) : 0L,
                                "modified", parts.length > 2 ? parts[2] : ""
                        );
                    })
                    .toList();

        } catch (Exception e) {
            log.error("[LIST] Erreur listing pour {} : {}", username, e.getMessage());
            return List.of();  // ✅ Retourner liste vide plutôt que crasher
        }
    }
    // ── Supprimer un fichier ──────────────────────────────────────────────────

    public void deleteFile(String username, String fileName) {
        // Sécurité : interdire path traversal
        if (fileName.contains("..") || fileName.contains("/") || fileName.isBlank()) {
            throw new IllegalArgumentException("Nom de fichier invalide : " + fileName);
        }

        String namespace = namespaceService.getNamespaceForUser(sanitize(username));
        String appName   = "nginx-" + sanitize(username);
        String podName   = getRunningPodName(namespace, appName);

        execAndWait(namespace, podName, 10,
                "rm", "-f", NGINX_HTML_PATH + "/" + fileName);

        log.info("[DELETE] Fichier supprimé : {}/{}", NGINX_HTML_PATH, fileName);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    /**
     * Récupère le premier pod nginx en état Running dans le namespace.
     * Lance une RuntimeException claire si aucun pod n'est disponible
     * (ex : pod en CrashLoopBackOff → message utile côté API).
     */
    private String getRunningPodName(String namespace, String appName) {
        return k8sClient.pods()
                .inNamespace(namespace)
                .withLabel("app", appName)
                .list().getItems().stream()
                .filter(p -> "Running".equals(p.getStatus().getPhase()))
                .findFirst()
                .map(p -> p.getMetadata().getName())
                .orElseThrow(() -> new RuntimeException(
                        "Aucun pod nginx Running dans " + namespace +
                                " — vérifiez que le service est bien démarré"));
    }

    /**
     * Exécute une commande dans le pod et attend sa fin.
     * Utilise redirectingInput() pour éviter NPE sur getInput().
     */
    private void execAndWait(String namespace, String podName, int timeoutSeconds, String... cmd) {
        try {
            CountDownLatch latch = new CountDownLatch(1);
            try (var exec = k8sClient.pods()
                    .inNamespace(namespace)
                    .withName(podName)
                    .redirectingInput()
                    .writingOutput(ByteArrayOutputStream.nullOutputStream())
                    .writingError(System.err)
                    .usingListener(new ExecListener() {
                        @Override public void onClose(int code, String reason) { latch.countDown(); }
                        @Override public void onFailure(Throwable t, Response r) { latch.countDown(); }
                    })
                    .exec(cmd)) {
                exec.getInput().close();
                latch.await(timeoutSeconds, TimeUnit.SECONDS);
            }
        } catch (Exception e) {
            log.warn("[EXEC] Commande {} échouée dans {} : {}", Arrays.toString(cmd), podName, e.getMessage());
        }
    }

    /** Échappe un chemin pour l'utiliser dans un shell script. */
    private String shellQuote(String path) {
        return "'" + path.replace("'", "'\\''") + "'";
    }

    /** Sanitize le nom de fichier uploadé. */
    private String sanitizeFilename(String name) {
        if (name == null || name.isBlank()) return "fichier";
        // Garder seulement nom+extension, supprimer path traversal
        String base = name.contains("/") ? name.substring(name.lastIndexOf('/') + 1) : name;
        return base.replaceAll("[^a-zA-Z0-9._-]", "_");
    }

    private String sanitize(String input) {
        return input.toLowerCase()
                .replaceAll("[^a-z0-9-]", "-")
                .replaceAll("-+", "-")
                .replaceAll("^-|-$", "");
    }

    private long parseLong(String s) {
        try { return Long.parseLong(s.trim()); }
        catch (NumberFormatException e) { return 0L; }
    }
}