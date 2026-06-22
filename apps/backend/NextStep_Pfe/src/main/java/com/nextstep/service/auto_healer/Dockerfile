#Définit l'image de base, La variante slim est une version allégée de l'image officielle contenant uniquement l'essentiel pour faire tourner Python
FROM python:3.11-slim
#Crée (si elle n'existe pas) et définit /app comme répertoire de travail courant à l'intérieur du conteneur. Toutes les instructions suivantes (COPY, RUN, CMD...) s'exécutent à partir de ce répertoire, comme si tu avais fait cd /app.
WORKDIR /app
#Copie le fichier requirements.txt depuis ton système (le contexte de build, généralement le dossier où se trouve le Dockerfile) vers le répertoire courant dans le conteneur (/app, à cause du WORKDIR précédent). Le . signifie "dans le répertoire de travail actuel".
COPY requirements.txt .
#Installe toutes les dépendances Python listées dans requirements.txt. L'option --no-cache-dir empêche pip de garder en mémoire les fichiers téléchargés après l'installation, ce qui réduit la taille finale de l'image (sans cette option, pip garde un cache local qui ne sert à rien une fois les paquets installés).
#Le fait de copier uniquement requirements.txt avant cette ligne (et pas encore main.py) est volontaire : Docker met en cache cette couche. Si seul main.py change plus tard et pas les dépendances, Docker n'aura pas besoin de tout réinstaller au prochain build.
RUN pip install --no-cache-dir -r requirements.txt
#Copie le fichier main.py (le code de l'application) vers /app. Cette copie est faite après l'installation des dépendances pour profiter du cache mentionné ci-dessus, le code source change beaucoup plus souvent que les dépendances.
COPY main.py .
#Documente que l'application écoute sur le port 8002 à l'intérieur du conteneur. Cette instruction est purement informative, elle ne publie pas réellement le port (il faudra utiliser -p 8002:8002 au moment du docker run, ou la configuration équivalente côté OpenShift/Kubernetes).
EXPOSE 8002
#Définit la commande exécutée au démarrage du conteneur. Elle lance uvicorn (un serveur ASGI, typiquement utilisé pour FastAPI) en pointant vers l'objet app défini dans le fichier main.py (main:app signifie module main, variable app). --host 0.0.0.0 est essentiel dans un conteneur : ça permet au serveur d'accepter les connexions venant de l'extérieur du conteneur, pas seulement de localhost (qui serait inaccessible depuis l'extérieur). Le format en liste (["uvicorn", "main:app", ...], appelé exec form) est préférable au format shell (CMD uvicorn main:app ...) car il évite de lancer un shell intermédiaire et gère mieux les signaux d'arrêt (SIGTERM), ce qui est important pour un arrêt propre du conteneur sous Kubernetes/OpenShift.
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8002"]