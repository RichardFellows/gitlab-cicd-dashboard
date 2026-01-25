# Design: Priority 1 Pipeline Metrics Enhancement

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Dashboard.tsx                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ MetricsPanel │  │  TableView   │  │    ProjectDetails    │  │
│  │              │  │              │  │                      │  │
│  │ - Agg Trends │  │ - Per-project│  │ - ProjectMetrics     │  │
│  │ - Failure %  │  │   metrics    │  │   Trends             │  │
│  │ - Duration   │  │ - Alerts     │  │ - TrendChart(s)      │  │
│  │ - Coverage   │  │              │  │                      │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    DashboardDataService.ts                       │
│                                                                  │
│  - calculateFailureRate(pipelines, branch)                      │
│  - calculateDurationTrend(pipelines, timeWindow)                │
│  - getCoverageTrend(pipelines)                                  │
│  - getMetricAlerts(project, thresholds)                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     GitLabApiService.ts                          │
│                                                                  │
│  - getProjectPipelines(projectId, { ref?, per_page?, since? })  │
│  - Pipeline.coverage (already in type)                          │
│  - Pipeline.duration (already fetched)                          │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow

1. **User selects timeframe** (7/30/90 days) in ControlPanel
2. **GitLabApiService** fetches pipelines with `updated_after` filter
3. **DashboardDataService** calculates:
   - Failure rate = failed pipelines / total pipelines (for main branch)
   - Duration trend = rolling average per day/week
   - Coverage = latest pipeline coverage value
4. **Components** display via existing TrendChart + MetricAlert

## Type Extensions

```typescript
// src/types/index.ts - additions

interface ProjectMetrics {
  // Existing
  successRate: number;
  avgDuration: number;
  
  // New for Priority 1
  failureRate: number;           // 1.1
  failureRateTrend: TrendPoint[]; // 1.1
  durationTrend: TrendPoint[];    // 1.2
  coverage: number | null;        // 1.3
  coverageTrend?: TrendPoint[];   // 1.3 optional
}

interface TrendPoint {
  date: string;  // ISO date
  value: number;
}

interface MetricThresholds {
  failureRate: number;  // default 10% (0.1)
  duration: number;     // default 300s (5 min)
  coverage: number;     // default 80% (0.8)
}
```

## Component Changes

### MetricsPanel.tsx
- Add failure rate aggregate chart
- Add duration trend aggregate chart
- Use existing TrendChart component

### TableView.tsx / CardView.tsx
- Add coverage column/display
- Add failure rate badge via MetricAlert

### ControlPanel.tsx
- Already has timeframe selector (verify it's wired through)

### ProjectMetricsTrends.tsx
- Add failure rate trend chart
- Add duration trend chart
- Add coverage trend chart (optional)

## Thresholds (constants.ts)

```typescript
export const METRIC_THRESHOLDS = {
  FAILURE_RATE_WARNING: 0.05,   // 5% - yellow
  FAILURE_RATE_CRITICAL: 0.10,  // 10% - red
  DURATION_SPIKE: 1.5,          // 150% of baseline
  COVERAGE_TARGET: 0.80,        // 80%
};
```

## API Considerations

- GitLab API rate limits: Use existing caching/batching
- Pipeline list: Already fetched, just need to filter by ref
- Coverage: Available in pipeline object when GitLab CI is configured with coverage regex
- Duration: Already in Pipeline type

## Testing Strategy

1. **Unit tests** for calculation functions in DashboardDataService
2. **Component tests** for new displays (mock data)
3. **E2E tests** - extend existing with trend verification (needs GITLAB_TOKEN)
