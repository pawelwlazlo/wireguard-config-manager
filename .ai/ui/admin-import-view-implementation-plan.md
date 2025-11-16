# Plan implementacji widoku Import Peers (Admin)

## 1. Przegląd

Widok **Import Peers** umożliwia administratorom uruchomienie skanowania katalogu z plikami WireGuard (`PeerConfigDirectory`) oraz podgląd rezultatów operacji. Strona udostępnia przycisk „Start Import”, wyświetla modal z postępem oraz kartę podsumowującą ostatni import.

## 2. Routing widoku

| Path | Strona Astro |
|------|--------------|
| `/admin/import` | `src/pages/admin/import.astro` |

Strona jest chroniona middlewarem `auth` – dostępna wyłącznie dla użytkowników z rolą **admin**.

## 3. Struktura komponentów

```
AdminImportPage (Astro)  
└─<AdminImportReactRoot> (React)  
  ├─ ImportSummaryCard  
  ├─ StartImportButton  
  └─ ImportProgressModal (portal)
```

## 4. Szczegóły komponentów

### 4.1 AdminImportReactRoot

- **Opis**: Kontener React odpowiedzialny za logikę importu, zarządzanie stanem oraz renderowanie dzieci.
- **Główne elementy**:
  - `<ImportSummaryCard />`
  - `<button>` Start Import
  - `<ImportProgressModal />` – renderowany warunkowo w portalu (`react-dom/createPortal`).
- **Obsługiwane interakcje**:
  - Kliknięcie przycisku „Start Import”.
- **Walidacja**:
  - Blokada przycisku podczas trwającego importu (`disabled`).
- **Typy**: `ImportState`, `ImportResultDto`.
- **Propsy**: Brak (pobiera dane z hooków lub _context_).  

### 4.2 StartImportButton

- **Opis**: Przycisk wyzwalający operację importu.
- **Główne elementy**: `<Button variant="default" />` z shadcn/ui.
- **Interakcje**: `onClick` → `handleStartImport`.
- **Walidacja**: `disabled` gdy `isImporting === true`.
- **Typy**: dziedziczy ze standardowych atrybutów HTMLButtonElement.
- **Propsy**: `isLoading: boolean`, `onClick: () => void`.

### 4.3 ImportProgressModal

- **Opis**: Modal wskazujący, że trwa import. Pokazuje spinner oraz tekst statusu.
- **Główne elementy**:
  - `<Dialog>` z shadcn/ui.
  - `<Spinner />` (z biblioteki lub własny).
  - `(opcjonalnie)` pasek postępu.
- **Interakcje**: Brak przycisków – modalu nie można zamknąć ręcznie.
- **Walidacja**: Renderowany tylko, gdy `isImporting === true`.
- **Typy**: `isOpen: boolean` (prop).
- **Propsy**: `isOpen: boolean`.

### 4.4 ImportSummaryCard

- **Opis**: Karta prezentująca wyniki ostatniego importu.
- **Główne elementy**:
  - Ikona sukcesu / info.
  - Liczba zaimportowanych plików.
  - `batch_id` (monospace).
  - Znacznik czasu ostatniego importu (z `Date.now()` w chwili otrzymania wyniku).
- **Interakcje**: Brak (read-only).
- **Walidacja**: Renderowana tylko, gdy `importResult !== null`.
- **Typy**: `ImportResultDto`, `ImportSummaryVM`.
- **Propsy**: `result: ImportResultDto`.

## 5. Typy

```ts
// DTO z backendu
export interface ImportResultDto {
  files_imported: number;
  batch_id: string;
}

// Stan lokalny komponentu korzenia
export interface ImportState {
  isImporting: boolean;
  result: ImportResultDto | null;
  error: string | null; // „DirError”, „Unauthorized”, inny
  lastFinishedAt: number | null;
}

// ViewModel karty podsumowania
export interface ImportSummaryVM {
  files: number;
  batchId: string;
  finishedAt: number;
}
```

## 6. Zarządzanie stanem

- `useReducer<ImportState, Action>` lub `useState` z zagnieżdżonym obiektem.
- Akcje: `START`, `SUCCESS`, `ERROR`, `RESET`.
- Dostępne w `AdminImportReactRoot` i przekazywane w dół za pomocą propsów.

## 7. Integracja API

```ts
async function triggerImport(): Promise<ImportResultDto> {
  const res = await fetch('/api/v1/admin/import', { method: 'POST' });
  if (!res.ok) {
    const body = await res.json();
    throw new Error(body.error || 'Unknown');
  }
  return (await res.json()) as ImportResultDto;
}
```

- **Żądanie**: `POST` bez ciała.
- **Odpowiedź 200**: `ImportResultDto`.
- **Błędy**:
  - `401 Unauthorized` – przekierowanie do logowania.
  - `403 Forbidden` – banner „Brak uprawnień”.
  - `500 ConfigError` z `error === 'DirError'` – wyświetlić banner zgodnie z US-019.

## 8. Interakcje użytkownika

1. Admin otwiera `/admin/import`.
2. Klik „Start Import” → przycisk staje się nieaktywny, pojawia się `ImportProgressModal`.
3. Po sukcesie modal znika, pojawia się `ImportSummaryCard` z danymi.
4. W przypadku błędu modal znika, pojawia się banner błędu.

## 9. Warunki i walidacja

| Warunek | Komponent | Reakcja UI |
|---------|-----------|------------|
| `isImporting` | StartImportButton | `disabled` + spinner ikonka |
| Brak roli admin | Guard w middleware | redirect 403 |
| `DirError` | Root | Banner z kodem błędu, ukrywa się po kolejnej próbie sukcesu |

## 10. Obsługa błędów

- **DirError**: Stały `Alert` z możliwością ponowienia importu.
- **Network/Unknown**: Toast z komunikatem + log do konsoli.
- **Unauthorized/Forbidden**: Przekierowanie do `/login` lub banner.

## 11. Kroki implementacji

1. **Routing** – utwórz `src/pages/admin/import.astro` i dodaj ochronę middleware.
2. **Setup** – wstaw kontener div (#admin-import-root) i załadować `AdminImportReactRoot` poprzez `client:only="react"`.
3. **Typy** – dodaj nowe interfejsy w `src/types.ts` (ImportState, ImportSummaryVM).
4. **Hook** – zaimplementuj `useImportPeers` (opcjonalnie) z logiką trigger/stan.
5. **Komponenty** – utwórz folder `src/components/admin/import/` i dodaj 3 komponenty opisane powyżej.
6. **Stylowanie** – użyj Tailwind + shadcn/ui zgodnie z design system.
7. **Portal modal** – wykorzystaj `@radix-ui/react-dialog` przez shadcn/ui.
8. **Banner błędu** – użyj komponentu `Alert` z shadcn/ui na górze strony.
9. **Testy** – jednostkowe dla reducer/hook (Jest + React Testing Library).
10. **E2E** – Cypress: scenariusz sukces + scenariusz DirError.
11. **Dokumentacja** – uzupełnij README o wymagane env `IMPORT_DIR`.
