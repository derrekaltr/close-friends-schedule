#!/usr/bin/env bash
# The Weekly Edit — transfer/bootstrap script
#
# Gets a fresh machine (or a Conductor workspace, or any checkout) from zero
# to a running local instance. Safe to re-run; every step is idempotent.
#
#   curl -fsSL https://raw.githubusercontent.com/derrekaltr/close-friends-schedule/creator-story-idea-board/scripts/transfer.sh | bash
#   # or, from inside a checkout:  bash scripts/transfer.sh
set -euo pipefail

REPO_URL="https://github.com/derrekaltr/close-friends-schedule.git"
BRANCH="creator-story-idea-board"
DIR="close-friends-schedule"

say() { printf '\n\033[1;36m▸ %s\033[0m\n' "$1"; }

# 1. Get the code (skip if we're already inside the repo)
if [ ! -f package.json ] || ! grep -q '"name": "weekly-edit"' package.json 2>/dev/null; then
  say "Cloning $REPO_URL ($BRANCH)"
  git clone --branch "$BRANCH" "$REPO_URL" "$DIR"
  cd "$DIR"
else
  say "Already inside the repo — making sure we're on $BRANCH"
  git fetch origin "$BRANCH" && git checkout "$BRANCH"
fi

# 2. Toolchain check
command -v node >/dev/null || { echo "Node.js 20+ is required (https://nodejs.org)"; exit 1; }
say "Node $(node --version)"

# 3. Dependencies
say "Installing dependencies"
npm install

# 4. Local env (gitignored). Local dev needs no real secrets:
#    without DATABASE_URL the app runs on embedded Postgres (PGlite) in .data/
#    and self-seeds a demo creator.
if [ ! -f .env.local ]; then
  say "Writing .env.local with dev defaults"
  cat > .env.local <<'ENV'
ADMIN_PASSWORD=admin-dev
AUTH_SECRET=dev-secret-change-me
# For the real database + production parity, get these from Derrek / Vercel:
# DATABASE_URL=postgres://...   (Neon, project 'weekly-edit' on team 'altr5')
ENV
else
  say ".env.local already exists — leaving it alone"
fi

# 5. Verify it builds
say "Building"
npx next build

cat <<'DONE'

✔ Transfer complete.

  Start it:        npm run dev          (or the Conductor ▶ run button)
  Local admin:     http://localhost:3000/admin   password: admin-dev
  Read first:      HANDOFF.md  — architecture, product decisions, integration notes

  Production:      https://weekly-edit-altr5.vercel.app
                   (Vercel project 'weekly-edit', team 'altr5' — ask Derrek for
                   access + the real ADMIN_PASSWORD; secrets are not in this repo)
DONE
