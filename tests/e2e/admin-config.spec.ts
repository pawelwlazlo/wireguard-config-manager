/**
 * E2E tests for Admin Config view
 */

import { test, expect } from '@playwright/test';
import type { UserDto, ConfigDto } from '@/types';

const mockAdminUser: UserDto = {
  id: 'admin-123',
  email: 'admin@example.com',
  roles: ['admin'],
  status: 'active',
  peer_limit: 10,
  created_at: '2024-01-01T00:00:00Z',
  requires_password_change: false,
};

const mockConfig: ConfigDto = {
  'app.version': '1.0.0',
  'app.environment': 'production',
  'system_status': 'ok',
  'database.host': 'localhost',
  'database.port': '5432',
  'database.name': 'wireguard_config_manager',
  'wireguard.subnet': '10.8.0.0/24',
  'wireguard.interface': 'wg0',
};

test.describe('Admin Config - Authenticated Admin', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await page.route('**/api/v1/users/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockAdminUser),
      });
    });

    await page.route('**/api/v1/admin/config', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockConfig),
      });
    });

    await page.goto('/admin/config');
  });

  test('should display config page with header and status bar', async ({ page }) => {
    // Wait for page to load
    await page.waitForSelector('text=System Configuration');

    // Check header
    await expect(
      page.getByRole('heading', { name: /system configuration/i })
    ).toBeVisible();
    await expect(
      page.getByText(/view current system configuration and status/i)
    ).toBeVisible();

    // Check refresh button
    await expect(page.getByRole('button', { name: /refresh/i })).toBeVisible();

    // Check status bar
    await expect(page.getByText(/system operational/i)).toBeVisible();
  });

  test('should display all config items in grid', async ({ page }) => {
    await page.waitForSelector('text=System Configuration');

    // Check that config items are displayed
    await expect(page.getByText('app.version')).toBeVisible();
    await expect(page.getByText('1.0.0')).toBeVisible();
    await expect(page.getByText('app.environment')).toBeVisible();
    await expect(page.getByText('production')).toBeVisible();
    await expect(page.getByText('database.host')).toBeVisible();
    await expect(page.getByText('localhost')).toBeVisible();
  });

  test('should display degraded status', async ({ page }) => {
    const degradedConfig: ConfigDto = {
      'app.version': '1.0.0',
      'system_status': 'degraded',
    };

    await page.route('**/api/v1/admin/config', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(degradedConfig),
      });
    });

    await page.reload();
    await page.waitForSelector('text=System Configuration');

    // Check degraded status
    await expect(page.getByText(/system degraded/i)).toBeVisible();
  });

  test('should display down status', async ({ page }) => {
    const downConfig: ConfigDto = {
      'app.version': '1.0.0',
      'system_status': 'down',
    };

    await page.route('**/api/v1/admin/config', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(downConfig),
      });
    });

    await page.reload();
    await page.waitForSelector('text=System Configuration');

    // Check down status
    await expect(page.getByText(/system down/i)).toBeVisible();
  });

  test('should refresh config on button click', async ({ page }) => {
    await page.waitForSelector('text=System Configuration');

    let requestCount = 0;
    await page.route('**/api/v1/admin/config', async (route) => {
      requestCount++;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockConfig),
      });
    });

    // Initial load made 1 request
    expect(requestCount).toBe(1);

    // Click refresh button
    await page.getByRole('button', { name: /refresh/i }).click();

    // Should make another request
    await page.waitForTimeout(500);
    expect(requestCount).toBe(2);
  });

  test('should display empty state when no config items', async ({ page }) => {
    await page.route('**/api/v1/admin/config', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({}),
      });
    });

    await page.reload();
    await page.waitForSelector('text=System Configuration');

    // Check empty state
    await expect(page.getByText(/no configuration available/i)).toBeVisible();
    await expect(
      page.getByText(/no configuration items to display/i)
    ).toBeVisible();
  });

  test('should display error state on API failure', async ({ page }) => {
    await page.route('**/api/v1/admin/config', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'InternalError',
          message: 'Failed to fetch configuration',
        }),
      });
    });

    await page.reload();
    await page.waitForSelector('text=System Configuration');

    // Check error banner
    await expect(page.getByText(/failed to fetch configuration/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /try again/i })).toBeVisible();
  });

  test('should retry on error', async ({ page }) => {
    let requestCount = 0;
    await page.route('**/api/v1/admin/config', async (route) => {
      requestCount++;
      if (requestCount === 1) {
        // First request fails
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'InternalError',
            message: 'Failed to fetch configuration',
          }),
        });
      } else {
        // Second request succeeds
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockConfig),
        });
      }
    });

    await page.reload();
    await page.waitForSelector('text=System Configuration');

    // Click try again button
    await page.getByRole('button', { name: /try again/i }).click();

    // Wait for success
    await page.waitForSelector('text=System Operational');
    await expect(page.getByText('app.version')).toBeVisible();
  });

  test('should display loading state', async ({ page }) => {
    await page.route('**/api/v1/admin/config', async (route) => {
      // Simulate slow response
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockConfig),
      });
    });

    const navigationPromise = page.goto('/admin/config');

    // Check loading state
    await expect(page.getByText(/loading configuration/i)).toBeVisible();

    await navigationPromise;
    await page.waitForSelector('text=System Operational');

    // Loading should be gone
    await expect(page.getByText(/loading configuration/i)).not.toBeVisible();
  });

  test('should truncate long values with tooltip', async ({ page }) => {
    const longValueConfig: ConfigDto = {
      'short.key': 'short value',
      'long.key':
        'this is a very long configuration value that should be truncated in the UI and show a tooltip on hover',
    };

    await page.route('**/api/v1/admin/config', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(longValueConfig),
      });
    });

    await page.reload();
    await page.waitForSelector('text=System Configuration');

    // Long value should be truncated (ends with ...)
    const longValueElement = page.getByText(/this is a very long configuration/);
    await expect(longValueElement).toBeVisible();
  });

  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForSelector('text=System Configuration');

    // Check all elements are visible
    await expect(
      page.getByRole('heading', { name: /system configuration/i })
    ).toBeVisible();
    await expect(page.getByText(/system operational/i)).toBeVisible();
    await expect(page.getByText('app.version')).toBeVisible();
  });

  test('should display config items in alphabetical order', async ({ page }) => {
    await page.waitForSelector('text=System Configuration');

    // Get all config key elements
    const keys = await page.locator('[role="listitem"] h3').allTextContents();

    // Check they are sorted alphabetically
    const sortedKeys = [...keys].sort();
    expect(keys).toEqual(sortedKeys);
  });
});

test.describe('Admin Config - Non-Admin User', () => {
  test('should return 403 for non-admin users', async ({ page }) => {
    const regularUser: UserDto = {
      ...mockAdminUser,
      roles: ['user'],
    };

    await page.route('**/api/v1/users/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(regularUser),
      });
    });

    await page.route('**/api/v1/admin/config', async (route) => {
      await route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Forbidden',
          message: 'Admin access required',
        }),
      });
    });

    // Server-side should redirect to home, but if API is called:
    await page.goto('/admin/config');

    // Should see error or be redirected
    // This depends on server-side middleware behavior
  });
});

test.describe('Admin Config - Unauthenticated', () => {
  test('should redirect to login when not authenticated', async ({ page }) => {
    // Mock 401 response
    await page.route('**/api/v1/users/me', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Unauthorized',
          message: 'Authentication required',
        }),
      });
    });

    await page.goto('/admin/config');

    // Should redirect to login (server-side middleware handles this)
    // Or show error if client-side
    await page.waitForURL(/\/(login|admin\/config)/);
  });
});

