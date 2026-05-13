# Quinela Mundial 2026

## Producto

Aplicación web de quiniela/predicciones para el Mundial FIFA 2026.

La aplicación tiene:
- frontend web
- backend API
- panel admin
- scoring
- predicciones
- preguntas bonus
- leaderboard

## Modelo de negocio actual

Los usuarios normales NO crean pools.

Existe una pool principal:
world-cup-2026-main

Cuando un usuario:
- hace register
- hace login

Debe:
- quedar inscrito automáticamente a la pool principal
- poder crear su entry/boleta
- hacer predicciones
- responder preguntas bonus

El usuario normal NO:
- lista pools
- crea pools
- hace join manual

Los ADMIN y SUPER_ADMIN:
- sí gestionan pools
- sí usan panel admin
- sí administran el torneo

---

# Arquitectura

## Monorepo

- apps/api -> NestJS
- apps/web -> Next.js App Router
- packages/db -> Prisma
- packages/types -> shared types

## Stack

- TypeScript
- Next.js
- NestJS
- Prisma
- PostgreSQL
- Tailwind
- shadcn/ui
- pnpm workspace

---

# Dominio importante

## Match

Soporta:
- grupos
- knockout slots

Ejemplos:
- 1A
- 2B
- W73
- L101

homeTournamentTeamId y awayTournamentTeamId son opcionales.

---

# Bonus questions

Tipos:
- BOOLEAN
- SINGLE_CHOICE
- TEAM_PICK
- TIME_RANGE
- PLAYER_PICK

PLAYER_PICK:
- usa Player y TournamentPlayer
- valida selectedPlayerId
- no acepta payload ambiguo

---

# Players

Player:
catálogo global.

TournamentPlayer:
participación de un jugador en torneo/equipo.

Estados:
- PROVISIONAL
- FINAL
- WITHDRAWN
- REPLACED

---

# Seeds

Los seeds:
- deben ser idempotentes
- no hardcodean IDs
- usan slug/code/name
- usan upsert cuando tiene sentido

---

# Frontend UX

Usuarios normales:
- experiencia enfocada en "Mi Quiniela"
- próximos partidos
- predicciones
- leaderboard
- bonus questions

Admins:
- panel admin separado
- gestión operativa

---

# Restricciones

NO:
- rehacer arquitectura
- sobreingenierizar
- meter microservicios
- meter realtime todavía
- meter Redux innecesario

SÍ:
- cambios incrementales
- mantener compatibilidad
- mantener typecheck/build en verde

---

# Calidad obligatoria

API:
pnpm --filter @quinela/api typecheck

WEB:
pnpm --filter @quinela/web typecheck
pnpm --filter @quinela/web build

DB:
pnpm exec prisma validate
pnpm exec prisma generate

---

# Estilo de trabajo

Siempre:
1. analizar estructura existente
2. proponer cambios mínimos
3. implementar incrementalmente
4. validar build/typecheck
5. resumir cambios

Nunca:
- duplicar lógica
- romper contratos sin necesidad
- crear patrones nuevos si ya existe uno compatible