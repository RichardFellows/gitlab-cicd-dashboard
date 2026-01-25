#!/bin/bash
# ralph.sh - Ralph Wiggum loop for GitLab CI/CD Dashboard
#
# Usage:
#   ./ralph.sh                 # Run until completion promise met
#   ./ralph.sh --max 10        # Run max 10 iterations
#   ./ralph.sh --dry-run       # Show what would run
#
# The loop runs Claude Code with PROMPT.md until the completion promise passes.

set -e

MAX_ITERATIONS=50
DRY_RUN=false
COMPLETION_CHECK="npm run lint && npm run build && npm test && npx playwright test e2e/dashboard.spec.ts --project=chromium"

# Parse args
while [[ $# -gt 0 ]]; do
    case $1 in
        --max)
            MAX_ITERATIONS="$2"
            shift 2
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🔄 Ralph Wiggum Loop${NC}"
echo "Max iterations: $MAX_ITERATIONS"
echo "Completion check: $COMPLETION_CHECK"
echo ""

# Check if completion promise already met
check_completion() {
    echo -e "${YELLOW}Checking completion promise...${NC}"
    if eval "$COMPLETION_CHECK" > /dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Run one iteration
run_iteration() {
    local iteration=$1
    echo -e "${YELLOW}━━━ Iteration $iteration ━━━${NC}"
    
    if $DRY_RUN; then
        echo "[DRY RUN] Would run: cat PROMPT.md | claude"
        return 0
    fi
    
    # Run Claude Code with the prompt
    # Using --dangerously-skip-permissions for autonomous operation
    claude --dangerously-skip-permissions -p "$(cat PROMPT.md)"
}

# Main loop
iteration=0

# Check if already complete
if check_completion; then
    echo -e "${GREEN}✅ Completion promise already met! Nothing to do.${NC}"
    exit 0
fi

while [ $iteration -lt $MAX_ITERATIONS ]; do
    iteration=$((iteration + 1))
    
    run_iteration $iteration
    
    # Check if complete
    if check_completion; then
        echo -e "${GREEN}✅ DONE! Completion promise met after $iteration iterations.${NC}"
        exit 0
    fi
    
    echo -e "${RED}❌ Completion check failed. Continuing...${NC}"
    echo ""
    sleep 2
done

echo -e "${RED}⚠️ Max iterations ($MAX_ITERATIONS) reached without completion.${NC}"
exit 1
