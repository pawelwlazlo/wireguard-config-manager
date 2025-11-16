/**
 * Unit tests for EmptyState component
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EmptyState } from '@/components/EmptyState';

describe('EmptyState', () => {
  it('should render no-peers variant', () => {
    render(<EmptyState variant="no-peers" />);

    expect(screen.getByText(/no configurations yet/i)).toBeInTheDocument();
    expect(
      screen.getByText(/haven't claimed any wireguard configurations/i)
    ).toBeInTheDocument();
  });

  it('should render limit-reached variant', () => {
    render(<EmptyState variant="limit-reached" />);

    expect(screen.getByText(/configuration limit reached/i)).toBeInTheDocument();
    expect(
      screen.getByText(/reached your maximum number of allowed configurations/i)
    ).toBeInTheDocument();
  });

  it('should show action button for no-peers variant', () => {
    const onAction = vi.fn();
    render(<EmptyState variant="no-peers" onAction={onAction} />);

    const button = screen.getByText(/get started/i);
    expect(button).toBeInTheDocument();
  });

  it('should not show action button for limit-reached variant', () => {
    const onAction = vi.fn();
    render(<EmptyState variant="limit-reached" onAction={onAction} />);

    expect(screen.queryByText(/get started/i)).not.toBeInTheDocument();
  });

  it('should call onAction when clicking action button', async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();
    render(<EmptyState variant="no-peers" onAction={onAction} />);

    const button = screen.getByText(/get started/i);
    await user.click(button);

    expect(onAction).toHaveBeenCalledOnce();
  });

  it('should render without action button when onAction not provided', () => {
    render(<EmptyState variant="no-peers" />);

    expect(screen.queryByText(/get started/i)).not.toBeInTheDocument();
  });
});

