

---

# API Endpoint Implementation Plan: POST /api/v1/peers/claim

## 1. Przegląd punktu końcowego
Endpoint automatycznie przydziela użytkownikowi pierwszy dostępny Peer (FIFO) spełniający warunki: `status = 'available'`, brak właściciela i importowane najwcześniej. Zwraca przypisany PeerDto lub błąd, gdy limit użytkownika przekroczony lub brak wolnych peerów.

## 2. Szczegóły żądania
- Metoda HTTP: **POST**
- URL: `/api/v1/peers/claim`
- Query/Body: – (brak parametrów)
- Wymagane nagłówki: `Authorization: Bearer <jwt>`

## 3. Wykorzystywane typy
- `PeerDto` (response)
- `AuditEvent = 'PEER_CLAIM'` (log)

## 4. Szczegóły odpowiedzi
| Status | Opis | Payload |
|--------|------|---------|
| 200 OK | Peer został przypisany | `PeerDto` |
| 400 Bad Request | Limit użytkownika przekroczony (`LimitExceeded`) | `{ error: 'LimitExceeded', message }` |
| 404 Not Found | Brak dostępnych peerów (`NoAvailable`) | `{ error: 'NoAvailable', message }` |
| 401 Unauthorized | Brak lub niepoprawny token | – |
| 500 Internal Server Error | Błąd serwera | `{ error: string }` |

## 5. Przepływ danych
1. Middleware uwierzytelnia użytkownika i ustawia `ctx.locals.user` i `supabase`.
2. Handler `/src/pages/api/v1/peers/claim.ts`:
   1. Sprawdza bieżącą liczbę `active` peerów właściciela – SELECT COUNT.
   2. Porównuje z `peer_limit`; jeśli >= limit → 400 `LimitExceeded`.
   3. Rozpoczyna transakcję (RPC lub manual):
      - `SELECT id FROM peers WHERE status='available' ORDER BY imported_at ASC LIMIT 1 FOR UPDATE SKIP LOCKED`.
      - Jeśli brak rekordu → rollback + 404 `NoAvailable`.
      - `UPDATE peers SET owner_id = :userId, status = 'active', claimed_at = now() WHERE id = :id`.
   4. Commit.
   5. Zapis do tabeli `audit_log` (`event_type='PEER_CLAIM'`).
   6. Zwrócenie `PeerDto`.

## 6. Względy bezpieczeństwa
- Uwierzytelnienie: JWT.
- Autoryzacja: RLS zabezpiecza UPDATE; tylko admin lub system trigger może zmienić inne peer.
- Transakcja gwarantuje brak wyścigów (SKIP LOCKED).

## 7. Obsługa błędów
| Sytuacja | Kod | Komunikat |
|----------|-----|-----------|
| `peer_limit` przekroczony | 400 | `LimitExceeded` |
| Brak wolnych peerów | 404 | `NoAvailable` |
| RLS/DB error | 500 | log internal |
| Brak tokena | 401 | handled by middleware |

Zapisy błędów krytycznych logowane w `logger` i `audit_log` (event `PEER_CLAIM_ERROR`).

## 8. Rozważania dotyczące wydajności
- Indeks `(status, imported_at)` used by select.
- `SKIP LOCKED` pozwala na wysoki concurrent throughput.
- Transakcja ograniczona do jednego wiersza minimalizuje blokady.

## 9. Etapy wdrożenia
1. **Endpoint** – `src/pages/api/v1/peers/claim.ts` z `export const POST`.
2. **Service** – dodać `peerService.claimNext(userId)` korzystający z Supabase RPC lub zwykłej transakcji.
3. **Audit** – utworzyć `auditService.log(event, actor, subject)` (jeśli brak) i użyć tutaj.
4. **Walidacja limitu** – metoda `peerService.getActiveCount(ownerId)`.
5. **Testy** – jednostkowe (limit, brak peer) + integracyjne z równoległymi requestami.
6. **OpenAPI** – dodać definicję.
7. **CI/Docs** – aktualizacja.

---

# API Endpoint Implementation Plan: GET /api/v1/peers/{id}

## 1. Przegląd punktu końcowego
Udostępnia szczegóły pojedynczego Peera. Dostęp mają:
* Właściciel peera (owner_id = JWT sub)
* Administrator (`role = admin`)
Zapewnia bezpieczny wgląd w stan, klucz publiczny oraz metadane, bez ujawniania zaszyfrowanej konfiguracji.

## 2. Szczegóły żądania
- Metoda HTTP: **GET**
- URL: `/api/v1/peers/{id}` gdzie `{id}` to UUID peera
- Parametry ścieżki:
  - **id** _(uuid, required)_ – identyfikator peera
- Query / Body: –
- Nagłówki: `Authorization: Bearer <jwt>`

## 3. Wykorzystywane typy
- `PeerDto` (response)
- `AuditEvent = 'PEER_VIEW'` (opcjonalny wpis w logu)

## 4. Szczegóły odpowiedzi
| Status | Opis | Payload |
|--------|------|---------|
| 200 OK | Dane peera | `PeerDto` |
| 403 Forbidden | Użytkownik nie jest właścicielem i nie ma roli admin | `{ error: 'Forbidden' }` |
| 404 Not Found | Peer nie istnieje lub niedostępny przez RLS | `{ error: 'NotFound' }` |
| 401 Unauthorized | Brak tokena | – |
| 500 Internal Server Error | Błąd serwera | `{ error: string }` |

## 5. Przepływ danych
1. Middleware autoryzacji weryfikuje JWT i ustawia `ctx.locals`.
2. Handler `src/pages/api/v1/peers/[id].ts`:
   1. Waliduje UUID param (`Zod.uuid()`).
   2. Wywołuje `peerService.getById(id, userCtx)`:
      - SELECT * FROM `peers` WHERE id = :id LIMIT 1;
      - Dzięki RLS zwróci rekord tylko jeśli użytkownik jest ownerem lub adminem.
   3. Jeśli brak rekordu → 404.
   4. Mapuje wiersz na `PeerDto`.
   5. (Opcjonalnie) Zapisuje `audit_log` z `PEER_VIEW`.
   6. Zwraca `200` z JSON.

## 6. Względy bezpieczeństwa
- **RLS**: `peers_owner_read` + `peers_admin_all` gwarantują brak wycieku danych.
- **Auth**: Bearer JWT obowiązkowy.
- **Input validation**: sprawdzamy, że `id` to prawidłowy UUID (zod). Limit length <= 36.

## 7. Obsługa błędów
| Sytuacja | Kod | Komunikat |
|----------|-----|-----------|
| Nieprawidłowy UUID | 400 | `InvalidId` |
| Brak uprawnień | 403 | `Forbidden` |
| Peer nie istnieje | 404 | `NotFound` |
| Błąd DB / RLS | 500 | `InternalError` |

## 8. Rozważania dotyczące wydajności
- Zapytanie po PK (UUID) jest szybkie; indeks PK.
- Brak dodatkowej paginacji; minimalny payload.

## 9. Etapy wdrożenia
1. **Routing** – plik `src/pages/api/v1/peers/[id].ts` z `export const GET`.
2. **Service** – dodać `peerService.getById(id)` jeśli nie istnieje.
3. **Validation** – utworzyć `IdParamSchema` w handlerze.
4. **Audit** – opcjonalny wpis `PEER_VIEW`.
5. **Testy** – przypadki: owner ok, admin ok, inny użytkownik 403, brak rekordu 404.
6. **OpenAPI/docs** – aktualizacja.
7. **CI** – lint + tests.

---

# API Endpoint Implementation Plan: GET /api/v1/peers/{id}/download

## 1. Przegląd punktu końcowego
Zapewnia bezpieczne pobranie zaszyfrowanej konfiguracji WireGuard w formacie `.conf` dla wskazanego Peera. Dostęp: właściciel Peera lub admin. Endpoint loguje zdarzenie `PEER_DOWNLOAD` do `audit_log`.

## 2. Szczegóły żądania
- Metoda HTTP: **GET**
- URL: `/api/v1/peers/{id}/download`
- Path Param:
  - **id** _(uuid, required)_ – identyfikator Peera
- Nagłówki: `Authorization: Bearer <jwt>`
- Query / Body: –

## 3. Wykorzystywane typy
- Brak DTO; odpowiedź to `file/*` (text/plain) z zawartością `.conf`.
- `AuditEvent = 'PEER_DOWNLOAD'`

## 4. Szczegóły odpowiedzi
| Status | Opis | Payload / Nagłówki |
|--------|------|--------------------|
| 200 OK | Konfiguracja zwrócona | Content-Type: `text/plain; charset=utf-8`; Content-Disposition: `attachment; filename="<friendly_name || peer-id>.conf"` |
| 403 Forbidden | Brak uprawnień | `{ error: 'Forbidden' }` |
| 404 Not Found | Peer nie istnieje lub nie należy do usera | `{ error: 'NotFound' }` |
| 401 Unauthorized | Brak tokena | – |
| 500 Internal Server Error | Błąd serwera | `{ error: string }` |

## 5. Przepływ danych
1. Middleware uwierzytelnia i ustawia kontekst.
2. Handler `src/pages/api/v1/peers/[id]/download.ts`:
   1. Walidacja UUID param.
   2. Pobranie rekordu Peera z `peerService.getById(id)` (RLS zabezpiecza dostęp). Odrzucenie 403/404 w razie braku.
   3. Pobranie zaszyfrowanej konfiguracji `config_ciphertext` (kolumna niedostępna w DTO, potrzebna SELECT).
   4. Odszyfrowanie przy użyciu `cryptoService.decrypt()` (klucz z env), uzyskanie tekstu `.conf`.
   5. Log `audit_log` (`PEER_DOWNLOAD`, metadata: public_key, peer_id, size).
   6. Ustawienie nagłówków `Content-Type` i `Content-Disposition`.
   7. Zwrócenie strumienia / Response z `body`.

## 6. Względy bezpieczeństwa
- **Auth & RLS**: tylko owner/admin.
- **Rate-limit**: Można dodać limit 10/min na endpoint, opcjonalne.
- **Crypto**: AES-256-GCM (lub pgcrypto `pgp_sym_decrypt`) – klucz trzymany w `import.meta.env.PEER_CONFIG_KEY`. Klucz nie trafia do repo.
- **Headers**: Dodaj `Content-Security-Policy: default-src 'none';` aby zapobiec XSS przy wyświetleniu.

## 7. Obsługa błędów
| Sytuacja | Kod | Komunikat |
|----------|-----|-----------|
| Invalid UUID | 400 | `InvalidId` |
| Brak uprawnień | 403 | `Forbidden` |
| Peer nie istnieje | 404 | `NotFound` |
| Błąd odszyfrowania | 500 | `DecryptError` (log internal) |
| Inne DB błędy | 500 | `InternalError` |

## 8. Rozważania dotyczące wydajności
- Użycie `SELECT` pojedynczego rekordu – indeks PK.
- Odszyfrowanie w memory; plik ma <5 KB – nie stanowi obciążenia.
- Możliwość streamowania (ReadableStream) aby zmniejszyć memory footprint (opcjonalnie).

## 9. Etapy wdrożenia
1. **Routing** – `src/pages/api/v1/peers/[id]/download.ts` z `export const GET`.
2. **cryptoService** – zapewnić funkcję `decryptConfig(ciphertext: Uint8Array): string` w `src/lib/services/cryptoService.ts`.
3. **peerService** – metoda `getConfigCiphertext(id)` zwracająca `{ row, ciphertext }` z SELECT.
4. **Audit** – `auditService.log('PEER_DOWNLOAD', actorId, subjectId, metadata)`.
5. **Headers** – ustawić odpowiednie nagłówki w Response.
6. **Testy** – scenariusze: owner success, admin success, forbidden, not found, decrypt error.
7. **OpenAPI** – dodać definicję (response binary/text).
8. **CI** – lint + tests.

---

# API Endpoint Implementation Plan: PATCH /api/v1/peers/{id}

## 1. Przegląd punktu końcowego
Pozwala właścicielowi peera zaktualizować przyjazną nazwę (`friendly_name`). Admin może aktualizować każdy peer. Obsługuje walidację formatu nazwy i unikalności w obrębie ownera.

## 2. Szczegóły żądania
- Metoda HTTP: **PATCH**
- URL: `/api/v1/peers/{id}`
- Path Param:
  - **id** _(uuid, required)_ – identyfikator peera
- Nagłówki: `Authorization: Bearer <jwt>`
- Content-Type: `application/json`
- Body (`UpdatePeerCommand`):
```jsonc
{
  "friendly_name": "my-laptop"
}
```

## Walidacja pola `friendly_name`
- Regex: `^[a-z0-9-]+$`
- Length ≤ 63
- Unikalne wśród peerów tego samego ownera

## 3. Wykorzystywane typy
- `UpdatePeerCommand` (request)
- `PeerDto` (response)
- `AuditEvent = 'PEER_UPDATE'`

## 4. Szczegóły odpowiedzi
| Status | Opis | Payload |
|--------|------|---------|
| 200 OK | Zaktualizowany Peer | `PeerDto` |
| 400 Bad Request | Walidacja JSON lub friendly_name | `{ error: 'ValidationError', details }` |
| 403 Forbidden | Użytkownik nie jest właścicielem i nie jest adminem | `{ error: 'Forbidden' }` |
| 404 Not Found | Peer nie istnieje / RLS | `{ error: 'NotFound' }` |
| 409 Conflict | friendly_name nieunikalne | `{ error: 'DuplicateName' }` |
| 401 Unauthorized | Brak tokena | – |
| 500 Internal Server Error | Błąd serwera | `{ error: string }` |

## 5. Przepływ danych
1. Middleware uwierzytelnia.
2. Handler `src/pages/api/v1/peers/[id].ts` (`export const PATCH`):
   1. Walidacja path & body przy pomocy Zod (`UpdatePeerSchema`).
   2. Wywołanie `peerService.updateFriendlyName(id, userCtx, newName)`:
      - W transakcji:
        1. `SELECT * FROM peers WHERE id=:id FOR UPDATE` (RLS).
        2. Jeśli brak → 404.
        3. Jeśli requester != owner & !admin → 403.
        4. Sprawdzam regex/len.
        5. Sprawdzam unikalność: `SELECT 1 FROM peers WHERE owner_id=:owner AND friendly_name=:name AND id <> :id`.
        6. UPDATE `friendly_name`, `updated_at`.
   3. Commit i map to `PeerDto`.
   4. Audit log (`PEER_UPDATE`).
   5. Return 200.

## 6. Względy bezpieczeństwa
- **Auth/RLS** zapewnia dostęp tylko ownerowi lub adminowi.
- **Input Sanitization** – regex.
- **Race Condition** – `SELECT ... FOR UPDATE` + unikalny klucz (owner_id, friendly_name) w DB.

## 7. Obsługa błędów
| Błąd | Kod |
|------|-----|
| Invalid body/json | 400 |
| Regex / length fail | 400 |
| Duplicate friendly_name (db unique violation) | 409 |
| Forbidden | 403 |
| NotFound | 404 |
| Internal | 500 |

## 8. Rozważania dotyczące wydajności
- Mała transakcja, pojedynczy wiersz.
- Indeks unikalny (owner_id, friendly_name) przyspiesza check.

## 9. Etapy wdrożenia
1. **Schema** – `UpdatePeerSchema` w handlerze lub `schemas/peer.ts`.
2. **Endpoint** – dodać `PATCH` w istniejącym `[id].ts` (obok GET).
3. **Service** – `peerService.updateFriendlyName()`.
4. **Constraint** – upewnić się, że unikalny indeks istnieje (DB plan §1.4 kol. 38).
5. **Audit** – log event.
6. **Testy** – regex fail, duplicate, owner success, admin success.
7. **Docs** – OpenAPI.
8. **CI** – lint/tests.
