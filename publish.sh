#!/usr/bin/env bash
# Publish CoinGuard to GitHub + enable Pages.
# Run once. It asks for nothing except the GitHub token you set beforehand.
set -e

DIR=/home/pc/.hermes/cache/scratch/coinguard
cd "$DIR"

if [ -z "$GH_TOKEN" ]; then
  echo "GH_TOKEN is empty. Run:"
  echo "  export GH_TOKEN='$(gh auth token 2>/dev/null || echo '<your github token>')'"
  echo "Generate one at: https://github.com/settings/tokens/new"
  echo "Scopes needed: repo, workflow"
  exit 1
fi

# who am i -- GitHub pretty-prints JSON with a space after the colon, so match
# both shapes rather than assuming the compact form.
ME=$(curl -sf -H "Authorization: Bearer $GH_TOKEN" https://api.github.com/user)
USER=$(printf '%s' "$ME" | sed -n 's/.*"login"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -1)
if [ -z "$USER" ]; then
  echo "Bad GH_TOKEN -- GitHub rejected it."
  exit 1
fi
echo "Publishing as: $USER"

# create the repo (idempotent: ignore 'already exists')
curl -s -X POST \
  -H "Authorization: Bearer $GH_TOKEN" \
  -H "Accept: application/vnd.github+json" \
  https://api.github.com/user/repos \
  -d "{\"name\":\"coinguard\",\"description\":\"Live Cookie Chain SVM wallet + network console\",\"public\":true,\"auto_init\":false}" \
  | grep -q '"id"' && echo "repo created" || echo "repo already exists — reusing"

# push
git remote remove origin 2>/dev/null || true
git remote add origin "https://x-access-token:${GH_TOKEN}@github.com/${USER}/coinguard.git"
git push -q -u origin main 2>/dev/null || git push -q -u origin master
echo "pushed"

# enable GitHub Pages
curl -s -X POST \
  -H "Authorization: Bearer $GH_TOKEN" \
  -H "Accept: application/vnd.github+json" \
  "https://api.github.com/repos/${USER}/coinguard/pages" \
  -d '{"source":{"branch":"main","path":"/"}}' > /dev/null
# Pages needs the workflow scope on some accounts; the REST call above covers the rest.
sleep 25

echo
echo "live link: https://${USER}.github.io/coinguard/"
echo "repo    : https://github.com/${USER}/coinguard"
