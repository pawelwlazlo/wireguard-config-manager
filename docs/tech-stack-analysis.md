# Tech-Stack Analysis vs. PRD

This document critically evaluates the proposed stack—Astro 5 + React 19 + Tailwind 4 + shadcn/ui on the front-end, Supabase on the back-end, and GitHub Actions + Docker + VPS for CI/CD & hosting—against the product requirements in **docs/prd.md**.

---

## 1. Will the technology allow us to quickly deliver an MVP?

**Pros**

* **Astro 5**: File-based routing and zero-JS-by-default pages accelerate static content delivery.  
* **React 19 islands**: Add interactivity only where required (login, tables, dialogs).  
* **shadcn/ui**: Pre-built accessible components map well to PRD user stories (tables, modals, forms).  
* **Supabase**: Out-of-the-box email/password auth, role policies, and a managed Postgres DB cover roughly half of the functional stories (US-001 → US-006, US-014 → US-016).  
* **CI/CD template**: GitHub Actions → Docker → VPS is easy to scaffold.

**Cautions**

* WireGuard file operations (import, download, revoke) **must touch the VPS filesystem**; Supabase Storage cannot mount local directories. You’ll need a Node process or Astro API routes with elevated permissions—extra integration time.  
* Supabase’s JS client is browser-oriented; secure server operations require a **service-role key** or PostgREST calls, adding setup overhead.

**Verdict**: Still faster than hand-building auth/DB, but budget 1-2 weeks for the file-system bridge.

---

## 2. Will the solution scale as the project grows?

* **Frontend**: Astro islands keep JS payloads small; React 19’s off-main-thread rendering (when stable) mitigates UI thread bottlenecks.  
* **Backend**: Supabase/Postgres scales to hundreds of QPS—well above expected admin traffic. The main bottleneck moves to disk I/O for bulk imports/downloads on a single VPS; horizontal scaling later requires shared storage (e.g., S3) and stateless containers.

---

## 3. Will maintenance and development costs be acceptable?

* Infra cost: Supabase free tier (or self-hosted) + one VPS ≈ \$30/mo.  
* Talent pool: Astro, React, Tailwind have large communities.  
* **Maintenance seam**: Every import/revoke spans SQL **and** filesystem moves—permanent complexity and extra test coverage.

---

## 4. Do we need such a complex solution?

The stack is **moderately complex**:

* **Why it might be justified**: Supabase provides polished dashboards, RLS, and future realtime features.  
* **Why it might not**: You effectively run *two* back-ends (Supabase + Node process) for a single-purpose admin tool.

---

## 5. Simpler alternative

**Node (Fastify) + SQLite** on the same VPS:

* Auth via `passport` or `lucia` (≈150 LOC).  
* Transactions that move files and update SQL are truly atomic.  
* Removes service-role keys and Postgres container.  
* Keeps Astro + React + Tailwind UI intact.

Trade-off: You lose Supabase dashboards/RLS but gain simpler ops and deployments.

---

## 6. Security considerations

| Aspect | Supabase path | Node/SQLite path |
|--------|---------------|------------------|
| Auth & RLS | Built-in, battle-tested | DIY but straightforward |
| Secrets | Service-role key on VPS (critical if leaked) | All secrets local; smaller surface |
| File downloads | Must proxy through VPS; token must check `peer.owner` | Same, but no cross-service creds |

Both approaches can be hardened with HTTPS, OWASP headers, 2FA for admins; the dual-backend approach simply has more moving parts.

---

## Recommendation

* **If Supabase features (RLS, dashboards, future realtime) are valued**, keep the proposed stack but allocate extra time for filesystem integration and key management.  
* **If speed and long-term simplicity are paramount**, adopt a single-process Node + SQLite backend while retaining the current Astro + React + Tailwind front-end and the Docker-based deployment pipeline.

Either path satisfies all PRD requirements; the choice hinges on your tolerance for operational complexity versus the conveniences Supabase provides.