#!/usr/bin/env bash
#
# Publish the torchdev app (this repo's web/ directory) to the standalone
# repo `jinnessism/intertorch` at its root, and set up GitHub Pages deploy.
#
# Run this from YOUR OWN machine (where git is authenticated for your repos).
# It does NOT work from the scoped Claude Code session.
#
# Usage:
#   bash web/deploy/publish-to-intertorch.sh
#
# Prereqs: git, and push access to https://github.com/jinnessism/intertorch
#
set -euo pipefail

NEW_REPO="${NEW_REPO:-https://github.com/jinnessism/intertorch.git}"
BRANCH="${BRANCH:-main}"

# Resolve the web/ directory relative to this script (works from anywhere).
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WEB_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

WORK="$(mktemp -d)"
echo "▶ Cloning ${NEW_REPO} ..."
git clone "${NEW_REPO}" "${WORK}/intertorch"
cd "${WORK}/intertorch"

# Make sure we are on the target branch (create if the repo is empty).
git checkout -B "${BRANCH}"

echo "▶ Copying app from ${WEB_DIR} to repo root ..."
# Copy everything except node_modules / build output / the deploy helper dir,
# using tar so no rsync dependency is required (portable to macOS & Linux).
( cd "${WEB_DIR}" && tar \
    --exclude='./.git' \
    --exclude='./node_modules' \
    --exclude='./.next' \
    --exclude='./out' \
    --exclude='./deploy' \
    -cf - . ) | tar -xf - -C .

echo "▶ Installing the Pages workflow ..."
mkdir -p .github/workflows
cp "${WEB_DIR}/deploy/intertorch-pages.yml" .github/workflows/deploy.yml

echo "▶ Committing and pushing ..."
git add -A
git commit -m "Deploy torchdev interactive PyTorch website" || {
  echo "Nothing to commit (already up to date)."; exit 0;
}
git push -u origin "${BRANCH}"

echo
echo "✅ Pushed to ${NEW_REPO} (${BRANCH})."
echo "   Watch the build:   https://github.com/jinnessism/intertorch/actions"
echo "   Site (after build): https://jinnessism.github.io/intertorch/"
echo
echo "Cleaning up ${WORK}"
rm -rf "${WORK}"
