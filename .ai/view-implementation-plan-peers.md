# API Endpoint Implementation Plan – Group: Peers

## Zawartość
### User endpoints
1. GET /api/v1/peers *(lista)*
2. POST /api/v1/peers/claim *(FIFO claim)*
3. GET /api/v1/peers/{id} *(szczegóły)*
4. GET /api/v1/peers/{id}/download *(pobranie .conf)*
5. PATCH /api/v1/peers/{id} *(edycja friendly_name)*
6. DELETE /api/v1/peers/{id} *(właściciel revokes)*

### Admin endpoints
7. POST /api/v1/admin/peers/{id}/assign *(manual assign)*
8. DELETE /api/v1/admin/peers/{id} *(admin revoke)*
9. GET /api/v1/admin/peers *(global list)*

---

> Uwaga: Szczegółowe plany 1-5 zostały opracowane wcześniej w `.ai/view-implementation-plan.md`. Poniżej umieszczono skrócone streszczenie dla spójności oraz pełne plany brakujących endpointów 6-9.

## 1. GET /api/v1/peers – skrót
Zwraca `Page<PeerDto>` z filtrami `status`, paginacja, owner = JWT. (Patrz wcześniejszy plan.)

## 2. POST /api/v1/peers/claim – skrót
FIFO claim, transakcja `SKIP LOCKED`, limity. (Patrz wcześniejszy plan.)

## 3. GET /api/v1/peers/{id} – skrót
Owner/admin, zwraca `PeerDto`. (Patrz wcześniejszy plan.)

## 4. GET /api/v1/peers/{id}/download – skrót
Odszyfrowuje `config_ciphertext`, zwraca plik. (Patrz wcześniejszy plan.)

## 5. PATCH /api/v1/peers/{id} – skrót
Aktualizacja `friendly_name`, unikalność. (Patrz wcześniejszy plan.)

---

## 6. DELETE /api/v1/peers/{id}

### 1. Przegląd
Właściciel peera może dezaktywować (revoke) swoje urządzenie – zmiana `status` na `inactive`, `revoked_at` oraz ewentualne przeniesienie pliku konfiguracyjnego. Admin ma osobny endpoint.

### 2. Szczegóły żądania
- **DELETE** `/api/v1/peers/{id}`
- Nagłówek Authorization Bearer.

### 3. Typy
- Response: 204 No Content

### 4. Odpowiedzi
| Kod | Opis |
|-----|------|
| 204 No Content | revocation ok |
| 403 Forbidden | not owner |
| 404 NotFound | peer nie istnieje |
| 401 Unauthorized | brak token |

### 5. Przepływ danych
1. Middleware auth.
2. Handler `src/pages/api/v1/peers/[id].ts` – `DELETE` branch:
   - SELECT FOR UPDATE peers id.
   - Check ownership.
   - UPDATE status='inactive', revoked_at=now().
   - (Opcjonalnie) Move config file on disk.
   - Audit `PEER_REVOKE`.
3. Return 204.

### 6. Bezpieczeństwo
- RLS update policy (owner) + check.

### 7. Kroki
Endpoint branch, service `revokePeer`, tests.

---

## 7. POST /api/v1/admin/peers/{id}/assign

### 1. Przegląd
Admin może ręcznie przypisać peer do konkretnego użytkownika (np. w panelu).

### 2. Żądanie
- **POST** `/api/v1/admin/peers/{id}/assign`
- Body (`AssignPeerCommand`): `{ "user_id": "uuid" }`

### 3. Typy
- Request: `AssignPeerCommand`
- Response: `PeerDto`

### 4. Odpowiedzi
| Kod | Opis |
|-----|------|
| 200 OK | przypisano | `PeerDto` |
| 400 LimitExceeded | user przekroczył peer_limit |
| 404 NotFound | peer lub user | `{}` |
| 403 Forbidden | brak admin |

### 5. Przepływ danych
1. Middleware admin.
2. Handler `src/pages/api/v1/admin/peers/[id]/assign.ts`:
   - Walidacja body.
   - Transakcja:
     1. Lock peer row FOR UPDATE; ensure status in ('available','inactive').
     2. Count active peers target user vs limit.
     3. Update owner_id, status='active', claimed_at=now().
   - Audit `PEER_ASSIGN` (metadata: adminId, targetUserId).
3. Return updated `PeerDto`.

### 6. Bezpieczeństwo
- Admin only; RLS policy permits via admin.
- Input validation.

### 7. Kroki
Endpoint file, service `assignPeer`, tests.

---

## 8. DELETE /api/v1/admin/peers/{id}

### 1. Przegląd
Admin może dezaktywować (revoke) dowolny peer.

### 2. Żądanie
- **DELETE** `/api/v1/admin/peers/{id}`
- Body: –

### 3. Typy
- Response 204.

### 4. Odpowiedzi
| Kod | Opis |
|-----|------|
| 204 No Content | revoked |
| 404 NotFound | peer brak |
| 403 Forbidden | brak admin |

### 5. Przepływ danych
1. Admin auth.
2. Handler `src/pages/api/v1/admin/peers/[id].ts` `DELETE`:
   - SELECT FOR UPDATE row.
   - UPDATE status='inactive', revoked_at=now().
   - Audit `PEER_REVOKE` with admin flag.
3. Return 204.

### 6. Kroki
Endpoint, service, tests.

---

## 9. GET /api/v1/admin/peers

### 1. Przegląd
Global list peerów z filtrami owner, status, paginacja.

### 2. Żądanie
- **GET** `/api/v1/admin/peers`
- Query:
  - `status`, `owner`, `page`, `size`, `sort`

### 3. Typy
- Response: `Page<PeerDto>`

### 4. Odpowiedzi
| Kod | Opis |
|-----|------|
| 200 OK | lista |
| 403 Forbidden | brak admin |
| 400 validation | błędne query |

### 5. Przepływ danych
1. Admin middleware.
2. Handler `src/pages/api/v1/admin/peers/index.ts`:
   - Validate query.
   - SELECT with joins, filters, paginacja.
3. Return `Page<PeerDto>`.

### 6. Kroki
Endpoint, service `listPeersAdmin`, tests.

---

**Uwagi końcowe**
- Wszystkie endpointy korzystają z już zdefiniowanych serwisów `peerService` i `auditService`.
- Upewnić się, że `audit_event_enum` ma wpisy `PEER_VIEW`, `PEER_REVOKE`, `PEER_ASSIGN`.
