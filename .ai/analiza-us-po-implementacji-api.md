# Analiza pokrycia historyjek użytkownika przez warstwę API

Poniższe zestawienie porównuje wymagania z `@prd.md` z aktualnym stanem endpointów w katalogu `src/pages/api`.  
Legenda:

* **✓** – w pełni pokryte przez istniejący kod API
* **◑** – częściowo pokryte (endpoint istnieje, lecz brakuje logiki, audytu lub pełnej walidacji)
* **✗** – brak implementacji

| ID | Historia użytkownika | Status | Uwagi |
|----|----------------------|--------|-------|
| US-001 | Rejestracja z kontrolą domeny | ✓ | `POST /api/v1/auth/register` |
| US-002 | Logowanie | ✓ | `POST /api/v1/auth/login` |
| US-003 | Zmiana hasła przez użytkownika | ✗ | Brak endpointu `PATCH /api/v1/users/me/password` |
| US-004 | Reset hasła przez admina | ◑ | Endpoint istnieje, brak Supabase Admin API + audytu |
| US-005 | Import konfiguracji | ◑ | Brak audytu `IMPORT` |
| US-006 | Automatyczny claim peer-a | ◑ | Brak audytu `PEER_CLAIM` |
| US-007 | Ręczny assign peer-a | ◑ | Brak audytu `PEER_ASSIGN` |
| US-008 | Pobranie pliku konfig. | ◑ | Odszyfrowanie + audyt `PEER_DOWNLOAD` |
| US-009 | Ustawienie Friendly Name | ✓ | `PATCH /api/v1/peers/{id}` |
| US-010 | Użytkownik revokuje peer-a | ◑ | Brak audytu `PEER_REVOKE` type `USER` |
| US-011 | Dezaktywacja użytkownika | ◑ | Brak kaskady revoke + audyt `USER_DEACTIVATE` |
| US-012 | Admin revokuje peer-a | ◑ | Brak audytu `PEER_REVOKE` type `ADMIN` |
| US-013 | Zmiana limitu peer-ów | ◑ | Brak audytu `LIMIT_CHANGE` |
| US-014 | Lista użytkowników | ✓ | `GET /api/v1/admin/users` |
| US-015 | Lista peer-ów | ✓ | `GET /api/v1/admin/peers` |
| US-016 | Historia audytu | ◑ | Endpoint listuje, ale brak zapisu większości zdarzeń |
| US-017 | Podgląd konfiguracji | ✓ | `GET /api/v1/admin/config` |
| US-018 | Walidacja dostępu do plików | ◑ | Brak audytu prób nieautoryzowanych |
| US-019 | Błędne katalogi importu | ✓ (API) | UI wyświetla banner – zadanie UI |
| US-020 | Metryka TTFirstDownload | ✗ | Wymaga monitoringu poza API |

## Zadania API do uzupełnienia

1. **US-003** – dodać endpoint zmiany hasła użytkownika.
2. **US-004** – dokończyć reset hasła (Supabase Admin API + `Audit_Log`).
3. **US-005** – zapisywać zdarzenie `IMPORT` w audycie.
4. **US-006** – zapisywać `PEER_CLAIM`.
5. **US-007** – zapisywać `PEER_ASSIGN`.
6. **US-008** – odszyfrować plik i logować `PEER_DOWNLOAD`.
7. **US-010** – logować `PEER_REVOKE` type `USER`.
8. **US-011** – kaskadowa dezaktywacja peer-ów + `USER_DEACTIVATE`.
9. **US-012** – logować `PEER_REVOKE` type `ADMIN`.
10. **US-013** – logować `LIMIT_CHANGE`.
11. **US-016** – zapewnić zapis wszystkich zdarzeń do `Audit_Log`.
12. **US-018** – logować odrzucone próby pobrania.
13. **US-020** – wdrożyć metrykę `TimeToFirstDownload`.
