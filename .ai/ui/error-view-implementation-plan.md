# Plan implementacji widoku Error

## 1. Przegląd

Widok Error odpowiada za wyświetlanie globalnych komunikatów błędów aplikacji. Obsługuje zarówno błędy zwracane po stronie serwera (SSR), jak i te powstające po stronie klienta podczas wywołań API. Głównym celem widoku jest zapewnienie spójnego i przyjaznego użytkownikowi sposobu informowania o problemach takich jak brak dostępu (403), nieznaleziony zasób (404), błąd autoryzacji (401) czy błąd wewnętrzny (500).

## 2. Routing widoku

| Ścieżka | Opis |
|---------|------|
| `/error` | Strona zbiorcza wyświetlająca szczegóły dowolnego błędu HTTP. Przyjmuje kod błędu jako query param (`?code=XXX`). |
| `/403`   | Strona skrócona (alias) wyświetlająca komunikat o braku uprawnień. Przekierowuje lub renderuje z tym samym szablonem co `/error?code=403`. |

## 3. Struktura komponentów

```
Layout.astro
 └─ ErrorBoundary (React, lazy-loaded)
     └─ ErrorPage (Astro)
         ├─ ErrorHeader (React)
         ├─ ErrorDetails (React)
         └─ ActionButtons (React)
```

Dodatkowo banner kontekstowy:

```
Layout.astro
 └─ AccessDeniedBanner (React)
```

## 4. Szczegóły komponentów

### ErrorBoundary

- **Opis:** Otacza drzewa React wewnątrz Layoutu. Przechwytuje JS-owe wyjątki runtime i przekierowuje do `/error?code=500` lub renderuje ErrorPage inline.
- **Główne elementy:** `React.ErrorBoundary`, fallback renderujący `<ErrorPage code={500} message={error.message}/>`.
- **Obsługiwane interakcje:** brak (pasywny komponent).
- **Walidacja:** walidacja typu obiektu błędu; domyślnie fallback zawsze renderowany.
- **Typy:** `ErrorBoundaryProps { children: ReactNode }`.
- **Propsy:** `children`.

### AccessDeniedBanner

- **Opis:** Pasek ostrzegawczy osadzany w Layout. Widoczny, gdy ostatnia odpowiedź API zwróciła 403 lub gdy komponent nadrzędny wymusi.
- **Główne elementy:** shadcn/ui `Alert` z ikoną `ShieldAlert`.
- **Obsługiwane interakcje:** użytkownik może zamknąć banner (`onDismiss`).
- **Walidacja:** brak.
- **Typy:** `AccessDeniedBannerProps { onDismiss?: () => void }`.
- **Propsy:** `onDismiss`.

### ErrorPage

- **Opis:** Strona Astro renderowana dla `/error` i `/403`. Przyjmuje kod HTTP i opcjonalny opis, wybiera odpowiedni komunikat i grafiki.
- **Główne elementy:**
  - `ErrorHeader` – nagłówek (kod + tytuł)
  - `ErrorDetails` – opis problemu oraz proponowane działania
  - `ActionButtons` – przyciski nawigacji (powrót, strona główna, kontakt)
- **Obsługiwane interakcje:** kliknięcia w przyciski.
- **Walidacja:** kod błędu musi znajdować się na liście `[401,403,404,500]`, w przeciwnym razie domyślnie 500.
- **Typy:** `ErrorPageProps { code: 401|403|404|500; message?: string }`.
- **Propsy:** `code`, `message`.

### ErrorHeader

- **Opis:** Wyświetla duży kod (xxxl font) i krótką nazwę błędu.
- **Główne elementy:** `h1`, `p`.
- **Obsługiwane interakcje:** brak.
- **Walidacja:** brak.
- **Typy:** `ErrorHeaderProps { code: number }`.
- **Propsy:** `code`.

### ErrorDetails

- **Opis:** Szczegółowy opis problemu, możliwe przyczyny i kroki naprawcze.
- **Główne elementy:** `p`, `ul/li`.
- **Obsługiwane interakcje:** linki (np. „Zaloguj ponownie”).
- **Walidacja:** brak.
- **Typy:** `ErrorDetailsProps { code: number; message?: string }`.
- **Propsy:** `code`, `message`.

### ActionButtons

- **Opis:** Zestaw CTA (np. „Strona główna”, „Powrót” i „Kontakt z administratorem”).
- **Główne elementy:** shadcn/ui `Button`.
- **Obsługiwane interakcje:** kliknięcia.
- **Walidacja:** brak.
- **Typy:** `ActionButtonsProps { code: number }`.
- **Propsy:** `code`.

## 5. Typy

```ts
// src/types/error.ts
export type HttpErrorCode = 401 | 403 | 404 | 500;

export interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export interface ErrorContextValue {
  lastErrorCode?: HttpErrorCode;
  setLastErrorCode: (code?: HttpErrorCode) => void;
}
```

## 6. Zarządzanie stanem

- **ErrorContext (React Context):** przechowuje ostatni kod błędu HTTP otrzymany z wywołania `fetchSupabase()` (customowy wrapper).
- **useError** – customowy hook udostępniający setter i wartość z kontekstu.
- **useApi** – istniejący hook/serwis fetchujący API zostanie rozszerzony o: jeśli odpowiedź ma status 401/403, wykonuje `setLastErrorCode(status)`; globalne odświeżenie tokenu lub przekierowanie.
- **AccessDeniedBanner** subskrybuje context i renderuje się warunkowo.

## 7. Integracja API

Brak dedykowanych endpointów. Komponenty reagują na statusy HTTP dowolnych wywołań.

- **fetchSupabase / apiClient**: rozszerzyć o obsługę `response.status` w zakresie 4xx/5xx.
- Status 401 → przekierowanie do `/login?redirect=current`.
- Status 403 → `setLastErrorCode(403)` i pokazanie `AccessDeniedBanner`.
- Inne → opcjonalne przekierowanie `/error?code=<status>`.

## 8. Interakcje użytkownika

| Akcja | Wynik |
|-------|-------|
| Zamknięcie banneru AccessDenied | Banner znika do końca sesji lub do kolejnego błędu 403 |
| Klik „Strona główna” na ErrorPage | Przejście do `/` |
| Klik „Powrót” | `history.back()` |
| Klik „Kontakt” | Otwarcie domyślnego klienta mailto z adresem support@company.pl |

## 9. Warunki i walidacja

| Warunek | Komponent | Reakcja |
|---------|-----------|---------|
| `code` ∉ `[401,403,404,500]` | ErrorPage | renderuj 500 |
| `fetch` zwraca 403 | useApi | zapis w kontekście, banner |
| Brak błędu w kontekście | AccessDeniedBanner | nie renderuj |

## 10. Obsługa błędów

- **Błędy JS** łapane przez `ErrorBoundary`, renderują ErrorPage z kodem 500.
- **Błędy sieciowe** (brak odpowiedzi) mapowane na 500 + toast z informacją o sieci.
- **Nieobsługiwane kody** → domyślne 500.

## 11. Kroki implementacji

1. **Typy:** utwórz `src/types/error.ts` i zdefiniuj `HttpErrorCode`, `ErrorContextValue`.
2. **ErrorContext & hook:** utwórz pliki `src/lib/contexts/ErrorContext.tsx` i `src/lib/hooks/useError.ts`.
3. **ErrorBoundary:** stwórz `src/components/ErrorBoundary.tsx`.
4. **AccessDeniedBanner:** stwórz banner w `src/components/ui/AccessDeniedBanner.tsx` wykorzystując shadcn/ui `Alert`.
5. **Layout:** zaimportuj `ErrorBoundary` oraz umieść `AccessDeniedBanner` tuż pod nagłówkiem.
6. **API client:** rozszerz `lib/services/utils.ts` lub odpowiedni wrapper o przekazywanie statusu do kontekstu.
7. **Strony:** dodaj `src/pages/error.astro` i `src/pages/403.astro` wykorzystujące komponent `ErrorPage`.
8. **ErrorPage + podkomponenty:** utwórz pliki React pod `src/components/error/`.
9. **Routing:** w `src/middleware/index.ts` przechwyć SSR-owe błędy 401/403/404/500 i przekieruj na `/error?code=<status>`.
10. **Testy manualne:** wymuś różne błędy za pomocą istniejących skryptów testowych.
11. **Dokumentacja:** zaktualizuj `README.md` sekcję o błędach oraz `CLAUDE.md` z opisem konwencji.
