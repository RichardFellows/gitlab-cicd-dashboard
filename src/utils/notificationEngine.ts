import {
  NotificationRule,
  NotificationEntry,
  DashboardMetrics,
  Project,
  DeploymentsByEnv,
  EnvironmentName,
} from '../types';
import { METRICS_THRESHOLDS } from './constants';

/**
 * Duplicate suppression map: `${ruleId}_${projectId}` → last fired timestamp
 * In-memory only — resets on page reload (intentional to avoid stale suppressions)
 */
const suppressionMap = new Map<string, number>();
const SUPPRESSION_WINDOW = 30 * 60 * 1000; // 30 minutes

/**
 * Check if a notification should be suppressed (already fired recently)
 */
export function shouldSuppress(ruleId: string, projectId: number): boolean {
  const key = `${ruleId}_${projectId}`;
  const lastFired = suppressionMap.get(key);
  if (lastFired && Date.now() - lastFired < SUPPRESSION_WINDOW) {
    return true;
  }
  return false;
}

/**
 * Record that a notification was fired (for suppression tracking)
 */
export function recordFired(ruleId: string, projectId: number): void {
  const key = `${ruleId}_${projectId}`;
  suppressionMap.set(key, Date.now());
}

/**
 * Clear suppression for a rule+project (when condition resolves)
 */
export function clearSuppression(ruleId: string, projectId: number): void {
  const key = `${ruleId}_${projectId}`;
  suppressionMap.delete(key);
}

/**
 * Reset all suppressions (for testing)
 */
export function resetSuppressions(): void {
  suppressionMap.clear();
}

/**
 * Check if a pipeline failure transition occurred (was OK, now failed)
 */
export function checkPipelineFailure(project: Project, prevProject?: Project): boolean {
  const current = project.metrics.mainBranchPipeline;
  const prev = prevProject?.metrics.mainBranchPipeline;
  return current.status === 'failed' && (!prev || prev.status !== 'failed');
}

/**
 * Check if coverage dropped below threshold
 */
export function checkCoverageDrop(project: Project, threshold: number, prevProject?: Project): boolean {
  const current = project.metrics.codeCoverage.coverage;
  const prev = prevProject?.metrics.codeCoverage.coverage;
  if (current === null) return false;
  return current < threshold && (prev === null || prev === undefined || prev >= threshold);
}

/**
 * Check if duration spike percentage exceeds threshold
 */
export function checkDurationSpike(project: Project, threshold: number): boolean {
  const spike = project.metrics.durationSpikePercent || 0;
  return spike >= threshold;
}

/**
 * Check if a deployment to specified environment has failed
 */
export function checkDeploymentFailure(
  projectId: number,
  environment: EnvironmentName,
  deploymentCache: Map<number, DeploymentsByEnv>
): boolean {
  const deployments = deploymentCache.get(projectId);
  if (!deployments) return false;
  const deployment = deployments.deployments[environment];
  return deployment?.status === 'failed';
}

/**
 * Check if a project is in scope for a rule
 */
function isInScope(rule: NotificationRule, projectId: number): boolean {
  if (rule.scope === 'all') return true;
  return rule.scope.includes(projectId);
}

/**
 * Generate a unique notification entry ID
 */
function generateId(): string {
  return `notif_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Find previous project from previous metrics by ID
 */
function findPrevProject(projectId: number, previousMetrics: DashboardMetrics | null): Project | undefined {
  if (!previousMetrics) return undefined;
  return previousMetrics.projects.find(p => p.id === projectId);
}

/**
 * Evaluate all enabled rules against current metrics and return fired notifications
 */
export function evaluateRules(
  rules: NotificationRule[],
  currentMetrics: DashboardMetrics,
  previousMetrics: DashboardMetrics | null,
  deploymentCache: Map<number, DeploymentsByEnv>
): NotificationEntry[] {
  const fired: NotificationEntry[] = [];
  const enabledRules = rules.filter(r => r.enabled);

  for (const rule of enabledRules) {
    for (const project of currentMetrics.projects) {
      if (!isInScope(rule, project.id)) continue;

      const prevProject = findPrevProject(project.id, previousMetrics);
      let shouldFire = false;
      let message = '';
      let value = 0;

      try {
        switch (rule.type) {
          case 'pipeline-failure': {
            shouldFire = checkPipelineFailure(project, prevProject);
            if (shouldFire) {
              message = `Main branch pipeline failed`;
              value = 0;
            }
            break;
          }
          case 'coverage-drop': {
            const threshold = rule.threshold ?? METRICS_THRESHOLDS.COVERAGE_TARGET;
            shouldFire = checkCoverageDrop(project, threshold, prevProject);
            if (shouldFire) {
              const coverage = project.metrics.codeCoverage.coverage ?? 0;
              message = `Coverage dropped to ${coverage.toFixed(1)}% (threshold: ${threshold}%)`;
              value = coverage;
            }
            break;
          }
          case 'duration-spike': {
            const threshold = rule.threshold ?? METRICS_THRESHOLDS.DURATION_SPIKE_PERCENT;
            shouldFire = checkDurationSpike(project, threshold);
            if (shouldFire) {
              const spike = project.metrics.durationSpikePercent ?? 0;
              message = `Duration spike of ${spike.toFixed(0)}% detected (threshold: ${threshold}%)`;
              value = spike;
            }
            break;
          }
          case 'deployment-failure': {
            const env = rule.environment;
            if (!env) break;
            shouldFire = checkDeploymentFailure(project.id, env, deploymentCache);
            if (shouldFire) {
              message = `Deployment to ${env.toUpperCase()} failed`;
              value = 0;
            }
            break;
          }
        }
      } catch {
        // Rule evaluation errors should not break the refresh cycle
        continue;
      }

      if (shouldFire && !shouldSuppress(rule.id, project.id)) {
        recordFired(rule.id, project.id);
        fired.push({
          id: generateId(),
          ruleId: rule.id,
          ruleName: rule.name,
          ruleType: rule.type,
          projectId: project.id,
          projectName: project.name,
          message,
          value,
          timestamp: new Date().toISOString(),
          read: false,
        });
      }
    }
  }

  return fired;
}

/**
 * Send a browser notification for a fired notification entry
 */
export function sendBrowserNotification(entry: NotificationEntry, muted: boolean): void {
  if (typeof Notification === 'undefined') return;
  if (Notification.permission !== 'granted') return;

  const notification = new Notification(entry.ruleName, {
    body: `${entry.projectName}: ${entry.message}`,
    icon: '/favicon.ico',
    tag: `${entry.ruleId}_${entry.projectId}`,
    silent: muted,
  });

  notification.onclick = () => {
    window.focus();
    window.location.hash = `#project/${entry.projectId}`;
    notification.close();
  };
}
