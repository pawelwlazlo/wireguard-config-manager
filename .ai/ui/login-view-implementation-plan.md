# Plan implementacji widoku Login

## 1. Przegląd

Widok **Login** umożliwia użytkownikom uwierzytelnienie się w aplikacji za pomocą adresu e-mail i hasła. Zapewnia walidację danych wprowadzanych w czasie rzeczywistym, obsługę błędów z serwera (np. nieprawidłowe dane, limit prób) oraz link do rejestracji dla nowych użytkowników.

## 2. Routing widoku

| Ścieżka | Typ pliku | Uwagi |
|---------|-----------|--------|
| `/login` | `src/pages/login.astro` | Strona SSR z Astro. Importuje komponent React `LoginForm`. |

## 3. Struktura komponentów

```
LoginPage (Astro)  ── Layout.astro
  └─ <LoginForm /> (React)
       ├─ <ErrorBanner /> (React – warunkowy)
       └─ <form>
            ├─ <input email />
            ├─ <input password />
            └─ <button submit />
```

## 4. Szczegóły komponentów

### 4.1 `LoginPage` (Astro)

- **Opis**: Wrapper strony. Osadza widok w `Layout.astro`, ustawia metadane (`<title>Login`), importuje `LoginForm`.
- **Główne elementy**: `<Layout>`, `<LoginForm />`, link do `/register`.
- **Obsługiwane interakcje**: brak własnych – deleguje do `LoginForm`.
- **Walidacja**: brak.
- **Typy**: brak dodatkowych.
- **Propsy**: brak.

### 4.2 `LoginForm`

- **Opis**: Formularz logowania z obsługą walidacji i wysyłką do API.
- **Główne elementy**:
  - `<ErrorBanner message />` – wyświetla błąd z serwera.
  - `<input type="email" autocomplete="email" />`.
  - `<input type="password" autocomplete="current-password" />`.
  - `<button type="submit">Zaloguj</button>`.
- **Obsługiwane interakcje**:
  - `onChange` każdego pola – aktualizacja stanu i walidacja w locie.
  - `onSubmit` formularza – wywołanie API.
- **Walidacja** (klient + serwer):
  - Email: wymagany, poprawny format (RFC 5322), maks. 255 znaków.
  - Hasło: wymagane, min. 1 znak.
  - Błędy z API (`InvalidCredentials`, `TooManyAttempts`, `AuthError`) mapowane na `ErrorBanner`.
- **Typy**:
  - `LoginFormState` – lokalny stan.
  - `LoginFormErrors` – rezultat walidacji.
  - `LoginCommand`, `AuthResponse` – import z `@/types`.
- **Propsy**: brak (komponent samowystarczalny).

### 4.3 `ErrorBanner`

- **Opis**: Reużywalny baner błędów.
- **Główne elementy**: `<div role="alert" className="bg-red-500 ...">{message}</div>`.
- **Obsługiwane interakcje**: brak – statyczny.
- **Walidacja**: n/d.
- **Typy**: `{ message: string }`.
- **Propsy**: `message` (string).

## 5. Typy

```ts
// src/types/view/login.ts
export interface LoginFormState {
  email: string;
  password: string;
  loading: boolean;
  serverError: string | null;
}

export interface LoginFormErrors {
  email?: string;
  password?: string;
}
```

Wykorzystujemy istniejące:
- `LoginCommand` (żądanie) – już w `src/types.ts`.
- `AuthResponse` (odpowiedź) – już w `src/types.ts`.

## 6. Zarządzanie stanem

- `LoginForm` przechowuje stan lokalny (`useState`).
- Walidacja: `react-hook-form` + `zodResolver` z tym samym schematem co backend (`email`, `password`).
- `loading` steruje disabled przyciskiem i spinnerem.
- `serverError` przekazywany do `ErrorBanner`.

## 7. Integracja API

```ts
async function login(data: LoginCommand): Promise<AuthResponse> {
  const res = await fetch("/api/v1/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const err = await res.json();
    throw err; // zawiera { error, message }
  }
  return res.json();
}
```

- Po sukcesie: zapis JWT w `localStorage` lub cookie HTTP-only obsługiwany przez backend; przekierowanie do „/”.

## 8. Interakcje użytkownika

| Interakcja | Wynik |
|------------|-------|
| Wpisanie e-maila/hasła | Aktualizacja stanu, walidacja na bieżąco. |
| Klik „Zaloguj” | `loading=true`, wywołanie API. |
| Błąd walidacji | Blokada submit, czerwone komunikaty pod polami. |
| Błąd 400/429/500 | Wyświetlenie `ErrorBanner` z treścią błędu. |
| Sukces 200 | Przekierowanie do strony głównej. |

## 9. Warunki i walidacja

- Email poprawny format i domena dowolna (ograniczenia domen w rejestracji, nie w loginie).
- Hasło niepuste.
- Przy `loading` pola i przycisk disabled.
- Po 3 nieudanych próbach serwer może zwrócić `TooManyAttempts`; komunikat powinien sugerować odczekanie.

## 10. Obsługa błędów

| Kod/Typ błędu | Komponent | Reakcja |
|---------------|-----------|---------|
| `InvalidCredentials` 400 | ErrorBanner | „Nieprawidłowy e-mail lub hasło.” |
| `TooManyAttempts` 429 | ErrorBanner | „Zbyt wiele prób. Spróbuj ponownie później.” |
| `AuthError` 500 | ErrorBanner | „Błąd serwera uwierzytelniania. Spróbuj ponownie.” |
| Network error | ErrorBanner | „Brak połączenia z serwerem.” |

## 11. Kroki implementacji

1. **Routing**: utwórz `src/pages/login.astro`, zaimportuj `LoginForm`.
2. **Komponenty UI**:
   1. Stwórz `src/components/LoginForm.tsx` z `react-hook-form`, `zod`.
   2. Stwórz `src/components/ErrorBanner.tsx` (jeśli nie istnieje globalnie).
3. **Typy**: dodaj `src/types/view/login.ts` oraz zaimportuj w komponencie.
4. **Walidacja**: zdefiniuj `LoginSchema` (`zod`) współdzielony między backendem i frontendem (można przenieść do `@/lib/validation/login.ts`).
5. **Integracja API**: zaimplementuj funkcję `login` w `@/lib/services/apiClient.ts` lub bezpośrednio w komponencie.
6. **Obsługa sukcesu**: po otrzymaniu `AuthResponse` zapisz JWT (jeśli występuje) i `user` w kontekście auth, redirect.
7. **Obsługa błędów**: mapuj `error` z JSON na przyjazny komunikat.
8. **Stylowanie**: użyj Tailwind; formularz wycentrowany na stronie, responsywny.
9. **A11y**: `aria-invalid`, `aria-describedby` dla błędów, role="alert" w `ErrorBanner`.
10. **Testy**: napisz test E2E (Playwright) logowania z prawidłowymi i błędnymi danymi.
11. **Dokumentacja**: zaktualizuj `README.md` sekcję „Routes”.
