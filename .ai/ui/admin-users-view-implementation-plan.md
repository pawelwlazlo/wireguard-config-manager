# Plan implementacji widoku Admin Users

## 1. Przegląd

Widok **Admin Users** umożliwia administratorowi przeglądanie i zarządzanie kontami użytkowników. Pozwala on:

* przeglądać listę użytkowników w formie stronicowanej tabeli z filtrami (status, domena, rola),
* zainicjować reset hasła wybranego użytkownika,
* zmienić limit peerów (`peer_limit`) oraz status użytkownika (aktywacja / dezaktywacja),
* przejrzeć podstawowe metryki (liczba przypisanych peerów).

## 2. Routing widoku

* **Ścieżka**: `/admin/users`
* Dostęp: tylko dla roli `admin` (weryfikowane przez middleware + komponent Guard).

## 3. Struktura komponentów

```
AdminUsersPage (route)
└─ UserTable (tabela, paginacja, sortowanie, filtry)
   ├─ UserTableFilterBar (status, domena, rola)
   ├─ TableRow → ActionCell
   │   ├─ EditLimitButton → UserLimitEditorModal
   │   ├─ ResetPwdButton → ResetPasswordModal
   │   └─ DeactivateButton → ConfirmDialog
   └─ TablePagination
```

## 4. Szczegóły komponentów

### 4.1 `AdminUsersPage`

* **Opis**: komponent routingu odpowiedzialny za pobranie danych (hook `useAdminUsers`) i przekazanie ich do `UserTable`.
* **Elementy**: wrapper `Layout`, nagłówek strony, komponent tabeli.
* **Interakcje**:
  * Zmiana filtrów / paginacji → aktualizacja stanu URL i ponowne pobranie danych.
* **Walidacja**: brak (delegowana do dzieci / hooka).
* **Typy**: `AdminUsersPageProps` – brak dodatkowych.
* **Propsy**: brak (dane pobiera sam przez hook).

### 4.2 `UserTable`

* **Opis**: renderuje tabelę użytkowników z kolumnami: e-mail, rola, status, limit, peers_count, akcje.
* **Elementy**: `<table>`, `<thead>`, `<tbody>`, `UserTableFilterBar`, `TablePagination`.
* **Interakcje**:
  * Kliknięcie nagłówka kolumny → sortowanie (status/rola/limit/dom.)
  * Kliknięcie przycisku akcji w wierszu.
* **Walidacja**:
  * Przy sortowaniu – regex `^[a-z_]+:(asc|desc)$` (spójne z backendem).
* **Typy**:
  * `UserTableProps` { data: Page<UserVM>; onChange(params) }
  * `UserVM` – ViewModel (patrz sekcja Typy).
* **Propsy**: patrz wyżej.

### 4.3 `UserTableFilterBar`

* **Opis**: pasek filtrów (status select, domena input, rola select) + przycisk „Wyczyść”.
* **Elementy**: `Select`, `Input`, `Button`.
* **Interakcje**: onChange → debounce 300 ms → `onFiltersChange`.
* **Walidacja**:
  * `status` ∈ {`active`,`inactive`}
  * `domain` – string (min 1 znak)
* **Typy**: `UserFilter`.
* **Propsy**: `{ value: UserFilter; onChange: (v) => void }`

### 4.4 `UserLimitEditorModal`

* **Opis**: modal do edycji `peer_limit` (input number).
* **Elementy**: `Dialog`, `InputNumber`, `Button` OK/Cancel.
* **Interakcje**: submit → PATCH `/api/v1/admin/users/{id}` body `{ peer_limit }`.
* **Walidacja**: wartość >0 i ≤ `maxLimit` (z konfiguracji lub stała 50).
* **Typy**: `UpdateLimitPayload`.
* **Propsy**: `{ user: UserVM; onSuccess(updatedUser) }`.

### 4.5 `ResetPasswordModal`

* **Opis**: modal z potwierdzeniem resetu hasła i wyświetleniem jednorazowego hasła.
* **Elementy**: `Dialog`, `Alert`, `Button`.
* **Interakcje**: klik „Reset” → POST `/api/v1/admin/users/{id}/reset-password` → wyświetl `temporary_password` → kopia do schowka.
* **Walidacja**: brak (akcja bez body).
* **Typy**: `ResetPasswordResponse`.
* **Propsy**: `{ userId: string }`.

### 4.6 `ConfirmDialog`

* **Opis**: generyczny dialog potwierdzający (używany do dezaktywacji).
* **Elementy**: `Dialog`, `Button` OK/Cancel.
* **Interakcje**: OK → PATCH `status:"inactive"`.
* **Walidacja**: brak dodatkowych.
* **Typy**: wbudowany.
* **Propsy**: `{ title, message, onConfirm }`.

## 5. Typy

```ts
// Widok-specyficzne
export interface UserVM {
  id: string;
  email: string;
  domain: string;           // extracted from email
  roles: RoleName[];
  status: UserStatus;       // "active" | "inactive"
  peerLimit: number;
  peersCount: number;
  createdAt: string;        // ISO
}

export interface UserFilter {
  status?: "active" | "inactive";
  domain?: string;
  role?: RoleName;
}

export interface AdminUsersState {
  page: number;
  size: number;
  sort: string; // e.g. "email:asc"
  filters: UserFilter;
  data?: Page<UserVM>;
  loading: boolean;
  error?: string;
  selectedUser?: UserVM;
  modal: {
    limitEditorOpen: boolean;
    resetPwdOpen: boolean;
    confirmOpen: boolean;
  };
}

// Payloads do API
export type UpdateUserCommand = Partial<{ peer_limit: number; status: UserStatus }>;
```

## 6. Zarządzanie stanem

* Hook `useAdminUsers(queryParams)`
  * Przyjmuje `{ page, size, sort, filters }`.
  * Zwraca `{ data, loading, error, refresh }`.
  * Implementuje efekt pobierający GET lista użytkowników.
* Hook `useModalState()` do lokalnego sterowania modalami.
* Globalny kontekst nie jest potrzebny – stan ograniczony do widoku.

## 7. Integracja API

| Akcja | Metoda/Endpoint | Typ żądania | Typ odpowiedzi | Zastosowanie |
|-------|-----------------|-------------|----------------|--------------|
| Pobranie listy | `GET /api/v1/admin/users` | query `status,domain,page,size,sort` | `Page<UserDto>` | Ładowanie tabeli |
| Zmiana limitu / statusu | `PATCH /api/v1/admin/users/{id}` | `UpdateUserCommand` | `UserDto` | Aktualizacja wiersza |
| Reset hasła | `POST /api/v1/admin/users/{id}/reset-password` | — | `ResetPasswordResponse` | Wyświetlenie tymczasowego hasła |

Serializacja / deserializacja realizowana przez `fetchJson` helper z `lib/utils`.

## 8. Interakcje użytkownika

1. **Zmiana filtra** → debounce → odświeżenie listy.
2. **Klik sort** → aktualizacja sort param → odświeżenie listy.
3. **Paginacja** → setPage → odświeżenie listy.
4. **Edytuj limit** → otwarcie modal → PATCH → sukces: toast „Zapisano”, zamknięcie modal.
5. **Reset hasła** → potwierdzenie → POST → pokazanie hasła + kopiuj.
6. **Dezaktywuj** → ConfirmDialog → PATCH status inactive → toast.

## 9. Warunki i walidacja

* `peer_limit` > 0 i ≤ `maxLimit` (konfiguracja – pobrana raz w `ConfigContext`).
* `status` tylko `active` / `inactive`.
* `sort` zgodne z regex `^[a-z_]+:(asc|desc)$`.
* `domain` – wymagany min 1 znak, brak spacji.
* Na poziomie UI walidacja synchronizowana z Zod schematami używanymi w API (DRY).

## 10. Obsługa błędów

| Scenariusz | Reakcja UI |
|------------|------------|
| 401/403 z API | Redirect do `/login` lub banner „Brak uprawnień”. |
| 4xx Validation | Pokazanie inline error (toast + podświetlenie input). |
| 5xx / Network | Banner „Nie udało się pobrać danych” + przycisk „Ponów”. |
| Reset pwd – brak tymczasowego hasła | Modal z komunikatem błędu + możliwość ponowienia |

## 11. Kroki implementacji

1. **Utwórz routing** w `src/pages/admin/users.astro` → lazy load `AdminUsersPage`.
2. **Stwórz hook `useAdminUsers`** w `lib/hooks/useAdminUsers.ts`.
3. **Zaimplementuj komponenty**: `UserTable` (z filtrami, paginacją) i modalowe.
4. **Dodaj typy** (`UserVM`, `UserFilter`) do `src/types/view/adminUsers.ts`.
5. **Dodaj helper `fetchJson`** jeśli nie istnieje.
6. **Zaimportuj stylowanie** Tailwind table, modal z shadcn/ui.
7. **Implementuj walidację** Zod w formularzach.
8. **Dodaj toast system** (jeśli globalny brak) lub wykorzystaj istniejący.
9. **Testy manualne**: scenariusze US-004, 011, 013, 014.
10. **E2E (Playwright)**: happy path i błąd 5xx.
11. **Code review & refactor** zgodnie z wytycznymi clean code.
