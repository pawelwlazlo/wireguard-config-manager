# Architektura UI dla WireGuard Configuration Manager

## 1. Przegląd struktury UI

Aplikacja składa się z dwóch głównych kontekstów:

1. Kontekst **User** – standardowy pracownik pobierający i zarządzający własnymi konfiguracjami.
2. Kontekst **Admin** – administrator systemu zarządzający użytkownikami, peerami, importem i audytem.

Routing oparty jest o pliki Astro (`src/pages`) z komponentami React jako _islands_ dla interaktywnych sekcji. Nawigacja warunkowa (rola) pozwala użytkownikom widzieć tylko odpowiednie widoki.

## 2. Lista widoków

### 2.1 Login
- **Ścieżka**: `/login`
- **Cel**: Uwierzytelnienie użytkownika.
- **Kluczowe informacje**: formularz e-mail/hasło, link do rejestracji.
- **Komponenty**: `LoginForm`, `ErrorBanner`.
- **Uwagi UX/A11y/Security**: walidacja w czasie rzeczywistym, obsługa 401, pola oznaczone `autocomplete`.

### 2.2 Register
- **Ścieżka**: `/register`
- **Cel**: Rejestracja nowego użytkownika (domeny firmowe).
- **Kluczowe informacje**: formularz e-mail, hasło, potwierdzenie, checklist wymagań.
- **Komponenty**: `RegisterForm`, `PasswordChecklist`.
- **Uwagi**: walidacja domeny, zablokowanie przycisku do spełnienia warunków, komunikaty dostępne dla czytników.

### 2.3 Change Password (forced & voluntary)
- **Ścieżka**: `/change-password`
- **Cel**: Zmiana hasła (wymuszona przy temp. haśle).
- **Kluczowe informacje**: aktualne hasło, nowe hasło ×2.
- **Komponenty**: `ChangePasswordForm`.
- **Uwagi**: wymuszenie przejścia przy `requires_password_change`, ochrona CSRF.

### 2.4 Dashboard (User)
- **Ścieżka**: `/`
- **Cel**: Centralny widok użytkownika łączący statystyki oraz **pełną listę posiadanych peerów** (oddzielna podstrona nie jest wymagana).
- **Kluczowe informacje**: licznik `X/Y` peerów, **tabela / grid kart peerów** z możliwością pobrania, edycji nazwy i revokacji, CTA _Get New Configuration_.
- **Komponenty**: `StatsCard`, `ClaimPeerButton`, `PeerList` (tryb `user`), `PeerDetailsModal` (otwierany z kart).
- **Uwagi**: przycisk disabled przy osiągnięciu limitu; empty-state z ilustracją.

### 2.5 Global Error / Access Denied
- **Ścieżki**: `/error`, `/403`
- **Cel**: Komunikaty globalne.
- **Komponenty**: `ErrorBoundary`, `AccessDeniedBanner`.

### 2.6 Users List (Admin)
- **Ścieżka**: `/admin/users`
- **Cel**: Zarządzanie użytkownikami.
- **Kluczowe informacje**: tabela użytkowników z filtrami.
- **Komponenty**: `UserTable`, `UserLimitEditorModal`, `ResetPasswordModal`, `ConfirmDialog`.
- **Uwagi**: dostęp tylko dla `admin`, filtrowanie status/rola.

### 2.7 Global Peers List (Admin)
- **Ścieżka**: `/admin/peers`
- **Cel**: Przegląd i operacje na wszystkich peerach.
- **Kluczowe informacje**: tabela peerów, filtry, akcje.
- **Komponenty**: `PeerList` (tryb `admin`), `AssignmentModal`, `ConfirmDialog`.

### 2.8 Audit Log (Admin)
- **Ścieżka**: `/admin/audit`
- **Cel**: Wgląd w dziennik audytu.
- **Kluczowe informacje**: tabela zdarzeń, filtry typu/daty.
- **Komponenty**: `AuditLogTable`, `AuditFilters`, `Pagination`.

### 2.9 Import (Admin)
- **Ścieżka**: `/admin/import`
- **Cel**: Uruchomienie i podgląd importu peerów.
- **Kluczowe informacje**: przycisk _Start Import_, modal progresu, karta podsumowania.
- **Komponenty**: `ImportProgressModal`, `ImportSummaryCard`.
- **Uwagi**: obsługa błędów katalogu (`DirError`).

### 2.10 Config (Admin)
- **Ścieżka**: `/admin/config`
- **Cel**: Podgląd konfiguracji systemu (read-only).
- **Kluczowe informacje**: karty ustawień, statusy systemu.
- **Komponenty**: `ConfigCard`, `StatusIndicator`.

### 2.11 Not Found
- **Ścieżka**: `*`
- **Cel**: 404.
- **Komponenty**: `NotFoundIllustration`.

## 3. Mapa podróży użytkownika

1. **Rejestracja → Dashboard**  
   `/register` → success → automatyczny login → `/` (Dashboard).  
   *Edge*: już istnieje konto → błąd 409 → komunikat inline.
2. **Login → Dashboard**  
   `/login` → `/` (lub `/change-password` jeśli `requires_password_change`).
3. **Claim Peer**  
   Dashboard → klik _Get New Configuration_ → `POST /api/v1/peers/claim` → modal sukcesu → opcjonalne ustawienie nazwy → download.
4. **Download Peer**  
   `PeerCard` → _Download_ → jeśli brak friendly_name, modal ustawienia → `GET /api/v1/peers/{id}/download`.
5. **Revoke Peer**  
   `PeerCard` → _Revoke_ → `ConfirmDialog` → `DELETE /api/v1/peers/{id}` → UI aktualizuje listę.
6. **Admin: Reset Password**  
   `/admin/users` → akcja _Reset_ → modal potwierdzenia → `POST /admin/users/{id}/reset-password` → wyświetlenie tymczasowego hasła.
7. **Admin: Import**  
   `/admin/import` → _Start Import_ → modal progresu → podsumowanie.

## 4. Układ i struktura nawigacji

- **Header** (mobile & desktop): logo, avatar dropdown (email, role, _Change password_, _Logout_).
- **Sidebar** (≥ md):
  - Dashboard (`/`)
  - Jeśli `admin`:
    - Users (`/admin/users`)
    - Peers (`/admin/peers`)
    - Audit (`/admin/audit`)
    - Import (`/admin/import`)
    - Config (`/admin/config`)
- **Mobile**: hamburger menu otwierające _Drawer_ z tymi samymi pozycjami.
- **Breadcrumbs** dla widoków zagnieżdżonych (opcjonalnie).

## 5. Kluczowe komponenty

| Komponent | Zastosowanie | Kluczowe cechy |
|-----------|-------------|----------------|
| `LoginForm`, `RegisterForm`, `ChangePasswordForm` | Formularze auth | React Hook Form + Zod, inline errors
| `PeerList` / `PeerCard` | Lista peerów | Tryby user/admin, status badges, inline edit name
| `ClaimPeerButton` | CTA Dashboard | Disabled logic, tooltip przy limit exceeded
| `UserTable` | Lista użytkowników | Paginacja, sortowanie, filtry, akcje
| `AuditLogTable` | Dziennik audytu | Auto-refresh, export CSV
| `AssignmentModal` | Admin assign peer | Combobox z filtracją users, limit walidacja
| `ImportProgressModal` | Import | Multi-step progress, anulowanie disabled
| `Pagination` | Wiele list | Dostępny, query-param sync
| `ConfirmDialog` | Destrukcyjne akcje | Trap focus, aria-labelled
| `ErrorBoundary` / `ErrorBanner` | Globalne błędy | Mapowanie kodów API na komunikaty
| `StatusBadge` | Role & Peer status | Kolory wg design tokens
| `LoadingSpinner` | Wczytywanie | Dostępne opisy (`aria-label="loading"`)

---

Architektura interfejsu spełnia wszystkie historyjki użytkownika z PRD, wykorzystuje punkty końcowe API zgodnie z planem i integruje rekomendacje z sesji planowania, zapewniając spójną, dostępną i bezpieczną nawigację dla użytkowników i administratorów.
