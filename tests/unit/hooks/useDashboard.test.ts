/**
 * Unit tests for useDashboard hook
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useDashboard } from '@/components/hooks/useDashboard';
import type { UserDto, PeerDto, Page } from '@/types';

// Mock API module
vi.mock('@/lib/api', () => ({
  api: {
    getUser: vi.fn(),
    getPeers: vi.fn(),
    claimPeer: vi.fn(),
    updatePeer: vi.fn(),
    revokePeer: vi.fn(),
    downloadPeer: vi.fn(),
  },
}));

import { api } from '@/lib/api';

const mockUser: UserDto = {
  id: 'user-123',
  email: 'user@example.com',
  roles: ['user'],
  status: 'active',
  peer_limit: 5,
  created_at: '2024-01-01T00:00:00Z',
  requires_password_change: false,
};

const mockPeer: PeerDto = {
  id: 'peer-123',
  public_key: 'mock-public-key-abcdef1234567890',
  status: 'active',
  friendly_name: 'my-config',
  claimed_at: '2024-01-01T00:00:00Z',
  revoked_at: null,
};

const mockPeersPage: Page<PeerDto> = {
  items: [mockPeer],
  page: 1,
  size: 20,
  total: 1,
};

describe('useDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should initialize with loading state', () => {
    vi.mocked(api.getUser).mockImplementation(() => new Promise(() => {}));
    vi.mocked(api.getPeers).mockImplementation(() => new Promise(() => {}));

    const { result } = renderHook(() => useDashboard());

    expect(result.current.loading).toBe(true);
    expect(result.current.peers).toEqual([]);
    expect(result.current.user).toBeUndefined();
  });

  it('should fetch user and peers on mount', async () => {
    vi.mocked(api.getUser).mockResolvedValue(mockUser);
    vi.mocked(api.getPeers).mockResolvedValue(mockPeersPage);

    const { result } = renderHook(() => useDashboard());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.user).toEqual(mockUser);
    expect(result.current.peers).toEqual(mockPeersPage.items);
    expect(result.current.claimedCount).toBe(1);
    expect(result.current.peerLimit).toBe(5);
    expect(api.getUser).toHaveBeenCalledOnce();
    expect(api.getPeers).toHaveBeenCalledWith('active');
  });

  it('should handle fetch errors', async () => {
    const errorMessage = 'Network error';
    vi.mocked(api.getUser).mockRejectedValue(new Error(errorMessage));
    vi.mocked(api.getPeers).mockResolvedValue(mockPeersPage);

    const { result } = renderHook(() => useDashboard());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe(errorMessage);
  });

  it('should claim a new peer', async () => {
    vi.mocked(api.getUser).mockResolvedValue(mockUser);
    vi.mocked(api.getPeers).mockResolvedValue(mockPeersPage);

    const newPeer: PeerDto = {
      ...mockPeer,
      id: 'peer-456',
      friendly_name: 'new-config',
    };
    vi.mocked(api.claimPeer).mockResolvedValue(newPeer);

    const { result } = renderHook(() => useDashboard());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const claimedPeer = await result.current.claimPeer();

    expect(claimedPeer).toEqual(newPeer);
    expect(result.current.peers).toHaveLength(2);
    expect(result.current.peers).toContainEqual(newPeer);
    expect(result.current.claimedCount).toBe(2);
  });

  it('should update a peer', async () => {
    vi.mocked(api.getUser).mockResolvedValue(mockUser);
    vi.mocked(api.getPeers).mockResolvedValue(mockPeersPage);

    const updatedPeer: PeerDto = {
      ...mockPeer,
      friendly_name: 'updated-name',
    };
    vi.mocked(api.updatePeer).mockResolvedValue(updatedPeer);

    const { result } = renderHook(() => useDashboard());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const peer = await result.current.updatePeer(mockPeer.id, {
      friendly_name: 'updated-name',
    });

    expect(peer).toEqual(updatedPeer);
    expect(result.current.peers[0].friendly_name).toBe('updated-name');
  });

  it('should revoke a peer', async () => {
    vi.mocked(api.getUser).mockResolvedValue(mockUser);
    vi.mocked(api.getPeers).mockResolvedValue(mockPeersPage);
    vi.mocked(api.revokePeer).mockResolvedValue();

    const { result } = renderHook(() => useDashboard());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.peers).toHaveLength(1);

    const success = await result.current.revokePeer(mockPeer.id);

    expect(success).toBe(true);
    expect(result.current.peers).toHaveLength(0);
    expect(result.current.claimedCount).toBe(0);
  });

  it('should handle revoke errors', async () => {
    vi.mocked(api.getUser).mockResolvedValue(mockUser);
    vi.mocked(api.getPeers).mockResolvedValue(mockPeersPage);
    vi.mocked(api.revokePeer).mockRejectedValue(new Error('Revoke failed'));

    const { result } = renderHook(() => useDashboard());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const success = await result.current.revokePeer(mockPeer.id);

    expect(success).toBe(false);
    expect(result.current.peers).toHaveLength(1); // Peer not removed on error
  });

  it('should download a peer', async () => {
    vi.mocked(api.getUser).mockResolvedValue(mockUser);
    vi.mocked(api.getPeers).mockResolvedValue(mockPeersPage);

    const { result } = renderHook(() => useDashboard());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    result.current.downloadPeer(mockPeer.id);

    expect(api.downloadPeer).toHaveBeenCalledWith(mockPeer.id);
  });

  it('should refresh data', async () => {
    vi.mocked(api.getUser).mockResolvedValue(mockUser);
    vi.mocked(api.getPeers).mockResolvedValue(mockPeersPage);

    const { result } = renderHook(() => useDashboard());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(api.getUser).toHaveBeenCalledTimes(1);
    expect(api.getPeers).toHaveBeenCalledTimes(1);

    await result.current.refresh();

    expect(api.getUser).toHaveBeenCalledTimes(2);
    expect(api.getPeers).toHaveBeenCalledTimes(2);
  });
});

