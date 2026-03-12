#!/bin/bash
# Hook: Rappel spec-first avant modification de code dans packages/
# Se declenche sur PreToolUse pour Edit et Write

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // .tool_input.file_path // empty')

# Ne s'applique que sur les fichiers dans packages/
if [[ "$FILE_PATH" != *"packages/"* ]]; then
  exit 0
fi

# Determiner le package
if [[ "$FILE_PATH" == *"packages/core/"* ]]; then
  SPEC="specs/01-cerveau-central/SPEC.md"
  COMPONENT="01-cerveau-central"
elif [[ "$FILE_PATH" == *"packages/bot-telegram-public/"* ]]; then
  SPEC="specs/03-bot-telegram-public/SPEC.md"
  COMPONENT="03-bot-telegram-public"
elif [[ "$FILE_PATH" == *"packages/bot-telegram/"* ]]; then
  SPEC="specs/02-bot-telegram/SPEC.md"
  COMPONENT="02-bot-telegram"
elif [[ "$FILE_PATH" == *"packages/bot-discord/"* ]]; then
  SPEC="specs/04-bot-discord/SPEC.md"
  COMPONENT="04-bot-discord"
else
  exit 0
fi

# Rappel (exit 0 = ne bloque pas, juste informe via stdout)
echo "[SPEC-FIRST] Modification de $COMPONENT - assure-toi d'avoir lu $SPEC"
exit 0
