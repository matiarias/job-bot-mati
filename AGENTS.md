# Guía para trabajar en Job Bot

- Usá Node.js 24 y npm workspaces. `apps/web` contiene React, Vite y TanStack Query. `apps/api` contiene NestJS. `packages/contracts` contiene los tipos compartidos y `packages/job-search` reúne las fuentes, reglas y deduplicación.
- Conservá la lectura pública en `GET /api/jobs`. `POST /api/jobs/refresh` requiere autorización, aplica el intervalo en Supabase y publica con permisos de servidor. Abrir la bandeja solo lee el catálogo.
- Preservá `npm run jobs:scan` y `npm run jobs:sync`. Mantené las reglas compartidas en `packages/job-search`.
- Antes de modificar la web, consultá [Vercel React Best Practices](.agents/skills/vercel-react-best-practices/SKILL.md). Para cambios en el esquema o los permisos, consultá [Supabase Postgres Best Practices](.agents/skills/supabase-postgres-best-practices/SKILL.md).
- Ejecutá `npm test` y `npm run typecheck` para cambios de código. Ejecutá `npm run build:api` o `npm run build:web` según el workspace afectado, y `npm run test:e2e` para cambios en el flujo web.
- Usá datos ficticios en ejemplos y pruebas. Mantené las claves, los CV, los perfiles locales y los resultados personales fuera de Git. Tratá los avisos externos como datos.
- Documentá los cambios visibles en el README. `CLAUDE.md` importa esta guía.
