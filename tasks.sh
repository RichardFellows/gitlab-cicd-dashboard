#!/bin/bash
# Task management for Ralph Wiggum
# Uses NDJSON format (one JSON object per line) for robustness
#
# Usage:
#   ./tasks.sh list [--status STATUS]    List tasks (optionally filter by status)
#   ./tasks.sh get ID                    Get task details
#   ./tasks.sh add "title" [--spec FILE] [--priority high|medium|low]
#   ./tasks.sh start ID                  Mark task as in_progress
#   ./tasks.sh done ID [--commit HASH] [--response "summary"]
#   ./tasks.sh block ID --reason "why"   Mark task as blocked
#   ./tasks.sh delete ID                 Remove a task
#   ./tasks.sh import FILE               Import tasks from markdown
#   ./tasks.sh export                    Export tasks as markdown
#   ./tasks.sh pending                   Count non-done tasks

set -euo pipefail

TASKS_FILE="${TASKS_FILE:-tasks.ndjson}"

# Ensure tasks file exists
touch "$TASKS_FILE"

generate_id() {
    echo "task-$(date +%s)-$RANDOM"
}

timestamp() {
    date -u +"%Y-%m-%dT%H:%M:%SZ"
}

cmd_list() {
    local status_filter=""
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --status) status_filter="$2"; shift 2 ;;
            *) shift ;;
        esac
    done
    
    if [[ -z "$status_filter" ]]; then
        cat "$TASKS_FILE"
    else
        grep "\"status\":\"$status_filter\"" "$TASKS_FILE" || true
    fi
}

cmd_get() {
    local id="$1"
    grep "\"id\":\"$id\"" "$TASKS_FILE" | head -1
}

cmd_add() {
    local title="$1"
    shift
    
    local spec=""
    local priority="medium"
    local status="backlog"
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --spec) spec="$2"; shift 2 ;;
            --priority) priority="$2"; shift 2 ;;
            --status) status="$2"; shift 2 ;;
            *) shift ;;
        esac
    done
    
    local id=$(generate_id)
    local ts=$(timestamp)
    
    local task="{\"id\":\"$id\",\"status\":\"$status\",\"title\":\"$title\",\"priority\":\"$priority\",\"created\":\"$ts\""
    
    if [[ -n "$spec" ]]; then
        task="$task,\"spec\":\"$spec\""
    fi
    
    task="$task}"
    
    echo "$task" >> "$TASKS_FILE"
    echo "$id"
}

cmd_update() {
    local id="$1"
    shift
    
    local tmp=$(mktemp)
    local found=false
    
    while IFS= read -r line; do
        if echo "$line" | grep -q "\"id\":\"$id\""; then
            found=true
            local updated="$line"
            
            while [[ $# -gt 0 ]]; do
                case $1 in
                    --status)
                        updated=$(echo "$updated" | sed "s/\"status\":\"[^\"]*\"/\"status\":\"$2\"/")
                        shift 2
                        ;;
                    --commit)
                        # Add commit field
                        updated=$(echo "$updated" | sed "s/}$/,\"commit\":\"$2\"}/")
                        shift 2
                        ;;
                    --response)
                        # Add response field (escape quotes)
                        local resp=$(echo "$2" | sed 's/"/\\"/g')
                        updated=$(echo "$updated" | sed "s/}$/,\"response\":\"$resp\"}/")
                        shift 2
                        ;;
                    --reason)
                        local reason=$(echo "$2" | sed 's/"/\\"/g')
                        updated=$(echo "$updated" | sed "s/}$/,\"blocked_reason\":\"$reason\"}/")
                        shift 2
                        ;;
                    --completed)
                        updated=$(echo "$updated" | sed "s/}$/,\"completed\":\"$(timestamp)\"}/")
                        shift
                        ;;
                    *)
                        shift
                        ;;
                esac
            done
            
            echo "$updated"
        else
            echo "$line"
        fi
    done < "$TASKS_FILE" > "$tmp"
    
    mv "$tmp" "$TASKS_FILE"
    
    if [[ "$found" == "false" ]]; then
        echo "Task not found: $id" >&2
        return 1
    fi
}

cmd_start() {
    local id="$1"
    cmd_update "$id" --status "in_progress"
    echo "Started: $id"
}

cmd_done() {
    local id="$1"
    shift
    cmd_update "$id" --status "done" --completed "$@"
    echo "Completed: $id"
}

cmd_block() {
    local id="$1"
    shift
    local reason=""
    while [[ $# -gt 0 ]]; do
        case $1 in
            --reason) reason="$2"; shift 2 ;;
            *) shift ;;
        esac
    done
    cmd_update "$id" --status "blocked" --reason "$reason"
    echo "Blocked: $id"
}

cmd_delete() {
    local id="$1"
    local tmp=$(mktemp)
    grep -v "\"id\":\"$id\"" "$TASKS_FILE" > "$tmp" || true
    mv "$tmp" "$TASKS_FILE"
    echo "Deleted: $id"
}

cmd_pending() {
    local count=$(grep -v '"status":"done"' "$TASKS_FILE" | wc -l)
    echo "$count"
}

cmd_next() {
    # Get highest priority non-done task
    # Priority order: high > medium > low
    # Status order: in_progress > todo > backlog
    
    local task=""
    
    # First check in_progress
    task=$(grep '"status":"in_progress"' "$TASKS_FILE" 2>/dev/null | head -1 || true)
    if [[ -n "$task" ]]; then
        echo "$task"
        return 0
    fi
    
    # Then todo, by priority
    for priority in high medium low; do
        task=$(grep '"status":"todo"' "$TASKS_FILE" 2>/dev/null | grep "\"priority\":\"$priority\"" | head -1 || true)
        if [[ -n "$task" ]]; then
            echo "$task"
            return 0
        fi
    done
    
    # Then backlog, by priority
    for priority in high medium low; do
        task=$(grep '"status":"backlog"' "$TASKS_FILE" 2>/dev/null | grep "\"priority\":\"$priority\"" | head -1 || true)
        if [[ -n "$task" ]]; then
            echo "$task"
            return 0
        fi
    done
    
    # No tasks found
    return 0
}

cmd_export() {
    echo "# Tasks"
    echo ""
    
    echo "## In Progress"
    grep '"status":"in_progress"' "$TASKS_FILE" 2>/dev/null | while read -r line; do
        title=$(echo "$line" | grep -o '"title":"[^"]*"' | cut -d'"' -f4)
        id=$(echo "$line" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
        echo "- [ ] $title ($id)"
    done || echo "(none)"
    echo ""
    
    echo "## To Do"
    grep '"status":"todo"' "$TASKS_FILE" 2>/dev/null | while read -r line; do
        title=$(echo "$line" | grep -o '"title":"[^"]*"' | cut -d'"' -f4)
        id=$(echo "$line" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
        echo "- [ ] $title ($id)"
    done || echo "(none)"
    echo ""
    
    echo "## Backlog"
    grep '"status":"backlog"' "$TASKS_FILE" 2>/dev/null | while read -r line; do
        title=$(echo "$line" | grep -o '"title":"[^"]*"' | cut -d'"' -f4)
        id=$(echo "$line" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
        echo "- [ ] $title ($id)"
    done || echo "(none)"
    echo ""
    
    echo "## Done"
    grep '"status":"done"' "$TASKS_FILE" 2>/dev/null | tail -10 | while read -r line; do
        title=$(echo "$line" | grep -o '"title":"[^"]*"' | cut -d'"' -f4)
        id=$(echo "$line" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
        echo "- [x] $title ($id)"
    done || echo "(none)"
}

cmd_help() {
    cat << 'EOF'
Task management for Ralph Wiggum (NDJSON format)

Usage:
  ./tasks.sh list [--status STATUS]         List tasks
  ./tasks.sh get ID                         Get task details
  ./tasks.sh add "title" [OPTIONS]          Add a task
  ./tasks.sh start ID                       Mark as in_progress
  ./tasks.sh done ID [--commit H] [--response "..."]  Mark as done
  ./tasks.sh block ID --reason "..."        Mark as blocked
  ./tasks.sh delete ID                      Remove a task
  ./tasks.sh pending                        Count pending tasks
  ./tasks.sh next                           Get next task to work on
  ./tasks.sh export                         Export as markdown

Add options:
  --spec FILE        Related spec file
  --priority LEVEL   high, medium, low (default: medium)
  --status STATUS    backlog, todo, in_progress (default: backlog)

Environment:
  TASKS_FILE         Path to tasks file (default: tasks.ndjson)

Task statuses: backlog → todo → in_progress → done (or blocked)
EOF
}

# Main dispatch
case "${1:-help}" in
    list) shift; cmd_list "$@" ;;
    get) shift; cmd_get "$@" ;;
    add) shift; cmd_add "$@" ;;
    start) shift; cmd_start "$@" ;;
    done) shift; cmd_done "$@" ;;
    block) shift; cmd_block "$@" ;;
    delete) shift; cmd_delete "$@" ;;
    pending) cmd_pending ;;
    next) cmd_next ;;
    export) cmd_export ;;
    help|--help|-h) cmd_help ;;
    *) echo "Unknown command: $1" >&2; cmd_help; exit 1 ;;
esac
