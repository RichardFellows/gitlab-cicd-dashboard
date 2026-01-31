import { FC, useMemo } from 'react';
import { Project } from '../types';
import { formatDuration } from '../utils/formatting';

interface ComparisonTableProps {
  projects: Project[];
  colours: string[];
  darkMode?: boolean;
}

interface MetricRow {
  label: string;
  values: (number | null)[];
  format: (v: number | null) => string;
  higherIsBetter: boolean;
}

const ComparisonTable: FC<ComparisonTableProps> = ({
  projects,
  colours,
  darkMode = false,
}) => {
  const metricRows: MetricRow[] = useMemo(() => {
    return [
      {
        label: 'Success Rate',
        values: projects.map(p => p.metrics.successRate),
        format: (v: number | null) => (v !== null ? `${v.toFixed(1)}%` : 'N/A'),
        higherIsBetter: true,
      },
      {
        label: 'Avg Duration',
        values: projects.map(p => p.metrics.avgDuration),
        format: (v: number | null) => (v !== null ? formatDuration(v) : 'N/A'),
        higherIsBetter: false,
      },
      {
        label: 'Coverage',
        values: projects.map(p =>
          p.metrics.codeCoverage.available && p.metrics.codeCoverage.coverage !== null
            ? p.metrics.codeCoverage.coverage
            : null
        ),
        format: (v: number | null) => (v !== null ? `${v.toFixed(1)}%` : 'N/A'),
        higherIsBetter: true,
      },
      {
        label: 'Total Pipelines',
        values: projects.map(p => p.metrics.totalPipelines),
        format: (v: number | null) => (v !== null ? String(v) : '0'),
        higherIsBetter: true,
      },
      {
        label: 'Failed Pipelines',
        values: projects.map(p => p.metrics.failedPipelines),
        format: (v: number | null) => (v !== null ? String(v) : '0'),
        higherIsBetter: false,
      },
      {
        label: 'Open MRs',
        values: projects.map(p => p.metrics.mergeRequestCounts.totalOpen),
        format: (v: number | null) => (v !== null ? String(v) : '0'),
        higherIsBetter: false,
      },
      {
        label: 'Draft MRs',
        values: projects.map(p => p.metrics.mergeRequestCounts.drafts),
        format: (v: number | null) => (v !== null ? String(v) : '0'),
        higherIsBetter: false,
      },
    ];
  }, [projects]);

  /**
   * Determine best and worst indices for a row.
   * Returns { bestIdx, worstIdx } or -1 if not applicable.
   */
  const getBestWorst = (row: MetricRow): { bestIdx: number; worstIdx: number } => {
    const validIndices = row.values
      .map((v, i) => (v !== null ? i : -1))
      .filter(i => i >= 0);

    if (validIndices.length < 2) return { bestIdx: -1, worstIdx: -1 };

    let bestIdx = validIndices[0];
    let worstIdx = validIndices[0];

    for (const idx of validIndices) {
      const val = row.values[idx] as number;
      const bestVal = row.values[bestIdx] as number;
      const worstVal = row.values[worstIdx] as number;

      if (row.higherIsBetter) {
        if (val > bestVal) bestIdx = idx;
        if (val < worstVal) worstIdx = idx;
      } else {
        if (val < bestVal) bestIdx = idx;
        if (val > worstVal) worstIdx = idx;
      }
    }

    // Don't highlight if all values are equal
    if (row.values[bestIdx] === row.values[worstIdx]) {
      return { bestIdx: -1, worstIdx: -1 };
    }

    return { bestIdx, worstIdx };
  };

  return (
    <div className="comparison-table" data-testid="comparison-table">
      <h3 className="comparison-table__title">Metrics Comparison</h3>
      <div className="comparison-table__wrapper">
        <table className={`comparison-table__table ${darkMode ? 'dark' : ''}`}>
          <thead>
            <tr>
              <th>Metric</th>
              {projects.map((p, i) => (
                <th key={p.id}>
                  <span
                    className="comparison-table__swatch"
                    style={{ backgroundColor: colours[i] }}
                  />
                  {p.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {metricRows.map(row => {
              const { bestIdx, worstIdx } = getBestWorst(row);
              return (
                <tr key={row.label}>
                  <td className="comparison-table__label">{row.label}</td>
                  {row.values.map((val, i) => {
                    let cellClass = '';
                    if (i === bestIdx) cellClass = 'comparison-table__cell--best';
                    else if (i === worstIdx) cellClass = 'comparison-table__cell--worst';

                    return (
                      <td key={projects[i].id} className={cellClass}>
                        {row.format(val)}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ComparisonTable;
