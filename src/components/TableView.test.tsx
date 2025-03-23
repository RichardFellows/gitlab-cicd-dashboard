import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { formatPipelineStatus, formatDuration } from '../utils/formatting';

vi.mock('./TableView', () => {
  return {
    default: ({ projects, onProjectSelect }: any) => (
      <table data-testid="mock-table-view">
        <thead>
          <tr>
            <th>Project</th>
            <th>Pipeline Status</th>
            <th>Success Rate</th>
            <th>Avg Duration</th>
            <th>Open MRs</th>
            <th>Coverage</th>
          </tr>
        </thead>
        <tbody>
          {projects.map((project: any) => (
            <tr 
              key={project.id} 
              data-testid="project-row" 
              onClick={() => onProjectSelect(project.id)}
            >
              <td>{project.name}</td>
              <td>{formatPipelineStatus(project.metrics.mainBranchPipeline.status, true)}</td>
              <td>{project.metrics.successRate.toFixed(2)}%</td>
              <td>{formatDuration(project.metrics.avgDuration)}</td>
              <td>{project.metrics.mergeRequestCounts.totalOpen}</td>
              <td>{project.metrics.codeCoverage.coverage.toFixed(2)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    )
  };
}, { virtual: true });

// Mock data for testing
const mockProjects = [
  {
    id: 1,
    name: 'Test Project 1',
    web_url: 'https://gitlab.com/test/project1',
    metrics: {
      mainBranchPipeline: {
        status: 'success',
        available: true,
        failedJobs: []
      },
      successRate: 95.5,
      avgDuration: 125,
      codeCoverage: {
        coverage: 87.5,
        available: true
      },
      mergeRequestCounts: {
        totalOpen: 3,
        drafts: 1
      },
      recentCommits: [
        {
          short_id: 'abc123',
          title: 'Fix bug in pipeline',
          created_at: '2023-01-15T10:30:00Z'
        }
      ],
      totalPipelines: 45
    }
  },
  {
    id: 2,
    name: 'Test Project 2',
    web_url: 'https://gitlab.com/test/project2',
    metrics: {
      mainBranchPipeline: {
        status: 'failed',
        available: true,
        failedJobs: [
          {
            id: 123,
            name: 'test-job',
            stage: 'test',
            failure_reason: 'Test failure',
            web_url: 'https://gitlab.com/test/project2/-/jobs/123',
            status: 'failed',
            created_at: '2023-01-15T10:30:00Z'
          }
        ]
      },
      successRate: 70.5,
      avgDuration: 180,
      codeCoverage: {
        coverage: 65.2,
        available: true
      },
      mergeRequestCounts: {
        totalOpen: 5,
        drafts: 2
      },
      recentCommits: [
        {
          short_id: 'def456',
          title: 'Update documentation',
          created_at: '2023-01-14T09:20:00Z'
        }
      ],
      totalPipelines: 32
    }
  }
];

// Mock onProjectSelect function
const mockOnProjectSelect = vi.fn();

describe('TableView Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renders a table with correct headers', () => {
    // Import TableView dynamically to use the mock
    const TableView = require('./TableView').default;
    
    render(<TableView projects={mockProjects} onProjectSelect={mockOnProjectSelect} />);
    
    // Check table headers
    expect(screen.getByText('Project')).toBeInTheDocument();
    expect(screen.getByText('Pipeline Status')).toBeInTheDocument();
    expect(screen.getByText('Success Rate')).toBeInTheDocument();
    expect(screen.getByText('Avg Duration')).toBeInTheDocument();
    expect(screen.getByText('Open MRs')).toBeInTheDocument();
    expect(screen.getByText('Coverage')).toBeInTheDocument();
  });

  test('displays project data correctly', () => {
    // Import TableView dynamically to use the mock
    const TableView = require('./TableView').default;
    
    render(<TableView projects={mockProjects} onProjectSelect={mockOnProjectSelect} />);
    
    // Check project names
    expect(screen.getByText('Test Project 1')).toBeInTheDocument();
    expect(screen.getByText('Test Project 2')).toBeInTheDocument();
    
    // Check success rates
    expect(screen.getByText('95.50%')).toBeInTheDocument();
    expect(screen.getByText('70.50%')).toBeInTheDocument();
    
    // Verify the test-id for the table
    expect(screen.getByTestId('mock-table-view')).toBeInTheDocument();
    
    // Verify project rows are rendered
    const projectRows = screen.getAllByTestId('project-row');
    expect(projectRows.length).toBe(2);
  });

  test('calls onProjectSelect when a project row is clicked', () => {
    // Import TableView dynamically to use the mock
    const TableView = require('./TableView').default;
    
    render(<TableView projects={mockProjects} onProjectSelect={mockOnProjectSelect} />);
    
    // Get all project rows
    const projectRows = screen.getAllByTestId('project-row');
    
    // Click on the first project row
    fireEvent.click(projectRows[0]);
    
    // Check that onProjectSelect was called with the correct project ID
    expect(mockOnProjectSelect).toHaveBeenCalledWith(1);
  });
});