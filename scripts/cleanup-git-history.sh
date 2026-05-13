#!/usr/bin/env bash
# ============================================================
# cleanup-git-history.sh
# Removes bin/ and obj/ build artifacts from ALL git history
# using git-filter-repo (the modern replacement for BFG / filter-branch).
#
# ⚠️  WARNING: This rewrites commit SHAs!
#     - Every team member must re-clone after the force push
#     - Coordinate with the team BEFORE running this
#     - Back up the repo BEFORE running this
#
# Usage:
#   chmod +x scripts/cleanup-git-history.sh
#   ./scripts/cleanup-git-history.sh
# ============================================================

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${YELLOW}║   Operation Nexus — Git History Cleanup                 ║${NC}"
echo -e "${YELLOW}║   Removes bin/ and obj/ artifacts from ALL commits      ║${NC}"
echo -e "${YELLOW}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""

# ── Pre-flight checks ──────────────────────────────────────

# Check we're in a git repo
if ! git rev-parse --is-inside-work-tree &>/dev/null; then
    echo -e "${RED}ERROR: Not inside a git repository.${NC}"
    exit 1
fi

# Check git-filter-repo is installed
if ! command -v git-filter-repo &>/dev/null; then
    echo -e "${RED}ERROR: git-filter-repo is not installed.${NC}"
    echo ""
    echo "Install with one of:"
    echo "  brew install git-filter-repo"
    echo "  pip install git-filter-repo"
    echo "  pipx install git-filter-repo"
    exit 1
fi

# Check for uncommitted changes
if ! git diff-index --quiet HEAD -- 2>/dev/null; then
    echo -e "${RED}ERROR: You have uncommitted changes. Commit or stash them first.${NC}"
    exit 1
fi

# ── Show what will be removed ──────────────────────────────

echo -e "${GREEN}📊 Pre-cleanup stats:${NC}"
git count-objects -vH
echo ""

REPO_ROOT="$(git rev-parse --show-toplevel)"
REMOTE_URL=$(git remote get-url origin 2>/dev/null || echo "")

echo -e "${GREEN}📁 Files that will be purged from history:${NC}"
AFFECTED=$(git log --all --diff-filter=A --name-only --pretty=format: -- '*/bin/*' '*/obj/*' 2>/dev/null | grep -v '^$' | sort -u | wc -l | tr -d ' ')
echo "   ${AFFECTED} unique file paths across all commits"
echo ""

# ── Confirmation ────────────────────────────────────────────

echo -e "${RED}⚠️  This will REWRITE git history and change all commit SHAs.${NC}"
echo -e "${RED}   All team members will need to re-clone after force push.${NC}"
echo ""
read -p "Continue? (type YES to confirm): " CONFIRM
if [ "$CONFIRM" != "YES" ]; then
    echo "Aborted."
    exit 0
fi

echo ""

# ── Create backup ──────────────────────────────────────────

BACKUP_DIR="${REPO_ROOT}.backup-$(date +%Y%m%d-%H%M%S)"
echo -e "${GREEN}💾 Creating backup at: ${BACKUP_DIR}${NC}"
cp -r "$REPO_ROOT" "$BACKUP_DIR"
echo "   Backup complete."
echo ""

# ── Run git-filter-repo ────────────────────────────────────

echo -e "${GREEN}🧹 Rewriting history — removing bin/ and obj/ paths...${NC}"
git filter-repo \
    --path-glob '*/bin/*' --invert-paths \
    --path-glob '*/obj/*' --invert-paths \
    --force

echo ""
echo -e "${GREEN}📊 Post-cleanup stats:${NC}"
git count-objects -vH
echo ""

# ── Re-add remote (filter-repo removes it) ─────────────────

if [ -n "$REMOTE_URL" ]; then
    echo -e "${GREEN}🔗 Re-adding remote origin: ${REMOTE_URL}${NC}"
    git remote add origin "$REMOTE_URL"
    echo ""
    echo -e "${YELLOW}To push the cleaned history:${NC}"
    echo "  git push --force --all"
    echo "  git push --force --tags"
else
    echo -e "${YELLOW}No remote was configured. Add one with:${NC}"
    echo "  git remote add origin <YOUR_REMOTE_URL>"
    echo "  git push --force --all"
    echo "  git push --force --tags"
fi

echo ""
echo -e "${GREEN}✅ Done! History has been rewritten.${NC}"
echo ""
echo -e "${YELLOW}📋 Team instructions (share with your team):${NC}"
echo "   1. The repo history has been rewritten — all commit SHAs have changed"
echo "   2. Everyone must re-clone the repository:"
echo "      git clone <REMOTE_URL>"
echo "   3. Or if they prefer to reset in-place:"
echo "      git fetch --all"
echo "      git reset --hard origin/main"
echo "   4. Any open branches/PRs need to be rebased onto the new history"
echo ""
echo -e "${GREEN}Backup is at: ${BACKUP_DIR}${NC}"
