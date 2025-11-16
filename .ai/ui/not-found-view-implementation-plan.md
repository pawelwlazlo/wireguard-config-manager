# Plan implementacji widoku Not Found

## 1. Przegląd

Widok **Not Found** służy do informowania użytkownika, że żądana strona nie istnieje (HTTP 404). Prezentuje ilustrację wraz z krótkim komunikatem i przyciskiem umożliwiającym powrót do strony głównej lub poprzedniej. Widok jest w pełni statyczny i nie wymaga pobierania danych z API.

## 2. Routing widoku

| Ścieżka | Plik routingu | Zachowanie |
|---------|---------------|------------|
| `*` (catch-all) | `src/pages/404.astro` | Wyświetla widok Not Found dla wszystkich nieistniejących tras |

> Uwaga: Astro automatycznie serwuje plik `404.astro` jako stronę błędu 404 zarówno w trybie SSR, jak i w buildzie statycznym.

## 3. Struktura komponentów

```
404.astro
└─ NotFoundIllustration (React / ui)
   ├─ <img/svg> – ilustracja 404
   ├─ <h1> – nagłówek „Strona nie znaleziona”
   ├─ <p> – opis błędu
   └─ <Button> „Powrót do strony głównej”
```

## 4. Szczegóły komponentów

### NotFoundIllustration

- **Opis**: Komponent prezentujący ilustrację „404”, komunikat i przycisk nawigacyjny.
- **Główne elementy**:
  - `figure > img` lub osadzony SVG (z `src/assets`)
  - `h1` – nagłówek 404
  - `p` – krótki opis
  - `Button` z Shadcn/ui (wariant `secondary`) prowadzący na `/`
- **Obsługiwane interakcje**:
  - Kliknięcie przycisku → `navigate('/')` (lub `history.back()` jeśli referrer istnieje)
- **Walidacja**: brak – komponent nie przyjmuje danych zewnętrznych.
- **Typy**: brak dodatkowych, wykorzystuje wbudowane typy React (`FC`, itd.).
- **Propsy**: brak – komponent w pełni samowystarczalny.

## 5. Typy

Widok nie definiuje nowych DTO ani ViewModeli. Korzysta wyłącznie z typów React/Tailwind.

## 6. Zarządzanie stanem

Brak zewnętrznego stanu. Drobny stan lokalny nie jest potrzebny (czysty komponent prezentacyjny).

## 7. Integracja API

Brak zapytań do API. Widok jest w pełni statyczny.

## 8. Interakcje użytkownika

| Interakcja | Wynik |
|------------|-------|
| Kliknięcie „Powrót do strony głównej” | `router.push('/')` – nawigacja do dashboardu |

## 9. Warunki i walidacja

Brak warunków wymagających walidacji. Widok renderuje się zawsze.

## 10. Obsługa błędów

Widok sam jest stroną błędu, nie wymaga dodatkowej obsługi wyjątków. Potencjalne błędy ładowania ilustracji można przechwycić atrybutem `onError` i wyświetlić fallback (np. tekst bez ilustracji).

## 11. Kroki implementacji

1. **Utwórz plik strony** `src/pages/404.astro` z podstawowym markdown/HTML.
2. **Stwórz komponent** `src/components/NotFoundIllustration.tsx`:
   - Zaimportuj `Button` z `@/components/ui/button`.
   - Dodaj ilustrację (`import notFoundSvg from '@/assets/background.svg'` lub dedykowany plik `404.svg`).
3. **Dodaj stylowanie** z Tailwind (flex-center, responsywność, przestrzenie).
4. **Zaimplementuj przycisk** nawigujący na `/` korzystając z `@astrojs/react` + `window.location` lub `astro:redirect`.
5. **Zarejestruj ilustrację w `svg.d.ts`** (jeśli to nowy plik SVG) dla poprawnych typów.
6. **Dodaj test e2e** (Playwright) sprawdzający, że nieistniejąca trasa zwraca 404 i renderuje przycisk.
7. **Uruchom `pnpm dev`** i przetestuj w przeglądarce.
8. **Commit**: `feat(ui): add 404 Not Found view`.
