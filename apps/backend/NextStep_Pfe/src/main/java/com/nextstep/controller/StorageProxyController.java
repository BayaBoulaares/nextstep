package com.nextstep.controller;

import com.nextstep.entity.StorageResource;
import com.nextstep.repository.StorageResourceRepository;
import com.nextstep.service.MinioEndpointResolver;
import io.fabric8.kubernetes.client.KubernetesClient;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.*;

import java.net.URI;
import java.util.List;
import java.util.Map;

@RestController
@Slf4j
@RequestMapping("/api/storage")
@RequiredArgsConstructor
public class StorageProxyController {

    private final KubernetesClient k8sClient;
    private final StorageResourceRepository storageResourceRepository;
    private final MinioEndpointResolver endpointResolver;  // ← injecté

    @PostMapping("/{deploymentId}/upload")
    public ResponseEntity<Map<String, Object>> upload(
            @PathVariable Long deploymentId,
            @RequestParam("file") MultipartFile file,
            @AuthenticationPrincipal Jwt jwt) throws Exception {

        StorageResource sr = storageResourceRepository
                .findByDeploymentId(deploymentId)
                .orElseThrow(() -> new EntityNotFoundException("Ressource introuvable"));
        checkIsObjectStorage(sr);  // ← ajouter

        S3Client s3 = buildS3Client(sr);
        String key = file.getOriginalFilename();
        s3.putObject(
                PutObjectRequest.builder()
                        .bucket(sr.getBucketName())
                        .key(key)
                        .contentType(file.getContentType())
                        .build(),
                RequestBody.fromBytes(file.getBytes())
        );

        return ResponseEntity.ok(Map.of(
                "key",    key,
                "bucket", sr.getBucketName(),
                "size",   file.getSize()
        ));
    }

    @GetMapping("/{deploymentId}/objects")
    public ResponseEntity<?> listObjects(
            @PathVariable Long deploymentId) {

        /*StorageResource sr = storageResourceRepository
                .findByDeploymentId(deploymentId)
                .orElseThrow(() -> new EntityNotFoundException("Ressource introuvable"));*/
        StorageResource sr = storageResourceRepository
                .findByDeploymentId(deploymentId)
                .orElseThrow(() -> new EntityNotFoundException("Ressource introuvable"));
        checkIsObjectStorage(sr);  // ← ajouter

        // ← AJOUTER : rejeter si pas Object Storage
        if (sr.getStorageType() != com.nextstep.entity.ServiceCategory.OBJECT_STORAGE
                && sr.getStorageType() != com.nextstep.entity.ServiceCategory.STOCKAGE) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "listObjects non disponible pour " + sr.getStorageType()));
        }

        // ← AJOUTER : vérifier que l'endpoint n'est pas null avant buildS3Client
        if (sr.getS3Endpoint() == null && sr.getAccessKeyId() == null) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "Pas de credentials S3 pour cette ressource"));
        }

        S3Client s3 = buildS3Client(sr);
        var response = s3.listObjectsV2(
                ListObjectsV2Request.builder()
                        .bucket(sr.getBucketName())
                        .build()
        );

        List<Map<String, Object>> objects = response.contents().stream()
                .map(o -> Map.<String, Object>of(
                        "key",          o.key(),
                        "size",         o.size(),
                        "lastModified", o.lastModified().toString()
                ))
                .toList();

        return ResponseEntity.ok(objects);
    }

    @GetMapping("/{deploymentId}/download/{key}")
    public ResponseEntity<byte[]> download(
            @PathVariable Long deploymentId,
            @PathVariable String key) throws java.io.IOException {

        StorageResource sr = storageResourceRepository
                .findByDeploymentId(deploymentId)
                .orElseThrow(() -> new EntityNotFoundException("Ressource introuvable"));
        checkIsObjectStorage(sr);  // ← ajouter

        S3Client s3 = buildS3Client(sr);
        try (var response = s3.getObject(
                GetObjectRequest.builder()
                        .bucket(sr.getBucketName())
                        .key(key)
                        .build())) {

            byte[] bytes = response.readAllBytes();
            return ResponseEntity.ok()
                    .header("Content-Disposition", "attachment; filename=\"" + key + "\"")
                    .header("Content-Type", "application/octet-stream")
                    .body(bytes);
        }
    }

    @DeleteMapping("/{deploymentId}/objects/{key}")
    public ResponseEntity<Void> deleteObject(
            @PathVariable Long deploymentId,
            @PathVariable String key) {

        StorageResource sr = storageResourceRepository
                .findByDeploymentId(deploymentId)
                .orElseThrow(() -> new EntityNotFoundException("Ressource introuvable"));
        checkIsObjectStorage(sr);  // ← ajouter

        S3Client s3 = buildS3Client(sr);
        s3.deleteObject(DeleteObjectRequest.builder()
                .bucket(sr.getBucketName())
                .key(key)
                .build());

        return ResponseEntity.noContent().build();
    }

    private S3Client buildS3Client(StorageResource sr) {
        String endpoint = endpointResolver.resolve(sr);  // ← utilise le resolver
        return S3Client.builder()
                .endpointOverride(URI.create(endpoint))
                .credentialsProvider(StaticCredentialsProvider.create(
                        AwsBasicCredentials.create(
                                sr.getAccessKeyId(),
                                sr.getSecretAccessKey()
                        )
                ))
                .region(software.amazon.awssdk.regions.Region.US_EAST_1)
                .forcePathStyle(true)
                .build();
    }
    private void checkIsObjectStorage(StorageResource sr) {
        if (sr.getStorageType() != com.nextstep.entity.ServiceCategory.OBJECT_STORAGE
                && sr.getStorageType() != com.nextstep.entity.ServiceCategory.STOCKAGE) {
            throw new IllegalArgumentException(
                    "Opération S3 non disponible pour " + sr.getStorageType());
        }
        if (sr.getS3Endpoint() == null) {
            throw new IllegalStateException("Endpoint S3 null pour deploymentId=" + sr.getDeployment().getId());
        }
    }
}