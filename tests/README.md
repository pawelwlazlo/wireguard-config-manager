# End-to-End Testing

This project uses [Playwright](https://playwright.dev/) for end-to-end testing.

## Setup

### Install Browsers

Before running tests for the first time, install the required browsers:

```bash
pnpm exec playwright install
```

Or with npx:

```bash
npx playwright install
```

## Running Tests

### Run All Tests

```bash
pnpm run test:e2e
```

This will run all tests in headless mode across all configured browsers (Chromium, Firefox, WebKit).

### Interactive UI Mode

For development and debugging, run tests in interactive UI mode:

```bash
pnpm run test:e2e:ui
```

This opens the Playwright UI where you can:
- See all tests and their status
- Run individual tests
- See test results in real-time
- Time-travel through test execution
- Inspect the DOM at each step

### Debug Mode

Run tests in debug mode with the Playwright Inspector:

```bash
pnpm run test:e2e:debug
```

This allows you to:
- Step through tests line by line
- Pause and resume execution
- Edit selectors in real-time
- See console logs and network requests

### View Test Report

After running tests, view the HTML report:

```bash
pnpm run test:e2e:report
```

## Test Structure

Tests are organized by feature/view:

```
tests/
├── e2e/                         # End-to-end tests
│   ├── login.spec.ts           # Login page tests
│   ├── register.spec.ts        # Registration tests
│   ├── dashboard.spec.ts       # User dashboard tests
│   ├── change-password.spec.ts # Password change tests
│   ├── not-found.spec.ts       # 404 page tests
│   └── admin-config.spec.ts    # Admin config view tests
└── unit/                        # Unit tests (Vitest)
    ├── hooks/
    │   ├── useDashboard.test.ts      # Dashboard hook tests
    │   └── useAdminConfig.test.ts    # Admin config hook tests
    └── components/
        ├── ClaimPeerButton.test.tsx  # Button component tests
        ├── EmptyState.test.tsx       # Empty state component tests
        └── StatsCard.test.tsx        # Stats card component tests
```

## Writing Tests

### Test File Structure

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    // Setup before each test
    await page.goto('/route');
  });

  test('should do something', async ({ page }) => {
    // Test implementation
  });
});
```

### Best Practices

1. **Use semantic selectors**: Prefer `getByRole`, `getByLabel`, `getByText` over CSS selectors
2. **Mock API responses**: Use `page.route()` to mock API calls for predictable tests
3. **Test accessibility**: Include ARIA attributes and keyboard navigation tests
4. **Test mobile viewports**: Include mobile viewport tests where applicable
5. **Clear test names**: Use descriptive test names that explain what is being tested

### Example: Mocking API Response

```typescript
test('should handle API error', async ({ page }) => {
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

  // Continue with test...
});
```

## Configuration

Test configuration is in `playwright.config.ts`. Key settings:

- **Base URL**: `http://localhost:4321` (configurable via `BASE_URL` env var)
- **Browsers**: Chromium, Firefox, WebKit, Mobile Chrome, Mobile Safari
- **Retries**: 2 retries on CI, 0 locally
- **Workers**: 1 on CI (for stability), parallel locally
- **Screenshots**: Only on failure
- **Traces**: Only on first retry

## CI/CD Integration

Tests run automatically in CI/CD pipelines. The configuration:

- Runs in headless mode
- Uses single worker for stability
- Retries failed tests twice
- Generates HTML report artifacts
- Starts dev server automatically

## Troubleshooting

### Tests fail to start

Make sure browsers are installed:
```bash
pnpm exec playwright install
```

### Port already in use

If port 4321 is already in use, the tests will fail to start. Either:
1. Stop the process using port 4321
2. Change the port in `playwright.config.ts`

### Flaky tests

If tests are flaky:
1. Add explicit waits: `await page.waitForURL()`, `await page.waitForSelector()`
2. Use `page.waitForLoadState('networkidle')` after navigation
3. Increase timeouts if needed
4. Check for race conditions in the application

### Debug with browser UI

To see what's happening in the browser:

```bash
pnpm exec playwright test --headed --debug
```

## Resources

- [Playwright Documentation](https://playwright.dev/)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Playwright API Reference](https://playwright.dev/docs/api/class-playwright)

