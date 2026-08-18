# Libreta Sanitaria — proyecto de referencia de MDW 2026

> Este es el **proyecto de referencia de la materia**: el que se construye en vivo, clase a clase,
> durante los 15 minutos de demo. No es de ningún equipo — está publicado para que cualquiera
> pueda mirar cómo se resuelve el tema del día sobre un dominio distinto al suyo.
>
> Material de la materia: https://dariomaranes.github.io/UAI-MDW-2026/

**Equipo:** Darío Marañes (docente)

**Producción:** *(se completa en la clase 1)*

## De qué se trata

Las libretas sanitarias de las mascotas son de papel: se pierden, se mojan, y cuando hay que
demostrar que un perro está al día con la antirrábica no aparecen. Este sistema lleva el registro
de vacunas, desparasitaciones y controles de cada mascota, con su historial.

**Roles**

- **Dueño**: registra sus mascotas y consulta el historial de cada una.
- **Veterinario**: registra las aplicaciones y los controles que realiza.

**Flujo principal:** el veterinario registra la aplicación de una vacuna a una mascota, y queda
en el historial con su fecha de vencimiento.

## Por qué este dominio

Se eligió a propósito en lugar de un turnero: *turnos* sirve para cualquier rubro y es lo que más
equipos van a elegir, así que había riesgo alto de coincidir con alguno. Una libreta sanitaria es
específica y tiene relaciones más ricas para modelar:

```
Dueño 1──N Mascota 1──N Aplicación N──1 Vacuna
Mascota N──N Veterinario
```

## Stack

Next.js (App Router) + TypeScript + Postgres (Supabase) + Prisma + Zod + Tailwind.
Deploy en Vercel.

## Cómo se sigue

Cada clase agrega el tema del día. Los commits están ordenados por clase, así que el historial
sirve para ver cómo fue creciendo el sistema.

## Puesta en marcha

Requisitos: Node 20+, npm, y una base de datos: **Postgres** (Supabase) o **MongoDB** (Atlas). Las dos tienen plan gratuito.

```bash
npm install
cp .env.example .env.local     # completar DATABASE_URL y AUTH_SECRET
npx prisma migrate dev --name init
npm run db:seed
npm run dev                       # http://localhost:3000
```

Generar el `AUTH_SECRET`:

```bash
npx auth secret
```

> Usen **npm** en todo el equipo y commiteen el `package-lock.json`. Si alguien instala con otro gestor aparece un segundo lockfile y las instalaciones dejan de ser reproducibles.

## Comandos

| Comando | Para qué |
|---|---|
| `npm run dev` | Levantar en desarrollo |
| `npm run build` | Build de producción (lo mismo que corre Vercel) |
| `npm run lint` | Lint |
| `npm run typecheck` | Chequeo de tipos sin emitir |
| `npm test` | Tests |
| `npx prisma migrate dev` | Crear y aplicar una migración |
| `npx prisma studio` | Ver y editar los datos a mano |
| `npm run db:seed` | Cargar datos de ejemplo |

## Estructura

```
app/                    rutas (App Router)
  (public)/             páginas sin sesión
  (app)/                páginas con sesión
  api/                  Route Handlers
components/             componentes de UI
lib/
  db/                   acceso a datos — ÚNICO lugar que habla con Prisma
  schemas/              schemas de Zod (validación + tipos)
  auth.ts               configuración de sesión y roles
prisma/
  schema.prisma         modelo de datos
  seed.ts               datos de ejemplo
docs/
  spec.md               qué hace el sistema (requerimientos)
  adr/                  decisiones técnicas y por qué
```

## Reglas del equipo

- Nadie pushea a `main`. Todo entra por Pull Request con al menos 1 aprobación.
- Las convenciones de código están en [`AGENTS.md`](./AGENTS.md) — mantenerlo al día es responsabilidad del equipo.
- Una decisión técnica que cueste revertir se documenta como ADR en `docs/adr/`.

## Definition of Done

Una tarea está terminada cuando:

- [ ] Funciona en el preview deployment, no solo en la máquina de quien la escribió.
- [ ] La validación está en el servidor, no solo en el cliente.
- [ ] Los estados de carga y error están resueltos en la UI.
- [ ] `npm run build` y `npm run typecheck` pasan.
- [ ] Alguien más del equipo la revisó y puede explicarla.
