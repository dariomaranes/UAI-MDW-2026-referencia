# Libreta Sanitaria — proyecto de referencia de MDW 2026

> Este es el **proyecto de referencia de la materia**: el que se construye en vivo, clase a clase,
> durante los 15 minutos de demo. No es de ningún equipo — está publicado para que cualquiera
> pueda mirar cómo se resuelve el tema del día sobre un dominio distinto al suyo.
>
> Material de la materia: https://dariomaranes.github.io/UAI-MDW-2026/

**Equipo:** Darío Marañes (docente)

**Producción:** https://uai-mdw-2026-referencia.vercel.app

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

Requisitos: Node 22+, npm, y una base de datos: **Postgres** (Supabase) o **MongoDB** (Atlas). Las dos tienen plan gratuito.

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
| `npm test` | Pruebas de dominio (vitest), en menos de un segundo |
| `npm run test:e2e` | Pruebas de punta a punta y de permisos (Playwright), contra una base local |
| `npx prisma migrate dev` | Crear y aplicar una migración |
| `npx prisma studio` | Ver y editar los datos a mano |
| `npm run db:seed` | Cargar datos de ejemplo |
| `npm run db:carga` | 50.000 mascotas, para medir. Solo en una base local aparte (ver abajo) |
| `npm run demo:indices` | La misma búsqueda sin índice y con índice, sobre la base de carga |
| `npm run demo:carrera` | Diez pedidos iguales al mismo tiempo: la carrera de la clase 14 |

## Pruebas

Dos capas, con dos comandos:

- `npm test`: las reglas de dominio, con vitest. Sin base ni red.
- `npm run test:e2e`: el flujo principal de la spec y los permisos de `docs/api.md`, con
  Playwright. Migra y carga el seed en la base de `.env.e2e`, compila la app y la levanta en el
  puerto 3100, así que no choca con `npm run dev`.

Las e2e **nunca corren contra la base de producción**: `playwright.config.ts` se niega a arrancar
si `DATABASE_URL` no es local. La primera vez:

```bash
docker run -d --name libreta-e2e -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=libreta -p 54329:5432 postgres:16-alpine
npx playwright install chromium
```

Después, cada vez:

```bash
docker start libreta-e2e          # si la base no está corriendo
npm run test:e2e                  # las corre todas en la terminal
npm run test:e2e -- --ui          # interfaz visual: paso a paso, con la pantalla de cada uno
npm run test:e2e -- --headed      # muestra el navegador mientras corre
npx playwright show-trace test-results/<prueba>/trace.zip   # el recorrido de una que falló
```

## Medir con muchos datos

Con las tres mascotas del seed todo es instantáneo, hasta lo que está mal. Para saber cómo se
comporta el sistema después de un par de años de uso:

```bash
npm run db:carga       # 5.000 dueños, 50.000 mascotas, 150.000 aplicaciones, 50.000 certificados
npm run demo:indices   # tres búsquedas de la app, sin índice y con índice
```

`db:carga` arma una base **aparte**, `libreta_carga`, en el mismo contenedor de Docker de las
pruebas: con tantos datos, las pruebas e2e fallarían por los datos y no por el código. Se puede
correr las veces que haga falta, tarda unos 8 segundos y se niega a correr si la base no es local.

Para medir una consulta propia, a mano:

```bash
docker exec -it libreta-e2e psql -U postgres -d libreta_carga
```
```sql
EXPLAIN ANALYZE
SELECT * FROM "Mascota" WHERE "duenoId" = 'carga-dueno-17';
```

`Seq Scan` es que recorrió la tabla entera; `Index Scan`, que fue directo. El `rows=` dice
cuántas filas tocó, y `Execution Time`, cuánto tardó. Medí dos o tres veces: la primera paga el
disco y miente.

## La carrera de la clase 14, en vivo

```bash
npm run demo:carrera
```

Ana pide el mismo certificado diez veces al mismo tiempo, primero con la regla "una sola
pendiente" solo en el código y después también en la base, y muestra cuántas quedaron guardadas.
Usa la base de las pruebas y la deja como estaba.

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
