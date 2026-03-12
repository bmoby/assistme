#!/bin/bash
# Hook: Avertissement avant modification directe des specs
# Les specs ne devraient etre modifiees que via /spec-update ou consciemment

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

# Ne s'applique que sur les fichiers dans specs/
if [[ "$FILE_PATH" != *"specs/"* ]]; then
  exit 0
fi

# Avertissement (ne bloque pas, juste rappelle)
echo "[SPEC-GUARD] Modification de spec detectee: $FILE_PATH - verifie que c'est intentionnel (utilise /spec-update pour les mises a jour systematiques)"
exit 0
