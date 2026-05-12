#!/bin/bash
# Restaure les classifications humaines depuis un backup
# Usage: ./restore_classifications.sh 2026-03-13
#   ou : ./restore_classifications.sh  (liste les backups disponibles)

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKUP_DIR="$SCRIPT_DIR/backups"

SUPABASE_URL="https://vcuvsqapuwueqblpbiux.supabase.co"
SUPABASE_KEY="sb_publishable_Vmf3PpVVJFg4dEdAUFeeWg_UuJiXEmU"

# Sans argument : lister les backups disponibles
if [ -z "$1" ]; then
    echo "Backups disponibles :"
    echo ""
    for f in "$BACKUP_DIR"/human_classifications_*.json; do
        [ -f "$f" ] || continue
        date=$(basename "$f" | sed 's/human_classifications_//;s/\.json//')
        count=$(python3 -c "import json; print(len(json.load(open('$f'))))" 2>/dev/null || echo "?")
        echo "  $date  ($count classifications)"
    done
    echo ""
    echo "Usage: $0 <YYYY-MM-DD>"
    exit 0
fi

DATE="$1"
BACKUP_FILE="$BACKUP_DIR/human_classifications_$DATE.json"

if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ Aucun backup trouvé pour le $DATE"
    echo "   Fichier attendu : $BACKUP_FILE"
    exit 1
fi

COUNT=$(python3 -c "import json; print(len(json.load(open('$BACKUP_FILE'))))")
echo "⚠️  Vous allez restaurer $COUNT classifications du $DATE."
echo "   Cela va SUPPRIMER toutes les classifications actuelles et les remplacer."
echo ""
read -p "Confirmer ? (oui/non) : " CONFIRM

if [ "$CONFIRM" != "oui" ]; then
    echo "Annulé."
    exit 0
fi

echo "🗑️  Suppression des classifications actuelles..."
curl -s -X DELETE "${SUPABASE_URL}/rest/v1/human_classifications?id=not.is.null" \
  -H "apikey: ${SUPABASE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_KEY}" \
  -o /dev/null

echo "📥 Restauration depuis le backup du $DATE..."
# Extraire uniquement les champs de human_classifications (sans la jointure articles)
python3 -c "
import json, sys
data = json.load(open('$BACKUP_FILE'))
clean = [{'id': r['id'], 'article_id': r['article_id'], 'userneed': r['userneed'],
          'classified_at': r['classified_at'], 'classified_by': r.get('classified_by')} for r in data]
json.dump(clean, sys.stdout)
" | curl -s -X POST "${SUPABASE_URL}/rest/v1/human_classifications" \
  -H "apikey: ${SUPABASE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d @- | python3 -c "import json,sys; data=json.load(sys.stdin); print(f'✅ {len(data)} classifications restaurées depuis le backup du $DATE')"
