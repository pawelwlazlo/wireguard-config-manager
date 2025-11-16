# Plan implementacji widoku Rejestracja użytkownika

## 1. Przegląd
Widok „Rejestracja” umożliwia nowym użytkownikom z dozwolonych domen firmowych utworzenie konta w aplikacji WireGuard Configuration Manager. Formularz zbiera adres e-mail oraz hasło, zapewnia walidację zgodną z wymaganiami domenowymi i bezpieczeństwa haseł, prezentuje checklistę spełnionych kryteriów, a po sukcesie kieruje użytkownika do ekranu logowania lub dashboardu.

## 2. Routing widoku
| Ścieżka | Metoda | Plik strony |
|---------|--------|-------------|
| `/register` | GET | `src/pages/register.astro` |

## 3. Struktura komponentów
```
register.astro (layout: Layout.astro)
└── <RegisterForm /> (React)
    ├── <InputEmail />
    ├── <InputPassword />
    ├── <InputPasswordConfirm />
    ├── <PasswordChecklist />
    └── <SubmitButton />
```

## 4. Szczegóły komponentów

### RegisterForm
- **Opis:** Główny kontener formularza rejestracji. Zarządza stanem pól, walidacją i wywołaniem API.
- **Elementy:** `<form>`, dzieci wymienione w strukturze, komunikaty błędów.
- **Obsługiwane interakcje:** onChange pól, onSubmit formularza.
- **Walidacja:**
  - Adres e-mail: wymagany, poprawny format, domena w `accepted_domains` (walidacja wstępna regex + sprawdzanie domeny z listy konfiguracyjnej pobranej z API lub zakodowanej w zmiennej środowiskowej; ostateczna walidacja po stronie backendu).
  - Hasło: min. 8 znaków, 1 wielka litera, 1 mała litera, 1 cyfra, 1 znak specjalny.
  - Potwierdzenie hasła: identyczne z hasłem.
  - Wszystkie kryteria checklisty spełnione → aktywacja przycisku.
- **Typy:** `RegisterFormState`, `RegisterCommand`, `AuthResponse`, `FormError` (nowy).
- **Propsy:** brak (komponent root).

### PasswordChecklist
- **Opis:** Wizualna lista kryteriów hasła, która aktualizuje się w czasie pisania.
- **Elementy:** `<ul>` z `<li>` zawierającymi ikonę (✔︎/✖︎) i opis kryterium.
- **Obsługiwane interakcje:** brak bezpośrednich – otrzymuje aktualną wartość hasła przez props.
- **Walidacja:** Sprawdza każde kryterium → zwraca booleans do nadrzędnego (opcjonalnie). 
- **Typy:** `PasswordCriteriaState`.
- **Propsy:** `{ password: string }`.

### InputEmail / InputPassword / InputPasswordConfirm
- **Opis:** Proste kontrolowane pola `<input>` z etykietami i komunikatami dostępności (ARIA).
- **Walidacja:** lokalna (HTML5 + custom message).
- **Propsy:** `value`, `onChange`, `error`.

### SubmitButton
- **Opis:** Komponent przycisku `Button` z `@/components/ui/button` z wariantem `primary`.
- **Propsy:** `disabled`, `loading`.

## 5. Typy
```ts
// .ai/register-view-implementation-plan.md (fragment TypeScript)
interface RegisterFormState {
  email: string;
  password: string;
  confirm: string;
  criteria: PasswordCriteriaState;
  loading: boolean;
  error?: FormError;
}

interface PasswordCriteriaState {
  length: boolean;
  upper: boolean;
  lower: boolean;
  number: boolean;
  special: boolean;
}

interface FormError {
  field?: "email" | "password" | "confirm";
  message: string;
}
```
Wykorzystujemy istniejące `RegisterCommand`, `AuthResponse` z `src/types.ts`.

## 6. Zarządzanie stanem
- **useRegisterForm** – custom hook w `src/lib/hooks/useRegisterForm.ts` obsługujący:
  - Stan formularza (`RegisterFormState`).
  - Handlery `handleChange`, `handleSubmit`.
  - Walidację lokalną i synchronizację z `PasswordChecklist`.
  - Wywołanie `register()` z `authService` (fetch wrapper → POST `/api/v1/auth/register`).
- Alternatywnie logika może pozostać w komponencie, jeśli hook uznany za zbędny.

## 7. Integracja API
- **Endpoint:** `POST /api/v1/auth/register`
- **Payload:** `RegisterCommand` { email, password }
- **Response:** `AuthResponse` { jwt, user }
- **Proces:**
  1. Po walidacji frontend wywołuje fetch(`/api/v1/auth/register`, { method: "POST", body: JSON.stringify(cmd) }).
  2. Po status 201: zapis JWT w `localStorage`/`cookie`, przekierowanie `/`.
  3. Status 400/409/500 → mapowanie na komunikat dla użytkownika.

## 8. Interakcje użytkownika
| Akcja | Wynik |
|-------|-------|
| Wpisuje e-mail | Aktualizacja stanu, natychmiastowe błędy formatu. |
| Wpisuje hasło | Aktualizacja `PasswordChecklist`. |
| Wpisuje potwierdzenie | Sprawdzenie zgodności. |
| Wszystkie warunki spełnione | Odblokowanie przycisku. |
| Klik „Zarejestruj” | Pokazuje spinner, wysyła żądanie. |
| Sukces 201 | Toast sukcesu, redirect `/login` lub auto-login. |
| Błąd walidacji/backendu | Wyświetla message pod polem lub toast błędu. |

## 9. Warunki i walidacja
1. **E-mail** – regex `^[\w-.]+@([\w-]+\.)+[\w-]{2,}$`, dodatkowo domena w `ALLOWED_DOMAINS`.
2. **Hasło** –
   - minLength ≥ 8
   - /[A-Z]/
   - /[a-z]/
   - /\d/
   - /[^A-Za-z0-9]/
3. **Potwierdzenie** – `password === confirm`.
4. Wszystkie powyższe spełnione → enable submit.

## 10. Obsługa błędów
| Kod | Scenariusz | UI |
|-----|------------|----|
| 400 ValidationError | Nieprawidłowe dane | Podpole + toast |
| 400 InvalidDomain | Domeny spoza listy | Błąd pod e-mailem |
| 409 EmailExists | Użytkownik istnieje | Błąd globalny |
| 500 AuthError / InternalError | Problem serwera | Toast „Spróbuj ponownie” |

## 11. Kroki implementacji
1. **Routing:** utwórz `src/pages/register.astro`, ustaw import Layout.
2. **Komponenty UI:** zaimplementuj `RegisterForm.tsx`, `PasswordChecklist.tsx`, proste `Input*` mogą używać `@/components/ui/input` gdy dostępne.
3. **Hook/stan:** stwórz `useRegisterForm` lub lokalny state.
4. **Walidacja:** zaimplementuj reguły; rozważ bibliotekę `zod` po stronie klienta dla spójności.
5. **Integracja API:** fetch z error handlingiem; map errors → UI.
6. **Dostępność:** aria-labels, rola alert dla błędów, focus management po błędzie.
7. **Testy komponentów:** jednostkowe dla walidacji i checklisty; e2e (Playwright) ścieżka rejestracji.
8. **Stylowanie:** Tailwind classes + komponent `Card` dla formularza.
9. **Doc:** aktualizacja `README` z flow rejestracji.
10. **Przegląd kodu & QA.**
