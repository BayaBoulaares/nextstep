# ── Étape 1 : image de base Python légère ─────────────────
FROM python:3.11-slim

# ── Étape 2 : dossier de travail dans le container ────────
WORKDIR /app

# ── Étape 3 : copier et installer les dépendances ─────────
# On copie requirements.txt EN PREMIER (optimisation cache Docker)
# Si requirements.txt ne change pas → Docker réutilise le cache
# et ne réinstalle pas tout à chaque build
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# ── Étape 4 : copier le code source ───────────────────────
COPY main.py .

# ── Étape 5 : exposer le port du service ──────────────────
EXPOSE 8001

# ── Étape 6 : commande de démarrage ───────────────────────
# --host 0.0.0.0 = accessible depuis l'extérieur du container
# --port 8001    = port d'écoute
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]