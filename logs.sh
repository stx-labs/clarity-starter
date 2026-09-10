#!/usr/bin/env bash
set -uo pipefail

NAME='stacks-node.project-template.devnet'
LOG="${NAME}.$(date +%Y%m%d-%H%M%S).log"
REDACT=0   # set to 1 to mask secret-looking env values

echo "Logging ${NAME} -> ${LOG}"

dump_env() {
  echo "--- ENV ($(date '+%H:%M:%S')) ---" | tee -a "$LOG"
  if [ "$REDACT" -eq 1 ]; then
    docker inspect "$NAME" --format '{{range .Config.Env}}{{println .}}{{end}}' 2>/dev/null \
      | perl -pe 's/^(.*?(KEY|SECRET|TOKEN|PASSWORD|MNEMONIC|PRIVATE|SEED|CRED).*?=).*/$1[REDACTED]/i' \
      | tee -a "$LOG" || echo "(could not inspect env)" | tee -a "$LOG"
  else
    docker inspect "$NAME" --format '{{range .Config.Env}}{{println .}}{{end}}' 2>/dev/null \
      | tee -a "$LOG" || echo "(could not inspect env)" | tee -a "$LOG"
  fi
  echo "--- END ENV ---" | tee -a "$LOG"
}

while :; do
  if [ -z "$(docker ps -q --filter "name=^${NAME}$")" ]; then
    echo "[$(date '+%H:%M:%S')] waiting for start..." | tee -a "$LOG"
    read -r _ < <(docker events \
      --filter "container=${NAME}" \
      --filter "event=start" \
      --format '{{.Actor.Attributes.name}}')
  fi

  dump_env                                   # inspect first — logs -f blocks until death
  echo "[$(date '+%H:%M:%S')] attached" | tee -a "$LOG"
  docker logs -f "$NAME" 2>&1 | tee -a "$LOG" || true
  echo "[$(date '+%H:%M:%S')] exited; re-arming" | tee -a "$LOG"
done
