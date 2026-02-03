# Research: Priority 1 Pipeline Metrics Enhancement

## Codebase Analysis

### Existing Infrastructure

**Services:**
- `GitLabApiService.ts` - Already fetches pipelines, projects, MRs
- `DashboardDataService.ts` - Transforms API data for display
- Pipeline type already includes: `status`, `duration`, `coverage`, `created_at`

**Components:**
- `TrendChart.tsx` - Reusable Chart.js line chart ✓
- `MetricAlert.tsx` - Visual flagging badges ✓
- `MetricsPanel.tsx` - Aggregate trend charts ✓
- `ProjectMetricsTrends.tsx` - Per-project trend charts ✓

**State Management:**
- React hooks + localStorage persistence
- Timeframe already in ControlPanel state

### GitLab API Capabilities

**Pipeline Endpoints:**
```
GET /projects/:id/pipelines
  ?ref=main               # Filter by branch
  ?updated_after=DATE     # Filter by time
  ?per_page=100           # Pagination
  ?status=failed          # Filter by status
```

**Pipeline Object Fields:**
```json
{
  "id": 123,
  "status": "success|failed|running|pending|canceled",
  "ref": "main",
  "duration": 300,          // seconds
  "coverage": "85.5",       // string or null
  "created_at": "2025-01-20T10:00:00Z",
  "updated_at": "2025-01-20T10:05:00Z"
}
```

### Current Implementation Gaps

1. **Branch filtering**: Not currently filtering by ref=main
2. **Failure rate calculation**: Not calculated (only success rate)
3. **Duration trending**: Duration fetched but not trended
4. **Coverage display**: Type exists but not prominently displayed
5. **Time window**: Selector exists but may not be wired to all calculations

### Test Group Data

Group ID: `122839760` (test-group6330604)
- 5 projects with varied pipeline states
- `frontend-app` has failing tests (good for failure rate testing)
- Multiple pipelines per project for trend data

## Feasibility Assessment

| Feature | Complexity | API Support | Existing Code |
|---------|------------|-------------|---------------|
| Failure Rate | Low | ✓ status field | Success rate exists, invert |
| Duration Trend | Low | ✓ duration field | Duration already fetched |
| Coverage Display | Low | ✓ coverage field | Type exists, needs display |
| Time Windows | Low | ✓ updated_after | Selector exists |

**Verdict:** All features are feasible with existing infrastructure. Mostly requires:
1. New calculation functions in DashboardDataService
2. Wiring existing components with new data
3. Minor UI additions for coverage/failure badges

## Recommendations

1. **Start with E2E fixes** - Unblock the test suite first
2. **Failure rate first** - Similar to existing success rate logic
3. **Reuse TrendChart** - Already handles Chart.js complexity
4. **Batch implementation** - All Priority 1 features share similar patterns
