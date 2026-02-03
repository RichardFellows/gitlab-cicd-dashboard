import { FC } from 'react';

export type SkeletonVariant = 'text' | 'circle' | 'rect';

export interface LoadingSkeletonProps {
  /** Shape of the skeleton placeholder */
  variant?: SkeletonVariant;
  /** Width (CSS value). Default: '100%' */
  width?: string | number;
  /** Height (CSS value). Default: '1em' for text, matches width for circle */
  height?: string | number;
  /** Number of skeleton rows to render (useful for text blocks) */
  count?: number;
  /** Additional CSS class names */
  className?: string;
}

const LoadingSkeleton: FC<LoadingSkeletonProps> = ({
  variant = 'text',
  width = '100%',
  height,
  count = 1,
  className = '',
}) => {
  const resolvedWidth = typeof width === 'number' ? `${width}px` : width;

  const resolvedHeight = (() => {
    if (height !== undefined) {
      return typeof height === 'number' ? `${height}px` : height;
    }
    switch (variant) {
      case 'circle':
        return resolvedWidth;
      case 'rect':
        return '80px';
      default:
        return '1em';
    }
  })();

  const borderRadius = variant === 'circle' ? '50%' : variant === 'text' ? '4px' : '8px';

  const items = Array.from({ length: count }, (_, i) => (
    <span
      key={i}
      className={`loading-skeleton ${className}`}
      role="status"
      aria-label="Loading"
      style={{
        display: 'block',
        width: resolvedWidth,
        height: resolvedHeight,
        borderRadius,
        marginBottom: count > 1 && i < count - 1 ? '8px' : undefined,
      }}
    />
  ));

  return <>{items}</>;
};

export default LoadingSkeleton;
