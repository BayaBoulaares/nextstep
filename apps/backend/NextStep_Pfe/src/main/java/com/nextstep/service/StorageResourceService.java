package com.nextstep.service;

import com.nextstep.dto.StorageResourceDTO;
import com.nextstep.entity.StorageResource;
import com.nextstep.repository.StorageResourceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
@RequiredArgsConstructor
public class StorageResourceService {

    private final StorageResourceRepository storageResourceRepository;

    @Transactional(readOnly = true)
    public Optional<StorageResourceDTO> getByDeploymentId(Long deploymentId) {
        return storageResourceRepository
                .findByDeploymentId(deploymentId)
                .map(this::toDTO);
    }

    private StorageResourceDTO toDTO(StorageResource sr) {
        StorageResourceDTO dto = new StorageResourceDTO();
        dto.setId(sr.getId());
        dto.setResourceName(sr.getResourceName());
        dto.setNamespace(sr.getNamespace());
        dto.setStorageType(sr.getStorageType());
        dto.setCapacity(sr.getCapacity());
        dto.setStatus(sr.getStatus());
        dto.setReadyAt(sr.getReadyAt());

        switch (sr.getStorageType()) {
            case OBJECT_STORAGE, STOCKAGE -> {
                dto.setS3Endpoint(sr.getS3Endpoint());
                dto.setBucketName(sr.getBucketName());
                dto.setAccessKeyId(sr.getAccessKeyId());
                dto.setSecretAccessKey(sr.getSecretAccessKey());
            }
            case BLOCK_STORAGE, FILE_STORAGE -> {
                dto.setPvcName(sr.getPvcName());
                dto.setAccessMode(sr.getAccessMode());
                dto.setMountExample(generateMountExample(sr));  // ← YAML généré
            }
        }
        return dto;
    }

    private String generateMountExample(StorageResource sr) {
        return """
            volumes:
              - name: storage
                persistentVolumeClaim:
                  claimName: %s
            volumeMounts:
              - name: storage
                mountPath: /mnt/data
            # namespace: %s
            # accessMode: %s
            # capacity: %s
            """.formatted(
                sr.getPvcName(),
                sr.getNamespace(),
                sr.getAccessMode(),
                sr.getCapacity()
        );
    }
}