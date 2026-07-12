# API Reference

Base URL: `http://localhost:4000` (configurable via `PORT`). All application routes are mounted
under `/api`. CORS allows the client origin (`CLIENT_ORIGIN`, default `http://localhost:5173`).

## Response envelope

Defined in [`server/src/lib/http.ts`](../server/src/lib/http.ts):

- **Success** — `{ "data": <payload> }`, with an appropriate `2xx` status.
- **Failure** — `{ "error": "<message>", ...extra }`, with a `4xx`/`5xx` status. The `extra`
  fields let a handler expose conflict context (e.g. the current holder of an asset, or an
  overlapping booking slot) alongside the error message.

## Authentication

JWTs are issued on signup and login and sent by the client as `Authorization: Bearer <token>`.
Protected routes run through the `requireAuth` middleware.

### `GET /health`

Liveness check (not under `/api`).

```json
{ "data": { "ok": true, "service": "assetflow-api" } }
```

### `POST /api/auth/signup`

Creates a new account. New accounts are **always** created as `EMPLOYEE`; roles are assigned
later by an admin.

Request:

```json
{ "name": "Priya Shah", "email": "priya@acme.com", "password": "secret123" }
```

Success (`201`):

```json
{ "data": { "token": "<jwt>", "user": { "id": "...", "name": "Priya Shah", "email": "priya@acme.com", "role": "EMPLOYEE", "status": "ACTIVE", "departmentId": null } } }
```

Failures:

| Status | When |
|--------|------|
| `400` | Invalid body (Zod validation) — `error` plus `issues` |
| `409` | An account with this email already exists |

### `POST /api/auth/login`

Request:

```json
{ "email": "priya@acme.com", "password": "secret123" }
```

Success (`200`): same shape as signup (`token` + public `user`).

Failures:

| Status | When |
|--------|------|
| `400` | Invalid body |
| `401` | Invalid email or password |
| `403` | Account is inactive (`status !== "ACTIVE"`) |

### `GET /api/auth/me`

Returns the authenticated user. Requires `requireAuth`.

Success (`200`):

```json
{ "data": { "user": { "id": "...", "name": "Priya Shah", "email": "priya@acme.com", "role": "EMPLOYEE", "status": "ACTIVE", "departmentId": null } } }
```

Failures:

| Status | When |
|--------|------|
| `401` | Missing / invalid token |
| `404` | User not found |

> The password hash is never returned — responses select only public user fields
> (`id`, `name`, `email`, `role`, `status`, `departmentId`).

## Conventions for new endpoints

- Mount route modules under `/api/<resource>` in `server/src/index.ts`.
- Use `ok(res, data, status?)` and `fail(res, status, error, extra?)` from `lib/http.ts` so the
  envelope stays consistent.
- Validate request bodies with Zod and return `400` with the parse `issues` on failure.
- Guard protected routes with `requireAuth`, and role-restricted routes with the role middleware.
