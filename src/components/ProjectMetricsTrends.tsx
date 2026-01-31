import { FC, useState, useEffect, useMemo } from 'react';
import TrendChart, { TrendDataset } from './TrendChart';
import { MainBranchTrend, CoverageTrend } from '../types';
import { logger } from '../utils/logger';
import DashboardDataService from '../services/DashboardDataService';
import { METRICS_THRESHOLDS, CHART_COLORS } from '../utils/constants';
import '../styles/ProjectMetricsTrends.css';

interface ProjectMetricsTrendsProps {
  projectId: number;
  dashboardService: DashboardDataService;
  timeframe: number;
  darkMode?: boolean;
}

const ProjectMetricsTrends: FC<ProjectMetricsTrendsProps> = ({
  projectId,
  dashboardService,
  timeframe,
  darkMode = false
}) => {
  const [mainBranchTrends, setMainBranchTrends] = useState<MainBranchTrend[]>([]);
  const [coverageTrends, setCoverageTrends] = useState<CoverageTrend[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTrends = async () => {
      try {
        setLoading(true);
        setError(null);

        const endDate = new Date().toISOString();
        const startDate = new Date(
          Date.now() - timeframe * 24 * 60 * 60 * 1000
        ).toISOString();

        const params = { startDate, endDate };

        // Fetch trends in parallel
        const [mainTrends, covTrends] = await Promise.all([
          dashboardService.getMainBranchTrends(projectId, params),
          dashboardService.getCoverageTrends(projectId, params)
        ]);

        setMainBranchTrends(mainTrends);
        setCoverageTrends(covTrends);
      } catch (err) {
        logger.error('Failed to fetch project trends:', err);
        setError('Failed to load trend data');
      } finally {
        setLoading(false);
      }
    };

    fetchTrends();
  }, [projectId, timeframe, dashboardService]);

  // Format date labels
  const mainBranchLabels = useMemo(() => {
    return mainBranchTrends.map(t => {
      const date = new Date(t.date);
      return `${date.getMonth() + 1}/${date.getDate()}`;
    });
  }, [mainBranchTrends]);

  const coverageLabels = useMemo(() => {
    return coverageTrends.map(t => {
      const date = new Date(t.date);
      return `${date.getMonth() + 1}/${date.getDate()}`;
    });
  }, [coverageTrends]);

  // Failure rate dataset
  const failureRateDataset: TrendDataset = useMemo(() => ({
    label: 'Failure Rate',
    data: mainBranchTrends.map(t => t.failureRate),
    borderColor: darkMode ? '#f44336' : CHART_COLORS.failureRate,
    fill: true
  }), [mainBranchTrends, darkMode]);

  // Duration dataset
  const durationDataset: TrendDataset = useMemo(() => ({
    label: 'Avg Duration',
    data: mainBranchTrends.map(t => t.avgDuration),
    borderColor: darkMode ? '#ff9800' : CHART_COLORS.duration,
    fill: true
  }), [mainBranchTrends, darkMode]);

  // Coverage dataset
  const coverageDataset: TrendDataset = useMemo(() => ({
    label: 'Coverage',
    data: coverageTrends.map(t => t.coverage),
    borderColor: darkMode ? '#00bcd4' : CHART_COLORS.coverage,
    fill: true
  }), [coverageTrends, darkMode]);

  if (loading) {
    return (
      <div className="project-metrics-trends">
        <h3>Pipeline Trends</h3>
        <div className="trends-loading">
          Loading trend data...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="project-metrics-trends">
        <h3>Pipeline Trends</h3>
        <div className="trends-error">{error}</div>
      </div>
    );
  }

  const hasMainBranchData = mainBranchTrends.length > 0;
  const hasCoverageData = coverageTrends.some(t => t.coverage !== null);

  if (!hasMainBranchData && !hasCoverageData) {
    return (
      <div className="project-metrics-trends">
        <h3>Pipeline Trends</h3>
        <div className="trends-empty">
          No trend data available for this project.
        </div>
      </div>
    );
  }

  return (
    <div className="project-metrics-trends">
      <h3>Pipeline Trends (Last {timeframe} Days)</h3>
      <div className="trends-grid">
        {hasMainBranchData && (
          <>
            <TrendChart
              title="Main Branch Failure Rate"
              labels={mainBranchLabels}
              datasets={[failureRateDataset]}
              height={200}
              yAxisLabel="%"
              yAxisMax={100}
              thresholdLine={{
                value: METRICS_THRESHOLDS.FAILURE_RATE_WARNING,
                label: `${METRICS_THRESHOLDS.FAILURE_RATE_WARNING}% Warning`,
                color: CHART_COLORS.warning
              }}
            />
            <TrendChart
              title="Build Duration"
              labels={mainBranchLabels}
              datasets={[durationDataset]}
              height={200}
              yAxisLabel="seconds"
            />
          </>
        )}
        {hasCoverageData && (
          <TrendChart
            title="Code Coverage"
            labels={coverageLabels}
            datasets={[coverageDataset]}
            height={200}
            yAxisLabel="%"
            yAxisMax={100}
            thresholdLine={{
              value: METRICS_THRESHOLDS.COVERAGE_TARGET,
              label: `${METRICS_THRESHOLDS.COVERAGE_TARGET}% Target`,
              color: CHART_COLORS.success
            }}
          />
        )}
      </div>
    </div>
  );
};

export default ProjectMetricsTrends;
