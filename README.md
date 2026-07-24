# Quiniela Mundial 2026

Quiniela/polla web para predecir el Mundial FIFA 2026: marcador de cada partido, preguntas bonus por partido, y predicciones de torneo completo (campeón, goleador, etc.). Resuelve un problema puntual: competir con amigos prediciendo resultados con un leaderboard y reglas de puntaje propias, sin depender de una app genérica de quinielas que no controlas.

**Demo en vivo:** https://quinela-papeles-web.vercel.app

[CAPTURA: dashboard "Mi Quiniela" con próximos partidos y predicciones]

---

## Estado del producto

Es un producto propio, desplegado y en uso activo (~50 usuarios este mes durante la fase de grupos). No es un tutorial ni un boilerplate — lo construí para resolver la quiniela de un grupo real, y sigue en desarrollo mientras avanza el torneo.

Lo que está implementado y funcionando hoy:

- **Auth completo**: registro, login con JWT, y recuperación de contraseña de punta a punta (token de un solo uso, expiración de 60 min, invalidación de tokens anteriores, envío de email vía Resend).
- **Modelo de torneo**: equipos, grupos, partidos (soporta partidos de grupo y slots de knockout tipo `W73`/`L101` antes de que se definan los equipos), venues, roles de sistema (`USER` / `ADMIN` / `SUPER_ADMIN`).
- **Predicciones por partido**: marcador exacto, con un motor de scoring que separa puntos por resultado exacto, diferencia de gol, ganador/perdedor, goles de local, goles de visita y total de goles.
- **Predicciones de torneo completo**: campeón, subcampeón, tercer lugar, goleador, balón de oro, guante de oro y "mejores terceros" de la fase de grupos.
- **Sistema de joker**: cada participante puede marcar un partido para duplicar los puntos que gane en él (marcador + bonus).
- **Preguntas bonus por partido**: 5 tipos (`BOOLEAN`, `SINGLE_CHOICE`, `TEAM_PICK`, `PLAYER_PICK`, `TIME_RANGE`), con catálogo de jugadores por torneo y validación de que las opciones de tipo jugador no lleguen con payloads ambiguos.
- **Scoring configurable por pool**: cada pool define sus propios puntos por categoría (no hay una tabla de puntos fija hardcodeada).
- **Recálculo de leaderboard**: idempotente, corre bajo demanda desde el panel admin.
- **Panel de administración**: gestión de torneos, pools, partidos, resultados oficiales, preguntas bonus y resolución, y recálculo de scoring.

[CAPTURA: leaderboard de la pool principal]

---

## Decisiones técnicas

**El recálculo de leaderboard es idempotente, no incremental.** Ante cada resultado o corrección de puntaje, se recalculan desde cero los puntos de todas las predicciones afectadas (no se suman deltas). Es más lento, pero elimina una clase entera de bugs de "drift" cuando un admin corrige un resultado después de que ya se había marcado como scoreado — no hay estado acumulado que pueda desincronizarse.

**`pointsConfig` es JSON configurable por pool, no una tabla de puntos fija.** El torneo tiene una sola pool principal hoy, pero el modelo de puntaje (exacto, diferencia de gol, ganador, goles de local/visita, etc.) vive en un JSON por pool con fallback a columnas legacy y defaults razonables. Permitió iterar las reglas de puntaje sin migraciones mientras el grupo de amigos las estaba ajustando.

**"Mejores terceros" se resuelve por umbral de aciertos, no por comparación exacta de conjunto.** El Mundial 2026 clasifica a los 8 mejores terceros de 12 grupos: en vez de exigir que el usuario acierte el conjunto exacto, se cuentan aciertos (hits) contra el resultado real y se otorgan puntos parciales a partir de 4 aciertos y el máximo a partir de 8 — refleja mejor la dificultad real de la predicción que un todo-o-nada.

---

## Stack

- Monorepo con `pnpm`
- `apps/web`: Next.js (App Router) + TypeScript + Tailwind + shadcn/ui
- `apps/api`: NestJS + TypeScript
- `packages/db`: Prisma + PostgreSQL (schema, migraciones, seeds)
- `packages/types`: tipos y contratos compartidos
- Deploy: Railway (API + Postgres) · Vercel (Web)

---

## Cómo correrlo en local

### Requisitos

- Node.js 20+
- pnpm 10+
- Docker + Docker Compose

### Variables de entorno

1. Copia estos archivos:
   - `.env.example` -> `.env`
   - `apps/web/.env.example` -> `apps/web/.env.local`
   - `apps/api/.env.example` -> `apps/api/.env`
   - `packages/db/.env.example` -> `packages/db/.env`

2. Variables clave de base de datos local:
   - `POSTGRES_USER`
   - `POSTGRES_PASSWORD`
   - `POSTGRES_DB`
   - `POSTGRES_PORT`
   - `DATABASE_URL`

Puerto por defecto del host local: `5270` (mapeado a `5432` dentro del contenedor).

### Instalar dependencias

```bash
pnpm install
```

Si `pnpm` bloquea scripts postinstall (Prisma, sharp, etc):

```bash
pnpm approve-builds
```

### Base de datos local con Docker

Levantar PostgreSQL:

```bash
pnpm db:up
```

Ver logs:

```bash
pnpm db:logs
```

Bajar contenedor y red:

```bash
pnpm db:down
```

El volumen persistente es `quinela_postgres_data`.

### Desarrollo

Levantar web + api en paralelo:

```bash
pnpm dev
```

Solo web:

```bash
pnpm dev:web
```

Solo api:

```bash
pnpm dev:api
```

### Prisma

```bash
pnpm db:generate   # generar Prisma Client
pnpm db:migrate    # aplicar migraciones en local
pnpm db:seed       # seed de desarrollo (torneo, equipos, jugadores, pool demo)
```

### Endpoints base

- Web: `http://localhost:3000`
- API health: `http://localhost:4000/api/health`

Detalles de deploy a producción (Railway + Vercel) en [DEPLOY.md](./DEPLOY.md).

---

## Notas de desarrollo

Parte de este proyecto se construyó con ayuda de Claude Code / AI-assisted development, especialmente para acelerar el andamiaje inicial del monorepo; las decisiones de dominio, modelo de datos y reglas de negocio son mías.
