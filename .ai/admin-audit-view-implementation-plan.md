# Plan implementacji widoku Audit Log (Admin)

## 1. Przegląd

Widok **Audit Log** udostępnia administratorom wgląd w pełny dziennik zdarzeń systemu. Pozwala przeglądać, filtrować i sortować wpisy audytu oraz nawigować po stronach wyników. Dane pobierane są z endpointu `GET /api/v1/admin/audit` w sposób stronicowany.

## 2. Routing widoku

* Ścieżka: `/admin/audit`
* Dostęp: tylko użytkownicy z rolą `admin` (chronione w middleware + kontrola po stronie komponentu)

## 3. Struktura komponentów

```
AuditLogPage (Astro/React island)
├── AuditFilters
│   ├── Select eventType
│   ├── DateRangePicker (from, to)
├── AuditLogTable
│   └── rows: AuditRow
├── Pagination
└── ErrorBanner (conditional)
```

## 4. Szczegóły komponentów

### AuditLogPage

* **Opis**: Komponent nadrzędny odpowiedzialny za zarządzanie stanem filtrów, pobieranie danych i renderowanie pod-komponentów.
* **Elementy**: kontener `div`, nagłówek `h1`, dzieci `AuditFilters`, `AuditLogTable`, `Pagination`, `ErrorBanner`.
* **Interakcje**:
  - Zmiana filtrów → aktualizacja URL (query params) + refetch
  - Zmiana strony / sortowania → refetch
* **Walidacja**:
  - Nie pozwala wysłać zapytania, gdy zakres dat jest nieprawidłowy (from > to)
* **Typy**:
  - `AuditFiltersState`, `AuditPageState`, `UseAuditLogResult`
* **Propsy**: brak (root view)

### AuditFilters

* **Opis**: Pasek filtrów umożliwiający wybór typu zdarzenia i zakresu dat.
* **Elementy**: `<select>` z opcjami event type, komponent `DateRangePicker` (można użyć biblioteki Shadcn/ui DatePicker), przycisk _Reset_.
* **Interakcje**:
  - `onChange` eventType / dates → wywołanie `onFiltersChange`
* **Walidacja**:
  - Zakres dat nie może przekraczać 31 dni (UX)
* **Typy**: `AuditFiltersProps`, `AuditFiltersState`
* **Propsy**:
  - `value: AuditFiltersState`
  - `onChange(state)`

### AuditLogTable

* **Opis**: Tabela wyświetlająca wpisy audytu w formie wierszy.
* **Elementy**: `<table>` z nagłówkami kolumn: Date, Event, Actor, Subject, Metadata.
* **Interakcje**:
  - Kliknięcie nagłówka kolumny `Date` lub `Event` → sort asc/desc (przekazuje `onSortChange`)
* **Walidacja**: brak – tylko prezentacja danych.
* **Typy**: `AuditLogTableProps`
* **Propsy**:
  - `data: AuditDto[]`
  - `sort: SortOption`
  - `onSortChange(option)`

### Pagination

* **Opis**: Kontrola paginacji współdzielona w wielu widokach.
* **Elementy**: przyciski `Prev` / `Next`, lista numerów stron.
* **Interakcje**:
  - Kliknięcie strony → `onPageChange(page)`
* **Typy**: `PaginationProps`
* **Propsy**:
  - `page`, `size`, `total`, `onPageChange`

### ErrorBanner

* **Opis**: Wyświetla komunikaty błędów API.
* **Propsy**: `message: string`, `reset?: () => void`

## 5. Typy

```typescript
type AuditFiltersState = {
  eventType?: AuditEvent; // z enums
  from?: Date;
  to?: Date;
};

type SortOption = "created_at:asc" | "created_at:desc" | "event_type:asc" | "event_type:desc";

type AuditPageState = {
  page: number; // 1-based
  size: number; // default 20
  sort: SortOption;
  filters: AuditFiltersState;
};

interface UseAuditLogResult {
  data?: Page<AuditDto>;
  loading: boolean;
  error?: string;
  setState(state: Partial<AuditPageState>): void;
}
```

## 6. Zarządzanie stanem

* **Źródło prawdy**: URL query params (`event_type, from, to, page, size, sort`). Umożliwia deep-linking i współdzielenie linków.
* **Hooki**:
  - `useAuditLog(state: AuditPageState)` – pobiera dane z API, zwraca `UseAuditLogResult`.
  - `useDebouncedValue(value, delay)` – zapobiega wysyłaniu wielu zapytań przy szybkim klikaniu dat.
* **Biblioteki**: `react-query` / `@tanstack/react-query` do cachowania i auto-refetch.

## 7. Integracja API

* **Endpoint**: `GET /api/v1/admin/audit`
* **Query params**:
  - `event_type` – opcjonalny, `AuditEvent`
  - `from`, `to` – ISO‐8601 `yyyy-MM-dd` lub pełny datetime
  - `page` (number ≥1), `size` (1–100)
  - `sort` – `created_at:asc|desc` lub `event_type:asc|desc`
* **Response 200**: `Page<AuditDto>`
* **Response 4xx/5xx**: `{ error: string, message: string }`
* **Implementacja**:
  - Funkcja `fetchAuditLog(params): Promise<Page<AuditDto>>` w `/src/lib/services/auditClient.ts` (wrapping `fetch` + Auth header).
  - Hook `useAuditLog` używa `fetchAuditLog` z react-query.

## 8. Interakcje użytkownika

1. Administrator otwiera `/admin/audit` → domyślnie ładuje się strona 1, sort `created_at:desc`.
2. Wybiera typ zdarzenia „PEER_CLAIM” → URL aktualizuje `?event_type=PEER_CLAIM`, tabela odświeża się.
3. Ustawia zakres dat → po walidacji URL z `from`/`to`, odświeżenie tabeli.
4. Kliknięcie nagłówka „Event” → zmiana sortowania, refetch.
5. Kliknięcie „Next” w paginacji → `page=2` w URL, refetch.
6. Błąd sieci → wyświetla `ErrorBanner` z przyciskiem _Retry_.

## 9. Warunki i walidacja

* Zakres dat: `from` ≤ `to`, max 31 dni.
* `size` ≤ 100.
* `event_type` musi należeć do `AuditEvent`.
* Jeśli walidacja lokalna zawodzi → przycisk _Apply_ disabled, tooltip z informacją.

## 10. Obsługa błędów

| Scenariusz | Obsługa |
|------------|---------|
| 401 / 403 | Redirect do `/403` lub wyświetlenie `AccessDeniedBanner` |
| 400 (validation) | Pokazanie `ErrorBanner` z detailed `message` |
| 500 lub network | `ErrorBanner` + Retry |

## 11. Kroki implementacji

1. **Routing**: dodaj plik `src/pages/admin/audit.astro` z lazy-loaded React island `AuditLogPage`.
2. **Typy**: dodaj nowe typy w `src/types.ts` (SortOption, AuditFiltersState).
3. **Client**: utwórz `auditClient.ts` z funkcją `fetchAuditLog`.
4. **Hook**: zaimplementuj `useAuditLog` z react-query.
5. **Komponenty UI**:
   1. `AuditFilters` (Shadcn/ui Select + DatePicker)
   2. `AuditLogTable` (Tailwind table, sort icons)
   3. Re-use global `Pagination` and `ErrorBanner`.
6. **Page assembly**: `AuditLogPage.tsx` – glue code.
7. **URL sync**: użyj `useSearchParams` / `useLocation` (react-router-dom v6) lub Astro router helper.
8. **A11y**: upewnij się, że tabela ma `aria-label`, nagłówki scope, focus-ring.
9. **Tests**: napisz testy Cypress/Playwright: filtracja, sort, paginacja.
10. **Docs**: dodaj opis w `.ai/ui-plan.md` (sekcja Audit aktualizacja).

