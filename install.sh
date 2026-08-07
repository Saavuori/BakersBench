#!/usr/bin/env bash
#
# Baker's Bench — one-command setup for macOS and Linux.
#
#   ./install.sh            pick the best available runner and start
#   ./install.sh --docker   force the container
#   ./install.sh --python   force the local Python server
#   ./install.sh --check    verify the toolchain and run the tests, then stop
#   ./install.sh --port N   serve on a different port
#
# The app itself has no dependencies — it is static HTML, CSS and JavaScript.
# Everything below is only about getting a web server in front of it, because
# browsers refuse to load ES-adjacent local files over file:// consistently.

set -euo pipefail

PORT=8080
MODE=auto
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

while [ $# -gt 0 ]; do
  case "$1" in
    --docker) MODE=docker; shift ;;
    --python) MODE=python; shift ;;
    --check)  MODE=check;  shift ;;
    --port)   PORT="${2:?--port needs a number}"; shift 2 ;;
    -h|--help) sed -n '2,16p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "Unknown option: $1 (try --help)" >&2; exit 2 ;;
  esac
done

say()  { printf '  %s\n' "$*"; }
ok()   { printf '  \033[32m✓\033[0m %s\n' "$*"; }
warn() { printf '  \033[33m!\033[0m %s\n' "$*"; }
die()  { printf '  \033[31m✗\033[0m %s\n' "$*" >&2; exit 1; }
have() { command -v "$1" >/dev/null 2>&1; }

printf '\nBaker'"'"'s Bench\n\n'

# ── Toolchain ────────────────────────────────────────────────────────────────
HAS_NODE=0; HAS_PY=0; HAS_DOCKER=0
have node   && { HAS_NODE=1;   ok "node   $(node --version)"; }   || warn "node not found (needed only for tests)"
have python3 && { HAS_PY=1;    ok "python $(python3 --version 2>&1 | cut -d' ' -f2)"; } \
  || { have python && { HAS_PY=1; ok "python $(python --version 2>&1 | cut -d' ' -f2)"; }; } \
  || warn "python not found"
have docker && docker info >/dev/null 2>&1 && { HAS_DOCKER=1; ok "docker $(docker --version | cut -d' ' -f3 | tr -d ,)"; } \
  || warn "docker not available"

PY=python3; have python3 || PY=python

# ── Tests ────────────────────────────────────────────────────────────────────
if [ "$HAS_NODE" = 1 ]; then
  echo
  say "Running the test suite…"
  if node --test >/tmp/bb-test.log 2>&1; then
    ok "$(grep -c '^✔' /tmp/bb-test.log || echo 'all') checks passed"
  else
    tail -30 /tmp/bb-test.log
    die "Tests failed. The formulas may be wrong — not starting."
  fi
fi

[ "$MODE" = check ] && { echo; ok "Toolchain looks good."; exit 0; }

# ── Choose a runner ──────────────────────────────────────────────────────────
if [ "$MODE" = auto ]; then
  if   [ "$HAS_PY" = 1 ];     then MODE=python
  elif [ "$HAS_DOCKER" = 1 ]; then MODE=docker
  else die "Need either Python 3 or Docker to serve the app."
  fi
fi

echo
case "$MODE" in
  python)
    [ "$HAS_PY" = 1 ] || die "Python 3 is not installed."
    say "Serving at http://localhost:$PORT  (Ctrl-C to stop)"
    echo
    exec "$PY" "$APP_DIR/serve.py" "$PORT"
    ;;
  docker)
    [ "$HAS_DOCKER" = 1 ] || die "Docker is not running."
    say "Building the image…"
    docker build -t bakers-bench:local "$APP_DIR"
    echo
    say "Serving at http://localhost:$PORT  (Ctrl-C to stop)"
    echo
    exec docker run --rm -p "$PORT:8080" --name bakers-bench bakers-bench:local
    ;;
esac
