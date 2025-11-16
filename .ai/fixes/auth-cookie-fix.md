# Auth Cookie Fix - JWT Authentication

## Problem

Po zalogowaniu użytkownik był przekierowywany z powrotem do strony logowania zamiast do Dashboard:

```
16:50:21 [200] POST /api/v1/auth/login 3946ms
16:50:21 [302] / 296ms
16:50:22 [200] /login 157ms
```

## Przyczyna

1. **LoginForm** zapisywał JWT w `localStorage`
2. **Middleware** oczekiwał JWT w nagłówku `Authorization: Bearer <token>`
3. Zwykłe żądania HTTP przeglądarki nie wysyłają automatycznie JWT z localStorage
4. Middleware nie rozpoznawał użytkownika jako zalogowanego
5. Dashboard przekierowywał do `/login`

## Rozwiązanie

Zmiana z **localStorage** na **HTTP-only cookies** dla pełnego wsparcia SSR w Astro.

### Zmiany w plikach

#### 1. `/src/pages/api/v1/auth/login.ts`

**Przed:**
```typescript
return new Response(JSON.stringify(authResponse), {
  status: 200,
  headers: { "Content-Type": "application/json" },
});
```

**Po:**
```typescript
// Set JWT in HTTP-only cookie for SSR
const isProduction = import.meta.env.PROD;
const secureFlag = isProduction ? "; Secure" : "";
const headers = new Headers({
  "Content-Type": "application/json",
  "Set-Cookie": `jwt=${authResponse.jwt}; Path=/; HttpOnly${secureFlag}; SameSite=Lax; Max-Age=${60 * 60 * 24 * 7}`, // 7 days
});

return new Response(JSON.stringify(authResponse), {
  status: 200,
  headers,
});
```

#### 2. `/src/middleware/index.ts`

**Przed:**
```typescript
// Extract JWT token from Authorization header
const authHeader = context.request.headers.get("Authorization");

if (authHeader && authHeader.startsWith("Bearer ")) {
  const token = authHeader.substring(7);
  // ...
}
```

**Po:**
```typescript
// Extract JWT token from cookie or Authorization header
let token: string | undefined;

// First, try to get token from cookie (SSR)
const jwtCookie = context.cookies.get("jwt");
if (jwtCookie) {
  token = jwtCookie.value;
}

// Fallback to Authorization header (API requests)
if (!token) {
  const authHeader = context.request.headers.get("Authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.substring(7);
  }
}

if (token) {
  // Verify JWT...
}
```

#### 3. `/src/components/LoginForm.tsx`

**Przed:**
```typescript
// Store JWT in localStorage
localStorage.setItem("jwt", authResponse.jwt);
localStorage.setItem("user", JSON.stringify(authResponse.user));
```

**Po:**
```typescript
// JWT is now stored in HTTP-only cookie by the server
// Optionally store user data in localStorage for client-side access
localStorage.setItem("user", JSON.stringify(authResponse.user));
```

#### 4. `/src/pages/api/v1/auth/logout.ts`

**Dodano:**
```typescript
// Clear JWT cookie
const isProduction = import.meta.env.PROD;
const secureFlag = isProduction ? "; Secure" : "";
const headers = new Headers({
  "Set-Cookie": `jwt=; Path=/; HttpOnly${secureFlag}; SameSite=Lax; Max-Age=0`,
});

return new Response(null, { 
  status: 204,
  headers,
});
```

## Cookie Flags

- **HttpOnly**: Zapobiega dostępowi do cookie przez JavaScript (bezpieczeństwo XSS)
- **Secure**: Tylko HTTPS (wyłączone w dev, włączone w prod)
- **SameSite=Lax**: Ochrona przed CSRF, ale pozwala na cookies przy top-level navigation
- **Path=/**: Cookie dostępne dla całej aplikacji
- **Max-Age**: 7 dni dla login, 0 dla logout (natychmiastowe wygaśnięcie)

## Zalety rozwiązania

1. ✅ **SSR Compatible**: Cookie automatycznie wysyłane z każdym request
2. ✅ **Security**: HttpOnly cookie bezpieczniejsze niż localStorage
3. ✅ **Automatic**: Przeglądarka zarządza cookie, nie trzeba manualnie dodawać do headers
4. ✅ **Backwards Compatible**: Middleware obsługuje też Authorization header dla API calls

## Testowanie

1. Zaloguj się na `/login`
2. Sprawdź DevTools → Application → Cookies → jwt
3. Przeglądarka powinna przekierować do `/` (Dashboard)
4. Odśwież stronę - użytkownik powinien pozostać zalogowany
5. Wyloguj się - cookie powinno zostać usunięte

## Production Considerations

W środowisku produkcyjnym:
- Cookie będzie miało flagę `Secure` (tylko HTTPS)
- Należy upewnić się, że aplikacja działa na HTTPS
- Ewentualnie rozważyć dodanie flagi `Domain` dla subdomen

## Uwagi

- LocalStorage nadal przechowuje `user` (dla wygody client-side)
- API endpoints mogą nadal używać Authorization header
- Middleware obsługuje oba mechanizmy (cookie + header)

