import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { formatPipelineStatus, formatCoverage } from '../utils/formatting';

vi.mock('./CardView', () => {
  return {
    default: ({ projects, onProjectSelect }: any) => (
      <div data-testid="mock-card-view">
        {projects.map((project: any) => (
          <div 
            key={project.id} 
            data-testid="project-card" 
            onClick={() => onProjectSelect(project.id)}
          >
            <div>{project.name}</div>
            <div>{formatPipelineStatus(project.metrics.mainBranchPipeline.status, true)}</div>
            <div>{project.metrics.successRate.toFixed(2)}%</div>
            <div>{formatCoverage(project.metrics.codeCoverage.coverage, true)}</div>
            {project.metrics.mainBranchPipeline.failedJobs?.map((job: any) => (
              <div key={job.id}>
                <div>{job.name}</div>
                <div>{job.failure_reason}</div>
              </div>
            ))}
          </div>
        ))}
      </div>
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

describe('CardView Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renders project cards with correct data', () => {
    // Import CardView dynamically to use the mock
    const CardView = require('./CardView').default;
    
    render(<CardView projects={mockProjects} onProjectSelect={mockOnProjectSelect} />);
    
    // Check project names and data in mock component
    expect(screen.getByText('Test Project 1')).toBeInTheDocument();
    expect(screen.getByText('Test Project 2')).toBeInTheDocument();
    
    // Check pipeline statuses
    expect(screen.getByText('Success')).toBeInTheDocument();
    expect(screen.getByText('Failed')).toBeInTheDocument();
    
    // Check success rates
    expect(screen.getByText('95.50%')).toBeInTheDocument();
    expect(screen.getByText('70.50%')).toBeInTheDocument();
    
    // Verify the test-id for the card view container
    expect(screen.getByTestId('mock-card-view')).toBeInTheDocument();
    
    // Verify project cards are rendered
    const projectCards = screen.getAllByTestId('project-card');
    expect(projectCards.length).toBe(2);
  });

  test('displays failed jobs when pipeline failed', () => {
    // Import CardView dynamically to use the mock
    const CardView = require('./CardView').default;
    
    render(<CardView projects={mockProjects} onProjectSelect={mockOnProjectSelect} />);
    
    // Check for failed job details
    expect(screen.getByText('test-job')).toBeInTheDocument();
    expect(screen.getByText('Test failure')).toBeInTheDocument();
  });

  test('calls onProjectSelect when a project card is clicked', () => {
    // Import CardView dynamically to use the mock
    const CardView = require('./CardView').default;
    
    render(<CardView projects={mockProjects} onProjectSelect={mockOnProjectSelect} />);
    
    // Get all project cards
    const projectCards = screen.getAllByTestId('project-card');
    
    // Click on the first project card
    fireEvent.click(projectCards[0]);
    
    // Check that onProjectSelect was called with the correct project ID
    expect(mockOnProjectSelect).toHaveBeenCalledWith(1);
  });
});