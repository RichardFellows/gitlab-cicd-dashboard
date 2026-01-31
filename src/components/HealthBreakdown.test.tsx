import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import HealthBreakdown from './HealthBreakdown';
import { HealthSignalResult } from '../utils/healthScore';

const mockSignals: HealthSignalResult[] = [
  {
    name: 'Failure Rate',
    weight: 0.30,
    rawValue: 5,
    score: 80,
    weighted: 24,
    unit: '%',
    description: 'Main branch failure rate: 5.0%',
  },
  {
    name: 'Code Coverage',
    weight: 0.25,
    rawValue: 65,
    score: 81,
    weighted: 20.25,
    unit: '%',
    description: 'Code coverage: 65.0%',
  },
  {
    name: 'Duration Stability',
    weight: 0.15,
    rawValue: 10,
    score: 80,
    weighted: 12,
    unit: '%',
    description: 'Duration spike: 10.0%',
  },
  {
    name: 'MR Backlog',
    weight: 0.15,
    rawValue: 3,
    score: 88,
    weighted: 13.2,
    unit: 'MRs',
    description: 'Open merge requests: 3',
  },
  {
    name: 'Recent Activity',
    weight: 0.15,
    rawValue: 15,
    score: 100,
    weighted: 15,
    unit: 'pipelines',
    description: 'Total pipelines: 15',
  },
];

describe('HealthBreakdown', () => {
  test('renders all signal names', () => {
    render(<HealthBreakdown signals={mockSignals} />);
    expect(screen.getByText('Failure Rate')).toBeInTheDocument();
    expect(screen.getByText('Code Coverage')).toBeInTheDocument();
    expect(screen.getByText('Duration Stability')).toBeInTheDocument();
    expect(screen.getByText('MR Backlog')).toBeInTheDocument();
    expect(screen.getByText('Recent Activity')).toBeInTheDocument();
  });

  test('renders signal weights as percentages', () => {
    render(<HealthBreakdown signals={mockSignals} />);
    expect(screen.getByText('30%')).toBeInTheDocument();
    expect(screen.getByText('25%')).toBeInTheDocument();
    expect(screen.getAllByText('15%')).toHaveLength(3);
  });

  test('renders score values', () => {
    render(<HealthBreakdown signals={mockSignals} />);
    expect(screen.getAllByText('80')).toHaveLength(2); // Failure Rate + Duration Stability
    expect(screen.getByText('81')).toBeInTheDocument();
    expect(screen.getByText('88')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument();
  });

  test('highlights low-scoring signals (below 50)', () => {
    const signalsWithLow: HealthSignalResult[] = [
      {
        name: 'Bad Signal',
        weight: 0.30,
        rawValue: 30,
        score: 20,
        weighted: 6,
        unit: '%',
        description: 'Test signal',
      },
      {
        name: 'Good Signal',
        weight: 0.70,
        rawValue: 90,
        score: 90,
        weighted: 63,
        unit: '%',
        description: 'Test signal',
      },
    ];
    const { container } = render(<HealthBreakdown signals={signalsWithLow} />);
    const lowRows = container.querySelectorAll('.health-breakdown__row--low');
    expect(lowRows.length).toBe(1);
  });

  test('renders N/A for null raw values', () => {
    const signalsWithNull: HealthSignalResult[] = [
      {
        name: 'Coverage',
        weight: 0.25,
        rawValue: null,
        score: 0,
        weighted: 0,
        unit: '%',
        description: 'N/A',
      },
    ];
    render(<HealthBreakdown signals={signalsWithNull} />);
    expect(screen.getByText('N/A')).toBeInTheDocument();
  });

  test('renders header columns', () => {
    render(<HealthBreakdown signals={mockSignals} />);
    expect(screen.getByText('Signal')).toBeInTheDocument();
    expect(screen.getByText('Weight')).toBeInTheDocument();
    expect(screen.getByText('Value')).toBeInTheDocument();
    expect(screen.getByText('Score')).toBeInTheDocument();
  });
});
