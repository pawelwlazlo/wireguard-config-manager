# Plan implementacji widoku Admin Peers

## 1. Przegląd

Widok „Admin Peers” umożliwia administratorom przegląd, filtrowanie, ręczne przypisywanie oraz unieważnianie (revokację) peerów WireGuard w całym systemie. Zawiera tabelę peerów z rozbudowanymi filtrami, paginacją oraz akcjami kontekstowymi.

## 2. Routing widoku

`/admin/peers` – dostępne wyłącznie dla użytkowników posiadających rolę `admin` (middleware autoryzacyjne).

## 3. Struktura komponentów

```
<AdminPeersPage>
 ├─ <PageHeader>
 ├─ <PeerFilters>
 ├─ <PeerList>
 │    └─ <DataTable>
 │         └─ <RowActions>
 ├─ <Pagination>
 ├─ <AssignmentModal>
 └─ <ConfirmDialog>
```

## 4. Szczegóły komponentów

### AdminPeersPage

- **Opis**: Komponent kontenerujący całą logikę widoku: pobieranie danych, zarządzanie stanem filtrów, otwieranie modali.
- **Elementy**: nagłówek strony, filtry, lista peerów, paginacja, modale.
- **Interakcje**: inicjalne pobranie danych, odświeżanie po zmianie filtrów/paginacji; przekazuje callbacki do podrzędnych.
- **Walidacja**: poprawność wartości filtrów (np. `status ∈ {available, active, inactive}`).
- **Typy**: `Page<PeerDto>`, `PeerFiltersState`, `AdminPeersVM`.
- **Propsy**: brak – renderowany z routingu.

### PeerFilters

- **Opis**: Pasek filtrów (status, owner) oraz przyciski reset/zastosuj.
- **Elementy**: `<Select>` (status), `<Input>` (owner UUID), `<Button>` apply/reset.
- **Interakcje**: onChange pól aktualizuje lokalny stan; onApply wywołuje `onSubmit` przekazane z rodzica.
- **Walidacja**: owner musi być UUID – użyć `zod` w handleSubmit.
- **Typy**: `PeerFiltersState` `{ status?: PeerStatus; owner?: string }`.
- **Propsy**: `value`, `onChange`, `onSubmit`.

### PeerList

- **Opis**: Tabela peerów w trybie admin.
- **Elementy**: shadcn `<DataTable>` z kolumnami: Public Key, Friendly Name, Status, Owner, Claimed At, Revoked At, Actions.
- **Interakcje**:
  - klik „Assign” → `onAssign(peer)` (otwiera modal)
  - klik „Revoke” → `onRevoke(peer)` (otwiera confirm dialog)
- **Walidacja**: brak pól edycyjnych.
- **Typy**: `PeerRowVM` (rozszerza `PeerDto` o owner email).
- **Propsy**: `peers`, `loading`, `onAssign`, `onRevoke`.

### RowActions

- **Opis**: Menu akcji w wierszu tabeli.
- **Elementy**: shadcn `<DropdownMenu>` z opcjami Assign/Revoke.
- **Interakcje**: wywołuje callbacki rodzica.
- **Typy**: `PeerRowVM`.
- **Propsy**: `peer`, `onAssign`, `onRevoke`.

### Pagination

- **Opis**: Kontrola paginacji (numer strony + rozmiar).
- **Elementy**: shadcn `<Pagination>`.
- **Interakcje**: `onPageChange`, `onSizeChange`.
- **Typy**: `{ page: number; size: number; total: number }`.
- **Propsy**: `page`, `size`, `total`, `onChange`.

### AssignmentModal

- **Opis**: Modal dialog umożliwiający przypisanie wybranego peera do konkretnego użytkownika.
- **Elementy**: `<Dialog>` + `<Form>` z polem `user_id` (UUID lub autocomplete email).
- **Interakcje**: submit → wywołuje `assignPeer` hook; sukces zamyka modal, odświeża listę; błąd wyświetla komunikat.
- **Walidacja**: `user_id` wymagany, UUID.
- **Typy**: `AssignPeerCommand`.
- **Propsy**: `peer`, `open`, `onClose`, `onSuccess`.

### ConfirmDialog

- **Opis**: Dialog potwierdzający unieważnienie (DELETE) peera.
- **Elementy**: `<AlertDialog>` (shadcn).
- **Interakcje**: confirm → `revokePeer` hook; sukces odświeża listę.
- **Walidacja**: brak.
- **Typy**: `PeerDto` (id).
- **Propsy**: `peer`, `open`, `onClose`, `onConfirm`.

## 5. Typy

```ts
// Widoczne w pliku src/types.ts lub lokalnie w widoku
export interface PeerFiltersState {
  status?: PeerStatus; // z enums
  owner?: string;      // UUID
}

export interface PeerRowVM extends PeerDto {
  owner_email?: string | null;
}

export interface AdminPeersVM {
  peers: PeerRowVM[];
  page: number;
  size: number;
  total: number;
  filters: PeerFiltersState;
  loading: boolean;
  error?: string;
}
```

## 6. Zarządzanie stanem

- **Hook `useAdminPeers`**
  - Przechowuje `AdminPeersVM`.
  - Zapewnia funkcje: `setFilters`, `setPage`, `reload`.
  - Wykonuje zapytanie GET `/api/v1/admin/peers` przy zmianie zależności.

- **Hook `useAssignPeer`**
  - Mutacja POST `/api/v1/admin/peers/{id}/assign`.
  - Zwraca `mutate(peerId, userId)` + `status`, `error`.

- **Hook `useRevokePeer`**
  - Mutacja DELETE `/api/v1/admin/peers/{id}`.

Zarządzanie modalami poprzez lokalny `useState` w `AdminPeersPage`.

## 7. Integracja API

| Akcja | Endpoint | Metoda | Request | Response |
|-------|----------|--------|---------|----------|
| Pobierz listę peerów | `/api/v1/admin/peers` | GET | query: `status`, `owner`, `page`, `size` | `Page<PeerDto>` |
| Przypisz peer | `/api/v1/admin/peers/{id}/assign` | POST | body: `AssignPeerCommand` | `PeerDto` |
| Revoke peer | `/api/v1/admin/peers/{id}` | DELETE | – | 204 |

Wszystkie wywołania podpisywane JWT z sesji Supabase (hook `useSession`).

## 8. Interakcje użytkownika

1. Zmiana filtrów → odświeżenie tabeli.
2. Zmiana strony/rozmiaru → odświeżenie tabeli.
3. Klik „Assign” → otwarcie `AssignmentModal`.
4. Submit w modal → przypisanie → toast sukcesu → reload listy.
5. Klik „Revoke” → potwierdzenie → revokacja → toast sukcesu → reload listy.

## 9. Warunki i walidacja

- `status` musi być jednym z wartości Enum.
- `owner` (UUID) walidowane na froncie i backendzie.
- `user_id` w modalu – UUID.
- Przed wywołaniem mutacji sprawdzić, czy peer `status === "available"` dla assign.

## 10. Obsługa błędów

| Kod | Scenariusz | UI |
|-----|------------|----|
| 400 | ValidationError / LimitExceeded / PeerNotAvailable | Wyświetlenie alertu w modalach lub banner nad tabelą |
| 401 | Unauthorized | Redirect do `/login` |
| 403 | Forbidden | Komunikat „Brak dostępu” |
| 404 | NotFound | Toast z informacją, odświeżenie tabeli |
| 500 | InternalError | Toast z błędem, log do console.error |

## 11. Kroki implementacji

1. **Routing & Guards** – dodać stronę `src/pages/admin/peers/index.astro` z ochroną roli.
2. **Hook `useAdminPeers`** – implementacja fetch + zarządzanie stanem.
3. **Komponenty UI** – PeerFilters, PeerList (DataTable), RowActions, Pagination.
4. **Modale** – AssignmentModal i ConfirmDialog z walidacją Zod.
5. **Hooki mutacji** – `useAssignPeer`, `useRevokePeer` z refetch listy.
6. **Integracja shadcn/ui** – dodać potrzebne komponenty (Dialog, Dropdown, Table, Pagination).
7. **Toast system** – wykorzystać istniejący lub dodać `useToast`.
8. **Testy manualne** – filtracja, paginacja, assign, revoke, obsługa błędów.
9. **Unit tests (opcjonalnie)** – test hooków przy użyciu MSW.
10. **Lint + Prettier + PR** – upewnić się, że kod przechodzi CI.
