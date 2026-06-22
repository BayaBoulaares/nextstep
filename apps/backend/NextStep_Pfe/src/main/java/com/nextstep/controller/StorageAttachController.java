package com.nextstep.controller;

import com.nextstep.entity.StorageResource;
import com.nextstep.entity.ServiceCategory;
import com.nextstep.repository.StorageResourceRepository;
import com.nextstep.service.VmFabric8Service;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/storage")
@RequiredArgsConstructor
@Slf4j
public class StorageAttachController {

    private final StorageResourceRepository storageResourceRepository;
    private final VmFabric8Service vmFabric8Service;

    public record AttachRequest(String vmName) {}

    @PatchMapping("/{deploymentId}/attach")
    public ResponseEntity<?> attachToVm(
            @PathVariable Long deploymentId,
            @RequestBody AttachRequest request) {

        StorageResource sr = storageResourceRepository
                .findByDeploymentId(deploymentId)
                .orElseThrow(() -> new EntityNotFoundException("Ressource introuvable"));

        if (sr.getStorageType() != ServiceCategory.BLOCK_STORAGE
                && sr.getStorageType() != ServiceCategory.FILE_STORAGE) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "Attachement disponible uniquement pour Block/File Storage"));
        }

        String diskName = "extra-" + sr.getPvcName();

        vmFabric8Service.attachPvcToVm(
                request.vmName(),
                sr.getNamespace(),
                sr.getPvcName(),
                diskName
        );

        sr.setAttachedVmName(request.vmName());  // ← nouveau champ à ajouter à l'entité
        storageResourceRepository.save(sr);

        return ResponseEntity.ok(Map.of(
                "message", "Volume attaché. Redémarrez la VM pour appliquer.",
                "vmName", request.vmName(),
                "diskName", diskName
        ));
    }

    @PatchMapping("/{deploymentId}/detach")
    public ResponseEntity<?> detachFromVm(@PathVariable Long deploymentId) {
        StorageResource sr = storageResourceRepository
                .findByDeploymentId(deploymentId)
                .orElseThrow(() -> new EntityNotFoundException("Ressource introuvable"));

        if (sr.getAttachedVmName() == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Aucune VM attachée"));
        }

        String diskName = "extra-" + sr.getPvcName();
        vmFabric8Service.detachPvcFromVm(sr.getAttachedVmName(), sr.getNamespace(), diskName);

        sr.setAttachedVmName(null);
        storageResourceRepository.save(sr);

        return ResponseEntity.noContent().build();
    }
}