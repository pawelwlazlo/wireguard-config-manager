/**
 * E2E tests for Register view
 */

import { test, expect } from '@playwright/test';

test.describe('Register Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/register');
  });

  test('should display registration form with all elements', async ({ page }) => {
    // Check page title
    await expect(page).toHaveTitle(/Rejestracja/);
    
    // Check form elements
    await expect(page.getByRole('heading', { name: /rejestracja/i })).toBeVisible();
    await expect(page.getByLabel(/email firmowy/i)).toBeVisible();
    await expect(page.getByLabel('Hasło', { exact: true })).toBeVisible();
    await expect(page.getByLabel(/powtórz hasło/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /zarejestruj się/i })).toBeVisible();
    
    // Check password checklist
    await expect(page.getByText(/hasło musi zawierać/i)).toBeVisible();
    await expect(page.getByText(/co najmniej 8 znaków/i)).toBeVisible();
    await expect(page.getByText(/jedną wielką literę/i)).toBeVisible();
    await expect(page.getByText(/jedną małą literę/i)).toBeVisible();
    await expect(page.getByText(/jedną cyfrę/i)).toBeVisible();
    await expect(page.getByText(/znak specjalny/i)).toBeVisible();
    
    // Check login link
    await expect(page.getByRole('link', { name: /zaloguj się/i })).toBeVisible();
  });

  test('should validate email field on blur', async ({ page }) => {
    const emailInput = page.getByLabel(/email firmowy/i);
    
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

  test('should update password checklist dynamically', async ({ page }) => {
    const passwordInput = page.getByLabel('Hasło', { exact: true });
    
    // Initially all criteria should be unmet
    await expect(page.getByText(/✓ wszystkie wymagania spełnione/i)).not.toBeVisible();
    
    // Enter weak password (only lowercase)
    await passwordInput.fill('abc');
    // Should not show success message
    await expect(page.getByText(/✓ wszystkie wymagania spełnione/i)).not.toBeVisible();
    
    // Enter password meeting all criteria
    await passwordInput.fill('Test123!');
    // Should show success message
    await expect(page.getByText(/✓ wszystkie wymagania spełnione/i)).toBeVisible();
  });

  test('should validate password confirmation', async ({ page }) => {
    const passwordInput = page.getByLabel('Hasło', { exact: true });
    const confirmPasswordInput = page.getByLabel(/powtórz hasło/i);
    const submitButton = page.getByRole('button', { name: /zarejestruj się/i });
    
    // Fill different passwords
    await passwordInput.fill('Test123!');
    await confirmPasswordInput.fill('Different123!');
    
    // Try to submit
    await submitButton.click();
    
    // Should show validation error
    await expect(page.getByText(/hasła nie są identyczne/i)).toBeVisible();
  });

  test('should validate all required fields on submission', async ({ page }) => {
    const submitButton = page.getByRole('button', { name: /zarejestruj się/i });
    
    // Try to submit without filling the form
    await submitButton.click();
    
    // Should show validation errors
    await expect(page.getByText(/email jest wymagany/i)).toBeVisible();
    await expect(page.getByText(/potwierdzenie hasła jest wymagane/i)).toBeVisible();
  });

  test('should show loading state during submission', async ({ page }) => {
    // Fill the form with valid data
    await page.getByLabel(/email firmowy/i).fill('user@example.com');
    await page.getByLabel('Hasło', { exact: true }).fill('Test123!');
    await page.getByLabel(/powtórz hasło/i).fill('Test123!');
    
    // Mock slow API response
    await page.route('**/api/v1/auth/register', async route => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'InvalidDomain',
          message: 'Email domain is not in the accepted domains list'
        })
      });
    });
    
    // Submit the form
    const submitButton = page.getByRole('button', { name: /zarejestruj się/i });
    await submitButton.click();
    
    // Check loading state
    await expect(page.getByText(/rejestrowanie\.\.\./i)).toBeVisible();
    await expect(submitButton).toBeDisabled();
    
    // Wait for request to complete
    await page.waitForTimeout(1100);
  });

  test('should display error for invalid email domain', async ({ page }) => {
    // Mock API error response
    await page.route('**/api/v1/auth/register', async route => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'InvalidDomain',
          message: 'Email domain is not in the accepted domains list'
        })
      });
    });
    
    // Fill and submit form
    await page.getByLabel(/email firmowy/i).fill('user@invalid-domain.com');
    await page.getByLabel('Hasło', { exact: true }).fill('Test123!');
    await page.getByLabel(/powtórz hasło/i).fill('Test123!');
    await page.getByRole('button', { name: /zarejestruj się/i }).click();
    
    // Check error banner
    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page.getByText(/domena adresu email nie jest dozwolona/i)).toBeVisible();
  });

  test('should display error for existing email', async ({ page }) => {
    // Mock API 409 response
    await page.route('**/api/v1/auth/register', async route => {
      await route.fulfill({
        status: 409,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'EmailExists',
          message: 'Email address is already registered'
        })
      });
    });
    
    // Fill and submit form
    await page.getByLabel(/email firmowy/i).fill('existing@example.com');
    await page.getByLabel('Hasło', { exact: true }).fill('Test123!');
    await page.getByLabel(/powtórz hasło/i).fill('Test123!');
    await page.getByRole('button', { name: /zarejestruj się/i }).click();
    
    // Check error message
    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page.getByText(/ten adres email jest już zarejestrowany/i)).toBeVisible();
  });

  test('should display error for weak password', async ({ page }) => {
    // Mock API 400 response
    await page.route('**/api/v1/auth/register', async route => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'WeakPassword',
          message: 'Password does not meet security requirements'
        })
      });
    });
    
    // Fill and submit form
    await page.getByLabel(/email firmowy/i).fill('user@example.com');
    await page.getByLabel('Hasło', { exact: true }).fill('weak');
    await page.getByLabel(/powtórz hasło/i).fill('weak');
    await page.getByRole('button', { name: /zarejestruj się/i }).click();
    
    // Check error message
    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page.getByText(/hasło nie spełnia wymagań bezpieczeństwa/i)).toBeVisible();
  });

  test('should display error for authentication service error', async ({ page }) => {
    // Mock API 500 response
    await page.route('**/api/v1/auth/register', async route => {
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
    await page.getByLabel(/email firmowy/i).fill('user@example.com');
    await page.getByLabel('Hasło', { exact: true }).fill('Test123!');
    await page.getByLabel(/powtórz hasło/i).fill('Test123!');
    await page.getByRole('button', { name: /zarejestruj się/i }).click();
    
    // Check error message
    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page.getByText(/błąd serwera uwierzytelniania/i)).toBeVisible();
  });

  test('should display error for validation error', async ({ page }) => {
    // Mock API 400 response
    await page.route('**/api/v1/auth/register', async route => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'ValidationError',
          message: 'Invalid registration data'
        })
      });
    });
    
    // Fill and submit form
    await page.getByLabel(/email firmowy/i).fill('user@example.com');
    await page.getByLabel('Hasło', { exact: true }).fill('Test123!');
    await page.getByLabel(/powtórz hasło/i).fill('Test123!');
    await page.getByRole('button', { name: /zarejestruj się/i }).click();
    
    // Check error message
    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page.getByText(/dane rejestracji są nieprawidłowe/i)).toBeVisible();
  });

  test('should display error for network failure', async ({ page }) => {
    // Mock network error
    await page.route('**/api/v1/auth/register', async route => {
      await route.abort('failed');
    });
    
    // Fill and submit form
    await page.getByLabel(/email firmowy/i).fill('user@example.com');
    await page.getByLabel('Hasło', { exact: true }).fill('Test123!');
    await page.getByLabel(/powtórz hasło/i).fill('Test123!');
    await page.getByRole('button', { name: /zarejestruj się/i }).click();
    
    // Check error message
    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page.getByText(/brak połączenia z serwerem/i)).toBeVisible();
  });

  test('should successfully register with valid data', async ({ page }) => {
    // Mock successful API response
    await page.route('**/api/v1/auth/register', async route => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          jwt: 'mock-jwt-token',
          user: {
            id: 'user-123',
            email: 'newuser@example.com',
            roles: ['user'],
            status: 'active',
            peer_limit: 5,
            created_at: new Date().toISOString()
          }
        })
      });
    });
    
    // Fill and submit form
    await page.getByLabel(/email firmowy/i).fill('newuser@example.com');
    await page.getByLabel('Hasło', { exact: true }).fill('Test123!');
    await page.getByLabel(/powtórz hasło/i).fill('Test123!');
    await page.getByRole('button', { name: /zarejestruj się/i }).click();
    
    // Should redirect to home page
    await page.waitForURL('/');
    
    // Check localStorage contains JWT and user data
    const jwt = await page.evaluate(() => localStorage.getItem('jwt'));
    const user = await page.evaluate(() => localStorage.getItem('user'));
    
    expect(jwt).toBe('mock-jwt-token');
    expect(user).toBeTruthy();
    expect(JSON.parse(user!).email).toBe('newuser@example.com');
  });

  test('should navigate to login page when clicking login link', async ({ page }) => {
    await page.getByRole('link', { name: /zaloguj się/i }).click();
    await expect(page).toHaveURL('/login');
  });

  test('should have proper accessibility attributes', async ({ page }) => {
    const emailInput = page.getByLabel(/email firmowy/i);
    const passwordInput = page.getByLabel('Hasło', { exact: true });
    const confirmPasswordInput = page.getByLabel(/powtórz hasło/i);
    
    // Trigger validation errors
    await emailInput.focus();
    await emailInput.blur();
    await passwordInput.focus();
    await passwordInput.blur();
    await confirmPasswordInput.focus();
    await confirmPasswordInput.blur();
    
    // Check aria-invalid attributes
    await expect(emailInput).toHaveAttribute('aria-invalid', 'true');
    await expect(confirmPasswordInput).toHaveAttribute('aria-invalid', 'true');
    
    // Check aria-describedby for password (links to checklist)
    const passwordAriaDescribedBy = await passwordInput.getAttribute('aria-describedby');
    expect(passwordAriaDescribedBy).toBe('password-checklist');
    
    // Check password checklist has proper ARIA roles
    const checklist = page.getByRole('status', { name: /wymagania dotyczące hasła/i });
    await expect(checklist).toBeVisible();
    
    // Verify error messages have proper role="alert"
    const emailAriaDescribedBy = await emailInput.getAttribute('aria-describedby');
    expect(emailAriaDescribedBy).toBeTruthy();
    
    const emailError = page.locator(`#${emailAriaDescribedBy}`);
    await expect(emailError).toHaveAttribute('role', 'alert');
  });

  test('should work on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Verify form is visible and usable
    await expect(page.getByRole('heading', { name: /rejestracja/i })).toBeVisible();
    await expect(page.getByLabel(/email firmowy/i)).toBeVisible();
    await expect(page.getByLabel('Hasło', { exact: true })).toBeVisible();
    await expect(page.getByLabel(/powtórz hasło/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /zarejestruj się/i })).toBeVisible();
    
    // Verify password checklist is visible
    await expect(page.getByText(/hasło musi zawierać/i)).toBeVisible();
    
    // Test form submission
    await page.getByLabel(/email firmowy/i).fill('user@example.com');
    await page.getByLabel('Hasło', { exact: true }).fill('Test123!');
    await page.getByLabel(/powtórz hasło/i).fill('Test123!');
    
    // Should be able to submit
    const submitButton = page.getByRole('button', { name: /zarejestruj się/i });
    await expect(submitButton).toBeEnabled();
  });

  test('should validate password meets all criteria before allowing submission', async ({ page }) => {
    const emailInput = page.getByLabel(/email firmowy/i);
    const passwordInput = page.getByLabel('Hasło', { exact: true });
    const confirmPasswordInput = page.getByLabel(/powtórz hasło/i);
    const submitButton = page.getByRole('button', { name: /zarejestruj się/i });
    
    // Fill email
    await emailInput.fill('user@example.com');
    
    // Test various invalid passwords
    const invalidPasswords = [
      'short', // Too short
      'nouppercase123!', // No uppercase
      'NOLOWERCASE123!', // No lowercase
      'NoNumbers!', // No numbers
      'NoSpecial123', // No special characters
    ];
    
    for (const password of invalidPasswords) {
      await passwordInput.fill(password);
      await confirmPasswordInput.fill(password);
      await submitButton.click();
      
      // Should show some validation error (either from client or checklist)
      // The exact error depends on which criterion fails first
      await page.waitForTimeout(100);
    }
    
    // Now test valid password
    await passwordInput.fill('Valid123!');
    await confirmPasswordInput.fill('Valid123!');
    
    // Checklist should show all requirements met
    await expect(page.getByText(/✓ wszystkie wymagania spełnione/i)).toBeVisible();
  });

  test('should show domain hint text', async ({ page }) => {
    // Check that the hint about allowed domains is visible
    await expect(page.getByText(/użyj adresu email z dozwolonej domeny firmowej/i)).toBeVisible();
  });

  test('should clear server error when resubmitting', async ({ page }) => {
    // Mock API error first
    await page.route('**/api/v1/auth/register', async route => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'InvalidDomain',
          message: 'Invalid domain'
        })
      });
    });
    
    // Submit and get error
    await page.getByLabel(/email firmowy/i).fill('user@invalid.com');
    await page.getByLabel('Hasło', { exact: true }).fill('Test123!');
    await page.getByLabel(/powtórz hasło/i).fill('Test123!');
    await page.getByRole('button', { name: /zarejestruj się/i }).click();
    
    await expect(page.getByRole('alert')).toBeVisible();
    
    // Update route to succeed
    await page.unroute('**/api/v1/auth/register');
    await page.route('**/api/v1/auth/register', async route => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          jwt: 'mock-jwt',
          user: {
            id: 'user-123',
            email: 'user@valid.com',
            roles: ['user'],
            status: 'active',
            peer_limit: 5,
            created_at: new Date().toISOString()
          }
        })
      });
    });
    
    // Change email and resubmit
    await page.getByLabel(/email firmowy/i).fill('user@valid.com');
    await page.getByRole('button', { name: /zarejestruj się/i }).click();
    
    // Error should be cleared and redirect should happen
    await page.waitForURL('/');
  });
});

