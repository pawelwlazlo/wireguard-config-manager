# WireGuard Configuration Manager – Database Schema

## 1. Tables, Columns, and Constraints

### 1.1 users

Table managed by Supabase Auth

| Column | Type | Constraints | Description |
|--------|-----|-------------|-------------|
| id | uuid | PRIMARY KEY, NOT NULL, DEFAULT uuid_generate_v4() | Primary key (matches auth.users.id) |
| email | text | UNIQUE, NOT NULL, CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$') | User email address |
| status | user_status_enum | NOT NULL, DEFAULT 'active' | Account status |
| peer_limit | integer | NOT NULL, DEFAULT (SELECT value::int FROM config_kv WHERE key = 'default_peer_limit') | Peer limit |
| created_at | timestamptz | NOT NULL, DEFAULT now() | Creation timestamp |
| updated_at | timestamptz | NOT NULL, DEFAULT now() | Update timestamp |

### 1.2 roles *(ENUM dictionary replaced – table maintained for permission flexibility)*
| Column | Type | Constraints | Description |
|--------|-----|-------------|-------------|
| id | serial | PRIMARY KEY | |
| name | text | UNIQUE, NOT NULL | 'admin', 'user', additional roles |

### 1.3 user_roles *(N:M users-roles for extensibility)*
| Column | Type | Constraints |
|--------|-----|-------------|
| user_id | uuid | PRIMARY KEY, REFERENCES users(id) ON DELETE CASCADE |
| role_id | integer | PRIMARY KEY, REFERENCES roles(id) ON DELETE CASCADE |
| granted_at | timestamptz | NOT NULL, DEFAULT now() |

### 1.4 peers
| Column | Type | Constraints | Description |
|--------|-----|-------------|-------------|
| id | uuid | PRIMARY KEY, NOT NULL, DEFAULT uuid_generate_v4() |
| public_key | text | UNIQUE, NOT NULL |
| owner_id | uuid | REFERENCES users(id) ON DELETE RESTRICT | Owner (can be NULL for status = 'available') |
| status | peer_status_enum | NOT NULL, DEFAULT 'available' | Availability status |
| friendly_name | varchar(63) | UNIQUE(owner_id, friendly_name), CHECK (friendly_name ~ '^[a-z0-9-]+$') | User-assigned name |
| config_ciphertext | bytea | NOT NULL | Encrypted configuration blob |
| imported_at | timestamptz | NOT NULL |
| claimed_at | timestamptz | NULL |
| revoked_at | timestamptz | NULL |
| created_at | timestamptz | NOT NULL, DEFAULT now() |
| updated_at | timestamptz | NOT NULL, DEFAULT now() |

### 1.5 audit_log
| Column | Type | Constraints | Description |
|--------|-----|-------------|-------------|
| id | bigserial | PRIMARY KEY |
| event_type | audit_event_enum | NOT NULL |
| actor_id | uuid | REFERENCES users(id) ON DELETE SET NULL |
| subject_table | text | NOT NULL |
| subject_id | uuid | NULL |
| metadata | jsonb | NOT NULL, DEFAULT '{}' | Event details |
| created_at | timestamptz | NOT NULL, DEFAULT now() |

### 1.6 accepted_domains
| Column | Type | Constraints |
|--------|-----|-------------|
| domain | text | PRIMARY KEY | 'example.com', '*.corp', etc. |
| created_at | timestamptz | NOT NULL, DEFAULT now() |

### 1.7 config_kv *(simple key-value configuration)*
| Column | Type | Constraints |
|--------|-----|-------------|
| key | text | PRIMARY KEY |
| value | text | NOT NULL |
| updated_at | timestamptz | NOT NULL, DEFAULT now() |

### 1.8 user_limit_history
| Column | Type | Constraints |
|--------|-----|-------------|
| id | bigserial | PRIMARY KEY |
| user_id | uuid | REFERENCES users(id) ON DELETE CASCADE |
| old_limit | integer | NOT NULL |
| new_limit | integer | NOT NULL |
| changed_by | uuid | REFERENCES users(id) | NULL when changed by system |
| changed_at | timestamptz | NOT NULL, DEFAULT now() |

### 1.9 password_reset_tokens
| Column | Type | Constraints |
|--------|-----|-------------|
| token | uuid | PRIMARY KEY |
| user_id | uuid | REFERENCES users(id) ON DELETE CASCADE |
| expires_at | timestamptz | NOT NULL |
| revoked_at | timestamptz | NULL |
| created_at | timestamptz | NOT NULL, DEFAULT now() |

### 1.10 import_batches *(optional for reporting)*
| Column | Type | Constraints |
|--------|-----|-------------|
| id | uuid | PRIMARY KEY, DEFAULT uuid_generate_v4() |
| imported_by | uuid | REFERENCES users(id) |
| files_imported | integer | NOT NULL |
| created_at | timestamptz | NOT NULL, DEFAULT now() |

## 2. Table Relationships
- **users** 1--N **peers** (owner_id)
- **users** 1--N **audit_log** (actor_id)
- **users** 1--N **user_limit_history**
- **users** 1--N **password_reset_tokens**
- **users** N--M **roles** (via **user_roles**)
- **import_batches** 1--N **peers** *(future reference: peers.import_batch_id FK)*

## 3. Indexes
| Table | Columns | Index Type |
|-------|---------|------------|
| audit_log | (event_type, created_at) | btree |
| audit_log | (actor_id, created_at DESC) | btree |
| peers | (owner_id, status) | btree |
| peers | (status, imported_at) | btree |
| peers | USING gin (friendly_name gin_trgm_ops) | pg_trgm |
| users | (email) UNIQUE | btree |
| user_limit_history | (user_id, changed_at DESC) | btree |

## 4. PostgreSQL Row Level Security (RLS) Policies
All tables in the `app` schema operate in *deny by default* mode.

### 4.1 peers
```sql
ALTER TABLE app.peers ENABLE ROW LEVEL SECURITY;

-- Owner or admin can read
CREATE POLICY peers_owner_read ON app.peers
  FOR SELECT USING (
    current_setting('request.jwt.claims', true)::jsonb ->> 'role' = 'admin'
    OR owner_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')::uuid
  );

-- Owner can update friendly_name / status=inactive (revoke)
CREATE POLICY peers_owner_update ON app.peers
  FOR UPDATE USING (
    owner_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')::uuid
  ) WITH CHECK (
    status IN ('inactive') OR friendly_name IS NOT NULL
  );

-- Admin has full access
CREATE POLICY peers_admin_all ON app.peers
  FOR ALL USING (
    current_setting('request.jwt.claims', true)::jsonb ->> 'role' = 'admin'
  );
```

Similar policies for `audit_log` (own records or admin only), `config_kv` (admin only), and `accepted_domains` (admin only).

## 5. Additional Notes
- **ENUMs**:
  - `user_status_enum` = ('active','inactive')
  - `peer_status_enum` = ('available','active','inactive')
  - `audit_event_enum` = ('LOGIN','PEER_CLAIM','PEER_ASSIGN','PEER_DOWNLOAD','PEER_REVOKE','RESET_PASSWORD','LIMIT_CHANGE','USER_DEACTIVATE','IMPORT')
  - *User role is determined by the relationship in user_roles/roles tables; no separate field in users.*
- All timestamps stored in UTC (timestamptz).
- Triggers update `updated_at` on every modification.
- Peer import function uses `SELECT ... ORDER BY imported_at LIMIT 1 FOR UPDATE SKIP LOCKED` to ensure FIFO and prevent conflicts.
- Required extensions: `uuid-ossp`, `pgcrypto`, `pg_trgm`, `pg_stat_statements` (for monitoring).
- Naming convention: snake_case, `table_columns_type` for constraints and indexes.
