import React from 'react';
import { vi } from 'vitest';
import { ViewType } from '../types';

// Chart.js is already mocked in setup.ts

// Mock SummarySection to avoid Chart.js issues
vi.mock('../components/SummarySection', () => ({
  default: ({ metrics }: any) => (
    <div data-testid="mock-summary-section">
      <h2>CI/CD Dashboard Summary</h2>
      <div>Total Projects: {metrics.totalProjects}</div>
      <div>Total Pipelines: {metrics.aggregateMetrics.totalPipelines}</div>
      <div>Success Rate: {metrics.aggregateMetrics.avgSuccessRate.toFixed(2)}%</div>
    </div>
  )
}));

// Mock other components that might use Chart.js
vi.mock('../components/Dashboard', () => ({
  default: ({ metrics, viewType, onProjectSelect }: any) => {
    return (
      <div data-testid="mock-dashboard">
        <div data-testid="mock-summary-section">
          <h2>CI/CD Dashboard Summary</h2>
          <div>Total Projects: {metrics.totalProjects}</div>
        </div>
        
        {viewType === ViewType.CARD ? (
          <div data-testid="mock-card-view">
            {metrics.projects.map((project: any) => (
              <div key={project.id} data-testid="project-card" onClick={() => onProjectSelect(project.id)}>
                <div>{project.name}</div>
              </div>
            ))}
          </div>
        ) : (
          <div data-testid="mock-table-view">
            <table>
              <tbody>
                {metrics.projects.map((project: any) => (
                  <tr key={project.id} data-testid="project-row" onClick={() => onProjectSelect(project.id)}>
                    <td>{project.name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }
}));

// Mock ProjectDetails to avoid async issues
vi.mock('../components/ProjectDetails', () => ({
  default: ({ project, onBack, gitLabService }: any) => {
    if (!project) {
      return (
        <div>
          <a onClick={onBack}>← Back to Dashboard</a>
          <div>Project not found.</div>
        </div>
      );
    }
    
    return (
      <div data-testid="mock-project-details">
        <a onClick={onBack}>← Back to Dashboard</a>
        <h2>{project.name}</h2>
        <div>Success Rate: {project.metrics.successRate.toFixed(2)}%</div>
        <div>Coverage: {project.metrics.codeCoverage.coverage?.toFixed(2)}%</div>
        <div>Open MRs: {project.metrics.mergeRequestCounts.totalOpen}</div>
      </div>
    );
  }
}));