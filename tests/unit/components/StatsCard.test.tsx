/**
 * Unit tests for StatsCard component
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatsCard } from '@/components/StatsCard';

describe('StatsCard', () => {
  it('should render claimed count and limit', () => {
    render(<StatsCard claimedCount={3} peerLimit={5} />);

    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('Active Configurations')).toBeInTheDocument();
  });

  it('should display normal state when below 80%', () => {
    const { container } = render(<StatsCard claimedCount={2} peerLimit={5} />);

    const countElement = screen.getByText('2');
    expect(countElement).not.toHaveClass('text-destructive');
    expect(countElement).not.toHaveClass('text-yellow-600');

    expect(
      screen.queryByText(/approaching your configuration limit/i)
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/reached your configuration limit/i)
    ).not.toBeInTheDocument();
  });

  it('should display warning state when at or above 80%', () => {
    render(<StatsCard claimedCount={4} peerLimit={5} />);

    const countElement = screen.getByText('4');
    expect(countElement).toHaveClass('text-yellow-600');
    expect(
      screen.getByText(/approaching your configuration limit/i)
    ).toBeInTheDocument();
  });

  it('should display error state when at limit', () => {
    render(<StatsCard claimedCount={5} peerLimit={5} />);

    const countElement = screen.getByText('5');
    expect(countElement).toHaveClass('text-destructive');
    expect(
      screen.getByText(/reached your configuration limit/i)
    ).toBeInTheDocument();
  });

  it('should calculate progress bar percentage correctly', () => {
    const { container } = render(<StatsCard claimedCount={3} peerLimit={10} />);

    // Progress bar should be 30%
    const progressBar = container.querySelector('div[style*="width"]');
    expect(progressBar).toHaveStyle({ width: '30%' });
  });

  it('should handle zero limit gracefully', () => {
    render(<StatsCard claimedCount={0} peerLimit={0} />);

    expect(screen.getByText('0')).toBeInTheDocument();
    // Should not crash or show NaN
  });

  it('should cap progress bar at 100%', () => {
    const { container } = render(<StatsCard claimedCount={10} peerLimit={5} />);

    const progressBar = container.querySelector('div[style*="width"]');
    // Should be capped at 100% even though claimed > limit
    expect(progressBar).toHaveStyle({ width: '100%' });
  });
});

