# Ralph Wiggum Workflow - How It Was Used

This document explains how the Ralph Wiggum pattern was used to implement Priority 1 features.

## What Is Ralph?

Ralph is an autonomous development loop: run an AI agent iteratively until a deterministic "completion promise" (test suite) passes.

```bash
while tests_fail; do
    ai_agent "Fix issues until tests pass"
done
```

Named after Ralph Wiggum from The Simpsons (who just keeps trying without overthinking).

## How We Used It

### 1. Research Phase

Gathered info on the pattern:
- Original concept: ghuntley.com/ralph/
- Tools: ralphy-cli, juno-code, smart-ralph
- Key insight: tests are the arbiter, not AI judgment

### 2. Setup Phase

Created infrastructure files:

| File | Purpose |
|------|---------|
| `PROMPT.md` | Task queue + completion promise |
| `PRD.md` | Task list for ralphy-cli |
| `ralph.sh` | Simple bash runner |
| `specs/priority-1-pipeline-metrics/` | Full spec structure |
| `.ralphy/config.yaml` | Project rules |

### 3. Spec Structure

For Priority 1, created structured specs:

```
specs/priority-1-pipeline-metrics/
├── research.md      # Codebase analysis, API capabilities
├── requirements.md  # User stories, acceptance criteria
├── design.md        # Architecture, types, components
└── tasks.md         # POC-first task breakdown
```

### 4. Execution

Used Clawdbot's sub-agent spawning (equivalent to Ralph loop):

```javascript
// Task 1: Fix E2E tests
sessions_spawn({
  task: `Fix failing E2E tests by following PROMPT.md.
         Run: npm run lint && npm run build && npm test && npx playwright test
         When all pass, commit and report.`,
  label: "ralph-e2e-fixes"
})

// Task 2: Priority 1 features  
sessions_spawn({
  task: `Read specs/priority-1-pipeline-metrics/*.md
         Implement all phases. Verify with npm run lint && npm run build && npm test
         Commit after each phase. Send WhatsApp updates.`,
  label: "ralph-priority-1"
})
```

### 5. Completion Promise

The deterministic check that defines "done":

```bash
npm run lint && npm run build && npm test && npx playwright test --project=chromium
```

## Results

| Task | Time | Outcome |
|------|------|---------|
| E2E fixes | 41s | 3 fixes, all tests passing |
| Priority 1 features | 3m48s | 4 phases, 26 new tests |

## Running It Yourself

**Option 1: Bash loop**
```bash
./ralph.sh              # Until done
./ralph.sh --max 10     # Limited iterations
```

**Option 2: Ralphy CLI**
```bash
ralphy                  # Work through PRD.md
ralphy "task"           # Single task
```

**Option 3: Sub-agent (via Clawdbot)**
```javascript
sessions_spawn({ task: "...", label: "..." })
```

## Key Lessons

1. **Tests are the arbiter** - No guessing, tests define done
2. **Spec first for complex work** - Research → Requirements → Design → Tasks
3. **One thing at a time** - Verify after each change
4. **Updates matter** - WhatsApp/Slack for long-running work
5. **POC-first** - Make it work, then refine
