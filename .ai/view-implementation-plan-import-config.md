# API Endpoint Implementation Plan – Group: Import & System Config

## Zawartość
1. POST /api/v1/admin/import
2. GET /api/v1/admin/config

---

## 1. POST /api/v1/admin/import

### 1. Przegląd punktu końcowego
Uruchamia proces skanowania katalogu (np. `/var/wg-import`) i importu plików WireGuard `.conf` do bazy (tabela `peers`). Endpoint zwraca liczbę zaimportowanych plików oraz identyfikator batcha. Operacja wyłącznie dla administratorów.

### 2. Szczegóły żądania
- Metoda: **POST**
- URL: `/api/v1/admin/import`
- Nagłówki: `Authorization: Bearer <jwt>`
- Body: – (brak)

### 3. Wykorzystywane typy
- Response: `ImportResultDto`
- AuditEvent = `IMPORT`

### 4. Odpowiedzi
| Kod | Opis | Payload |
|-----|------|---------|
| 200 OK | Import zakończony | `{ files_imported, batch_id }` |
| 500 DirError | Problem z katalogiem/IO | `{ error:'DirError', message }` |
| 403 Forbidden | brak admin | `{ error:'Forbidden' }` |

### 5. Przepływ danych
1. Middleware weryfikuje admin.
2. Handler `src/pages/api/v1/admin/import/index.ts` (`POST`):
   1. Wywołuje `importService.run()` asynchronnie lub synchronicznie (w zależności od TTL).
   2. `importService`:
      - Otwiera transakcję.
      - Skanuje katalog (fs/promises readdir).
      - Dla każdego pliku `.conf`:
        * Parsuje konfigurację, ekstraktuje `PublicKey`.
        * Szyfruje zawartość -> `ciphertext`.
        * INSERT INTO `peers` (`public_key`, `config_ciphertext`, `status='available'`, `imported_at`, `import_batch_id`).
      - INSERT INTO `import_batches` (files_imported, imported_by).
      - Commit.
   3. Audit log `IMPORT` (metadata: batch_id, count).
   4. Zwraca `ImportResultDto`.

### 6. Względy bezpieczeństwa
- Path do katalogu zdefiniowany w `import.meta.env.IMPORT_DIR`; nie przyjmujemy zewn. input.
- Walidacja, że plik ma poprawne rozszerzenie.
- Odczyt pliku w trybie read-only.
- Ograniczenie 1 import co X sekund (lock file) aby uniknąć wyścigu.

### 7. Obsługa błędów
| Błąd | Kod |
|------|-----|
| ENOENT / brak katalogu | 500 DirError |
| Błąd parsowania pliku | 500 DirError (zaloguj szczegóły, kontynuuj z innymi plikami) |
| DB error | 500 |

### 8. Wydajność
- Batch insert w transakcji.
- Możliwość limitu plików na operację.

### 9. Kroki implementacji
1. `importService` w `src/lib/services/importService.ts`.
2. Endpoint file.
3. Env var `IMPORT_DIR`.
4. Audit log.
5. Tests (mock fs, db).

---

## 2. GET /api/v1/admin/config

### 1. Przegląd
Zwraca mapę konfiguracyjną `config_kv` (read-only) administratorom.

### 2. Szczegóły żądania
- **GET** `/api/v1/admin/config`
- Authorization: Bearer admin

### 3. Typy
- Response: `ConfigDto`

### 4. Odpowiedzi
| Kod | Opis |
|-----|------|
| 200 OK | Config map | `ConfigDto` |
| 403 Forbidden | brak admin | `{ error:'Forbidden' }` |
| 500 Internal | błąd serwera | `{ error }` |

### 5. Przepływ danych
1. Admin middleware.
2. Handler `src/pages/api/v1/admin/config/index.ts` (`GET`):
   - `SELECT key, value FROM config_kv;` (Supabase).
   - Mapuje do obiektu `{ [key]: value }`.
3. Zwrot 200.

### 6. Bezpieczeństwo
- Read-only; brak danych wrażliwych (klucze szyfrowania trzymane w env, nie w DB).

### 7. Wydajność
- Prosty select; można dodać cache 60s w memory.

### 8. Kroki implementacji
1. Endpoint file.
2. Service `configService.getAll()` z opcjonalnym cache.
3. Tests.
4. OpenAPI docs.
