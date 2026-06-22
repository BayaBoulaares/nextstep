# ── Imports ───────────────────────────────────────────────
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from enum import Enum
from groq import Groq
import os
from dotenv import load_dotenv

load_dotenv()  # Charge les variables du fichier .env

# ── Initialisation de l'application ───────────────────────
app = FastAPI(title="YAML Generator Service")

# CORS : permet au frontend Next.js d'appeler ce service
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Client LLM (Groq, gratuit) ─────────────────────────────
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

# ── Types de sortie possibles ──────────────────────────────
class OutputType(str, Enum):
    YAML_OPENSHIFT = "yaml_openshift"
    TERRAFORM      = "terraform"
    HELM           = "helm"

# ── Modèles de données (ce que l'API reçoit et renvoie) ───
class GenerateRequest(BaseModel):
    description: str          # ex: "un pod nginx avec 3 replicas"
    output_type: OutputType = OutputType.YAML_OPENSHIFT
    namespace: str = "default"

class GenerateResponse(BaseModel):
    content: str       # le manifeste généré
    output_type: str   # yaml_openshift / terraform / helm
    explanation: str   # explication en français

# ── Prompts système selon le type de sortie ───────────────
SYSTEM_PROMPTS = {
    OutputType.YAML_OPENSHIFT: """Tu es un expert OpenShift et Kubernetes.
L'utilisateur décrit une ressource en langage naturel.
Génère UNIQUEMENT le manifeste YAML OpenShift valide, complet et prêt à appliquer.
Inclus toujours : apiVersion, kind, metadata (name, namespace, labels), spec.
Après le YAML, ajoute une ligne '---EXPLANATION---' puis une explication courte en français.""",

    OutputType.TERRAFORM: """Tu es un expert Terraform et OpenShift.
Génère UNIQUEMENT du code Terraform HCL valide pour OpenShift/Kubernetes.
Inclus le provider, les variables, les ressources et les outputs.
Après le code, ajoute '---EXPLANATION---' puis une explication courte en français.""",

    OutputType.HELM: """Tu es un expert Helm Charts pour OpenShift.
Génère une structure Helm Chart complète : Chart.yaml, values.yaml, templates.
Sépare chaque fichier avec '---FILE: nom_fichier---'.
Après tout le contenu, ajoute '---EXPLANATION---' puis une explication en français."""
}

# ── Endpoint principal ─────────────────────────────────────
@app.post("/generate", response_model=GenerateResponse)
async def generate_manifest(req: GenerateRequest):
    try:
        prompt = f"""Namespace cible : {req.namespace}

Description :
{req.description}"""

        message = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            max_tokens=2048,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPTS[req.output_type]},
                {"role": "user", "content": prompt}
            ]
        )

        full_response = message.choices[0].message.content

        if "---EXPLANATION---" in full_response:
            parts       = full_response.split("---EXPLANATION---")
            content     = parts[0].strip()
            explanation = parts[1].strip()
        else:
            content     = full_response
            explanation = ""

        return GenerateResponse(
            content=content,
            output_type=req.output_type.value,
            explanation=explanation
        )

    except Exception as e:
        # ← Affiche l'erreur exacte dans le terminal
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

# ── Health check (utilisé par OpenShift pour vérifier que le service tourne) ──
@app.get("/health")
async def health():
    return {"status": "ok", "service": "yaml-generator"}

   # je dois verifier les namespaces ou se cree les fichiers géneres et vérifier le cors