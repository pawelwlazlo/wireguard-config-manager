# API Implementation Guide - Lessons Learned

Ten dokument zawiera kluczowe wnioski i wzorce z implementacji endpointów grupy Peers.

## 1. Struktura projektu

### Serwisy (`/src/lib/services/`)
- **Zawsze** wydzielaj logikę biznesową do serwisów
- Serwisy przyjmują `SupabaseClient` jako pierwszy parametr
- Funkcje serwisowe rzucają wyjątkami z named error codes (np. `throw new Error("LimitExceeded")`)
- Handler endpointa łapie te wyjątki i mapuje na odpowiednie kody HTTP

**Przykład:**
```typescript
// ✅ Serwis
export async function claimNextPeer(
  supabase: SupabaseClient,
  userId: string
): Promise<PeerDto> {
  if (activeCount >= userData.peer_limit) {
    throw new Error("LimitExceeded");
  }
  // ...
}

// ✅ Endpoint handler
try {
  const peer = await claimNextPeer(locals.supabase, userId);
  return new Response(JSON.stringify(peer), { status: 200 });
} catch (error) {
  if (error.message === "LimitExceeded") {
    return new Response(JSON.stringify({ error: "LimitExceeded" }), { status: 400 });
  }
}
```

## 2. Supabase z schematem `app`

### Problem
Projekt używa schematu `app` zamiast domyślnego `public`. Bez tego wszystkie zapytania zwracają błędy typu `"peers" is not assignable to type 'never'`.

### Rozwiązanie
**ZAWSZE** dodawaj `.schema("app")` do zapytań Supabase:

```typescript
// ❌ ZŁE
const { data } = await supabase
  .from("peers")
  .select("*");

// ✅ DOBRE
const { data } = await supabase
  .schema("app")
  .from("peers")
  .select("*");
```

### Typy
Export typu `SupabaseClient` z właściwą definicją:

```typescript
// src/db/supabase.client.ts
import type { SupabaseClient as SupabaseClientType } from '@supabase/supabase-js';
import type { Database } from './database.types';

export const supabaseClient = createClient<Database>(supabaseUrl, supabaseAnonKey);

export type SupabaseClient = SupabaseClientType<Database>;
```

## 3. Zod 4 - Walidacja

### ⚠️ WAŻNE: Używamy Zod 4!

Projekt używa **Zod 4** (nie 3.x), który ma inne API dla formatów stringów.

### UUID Validation
```typescript
// ❌ ZŁE (Zod 3, deprecated w Zod 4)
z.string().uuid()
z.string().email()
z.string().url()

// ✅ DOBRE (Zod 4)
z.uuid()
z.email()
z.url()
```

### Pełna lista zmian Zod 3→4
- `z.string().uuid()` → `z.uuid()`
- `z.string().email()` → `z.email()`
- `z.string().url()` → `z.url()`
- `z.string().emoji()` → `z.emoji()`
- `z.string().cuid()` → `z.cuid()`
- `z.string().cuid2()` → `z.cuid2()`
- `z.string().ulid()` → `z.ulid()`

### Schematy walidacji
Definiuj schematy na poziomie pliku, przed handlerami:

```typescript
const IdParamSchema = z.uuid();

const QuerySchema = z.object({
  status: z.enum(["available", "active", "inactive"]).optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  size: z.coerce.number().int().min(1).max(100).optional().default(20),
});
```

## 4. Struktura Endpointów Astro

### Lokalizacja plików
- User endpoints: `/src/pages/api/v1/resource/`
- Admin endpoints: `/src/pages/api/v1/admin/resource/`
- Parametry dynamiczne: `[id].ts` lub `[id]/action.ts`

### Szablon endpointa
```typescript
/**
 * METHOD /api/v1/resource/action
 * Description of endpoint
 */

import type { APIRoute } from "astro";
import { z } from "zod";
import { serviceFunction } from "@/lib/services/serviceName";

export const prerender = false; // ⚠️ ZAWSZE dla API endpoints!

// Schematy walidacji
const ParamSchema = z.uuid();
const BodySchema = z.object({
  field: z.string(),
});

export const METHOD: APIRoute = async ({ params, request, url, locals }) => {
  try {
    // 1. Walidacja parametrów
    const paramResult = ParamSchema.safeParse(params.id);
    if (!paramResult.success) {
      return new Response(
        JSON.stringify({
          error: "ValidationError",
          message: "Invalid parameter",
          details: paramResult.error.format(),
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 2. Wywołanie serwisu
    const result = await serviceFunction(locals.supabase, paramResult.data);

    // 3. Zwrot odpowiedzi
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);

    // 4. Obsługa specific errors
    if (error instanceof Error) {
      if (error.message === "NotFound") {
        return new Response(
          JSON.stringify({ error: "NotFound", message: "Not found" }),
          { status: 404, headers: { "Content-Type": "application/json" } }
        );
      }
    }

    // 5. Generic error
    return new Response(
      JSON.stringify({ error: "InternalError", message: "Failed" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
```

## 5. Typy i DTO

### Definicja w `/src/types.ts`
```typescript
export interface PeerDto
  extends Pick<PeerRow, "id" | "public_key" | "status" | "friendly_name" | "claimed_at" | "revoked_at"> {}

export interface Page<T> {
  items: T[];
  page: number;
  size: number;
  total: number;
}
```

### Mapowanie w serwisie
```typescript
type PeerRow = Tables<{ schema: "app" }, "peers">;

function mapToPeerDto(row: Pick<PeerRow, "id" | "public_key" | ...>): PeerDto {
  return {
    id: row.id,
    public_key: row.public_key,
    // ...
  };
}
```

## 6. Obsługa błędów - Named Error Codes

### Standard Error Codes
- `ValidationError` - 400 (błędne dane wejściowe)
- `Unauthorized` - 401 (brak autentykacji)
- `Forbidden` - 403 (brak uprawnień)
- `NotFound` - 404 (zasób nie istnieje)
- `DuplicateName` - 409 (konflikt unikalności)
- `LimitExceeded` - 400 (przekroczono limit)
- `NoAvailable` - 404 (brak dostępnych zasobów)
- `InternalError` - 500 (błąd serwera)

### Pattern
```typescript
// Serwis rzuca named errors
throw new Error("LimitExceeded");

// Handler mapuje na HTTP
if (error.message === "LimitExceeded") {
  return new Response(
    JSON.stringify({
      error: "LimitExceeded",
      message: "User friendly message",
    }),
    { status: 400, headers: { "Content-Type": "application/json" } }
  );
}
```

## 7. Paginacja

### Standard
```typescript
const QuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  size: z.coerce.number().int().min(1).max(100).optional().default(20),
});

// W serwisie
const page = options.page || 1;
const size = Math.min(options.size || 20, 100);
const offset = (page - 1) * size;

const query = supabase
  .schema("app")
  .from("table")
  .select("*", { count: "exact" })
  .range(offset, offset + size - 1);

return {
  items: data || [],
  total: count || 0,
  page,
  size,
};
```

## 8. Bezpieczeństwo i RLS

### Row Level Security
- **NIE implementuj** sprawdzania uprawnień w kodzie aplikacji
- Polegaj na RLS policies w bazie danych
- Jeśli query nie zwraca danych → 404 NotFound
- RLS automatycznie filtruje dostęp

### TODOs dla autoryzacji
Zostaw TODOs dla przyszłej implementacji auth:

```typescript
// TODO: Check if user is authenticated (when auth is implemented)
// if (!locals.user) {
//   return unauthorized();
// }

// TODO: Check if user is admin (when auth is implemented)
// if (!locals.user || !isAdmin(locals.user)) {
//   return forbidden("Admin access required");
// }
```

### Mock User ID
Dla testowania używaj placeholder:
```typescript
// TODO: Replace with locals.user?.id when auth is implemented
const mockUserId = "00000000-0000-0000-0000-000000000000";
```

## 9. Metody HTTP w Astro

### Nazwy uppercase
```typescript
export const GET: APIRoute = async ({ ... }) => {};
export const POST: APIRoute = async ({ ... }) => {};
export const PATCH: APIRoute = async ({ ... }) => {};
export const DELETE: APIRoute = async ({ ... }) => {};
```

### Jeden plik, wiele metod
Możesz eksportować wiele metod z jednego pliku:
```typescript
// /api/v1/peers/[id].ts
export const GET: APIRoute = async ({ params, locals }) => { /* ... */ };
export const PATCH: APIRoute = async ({ params, request, locals }) => { /* ... */ };
export const DELETE: APIRoute = async ({ params, locals }) => { /* ... */ };
```

## 10. Locals (Context)

### Definicja typów w `env.d.ts`
```typescript
/// <reference types="astro/client" />

declare namespace App {
  interface Locals {
    supabase: import("./db/supabase.client").SupabaseClient;
    // user: import("./lib/auth").AuthUser; // dodaj gdy auth będzie gotowa
  }
}
```

### Użycie w endpointach
```typescript
export const GET: APIRoute = async ({ locals }) => {
  const { data } = await locals.supabase
    .schema("app")
    .from("table")
    .select("*");
};
```

## 11. Response Headers

### JSON Response
```typescript
return new Response(JSON.stringify(data), {
  status: 200,
  headers: { "Content-Type": "application/json" },
});
```

### File Download
```typescript
return new Response(fileContent, {
  status: 200,
  headers: {
    "Content-Type": "text/plain; charset=utf-8",
    "Content-Disposition": `attachment; filename="${filename}"`,
    "Content-Security-Policy": "default-src 'none';",
    "X-Content-Type-Options": "nosniff",
  },
});
```

### No Content
```typescript
return new Response(null, { status: 204 });
```

## 12. Checklist implementacji endpointa

- [ ] Dodaj funkcję do odpowiedniego serwisu w `/src/lib/services/`
- [ ] Zdefiniuj named error codes (np. "NotFound", "LimitExceeded")
- [ ] Utwórz plik endpointa w `/src/pages/api/v1/`
- [ ] Dodaj `export const prerender = false`
- [ ] Zdefiniuj schematy walidacji Zod (używaj Zod 4 API!)
- [ ] Implementuj handler z metodą HTTP (GET, POST, PATCH, DELETE)
- [ ] Waliduj parametry/body używając `safeParse()`
- [ ] ZAWSZE używaj `.schema("app")` w zapytaniach Supabase
- [ ] Mapuj błędy serwisu na odpowiednie kody HTTP
- [ ] Zostaw TODOs dla autoryzacji
- [ ] Sprawdź linter: `read_lints`
- [ ] Oznacz zadanie jako completed w TODO list

## 13. Najczęstsze błędy i rozwiązania

### Błąd: `"peers" is not assignable to type 'never'`
**Rozwiązanie:** Dodaj `.schema("app")` do query

### Błąd: `Property 'supabase' does not exist on type 'Locals'`
**Rozwiązanie:** Zaktualizuj `src/env.d.ts` z definicją `App.Locals`

### Błąd: Zod deprecation warning dla `.uuid()`
**Rozwiązanie:** Używaj `z.uuid()` zamiast `z.string().uuid()` (Zod 4)

### Błąd: Triple slash reference warning
**Rozwiązanie:** Usuń `/// <reference path="../.astro/types.d.ts" />` z `env.d.ts`

## 14. Dobre praktyki

1. **Early returns** - najpierw obsłuż błędy, happy path na końcu
2. **Consistent error format** - zawsze `{ error: string, message: string }`
3. **Descriptive TODOs** - jasno opisuj co trzeba dodać w przyszłości
4. **Type safety** - nigdy nie używaj `any`, definiuj proper typy
5. **Guard clauses** - waliduj na początku funkcji
6. **Named constants** - np. `const DEFAULT_PAGE_SIZE = 20`
7. **DRY** - wspólną logikę wynoś do helpersów
8. **Console.error** - zawsze loguj błędy w catch blocks
9. **Transakcje** - dla operacji FIFO używaj transakcji z `FOR UPDATE`
10. **Atomicity** - jedna operacja = jedna odpowiedzialność

---

**Data utworzenia:** 2025-11-15  
**Wersje:** Astro 5.14.1, Zod 4.x, Supabase 2.80.0  
**Status:** ✅ Zweryfikowane podczas implementacji 9 endpointów Peers

