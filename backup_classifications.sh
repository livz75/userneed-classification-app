#!/bin/bash
# Backup quotidien de la table human_classifications (Supabase)
# Stocke un fichier JSON par jour dans le dossier backups/

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKUP_DIR="$SCRIPT_DIR/backups"
DATE=$(date +%Y-%m-%d)
BACKUP_FILE="$BACKUP_DIR/human_classifications_$DATE.json"

SUPABASE_URL="https://vcuvsqapuwueqblpbiux.supabase.co"
SUPABASE_KEY="sb_publishable_Vmf3PpVVJFg4dEdAUFeeWg_UuJiXEmU"

mkdir -p "$BACKUP_DIR"

# Export human_classifications avec les infos article (titre, url) pour contexte
curl -s "${SUPABASE_URL}/rest/v1/human_classifications?select=id,article_id,userneed,classified_at,classified_by,articles(titre,url)" \
  -H "apikey: ${SUPABASE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_KEY}" \
  -o "$BACKUP_FILE"

# Vérifier que le fichier est un JSON valide et non vide
if python3 -c "import json,sys; data=json.load(open(sys.argv[1])); print(f'✅ Backup OK: {len(data)} classifications sauvegardées → {sys.argv[1]}')" "$BACKUP_FILE" 2>/dev/null; then
    # Supprimer les backups de plus de 90 jours
    find "$BACKUP_DIR" -name "human_classifications_*.json" -mtime +90 -delete
else
    echo "❌ Erreur: backup invalide ou vide"
    rm -f "$BACKUP_FILE"
    exit 1
fi
