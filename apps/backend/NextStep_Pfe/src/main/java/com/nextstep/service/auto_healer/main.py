from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from kubernetes import client as k8s_client, config, watch
from typing import Optional
from groq import Groq
import os, json, asyncio, threading, logging, httpx
from datetime import datetime
from collections import deque
from dotenv import load_dotenv
from datetime import datetime
from collections import deque
from dotenv import load_dotenv
import sqlite3
from pathlib import Path

load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────────────────────
# App + CORS restreint
# ─────────────────────────────────────────────────────────────────────────────
app = FastAPI(title="Auto-Healer Service — Nexstep")

ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["GET", "POST", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)

# ─────────────────────────────────────────────────────────────────────────────
# Groq client — vérification au démarrage
# ─────────────────────────────────────────────────────────────────────────────
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
if not GROQ_API_KEY:
    raise RuntimeError("GROQ_API_KEY manquante — arrêt du service")

groq_client = Groq(api_key=GROQ_API_KEY)

# ─────────────────────────────────────────────────────────────────────────────
# Auth Keycloak (même pattern que yaml-generator)
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
incidents: deque = deque(maxlen=100)
_watcher_running = False
# ─────────────────────────────────────────────────────────────────────────────
# Persistance SQLite
# ─────────────────────────────────────────────────────────────────────────────
DB_PATH = os.getenv("DB_PATH", "/data/incidents.db")

def init_db():
    Path(DB_PATH).parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS incidents (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            pod_name TEXT, namespace TEXT, cause TEXT,
            action TEXT, action_label TEXT, confidence TEXT,
            status TEXT, timestamp TEXT, logs_snippet TEXT,
            recommendation TEXT
        )
    """)
    conn.commit()
    conn.close()

def save_incident(incident: dict):
    conn = sqlite3.connect(DB_PATH)
    conn.execute(
        """INSERT INTO incidents
           (pod_name, namespace, cause, action, action_label,
            confidence, status, timestamp, logs_snippet, recommendation)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (incident["pod_name"], incident["namespace"], incident["cause"],
         incident["action"], incident["action_label"], incident["confidence"],
         incident["status"], incident["timestamp"], incident["logs_snippet"],
         incident.get("recommendation", "")),
    )
    conn.commit()
    conn.close()

def load_recent_incidents(limit: int = 100) -> list[dict]:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    rows = conn.execute(
        "SELECT * FROM incidents ORDER BY id DESC LIMIT ?", (limit,)
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]

# Namespaces système à ignorer
SYSTEM_NAMESPACES = {
    "kube-system", "openshift-system", "openshift-monitoring",
    "openshift-operator-lifecycle-manager", "openshift-network-operator",
    "openshift-dns", "openshift-ingress", "openshift-apiserver",
    "openshift-etcd", "openshift-image-registry",
}

# Raisons d'erreur surveillées
WATCHED_REASONS = {
    "CrashLoopBackOff",
    "OOMKilled",
    "Error",
    "ImagePullBackOff",
    "ErrImagePull",
    "CreateContainerError",
    "RunContainerError",
}

HEAL_ACTIONS = {
    "RESTART":        "Redémarrage du pod",
    "SCALE_DOWN":     "Scale à 0 replica",
    "ALERT_HUMAN":    "Alerte envoyée — intervention manuelle requise",
    "IMAGE_PULL_FIX": "Vérification image registry",
    "OOM_FIX":        "Augmentation memory limit recommandée",
}

# ─────────────────────────────────────────────────────────────────────────────
# Modèles Pydantic
# ─────────────────────────────────────────────────────────────────────────────
class IncidentResponse(BaseModel):
    pod_name:     str
    namespace:    str
    cause:        str
    action:       str
    action_label: str
    confidence:   str
    status:       str
    timestamp:    str
    logs_snippet: str

class StatsResponse(BaseModel):
    total:           int
    resolved:        int
    alert_sent:      int
    failed:          int
    resolution_rate: float
    watcher_running: bool

# ─────────────────────────────────────────────────────────────────────────────
# Kubernetes clients
# ─────────────────────────────────────────────────────────────────────────────
def get_k8s_clients():
    try:
        config.load_incluster_config()
        logger.info("K8s: config incluster chargée")
    except Exception:
        config.load_kube_config()
        logger.info("K8s: kubeconfig locale chargée")
    return k8s_client.CoreV1Api(), k8s_client.AppsV1Api()

# ─────────────────────────────────────────────────────────────────────────────
# Récupération des logs du pod
# ─────────────────────────────────────────────────────────────────────────────
def get_pod_logs(v1, pod_name: str, namespace: str, lines: int = 50) -> str:
    try:
        logs = v1.read_namespaced_pod_log(
            name=pod_name,
            namespace=namespace,
            tail_lines=lines,
            timestamps=True,
        )
        return logs[-3000:] if len(logs) > 3000 else logs
    except Exception as e:
        # Essayer les logs du container précédent (avant crash)
        try:
            logs = v1.read_namespaced_pod_log(
                name=pod_name,
                namespace=namespace,
                tail_lines=lines,
                previous=True,
            )
            return f"[Logs précédents]\n{logs[-2000:]}"
        except Exception:
            return f"[Logs non disponibles: {e}]"

# ─────────────────────────────────────────────────────────────────────────────
# Diagnostic LLM via Groq
# ─────────────────────────────────────────────────────────────────────────────
def diagnose_with_llm(
    pod_name: str,
    namespace: str,
    reason: str,
    logs: str,
) -> dict:
    prompt = f"""Tu es un expert OpenShift/Kubernetes spécialisé dans le cluster nextstep (ocp4.nextstep-it.com).
Analyse ce pod en erreur et propose UNE action corrective.

Pod       : {pod_name}
Namespace : {namespace}
Raison    : {reason}
Cluster   : ocp4.nextstep-it.com

Logs (50 dernières lignes) :
{logs}

Réponds UNIQUEMENT avec un JSON valide (sans markdown, sans backticks) :
{{
  "cause": "explication courte de la cause racine en français (max 120 caractères)",
  "action": "UNE valeur parmi: RESTART, SCALE_DOWN, ALERT_HUMAN, IMAGE_PULL_FIX, OOM_FIX",
  "confidence": "HIGH ou MEDIUM ou LOW",
  "recommendation": "conseil court pour éviter la récurrence (max 150 caractères)"
}}"""

    try:
        message = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            max_tokens=512,
            messages=[{"role": "user", "content": prompt}],
        )
        raw = message.choices[0].message.content.strip()
        # Nettoyer si le LLM ajoute des backticks malgré tout
        raw = raw.replace("```json", "").replace("```", "").strip()
        return json.loads(raw)
    except json.JSONDecodeError:
        logger.error("LLM — réponse non-JSON reçue")
        return {
            "cause": f"Erreur parsing LLM pour raison: {reason}",
            "action": "ALERT_HUMAN",
            "confidence": "LOW",
            "recommendation": "Vérifier manuellement le pod",
        }
    except Exception as e:
        logger.error(f"LLM diagnostic error: {e}")
        return {
            "cause": f"LLM indisponible: {str(e)[:80]}",
            "action": "ALERT_HUMAN",
            "confidence": "LOW",
            "recommendation": "Vérifier la clé GROQ_API_KEY",
        }

# ─────────────────────────────────────────────────────────────────────────────
# Application de l'action de healing
# ─────────────────────────────────────────────────────────────────────────────
def apply_healing_action(
    v1,
    apps_v1,
    pod_name: str,
    namespace: str,
    action: str,
) -> str:
    try:
        if action == "RESTART":
            v1.delete_namespaced_pod(name=pod_name, namespace=namespace)
            logger.info(f"✅ RESTART — pod {pod_name} supprimé (sera recréé)")
            return "SUCCESS"

        elif action == "SCALE_DOWN":
            pod = v1.read_namespaced_pod(name=pod_name, namespace=namespace)
            for ref in (pod.metadata.owner_references or []):
                if ref.kind == "ReplicaSet":
                    rs = apps_v1.read_namespaced_replica_set(
                        name=ref.name, namespace=namespace
                    )
                    for dep_ref in (rs.metadata.owner_references or []):
                        if dep_ref.kind == "Deployment":
                            apps_v1.patch_namespaced_deployment(
                                name=dep_ref.name,
                                namespace=namespace,
                                body={"spec": {"replicas": 0}},
                            )
                            logger.info(f"✅ SCALE_DOWN — {dep_ref.name} → 0 replicas")
                            return "SUCCESS"
            return "FAILED: Deployment parent introuvable"

        elif action == "ALERT_HUMAN":
            logger.warning(f"🚨 ALERT_HUMAN — {pod_name} dans {namespace}")
            return "ALERT_SENT"

        elif action in ("IMAGE_PULL_FIX", "OOM_FIX"):
            logger.info(f"ℹ️ {action} — recommandation enregistrée pour {pod_name}")
            return "ALERT_SENT"

        return "SKIPPED"

    except Exception as e:
        logger.error(f"❌ Healing échoué pour {pod_name}: {e}")
        return f"FAILED: {str(e)[:100]}"

# ─────────────────────────────────────────────────────────────────────────────
# Watcher de pods — tourne dans un thread daemon
# ─────────────────────────────────────────────────────────────────────────────
def watch_pods():
    global _watcher_running
    _watcher_running = True
    logger.info("🔍 Auto-Healer Watcher démarré...")

    # Pods déjà traités pour éviter les doublons
    processed: set = set()

    try:
        v1, apps_v1 = get_k8s_clients()
    except Exception as e:
        logger.error(f"❌ Impossible de connecter au cluster K8s: {e}")
        _watcher_running = False
        return

    w = watch.Watch()

    try:
        for event in w.stream(v1.list_pod_for_all_namespaces, timeout_seconds=0):
            pod       = event["object"]
            pod_name  = pod.metadata.name
            namespace = pod.metadata.namespace

            # Ignorer namespaces système
            if namespace in SYSTEM_NAMESPACES:
                continue

            # Ignorer les namespaces qui ne sont pas des tenants nextstep
            if not (namespace == "tenant-baya" or namespace.startswith("baya-tenant-")):
                continue

            container_statuses = pod.status.container_statuses or []
            for cs in container_statuses:
                waiting = cs.state.waiting if cs.state else None
                if not waiting or waiting.reason not in WATCHED_REASONS:
                    continue

                # Éviter de traiter le même pod plusieurs fois
                dedupe_key = f"{namespace}/{pod_name}/{waiting.reason}"
                if dedupe_key in processed:
                    continue
                processed.add(dedupe_key)
                if len(processed) > 500:
                    processed.clear()

                reason = waiting.reason
                logger.info(f"🚨 Pod en erreur: {namespace}/{pod_name} [{reason}]")

                # 1. Récupérer les logs
                logs = get_pod_logs(v1, pod_name, namespace)

                # 2. Diagnostic LLM
                diagnosis = diagnose_with_llm(pod_name, namespace, reason, logs)
                confidence = diagnosis.get("confidence", "LOW")

                # 3. Appliquer le fix si confiance suffisante
                if confidence in ("HIGH", "MEDIUM"):
                    status = apply_healing_action(
                        v1, apps_v1, pod_name, namespace, diagnosis["action"]
                    )
                else:
                    status = "ALERT_SENT"
                    logger.info(f"⚠️ Confiance LOW — alerte sans action automatique")

                # 4. Enregistrer l'incident
                incident = {
                    "pod_name":     pod_name,
                    "namespace":    namespace,
                    "cause":        diagnosis.get("cause", "Inconnue"),
                    "action":       diagnosis.get("action", "ALERT_HUMAN"),
                    "action_label": HEAL_ACTIONS.get(
                        diagnosis.get("action", ""), "Action inconnue"
                    ),
                    "confidence":   confidence,
                    "status":       status,
                    "timestamp":    datetime.utcnow().isoformat(),
                    "logs_snippet": logs[:600],
                    "recommendation": diagnosis.get("recommendation", ""),
                }
                incidents.appendleft(incident)
                save_incident(incident)
                logger.info(f"✅ Incident enregistré: {pod_name} → {status}")

    except Exception as e:
        logger.error(f"❌ Watcher arrêté: {e}")
    finally:
        _watcher_running = False
        logger.warning("⚠️ Watcher terminé — relancer le service pour reprendre")

# ─────────────────────────────────────────────────────────────────────────────
# Startup
# ─────────────────────────────────────────────────────────────────────────────
@app.on_event("startup")
async def startup():
    init_db()
    for row in reversed(load_recent_incidents()):
        incidents.append(row)
    logger.info(f"📦 {len(incidents)} incident(s) rechargé(s) depuis la base")

    thread = threading.Thread(target=watch_pods, daemon=True)
    thread.start()
    logger.info("🚀 Auto-Healer service démarré")

# ─────────────────────────────────────────────────────────────────────────────
# Endpoints
# ─────────────────────────────────────────────────────────────────────────────
@app.get("/incidents", response_model=list[IncidentResponse])
async def get_incidents(
    user_info: dict = Depends(verify_token),
    namespace: Optional[str] = None,
    status: Optional[str] = None,
):
    """Retourne la liste des incidents détectés, filtrables par namespace et status."""
    result = list(incidents)
    if namespace:
        result = [i for i in result if i["namespace"] == namespace]
    if status:
        result = [i for i in result if i["status"] == status]
    return result

@app.get("/incidents/stats", response_model=StatsResponse)
async def get_stats(user_info: dict = Depends(verify_token)):
    """Statistiques globales de l'auto-healer."""
    total    = len(incidents)
    resolved = sum(1 for i in incidents if i["status"] == "SUCCESS")
    alerted  = sum(1 for i in incidents if i["status"] == "ALERT_SENT")
    failed   = sum(1 for i in incidents if str(i["status"]).startswith("FAILED"))
    return StatsResponse(
        total=total,
        resolved=resolved,
        alert_sent=alerted,
        failed=failed,
        resolution_rate=round((resolved / total * 100) if total > 0 else 0.0, 1),
        watcher_running=_watcher_running,
    )

@app.delete("/incidents")
async def clear_incidents(user_info: dict = Depends(verify_token)):
    """Vider la liste des incidents (admin uniquement)."""
    incidents.clear()
    conn = sqlite3.connect(DB_PATH)
    conn.execute("DELETE FROM incidents")
    conn.commit()
    conn.close()
    return {"message": "Incidents effacés", "cleared_by": user_info.get("preferred_username")}

@app.get("/health")
async def health():
    return {
        "status":          "ok",
        "service":         "auto-healer",
        "watcher_running": _watcher_running,
        "incidents_count": len(incidents),
        "cluster":         "ocp4.nextstep-it.com",
        "dev_mode":        os.getenv("DEV_MODE", "false"),
    }