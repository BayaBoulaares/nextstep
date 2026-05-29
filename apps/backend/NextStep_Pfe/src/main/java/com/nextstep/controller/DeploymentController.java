package com.nextstep.controller;

import com.nextstep.dto.AbonnementRequest;
import com.nextstep.dto.DeploymentDTO;
import com.nextstep.dto.DeploymentRequest;
import com.nextstep.entity.*;
import com.nextstep.repository.DatabaseResourceRepository;
import com.nextstep.repository.StorageResourceRepository;
import com.nextstep.repository.VirtualMachineRepository;
import com.nextstep.service.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;

@RestController
@RequestMapping("/api/deployments")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Déploiements", description = "Tunnel de déploiement et gestion des ressources actives")
@SecurityRequirement(name = "bearerAuth")
public class DeploymentController {

    private final DeploymentService        deploymentService;
    private final UserService              userService;
    private final VirtualMachineRepository vmRepository; // ✅ nouveau
    private final AbonnementService abonnementService;
    private final StorageResourceRepository storageResourceRepository; // ← ajouter
    private final StorageProvisioningService storageProvisioningService;
    private final DatabaseProvisioningService databaseProvisioningService;
    private final DatabaseResourceRepository databaseResourceRepository;
    private  final NginxProvisioningService  nginxProvisioningService;
    @Autowired
    private VmProvisioningService vmProvisioningService;
    private final MinioEndpointResolver minioEndpointResolver;

    @GetMapping("/user/{userId}")
    public List<DeploymentDTO> getByUser(
            @PathVariable UUID userId,
            @AuthenticationPrincipal Jwt jwt) {
        String keycloakId = jwt.getSubject();
        User caller = userService.findByKeycloakId(keycloakId);
        return deploymentService.getByUser(caller.getId());
    }

    // ✅ Retourne le vmPassword quand statut = EN_LIGNE
    @GetMapping("/{id}")
    @Operation(summary = "Détail d'un déploiement")
    public ResponseEntity<?> getById(
            @PathVariable Long id,
            @AuthenticationPrincipal Jwt jwt) {

        DeploymentDTO dto = deploymentService.getById(id);

        // Si EN_LIGNE → chercher le password en BDD
        String vmPassword = null;
        if (DeploymentStatus.EN_LIGNE.name().equals(dto.getStatus())) {
            String username = jwt.getClaimAsString("email")
                    .split("@")[0].replace(".", "-");
            String vmName   = sanitize(dto.getResourceName());

            vmPassword = vmRepository
                    .findByNameAndUsername(vmName, username)
                    .map(VirtualMachine::getVmPassword)
                    .orElse(null);
        }

        // ✅ Enrichir la réponse avec vmPassword
        Map<String, Object> response = new HashMap<>();
// CORRIGÉ — retourner tous les champs utiles
        response.put("id",              dto.getId());
        response.put("status",          dto.getStatus().name());
        response.put("resourceName",    dto.getResourceName());
        response.put("description",     dto.getDescription());
        response.put("planId",          dto.getPlanId());
        response.put("planName",        dto.getPlanName());
        response.put("serviceId",       dto.getServiceId());
        response.put("serviceName",     dto.getServiceName());
        response.put("serviceIcon",     dto.getServiceIcon());
        response.put("categoryName",    dto.getCategoryName());
        response.put("vcores",          dto.getVcores());
        response.put("ramGb",           dto.getRamGb());
        response.put("storageGb",       dto.getStorageGb());
        response.put("regionName",      dto.getRegionName());
        response.put("monthlyPriceHt",  dto.getMonthlyPriceHt());
        response.put("backupEnabled",   dto.getBackupEnabled());
        response.put("monitoringEnabled", dto.getMonitoringEnabled());
        response.put("projectId",       dto.getProjectId());
        response.put("projectName",     dto.getProjectName());
        response.put("createdAt",       dto.getCreatedAt());
        response.put("deployedAt",      dto.getDeployedAt());
        response.put("vmPassword",      vmPassword != null ? vmPassword : "");

        return ResponseEntity.ok(response);
    }

    /*@PostMapping("/user/{userId}")
    public ResponseEntity<DeploymentDTO> create(
            @PathVariable UUID userId,
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody DeploymentRequest request) {

        String keycloakId = jwt.getSubject();
        User caller = userService.findByKeycloakId(keycloakId);
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(deploymentService.create(caller.getId(), request));
    }*/
    @PostMapping
    public ResponseEntity<DeploymentDTO> create(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody DeploymentRequest request) {

        String keycloakId = jwt.getSubject();
        User caller = userService.findByKeycloakId(keycloakId);

        // 1. Créer le Deployment
        DeploymentDTO dto = deploymentService.create(caller.getId(), request);

        // 2. Créer l'Abonnement lié automatiquement
        AbonnementRequest aboReq = new AbonnementRequest();
        aboReq.setPlanId(request.getPlanId());
        aboReq.setAutoRenouvellement(true);
        aboReq.setDeploymentId(dto.getId());
        abonnementService.souscrire(caller.getId(), aboReq);

        return ResponseEntity.status(HttpStatus.CREATED).body(dto);
    }

    /*@PatchMapping("/{id}/provision")
    public ResponseEntity<DeploymentDTO> startProvisioning(@PathVariable Long id) {
        DeploymentDTO dto = deploymentService.startProvisioning(id);
        vmProvisioningService.provisionAsync(id);
        return ResponseEntity.ok(dto);
    }
*/
    @PatchMapping("/{id}/running")
    @Operation(summary = "Marquer le déploiement comme opérationnel")
    public DeploymentDTO markRunning(@PathVariable Long id) {
        return deploymentService.markRunning(id);
    }

    @PatchMapping("/{id}/status")
    @Operation(summary = "Changer le statut d'un déploiement")
    public DeploymentDTO changeStatus(
            @PathVariable Long id,
            @RequestParam DeploymentStatus status) {
        return deploymentService.changeStatus(id, status);
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Supprimer un déploiement")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        deploymentService.delete(id);
        return ResponseEntity.noContent().build();
    }

    private String sanitize(String name) {
        return name.toLowerCase()
                .replaceAll("[^a-z0-9-]", "-")
                .replaceAll("-+", "-")
                .replaceAll("^-|-$", "");
    }
    /*@PostMapping("/{id}/provision")
    public ResponseEntity<DeploymentDTO> provision(@PathVariable Long id) {
        deploymentService.startProvisioning(id);
        // Lance le provisionAsync en background
        vmProvisioningService.provisionAsync(id);
        return ResponseEntity.ok(deploymentService.getById(id));
    }*/

    /*@PatchMapping("/{id}/provision")
    public ResponseEntity<DeploymentDTO> startProvisioning(@PathVariable Long id) {
        Deployment dep = deploymentService.findEntityById(id);

        ServiceCategory category = deploymentService
                .findEntityById(id)
                .getPlan()
                .getService()
                .getCategory();
        // ✅ Si déjà en cours → retourner sans relancer
        if (dep.getStatus() == DeploymentStatus.PROVISIONNEMENT) {
            log.warn("[CTRL] Deployment {} déjà en PROVISIONNEMENT — ignoré", id);
            return ResponseEntity.ok(deploymentService.getById(id));
        }
        DeploymentDTO dto = deploymentService.startProvisioning(id);

        if (category.requiresVm()) {
            vmProvisioningService.provisionAsync(id);

        } else if (category == ServiceCategory.BASE_DONNEES) {
            databaseProvisioningService.provisionAsync(id);          // ← NOUVEAU

        } else {
            storageProvisioningService.provisionAsync(id);
        }

        return ResponseEntity.ok(dto);
    }*/
    @PatchMapping("/{id}/provision")
    public ResponseEntity<DeploymentDTO> startProvisioning(
            @PathVariable Long id,
            @AuthenticationPrincipal Jwt jwt) {

        Deployment dep = deploymentService.findEntityById(id);
        ServiceCategory category = dep.getPlan().getService().getCategory();

        if (dep.getStatus() == DeploymentStatus.PROVISIONNEMENT) {
            return ResponseEntity.ok(deploymentService.getById(id));
        }

        DeploymentDTO dto = deploymentService.startProvisioning(id);

        switch (category) {
            case CALCUL      -> vmProvisioningService.provisionAsync(id);
            case HEBERGEMENT -> {
                String username = jwt.getClaimAsString("preferred_username");
                Plan plan = dep.getPlan();
                // async pour ne pas bloquer la réponse HTTP
                CompletableFuture.runAsync(() -> {
                    try {
                        nginxProvisioningService.provisionNginx(username, plan);
                        deploymentService.markRunning(id); // → ACTIF
                    } catch (Exception e) {
                        deploymentService.changeStatus(id, DeploymentStatus.ECHEC);
                    }
                });
            }
            case BASE_DONNEES -> databaseProvisioningService.provisionAsync(id);
            case STOCKAGE     -> storageProvisioningService.provisionAsync(id);
            default -> log.info("Catégorie {} — pas de provisioning automatique", category);
        }

        return ResponseEntity.ok(dto);
    }

    // Endpoint DELETE branché sur la suppression de la ressource de stockage
    @DeleteMapping("/{id}/storage")
    public ResponseEntity<Void> deleteStorageResource(
            @PathVariable Long id,
            @AuthenticationPrincipal Jwt jwt) {

        String keycloakId = jwt.getSubject();
        User caller = userService.findByKeycloakId(keycloakId);

        Deployment dep = deploymentService.findEntityById(id);
        if (!dep.getUser().getId().equals(caller.getId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        storageProvisioningService.deleteStorageResource(id);
        return ResponseEntity.noContent().build();
    }
    @GetMapping("/user/me")
    public List<DeploymentDTO> getMyDeployments(@AuthenticationPrincipal Jwt jwt) {
        String keycloakId = jwt.getSubject();
        User caller = userService.findByKeycloakId(keycloakId);
        return deploymentService.getByUser(caller.getId());
    }// Dans DeploymentController.java — ajouter l'endpoint storage GET
    // DeploymentController.java — remplacer getStorageResource
    @GetMapping("/{id}/storage-resource")
    public ResponseEntity<?> getStorageResource(@PathVariable Long id) {
        return storageResourceRepository.findByDeploymentId(id)
                .map(sr -> {
                    Map<String, Object> dto = new HashMap<>();
                    dto.put("id",               sr.getId());
                    dto.put("resourceName",     sr.getResourceName());
                    dto.put("namespace",        sr.getNamespace());
                    dto.put("storageType",      sr.getStorageType());
                    dto.put("capacity",         sr.getCapacity());
                    dto.put("storageClassName", sr.getStorageClassName());
                    dto.put("s3Endpoint",       sr.getS3Endpoint());
                    dto.put("bucketName",       sr.getBucketName());
                    dto.put("accessKeyId",      sr.getAccessKeyId());
                    dto.put("status",           sr.getStatus());
                    dto.put("readyAt",          sr.getReadyAt());
                    return ResponseEntity.ok(dto);
                })
                .orElse(ResponseEntity.notFound().build());
    }
    @GetMapping("/{id}/storage-credentials")
    @Operation(summary = "Récupérer les credentials S3 pour un déploiement de stockage")
    public ResponseEntity<?> getStorageCredentials(@PathVariable Long id) {
        return storageResourceRepository.findByDeploymentId(id)
                .filter(sr -> sr.getStorageType() == ServiceCategory.OBJECT_STORAGE
                        || sr.getStorageType() == ServiceCategory.STOCKAGE)
                .map(sr -> {
                    String endpoint = minioEndpointResolver.resolve(sr); // ← NodePort résolu
                    Map<String, Object> creds = new HashMap<>();
                    creds.put("bucketName",      sr.getBucketName());
                    creds.put("s3Endpoint",      endpoint);
                    creds.put("consoleEndpoint", minioEndpointResolver.resolveConsole(sr)); // ← ajouter// ← plus la Route
                    creds.put("accessKeyId",     sr.getAccessKeyId());
                    creds.put("secretAccessKey", sr.getSecretAccessKey());
                    return ResponseEntity.ok(creds);
                })
                .orElse(ResponseEntity.notFound().build());
    }
    @GetMapping("/{id}/database-resource")
    @Operation(summary = "Récupérer les informations de la base de données")
    public ResponseEntity<?> getDatabaseResource(
            @PathVariable Long id,
            @AuthenticationPrincipal Jwt jwt) {

        return databaseResourceRepository.findByDeploymentId(id)
                .map(db -> {
                    Map<String, Object> dto = new HashMap<>();
                    dto.put("clusterName",     db.getClusterName());
                    dto.put("namespace",       db.getNamespace());
                    dto.put("hostRw",          db.getHostRw());
                    dto.put("hostRo",          db.getHostRo());
                    dto.put("port",            db.getPort());
                    dto.put("dbName",          db.getDbName());
                    dto.put("dbUser",          db.getDbUser());
                    dto.put("status",          db.getStatus());
                    dto.put("instances",       db.getInstances());
                    dto.put("storageGb",       db.getStorageGb());
                    dto.put("readyAt",         db.getReadyAt());
                    return ResponseEntity.ok(dto);
                })
                .orElse(ResponseEntity.notFound().build());
    }

// ── Endpoint GET credentials (mot de passe) ───────────────────────────────

    @GetMapping("/{id}/database-credentials")
    @Operation(summary = "Récupérer les credentials de connexion à la BDD")
    public ResponseEntity<?> getDatabaseCredentials(
            @PathVariable Long id,
            @AuthenticationPrincipal Jwt jwt) {

        String keycloakId = jwt.getSubject();
        User caller = userService.findByKeycloakId(keycloakId);

        Deployment dep = deploymentService.findEntityById(id);
        if (!dep.getUser().getId().equals(caller.getId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        return databaseResourceRepository.findByDeploymentId(id)
                .filter(db -> db.getStatus() == DatabaseStatus.READY)
                .map(db -> {
                    Map<String, Object> creds = new HashMap<>();
                    creds.put("host",     db.getHostRw());
                    creds.put("hostRo",   db.getHostRo());
                    creds.put("port",     db.getPort());
                    creds.put("dbName",   db.getDbName());
                    creds.put("username", db.getDbUser());
                    creds.put("password", db.getDbPassword());
                    creds.put("jdbcUrl",  "jdbc:postgresql://" + db.getHostRw()
                            + ":" + db.getPort() + "/" + db.getDbName());
                    return ResponseEntity.ok(creds);
                })
                .orElse(ResponseEntity.notFound().build());
    }

// ── Endpoint DELETE BDD ───────────────────────────────────────────────────

    @DeleteMapping("/{id}/database")
    @Operation(summary = "Supprimer le cluster de base de données")
    public ResponseEntity<Void> deleteDatabaseResource(
            @PathVariable Long id,
            @AuthenticationPrincipal Jwt jwt) {

        String keycloakId = jwt.getSubject();
        User caller = userService.findByKeycloakId(keycloakId);

        Deployment dep = deploymentService.findEntityById(id);
        if (!dep.getUser().getId().equals(caller.getId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        databaseProvisioningService.deleteDatabaseResource(id);
        return ResponseEntity.noContent().build();
    }
}