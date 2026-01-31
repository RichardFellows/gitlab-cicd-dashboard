import { FC } from 'react';
import { FailureCategory, FailureCategoryType } from '../types';

interface FailureCategoryBadgeProps {
  category: FailureCategory;
  compact?: boolean;
}

/** Colour mapping for each category */
const CATEGORY_COLOURS: Record<FailureCategoryType, string> = {
  dependency: '#e67e22',      // orange
  infrastructure: '#dc3545',  // red
  'test-failure': '#3b82f6',  // blue
  timeout: '#8b5cf6',         // purple
  unknown: '#6c757d',         // grey
};

/** Description for tooltip */
const CATEGORY_DESCRIPTIONS: Record<FailureCategoryType, string> = {
  dependency: 'Package or module dependency error detected',
  infrastructure: 'Infrastructure or system-level error detected',
  'test-failure': 'Test assertion or test framework error detected',
  timeout: 'Job or script execution timeout detected',
  unknown: 'No specific failure pattern detected',
};

const FailureCategoryBadge: FC<FailureCategoryBadgeProps> = ({
  category,
  compact = false,
}) => {
  const bgColor = CATEGORY_COLOURS[category.type];
  const description = CATEGORY_DESCRIPTIONS[category.type];
  const tooltipText = `${description}${category.matchedPattern ? ` (matched: ${category.matchedPattern})` : ''}`;

  const style: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: compact ? '2px' : '4px',
    padding: compact ? '1px 6px' : '2px 8px',
    borderRadius: '12px',
    backgroundColor: `${bgColor}22`,
    color: bgColor,
    border: `1px solid ${bgColor}44`,
    fontSize: compact ? '10px' : '11px',
    fontWeight: 500,
    lineHeight: 1.4,
    whiteSpace: 'nowrap',
    cursor: 'default',
  };

  return (
    <span
      className="failure-category-badge"
      style={style}
      title={tooltipText}
      data-category={category.type}
    >
      <span>{category.icon}</span>
      {!compact && <span>{category.label}</span>}
    </span>
  );
};

export default FailureCategoryBadge;
