<conversation_summary>
<decisions>
Klucze główne we wszystkich tabelach będą typu UUID zgodnego z auth.users.id.
Relacja peer-user to 1-do-1; kolumna owner_id w peers z ON DELETE RESTRICT.
Statusy peers (Available, Active, Inactive) i users (Active, Inactive) zostaną zaimplementowane jako typy ENUM.
Zaszyfrowany plik konfiguracyjny przechowujemy w kolumnie peers.config_ciphertext (bytea), używając klucza z Supabase Secrets.
Tabela accepted_domains w schemacie app, edytowalna przez adminów; walidacja wildcardów zostaje w logice aplikacji.
FIFO przydział peerów będzie realizowany zapytaniem SELECT … ORDER BY imported_at LIMIT 1 FOR UPDATE SKIP LOCKED.
Nazwa przyjazna (friendly_name) unikalna w obrębie właściciela: UNIQUE(owner_id, friendly_name) i VARCHAR(63) + CHECK regex.
Dezaktywacja użytkownika uruchamia trigger DB, który ustawia peers.status = 'Inactive' oraz revoked_at.
Osobna tabela user_limit_history rejestruje zmiany peer_limit; sama wartość limitu trzymana w users.peer_limit.
Rola i uprawnienia: tabele aplikacyjne w schemacie app; rola app_backend dla serwisu; RLS na config_kv i audit_log.
Tabela password_reset_tokens (UUID token, user_id, expires_at, revoked_at) obsługuje hasła tymczasowe.
Pole TIMESTAMPTZ zapisywane w UTC dla wszystkich znaczników czasu; kolumny created_at, updated_at, claimed_at, revoked_at ustawiane triggerami.
Podstawowe indeksy:
audit_log (event_type, created_at) i (actor_id, created_at DESC)
peers (owner_id, status)
Rozszerzenia uuid-ossp, pgcrypto, pg_trgm instalowane w pierwszej migracji.
Konwencja nazewnictwa: snake_case, liczba mnoga w nazwach tabel, wzorzec <table>_<columns>_<type> dla indeksów/constraintów.
</decisions>
<matched_recommendations>
Użycie UUID jako PK – zaakceptowane.
Przechowywanie zaszyfrowanego blobu w bytea + Supabase Secrets – zaakceptowane.
Typy ENUM dla statusów – zaakceptowane.
FIFO z FOR UPDATE SKIP LOCKED – zaakceptowane.
Unikalność friendly_name per user + walidacja regex – zaakceptowane.
Trigger kaskadowej dezaktywacji peerów przy zmianie statusu użytkownika – zaakceptowane.
Tabela password_reset_tokens – zaakceptowana.
Schemat app + rola app_backend – zaakceptowane.
Triggery created_at/updated_at i CHECK chronologii w peers – zaakceptowane.
Instalacja rozszerzeń uuid-ossp, pgcrypto, pg_trgm – zaakceptowane.
</matched_recommendations>
<database_planning_summary>
Główne wymagania schematu:
Obsługa użytkowników, jednoznacznych ról (Admin/User) i ich limitów peerów.
Import, przydział, pobieranie i unieważnianie peerów z pełnym audytem zdarzeń.
Rejestracja ograniczona do domen w accepted_domains.
Bezpieczeństwo: RLS „deny by default” na krytycznych tabelach, szyfrowanie kluczy prywatnych, odseparowany schemat app, rola serwisowa.
Skalowalność: UUID jako PK, kluczowe indeksy b-tree, rozszerzenia pg_trgm dla szybkich filtrów, brak partycjonowania w MVP (możliwość dodania).
Integralność: ENUM-y dla statusów, checki chronologii, triggery utrzymujące spójność przy dezaktywacji i aktualizacjach czasowych.
Kluczowe encje i relacje:
users (1) ——< user_roles >—— (N) roles
users (1) ——< peers (owner_id FK)
users (1) ——< user_limit_history
users (1) ——< password_reset_tokens
peers ——< audit_log (poprzez subject_id/subject_table)
import_batches ——< peers (opcjonalnie w przyszłości)
Konfiguracja klucz-wartość w config_kv; domeny w accepted_domains.
Bezpieczeństwo i skalowalność:
Szyfrowanie kluczy prywatnych pgcrypto; brak dostępu admina do private_key.
RLS na peers (owner lub admin), audit_log (własne zdarzenia lub admin), config_kv (tylko admin).
Oddzielna rola app_backend; schemat app.
Rozszerzenia uuid-ossp do UUID, pg_trgm do wyszukiwań, pg_stat_statements do monitoringu.
Indeksy pod najczęstsze zapytania; brak partycjonowania i materializowanych widoków na MVP – rozważane dla >50k rekordów.
Nierozwiązane kwestie: brak krytycznych; większość dodatkowych funkcji (partycjonowanie, rate-limit, realtime) odłożona poza MVP.
</database_planning_summary>
<unresolved_issues>
Brak istotnych nierozwiązanych kwestii wpływających na MVP. Dodatkowe tematy (partycjonowanie, notyfikacje, retencja logów, rate-limit) zostały celowo odroczone do fazy post-MVP.
</unresolved_issues>
</conversation_summary>