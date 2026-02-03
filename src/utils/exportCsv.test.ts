import { describe, it, expect, vi, beforeEach } from 'vitest';
import { escapeCsv, generateProjectsCsv, generateEnvironmentCsv, downloadCsv } from './exportCsv';
import { Project, DeploymentsByEnv } from '../types';

// Helper to create a mock project
function mockProject(overrides: Partial<Project> = {}): Project {
  return {
    id: 1,
    name: 'Test Project',
    path_with_namespace: 'group/test-project',
    web_url: 'https://gitlab.com/group/test-project',
    metrics: {
      totalPipelines: 50,
      successfulPipelines: 45,
      failedPipelines: 3,
      canceledPipelines: 1,
      runningPipelines: 1,
      successRate: 90.0,
      avgDuration: 125.5,
      testMetrics: { total: 100, success: 95, failed: 5, skipped: 0, available: true },
      mainBranchPipeline: {
        id: 1,
        status: 'success',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      },
      codeCoverage: { coverage: 85.5, available: true },
      mergeRequestCounts: { totalOpen: 3, drafts: 1 },
      recentCommits: [],
    },
    ...overrides,
  };
}

describe('escapeCsv', () => {
  it('returns plain values unchanged', () => {
    expect(escapeCsv('hello')).toBe('hello');
    expect(escapeCsv('123')).toBe('123');
  });

  it('wraps values with commas in double quotes', () => {
    expect(escapeCsv('hello, world')).toBe('"hello, world"');
  });

  it('wraps values with double quotes and escapes them', () => {
    expect(escapeCsv('say "hi"')).toBe('"say ""hi"""');
  });

  it('wraps values with newlines in double quotes', () => {
    expect(escapeCsv('line1\nline2')).toBe('"line1\nline2"');
  });

  it('handles values with commas and quotes together', () => {
    expect(escapeCsv('a "b", c')).toBe('"a ""b"", c"');
  });

  it('handles empty string', () => {
    expect(escapeCsv('')).toBe('');
  });
});

describe('generateProjectsCsv', () => {
  it('generates CSV with correct headers', () => {
    const csv = generateProjectsCsv([]);
    const lines = csv.split('\n');
    // First char is BOM
    expect(lines[0].charCodeAt(0)).toBe(0xFEFF);
    const headerLine = lines[0].substring(1); // strip BOM
    expect(headerLine).toBe(
      'Project Name,Project Path,Pipeline Count,Success Rate (%),Failed Pipelines,Avg Duration (s),Coverage (%),Open MRs,Draft MRs,Main Branch Status'
    );
  });

  it('generates one row per project', () => {
    const projects = [mockProject({ id: 1, name: 'Project A' }), mockProject({ id: 2, name: 'Project B' })];
    const csv = generateProjectsCsv(projects);
    const lines = csv.split('\n');
    expect(lines).toHaveLength(3); // header + 2 rows
  });

  it('formats values correctly', () => {
    const project = mockProject({
      name: 'My Project',
      path_with_namespace: 'group/my-project',
    });
    project.metrics.totalPipelines = 42;
    project.metrics.successRate = 87.654;
    project.metrics.failedPipelines = 5;
    project.metrics.avgDuration = 303.7;
    project.metrics.codeCoverage = { coverage: 72.12, available: true };
    project.metrics.mergeRequestCounts = { totalOpen: 2, drafts: 0 };
    project.metrics.mainBranchPipeline.status = 'failed';

    const csv = generateProjectsCsv([project]);
    const dataRow = csv.split('\n')[1];
    const cols = dataRow.split(',');
    expect(cols[0]).toBe('My Project');
    expect(cols[1]).toBe('group/my-project');
    expect(cols[2]).toBe('42');
    expect(cols[3]).toBe('87.65');
    expect(cols[4]).toBe('5');
    expect(cols[5]).toBe('304'); // rounded
    expect(cols[6]).toBe('72.12');
    expect(cols[7]).toBe('2');
    expect(cols[8]).toBe('0');
    expect(cols[9]).toBe('failed');
  });

  it('outputs N/A for null coverage', () => {
    const project = mockProject();
    project.metrics.codeCoverage = { coverage: null, available: false };
    const csv = generateProjectsCsv([project]);
    const dataRow = csv.split('\n')[1];
    expect(dataRow).toContain('N/A');
  });

  it('escapes project names with commas', () => {
    const project = mockProject({ name: 'Project A, B' });
    const csv = generateProjectsCsv([project]);
    expect(csv).toContain('"Project A, B"');
  });

  it('returns only header for empty array', () => {
    const csv = generateProjectsCsv([]);
    const lines = csv.split('\n');
    expect(lines).toHaveLength(1);
  });

  it('starts with UTF-8 BOM', () => {
    const csv = generateProjectsCsv([]);
    expect(csv.charCodeAt(0)).toBe(0xFEFF);
  });
});

describe('generateEnvironmentCsv', () => {
  it('generates CSV with correct headers', () => {
    const csv = generateEnvironmentCsv(new Map(), []);
    const lines = csv.split('\n');
    const headerLine = lines[0].substring(1); // strip BOM
    expect(headerLine).toBe(
      'Project Name,Dev Version,Dev Status,Sit Version,Sit Status,Uat Version,Uat Status,Prod Version,Prod Status'
    );
  });

  it('includes deployment data for projects', () => {
    const project = mockProject({ id: 10, name: 'Svc A' });
    const deploymentCache = new Map<number, DeploymentsByEnv>();
    deploymentCache.set(10, {
      projectId: 10,
      loading: false,
      deployments: {
        dev: {
          jobId: 1, jobName: 'deploy', environment: 'dev',
          version: '1.2.3', status: 'success', timestamp: '2026-01-01T00:00:00Z',
          pipelineId: 100, pipelineRef: 'main', jobUrl: 'http://test',
        },
        prod: {
          jobId: 2, jobName: 'deploy', environment: 'prod',
          version: '1.2.0', status: 'failed', timestamp: '2026-01-01T00:00:00Z',
          pipelineId: 99, pipelineRef: 'main', jobUrl: 'http://test',
        },
      },
    });

    const csv = generateEnvironmentCsv(deploymentCache, [project]);
    const dataRow = csv.split('\n')[1];
    expect(dataRow).toContain('Svc A');
    expect(dataRow).toContain('1.2.3');
    expect(dataRow).toContain('success');
    expect(dataRow).toContain('1.2.0');
    expect(dataRow).toContain('failed');
  });

  it('uses dash for missing deployments', () => {
    const project = mockProject({ id: 5 });
    const deploymentCache = new Map<number, DeploymentsByEnv>();

    const csv = generateEnvironmentCsv(deploymentCache, [project]);
    const dataRow = csv.split('\n')[1];
    // Should have dashes for all environments
    const cols = dataRow.split(',');
    // cols: [name, dev_ver, dev_status, sit_ver, sit_status, uat_ver, uat_status, prod_ver, prod_status]
    expect(cols[1]).toBe('-');
    expect(cols[2]).toBe('-');
  });

  it('starts with UTF-8 BOM', () => {
    const csv = generateEnvironmentCsv(new Map(), []);
    expect(csv.charCodeAt(0)).toBe(0xFEFF);
  });
});

describe('downloadCsv', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('creates a blob and triggers download', () => {
    const mockUrl = 'blob:test';
    const createObjectURL = vi.fn(() => mockUrl);
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });

    const clickSpy = vi.fn();
    const appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation(() => document.body);
    const removeChildSpy = vi.spyOn(document.body, 'removeChild').mockImplementation(() => document.body);
    vi.spyOn(document, 'createElement').mockReturnValue({
      href: '',
      download: '',
      click: clickSpy,
    } as unknown as HTMLAnchorElement);

    downloadCsv('data', 'test.csv');

    expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    expect(clickSpy).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalledWith(mockUrl);
    expect(appendChildSpy).toHaveBeenCalled();
    expect(removeChildSpy).toHaveBeenCalled();
  });
});
