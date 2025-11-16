/**
 * Unit tests for useAdminConfig hook
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useAdminConfig } from '@/components/hooks/useAdminConfig';
import type { ConfigDto } from '@/types';

// Mock API module
vi.mock('@/lib/api', () => ({
  api: {
    getConfig: vi.fn(),
  },
}));

import { api } from '@/lib/api';

const mockConfig: ConfigDto = {
  'app.version': '1.0.0',
  'app.environment': 'production',
  'system_status': 'ok',
  'database.host': 'localhost',
  'database.port': '5432',
  'wireguard.subnet': '10.8.0.0/24',
};

const mockConfigDegraded: ConfigDto = {
  'app.version': '1.0.0',
  'system_status': 'degraded',
};

describe('useAdminConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should initialize with loading state', () => {
    vi.mocked(api.getConfig).mockImplementation(() => new Promise(() => {}));

    const { result } = renderHook(() => useAdminConfig());

    expect(result.current.loading).toBe(true);
    expect(result.current.items).toEqual([]);
    expect(result.current.status).toBe('ok');
    expect(result.current.error).toBeNull();
  });

  it('should fetch config on mount', async () => {
    vi.mocked(api.getConfig).mockResolvedValue(mockConfig);

    const { result } = renderHook(() => useAdminConfig());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.items).toHaveLength(6);
    expect(result.current.status).toBe('ok');
    expect(result.current.error).toBeNull();
    expect(api.getConfig).toHaveBeenCalledOnce();
  });

  it('should map config to sorted items', async () => {
    vi.mocked(api.getConfig).mockResolvedValue(mockConfig);

    const { result } = renderHook(() => useAdminConfig());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Check items are sorted alphabetically
    const keys = result.current.items.map((item) => item.key);
    const sortedKeys = [...keys].sort();
    expect(keys).toEqual(sortedKeys);

    // Check first item
    expect(result.current.items[0]).toEqual({
      key: 'app.environment',
      value: 'production',
    });
  });

  it('should derive system status from config', async () => {
    vi.mocked(api.getConfig).mockResolvedValue(mockConfig);

    const { result } = renderHook(() => useAdminConfig());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.status).toBe('ok');
  });

  it('should handle degraded status', async () => {
    vi.mocked(api.getConfig).mockResolvedValue(mockConfigDegraded);

    const { result } = renderHook(() => useAdminConfig());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.status).toBe('degraded');
  });

  it('should default to ok when no system_status key', async () => {
    const configWithoutStatus: ConfigDto = {
      'app.version': '1.0.0',
    };

    vi.mocked(api.getConfig).mockResolvedValue(configWithoutStatus);

    const { result } = renderHook(() => useAdminConfig());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.status).toBe('ok');
  });

  it('should filter out empty keys and invalid values', async () => {
    const invalidConfig: ConfigDto = {
      'valid.key': 'valid value',
      '': 'empty key',
      '  ': 'whitespace key',
    };

    vi.mocked(api.getConfig).mockResolvedValue(invalidConfig);

    const { result } = renderHook(() => useAdminConfig());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Only valid key should be included
    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0]).toEqual({
      key: 'valid.key',
      value: 'valid value',
    });
  });

  it('should handle fetch errors', async () => {
    const errorMessage = 'Network error';
    vi.mocked(api.getConfig).mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() => useAdminConfig());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe(errorMessage);
    expect(result.current.items).toEqual([]);
  });

  it('should handle permission errors with friendly message', async () => {
    vi.mocked(api.getConfig).mockRejectedValue(
      new Error('You do not have permission to access this resource')
    );

    const { result } = renderHook(() => useAdminConfig());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toContain('permission');
    expect(result.current.error).toContain('Access denied');
  });

  it('should handle network errors with friendly message', async () => {
    vi.mocked(api.getConfig).mockRejectedValue(new Error('fetch failed'));

    const { result } = renderHook(() => useAdminConfig());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toContain('Network error');
  });

  it('should handle invalid response', async () => {
    vi.mocked(api.getConfig).mockResolvedValue(null as unknown as ConfigDto);

    const { result } = renderHook(() => useAdminConfig());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toContain('Invalid configuration response');
  });

  it('should refresh config', async () => {
    vi.mocked(api.getConfig).mockResolvedValue(mockConfig);

    const { result } = renderHook(() => useAdminConfig());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(api.getConfig).toHaveBeenCalledTimes(1);

    // Refresh
    await result.current.refresh();

    expect(api.getConfig).toHaveBeenCalledTimes(2);
  });

  it('should clear error on successful refresh', async () => {
    // First call fails
    vi.mocked(api.getConfig).mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useAdminConfig());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBeTruthy();

    // Second call succeeds
    vi.mocked(api.getConfig).mockResolvedValueOnce(mockConfig);
    await result.current.refresh();

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBeNull();
    expect(result.current.items).toHaveLength(6);
  });

  it('should handle empty config object', async () => {
    vi.mocked(api.getConfig).mockResolvedValue({});

    const { result } = renderHook(() => useAdminConfig());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.items).toEqual([]);
    expect(result.current.status).toBe('ok'); // No system_status key - defaults to ok
    expect(result.current.error).toBeNull();
  });
});

