# Plan implementacji widoku Dashboard

## 1. Przegląd

Widok "Dashboard" (ścieżka `/`) stanowi centralne miejsce dla zalogowanego użytkownika. Łączy statystyki wykorzystania peerów (`X/Y`) z kompletną listą posiadanych konfiguracji WireGuard (peers). Użytkownik może stąd:

* sprawdzić limit i liczbę wykorzystanych peerów,
* pobrać plik konfiguracyjny `.conf`,
* nadać/zmienić "Friendly Name" peera,
* zrezygnować (revoke) z posiadanego peera,
* pozyskać kolejny peer za pomocą CTA **Get New Configuration** (POST `/api/v1/peers/claim`).

Widok obsługuje puste stany (brak peerów, osiągnięty limit) oraz błędy zwracane przez API.

## 2. Routing widoku

| Ścieżka | Plik | Uwagi |
|---------|------|-------|
| `/` | `src/pages/index.astro` | SSR; osadzamy komponent React `Dashboard` przez `@astrojs/react` |

## 3. Struktura komponentów

```
Dashboard (React)
├── StatsCard
├── ClaimPeerButton
├── Conditional: EmptyState | PeerList
│   ├── PeerCard (repeat ‑ grid)
│   │   ├── PeerActions (Download / Edit / Revoke)
│   │   └── onClick → PeerDetailsModal
└── PeerDetailsModal (portal)
```

## 4. Szczegóły komponentów

### StatsCard

* **Opis:** Wyświetla licznik peerów w formacie `X / Y` oraz dodatkowo może pokazać rozbicie statusów (`active / inactive`).
* **Główne elementy:** `<div>` z Tailwind; duży tytuł, licznik, opcjonalny tooltip.
* **Obsługiwane interakcje:** Brak aktywnych; wyłącznie prezentacja.
* **Walidacja:** Wymaga `peerLimit ≥ 0`, `claimedCount ≤ peerLimit`.
* **Typy:** `{ claimedCount: number; peerLimit: number; }`
* **Propsy:** `claimedCount`, `peerLimit`.

### ClaimPeerButton

* **Opis:** CTA zgłaszające żądanie przydziału nowego peera (POST `/api/v1/peers/claim`).
* **Główne elementy:** `<button>` + spinner/disabled states.
* **Obsługiwane interakcje:** `onClick` → `handleClaim`.
* **Walidacja:** Disabled gdy `claimedCount ≥ peerLimit`.
* **Typy:** `void` (brak props oprócz callbacks) + zwrotka `PeerDto`.
* **Propsy:** `disabled: boolean; onClaimSuccess(peer: PeerDto): void`.

### PeerList

* **Opis:** Kontener renderujący siatkę kart peerów w trybie `user`.
* **Główne elementy:** CSS grid, responsywny układ; zwija się do 1 kolumny na mobile.
* **Obsługiwane interakcje:** Delegowane do `PeerCard`.
* **Walidacja:** Zapewnienie unikalnego klucza `peer.id`.
* **Typy:** `PeerDto[]`.
* **Propsy:** `peers: PeerDto[]; onPeerUpdate(updated: PeerDto): void; onPeerDelete(id: string): void`

### PeerCard

* **Opis:** Prezentuje pojedynczego peera (friendly name, public key skrócony, status label, daty).
* **Główne elementy:** Tailwind card, ikonki akcji (heroicons / lucide-react): Download, Edit, Revoke.
* **Obsługiwane interakcje:**
  * `onDownload` → GET `/api/v1/peers/{id}/download`
  * `onEdit` → otwiera modal `PeerDetailsModal` w trybie edycji
  * `onRevoke` → potwierdzenie i DELETE `/api/v1/peers/{id}`
* **Walidacja:** Akcje blokowane jeśli `peer.status !== "active"` (dla revoke) lub `revoked` (dla download).
* **Typy:** `PeerDto`.
* **Propsy:** `peer: PeerDto; onUpdate(peer: PeerDto); onDelete(id: string)`

### PeerDetailsModal

* **Opis:** Modal wyświetlający szczegóły peera oraz formularz zmiany `friendly_name`.
* **Główne elementy:** Dialog + formularz (input, przycisk Save).
* **Obsługiwane interakcje:** `onSave` → PATCH `/api/v1/peers/{id}`; Escape / backdrop close.
* **Walidacja:** `friendly_name` (regex: `^[a-z0-9-]{1,63}$`).
* **Typy:** `PeerDto` (prop) + lokalny stan edytowanej nazwy.
* **Propsy:** `peer: PeerDto; onClose(); onSave(peer: PeerDto)`

### EmptyState

* **Opis:** Ilustracja + tekst „Brak konfiguracji” / „Osiągnięto limit” + CTA.
* **Główne elementy:** SVG z `src/assets`, tekst, (opcjonalnie) przycisk.
* **Obsługiwane interakcje:** CTA przekierowuje do `ClaimPeerButton` (scroll / fokus).
* **Walidacja:** Brak.
* **Typy / Propsy:** `{ variant: "no-peers" | "limit-reached" }`

## 5. Typy

```ts
// Existing
import { PeerDto, UserDto } from "@/types";

// View-specific
interface DashboardVM {
  user: UserDto;
  peers: PeerDto[];
  claimedCount: number; // derived = peers.length
  peerLimit: number; // user.peer_limit
}

interface ClaimResponse extends PeerDto {}
```

## 6. Zarządzanie stanem

* **Hook `useDashboard`** (custom):
  * wewnętrzny `state: { user?: UserDto; peers: PeerDto[]; loading: boolean; error?: string }`.
  * efekty `fetchUser()` i `fetchPeers()` (równolegle na `useEffect` mount).
  * metody: `claimPeer`, `downloadPeer`, `updatePeer`, `revokePeer` – każda aktualizuje lokalny stan po sukcesie.
  * zwraca dane + akcje do komponentów.

* **Zarządzanie modalem** – `useState<PeerDto | null>` w `Dashboard`.

## 7. Integracja API

| Akcja | Metoda | Endpoint | Request | Response |
|-------|--------|----------|---------|----------|
| Pobranie profilu | GET | `/api/v1/users/me` | – | `UserDto` |
| Lista peerów | GET | `/api/v1/peers?status=active` | – | `Page<PeerDto>` |
| Claim peer | POST | `/api/v1/peers/claim` | – | `PeerDto` |
| Download | GET | `/api/v1/peers/{id}/download` | – | `text/plain` |
| Rename | PATCH | `/api/v1/peers/{id}` | `{ friendly_name }` | `PeerDto` |
| Revoke | DELETE | `/api/v1/peers/{id}` | – | `204 No Content` |

*Preferujemy `fetch` z wrapperem `api.ts` (retry + JSON parsing).* 

## 8. Interakcje użytkownika

1. **Widok ładuje się** → spinner, równoległe zapytania o `user` i `peers`.
2. **Get New Configuration**:
   * klik → POST claim,
   * sukces → modal toast „Configuration ready”, peer dopisywany do listy.
   * błędy `LimitExceeded` / `NoAvailable` → toast + odświeżenie licznika.
3. **Klik karty** → otwiera `PeerDetailsModal`.
4. **Zapis nazwy** → PATCH, aktualizacja listy + snackbar.
5. **Download** → natywne pobieranie pliku.
6. **Revoke** → dialog potwierdzenia, DELETE, usunięcie z listy.

## 9. Warunki i walidacja

| Warunek | Komponent | Zachowanie |
|---------|-----------|------------|
| `claimedCount ≥ peerLimit` | ClaimPeerButton, EmptyState | Przyciski disabled, pokazany variant "limit-reached" |
| Regex friendly‐name | PeerDetailsModal | Błąd formularza, blokada Submit |
| Status `revoked_at != null` | PeerCard | Ikona download wyszarzona, akcja zablokowana |

## 10. Obsługa błędów

* Sieć/API – wyświetlamy toast z komunikatem + opcja ponów.
* 401 Unauthorized – redirect do `/login`.
* 404/409 – specyficzne komunikaty (DuplicateName, NotFound).
* Claim: `LimitExceeded`, `NoAvailable` → dedykowane teksty.
* Fallback: "Coś poszło nie tak, spróbuj ponownie".

## 11. Kroki implementacji

1. Utworzyć komponent `Dashboard.tsx` w `src/components` + routing w `index.astro`.
2. Zaimplementować hook `useDashboard` (fetch user + peers).
3. Zbudować `StatsCard` i `ClaimPeerButton` (wspólne style Tailwind).
4. Stworzyć `PeerList` + `PeerCard` z akcjami.
5. Dodać `PeerDetailsModal` (headlessui / radix‐ui‐dialog).
6. Zaimplementować obsługę API w hooku + helper `api.ts`.
7. Obsłużyć empty state (`peers.length === 0`).
8. Napisać testy jednostkowe hooka (mock fetch) i komponentów.
9. Przeprowadzić testy e2e scenariuszy US-006/008/009/010.
10. Refaktoryzacja, lint, dostępność (a11y), responsywność.
