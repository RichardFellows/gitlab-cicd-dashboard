import { FC, useState, useEffect, useRef, useCallback } from 'react';
import GitLabApiService from '../services/GitLabApiService';
import { FailureCategory } from '../types';
import { highlightLog, categoriseFailure } from '../utils/failureDiagnosis';
import '../styles/JobLogViewer.css';

interface JobLogViewerProps {
  projectId: number;
  jobId: number;
  jobWebUrl: string;
  gitLabService: GitLabApiService;
  maxLines?: number;
  darkMode?: boolean;
  onCategoryDetected?: (category: FailureCategory) => void;
}

/** In-memory cache for fetched job logs (jobId -> log text) */
const logCache = new Map<number, string>();

const JobLogViewer: FC<JobLogViewerProps> = ({
  projectId,
  jobId,
  jobWebUrl,
  gitLabService,
  maxLines = 100,
  darkMode = false,
  onCategoryDetected,
}) => {
  const [log, setLog] = useState<string | null>(logCache.get(jobId) ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [displayLines, setDisplayLines] = useState(maxLines);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchLog = useCallback(async () => {
    // Check cache first
    if (logCache.has(jobId)) {
      const cached = logCache.get(jobId)!;
      setLog(cached);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const traceText = await gitLabService.getJobTrace(projectId, jobId);
      if (!traceText) {
        setError('Log unavailable');
        return;
      }
      logCache.set(jobId, traceText);
      setLog(traceText);
    } catch {
      setError('Failed to fetch log');
    } finally {
      setLoading(false);
    }
  }, [projectId, jobId, gitLabService]);

  useEffect(() => {
    fetchLog();
  }, [fetchLog]);

  // Detect category when log is loaded
  useEffect(() => {
    if (log && onCategoryDetected) {
      const category = categoriseFailure(log);
      onCategoryDetected(category);
    }
  }, [log, onCategoryDetected]);

  const handleShowMore = () => {
    setDisplayLines(prev => Math.min(prev + 400, 500));
  };

  const handleCopyLog = async () => {
    if (!log) return;
    try {
      await navigator.clipboard.writeText(log);
    } catch {
      // Fallback: do nothing (clipboard API may not be available)
    }
  };

  if (loading) {
    return (
      <div className={`job-log-viewer ${darkMode ? 'dark' : ''}`}>
        <div className="log-loading">
          <span className="log-spinner" />
          Loading log...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`job-log-viewer ${darkMode ? 'dark' : ''}`}>
        <div className="log-error">
          <span>{error}</span>
          <button className="log-retry-btn" onClick={fetchLog}>Retry</button>
          <a href={jobWebUrl} target="_blank" rel="noopener noreferrer" className="log-gitlab-link">
            View in GitLab ↗
          </a>
        </div>
      </div>
    );
  }

  if (!log) return null;

  const highlighted = highlightLog(log, displayLines);

  // Filter by search term if present
  const filteredLines = searchTerm
    ? highlighted.filter(line => line.text.toLowerCase().includes(searchTerm.toLowerCase()))
    : highlighted;

  return (
    <div className={`job-log-viewer ${darkMode ? 'dark' : ''}`} ref={containerRef}>
      <div className="log-toolbar">
        <input
          type="text"
          className="log-search"
          placeholder="Search log..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <button className="log-copy-btn" onClick={handleCopyLog} title="Copy log to clipboard">
          📋 Copy
        </button>
        {displayLines < 500 && (
          <button className="log-show-more-btn" onClick={handleShowMore}>
            Show More
          </button>
        )}
      </div>
      <div className="log-container">
        {filteredLines.map((line) => (
          <div
            key={line.lineNumber}
            className={`log-line log-level-${line.level}`}
          >
            <span className="log-line-number">{line.lineNumber}</span>
            <span className="log-line-text">{line.text}</span>
          </div>
        ))}
      </div>
      <div className="log-footer">
        <a href={jobWebUrl} target="_blank" rel="noopener noreferrer" className="log-gitlab-link">
          View Full Log in GitLab ↗
        </a>
      </div>
    </div>
  );
};

export default JobLogViewer;
