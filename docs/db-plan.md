# WireGuard Configuration Manager – Database Schema

## 1. Tabele, kolumny i ograniczenia

### 1.1 users
| Kolumna | Typ | Ograniczenia | Opis |
|---------|-----|--------------|------|
| id | uuid | PRIMARY KEY, NOT NULL, DEFAULT uuid_generate_v4() | Klucz główny (zgodny z auth.users.id) |
| email | text | UNIQUE, NOT NULL, CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$') | Adres e-mail użytkownika |
| status | user_status_enum | NOT NULL, DEFAULT 'active' | Status konta |
| peer_limit | integer | NOT NULL, DEFAULT (SELECT value::int FROM config_kv WHERE key = 'default_peer_limit') | Limit peerów |
| created_at | timestamptz | NOT NULL, DEFAULT now() | Data utworzenia |
| updated_at | timestamptz | NOT NULL, DEFAULT now() | Data aktualizacji |

### 1.2 roles *(słownik ENUM zastąpiony – tabela utrzymywana dla elastyczności uprawnień)*
| Kolumna | Typ | Ograniczenia | Opis |
|---------|-----|--------------|------|
| id | serial | PRIMARY KEY | |
| name | text | UNIQUE, NOT NULL | 'admin', 'user', dodatkowe |

### 1.3 user_roles *(N:M users-roles dla rozszerzalności)*
| Kolumna | Typ | Ograniczenia |
|---------|-----|--------------|
| user_id | uuid | PRIMARY KEY, REFERENCES users(id) ON DELETE CASCADE |
| role_id | integer | PRIMARY KEY, REFERENCES roles(id) ON DELETE CASCADE |
| granted_at | timestamptz | NOT NULL, DEFAULT now() |

### 1.4 peers
| Kolumna | Typ | Ograniczenia | Opis |
|---------|-----|--------------|------|
| id | uuid | PRIMARY KEY, NOT NULL, DEFAULT uuid_generate_v4() |
| public_key | text | UNIQUE, NOT NULL |
| owner_id | uuid | REFERENCES users(id) ON DELETE RESTRICT | Właściciel (może być NULL dla status = 'available') |
| status | peer_status_enum | NOT NULL, DEFAULT 'available' | Dostępność |
| friendly_name | varchar(63) | UNIQUE(owner_id, friendly_name), CHECK (friendly_name ~ '^[a-z0-9-]+$') | Nazwa nadana przez użytkownika |
| config_ciphertext | bytea | NOT NULL | Zaszyfrowany blob konfigu |
| imported_at | timestamptz | NOT NULL |
| claimed_at | timestamptz | NULL |
| revoked_at | timestamptz | NULL |
| created_at | timestamptz | NOT NULL, DEFAULT now() |
| updated_at | timestamptz | NOT NULL, DEFAULT now() |

### 1.5 audit_log
| Kolumna | Typ | Ograniczenia | Opis |
|---------|-----|--------------|------|
| id | bigserial | PRIMARY KEY |
| event_type | audit_event_enum | NOT NULL |
| actor_id | uuid | REFERENCES users(id) ON DELETE SET NULL |
| subject_table | text | NOT NULL |
| subject_id | uuid | NULL |
| metadata | jsonb | NOT NULL, DEFAULT '{}' | Szczegóły zdarzenia |
| created_at | timestamptz | NOT NULL, DEFAULT now() |

### 1.6 accepted_domains
| Kolumna | Typ | Ograniczenia |
|---------|-----|--------------|
| domain | text | PRIMARY KEY | '",example.com", "*.corp"' itd. |
| created_at | timestamptz | NOT NULL, DEFAULT now() |

### 1.7 config_kv *(prosta konfiguracja klucz-wartość)*
| Kolumna | Typ | Ograniczenia |
|---------|-----|--------------|
| key | text | PRIMARY KEY |
| value | text | NOT NULL |
| updated_at | timestamptz | NOT NULL, DEFAULT now() |

### 1.8 user_limit_history
| Kolumna | Typ | Ograniczenia |
|---------|-----|--------------|
| id | bigserial | PRIMARY KEY |
| user_id | uuid | REFERENCES users(id) ON DELETE CASCADE |
| old_limit | integer | NOT NULL |
| new_limit | integer | NOT NULL |
| changed_by | uuid | REFERENCES users(id) | NULL gdy system |
| changed_at | timestamptz | NOT NULL, DEFAULT now() |

### 1.9 password_reset_tokens
| Kolumna | Typ | Ograniczenia |
|---------|-----|--------------|
| token | uuid | PRIMARY KEY |
| user_id | uuid | REFERENCES users(id) ON DELETE CASCADE |
| expires_at | timestamptz | NOT NULL |
| revoked_at | timestamptz | NULL |
| created_at | timestamptz | NOT NULL, DEFAULT now() |

### 1.10 import_batches *(opcjonalnie do raportów)*
| Kolumna | Typ | Ograniczenia |
|---------|-----|--------------|
| id | uuid | PRIMARY KEY, DEFAULT uuid_generate_v4() |
| imported_by | uuid | REFERENCES users(id) |
| files_imported | integer | NOT NULL |
| created_at | timestamptz | NOT NULL, DEFAULT now() |

## 2. Relacje między tabelami
- **users** 1--N **peers** (owner_id)
- **users** 1--N **audit_log** (actor_id)
- **users** 1--N **user_limit_history**
- **users** 1--N **password_reset_tokens**
- **users** N--M **roles** (via **user_roles**)
- **import_batches** 1--N **peers** *(future reference: peers.import_batch_id FK)*

## 3. Indeksy
| Tabela | Kolumny | Typ indeksu |
|--------|---------|-------------|
| audit_log | (event_type, created_at) | btree |
| audit_log | (actor_id, created_at DESC) | btree |
| peers | (owner_id, status) | btree |
| peers | (status, imported_at) | btree |
| peers | USING gin (friendly_name gin_trgm_ops) | pg_trgm |
| users | (email) UNIQUE | btree |
| user_limit_history | (user_id, changed_at DESC) | btree |

## 4. Zasady PostgreSQL (RLS)
Wszystkie tabele w schemacie `app` działają w trybie *deny by default*.

### 4.1 peers
```sql
ALTER TABLE app.peers ENABLE ROW LEVEL SECURITY;

-- Właściciel lub admin może czytać
CREATE POLICY peers_owner_read ON app.peers
  FOR SELECT USING (
    current_setting('request.jwt.claims', true)::jsonb ->> 'role' = 'admin'
    OR owner_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')::uuid
  );

-- Właściciel może aktualizować friendly_name / status=inactive (revoke)
CREATE POLICY peers_owner_update ON app.peers
  FOR UPDATE USING (
    owner_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')::uuid
  ) WITH CHECK (
    status IN ('inactive') OR friendly_name IS NOT NULL
  );

-- Admin pełny dostęp
CREATE POLICY peers_admin_all ON app.peers
  FOR ALL USING (
    current_setting('request.jwt.claims', true)::jsonb ->> 'role' = 'admin'
  );
```

Analogiczne polityki dla `audit_log` (tylko własne rekordy lub admin), `config_kv` (admin only) oraz `accepted_domains` (admin only).

## 5. Dodatkowe uwagi
- **ENUMs**:
  - `user_status_enum` = ('active','inactive')
  - `peer_status_enum` = ('available','active','inactive')
  - `audit_event_enum` = ('LOGIN','PEER_CLAIM','PEER_ASSIGN','PEER_DOWNLOAD','PEER_REVOKE','RESET_PASSWORD','LIMIT_CHANGE','USER_DEACTIVATE','IMPORT')
  - *Rola użytkownika wynika z relacji w tabeli user_roles/roles; brak osobnego pola w users.*
- Wszystkie znaczniki czasu przechowywane w UTC (timestamptz).
- Triggery aktualizują `updated_at` na każdej modyfikacji.
- Funkcja importu peerów używa `SELECT ... ORDER BY imported_at LIMIT 1 FOR UPDATE SKIP LOCKED` aby zapewnić FIFO i brak konfliktów.
- Rozszerzenia wymagane: `uuid-ossp`, `pgcrypto`, `pg_trgm`, `pg_stat_statements` (do monitoringu).
- Nazewnictwo obiektów: snake_case, `table_columns_type` dla constraintów i indeksów.
