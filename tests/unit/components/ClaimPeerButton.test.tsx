/**
 * Unit tests for ClaimPeerButton component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ClaimPeerButton } from '@/components/ClaimPeerButton';
import type { PeerDto } from '@/types';

// Mock fetch
global.fetch = vi.fn();

const mockPeer: PeerDto = {
  id: 'peer-123',
  public_key: 'mock-public-key',
  status: 'active',
  friendly_name: 'test-config',
  claimed_at: '2024-01-01T00:00:00Z',
  revoked_at: null,
};

describe('ClaimPeerButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render button with correct text', () => {
    render(
      <ClaimPeerButton
        disabled={false}
        onClaimSuccess={vi.fn()}
        onClaimError={vi.fn()}
      />
    );

    expect(screen.getByText(/get new configuration/i)).toBeInTheDocument();
  });

  it('should be disabled when disabled prop is true', () => {
    render(
      <ClaimPeerButton
        disabled={true}
        onClaimSuccess={vi.fn()}
        onClaimError={vi.fn()}
      />
    );

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });

  it('should call API and onClaimSuccess on successful claim', async () => {
    const user = userEvent.setup();
    const onClaimSuccess = vi.fn();
    const onClaimError = vi.fn();

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockPeer,
    } as Response);

    render(
      <ClaimPeerButton
        disabled={false}
        onClaimSuccess={onClaimSuccess}
        onClaimError={onClaimError}
      />
    );

    const button = screen.getByRole('button');
    await user.click(button);

    await waitFor(() => {
      expect(onClaimSuccess).toHaveBeenCalledWith(mockPeer);
    });

    expect(onClaimError).not.toHaveBeenCalled();
    expect(fetch).toHaveBeenCalledWith('/api/v1/peers/claim', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
  });

  it('should show loading state during claim', async () => {
    const user = userEvent.setup();

    vi.mocked(fetch).mockImplementationOnce(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                ok: true,
                json: async () => mockPeer,
              } as Response),
            100
          )
        )
    );

    render(
      <ClaimPeerButton
        disabled={false}
        onClaimSuccess={vi.fn()}
        onClaimError={vi.fn()}
      />
    );

    const button = screen.getByRole('button');
    await user.click(button);

    // Should show loading text
    expect(screen.getByText(/claiming/i)).toBeInTheDocument();
    expect(button).toBeDisabled();

    await waitFor(() => {
      expect(screen.getByText(/get new configuration/i)).toBeInTheDocument();
    });
  });

  it('should call onClaimError on API error', async () => {
    const user = userEvent.setup();
    const onClaimSuccess = vi.fn();
    const onClaimError = vi.fn();

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      json: async () => ({
        error: 'LimitExceeded',
        message: 'You have reached your peer limit',
      }),
    } as Response);

    render(
      <ClaimPeerButton
        disabled={false}
        onClaimSuccess={onClaimSuccess}
        onClaimError={onClaimError}
      />
    );

    const button = screen.getByRole('button');
    await user.click(button);

    await waitFor(() => {
      expect(onClaimError).toHaveBeenCalled();
    });

    expect(onClaimSuccess).not.toHaveBeenCalled();
    const errorCall = onClaimError.mock.calls[0][0] as Error;
    expect(errorCall.message).toContain('peer limit');
  });

  it('should handle network errors', async () => {
    const user = userEvent.setup();
    const onClaimError = vi.fn();

    vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'));

    render(
      <ClaimPeerButton
        disabled={false}
        onClaimSuccess={vi.fn()}
        onClaimError={onClaimError}
      />
    );

    const button = screen.getByRole('button');
    await user.click(button);

    await waitFor(() => {
      expect(onClaimError).toHaveBeenCalled();
    });
  });

  it('should not allow multiple simultaneous claims', async () => {
    const user = userEvent.setup();

    vi.mocked(fetch).mockImplementationOnce(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                ok: true,
                json: async () => mockPeer,
              } as Response),
            100
          )
        )
    );

    render(
      <ClaimPeerButton
        disabled={false}
        onClaimSuccess={vi.fn()}
        onClaimError={vi.fn()}
      />
    );

    const button = screen.getByRole('button');

    // Click twice quickly
    await user.click(button);
    await user.click(button);

    // Should only call API once
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});

