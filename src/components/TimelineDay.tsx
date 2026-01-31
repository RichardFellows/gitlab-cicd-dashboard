import { FC, useState, useCallback } from 'react';
import { DeploymentHistoryEntry } from '../types';
import TimelineEntry from './TimelineEntry';

interface TimelineDayProps {
  date: string;                          // ISO date string
  label: string;                         // "Today", "Yesterday", or formatted date
  entries: DeploymentHistoryEntry[];
  jiraBaseUrl?: string;
  darkMode?: boolean;
}

/**
 * Date group in the timeline — separator header + list of entries with connecting line.
 */
const TimelineDay: FC<TimelineDayProps> = ({
  date,
  label,
  entries,
  jiraBaseUrl,
  darkMode,
}) => {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const handleExpand = useCallback((jobId: number) => {
    setExpandedId(prev => prev === jobId ? null : jobId);
  }, []);

  return (
    <div className="timeline-day" data-date={date}>
      {/* Date separator header */}
      <div className="timeline-day__header">
        <div className="timeline-day__line" />
        <span className="timeline-day__label">{label}</span>
        <div className="timeline-day__line" />
      </div>

      {/* Entry list with connecting line */}
      <div className="timeline-day__entries">
        {entries.map((entry) => (
          <TimelineEntry
            key={entry.jobId}
            entry={entry}
            jiraBaseUrl={jiraBaseUrl}
            darkMode={darkMode}
            isExpanded={expandedId === entry.jobId}
            onExpand={() => handleExpand(entry.jobId)}
          />
        ))}
      </div>
    </div>
  );
};

export default TimelineDay;
