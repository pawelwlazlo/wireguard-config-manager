# Plan implementacji widoku Zmiana hasła (`/change-password`)

## 1. Przegląd

Widok umożliwia użytkownikowi zmianę hasła znając aktualne hasło. Jest obowiązkowo wyświetlany po zalogowaniu z hasłem tymczasowym (`requires_password_change = true`). Formularz wymaga podania aktualnego hasła oraz dwukrotnego wprowadzenia nowego. Po pomyślnej operacji użytkownik zostaje ponownie uwierzytelniony i przeniesiony do strony głównej.

## 2. Routing widoku

| Ścieżka | Metoda renderowania | Ochrona |
|---------|--------------------|---------|
| `/change-password` | SSR/CSR przez Astro | Middleware sprawdza `session.user.requires_password_change` i wymusza przejście, w innym przypadku redirect do `/` |

## 3. Struktura komponentów

```
ChangePasswordPage (Astro → React island)
└── ChangePasswordForm (React)
    ├── PasswordInput (shadcn/ui `Input` + „pokaż/ukryj”)
    ├── PasswordInput
    └── SubmitButton (shadcn/ui `Button`)
```

## 4. Szczegóły komponentów

### ChangePasswordPage

- **Opis**: Odpowiada za pobranie danych sesji, przekazanie propsów do formularza i obsługę przekierowań po sukcesie.
- **Główne elementy**: Wrapper layoutu, nagłówek, `ChangePasswordForm`.
- **Obsługiwane interakcje**: brak (wszystko w formularzu).
- **Walidacja**: sprawdza flagę `requires_password_change` z sesji.
- **Typy**: `Session`, `ChangePasswordSuccess`.
- **Propsy**: brak (dane z hooka `useSession`).

### ChangePasswordForm

- **Opis**: Główny formularz zmiany hasła.
- **Główne elementy**:
  - Dwa pola typu `PasswordInput` (aktualne, nowe, potwierdź).
  - `SubmitButton`.
  - Blok komunikatów (`Alert`) na sukces/błąd.
- **Obsługiwane interakcje**:
  - `onSubmit` – wywołuje `changePassword()`.
  - `onChange` – lokalny state dla pól.
- **Walidacja** (z wykorzystaniem `zod`):
  - Aktualne hasło: min 8 znaków.
  - Nowe hasło: zgodność z polityką (`min 12`, jedna wielka/mała litera, cyfra, znak specjalny).
  - Potwierdzenie: identyczne z nowym.
- **Typy**: `ChangePasswordFormValues`, `ChangePasswordError`.
- **Propsy**: brak, działa samodzielnie.

### PasswordInput (re-używalny)

- **Opis**: Input typu password z ikoną pokazującą/ukrywającą tekst.
- **Główne elementy**: `Input`, `Button`-icon.
- **Obsługiwane interakcje**: toggle visibility.
- **Walidacja**: deleguje do rodzica.
- **Typy**: `PasswordInputProps`.
- **Propsy**: `id`, `label`, `value`, `onChange`, `error`.

## 5. Typy

```ts
// DTO wysyłany do backendu
export interface ChangePasswordCommand {
  current_password: string;
  new_password: string;
}

// Sukces
export type ChangePasswordSuccess = {
  jwt: string; // nowy token sesji
};

// Błędy możliwe z API
export type ChangePasswordError =
  | { code: "INCORRECT_CURRENT_PASSWORD"; message: string }
  | { code: "WEAK_PASSWORD"; message: string }
  | { code: "UNKNOWN"; message: string };

// Wartości formularza
export interface ChangePasswordFormValues {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}
```

## 6. Zarządzanie stanem

- Lokalny `useState` w `ChangePasswordForm` dla pól i statusu (`idle` | `submitting` | `success` | `error`).
- `useChangePassword` – custom hook kapsułkujący wywołanie API i obsługę sesji.
- Globalny kontekst auth (`AuthContext`) aktualizowany nowym JWT po sukcesie.

## 7. Integracja API

1. **Endpoint**: `POST /api/v1/users/me/change-password` (do zaimplementowania).  
   – Body: `ChangePasswordCommand`.  
   – Odpowiedź 200: `ChangePasswordSuccess`.  
   – 400: walidacja, 401: sesja wygasła.
2. **Supabase fallback**: `supabase.auth.updateUser({ password: new_password })` – wymaga bieżącego JWT.
3. Hook `useChangePassword`:
   - pobiera JWT z kontekstu;
   - wysyła żądanie; przy 200 aktualizuje kontekst i zwraca `success`;
   - obsługuje błędy w postaci `ChangePasswordError`.

## 8. Interakcje użytkownika

| Akcja | Wynik |
|-------|-------|
| Wprowadzenie danych w polach | Aktualizacja lokalnego stanu + walidacja na blur/change |
| Kliknięcie **Zmień hasło** | Jeśli walidacja OK → `POST`; przy sukcesie banner success + redirect `/` po 2 s |
| Błędne aktualne hasło | Pole `currentPassword` oznaczone na czerwono + message |
| Niezgodne nowe hasła | Pole `confirm` z błędem „Hasła nie są identyczne” |
| Słabe hasło | Error banner z informacją o wymaganiach |

## 9. Warunki i walidacja

1. Pola puste ⇒ przycisk disabled.  
2. `newPassword` spełnia politykę z PRD.  
3. `confirmNewPassword` === `newPassword`.  
4. Sesja jest aktywna; brak ⇒ redirect `/login`.

## 10. Obsługa błędów

- 401/403 ⇒ redirect do `/login` + toast „Sesja wygasła”.
- 400 z kodem `INCORRECT_CURRENT_PASSWORD` ⇒ error na polu.
- 400 z kodem `WEAK_PASSWORD` ⇒ globalny alert z checklistą.
- 5xx lub `UNKNOWN` ⇒ toast „Wystąpił nieoczekiwany błąd, spróbuj ponownie”. Log do Sentry.

## 11. Kroki implementacji

1. **Routing**: Dodaj stronę `src/pages/change-password.astro`; w middleware przekieruj użytkownika bez flagi `requires_password_change`.
2. **Komponenty**: Utwórz `ChangePasswordForm.tsx` oraz `PasswordInput.tsx` w `src/components`.
3. **Typy**: Dodaj nowe interfejsy do `src/types.ts`.
4. **Hook**: Zaimplementuj `useChangePassword.ts` w `src/lib/hooks`.
5. **Integracja API**: Stwórz endpoint backendowy + handler frontendowy w hooku.
6. **Stylowanie**: Zastosuj Tailwind + shadcn/ui, responsywny układ (max-width: md, centrowanie).
7. **Walidacja**: Skonfiguruj `zod` + `react-hook-form` w formularzu.
8. **Testy**: Jednostkowe hooka, e2e Playwright – scenariusz pomyślny i błędne hasło.
9. **Analytics & Audit**: Po sukcesie wywołaj `auditService.log("PASSWORD_CHANGE")`.
10. **Dokumentacja**: Zaktualizuj README i TESTING o nowy widok.
