from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Optional
import httpx
import os
import asyncio
import logging
from datetime import datetime, timedelta
from collections import deque
from dotenv import load_dotenv

load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────────────────────
# App + CORS restreint (même pattern que yaml-generator et auto-healer)
# Avant : allow_origins=["*"] → ouvert à tous
# Après : restreint aux origines nextstep
# ─────────────────────────────────────────────────────────────────────────────
app = FastAPI(title="Carbon Awareness Scheduler — Nexstep")

ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["GET", "POST", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)

# ─────────────────────────────────────────────────────────────────────────────
# Config
# ─────────────────────────────────────────────────────────────────────────────
CARBON_API_KEY  = os.getenv("ELECTRICITY_MAPS_API_KEY", "")
CARBON_ZONE     = os.getenv("CARBON_ZONE", "TN")
GREEN_THRESHOLD = int(os.getenv("GREEN_THRESHOLD", "200"))
RED_THRESHOLD   = int(os.getenv("RED_THRESHOLD", "400"))

# ─────────────────────────────────────────────────────────────────────────────
# Auth Keycloak — même pattern que yaml-generator et auto-healer
# Avant : aucune authentification
# Après : token Bearer vérifié via introspection Keycloak
#         DEV_MODE=true désactive l'auth pour les tests locaux
# ─────────────────────────────────────────────────────────────────────────────
security = HTTPBearer(auto_error=False)

KEYCLOAK_URL           = os.getenv("KEYCLOAK_URL",
    "https://keycloak-nextstep-baya.apps.ocp4.nextstep-it.com")
KEYCLOAK_REALM         = os.getenv("KEYCLOAK_REALM", "mon-app")
KEYCLOAK_CLIENT_ID     = os.getenv("KEYCLOAK_CLIENT_ID", "springboot-client")
KEYCLOAK_CLIENT_SECRET = os.getenv("KEYCLOAK_CLIENT_SECRET", "")
INTROSPECT_URL = (
    f"{KEYCLOAK_URL}/realms/{KEYCLOAK_REALM}"
    f"/protocol/openid-connect/token/introspect"
)

async def verify_token(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    if os.getenv("DEV_MODE", "false").lower() == "true":
        logger.warning("DEV_MODE actif — auth désactivée")
        return {"sub": "dev-user", "preferred_username": "dev"}

    if not credentials:
        raise HTTPException(status_code=401, detail="Token Bearer requis")

    try:
        async with httpx.AsyncClient(verify=False) as http:
            resp = await http.post(
                INTROSPECT_URL,
                data={
                    "token": credentials.credentials,
                    "client_id": KEYCLOAK_CLIENT_ID,
                    "client_secret": KEYCLOAK_CLIENT_SECRET,
                },
                timeout=5,
            )
        data = resp.json()
        if not data.get("active", False):
            raise HTTPException(status_code=401, detail="Token invalide ou expiré")
        return data
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Erreur auth: {e}")

# ─────────────────────────────────────────────────────────────────────────────
# State in-memory
# ─────────────────────────────────────────────────────────────────────────────
carbon_history: deque = deque(maxlen=288)  # 24h à 5min d'intervalle
deferred_jobs: dict   = {}

# ─────────────────────────────────────────────────────────────────────────────
# Modèles Pydantic
# ─────────────────────────────────────────────────────────────────────────────
class CarbonReading(BaseModel):
    intensity: float
    zone:      str
    timestamp: str
    is_green:  bool
    level:     str   # GREEN / YELLOW / RED

class JobRequest(BaseModel):
    job_name:        str
    namespace:       str
    job_manifest:    dict
    max_delay_hours: int = 4
    priority:        str = "LOW"   # LOW / MEDIUM / HIGH

class JobStatus(BaseModel):
    job_name:          str
    namespace:         str
    status:            str    # DEFERRED / SCHEDULED / EXECUTED / SKIPPED
    reason:            str
    current_intensity: float
    scheduled_at:      Optional[str] = None
    created_at:        str

# ─────────────────────────────────────────────────────────────────────────────
# Fetch intensité carbone
# Si pas de clé API → mode simulation réaliste selon l'heure
# ─────────────────────────────────────────────────────────────────────────────
async def fetch_carbon_intensity() -> Optional[float]:
    if not CARBON_API_KEY:
        import random
        hour = datetime.utcnow().hour
        if 2 <= hour <= 6:
            return random.uniform(80, 150)    # Nuit → plus vert (éolien)
        elif 10 <= hour <= 16:
            return random.uniform(150, 280)   # Journée → modéré
        else:
            return random.uniform(200, 450)   # Soir/matin → élevé

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"https://api.electricitymap.org/v3/carbon-intensity/latest?zone={CARBON_ZONE}",
                headers={"auth-token": CARBON_API_KEY},
                timeout=10,
            )
            data = resp.json()
            return float(data.get("carbonIntensity", 0))
    except Exception as e:
        logger.error(f"Carbon API error: {e}")
        return None

def classify_intensity(intensity: float) -> tuple:
    if intensity <= GREEN_THRESHOLD:
        return True, "GREEN"
    elif intensity <= RED_THRESHOLD:
        return False, "YELLOW"
    else:
        return False, "RED"

# ─────────────────────────────────────────────────────────────────────────────
# Polling carbone toutes les 15 minutes
# ─────────────────────────────────────────────────────────────────────────────
async def poll_carbon():
    while True:
        intensity = await fetch_carbon_intensity()
        if intensity is not None:
            is_green, level = classify_intensity(intensity)
            reading = {
                "intensity": round(intensity, 1),
                "zone":      CARBON_ZONE,
                "timestamp": datetime.utcnow().isoformat(),
                "is_green":  is_green,
                "level":     level,
            }
            carbon_history.appendleft(reading)
            logger.info(f"🌍 Carbon: {intensity:.0f} g/kWh [{level}]")

            if is_green:
                await process_deferred_jobs(intensity)

        await asyncio.sleep(900)  # 15 min

# ─────────────────────────────────────────────────────────────────────────────
# Traitement des jobs différés quand l'énergie est verte
# ─────────────────────────────────────────────────────────────────────────────
async def process_deferred_jobs(current_intensity: float):
    from kubernetes import client as k8s_client, config
    try:
        try:
            config.load_incluster_config()
        except Exception:
            config.load_kube_config()
        batch_v1 = k8s_client.BatchV1Api()
    except Exception as e:
        logger.error(f"K8s config error: {e}")
        return

    now        = datetime.utcnow()
    to_execute = []

    for job_name, job_data in list(deferred_jobs.items()):
        created_at       = datetime.fromisoformat(job_data["created_at"])
        max_delay        = timedelta(hours=job_data["max_delay_hours"])
        deadline_exceeded = (now - created_at) > max_delay
        should_run        = current_intensity <= GREEN_THRESHOLD or deadline_exceeded

        if should_run:
            to_execute.append(job_name)

    for job_name in to_execute:
        job_data = deferred_jobs.pop(job_name, None)
        if not job_data:
            continue
        try:
            batch_v1.create_namespaced_job(
                namespace=job_data["namespace"],
                body=job_data["manifest"],
            )
            logger.info(f"✅ Job {job_name} lancé ({current_intensity:.0f} g/kWh)")
        except Exception as e:
            logger.error(f"❌ Erreur lancement job {job_name}: {e}")

# ─────────────────────────────────────────────────────────────────────────────
# Startup
# ─────────────────────────────────────────────────────────────────────────────
@app.on_event("startup")
async def startup():
    asyncio.create_task(poll_carbon())
    logger.info("🚀 Carbon Scheduler démarré")

# ─────────────────────────────────────────────────────────────────────────────
# Endpoints — tous protégés par verify_token
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/carbon/current", response_model=CarbonReading)
async def get_current_carbon(user_info: dict = Depends(verify_token)):
    if not carbon_history:
        intensity = await fetch_carbon_intensity() or 300.0
        is_green, level = classify_intensity(intensity)
        return CarbonReading(
            intensity=round(intensity, 1),
            zone=CARBON_ZONE,
            timestamp=datetime.utcnow().isoformat(),
            is_green=is_green,
            level=level,
        )
    return carbon_history[0]

@app.get("/carbon/history")
async def get_history(
    limit: int = 24,
    user_info: dict = Depends(verify_token),
):
    return list(carbon_history)[:limit]

@app.post("/jobs/submit", response_model=JobStatus)
async def submit_job(
    req: JobRequest,
    user_info: dict = Depends(verify_token),
):
    current           = carbon_history[0] if carbon_history else None
    current_intensity = current["intensity"] if current else 300.0
    is_green, _       = classify_intensity(current_intensity)

    if req.priority == "HIGH" or is_green:
        status = "SCHEDULED"
        reason = "Énergie verte disponible" if is_green else "Priorité haute"
    else:
        status = "DEFERRED"
        reason = (
            f"Intensité carbone élevée "
            f"({current_intensity:.0f} g/kWh, seuil: {GREEN_THRESHOLD})"
        )
        deferred_jobs[req.job_name] = {
            "job_name":        req.job_name,
            "namespace":       req.namespace,
            "manifest":        req.job_manifest,
            "max_delay_hours": req.max_delay_hours,
            "priority":        req.priority,
            "created_at":      datetime.utcnow().isoformat(),
            "status":          "DEFERRED",
        }

    return JobStatus(
        job_name=req.job_name,
        namespace=req.namespace,
        status=status,
        reason=reason,
        current_intensity=round(current_intensity, 1),
        scheduled_at=datetime.utcnow().isoformat() if status == "SCHEDULED" else None,
        created_at=datetime.utcnow().isoformat(),
    )

@app.get("/jobs/deferred")
async def get_deferred_jobs(user_info: dict = Depends(verify_token)):
    return list(deferred_jobs.values())

@app.delete("/jobs/deferred/{job_name}")
async def cancel_job(
    job_name: str,
    user_info: dict = Depends(verify_token),
):
    if job_name not in deferred_jobs:
        raise HTTPException(status_code=404, detail=f"Job '{job_name}' introuvable")
    deferred_jobs.pop(job_name)
    return {"message": f"Job '{job_name}' annulé", "cancelled_by": user_info.get("preferred_username")}

@app.get("/jobs/stats")
async def get_job_stats(user_info: dict = Depends(verify_token)):
    history_list = list(carbon_history)
    if not history_list:
        return {
            "deferred_jobs_count":  len(deferred_jobs),
            "average_intensity_24h": None,
            "green_hours_today":     0,
            "zone":                  CARBON_ZONE,
            "thresholds":            {"green": GREEN_THRESHOLD, "red": RED_THRESHOLD},
        }

    avg_intensity = sum(r["intensity"] for r in history_list) / len(history_list)
    green_hours   = sum(1 for r in history_list if r["is_green"]) * 0.25

    return {
        "deferred_jobs_count":   len(deferred_jobs),
        "average_intensity_24h": round(avg_intensity, 1),
        "green_hours_today":     round(green_hours, 1),
        "zone":                  CARBON_ZONE,
        "thresholds":            {"green": GREEN_THRESHOLD, "red": RED_THRESHOLD},
    }

@app.get("/health")
async def health():
    current = carbon_history[0] if carbon_history else None
    return {
        "status":          "ok",
        "service":         "carbon-scheduler",
        "zone":            CARBON_ZONE,
        "current_level":   current["level"] if current else "UNKNOWN",
        "deferred_jobs":   len(deferred_jobs),
        "history_points":  len(carbon_history),
        "dev_mode":        os.getenv("DEV_MODE", "false"),
    }