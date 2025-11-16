# Plan implementacji widoku Admin Config

## 1. Przegląd

Widok **Admin Config** umożliwia administratorom przegląd aktualnej konfiguracji systemowej w trybie tylko-do-odczytu. Prezentuje pary klucz-wartość w formie kart oraz wskaźniki statusu kluczowych usług backendowych, zapewniając szybki wgląd w stan platformy.

## 2. Routing widoku

| Metoda | Ścieżka | Ochrona | Opis |
|--------|---------|---------|------|
| `Page` | `/admin/config` | `requireAuth(['admin'])` | Strona dostępna wyłącznie dla użytkowników z rolą **admin**.

Routing realizujemy w `src/pages/admin/config.astro`, wykorzystując layout administratora.

## 3. Struktura komponentów

```
AdminConfigPage
├─ StatusBar          (zbiorczy wskaźnik stanu usług)
├─ ConfigGrid         (siatka kart konfiguracyjnych)
│  ├─ ConfigCard      (pojedyncza para klucz-wartość)
└─ ErrorState / EmptyState / LoadingOverlay
```

## 4. Szczegóły komponentów

### AdminConfigPage

* **Opis**: Strona kontener – pobiera dane konfiguracyjne z API, przechowuje stan i renderuje pozostałe komponenty.
* **Główne elementy**: nagłówek `h1`, `StatusBar`, `ConfigGrid`, warstwy `LoadingOverlay`, `ErrorState`.
* **Interakcje**: `useEffect` → pobranie danych po załadowaniu; przycisk „Odśwież” w nagłówku.
* **Walidacja**: brak pól formularza; walidacja odpowiedzi API (czy obiekt, czy pusty).
* **Typy**: `ConfigDto`, `ConfigItemVM`, stan komponentu `AdminConfigState`.
* **Propsy**: brak (renderowana bezpośrednio przez trasę).

### StatusBar

* **Opis**: Wyświetla zbiorczy status systemu (np. „OK”, „Degraded”, „Down”).
* **Elementy**: ikona SVG (koloruje się wg statusu), labelka.
* **Interakcje**: brak bezpośrednich; przyjmuje dane jako props.
* **Walidacja**: status musi być jedną z wartości `"ok" | "degraded" | "down"`.
* **Typy**: `SystemStatus` (enum), `StatusBarProps`.
* **Propsy**: `{ status: SystemStatus }`.

### ConfigGrid

* **Opis**: Odpowiada za responsywny układ kart (`grid lg:grid-cols-3 gap-4`).
* **Elementy**: lista `ConfigCard`.
* **Interakcje**: brak.
* **Walidacja**: wymaga tablicy `ConfigItemVM[]`.
* **Typy**: `ConfigItemVM`, `ConfigGridProps`.
* **Propsy**: `{ items: ConfigItemVM[] }`.

### ConfigCard

* **Opis**: Prezentuje pojedynczy wpis konfiguracyjny.
* **Elementy**: `div.card` → `h3` klucz, `p` wartość, opcjonalny tooltip.
* **Interakcje**: hover-tooltip z pełną wartością dla długich ciągów.
* **Walidacja**: klucz ≠ ""; wartość ≠ undefined.
* **Typy**: `ConfigItemVM`, `ConfigCardProps`.
* **Propsy**: `{ item: ConfigItemVM }`.

### LoadingOverlay / ErrorState / EmptyState

* **Opis**: Wzorcowe komponenty z katalogu `components/ui` służące do obsługi stanów przejściowych.

## 5. Typy

```ts
// Już istniejące z src/types.ts
export interface ConfigDto {
  [key: string]: string;
}

// Nowe dla widoku
export type SystemStatus = "ok" | "degraded" | "down";

export interface ConfigItemVM {
  key: string;
  value: string;
}

export interface AdminConfigState {
  items: ConfigItemVM[];
  status: SystemStatus;
  loading: boolean;
  error: string | null;
}
```

## 6. Zarządzanie stanem

* **Hook**: `useAdminConfig()` (lokalny dla strony)
  * Stan: `AdminConfigState`
  * Akcje: `fetchConfig()`, `setError()`, `refresh()`
* Brak globalnego store – dane dotyczą wyłącznie tej strony.

## 7. Integracja API

| Metoda | Endpoint | Request | Response |
|--------|----------|---------|----------|
| `GET`  | `/api/v1/admin/config` | Brak body, wymagany nagłówek `Authorization: Bearer <jwt>` | `ConfigDto` (mapa klucz-wartość)

Mapowanie do frontend-u:
* `ConfigDto` → tablica `ConfigItemVM` (`Object.entries(dto).map(...)`).
* Dodatkowo heurystyka statusu: jeżeli istnieje klucz `system_status`, mapuj na `SystemStatus`.

## 8. Interakcje użytkownika

1. **Otwiera widok** → strona wyświetla `LoadingOverlay`, rozpoczyna żądanie.
2. **Dane zwrócone** → render `StatusBar` + `ConfigGrid`.
3. **Błąd żądania** → pokazuje `ErrorState` z przyciskiem „Spróbuj ponownie”.
4. **Klik „Odśwież”** → ponownie wywołuje `fetchConfig()`.

## 9. Warunki i walidacja

* **Auth**: Jeśli backend zwróci `401/403`, przekieruj do `/login` lub strony błędu `403`.
* **Poprawność danych**: klucze i wartości muszą być ciągami; odfiltrować puste.
* **Status systemu**: brak klucza → ustaw `degraded`.

## 10. Obsługa błędów

| Scenariusz | Reakcja UI |
|------------|-----------|
| `401/403`  | `redirect('/login?expired=true')` lub komunikat „Brak uprawnień”. |
| `5xx / network` | `ErrorState` z możliwością ponowienia próby. |
| Pusta odpowiedź | `EmptyState` – „Brak konfiguracji do wyświetlenia”. |

## 11. Kroki implementacji

1. **Routing** – utwórz `src/pages/admin/config.astro`, ustaw ochronę RLS `requireAuth`.  
2. **Typy** – dodaj `SystemStatus`, `ConfigItemVM`, `AdminConfigState` do `src/types.ts`.  
3. **Hook** – zaimplementuj `useAdminConfig` w `src/lib/hooks/useAdminConfig.ts`.  
4. **Komponenty UI** – stwórz `StatusBar.tsx`, `ConfigGrid.tsx`, `ConfigCard.tsx` w `src/components/admin/config/`.  
5. **Strona** – zbuduj `AdminConfigPage` w pliku `.astro`, osadź Reactowe komponenty.  
6. **Stylowanie** – zastosuj Tailwind zgodnie z design system (karty, status colors).  
7. **Obsługa błędów** – wkomponuj `ErrorState`, `LoadingOverlay`, `EmptyState`.  
8. **Testy** – dodać testy jednostkowe hooka (mock fetch) oraz testy integracyjne strony przy pomocy Playwright.  
9. **QA** – sprawdzić responsywność oraz obsługę wolnych/nieudanych połączeń.  
10. **Dokumentacja** – zaktualizować README sekcja „Admin Config”.

