package com.nextstep.service;

import io.fabric8.kubernetes.client.KubernetesClient;
import io.fabric8.kubernetes.client.dsl.base.ResourceDefinitionContext;
import io.fabric8.kubernetes.api.model.GenericKubernetesResource;
import io.fabric8.kubernetes.api.model.GenericKubernetesResourceBuilder;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class VmSnapshotService {

    private final KubernetesClient k8sClient;

    // ── CRD contexts ──────────────────────────────────────────────────────

    private static final ResourceDefinitionContext SNAPSHOT_CTX =
            new ResourceDefinitionContext.Builder()
                    .withGroup("snapshot.kubevirt.io")
                    .withVersion("v1beta1")
                    .withPlural("virtualmachinesnapshots")
                    .withNamespaced(true)
                    .build();

    private static final ResourceDefinitionContext RESTORE_CTX =
            new ResourceDefinitionContext.Builder()
                    .withGroup("snapshot.kubevirt.io")
                    .withVersion("v1beta1")
                    .withPlural("virtualmachinerestores")
                    .withNamespaced(true)
                    .build();

    // ── Create snapshot ───────────────────────────────────────────────────

    public Map<String, Object> createSnapshot(String vmName,
                                              String snapshotName,
                                              String namespace) {
        String name = snapshotName != null && !snapshotName.isBlank()
                ? snapshotName
                : vmName + "-snap-" + Instant.now().getEpochSecond();

        String yaml = """
            apiVersion: snapshot.kubevirt.io/v1beta1
            kind: VirtualMachineSnapshot
            metadata:
              name: %s
              namespace: %s
              labels:
                portal/vm: %s
                portal/managed: "true"
            spec:
              source:
                apiGroup: kubevirt.io
                kind: VirtualMachine
                name: %s
            """.formatted(name, namespace, vmName, vmName);

        k8sClient.genericKubernetesResources(SNAPSHOT_CTX)
                .inNamespace(namespace)
                .load(new java.io.ByteArrayInputStream(yaml.getBytes()))
                .create();

        log.info("[SNAPSHOT] Créé {} pour VM {} dans {}", name, vmName, namespace);
        return Map.of("snapshotName", name, "vmName", vmName, "namespace", namespace);
    }

    // ── List snapshots d'une VM ───────────────────────────────────────────

    public List<Map<String, Object>> listSnapshots(String vmName, String namespace) {
        return k8sClient
                .genericKubernetesResources(SNAPSHOT_CTX)
                .inNamespace(namespace)
                .withLabel("portal/vm", vmName)
                .list()
                .getItems()
                .stream()
                .map(this::toSnapshotInfo)
                .collect(Collectors.toList());
    }

    // ── Delete snapshot ───────────────────────────────────────────────────

    public void deleteSnapshot(String snapshotName, String namespace) {
        k8sClient.genericKubernetesResources(SNAPSHOT_CTX)
                .inNamespace(namespace)
                .withName(snapshotName)
                .delete();
        log.info("[SNAPSHOT] Supprimé {} dans {}", snapshotName, namespace);
    }

    // ── Restore snapshot ──────────────────────────────────────────────────

    public Map<String, Object> restoreSnapshot(String vmName,
                                               String snapshotName,
                                               String namespace) {

        // ✅ Nettoyer tout restore non complété pour cette VM avant d'en créer un nouveau
        try {
            k8sClient.genericKubernetesResources(RESTORE_CTX)
                    .inNamespace(namespace)
                    .list()
                    .getItems()
                    .stream()
                    .filter(r -> {
                        Map<String, Object> spec = (Map<String, Object>)
                                r.getAdditionalProperties().getOrDefault("spec", Map.of());
                        Map<String, Object> target = (Map<String, Object>)
                                spec.getOrDefault("target", Map.of());
                        Map<String, Object> status = (Map<String, Object>)
                                r.getAdditionalProperties().getOrDefault("status", Map.of());
                        String targetName = (String) target.getOrDefault("name", "");
                        Boolean complete  = (Boolean) status.getOrDefault("complete", false);
                        return vmName.equals(targetName) && !Boolean.TRUE.equals(complete);
                    })
                    .forEach(r -> {
                        log.warn("[RESTORE] Suppression restore bloqué : {}", r.getMetadata().getName());
                        k8sClient.genericKubernetesResources(RESTORE_CTX)
                                .inNamespace(namespace)
                                .withName(r.getMetadata().getName())
                                .delete();
                    });

            // Petite pause pour laisser l'admission webhook se mettre à jour
            Thread.sleep(1500);

        } catch (InterruptedException ie) {
            Thread.currentThread().interrupt();
        } catch (Exception e) {
            log.warn("[RESTORE] Erreur nettoyage restores bloqués : {}", e.getMessage());
        }

        // Créer le nouveau restore
        String restoreName = vmName + "-restore-" + Instant.now().getEpochSecond();

        String yaml = """
        apiVersion: snapshot.kubevirt.io/v1beta1
        kind: VirtualMachineRestore
        metadata:
          name: %s
          namespace: %s
        spec:
          target:
            apiGroup: kubevirt.io
            kind: VirtualMachine
            name: %s
          virtualMachineSnapshotName: %s
        """.formatted(restoreName, namespace, vmName, snapshotName);

        k8sClient.genericKubernetesResources(RESTORE_CTX)
                .inNamespace(namespace)
                .load(new java.io.ByteArrayInputStream(yaml.getBytes()))
                .create();

        log.info("[SNAPSHOT] Restore {} → VM {} depuis {}", restoreName, vmName, snapshotName);
        return Map.of("restoreName", restoreName, "vmName", vmName,
                "snapshotName", snapshotName, "namespace", namespace);
    }

    // ── Helper ────────────────────────────────────────────────────────────

    @SuppressWarnings("unchecked")
    private Map<String, Object> toSnapshotInfo(GenericKubernetesResource snap) {
        Map<String, Object> status = (Map<String, Object>) snap
                .getAdditionalProperties().getOrDefault("status", Map.of());
        return Map.of(
                "name",       snap.getMetadata().getName(),
                "vmName",     snap.getMetadata().getLabels() != null
                        ? snap.getMetadata().getLabels().getOrDefault("portal/vm", "")
                        : "",
                "createdAt",  snap.getMetadata().getCreationTimestamp(),
                "readyToUse", status.getOrDefault("readyToUse", false),
                "phase",      status.getOrDefault("phase", "Unknown")
        );
    }
}