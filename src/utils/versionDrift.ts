/**
 * Version drift detection for Environment Matrix.
 * Detects when DEV version is ahead of PROD version (unpromoted changes).
 */

import { DeploymentsByEnv } from '../types';
import { compareVersions, parseVersion } from './versionCompare';

export interface VersionDriftInfo {
  hasDrift: boolean;
  devVersion: string | null;
  prodVersion: string | null;
  message?: string;
  versionsAhead?: number;
}

/**
 * Calculate version drift between DEV and PROD environments.
 * Returns drift information including whether drift exists and a human-readable message.
 *
 * @param deploymentData - Deployment data for a project
 * @returns Version drift information
 */
export function calculateVersionDrift(deploymentData?: DeploymentsByEnv): VersionDriftInfo {
  // No deployment data or still loading
  if (!deploymentData || deploymentData.loading) {
    return {
      hasDrift: false,
      devVersion: null,
      prodVersion: null
    };
  }

  const devDeployment = deploymentData.deployments.dev;
  const prodDeployment = deploymentData.deployments.prod;

  const devVersion = devDeployment?.version ?? null;
  const prodVersion = prodDeployment?.version ?? null;

  // No drift if either version is missing
  if (!devVersion || !prodVersion) {
    return {
      hasDrift: false,
      devVersion,
      prodVersion
    };
  }

  // Compare versions: drift exists when DEV > PROD
  const comparison = compareVersions(devVersion, prodVersion);
  
  if (comparison <= 0) {
    // DEV <= PROD: no drift (or rollback scenario)
    return {
      hasDrift: false,
      devVersion,
      prodVersion
    };
  }

  // DEV > PROD: drift exists!
  // Calculate how many versions ahead (for semver)
  const devParts = parseVersion(devVersion);
  const prodParts = parseVersion(prodVersion);
  
  let versionsAhead: number | undefined;
  
  // Only calculate versionsAhead for valid semver with at least patch version
  if (devParts.length >= 3 && prodParts.length >= 3) {
    // Calculate based on patch version difference (simplistic approach)
    const devPatch = devParts[2] ?? 0;
    const prodPatch = prodParts[2] ?? 0;
    
    // If major/minor are same, diff is just patch difference
    if (devParts[0] === prodParts[0] && devParts[1] === prodParts[1]) {
      versionsAhead = devPatch - prodPatch;
    }
  }

  // Build message
  const message = versionsAhead !== undefined && versionsAhead > 1
    ? `DEV ${devVersion} is ${versionsAhead} versions ahead of PROD ${prodVersion}`
    : `DEV ${devVersion} is ahead of PROD ${prodVersion}`;

  return {
    hasDrift: true,
    devVersion,
    prodVersion,
    message,
    versionsAhead
  };
}

/**
 * Count how many projects have version drift.
 *
 * @param deploymentCache - Map of project deployments
 * @returns Count of projects with unpromoted changes
 */
export function countProjectsWithDrift(deploymentCache: Map<number, DeploymentsByEnv>): number {
  let count = 0;
  
  deploymentCache.forEach(deploymentData => {
    const drift = calculateVersionDrift(deploymentData);
    if (drift.hasDrift) {
      count++;
    }
  });

  return count;
}
