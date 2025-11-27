/**
 * Unit tests for domainService
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { syncAcceptedDomains, getAcceptedDomains } from '@/lib/services/domainService';
import type { SupabaseClient } from '@/db/supabase.client';

describe('domainService', () => {
  let mockSupabase: Partial<SupabaseClient>;
  let consoleSpy: { info: any; debug: any; error: any };

  beforeEach(() => {
    // Mock console methods to avoid noise in tests
    consoleSpy = {
      info: vi.spyOn(console, 'info').mockImplementation(() => {}),
      debug: vi.spyOn(console, 'debug').mockImplementation(() => {}),
      error: vi.spyOn(console, 'error').mockImplementation(() => {}),
    };

    // Mock Supabase client
    mockSupabase = {
      from: vi.fn(),
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('syncAcceptedDomains', () => {
    it('should skip sync when ACCEPTED_DOMAINS is not set', async () => {
      // Mock empty env
      vi.stubEnv('ACCEPTED_DOMAINS', '');

      await syncAcceptedDomains(mockSupabase as SupabaseClient);

      expect(consoleSpy.info).toHaveBeenCalledWith(
        'ACCEPTED_DOMAINS not set, skipping domain sync'
      );
      expect(mockSupabase.from).not.toHaveBeenCalled();
    });

    it('should skip sync when ACCEPTED_DOMAINS is undefined', async () => {
      // Mock undefined env
      vi.stubEnv('ACCEPTED_DOMAINS', undefined);

      await syncAcceptedDomains(mockSupabase as SupabaseClient);

      expect(consoleSpy.info).toHaveBeenCalledWith(
        'ACCEPTED_DOMAINS not set, skipping domain sync'
      );
      expect(mockSupabase.from).not.toHaveBeenCalled();
    });

    it('should parse and insert single domain', async () => {
      vi.stubEnv('ACCEPTED_DOMAINS', 'example.com');

      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({ data: {}, error: null }),
      });

      const mockFrom = vi.fn().mockReturnValue({
        insert: mockInsert,
      });

      mockSupabase.schema = vi.fn().mockReturnValue({
        from: mockFrom,
      });

      await syncAcceptedDomains(mockSupabase as SupabaseClient);

      expect(mockSupabase.schema).toHaveBeenCalledWith('app');
      expect(mockFrom).toHaveBeenCalledWith('accepted_domains');
      expect(mockInsert).toHaveBeenCalledWith({ domain: 'example.com' });
      expect(consoleSpy.info).toHaveBeenCalledWith('✓ Added domain: example.com');
    });

    it('should parse and insert multiple domains', async () => {
      vi.stubEnv('ACCEPTED_DOMAINS', 'example.com,test.com,company.org');

      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({ data: {}, error: null }),
      });

      const mockFrom = vi.fn().mockReturnValue({
        insert: mockInsert,
      });

      mockSupabase.schema = vi.fn().mockReturnValue({
        from: mockFrom,
      });

      await syncAcceptedDomains(mockSupabase as SupabaseClient);

      expect(mockInsert).toHaveBeenCalledTimes(3);
      expect(mockInsert).toHaveBeenCalledWith({ domain: 'example.com' });
      expect(mockInsert).toHaveBeenCalledWith({ domain: 'test.com' });
      expect(mockInsert).toHaveBeenCalledWith({ domain: 'company.org' });
    });

    it('should trim whitespace from domains', async () => {
      vi.stubEnv('ACCEPTED_DOMAINS', ' example.com , test.com , company.org ');

      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({ data: {}, error: null }),
      });

      const mockFrom = vi.fn().mockReturnValue({
        insert: mockInsert,
      });

      mockSupabase.schema = vi.fn().mockReturnValue({
        from: mockFrom,
      });

      await syncAcceptedDomains(mockSupabase as SupabaseClient);

      expect(mockInsert).toHaveBeenCalledWith({ domain: 'example.com' });
      expect(mockInsert).toHaveBeenCalledWith({ domain: 'test.com' });
      expect(mockInsert).toHaveBeenCalledWith({ domain: 'company.org' });
    });

    it('should filter out empty domains', async () => {
      vi.stubEnv('ACCEPTED_DOMAINS', 'example.com,,test.com,  ,');

      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({ data: {}, error: null }),
      });

      const mockFrom = vi.fn().mockReturnValue({
        insert: mockInsert,
      });

      mockSupabase.schema = vi.fn().mockReturnValue({
        from: mockFrom,
      });

      await syncAcceptedDomains(mockSupabase as SupabaseClient);

      // Should only insert 2 valid domains
      expect(mockInsert).toHaveBeenCalledTimes(2);
      expect(mockInsert).toHaveBeenCalledWith({ domain: 'example.com' });
      expect(mockInsert).toHaveBeenCalledWith({ domain: 'test.com' });
    });

    it('should handle duplicate domain errors gracefully', async () => {
      vi.stubEnv('ACCEPTED_DOMAINS', 'example.com');

      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({
          data: null,
          error: { code: '23505', message: 'duplicate key value' },
        }),
      });

      const mockFrom = vi.fn().mockReturnValue({
        insert: mockInsert,
      });

      mockSupabase.schema = vi.fn().mockReturnValue({
        from: mockFrom,
      });

      await syncAcceptedDomains(mockSupabase as SupabaseClient);

      expect(consoleSpy.debug).toHaveBeenCalledWith(
        'Domain example.com already exists, skipping'
      );
      // Should not throw error
    });

    it('should log other database errors', async () => {
      vi.stubEnv('ACCEPTED_DOMAINS', 'example.com');

      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({
          data: null,
          error: { code: '42501', message: 'permission denied' },
        }),
      });

      const mockFrom = vi.fn().mockReturnValue({
        insert: mockInsert,
      });

      mockSupabase.schema = vi.fn().mockReturnValue({
        from: mockFrom,
      });

      await syncAcceptedDomains(mockSupabase as SupabaseClient);

      expect(consoleSpy.error).toHaveBeenCalledWith(
        'Failed to insert domain example.com:',
        expect.objectContaining({ code: '42501' })
      );
    });

    it('should handle unexpected errors without crashing', async () => {
      vi.stubEnv('ACCEPTED_DOMAINS', 'example.com');

      mockSupabase.from = vi.fn().mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      // Should not throw
      await expect(syncAcceptedDomains(mockSupabase as SupabaseClient)).resolves.not.toThrow();

      expect(consoleSpy.error).toHaveBeenCalledWith(
        'Error syncing accepted domains:',
        expect.any(Error)
      );
    });
  });

  describe('getAcceptedDomains', () => {
    it('should fetch and return domains', async () => {
      const mockData = [
        { domain: 'example.com' },
        { domain: 'test.com' },
        { domain: 'company.org' },
      ];

      const mockOrder = vi.fn().mockResolvedValue({
        data: mockData,
        error: null,
      });

      const mockSelect = vi.fn().mockReturnValue({
        order: mockOrder,
      });

      const mockFrom = vi.fn().mockReturnValue({
        select: mockSelect,
      });

      mockSupabase.schema = vi.fn().mockReturnValue({
        from: mockFrom,
      });

      const result = await getAcceptedDomains(mockSupabase as SupabaseClient);

      expect(mockSupabase.schema).toHaveBeenCalledWith('app');
      expect(mockFrom).toHaveBeenCalledWith('accepted_domains');
      expect(result).toEqual(['example.com', 'test.com', 'company.org']);
    });

    it('should return empty array on error', async () => {
      const mockOrder = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      const mockSelect = vi.fn().mockReturnValue({
        order: mockOrder,
      });

      const mockFrom = vi.fn().mockReturnValue({
        select: mockSelect,
      });

      mockSupabase.schema = vi.fn().mockReturnValue({
        from: mockFrom,
      });

      const result = await getAcceptedDomains(mockSupabase as SupabaseClient);

      expect(result).toEqual([]);
      expect(consoleSpy.error).toHaveBeenCalledWith(
        'Error fetching accepted domains:',
        expect.objectContaining({ message: 'Database error' })
      );
    });

    it('should return empty array when no data', async () => {
      const mockOrder = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      });

      const mockSelect = vi.fn().mockReturnValue({
        order: mockOrder,
      });

      const mockFrom = vi.fn().mockReturnValue({
        select: mockSelect,
      });

      mockSupabase.schema = vi.fn().mockReturnValue({
        from: mockFrom,
      });

      const result = await getAcceptedDomains(mockSupabase as SupabaseClient);

      expect(result).toEqual([]);
    });

    it('should return empty array for empty result set', async () => {
      const mockOrder = vi.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      const mockSelect = vi.fn().mockReturnValue({
        order: mockOrder,
      });

      const mockFrom = vi.fn().mockReturnValue({
        select: mockSelect,
      });

      mockSupabase.schema = vi.fn().mockReturnValue({
        from: mockFrom,
      });

      const result = await getAcceptedDomains(mockSupabase as SupabaseClient);

      expect(result).toEqual([]);
    });
  });
});

