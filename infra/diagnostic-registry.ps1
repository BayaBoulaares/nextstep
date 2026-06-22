# diagnostic-registry.ps1 — version corrigee
$NS = "baya-tenant-d6c84b74"
$SA = "registry-sa-mon-registry"

Write-Host ""
Write-Host "=== 1. Namespace ===" -ForegroundColor Cyan
oc get namespace $NS

Write-Host ""
Write-Host "=== 2. ServiceAccount ===" -ForegroundColor Cyan
oc get sa $SA -n $NS 2>&1

Write-Host ""
Write-Host "=== 3. Secrets du namespace ===" -ForegroundColor Cyan
oc get secrets -n $NS

Write-Host ""
Write-Host "=== 4. Test TokenRequest API (OCP 4.11+) ===" -ForegroundColor Cyan
oc create token $SA -n $NS --duration=3600s 2>&1

Write-Host ""
Write-Host "=== 5. Test get-token (ancienne methode) ===" -ForegroundColor Cyan
oc serviceaccounts get-token $SA -n $NS 2>&1

Write-Host ""
Write-Host "=== 6. RoleBindings ===" -ForegroundColor Cyan
oc get rolebindings -n $NS 2>&1

Write-Host ""
Write-Host "=== 7. Route externe registry ===" -ForegroundColor Cyan
oc get route default-route -n openshift-image-registry -o jsonpath="{.spec.host}" 2>&1

Write-Host ""
Write-Host "=== 8. SA du pod Spring Boot ===" -ForegroundColor Cyan
oc get sa -n tenant-baya

Write-Host ""
Write-Host "=== 9. Droits SA Spring Boot sur le namespace tenant ===" -ForegroundColor Cyan
oc auth can-i create rolebindings --as=system:serviceaccount:tenant-baya:default -n $NS 2>&1
oc auth can-i create secrets --as=system:serviceaccount:tenant-baya:default -n $NS 2>&1
oc auth can-i create serviceaccounts --as=system:serviceaccount:tenant-baya:default -n $NS 2>&1

Write-Host ""
Write-Host "=== 10. Version OpenShift ===" -ForegroundColor Cyan
oc version 2>&1