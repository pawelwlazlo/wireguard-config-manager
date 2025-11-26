/**
 * E2E tests for Dashboard view
 * Tests cover US-006, US-008, US-009, US-010
 */

import { test, expect } from '@playwright/test';
import type { PeerDto, UserDto, Page as PeerPage } from '@/types';

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
  public_key: 'mock-public-key-abcdef1234567890abcdef1234567890abcdef12',
  status: 'active',
  friendly_name: 'my-config',
  claimed_at: '2024-01-01T00:00:00Z',
  revoked_at: null,
};

const mockPeersPage: PeerPage<PeerDto> = {
  items: [mockPeer],
  page: 1,
  size: 20,
  total: 1,
};

test.describe('Dashboard - Authenticated User', () => {
  test.beforeEach(async ({ page, context }) => {
    // Set JWT cookie for SSR authentication (middleware needs this)
    await context.addCookies([{
      name: 'jwt',
      value: 'test-mock-jwt-user',
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      sameSite: 'Lax' as const,
    }]);

    // Mock authentication API endpoint (for client-side calls)
    await page.route('**/api/v1/users/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockUser),
      });
    });

    await page.route('**/api/v1/peers?status=active', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockPeersPage),
      });
    });

    await page.goto('/');
  });

  test('should display dashboard with stats and peer list (US-008)', async ({ page }) => {
    // Wait for data to load
    await page.waitForSelector('text=Dashboard');

    // Check header
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();
    await expect(
      page.getByText(/manage your wireguard configurations/i)
    ).toBeVisible();

    // Check stats card
    await expect(page.getByText('Active Configurations')).toBeVisible();
    await expect(page.getByText('1')).toBeVisible(); // claimed count
    await expect(page.getByText('5')).toBeVisible(); // peer limit

    // Check peer card
    await expect(page.getByText('my-config')).toBeVisible();
    await expect(page.getByText(/mock-public-key-abcdef/)).toBeVisible();
    await expect(page.getByText('active')).toBeVisible();
  });

  test('should display empty state when no peers', async ({ page }) => {
    // Override peers endpoint to return empty list
    await page.route('**/api/v1/peers?status=active', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: [],
          page: 1,
          size: 20,
          total: 0,
        }),
      });
    });

    await page.reload();
    await page.waitForSelector('text=Dashboard');

    // Check empty state
    await expect(page.getByText(/no configurations yet/i)).toBeVisible();
    await expect(
      page.getByText(/haven't claimed any wireguard configurations/i)
    ).toBeVisible();
  });

  test('should claim new peer successfully (US-006)', async ({ page }) => {
    const newPeer: PeerDto = {
      id: 'peer-456',
      public_key: 'new-mock-public-key-xyz789xyz789xyz789xyz789xyz789xyz',
      status: 'active',
      friendly_name: 'new-config',
      claimed_at: '2024-01-02T00:00:00Z',
      revoked_at: null,
    };

    await page.route('**/api/v1/peers/claim', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(newPeer),
      });
    });

    await page.waitForSelector('text=Dashboard');

    // Click claim button
    const claimButton = page.getByRole('button', {
      name: /get new configuration/i,
    });
    await claimButton.click();

    // Check loading state
    await expect(page.getByText(/claiming/i)).toBeVisible();

    // Check success toast
    await expect(
      page.getByText(/configuration claimed successfully/i)
    ).toBeVisible();
  });

  test('should show error when claiming at limit', async ({ page }) => {
    await page.route('**/api/v1/peers/claim', async (route) => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'LimitExceeded',
          message: 'You have reached your peer limit',
        }),
      });
    });

    await page.waitForSelector('text=Dashboard');

    const claimButton = page.getByRole('button', {
      name: /get new configuration/i,
    });
    await claimButton.click();

    // Check error toast
    await expect(page.getByText(/reached your peer limit/i)).toBeVisible();
  });

  test('should download peer configuration (US-006)', async ({ page }) => {
    await page.waitForSelector('text=Dashboard');

    // Mock download endpoint
    await page.route('**/api/v1/peers/peer-123/download', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/plain',
        body: '[Interface]\nPrivateKey = mock-private-key\n',
      });
    });

    // Click download button
    const downloadButton = page
      .locator('button[title="Download configuration"]')
      .first();
    await downloadButton.click();

    // Verify download was triggered (URL changed)
    // In real scenario, file would be downloaded
  });

  test('should open peer details modal on card click (US-009)', async ({ page }) => {
    await page.waitForSelector('text=Dashboard');

    // Click on peer card
    await page.getByText('my-config').click();

    // Check modal opened
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(
      page.getByRole('heading', { name: /configuration details/i })
    ).toBeVisible();

    // Check peer details in modal
    await expect(page.getByText('my-config')).toBeVisible();
    await expect(page.getByText(/mock-public-key-abcdef/)).toBeVisible();
  });

  test('should update peer friendly name (US-009)', async ({ page }) => {
    const updatedPeer: PeerDto = {
      ...mockPeer,
      friendly_name: 'updated-config-name',
    };

    await page.route('**/api/v1/peers/peer-123', async (route) => {
      if (route.request().method() === 'PATCH') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(updatedPeer),
        });
      }
    });

    await page.waitForSelector('text=Dashboard');

    // Open modal
    await page.getByText('my-config').click();
    await expect(page.getByRole('dialog')).toBeVisible();

    // Update friendly name
    const input = page.getByLabel(/friendly name/i);
    await input.clear();
    await input.fill('updated-config-name');

    // Save
    await page.getByRole('button', { name: /save changes/i }).click();

    // Check success toast
    await expect(
      page.getByText(/configuration updated successfully/i)
    ).toBeVisible();

    // Modal should close
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });

  test('should validate friendly name format (US-009)', async ({ page }) => {
    await page.waitForSelector('text=Dashboard');

    // Open modal
    await page.getByText('my-config').click();
    await expect(page.getByRole('dialog')).toBeVisible();

    // Try invalid friendly name (uppercase)
    const input = page.getByLabel(/friendly name/i);
    await input.clear();
    await input.fill('InvalidName');

    // Try to save
    await page.getByRole('button', { name: /save changes/i }).click();

    // Check error message
    await expect(
      page.getByText(/must be 1-63 characters long and contain only lowercase/i)
    ).toBeVisible();

    // Modal should still be open
    await expect(page.getByRole('dialog')).toBeVisible();
  });

  test('should revoke peer with confirmation (US-010)', async ({ page }) => {
    await page.route('**/api/v1/peers/peer-123', async (route) => {
      if (route.request().method() === 'DELETE') {
        await route.fulfill({
          status: 204,
        });
      }
    });

    await page.waitForSelector('text=Dashboard');

    // Click revoke button
    const revokeButton = page
      .locator('button[title="Revoke configuration"]')
      .first();
    await revokeButton.click();

    // Check confirmation dialog
    await expect(page.getByRole('alertdialog')).toBeVisible();
    await expect(
      page.getByRole('heading', { name: /revoke configuration/i })
    ).toBeVisible();
    await expect(
      page.getByText(/are you sure you want to revoke/i)
    ).toBeVisible();

    // Confirm revoke
    await page.getByRole('button', { name: /revoke/i, exact: true }).click();

    // Check success toast
    await expect(
      page.getByText(/configuration revoked successfully/i)
    ).toBeVisible();

    // Peer should be removed from list (empty state shown)
    await expect(page.getByText(/no configurations yet/i)).toBeVisible();
  });

  test('should cancel peer revoke', async ({ page }) => {
    await page.waitForSelector('text=Dashboard');

    // Click revoke button
    const revokeButton = page
      .locator('button[title="Revoke configuration"]')
      .first();
    await revokeButton.click();

    // Check confirmation dialog
    await expect(page.getByRole('alertdialog')).toBeVisible();

    // Cancel
    await page.getByRole('button', { name: /cancel/i }).click();

    // Dialog should close
    await expect(page.getByRole('alertdialog')).not.toBeVisible();

    // Peer should still be in list
    await expect(page.getByText('my-config')).toBeVisible();
  });

  test('should disable claim button when at limit', async ({ page }) => {
    // Override with 5 peers (at limit)
    const peersAtLimit: PeerPage<PeerDto> = {
      items: Array.from({ length: 5 }, (_, i) => ({
        ...mockPeer,
        id: `peer-${i}`,
        friendly_name: `config-${i}`,
      })),
      page: 1,
      size: 20,
      total: 5,
    };

    await page.route('**/api/v1/peers?status=active', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(peersAtLimit),
      });
    });

    await page.reload();
    await page.waitForSelector('text=Dashboard');

    // Check claim button is disabled
    const claimButton = page.getByRole('button', {
      name: /get new configuration/i,
    });
    await expect(claimButton).toBeDisabled();

    // Check limit warning in stats card
    await expect(
      page.getByText(/reached your configuration limit/i)
    ).toBeVisible();
  });

  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForSelector('text=Dashboard');

    // Check all elements are visible and usable
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();
    await expect(page.getByText('Active Configurations')).toBeVisible();
    await expect(
      page.getByRole('button', { name: /get new configuration/i })
    ).toBeVisible();
    await expect(page.getByText('my-config')).toBeVisible();
  });

  test('should show loading state on initial load', async ({ page }) => {
    // Mock slow API response
    await page.route('**/api/v1/users/me', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockUser),
      });
    });

    await page.route('**/api/v1/peers?status=active', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockPeersPage),
      });
    });

    const navigationPromise = page.goto('/');

    // Check loading state
    await expect(page.getByText(/loading dashboard/i)).toBeVisible();

    await navigationPromise;
    await page.waitForSelector('text=Dashboard');

    // Loading should be gone
    await expect(page.getByText(/loading dashboard/i)).not.toBeVisible();
  });
});

test.describe('Dashboard - Unauthenticated', () => {
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

    await page.goto('/');

    // Should redirect to login
    await page.waitForURL('/login');
    await expect(page).toHaveURL('/login');
  });
});

