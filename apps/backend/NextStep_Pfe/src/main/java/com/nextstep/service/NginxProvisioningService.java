package com.nextstep.service;

import com.nextstep.dto.NginxDeploymentResult;
import com.nextstep.entity.Plan;
import com.nextstep.entity.PlanTier;
import io.fabric8.kubernetes.api.model.*;
import io.fabric8.kubernetes.client.KubernetesClient;
import io.fabric8.openshift.api.model.Route;
import io.fabric8.openshift.api.model.RouteBuilder;
import io.fabric8.openshift.client.OpenShiftClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class NginxProvisioningService {

    private final KubernetesClient k8sClient;
    private final OpenShiftClient  osClient;
    private final NamespaceService namespaceService;

    @Value("${openshift.namespace-prefix}")
    private String namespacePrefix;

    @Value("${openshift.apps-domain:apps.ocp4.nextstep-it.com}")
    private String appsDomain;

    // ── Point d'entrée principal ──────────────────────────────────────────────

    public NginxDeploymentResult provisionNginx(String username, Plan plan) {
        String cleanUsername = sanitize(username.contains("@") ? username.split("@")[0] : username);
        String namespace     = namespaceService.getNamespaceForUser(cleanUsername);
        String appName       = "nginx-" + cleanUsername;

        log.info("[NGINX] Provisioning user={} namespace={} plan={}", cleanUsername, namespace, plan.getTier());

        namespaceService.provisionIfAbsent(cleanUsername);
        applyPvc(namespace, appName, plan);
        applyConfigMap(namespace, appName, plan);
        applyIndexPage(namespace, appName, cleanUsername);
        applyDeployment(namespace, appName, plan);
        applyService(namespace, appName);
        String url = applyRoute(namespace, appName);

        log.info("[NGINX] Provisioning terminé — URL : {}", url);

        return NginxDeploymentResult.builder()
                .namespace(namespace).appName(appName)
                .publicUrl(url).plan(plan.getTier().name())
                .status("STARTING").build();  // STARTING car le pod n'est pas encore prêt
    }

    public void deprovisionNginx(String username) {
        String cleanUsername = sanitize(username.contains("@") ? username.split("@")[0] : username);
        String namespace     = namespaceService.getNamespaceForUser(cleanUsername);
        String appName       = "nginx-" + cleanUsername;

        osClient.routes().inNamespace(namespace).withName(appName).delete();
        k8sClient.services().inNamespace(namespace).withName(appName).delete();
        k8sClient.apps().deployments().inNamespace(namespace).withName(appName).delete();
        k8sClient.configMaps().inNamespace(namespace).withName(appName + "-config").delete();
        k8sClient.configMaps().inNamespace(namespace).withName(appName + "-index").delete();
        k8sClient.persistentVolumeClaims().inNamespace(namespace).withName(appName + "-data").delete();

        log.info("[NGINX] Suppression complète pour user={}", cleanUsername);
    }

    public NginxDeploymentResult getDeploymentStatus(String username) {
        // FIX #3 : appName doit utiliser sanitize() — cohérent avec provisionNginx()
        String cleanUsername = sanitize(username.contains("@") ? username.split("@")[0] : username);
        String namespace     = namespaceService.getNamespaceForUser(cleanUsername);
        String appName       = "nginx-" + cleanUsername;

        io.fabric8.kubernetes.api.model.apps.Deployment k8sDeployment =
                k8sClient.apps().deployments()
                        .inNamespace(namespace)
                        .withName(appName)
                        .get();

        if (k8sDeployment == null) {
            return NginxDeploymentResult.builder().status("NOT_FOUND").build();
        }

        Integer ready  = k8sDeployment.getStatus().getReadyReplicas();
        String  status = (ready != null && ready > 0) ? "RUNNING" : "STARTING";

        Route route = osClient.routes().inNamespace(namespace).withName(appName).get();
        String url  = route != null ? "https://" + route.getSpec().getHost() : null;

        return NginxDeploymentResult.builder()
                .namespace(namespace).appName(appName)
                .publicUrl(url).plan(null).status(status)
                .build();
    }

    // ── ConfigMap nginx.conf ──────────────────────────────────────────────────

    private void applyConfigMap(String namespace, String appName, Plan plan) {
        ConfigMap cm = new ConfigMapBuilder()
                .withNewMetadata()
                .withName(appName + "-config")
                .withNamespace(namespace)
                .addToLabels("app",          appName)
                .addToLabels("managed-by",   "nextstep")
                .addToLabels("service-type", "nginx-hosting")
                .endMetadata()
                .addToData("nextstep.conf", buildNginxConfig(plan))
                .build();

        k8sClient.configMaps().inNamespace(namespace).resource(cm).createOrReplace();
        log.debug("[NGINX] ConfigMap créée : {}-config", appName);
    }

    /*private String buildNginxConfig(Plan plan) {
        // FIX #1 : limit_req_zone appartient au contexte http{}, PAS server{}.
        // L'image sclorg nginx:1.24-ubi8 inclut /etc/nginx/nginx.d/*.conf
        // à l'intérieur du bloc http{} existant — on ne peut y mettre
        // que des blocs server{} / upstream{} / map{}.
        // Le rate-limiting est délégué à HAProxy (annotation Route) plutôt
        // qu'à nginx pour éviter ce problème de contexte.
        return """
                server {
                  listen 8080;
                  server_name _;
                  root /usr/share/nginx/html;
                  index index.html;

                  add_header X-Frame-Options "SAMEORIGIN" always;
                  add_header X-Content-Type-Options "nosniff" always;
                  add_header X-XSS-Protection "1; mode=block" always;

                  location / {
                    try_files $uri $uri/ /index.html;
                  }

                  location ~* \\.(js|css|png|jpg|jpeg|svg|ico|woff2|woff|ttf)$ {
                    expires 1y;
                    add_header Cache-Control "public, immutable";
                  }

                  location /health {
                    access_log off;
                    return 200 "OK\\n";
                    add_header Content-Type text/plain;
                  }

                  location ~ /\\. {
                    deny all;
                  }
                }
                """;
    }*/private String buildNginxConfig(Plan plan) {
        return """
    location / {
      try_files $uri $uri/ /index.html;
    }
    location ~* \\.(js|css|png|jpg|svg|ico|woff2)$ {
      expires 1y;
      add_header Cache-Control "public, immutable";
    }
    location /health {
      access_log off;
      return 200 "OK";
      add_header Content-Type text/plain;
    }
    location ~ /\\. {
      deny all;
    }
    """;
    }

    // ── Deployment ────────────────────────────────────────────────────────────

    private void applyDeployment(String namespace, String appName, Plan plan) {
        String cpuReq  = switch (plan.getTier()) { case STARTER -> "50m";   case BUSINESS -> "100m";  case ENTERPRISE -> "500m";  };
        String memReq  = switch (plan.getTier()) { case STARTER -> "64Mi";  case BUSINESS -> "128Mi"; case ENTERPRISE -> "512Mi"; };
        String cpuLim  = switch (plan.getTier()) { case STARTER -> "100m";  case BUSINESS -> "300m";  case ENTERPRISE -> "1000m"; };
        String memLim  = switch (plan.getTier()) { case STARTER -> "128Mi"; case BUSINESS -> "256Mi"; case ENTERPRISE -> "1Gi";   };
        int    replicas = plan.getTier() == PlanTier.ENTERPRISE ? 2 : 1;

        io.fabric8.kubernetes.api.model.apps.Deployment k8sDep =
                new io.fabric8.kubernetes.api.model.apps.DeploymentBuilder()
                        .withNewMetadata()
                        .withName(appName).withNamespace(namespace)
                        .addToLabels("app", appName)
                        .addToLabels("managed-by", "nextstep")
                        .endMetadata()
                        .withNewSpec()
                        .withReplicas(replicas)
                        .withNewSelector().addToMatchLabels("app", appName).endSelector()
                        .withNewTemplate()
                        .withNewMetadata().addToLabels("app", appName).endMetadata()
                        .withNewSpec()

                        // ── InitContainer ──────────────────────────────────────
                        .addNewInitContainer()
                        .withName("fix-permissions")
                        .withImage("registry.access.redhat.com/ubi8/ubi-minimal:latest")
                        // ✅ Un seul withCommand — copie toujours sans condition
                        .withCommand("sh", "-c",
                                // ✅ Copie index.html UNIQUEMENT si le dossier est vide (premier déploiement)
                                "if [ ! -f /opt/app-root/src/index.html ]; then " +
                                        "  cp /tmp/index-branded/index.html /opt/app-root/src/index.html; " +
                                        "fi && " +
                                        "chown -R 1001:1001 /opt/app-root/src && " +
                                        "chmod -R 755 /opt/app-root/src")
                        .withNewResources()
                        .addToRequests("cpu",    new Quantity("10m"))
                        .addToRequests("memory", new Quantity("32Mi"))
                        .addToLimits("cpu",      new Quantity("50m"))
                        .addToLimits("memory",   new Quantity("64Mi"))
                        .endResources()
                        .addNewVolumeMount()
                        .withName("site-data")
                        .withMountPath("/opt/app-root/src")
                        .endVolumeMount()
                        .addNewVolumeMount()
                        .withName("index-page")
                        .withMountPath("/tmp/index-branded")
                        .endVolumeMount()
                        .endInitContainer()

                        // ── Container nginx ────────────────────────────────────
                        .addNewContainer()
                        .withName("nginx")
                        .withImage("image-registry.openshift-image-registry.svc:5000/openshift/nginx:1.24-ubi8")
                        // ✅ Bypasse le script S2I — lance nginx directement
                        .withCommand("/usr/sbin/nginx", "-g", "daemon off;")
                        .addNewPort().withContainerPort(8080).endPort()
                        .addNewVolumeMount()
                        .withName("nginx-config")
                        .withMountPath("/opt/app-root/etc/nginx.default.d/nextstep.conf")
                        .withSubPath("nextstep.conf")
                        .endVolumeMount()
                        .addNewVolumeMount()
                        .withName("site-data")
                        .withMountPath("/opt/app-root/src")
                        .endVolumeMount()
                        .withNewResources()
                        .addToRequests("cpu",    new Quantity(cpuReq))
                        .addToRequests("memory", new Quantity(memReq))
                        .addToLimits("cpu",      new Quantity(cpuLim))
                        .addToLimits("memory",   new Quantity(memLim))
                        .endResources()
                        .withNewReadinessProbe()
                        .withNewHttpGet().withPath("/health").withNewPort(8080).endHttpGet()
                        .withInitialDelaySeconds(5).withPeriodSeconds(10).withFailureThreshold(3)
                        .endReadinessProbe()
                        .withNewLivenessProbe()
                        .withNewHttpGet().withPath("/health").withNewPort(8080).endHttpGet()
                        .withInitialDelaySeconds(15).withPeriodSeconds(20).withFailureThreshold(3)
                        .endLivenessProbe()
                        .endContainer()

                        .addNewVolume()
                        .withName("nginx-config")
                        .withNewConfigMap().withName(appName + "-config").endConfigMap()
                        .endVolume()
                        .addNewVolume()
                        .withName("site-data")
                        .withNewPersistentVolumeClaim()
                        .withClaimName(appName + "-data")
                        .endPersistentVolumeClaim()
                        .endVolume()
                        .addNewVolume()
                        .withName("index-page")
                        .withNewConfigMap().withName(appName + "-index").endConfigMap()
                        .endVolume()
                        .endSpec()
                        .endTemplate()
                        .endSpec()
                        .build();

        k8sClient.apps().deployments().inNamespace(namespace).resource(k8sDep).createOrReplace();
        log.debug("[NGINX] Deployment créé : {}", appName);
    }
    // ── Service ───────────────────────────────────────────────────────────────

    private void applyService(String namespace, String appName) {
        io.fabric8.kubernetes.api.model.Service svc = new ServiceBuilder()
                .withNewMetadata()
                .withName(appName).withNamespace(namespace)
                .addToLabels("app", appName)
                .addToLabels("managed-by", "nextstep")
                .endMetadata()
                .withNewSpec()
                .addToSelector("app", appName)
                .addNewPort()
                .withName("http").withPort(80).withTargetPort(new IntOrString(8080))
                .endPort()
                .withType("ClusterIP")
                .endSpec()
                .build();

        k8sClient.services().inNamespace(namespace).resource(svc).createOrReplace();
        log.debug("[NGINX] Service créé : {}", appName);
    }

    // ── Route OpenShift ───────────────────────────────────────────────────────

    private String applyRoute(String namespace, String appName) {
        String host = appName + "-" + namespace + "." + appsDomain;

        Route route = new RouteBuilder()
                .withNewMetadata()
                .withName(appName).withNamespace(namespace)
                .addToLabels("app", appName)
                .addToLabels("managed-by", "nextstep")
                .addToAnnotations("cert-manager.io/cluster-issuer", "letsencrypt-prod")
                .addToAnnotations("kubernetes.io/tls-acme", "true")
                // FIX #4 : rate-limit délégué à HAProxy (remplace limit_req_zone nginx)
                .addToAnnotations("haproxy.router.openshift.io/rate-limit-connections", "true")
                .addToAnnotations("haproxy.router.openshift.io/rate-limit-connections.rate-http", "100")
                .endMetadata()
                .withNewSpec()
                .withHost(host)
                .withNewTo().withKind("Service").withName(appName).withWeight(100).endTo()
                .withNewPort().withNewTargetPort("http").endPort()
                .withNewTls()
                .withTermination("edge")
                .withInsecureEdgeTerminationPolicy("Redirect")
                .endTls()
                .endSpec()
                .build();

        osClient.routes().inNamespace(namespace).resource(route).createOrReplace();
        log.debug("[NGINX] Route TLS créée : https://{}", host);
        return "https://" + host;
    }

    // ── PVC ───────────────────────────────────────────────────────────────────

    private void applyPvc(String namespace, String appName, Plan plan) {
        PersistentVolumeClaim existing = k8sClient.persistentVolumeClaims()
                .inNamespace(namespace).withName(appName + "-data").get();
        if (existing != null) {
            log.info("[NGINX] PVC {} existe déjà — skip", appName + "-data");
            return;
        }

        String storageSize = switch (plan.getTier()) {
            case STARTER    -> "1Gi";
            case BUSINESS   -> "5Gi";
            case ENTERPRISE -> "20Gi";
        };

        PersistentVolumeClaim pvc = new PersistentVolumeClaimBuilder()
                .withNewMetadata()
                .withName(appName + "-data").withNamespace(namespace)
                .addToLabels("app", appName)
                .addToLabels("managed-by", "nextstep")
                .endMetadata()
                .withNewSpec()
                .withAccessModes("ReadWriteOnce")
                .withNewResources().addToRequests("storage", new Quantity(storageSize)).endResources()
                .withStorageClassName("nfs-storage")
                .endSpec()
                .build();

        k8sClient.persistentVolumeClaims().inNamespace(namespace).resource(pvc).create();
        log.debug("[NGINX] PVC créé : {}-data ({})", appName, storageSize);
    }

    // ── Page d'accueil branded ────────────────────────────────────────────────

    private void applyIndexPage(String namespace, String appName, String username) {
        String html = """
                <!DOCTYPE html>
                <html lang="fr">
                <head>
                  <meta charset="UTF-8">
                  <meta name="viewport" content="width=device-width, initial-scale=1.0">
                  <title>NextStep — Hébergement Web</title>
                  <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body {
                      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                      background: #0f172a; color: #e2e8f0;
                      display: flex; align-items: center; justify-content: center;
                      min-height: 100vh;
                    }
                    .card {
                      background: #1e293b; border: 1px solid #334155;
                      border-radius: 16px; padding: 48px 56px; text-align: center;
                      max-width: 520px; width: 90%%;
                    }
                    .logo { font-size: 28px; font-weight: 700; color: #0a7fcf; margin-bottom: 8px; }
                    .tag  { font-size: 12px; color: #64748b; text-transform: uppercase;
                            letter-spacing: .1em; margin-bottom: 32px; }
                    h1   { font-size: 20px; font-weight: 600; margin-bottom: 12px; }
                    p    { color: #94a3b8; font-size: 14px; line-height: 1.6; }
                    .badge {
                      display: inline-block; margin-top: 24px;
                      background: #0a7fcf22; color: #0a7fcf;
                      border: 1px solid #0a7fcf44; border-radius: 999px;
                      padding: 4px 14px; font-size: 12px;
                    }
                    .steps {
                      margin-top: 28px; text-align: left;
                      background: #0f172a; border-radius: 10px; padding: 20px 24px;
                    }
                    .steps p { font-size: 12px; color: #64748b; margin-bottom: 4px; font-weight: 600;
                               text-transform: uppercase; letter-spacing: .08em; }
                    .steps ol { padding-left: 18px; }
                    .steps li { color: #94a3b8; font-size: 13px; margin-top: 8px; line-height: 1.5; }
                    code { background: #1e293b; border: 1px solid #334155;
                           padding: 2px 6px; border-radius: 4px; font-size: 12px; color: #7dd3fc; }
                  </style>
                </head>
                <body>
                  <div class="card">
                    <div class="logo">NextStep</div>
                    <div class="tag">Cloud Self-Service Portal</div>
                    <h1>Votre hébergement est actif 🎉</h1>
                    <p>Bienvenue <strong>%s</strong> ! Votre serveur nginx est opérationnel.<br>
                       Déposez vos fichiers pour mettre votre site en ligne.</p>
                    <div class="badge">nginx · OpenShift · Prêt</div>
                    <div class="steps">
                      <p>Pour déployer votre site</p>
                      <ol>
                        <li>Uploadez vos fichiers dans <code>/opt/app-root/src</code></li>
                        <li>Vos fichiers sont copiés dans <code>/usr/share/nginx/html</code></li>
                        <li>Votre site est immédiatement accessible</li>
                      </ol>
                    </div>
                  </div>
                </body>
                </html>
                """.formatted(username);

        ConfigMap indexCm = new ConfigMapBuilder()
                .withNewMetadata()
                .withName(appName + "-index").withNamespace(namespace)
                .addToLabels("app", appName)
                .addToLabels("managed-by", "nextstep")
                .endMetadata()
                .addToData("index.html", html)
                .build();

        k8sClient.configMaps().inNamespace(namespace).resource(indexCm).createOrReplace();
        log.debug("[NGINX] Page d'accueil branded créée pour {}", username);
    }

    // ── Utilitaires ───────────────────────────────────────────────────────────

    private String sanitize(String input) {
        return input.toLowerCase()
                .replaceAll("[^a-z0-9-]", "-")
                .replaceAll("-+", "-")
                .replaceAll("^-|-$", "");
    }
}