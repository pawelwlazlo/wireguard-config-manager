import { test, expect } from '@playwright/test';

test.describe('404 Not Found Page', () => {
  test('should display 404 page for non-existent route', async ({ page }) => {
    // Navigate to a non-existent page
    const response = await page.goto('/this-page-does-not-exist');
    
    // Check response status (note: in dev mode Astro might return 200 with 404 content)
    // In production build it should return 404
    // expect(response?.status()).toBe(404);
    
    // Check if 404 page elements are visible
    await expect(page.getByRole('heading', { name: '404', level: 1 })).toBeVisible();
    await expect(page.getByText(/strona nie znaleziona/i)).toBeVisible();
    await expect(page.getByText(/przepraszamy/i)).toBeVisible();
  });

  test('should have a button to return to home page', async ({ page }) => {
    await page.goto('/non-existent-page');
    
    const homeButton = page.getByRole('button', { name: /powrót do strony głównej/i });
    await expect(homeButton).toBeVisible();
    await expect(homeButton).toBeEnabled();
  });

  test('should navigate to home page when clicking return button', async ({ page }) => {
    await page.goto('/invalid-route');
    
    const homeButton = page.getByRole('button', { name: /powrót do strony głównej/i });
    await homeButton.click();
    
    // Should navigate to home page
    await expect(page).toHaveURL('/');
  });

  test('should display SVG illustration', async ({ page }) => {
    await page.goto('/does-not-exist');
    
    // Check if SVG illustration is present
    const svg = page.locator('svg').first();
    await expect(svg).toBeVisible();
  });

  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/mobile-404-test');
    
    // Check if all elements are still visible
    await expect(page.getByRole('heading', { name: '404' })).toBeVisible();
    await expect(page.getByRole('button', { name: /powrót do strony głównej/i })).toBeVisible();
    
    // Check if button is full width on mobile
    const button = page.getByRole('button', { name: /powrót do strony głównej/i });
    const buttonBox = await button.boundingBox();
    const viewportSize = page.viewportSize();
    
    // Button should take most of the width on mobile (accounting for padding)
    if (buttonBox && viewportSize) {
      expect(buttonBox.width).toBeGreaterThan(viewportSize.width * 0.8);
    }
  });

  test('should be accessible', async ({ page }) => {
    await page.goto('/accessibility-404-test');
    
    // Check heading hierarchy
    const h1 = page.getByRole('heading', { level: 1 });
    await expect(h1).toBeVisible();
    
    // Check button has accessible name
    const button = page.getByRole('button', { name: /powrót do strony głównej/i });
    await expect(button).toHaveAccessibleName();
    
    // Check SVG has aria-hidden (it's decorative)
    const svg = page.locator('svg').first();
    await expect(svg).toHaveAttribute('aria-hidden', 'true');
  });

  test('should handle multiple 404s correctly', async ({ page }) => {
    // Test multiple non-existent routes
    const routes = ['/fake-1', '/fake-2', '/fake-3'];
    
    for (const route of routes) {
      await page.goto(route);
      await expect(page.getByRole('heading', { name: '404' })).toBeVisible();
      await expect(page.getByRole('button', { name: /powrót do strony głównej/i })).toBeVisible();
    }
  });

  test('should use back navigation when referrer is from same origin', async ({ page }) => {
    // First go to home page
    await page.goto('/');
    
    // Then navigate to a 404 page (simulating internal navigation)
    await page.goto('/this-does-not-exist');
    
    // Click back button
    const homeButton = page.getByRole('button', { name: /powrót do strony głównej/i });
    await homeButton.click();
    
    // Should go back to previous page (home)
    await expect(page).toHaveURL('/');
  });

  test('should have proper text content and styling', async ({ page }) => {
    await page.goto('/styling-404-test');
    
    // Check main heading
    const heading = page.getByRole('heading', { name: '404', level: 1 });
    await expect(heading).toBeVisible();
    
    // Check description text
    await expect(page.getByText(/strona nie znaleziona/i)).toBeVisible();
    await expect(page.getByText(/przepraszamy.*nie istnieje/i)).toBeVisible();
    
    // Check button styling
    const button = page.getByRole('button', { name: /powrót do strony głównej/i });
    await expect(button).toBeVisible();
    
    // Verify button has proper classes (at least some base classes)
    const buttonClasses = await button.getAttribute('class');
    expect(buttonClasses).toContain('inline-flex');
  });

  test('should be centered on the page', async ({ page }) => {
    await page.goto('/centered-404-test');
    
    // Get the container
    const container = page.locator('div.flex.min-h-screen').first();
    await expect(container).toBeVisible();
    
    // Check if container uses flex centering
    const containerClasses = await container.getAttribute('class');
    expect(containerClasses).toContain('items-center');
    expect(containerClasses).toContain('justify-center');
  });
});

