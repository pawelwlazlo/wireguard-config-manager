# UI Architecture Planning Summary

## Decisions

1. **Zaakceptowano wszystkie rekomendacje dotyczące struktury nawigacji i organizacji widoków** (pytania 1-2) - warunkowa nawigacja oparta na rolach z wyraźnym rozdzieleniem kontekstu User vs Admin, wielokrotnego użytku komponenty dla list peerów.

2. **Zaakceptowano strategię obsługi tymczasowych haseł** (pytanie 3) - middleware sprawdzający flagę `requires_password_change` z przekierowaniem na dedykowany ekran zmiany hasła.

3. **Zaakceptowano design interakcji FIFO claim** (pytanie 4) - licznik peerów, inteligentne disable przycisku z tooltipami, modal po sukcesie z opcją ustawienia friendly name.

4. **Zaakceptowano strategię zarządzania stanem** (pytanie 5) - Astro SSR dla danych początkowych + React Query dla cache'owania i synchronizacji + React Context dla stanu globalnego.

5. **Zaakceptowano proces revokacji z obsługą błędów** (pytanie 6) - confirmation dialog, loading overlay, szczegółowa obsługa błędów transakcji z opcją retry.

6. **Zaakceptowano implementację Audit Log** (pytanie 7) - standardowa paginacja z 50 rekordami, auto-refresh co 30s, filtry jako query params.

7. **Zaakceptowano strategię responsywności** (pytanie 8) - desktop: pełne tabele, mobile: card layout z expandable details, Tailwind breakpoints.

8. **Zaakceptowano centralny error handler** (pytanie 9) - mapowanie kodów błędów API na przyjazne komunikaty, error boundary, strukturalna obsługa 401/403/400/404/500.

9. **Zaakceptowano proces importu konfiguracji** (pytanie 10) - dedykowany widok z progress indicator, summary card, szczegółowa lista skipped files.

10. **Zaakceptowano strukturę routingu Astro pages vs React components** (pytanie 11) - Astro pages dla routing, React islands dla interaktywności.

11. **Zaakceptowano organizację komponentów React** (pytanie 12) - struktura `ui/`, `features/`, `shared/`, `layout/` z grupowaniem po domenach.

12. **Zaakceptowano design header/nawigacji** (pytanie 13) - logo, menu, avatar dropdown z email, role badge, change password, logout.

13. **Zaakceptowano formularz rejestracji** (pytanie 14) - real-time walidacja domeny, live validation checklist dla hasła, React Hook Form + Zod.

14. **Zaakceptowano minimalistyczny dashboard użytkownika** (pytanie 15) - hero section, stats card, primary CTA, peer list/grid, empty state.

15. **Zaakceptowano inline editing dla friendly name** (pytanie 16) - click-to-edit pattern, live validation, Enter/Esc handling, debounced save.

16. **Zaakceptowano admin Users List design** (pytanie 17) - kolumny (Email, Role, Status, Peers, Created Date, Actions), search box, filter dropdowns, sortowanie.

17. **Zaakceptowano proces Reset Password** (pytanie 18) - modal z ostrzeżeniem, one-time display temporary password, copy button, checkbox potwierdzenia.

18. **Zaakceptowano strategię cache'owania React Query** (pytanie 19) - różne staleTime dla różnych endpoints, invalidation po mutacjach, optimistic updates.

19. **Zaakceptowano design widoku Config** (pytanie 20) - read-only cards, masked sensitive paths, system status indicators, disclaimer.

20. **Zaakceptowano download flow** (pytanie 21) - modal dla ustawienia friendly name przed pierwszym download, toast z instrukcjami, rate limiting.

21. **Zaakceptowano stany wizualne Peer cards** (pytanie 22) - status badges z kolorami, visual cues (border, opacity), ikony, hover states, loading states.

22. **Zaakceptowano reusable Pagination component** (pytanie 23) - props-based configuration, query params dla shareable URLs, accessibility.

23. **Zaakceptowano obsługę scenariusza NoAvailable** (pytanie 24) - informacyjny modal/toast, disable przycisku claim, alert dla admina gdy available < 10.

24. **Zaakceptowano filtry i sorting w Audit Log** (pytanie 25) - event type multi-select, date range picker z presets, sorting, export to CSV.

25. **Zaakceptowano design modalu Assignment** (pytanie 26) - combobox z search, tylko users poniżej limitu, warning o limicie, obsługa błędów.

26. **Zaakceptowano middleware authentication** (pytanie 27) - JWT validation, role-based guards, `Astro.locals` dla user profile, CSRF protection.

27. **Zaakceptowano visual feedback patterns** (pytanie 28) - progress modals dla import, optimistic UI dla mutations, top progress bar dla navigation, toast notifications.

28. **Zaakceptowano wymagania accessibility** (pytanie 29) - keyboard navigation, ARIA labels, focus indicators, contrast minimum 4.5:1, semantic HTML, WCAG 2.1 AA.

29. **Zaakceptowano organizację TypeScript types** (pytanie 30) - centralne `types.ts`, DTO types, request/response types, enums, Zod schemas dla runtime validation.

## Matched Recommendations

### Struktura i Nawigacja (1-3, 11-13)
- Warunkowa nawigacja oparta na rolach z bocznym menu (desktop) i hamburger menu (mobile)
- Routing w Astro pages z React islands dla interaktywności
- Struktura komponentów: `ui/`, `features/`, `shared/`, `layout/`
- Header z logo, menu, avatar dropdown (email, role, change password, logout)

### Zarządzanie Stanem i Integracja API (5, 19, 27)
- Astro SSR dla danych początkowych
- React Query dla cache'owania (różne staleTime per endpoint)
- React Context dla stanu globalnego
- Middleware dla authentication guards i JWT validation
- Optimistic updates i invalidation po mutacjach

### Przepływy Użytkownika - User Role (4, 14-16, 21)
- Dashboard: hero section, stats "X/Y peers", primary CTA "Get New Configuration"
- Peer list jako grid kart z inline editing friendly name
- Download flow z modalem dla ustawienia nazwy, toast z instrukcjami
- Click-to-edit pattern dla friendly name z live validation
- Empty state z ilustracją i CTA

### Przepływy Użytkownika - Admin Role (17-18, 20, 25-26)
- Users List: kolumny Email, Role, Status, Peers (X/Y), Actions
- Reset Password: modal z one-time display temporary password
- Config view: read-only cards z masked paths, system status
- Audit Log: filtry (event type, date range), sorting, export CSV
- Assignment modal: combobox z users poniżej limitu, validation

### Operacje i Procesy (6, 10, 24, 28)
- Revokacja: confirmation dialog, loading overlay, szczegółowa obsługa błędów
- Import: progress indicator, summary card, lista skipped files
- NoAvailable scenario: modal/toast, disable CTA, admin alert
- Visual feedback: progress modals, optimistic UI, toast notifications

### Responsywność i UI Patterns (8, 22-23)
- Desktop: pełne tabele, Mobile: card layout z expandable details
- Status badges z kolorami, visual cues (border, opacity, icons)
- Reusable Pagination z query params dla shareable URLs
- Tailwind breakpoints dla warunkowego renderowania

### Błędy i Bezpieczeństwo (9, 27)
- Centralny error handler mapujący kody API na komunikaty
- 401 → redirect login, 403 → access denied banner, 500 → error boundary
- Middleware z JWT validation, role guards, CSRF protection
- Rate limiting dla download (max 5/min)

### Formularze i Walidacja (14, 16, 26)
- React Hook Form + Zod dla wszystkich formularzy
- Real-time validation z visual feedback
- Live validation checklist dla złożonych wymagań (hasło)
- Inline errors z aria-describedby

### Accessibility (29)
- Keyboard navigation (Tab, Enter, Esc, Space)
- ARIA labels dla icon buttons
- Focus indicators, contrast 4.5:1 minimum
- Screen reader announcements (aria-live)
- Semantic HTML z proper heading hierarchy
- WCAG 2.1 AA compliance

### TypeScript i Type Safety (30)
- Centralne `src/types.ts` dla Entity i DTO types
- Zod schemas dla runtime validation
- Type safety między Astro pages, React components, API
- Enums dla UserRole, PeerStatus, AuditEventType

## Architektura UI - Szczegółowe Podsumowanie

### 1. Stack Technologiczny
- **Framework**: Astro 5 z Node adapter (standalone SSR)
- **UI Library**: React 19 dla interactive components
- **Styling**: Tailwind CSS 4
- **Component Library**: shadcn/ui dla accessible primitives
- **State Management**: React Query (TanStack Query) + React Context
- **Forms**: React Hook Form + Zod
- **TypeScript**: Strict mode z centralnymi types

### 2. Struktura Projektu i Routing

#### Pages (Astro)
```
/index.astro              → Dashboard (warunkowy: user vs admin view)
/login.astro              → Login form
/register.astro           → Registration form
/change-password.astro    → Password change (forced dla temporary password)
/admin/users.astro        → Admin: Users management
/admin/peers.astro        → Admin: Global peers list
/admin/audit.astro        → Admin: Audit log
/admin/import.astro       → Admin: Configuration import
/admin/config.astro       → Admin: System configuration (read-only)
```

#### Components (React)
```
src/components/
├── ui/                   → shadcn/ui primitives
├── features/
│   ├── auth/            → LoginForm, RegisterForm, ChangePasswordForm
│   ├── peers/           → PeerList, PeerCard, ClaimPeerButton, DownloadButton
│   ├── users/           → UserList, UserLimitEditor, UserStatusBadge
│   └── audit/           → AuditLogTable, AuditEventBadge, AuditFilters
├── shared/              → ErrorBoundary, LoadingSpinner, ConfirmDialog, Pagination
└── layout/              → Navigation, Header, Sidebar
```

### 3. Kluczowe Widoki i Przepływy

#### 3.1 User Dashboard
**Sekcje**:
- Hero: "Welcome, {email}"
- Stats card: "You have X/Y configurations"
- Primary CTA: "Get New Configuration" (warunkowy: disabled gdy X >= Y)
- Peer grid/list z kartami

**Peer Card** zawiera:
- Friendly name (inline editable z validation `^[a-z0-9-]+$`)
- Public key (skrócony) z copy button
- Status badge (Active=zielony, Revoked=czerwony z opacity 0.6)
- Created date
- Actions: Download, Revoke (confirmation required)

**Empty State**: Illustration + "Click button above to claim your first configuration"

#### 3.2 Admin - Users Management
**Tabela z kolumnami**: Email | Role (badge) | Status (badge) | Peers (X/Y) | Created Date | Actions

**Filtry**: Search (email), Status dropdown (all/active/inactive), Role dropdown

**Actions per user**:
- Edit Limit (modal z validation: ≤ max_limit)
- Reset Password (modal z one-time display)
- Deactivate/Activate (confirmation + cascade revoke)
- View Audit (filter audit log by user)

#### 3.3 Admin - Global Peers List
**Reusable PeerList component** w trybie admin:
- Dodatkowe kolumny: Owner (email)
- Actions: Assign (modal z user picker), Revoke (admin), View Details
- Filtry: Status, Owner, Date range

**Assignment Modal**:
- Combobox "Select User" (tylko users z active_peers < peer_limit)
- Display: "email (X/Y peers)"
- Warning gdy blisko limitu
- Validation: LimitExceeded error handling

#### 3.4 Admin - Audit Log
**Tabela read-only**: Timestamp | Event Type | User | Details (expandable) | IP Address

**Filtry**:
- Event Type: multi-select dropdown (wszystkie typy z API)
- Date Range: picker z presets (Today, Last 7 days, Last 30 days, Custom)
- User: autocomplete (optional MVP)

**Features**:
- Sortowanie: Created At (desc default)
- Pagination: 50 per page
- Auto-refresh: co 30s (optional)
- Export to CSV button

#### 3.5 Admin - Import
**UI Flow**:
1. Button "Start Import"
2. Progress modal: "Scanning directory..." → "Processing files..."
3. Summary card po completion:
   - "Successfully imported: X files"
   - "Skipped: Y files" (expandable list z reasons)
4. Error state: 500 DirError z instrukcjami (check permissions, path)

#### 3.6 Admin - Config (Read-only)
**Card sections**:
- Application Settings: default/max peer limit, session timeout
- Allowed Email Domains: badges list
- Directory Configuration: paths (masked if sensitive)
- System Status: last import, available peers count, health indicators

**Disclaimer**: "Configuration is read-only. Contact system administrator to make changes."

### 4. Kluczowe Interakcje i Przepływy

#### 4.1 Registration Flow
1. Form: email, password, confirm password
2. Real-time validation: allowed domains display, password checklist (8+ chars, number, special char)
3. Submit → API errors jako inline (409 EmailExists, 400 InvalidDomain)
4. Success → auto-login + redirect dashboard
5. First user → auto-granted admin role (backend trigger)

#### 4.2 Login Flow
1. Form: email, password
2. Submit → `POST /api/v1/auth/login`
3. Success: store JWT, redirect dashboard
4. Check `requires_password_change` flag → force redirect `/change-password`

#### 4.3 Claim Peer Flow (FIFO)
1. Button "Get New Configuration" (enabled gdy X < Y)
2. Click → `POST /api/v1/peers/claim`
3. Loading state (optimistic UI)
4. Success: Modal "Configuration claimed!" z:
   - Input "Set friendly name" (optional, can set later)
   - Button "Download Now" → trigger download
5. Error 404 NoAvailable: Toast "No configurations available"
6. Error 400 LimitExceeded: Shouldn't happen (button disabled), ale show error

#### 4.4 Download Flow
1. Click "Download" → check friendly name
2. If not set: Modal "Set a friendly name first"
3. `GET /api/v1/peers/{id}/download` → browser download file
4. Toast: "Configuration downloaded! Import it in your WireGuard client." + docs link
5. Audit log: PEER_DOWNLOAD event

#### 4.5 Revoke Peer Flow
1. Click "Revoke" → Confirmation dialog: "This will permanently revoke this configuration. Continue?"
2. Confirm → `DELETE /api/v1/peers/{id}`
3. Loading overlay: "Revoking peer..."
4. Success: Optimistic UI remove + toast "Configuration revoked"
5. Error 500: Toast z details + "Retry" button + "Report Issue" link

#### 4.6 Reset Password Flow (Admin)
1. Admin clicks "Reset Password" in user actions
2. Modal warning: "This will generate a one-time temporary password. The password will be shown only once - make sure to save it securely."
3. Confirm → `POST /api/v1/admin/users/{id}/reset-password`
4. Modal displays temporary password:
   - Large font, masked with show/hide toggle
   - Copy button
   - Checkbox "I have saved the password" (required before close)
5. After close: no access to password again
6. Audit log: RESET_PASSWORD event

### 5. Integracja API i Zarządzanie Stanem

#### 5.1 Authentication & Authorization
**Middleware** (`src/middleware/index.ts`):
- Extract JWT z cookies/Authorization header
- Validate token z Supabase
- Store user profile + roles w `Astro.locals`
- Protected routes: redirect `/login` jeśli brak tokenu
- Admin routes: sprawdź role, redirect jeśli not admin
- CSRF protection dla mutations

**React Context**: `AuthContext` seed z server data, accessible w islands

#### 5.2 React Query Configuration
```typescript
// Cache strategy
{
  '/users/me': { staleTime: 5m, cacheTime: 10m },
  '/peers': { staleTime: 30s, cacheTime: 5m, refetchOnWindowFocus: true },
  '/admin/users': { staleTime: 1m, cacheTime: 5m },
  '/admin/peers': { staleTime: 1m, cacheTime: 5m },
  '/admin/audit': { staleTime: 2m },
  '/admin/config': { staleTime: 15m }
}
```

**Invalidation Strategy**:
- Po claim peer → invalidate `['/peers', '/users/me']`
- Po revoke → invalidate `['/peers', '/admin/peers']`
- Po assign → invalidate `['/admin/peers', '/admin/users']`
- Po import → invalidate `['/admin/peers', '/admin/config']`

**Optimistic Updates**:
- Revoke peer: remove z listy immediately, rollback on error
- Edit friendly name: update inline immediately, rollback on error
- Claim peer: add temporary card, replace z real data on success

#### 5.3 Error Handling (Centralny Handler)
```typescript
// React Query global error handler
401 Unauthorized → clearSession() + redirect('/login')
403 Forbidden → show banner "Access Denied - {required role}"
400 Bad Request → inline form errors
404 Not Found → inline errors lub toast
500 Server Error → ErrorBoundary z "Try Again" + error reporting
```

**Error Response Structure**: `{ code: string, message: string, details?: any }`

### 6. Responsywność i Accessibility

#### 6.1 Responsive Breakpoints (Tailwind)
- **Mobile** (< 768px): Card layout, hamburger menu, stacked forms
- **Tablet** (768px - 1024px): Card/list hybrid, sidebar menu
- **Desktop** (> 1024px): Full tables, sidebar menu, multi-column layout

**Specific Patterns**:
- Tables → Cards on mobile z expandable details
- Forms: single column mobile, multi-column desktop
- Modals: full screen mobile, centered desktop
- Navigation: hamburger mobile, persistent sidebar desktop

#### 6.2 Accessibility (WCAG 2.1 AA)
- **Keyboard Navigation**: Tab order, Enter/Space activation, Esc close modals
- **ARIA**: labels dla icon buttons, describedby dla errors, live regions dla updates
- **Focus Management**: visible indicators (ring utilities), trap focus w modals, restore on close
- **Color**: contrast minimum 4.5:1, nie tylko kolor dla info (ikony + text)
- **Semantic HTML**: proper heading hierarchy (h1→h6), buttons vs links, landmarks
- **Screen Readers**: announcements dla dynamic updates, meaningful labels
- **Forms**: associated labels, error announcements, clear instructions

#### 6.3 Visual Design Tokens
**Status Colors**:
- Available: gray-500
- Active: green-600
- Inactive/Revoked: red-600

**Role Badges**:
- Admin: blue-600
- User: gray-600

**Interactive States**:
- Hover: subtle shadow, scale-105
- Active: scale-95
- Disabled: opacity-50, cursor-not-allowed
- Loading: opacity-70 + spinner overlay

### 7. Type Safety i Validation

#### 7.1 TypeScript Types (`src/types.ts`)
```typescript
// Entities (from database.types.ts)
type User, Peer, AuditLog, Role, etc.

// DTOs (API responses)
type UserDto, PeerDto, AuditDto

// Request Bodies
type RegisterRequest, LoginRequest, ClaimPeerRequest, UpdatePeerRequest

// Pagination
type Page<T> = { items: T[], total: number, page: number, size: number }
type PaginationParams = { page: number, size: number }

// Enums
enum UserRole { ADMIN = 'admin', USER = 'user' }
enum PeerStatus { AVAILABLE = 'available', ACTIVE = 'active', INACTIVE = 'inactive' }
enum AuditEventType { LOGIN, PEER_CLAIM, PEER_DOWNLOAD, ... }
```

#### 7.2 Validation Schemas (Zod)
```typescript
// Registration
registerSchema = z.object({
  email: z.string().email().refine(emailMatchesAllowedDomain),
  password: z.string().min(8).regex(passwordComplexity),
  confirmPassword: z.string()
}).refine(passwordsMatch)

// Friendly Name
friendlyNameSchema = z.string().regex(/^[a-z0-9-]+$/).max(63)

// Peer Limit
peerLimitSchema = z.number().positive().max(maxLimitFromConfig)
```

### 8. Security Considerations

#### 8.1 Authentication
- JWT tokens w httpOnly cookies (preferred) lub Authorization header
- Access token: 15 min expiry
- Refresh token: 7 days expiry
- Session validation w middleware na każdym request

#### 8.2 Authorization
- Role-based access control (RBAC)
- RLS policies w Supabase jako defense-in-depth
- Owner-based filtering dla peer operations
- Admin-only routes chronione middleware

#### 8.3 Data Protection
- Admins NEVER see private keys
- Admins CANNOT download user configs
- Sensitive config values masked w UI
- Audit log dla wszystkich privileged operations
- Rate limiting: auth endpoints (10 req/min), download (5 req/min)

#### 8.4 CSRF Protection
- CSRF tokens dla mutations
- SameSite cookies
- Origin validation

### 9. Performance Optimizations

#### 9.1 Loading Strategies
- Astro SSR dla first paint
- React hydration tylko dla interactive islands
- Code splitting per route
- Lazy loading dla modals/heavy components

#### 9.2 Caching
- React Query intelligent caching
- Stale-while-revalidate pattern
- Prefetching dla predicted navigation

#### 9.3 API Optimization
- Pagination dla wszystkich lists
- Field selection (optional MVP)
- Debounced search inputs (300ms)
- Optimistic UI updates

### 10. Component Patterns

#### 10.1 Shared Components
- `<Pagination />`: reusable, query params, accessible
- `<ConfirmDialog />`: reusable confirmation dla destructive actions
- `<ErrorBoundary />`: catch errors, fallback UI, retry
- `<LoadingSpinner />`: consistent loading states
- `<StatusBadge />`: status + role badges z colors
- `<CopyButton />`: copy-to-clipboard z feedback

#### 10.2 Feature Components
- `<PeerList />`: mode prop (user|admin), conditional columns/actions
- `<PeerCard />`: all peer info + inline editing + actions
- `<UserTable />`: admin users management
- `<AuditLogTable />`: filterable, sortable, exportable
- `<ClaimPeerButton />`: conditional rendering, limit checking
- `<AssignmentModal />`: user picker, validation

### 11. Testing Strategy (Future)
- Unit tests: Components z Vitest + React Testing Library
- Integration tests: API calls z MSW (Mock Service Worker)
- E2E tests: Critical paths z Playwright
- Accessibility tests: axe-core automated checks

## Unresolved Issues

### Wymagające Dalszych Decyzji

1. **Strategia notyfikacji**
   - Real-time notifications dla adminów (np. gdy available peers < 10)?
   - Email notifications czy tylko in-app?
   - WebSocket/SSE dla live updates czy polling wystarcza dla MVP?

2. **Bulk operations (poza MVP)**
   - Bulk peer assignment/revocation przez admina w przyszłości?
   - Multi-select w tabelach?
   - Batch import progress tracking?

3. **Internationalization (i18n)**
   - Czy aplikacja ma być wielojęzyczna?
   - Polski i angielski?
   - Jak przechowywać tłumaczenia?

4. **Branding i Design System**
   - Czy istnieje corporate style guide?
   - Custom theme dla Tailwind/shadcn?
   - Logo, favicons, brand colors?

5. **Analytics i Monitoring**
   - Tracking user behavior (Google Analytics, Plausible)?
   - Error tracking (Sentry)?
   - Performance monitoring (Web Vitals)?

6. **Documentation dla użytkowników**
   - In-app help/tooltips?
   - Separate documentation site?
   - Video tutorials dla setup WireGuard?

7. **Password Policy Details**
   - Dokładne wymagania complexity (długość, znaki specjalne)?
   - Expiration policy dla temporary passwords?
   - History - prevent reuse?

8. **Session Management**
   - Concurrent sessions allowed?
   - "Remember me" option?
   - Session timeout idle vs absolute?

9. **Deployment Strategy**
   - Docker image dla VPS?
   - CI/CD pipeline details?
   - Environment configuration (dev, staging, prod)?

10. **Data Retention**
    - Audit log retention policy (90 days, 1 year)?
    - Soft delete vs hard delete dla users/peers?
    - Archive strategy dla inactive data?

### Uwagi Techniczne

1. **Supabase specifics**
   - Self-hosted czy Supabase Cloud?
   - Database backup strategy?
   - RLS policies testing?

2. **File storage**
   - Gdzie przechowywać encrypted config files (filesystem vs DB blob)?
   - Backup strategy dla `PeerConfigDirectory` i `RevokedPeerDirectory`?

3. **API versioning**
   - `/api/v1` established - strategy dla v2 w przyszłości?
   - Deprecation policy?

4. **Rate limiting implementation**
   - Na poziomie reverse proxy (nginx) czy application?
   - Redis dla distributed rate limiting?

