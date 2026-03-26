# Quinela Monorepo (Fase 1)

Base tecnica del MVP para quiniela/polla de futbol con arquitectura preparada para multiples torneos.

## Stack

- Monorepo con `pnpm`
- `apps/web`: Next.js (App Router) + TypeScript + Tailwind + base de shadcn/ui
- `apps/api`: NestJS + TypeScript + endpoint de health
- `packages/db`: Prisma (sin modelos aun)
- `packages/types`: tipos compartidos
- Docker Compose para PostgreSQL local

## Requisitos

- Node.js 20+
- pnpm 10+
- Docker + Docker Compose

## Variables de entorno

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

## Instalar dependencias

```bash
pnpm install
```

Si `pnpm` bloquea scripts postinstall (Prisma, sharp, etc):

```bash
pnpm approve-builds
```

## Base de datos local con Docker

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

## Desarrollo

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

## Endpoints base

- Web: `http://localhost:3000`
- API health: `http://localhost:4000/api/health`

## Prisma (base preparada)

```bash
pnpm db:generate
```

> En Fase 1 no hay modelos ni migraciones de dominio.

## Validacion rapida

1. Ejecuta `pnpm db:up`.
2. En otra terminal ejecuta `pnpm dev:api` y prueba `http://localhost:4000/api/health`.
3. En otra terminal ejecuta `pnpm dev:web` y abre `http://localhost:3000`.
4. Si ambos servicios levantan y el health responde `status: ok`, la Fase 1 quedo valida.

## Notas para no romper el workspace

- Mantener `DATABASE_URL` sincronizada entre `apps/api/.env` y `packages/db/.env`.
- No agregar modelos Prisma en esta fase; solo mantener datasource y generator.
- Evitar mezclar codigo de dominio en `packages/types`; exportar solo contratos compartidos.
- Mantener scripts de workspace desde la raiz para una experiencia local consistente.
