# Deploy — La Polla Mundialista 2026

Stack: Railway (API + Postgres) · Vercel (Web)

---

## Arquitectura

```
Railway Postgres  ←→  Railway (NestJS API)  ←→  Vercel (Next.js Web)
```

---

## Fase 2 — Railway Postgres

1. En Railway → New Project → Add PostgreSQL
2. Desde la tab **Variables** del servicio Postgres, copia `DATABASE_URL`
3. Guárdala — la usarás en el servicio de la API

No se necesita `DIRECT_URL`. Railway Postgres no usa pgBouncer.

---

## Fase 3 — Railway API (NestJS)

### Conectar repo

1. New Service → GitHub repo → selecciona este repositorio
2. Root Directory: `/` (raíz del monorepo)

### Build Command

```
pnpm install --frozen-lockfile && pnpm --filter @quinela/db db:generate && pnpm --filter @quinela/api build
```

### Start Command

```
pnpm --filter @quinela/db migrate:deploy && node apps/api/dist/main.js
```

### Variables de entorno en Railway

| Variable | Valor |
|---|---|
| `NODE_ENV` | `production` |
| `PORT` | `4000` (Railway también inyecta `$PORT`, el código lo usa) |
| `DATABASE_URL` | Copiar de Railway Postgres → Variables |
| `JWT_SECRET` | Generar: `openssl rand -base64 48` |
| `JWT_EXPIRES_IN` | `7d` |
| `WEB_CORS_ORIGINS` | URL de Vercel, ej: `https://quinela.vercel.app` |
| `API_PREFIX` | `api` |

> `ADMIN_EMAIL`, `ADMIN_PASSWORD` y `ADMIN_DISPLAY_NAME` NO van como variables de Railway runtime.
> Solo se usan al correr el seed de producción manualmente (ver Fase 3b).

### Health check

Railway puede usar `GET /health` como health check URL.
Responde `{ status: "ok" }` sin autenticación.

---

## Fase 3b — Seed de producción (manual, una sola vez)

Desde Railway CLI o la terminal del servicio API, con las vars de entorno ya configuradas:

```bash
# En Railway shell o localmente con DATABASE_URL de producción:
ADMIN_EMAIL="admin@tudominio.com" \
ADMIN_PASSWORD="una_contraseña_fuerte_min_12" \
ADMIN_DISPLAY_NAME="Admin" \
DATABASE_URL="postgresql://..." \
pnpm --filter @quinela/db db:seed:prod
```

O desde local (con la DATABASE_URL de Railway):

```bash
cd packages/db
DATABASE_URL="postgresql://..." \
ADMIN_EMAIL="admin@tudominio.com" \
ADMIN_PASSWORD="una_contraseña_fuerte_min_12" \
ADMIN_DISPLAY_NAME="Admin" \
pnpm db:seed:prod
```

El seed es **idempotente** — puede correrse múltiples veces sin duplicar datos ni borrar predicciones.

### Qué crea el seed de producción

- Torneo FIFA World Cup 2026 (104 partidos, 12 grupos, 48 equipos)
- Pool principal `world-cup-2026-main`
- Un usuario SUPER_ADMIN con las credenciales provistas

### Qué NO hace

- No crea usuarios demo (Ana, Leo)
- No borra datos existentes
- No resetea predicciones ni scoring

---

## Fase 4 — Vercel (Next.js Web)

### Conectar repo

1. New Project → GitHub repo
2. **Framework Preset**: Next.js (auto-detectado)
3. **Root Directory**: `apps/web`

Vercel detecta `pnpm-workspace.yaml` y resuelve `@quinela/types` automáticamente.

### Build Command (dejar default o usar)

```
pnpm --filter @quinela/web build
```

### Variables de entorno en Vercel

| Variable | Valor |
|---|---|
| `NEXT_PUBLIC_API_URL` | `https://tu-api.up.railway.app/api` |
| `NEXT_PUBLIC_APP_NAME` | `La Polla Mundialista 2026` |

---

## Fase 5 — QA post-deploy

- [ ] `GET https://tu-api.up.railway.app/health` → `{ status: "ok" }`
- [ ] Register en la web → usuario creado y unido a pool principal
- [ ] Login con usuario registrado
- [ ] Ver predicciones del torneo
- [ ] Login con SUPER_ADMIN → acceso a /admin
- [ ] Admin: ver torneos, pools, partidos
- [ ] Admin: editar score de un partido
- [ ] Admin: recalcular scoring de pool

---

## Comandos de referencia rápida

```bash
# Generar Prisma Client (local y Railway build)
pnpm --filter @quinela/db db:generate

# Aplicar migrations en producción
pnpm --filter @quinela/db migrate:deploy

# Seed de producción (manual, una vez)
pnpm --filter @quinela/db db:seed:prod

# Seed de desarrollo (local)
pnpm db:seed

# Build API
pnpm --filter @quinela/api build

# Build Web
pnpm --filter @quinela/web build
```

---

## Seguridad

- `JWT_SECRET`: mínimo 32 chars. Generar con `openssl rand -base64 48`
- `ADMIN_PASSWORD`: mínimo 12 chars. No reutilizar contraseñas.
- `WEB_CORS_ORIGINS`: solo dominios exactos de producción, sin wildcards.
- Los archivos `.env` están en `.gitignore`. Nunca commitear secretos.
