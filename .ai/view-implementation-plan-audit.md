# API Endpoint Implementation Plan – Group: Audit Log

## Zawartość
1. GET /api/v1/admin/audit

---

## 1. GET /api/v1/admin/audit

### 1. Przegląd punktu końcowego
Zapewnia stronicowany wgląd w `audit_log` dla administratorów z możliwością filtrowania po typie zdarzenia, przedziałach czasowych i paginacji. Wykorzystywane do monitoringu bezpieczeństwa i zgodności.

### 2. Szczegóły żądania
- Metoda: **GET**
- URL: `/api/v1/admin/audit`
- Nagłówki: `Authorization: Bearer <jwt>`
- Query Parameters:
  - `event_type` _(string, optional)_ – wartość z `audit_event_enum`
  - `from` _(ISO8601, optional)_ – początek zakresu `created_at`
  - `to` _(ISO8601, optional)_ – koniec zakresu
  - `page` _(integer, optional, default 1)_ ≥ 1
  - `size` _(integer, optional, default 20, ≤100)_
  - `sort` _(string, optional)_ – `created_at:desc` (whitelist: `created_at`, `event_type`)

### 3. Wykorzystywane typy
- Response: `Page<AuditDto>`

### 4. Szczegóły odpowiedzi
| Kod | Opis | Payload |
|-----|------|---------|
| 200 OK | Lista zdarzeń | `Page<AuditDto>` |
| 403 Forbidden | brak roli admin | `{ error:'Forbidden' }` |
| 400 Bad Request | nieprawidłowe query | `{ error:'ValidationError', details }` |
| 401 Unauthorized | brak token | – |
| 500 Internal Server Error | błąd serwera | `{ error }` |

### 5. Przepływ danych
1. Middleware autoryzacji weryfikuje JWT i `role=admin` (inaczej 403).
2. Handler `src/pages/api/v1/admin/audit/index.ts` (`export const GET`):
   - Walidacja query param przez Zod (`AuditQuerySchema`).
   - Budowa zapytania:
     ```sql
     SELECT *
     FROM audit_log
     WHERE ($1::text IS NULL OR event_type = $1)
       AND ($2::timestamptz IS NULL OR created_at >= $2)
       AND ($3::timestamptz IS NULL OR created_at <= $3)
     ORDER BY sortColumn sortDir
     LIMIT size OFFSET (page-1)*size;
     ```
   - Supabase query builder lub RPC.
   - Paginacja total: `select count(*)` z analogicznymi filtrami.
   - Mapowanie do `AuditDto`.
   - Zwrócenie `Page<AuditDto>`.

### 6. Względy bezpieczeństwa
- Dostęp tylko dla roli `admin`.
- Query param sanitization zapobiega SQLi (z param binding / builder).
- Rate limit 30 req/min IP (opcjonalnie).

### 7. Obsługa błędów
| Sytuacja | Kod |
|----------|-----|
| Invalid date format | 400 |
| Unknown event_type | 400 |
| Unauthorized | 401 |
| Forbidden | 403 |
| Internal | 500 |

### 8. Rozważania dotyczące wydajności
- Indeks `(event_type, created_at)` oraz `(created_at DESC)` wspiera filtry.
- Stronicowanie z limit/offset ≤100 minimalizuje zasoby.
- Możliwość rozszerzenia o keyset pagination w przyszłości.

### 9. Kroki implementacji
1. **Routing** – `src/pages/api/v1/admin/audit/index.ts`.
2. **Schema** – Zod `AuditQuerySchema` z transformacją dat.
3. **Service** – `auditService.list(params)` z cache prepared query.
4. **Tests** – admin ok, role user 403, invalid params 400.
5. **OpenAPI** – definicja.
6. **CI** – lint/tests.
