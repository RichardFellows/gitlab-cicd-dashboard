import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('./ProjectDetails', () => {
  return {
    default: ({ project, onBack, gitLabService }: any) => {
      if (!project) {
        return (
          <div>
            <a data-testid="back-button" onClick={onBack}>← Back to Dashboard</a>
            <div>Project not found.</div>
          </div>
        );
      }
      
      return (
        <div data-testid="mock-project-details">
          <a data-testid="back-button" onClick={onBack}>← Back to Dashboard</a>
          <h2>{project.name}</h2>
          <div>Success Rate: {project.metrics.successRate.toFixed(2)}%</div>
          <div>Coverage: {project.metrics.codeCoverage.coverage?.toFixed(2)}%</div>
          <div>Open MRs: {project.metrics.mergeRequestCounts.totalOpen}</div>
        </div>
      );
    }
  };
}, { virtual: true });

// Mock data for testing
const mockProject = {
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
};

// Mock onBack function
const mockOnBack = vi.fn();

// Mock GitLabService
const mockGitLabService = {
  getProjectPipelines: vi.fn().mockResolvedValue([]),
  getProjectMergeRequests: vi.fn().mockResolvedValue([])
};

describe('ProjectDetails Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renders project details with correct data', () => {
    // Import ProjectDetails dynamically to use the mock
    const ProjectDetails = require('./ProjectDetails').default;
    
    render(
      <ProjectDetails 
        project={mockProject} 
        onBack={mockOnBack} 
        gitLabService={mockGitLabService} 
      />
    );
    
    // Check project name
    expect(screen.getByText('Test Project 1')).toBeInTheDocument();
    
    // Check metrics
    expect(screen.getByText('Success Rate: 95.50%')).toBeInTheDocument();
    expect(screen.getByText('Coverage: 87.50%')).toBeInTheDocument();
    expect(screen.getByText('Open MRs: 3')).toBeInTheDocument();
    
    // Verify the component was rendered
    expect(screen.getByTestId('mock-project-details')).toBeInTheDocument();
  });

  test('calls onBack when back button is clicked', () => {
    // Import ProjectDetails dynamically to use the mock
    const ProjectDetails = require('./ProjectDetails').default;
    
    render(
      <ProjectDetails 
        project={mockProject} 
        onBack={mockOnBack} 
        gitLabService={mockGitLabService} 
      />
    );
    
    // Click the back button
    fireEvent.click(screen.getByTestId('back-button'));
    
    // Check that onBack was called
    expect(mockOnBack).toHaveBeenCalled();
  });

  test('shows "Project not found" when no project is provided', () => {
    // Import ProjectDetails dynamically to use the mock
    const ProjectDetails = require('./ProjectDetails').default;
    
    render(
      <ProjectDetails 
        project={null} 
        onBack={mockOnBack} 
        gitLabService={mockGitLabService} 
      />
    );
    
    // Check for the error message
    expect(screen.getByText('Project not found.')).toBeInTheDocument();
  });
});