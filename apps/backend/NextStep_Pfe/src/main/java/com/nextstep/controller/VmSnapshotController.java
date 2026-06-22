package com.nextstep.controller;


import com.nextstep.service.NamespaceService;
import com.nextstep.service.VmSnapshotService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/vms/{vmName}/snapshots")
@RequiredArgsConstructor
public class VmSnapshotController {

    private final VmSnapshotService snapshotService;
    private final NamespaceService  namespaceService;

    @PostMapping
    public ResponseEntity<Map<String, Object>> create(
            @PathVariable String vmName,
            @RequestParam(required = false) String snapshotName,
            @AuthenticationPrincipal Jwt jwt) {
        String namespace = resolveNamespace(jwt);
        return ResponseEntity.ok(
                snapshotService.createSnapshot(vmName, snapshotName, namespace));
    }

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> list(
            @PathVariable String vmName,
            @AuthenticationPrincipal Jwt jwt) {
        String namespace = resolveNamespace(jwt);
        return ResponseEntity.ok(snapshotService.listSnapshots(vmName, namespace));
    }

    @DeleteMapping("/{snapshotName}")
    public ResponseEntity<Void> delete(
            @PathVariable String vmName,
            @PathVariable String snapshotName,
            @AuthenticationPrincipal Jwt jwt) {
        String namespace = resolveNamespace(jwt);
        snapshotService.deleteSnapshot(snapshotName, namespace);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{snapshotName}/restore")
    public ResponseEntity<Map<String, Object>> restore(
            @PathVariable String vmName,
            @PathVariable String snapshotName,
            @AuthenticationPrincipal Jwt jwt) {
        String namespace = resolveNamespace(jwt);
        return ResponseEntity.ok(
                snapshotService.restoreSnapshot(vmName, snapshotName, namespace));
    }

    private String resolveNamespace(Jwt jwt) {
        String email    = jwt.getClaimAsString("email");
        String username = email.split("@")[0].replace(".", "-");
        return namespaceService.getNamespaceForUser(username);
    }
}