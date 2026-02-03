/**
 * Version comparison utilities for deployment timeline.
 * Handles semver (e.g., "2.3.45"), pipeline IID (e.g., "#123"), and null values.
 */

/**
 * Parse a version string into an array of numeric components.
 * Strips leading 'v' prefix if present.
 *
 * @param version - Version string (e.g., "2.3.45", "v1.0.0", "#123")
 * @returns Array of numeric components, or empty array if unparseable
 */
export function parseVersion(version: string): number[] {
  if (!version) return [];

  // Handle pipeline IID format: "#123"
  if (version.startsWith('#')) {
    const num = parseInt(version.slice(1), 10);
    return isNaN(num) ? [] : [num];
  }

  // Strip leading 'v' prefix
  const cleaned = version.replace(/^v/i, '');

  // Split on dots and parse each component
  const parts = cleaned.split('.');
  const nums: number[] = [];

  for (const part of parts) {
    const num = parseInt(part, 10);
    if (isNaN(num)) return nums.length > 0 ? nums : [];
    nums.push(num);
  }

  return nums;
}

/**
 * Compare two version strings.
 * Handles semver ("2.3.45"), pipeline IID ("#123"), and null.
 *
 * null is always considered "less than" any version.
 * Incompatible formats (semver vs IID) are compared by their first numeric component.
 *
 * @param a - First version string (or null)
 * @param b - Second version string (or null)
 * @returns -1 if a < b, 0 if equal, 1 if a > b
 */
export function compareVersions(a: string | null, b: string | null): number {
  // Handle nulls
  if (a === null && b === null) return 0;
  if (a === null) return -1;
  if (b === null) return 1;

  const partsA = parseVersion(a);
  const partsB = parseVersion(b);

  // If both are unparseable, compare as strings
  if (partsA.length === 0 && partsB.length === 0) {
    return a < b ? -1 : a > b ? 1 : 0;
  }

  // If only one is unparseable, it's considered "less"
  if (partsA.length === 0) return -1;
  if (partsB.length === 0) return 1;

  // Compare component by component
  const maxLen = Math.max(partsA.length, partsB.length);
  for (let i = 0; i < maxLen; i++) {
    const numA = partsA[i] ?? 0;
    const numB = partsB[i] ?? 0;
    if (numA < numB) return -1;
    if (numA > numB) return 1;
  }

  return 0;
}
