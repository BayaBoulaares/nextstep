package com.nextstep.controller;

import com.nextstep.entity.User;
import com.nextstep.service.NginxUploadService;
import com.nextstep.service.UserService;
import io.fabric8.kubernetes.client.KubernetesClient;
import io.swagger.v3.oas.annotations.Operation;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

@RestController
@RequestMapping("/api/hosting/nginx/files")
@RequiredArgsConstructor
@Slf4j
public class NginxUploadController {

    private final NginxUploadService nginxUploadService;
    private final UserService        userService;

    @PostMapping(consumes = "multipart/form-data")
    @Operation(summary = "Uploader un fichier dans le site nginx")
    public ResponseEntity<?> upload(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "path", defaultValue = "/") String path) {

        String username = resolveUsername(jwt);
        String fileName = file.getOriginalFilename();

        log.info("[UPLOAD] user={} file={} path={} size={}",
                username, fileName, path, file.getSize());

        nginxUploadService.uploadFile(username, file, path);

        return ResponseEntity.ok(Map.of(
                "fileName", fileName,
                "path",     path,
                "size",     file.getSize(),
                "status",   "uploaded"
        ));
    }

    @GetMapping
    @Operation(summary = "Lister les fichiers du site")
    public ResponseEntity<?> listFiles(@AuthenticationPrincipal Jwt jwt) {
        String username = resolveUsername(jwt);
        return ResponseEntity.ok(nginxUploadService.listFiles(username));
    }

    @DeleteMapping("/{fileName}")
    @Operation(summary = "Supprimer un fichier")
    public ResponseEntity<Void> deleteFile(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable String fileName) {
        String username = resolveUsername(jwt);
        nginxUploadService.deleteFile(username, fileName);
        return ResponseEntity.noContent().build();
    }

    private String resolveUsername(Jwt jwt) {
        String email = jwt.getClaimAsString("email");
        return email.split("@")[0].toLowerCase()
                .replaceAll("[^a-z0-9-]", "-")
                .replaceAll("-+", "-").replaceAll("^-|-$", "");
    }
}