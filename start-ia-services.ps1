# start-ia-services.ps1
$ROOT = "C:\Users\bayab\Desktop\nexstep\apps\backend\NextStep_Pfe\src\main\java\com\nextstep\service"

Start-Process powershell -ArgumentList "-NoExit", "-Command",
    "cd '$ROOT\yaml_generator'; python -m uvicorn main:app --port 8001 --reload"

Start-Process powershell -ArgumentList "-NoExit", "-Command",
    "cd '$ROOT\auto_healer'; python -m uvicorn main:app --port 8002 --reload"

Write-Host "✅ Services démarrés" -ForegroundColor Green