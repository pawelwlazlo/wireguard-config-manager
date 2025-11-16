# API Endpoint Implementation Plan – Group: Authentication

## Zawartość
1. POST /api/v1/auth/register
2. POST /api/v1/auth/login
3. POST /api/v1/auth/logout

---

## 1. POST /api/v1/auth/register

### 1. Przegląd punktu końcowego
Rejestracja użytkownika w modelu self-service, dozwolona tylko dla adresów e-mail z akceptowanych domen (`accepted_domains`). Zwraca token JWT i profil użytkownika.

### 2. Szczegóły żądania
- Metoda: **POST**
- URL: `/api/v1/auth/register`
- Content-Type: `application/json`
- Body (`RegisterCommand`):
```jsonc
{
  "email": "user@corp.com",
  "password": "StrongP@ssw0rd!"
}
```
- Nagłówki: brak szczególnych, CORS wg global middleware.

### 3. Wykorzystywane typy
- `RegisterCommand` (request)
- `AuthResponse` (response)
- `AuditEvent = 'LOGIN'` (po udanej rejestracji traktujemy jak login)

### 4. Szczegóły odpowiedzi
| Kod | Opis | Payload |
|-----|------|---------|
| 201 Created | Zarejestrowano | `AuthResponse` |
| 400 Bad Request | Email spoza domeny / słabe hasło | `{ error: 'InvalidDomain' }` |
| 409 Conflict | Email już istnieje | `{ error: 'EmailExists' }` |
| 500 Internal | Błąd serwera | `{ error: string }` |

### 5. Przepływ danych
1. Handler `src/pages/api/v1/auth/register.ts` (`POST`)
2. Walidacja body (Zod): email format + password min length, complexity.
3. Sprawdzenie domeny: `accepted_domains` (cache 5 min w memory).
4. Supabase Auth: `supabase.auth.signUp({ email, password })`.
5. Wstawienie dodatkowego rekordu w `users` (trigger w DB tworzy). Pierwszy user → rola admin (DB trigger).
6. Zapis `audit_log` (`LOGIN`, actor_id=nowo utworzony).
7. Zwrócenie 201 z `jwt` i `user`.

### 6. Bezpieczeństwo
- Rate limit 10 req/min IP.
- Hasło przesyłane przez HTTPS.
- Nie zwraca szczegółów walidacji hasła (tylko ogólny komunikat).

### 7. Obsługa błędów
- `InvalidDomain` 400
- `EmailExists` 409 (supabase code 23505)
- `WeakPassword` 400

### 8. Wydajność
- Akceptowane domeny cache w memory, fallback do DB.

### 9. Kroki wdrożenia
1. Endpoint file.
2. Zod schema.
3. Domain cache util.
4. Audit log.
5. Tests.

---

## 2. POST /api/v1/auth/login

### 1. Przegląd
Logowanie użytkownika, zwraca JWT i profil.

### 2. Szczegóły żądania
- POST `/api/v1/auth/login`
- Body (`LoginCommand`): `{ "email", "password" }`

### 3. Typy
- `LoginCommand`, `AuthResponse`

### 4. Odpowiedzi
| Kod | Opis |
|-----|------|
| 200 OK | `AuthResponse` |
| 400 InvalidCredentials | `{ error:'InvalidCredentials' }` |
| 401 Rate-limited (supabase) | `{ error:'TooManyAttempts' }` |

### 5. Przepływ danych
1. Handler -> validate body.
2. `supabase.auth.signInWithPassword()`.
3. Przy sukcesie → zapis `audit_log (LOGIN)`.
4. Zwrot JWT + profil (via DB select on `users` & roles).

### 6. Bezpieczeństwo
- SameSite cookie? JWT tylko w Authorization wg planu.
- Rate limit 10 req/min IP.

### 7. Błędy
- InvalidCredentials 400.

### 8. Wydajność
- Single auth call + 1 select.

### 9. Kroki
Analogiczne do register.

---

## 3. POST /api/v1/auth/logout

### 1. Przegląd
Unieważnia refresh token w Supabase.

### 2. Szczegóły żądania
- POST `/api/v1/auth/logout`
- Nagłówek Authorization Bearer required.
- Body: –

### 3. Typy
- Brak body, response 204.

### 4. Odpowiedzi
| Kod | Opis |
|-----|------|
| 204 No Content | Wylogowano |
| 401 Unauthorized | brak/niepoprawny token |

### 5. Przepływ danych
1. Middleware valid token; extract refresh token.
2. `supabase.auth.signOut()`.
3. Log `audit_log (LOGIN)` z metadata `logout: true`.
4. Return 204.

### 6. Bezpieczeństwo
- JWT musi być prawidłowy.

### 7. Kroki
1. Endpoint file `logout.ts`.
2. Testy.
