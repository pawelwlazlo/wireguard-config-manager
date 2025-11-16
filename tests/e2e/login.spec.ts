/**
 * E2E tests for Login view
 */

import { test, expect } from '@playwright/test';

test.describe('Login Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('should display login form with all elements', async ({ page }) => {
    // Check page title
    await expect(page).toHaveTitle(/Logowanie/);
    
    // Check form elements
    await expect(page.getByRole('heading', { name: /logowanie/i })).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/hasło/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /zaloguj/i })).toBeVisible();
    
    // Check registration link
    await expect(page.getByRole('link', { name: /zarejestruj się/i })).toBeVisible();
  });

  test('should validate email field on blur', async ({ page }) => {
    const emailInput = page.getByLabel(/email/i);
    
    // Empty email
    await emailInput.focus();
    await emailInput.blur();
    await expect(page.getByText(/email jest wymagany/i)).toBeVisible();
    
    // Invalid email format
    await emailInput.fill('invalid-email');
    await emailInput.blur();
    await expect(page.getByText(/nieprawidłowy format adresu email/i)).toBeVisible();
    
    // Valid email
    await emailInput.fill('user@example.com');
    await emailInput.blur();
    await expect(page.getByText(/nieprawidłowy format/i)).not.toBeVisible();
  });

  test('should validate password field on blur', async ({ page }) => {
    const passwordInput = page.getByLabel(/hasło/i);
    
    // Empty password
    await passwordInput.focus();
    await passwordInput.blur();
    await expect(page.getByText(/hasło jest wymagane/i)).toBeVisible();
    
    // Valid password
    await passwordInput.fill('password123');
    await passwordInput.blur();
    await expect(page.getByText(/hasło jest wymagane/i)).not.toBeVisible();
  });

  test('should prevent submission with invalid data', async ({ page }) => {
    const submitButton = page.getByRole('button', { name: /zaloguj/i });
    
    // Try to submit without filling the form
    await submitButton.click();
    
    // Should show validation errors
    await expect(page.getByText(/email jest wymagany/i)).toBeVisible();
    await expect(page.getByText(/hasło jest wymagane/i)).toBeVisible();
  });

  test('should show loading state during submission', async ({ page }) => {
    // Fill the form with valid data
    await page.getByLabel(/email/i).fill('user@example.com');
    await page.getByLabel(/hasło/i).fill('password123');
    
    // Mock slow API response
    await page.route('**/api/v1/auth/login', async route => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'InvalidCredentials',
          message: 'Invalid email or password'
        })
      });
    });
    
    // Submit the form
    const submitButton = page.getByRole('button', { name: /zaloguj/i });
    await submitButton.click();
    
    // Check loading state
    await expect(page.getByText(/logowanie\.\.\./i)).toBeVisible();
    await expect(submitButton).toBeDisabled();
    
    // Wait for request to complete
    await page.waitForTimeout(1100);
  });

  test('should display error for invalid credentials', async ({ page }) => {
    // Mock API error response
    await page.route('**/api/v1/auth/login', async route => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'InvalidCredentials',
          message: 'Invalid email or password'
        })
      });
    });
    
    // Fill and submit form
    await page.getByLabel(/email/i).fill('user@example.com');
    await page.getByLabel(/hasło/i).fill('wrongpassword');
    await page.getByRole('button', { name: /zaloguj/i }).click();
    
    // Check error banner
    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page.getByText(/nieprawidłowy e-mail lub hasło/i)).toBeVisible();
  });

  test('should display error for too many attempts', async ({ page }) => {
    // Mock API 429 response
    await page.route('**/api/v1/auth/login', async route => {
      await route.fulfill({
        status: 429,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'TooManyAttempts',
          message: 'Too many login attempts'
        })
      });
    });
    
    // Fill and submit form
    await page.getByLabel(/email/i).fill('user@example.com');
    await page.getByLabel(/hasło/i).fill('password123');
    await page.getByRole('button', { name: /zaloguj/i }).click();
    
    // Check error message
    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page.getByText(/zbyt wiele prób logowania/i)).toBeVisible();
  });

  test('should display error for authentication service error', async ({ page }) => {
    // Mock API 500 response
    await page.route('**/api/v1/auth/login', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'AuthError',
          message: 'Authentication service error'
        })
      });
    });
    
    // Fill and submit form
    await page.getByLabel(/email/i).fill('user@example.com');
    await page.getByLabel(/hasło/i).fill('password123');
    await page.getByRole('button', { name: /zaloguj/i }).click();
    
    // Check error message
    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page.getByText(/błąd serwera uwierzytelniania/i)).toBeVisible();
  });

  test('should display error for network failure', async ({ page }) => {
    // Mock network error
    await page.route('**/api/v1/auth/login', async route => {
      await route.abort('failed');
    });
    
    // Fill and submit form
    await page.getByLabel(/email/i).fill('user@example.com');
    await page.getByLabel(/hasło/i).fill('password123');
    await page.getByRole('button', { name: /zaloguj/i }).click();
    
    // Check error message
    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page.getByText(/brak połączenia z serwerem/i)).toBeVisible();
  });

  test('should successfully login with valid credentials', async ({ page }) => {
    // Mock successful API response
    await page.route('**/api/v1/auth/login', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          jwt: 'mock-jwt-token',
          user: {
            id: 'user-123',
            email: 'user@example.com',
            roles: ['user'],
            status: 'active',
            peer_limit: 5,
            created_at: new Date().toISOString()
          }
        })
      });
    });
    
    // Fill and submit form
    await page.getByLabel(/email/i).fill('user@example.com');
    await page.getByLabel(/hasło/i).fill('password123');
    await page.getByRole('button', { name: /zaloguj/i }).click();
    
    // Should redirect to home page
    await page.waitForURL('/');
    
    // Check localStorage contains JWT and user data
    const jwt = await page.evaluate(() => localStorage.getItem('jwt'));
    const user = await page.evaluate(() => localStorage.getItem('user'));
    
    expect(jwt).toBe('mock-jwt-token');
    expect(user).toBeTruthy();
    expect(JSON.parse(user!).email).toBe('user@example.com');
  });

  test('should navigate to registration page when clicking register link', async ({ page }) => {
    await page.getByRole('link', { name: /zarejestruj się/i }).click();
    await expect(page).toHaveURL('/register');
  });

  test('should have proper accessibility attributes', async ({ page }) => {
    const emailInput = page.getByLabel(/email/i);
    const passwordInput = page.getByLabel(/hasło/i);
    
    // Trigger validation errors
    await emailInput.focus();
    await emailInput.blur();
    await passwordInput.focus();
    await passwordInput.blur();
    
    // Check aria-invalid attributes
    await expect(emailInput).toHaveAttribute('aria-invalid', 'true');
    await expect(passwordInput).toHaveAttribute('aria-invalid', 'true');
    
    // Check aria-describedby links to error messages
    const emailAriaDescribedBy = await emailInput.getAttribute('aria-describedby');
    const passwordAriaDescribedBy = await passwordInput.getAttribute('aria-describedby');
    
    expect(emailAriaDescribedBy).toBeTruthy();
    expect(passwordAriaDescribedBy).toBeTruthy();
    
    // Verify error messages have proper IDs
    const emailError = page.locator(`#${emailAriaDescribedBy}`);
    const passwordError = page.locator(`#${passwordAriaDescribedBy}`);
    
    await expect(emailError).toBeVisible();
    await expect(passwordError).toBeVisible();
  });

  test('should work on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Verify form is visible and usable
    await expect(page.getByRole('heading', { name: /logowanie/i })).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/hasło/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /zaloguj/i })).toBeVisible();
    
    // Test form submission
    await page.getByLabel(/email/i).fill('user@example.com');
    await page.getByLabel(/hasło/i).fill('password123');
    
    // Should be able to submit
    const submitButton = page.getByRole('button', { name: /zaloguj/i });
    await expect(submitButton).toBeEnabled();
  });
});

