/**
 * SonarQube / SonarCloud API Service
 *
 * Authenticated client for fetching project metrics, quality gate status,
 * issues by severity, and metric history. Works with both SonarCloud and
 * on-prem SonarQube 9.x+.
 *
 * Auth: Uses HTTP Basic with token as username, empty password.
 * Docs: https://sonarcloud.io/web_api
 */

import { logger } from '../utils/logger';
import type {
  SonarConfig,
  SonarMetricKey,
  SonarMeasure,
  SonarProjectMetrics,
  QualityGateResult,
  QualityGateStatus,
  SonarIssuesResponse,
  SonarIssueSeverityCounts,
  SonarIssueType,
  SonarMetricHistory,
} from '../types/sonar';

/** Default metric keys to fetch for the dashboard overview */
const DEFAULT_METRICS: SonarMetricKey[] = [
  'coverage',
  'bugs',
  'vulnerabilities',
  'code_smells',
  'duplicated_lines_density',
  'ncloc',
  'reliability_rating',
  'security_rating',
  'sqale_rating',
  'sqale_index',
  'security_hotspots',
];

class SonarApiService {
  private baseUrl: string;
  private token: string;
  private organization?: string;

  constructor(config: SonarConfig) {
    this.baseUrl = config.baseUrl.replace(/\/+$/, '');
    this.token = config.token;
    this.organization = config.organization;
  }

  // ─── Internal helpers ───────────────────────────────────────

  /** Build Authorization header (Basic auth: token as username, no password) */
  private getHeaders(): HeadersInit {
    return {
      'Accept': 'application/json',
      'Authorization': `Basic ${btoa(this.token + ':')}`,
    };
  }

  /** Build full URL with query params, injecting organization if set */
  private buildUrl(path: string, params: Record<string, string | undefined> = {}): string {
    const url = new URL(`${this.baseUrl}/api${path}`);
    if (this.organization) {
      url.searchParams.set('organization', this.organization);
    }
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== '') {
        url.searchParams.set(key, value);
      }
    }
    return url.toString();
  }

  /** Fetch with auth and error handling */
  private async fetch<T>(path: string, params: Record<string, string | undefined> = {}): Promise<T> {
    const url = this.buildUrl(path, params);
    logger.debug(`[Sonar] GET ${url}`);

    const response = await fetch(url, { headers: this.getHeaders() });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      const msg = `Sonar API error: ${response.status} ${response.statusText} — ${body.slice(0, 500)}`;
      logger.error(msg);
      throw new Error(msg);
    }

    return response.json();
  }

  // ─── Public API ─────────────────────────────────────────────

  /**
   * Test connectivity and authentication.
   * Returns true if the token is valid.
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.fetch<{ valid: boolean }>('/authentication/validate');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get project metrics (coverage, bugs, vulnerabilities, smells, etc.)
   */
  async getProjectMetrics(
    projectKey: string,
    metricKeys: SonarMetricKey[] = DEFAULT_METRICS
  ): Promise<SonarProjectMetrics> {
    interface MeasuresResponse {
      component: {
        measures: SonarMeasure[];
      };
    }

    const data = await this.fetch<MeasuresResponse>('/measures/component', {
      component: projectKey,
      metricKeys: metricKeys.join(','),
    });

    const measures = data.component.measures;
    const get = (key: string): string | undefined =>
      measures.find(m => m.metric === key)?.value;

    return {
      projectKey,
      measures,
      coverage: get('coverage') !== undefined ? parseFloat(get('coverage')!) : null,
      bugs: parseInt(get('bugs') || '0', 10),
      vulnerabilities: parseInt(get('vulnerabilities') || '0', 10),
      codeSmells: parseInt(get('code_smells') || '0', 10),
      duplicatedLinesDensity: get('duplicated_lines_density') !== undefined
        ? parseFloat(get('duplicated_lines_density')!)
        : null,
      linesOfCode: parseInt(get('ncloc') || '0', 10),
      reliabilityRating: parseInt(get('reliability_rating') || '0', 10),
      securityRating: parseInt(get('security_rating') || '0', 10),
      maintainabilityRating: parseInt(get('sqale_rating') || '0', 10),
      technicalDebt: parseInt(get('sqale_index') || '0', 10),
      securityHotspots: parseInt(get('security_hotspots') || '0', 10),
    };
  }

  /**
   * Get quality gate status for a project.
   */
  async getQualityGateStatus(projectKey: string): Promise<QualityGateResult> {
    interface QGResponse {
      projectStatus: {
        status: QualityGateStatus;
        conditions: Array<{
          status: QualityGateStatus;
          metricKey: string;
          comparator: 'GT' | 'LT';
          errorThreshold: string;
          actualValue: string;
        }>;
        ignoredConditions: boolean;
      };
    }

    const data = await this.fetch<QGResponse>('/qualitygates/project_status', {
      projectKey,
    });

    return {
      status: data.projectStatus.status,
      conditions: data.projectStatus.conditions,
      ignoredConditions: data.projectStatus.ignoredConditions,
    };
  }

  /**
   * Get issues for a project, optionally filtered by type and severity.
   * Returns paginated results with facet counts.
   */
  async getIssues(
    projectKey: string,
    options: {
      types?: SonarIssueType[];
      page?: number;
      pageSize?: number;
      resolved?: boolean;
    } = {}
  ): Promise<SonarIssuesResponse> {
    const { types, page = 1, pageSize = 100, resolved = false } = options;

    return this.fetch<SonarIssuesResponse>('/issues/search', {
      componentKeys: projectKey,
      types: types?.join(','),
      p: String(page),
      ps: String(pageSize),
      resolved: String(resolved),
      facets: 'severities',
    });
  }

  /**
   * Get aggregated issue counts by severity for a project.
   */
  async getIssueSeverityCounts(
    projectKey: string,
    types?: SonarIssueType[]
  ): Promise<SonarIssueSeverityCounts> {
    const data = await this.getIssues(projectKey, { types, pageSize: 1 });

    const counts: SonarIssueSeverityCounts = {
      blocker: 0,
      critical: 0,
      major: 0,
      minor: 0,
      info: 0,
      total: data.total,
    };

    const severityFacet = data.facets?.find(f => f.property === 'severities');
    if (severityFacet) {
      for (const { val, count } of severityFacet.values) {
        const key = val.toLowerCase() as keyof Omit<SonarIssueSeverityCounts, 'total'>;
        if (key in counts) {
          counts[key] = count;
        }
      }
    }

    return counts;
  }

  /**
   * Get metric history for trend charts.
   * @param metrics - Metric keys to fetch history for
   * @param from - ISO date string (optional, e.g. "2026-01-01")
   * @param to - ISO date string (optional)
   */
  async getMetricHistory(
    projectKey: string,
    metrics: SonarMetricKey[],
    from?: string,
    to?: string
  ): Promise<SonarMetricHistory[]> {
    interface HistoryResponse {
      measures: SonarMetricHistory[];
    }

    const data = await this.fetch<HistoryResponse>('/measures/search_history', {
      component: projectKey,
      metrics: metrics.join(','),
      from,
      to,
      ps: '1000',
    });

    return data.measures;
  }
}

export default SonarApiService;
