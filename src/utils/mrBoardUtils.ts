import { MRWithProject, MRBoardFilters, MRSortOption, MRPipelineGroup } from '../types';

/**
 * Group MRs by pipeline status into Kanban columns
 * Draft MRs go to draft group regardless of pipeline status
 */
export function groupMRsByPipelineStatus(
  mrs: MRWithProject[]
): Record<MRPipelineGroup, MRWithProject[]> {
  const groups: Record<MRPipelineGroup, MRWithProject[]> = {
    passing: [],
    failing: [],
    running: [],
    draft: [],
    'no-pipeline': [],
  };

  for (const mr of mrs) {
    // Draft MRs go to draft group regardless of pipeline
    if (mr.draft || mr.title.toLowerCase().startsWith('draft:')) {
      groups.draft.push(mr);
      continue;
    }

    if (!mr.head_pipeline) {
      groups['no-pipeline'].push(mr);
      continue;
    }

    switch (mr.head_pipeline.status) {
      case 'success':
        groups.passing.push(mr);
        break;
      case 'failed':
        groups.failing.push(mr);
        break;
      case 'running':
      case 'pending':
      case 'created':
        groups.running.push(mr);
        break;
      default:
        groups['no-pipeline'].push(mr);
    }
  }

  return groups;
}

/**
 * Filter MRs by project, author, and "My MRs" toggle
 */
export function filterMRs(
  mrs: MRWithProject[],
  filters: MRBoardFilters
): MRWithProject[] {
  let filtered = mrs;

  // Filter by project IDs
  if (filters.projectIds.length > 0) {
    filtered = filtered.filter(mr => filters.projectIds.includes(mr.projectId));
  }

  // Filter by author search (match username or name)
  if (filters.authorSearch.trim()) {
    const search = filters.authorSearch.trim().toLowerCase();
    filtered = filtered.filter(mr => {
      const username = mr.author?.username?.toLowerCase() || '';
      const name = mr.author?.name?.toLowerCase() || '';
      return username.includes(search) || name.includes(search);
    });
  }

  // Filter by "My MRs" toggle
  if (filters.myMRsOnly && filters.myUsername.trim()) {
    const myUsername = filters.myUsername.trim().toLowerCase();
    filtered = filtered.filter(
      mr => mr.author?.username?.toLowerCase() === myUsername
    );
  }

  return filtered;
}

/**
 * Sort MRs by the selected sort option
 */
export function sortMRs(
  mrs: MRWithProject[],
  sortBy: MRSortOption
): MRWithProject[] {
  const sorted = [...mrs];

  switch (sortBy) {
    case 'newest':
      sorted.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      break;
    case 'oldest':
      sorted.sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
      break;
    case 'last-activity':
      sorted.sort(
        (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );
      break;
    case 'project-name':
      sorted.sort((a, b) => a.projectName.localeCompare(b.projectName));
      break;
  }

  return sorted;
}

/**
 * Get relative time string from a date
 */
export function getRelativeTime(dateString: string): string {
  const now = new Date().getTime();
  const then = new Date(dateString).getTime();
  const diffMs = now - then;

  const minutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return '1 day ago';
  return `${days} days ago`;
}

/**
 * Get column configuration for each pipeline group
 */
export function getColumnConfig(group: MRPipelineGroup): {
  title: string;
  icon: string;
  colorClass: string;
} {
  switch (group) {
    case 'passing':
      return { title: 'Pipeline Passing', icon: '✅', colorClass: 'mr-col-passing' };
    case 'failing':
      return { title: 'Pipeline Failing', icon: '❌', colorClass: 'mr-col-failing' };
    case 'running':
      return { title: 'Pipeline Running', icon: '⏳', colorClass: 'mr-col-running' };
    case 'draft':
      return { title: 'Draft', icon: '📝', colorClass: 'mr-col-draft' };
    case 'no-pipeline':
      return { title: 'No Pipeline', icon: '❓', colorClass: 'mr-col-no-pipeline' };
  }
}
