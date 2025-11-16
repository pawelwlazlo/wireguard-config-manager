# API Endpoint Implementation Plan – Group: Users

## Zawartość
1. GET /api/v1/users/me
2. GET /api/v1/admin/users
3. PATCH /api/v1/admin/users/{id}
4. POST /api/v1/admin/users/{id}/reset-password

---

## 1. GET /api/v1/users/me

### 1. Przegląd
Zwraca profil uwierzytelnionego użytkownika wraz z listą ról i limitem peerów.

### 2. Szczegóły żądania
- Metoda: **GET**
- URL: `/api/v1/users/me`
- Nagłówki: `Authorization: Bearer <jwt>`
- Body / Query: –

### 3. Typy
- Response: `UserDto`

### 4. Odpowiedzi
| Kod | Opis | Payload |
|-----|------|---------|
| 200 OK | Profil użytkownika | `UserDto` |
| 401 Unauthorized | brak tokena | – |
| 500 Internal | błąd serwera | `{ error }` |

### 5. Przepływ danych
1. Middleware autoryzacji → `ctx.locals.user.id`.
2. Handler `src/pages/api/v1/users/me.ts`:
   - Pobiera dane z widoku `v_user_profile` lub bezpośrednio z tabel `users` + join `user_roles`.
   - Mapuje do `UserDto`.
3. Zwrot 200.

### 6. Bezpieczeństwo
- JWT obowiązkowo.

### 7. Kroki wdrożenia
1. Endpoint file.
2. Service `userService.getProfile(userId)`.
3. Testy jednostkowe/integracyjne.

---

## 2. GET /api/v1/admin/users

### 1. Przegląd
Zwraca stronicowaną listę użytkowników (admin only) z filtrami status/domain.

### 2. Szczegóły żądania
- **GET** `/api/v1/admin/users`
- Query params:
  - `status` _(optional)_ – `active|inactive`
  - `domain` _(optional)_ – `example.com`
  - `page` _(optional, ≥1, default 1)_
  - `size` _(optional, ≤100, default 20)_
  - `sort` _(optional)_ – `created_at:desc`
- Nagłówki: `Authorization: Bearer <jwt>`

### 3. Typy
- Response: `Page<UserDto>`

### 4. Odpowiedzi
| Kod | Opis |
|-----|------|
| 200 | `Page<UserDto>` |
| 403 Forbidden | brak roli admin |
| 400 Bad Request | walidacja query |

### 5. Przepływ danych
1. Middleware → sprawdza `role=admin`; inaczej 403.
2. Handler `src/pages/api/v1/admin/users/index.ts`:
   - Walidacja query (Zod).
   - Budowa zapytania do `users` + left join `user_roles` aggregate.
   - Paginacja `range` Supabase i count.
3. Mapowanie do `UserDto[]` i `Page`.

### 6. Bezpieczeństwo
- RLS: admin ma pełen select.

### 7. Kroki
Endpoint, schema, service, tests.

---

## 3. PATCH /api/v1/admin/users/{id}

### 1. Przegląd
Aktualizuje `peer_limit` lub `status` użytkownika. Zmiana limitu tworzy wpis w `user_limit_history`.

### 2. Szczegóły żądania
- **PATCH** `/api/v1/admin/users/{id}`
- Path param `id` uuid
- Body (`UpdateUserCommand`): `{ "peer_limit?": number, "status?": "active|inactive" }`

### 3. Typy
- Request: `UpdateUserCommand`
- Response: `UserDto`

### 4. Odpowiedzi
| Kod | Opis |
|-----|------|
| 200 OK | zaktualizowano | `UserDto` |
| 400 Validation | złe dane | `{ error }` |
| 404 NotFound | brak user | `{}` |
| 403 Forbidden | brak admin |
| 409 Conflict | limit > max | `{ error:'LimitExceeded' }` |

### 5. Przepływ danych
1. Middleware admin check.
2. Handler:
   - Walidacja body.
   - Transakcja:
     1. SELECT FOR UPDATE users.
     2. Jeśli peer_limit zmienione → insert into `user_limit_history`.
     3. UPDATE users.
3. Zwrot `UserDto`.
4. Audit event `LIMIT_CHANGE` lub `USER_DEACTIVATE`.

### 6. Bezpieczeństwo
- Sprawdzić, by admin nie obniżył limitu < active peers (DB trigger?)

### 7. Kroki
Endpoint, schema, service, trigger or check.

---

## 4. POST /api/v1/admin/users/{id}/reset-password

### 1. Przegląd
Generuje tymczasowe hasło i zwraca je adminowi.

### 2. Żądanie
- **POST** `/api/v1/admin/users/{id}/reset-password`
- Path param `id` uuid
- Body: –

### 3. Typy
- Response: `ResetPasswordResponse`

### 4. Odpowiedzi
| Kod | Opis |
|-----|------|
| 200 OK | `{ temporary_password }` |
| 404 | user not found |
| 403 | non-admin |

### 5. Przepływ danych
1. Admin auth.
2. Handler:
   - Wygeneruj strong random password.
   - Supabase Admin API: update user password.
   - Insert row into `password_reset_tokens` (for audit).
   - Audit `RESET_PASSWORD`.
3. Zwróć `temporary_password`.

### 6. Bezpieczeństwo
- Password generujemy cryptographically secure; przekazujemy tylko raz.
- Audit log.

### 7. Kroki
Endpoint, helper `passwordGenerator`, service call, tests.
