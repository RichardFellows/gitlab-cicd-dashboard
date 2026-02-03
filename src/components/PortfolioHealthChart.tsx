import { FC, useMemo } from 'react';
import { Project } from '../types';
import { calculatePortfolioHealth } from '../utils/healthScore';
import { CHART_COLORS, CHART_COLORS_DARK } from '../utils/constants';
import { Doughnut } from 'react-chartjs-2';
import HealthBadge from './HealthBadge';
import { getHealthBand } from '../utils/healthScore';
import '../styles/PortfolioHealthChart.css';

interface PortfolioHealthChartProps {
  projects: Project[];
  darkMode?: boolean;
}

const PortfolioHealthChart: FC<PortfolioHealthChartProps> = ({
  projects,
  darkMode = false,
}) => {
  const portfolio = useMemo(
    () => calculatePortfolioHealth(projects),
    [projects]
  );

  const colors = darkMode ? CHART_COLORS_DARK : CHART_COLORS;

  const chartData = {
    labels: ['Healthy', 'Warning', 'Critical'],
    datasets: [
      {
        data: [
          portfolio.distribution.healthy,
          portfolio.distribution.warning,
          portfolio.distribution.critical,
        ],
        backgroundColor: [colors.success, colors.warning, colors.danger],
        borderWidth: 0,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '60%',
    plugins: {
      legend: {
        display: false,
      },
    },
  };

  const band = getHealthBand(portfolio.averageScore);

  return (
    <div className="portfolio-health">
      <h3 className="portfolio-health__title">Portfolio Health</h3>
      <div className="portfolio-health__content">
        <div className="portfolio-health__badge-area">
          <HealthBadge score={portfolio.averageScore} band={band} size="lg" />
          <span className="portfolio-health__avg-label">Average</span>
        </div>
        <div className="portfolio-health__chart-area">
          <div className="portfolio-health__chart">
            <Doughnut data={chartData} options={chartOptions} />
          </div>
          <div className="portfolio-health__legend">
            <div className="portfolio-health__legend-item">
              <span
                className="portfolio-health__legend-color"
                style={{ backgroundColor: colors.success }}
              />
              <span>Healthy ({portfolio.distribution.healthy})</span>
            </div>
            <div className="portfolio-health__legend-item">
              <span
                className="portfolio-health__legend-color"
                style={{ backgroundColor: colors.warning }}
              />
              <span>Warning ({portfolio.distribution.warning})</span>
            </div>
            <div className="portfolio-health__legend-item">
              <span
                className="portfolio-health__legend-color"
                style={{ backgroundColor: colors.danger }}
              />
              <span>Critical ({portfolio.distribution.critical})</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PortfolioHealthChart;
