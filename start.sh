#!/bin/bash

echo "🚀 Démarrage de l'application Franceinfo User Needs Analysis"
echo ""

# Vérifier que Python 3 est installé
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 n'est pas installé"
    echo "Installez-le avec : brew install python3"
    exit 1
fi

# Vérifier que le fichier server.py existe
if [ ! -f "server.py" ]; then
    echo "❌ Fichier server.py introuvable"
    echo "Assurez-vous d'être dans le bon répertoire"
    exit 1
fi

# Vérifier si le port 8000 est déjà utilisé
if lsof -Pi :8000 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo "⚠️ Le port 8000 est déjà utilisé"
    echo "Voulez-vous tuer le processus existant ? (o/n)"
    read -r response
    if [[ "$response" =~ ^([oO][uU][iI]|[oO])$ ]]; then
        PID=$(lsof -t -i:8000)
        kill -9 $PID 2>/dev/null
        echo "✅ Processus $PID arrêté"
        sleep 1
    else
        echo "Annulation du démarrage"
        exit 1
    fi
fi

# Démarrer le serveur
echo "✅ Démarrage du serveur sur http://localhost:8000"
echo ""
echo "📝 Pour arrêter le serveur, appuyez sur Ctrl+C"
echo ""
echo "🌐 Ouvrez votre navigateur sur : http://localhost:8000"
echo ""

python3 server.py
