# debug-metrics.ps1
# Exécuter avec port-forward actif pour trouver les vraies métriques disponibles

$TOKEN = (oc get secret nextstep-metrics-sa-token -n tenant-baya -o jsonpath='{.data.token}')
$TOKEN_DECODED = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String($TOKEN))
$BASE = "http://localhost:9091/api/v1"
$H = @{ Authorization = "Bearer $TOKEN_DECODED" }

Write-Host "=== 1. Métriques KubeVirt disponibles ===" -ForegroundColor Cyan
$r = Invoke-RestMethod "$BASE/label/__name__/values" -Headers $H
$kubevirt = $r.data | Where-Object { $_ -like "kubevirt*" }
Write-Host ($kubevirt -join "`n")

Write-Host "`n=== 2. Tester kubevirt_vmi_vcpu_seconds_total ===" -ForegroundColor Cyan
$r2 = Invoke-RestMethod "$BASE/query?query=kubevirt_vmi_vcpu_seconds_total" -Headers $H
Write-Host ($r2 | ConvertTo-Json -Depth 3)

Write-Host "`n=== 3. Tester kubevirt_vmi_cpu_usage_seconds_total ===" -ForegroundColor Cyan
$r3 = Invoke-RestMethod "$BASE/query?query=kubevirt_vmi_cpu_usage_seconds_total" -Headers $H
Write-Host ($r3 | ConvertTo-Json -Depth 3)

Write-Host "`n=== 4. Tester kubevirt_vmi_memory_resident_bytes ===" -ForegroundColor Cyan
$r4 = Invoke-RestMethod "$BASE/query?query=kubevirt_vmi_memory_resident_bytes" -Headers $H
Write-Host ($r4 | ConvertTo-Json -Depth 3)

Write-Host "`n=== 5. Namespace + labels disponibles ===" -ForegroundColor Cyan
$r5 = Invoke-RestMethod "$BASE/query?query=kubevirt_vmi_memory_resident_bytes" -Headers $H
$r5.data.result | ForEach-Object { Write-Host ($_.metric | ConvertTo-Json) }