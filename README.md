# Bitácora CVSI

Herramienta privada para los instructores del CVSI: plan y registro de cada entrenamiento, asistencia, horas en el agua, temas entrenados y evaluación mensual (1 a 10) de cada alumno. Los alumnos no tienen acceso.

No tiene resultados de regatas ni roles: todos los instructores ven todos los grupos (se distinguen por categoría).

## Qué hace

- **Hoy**: elegís el día y ves un tablero por categoría (sin cargar / planificado / realizado).
- **Entrenamiento** (por día y categoría): plan y temas planificados de antemano; después hora de bajada y regreso (botón "Ahora"), asistencia con tilde, temas realizados y observaciones. "Dar por realizado" lo hace contar en las estadísticas.
- **Alumnos**: altas en lote (un nombre por línea), ficha con asistencia, faltas seguidas y evolución de notas; archivar sin perder historial.
- **Evaluar**: nota del 1 al 10 por criterio, una vez por mes, mostrando la del mes anterior.
- **Estadísticas**: horas en el agua por categoría, temas entrenados (cuántas veces y hace cuánto), notas promedio por criterio y alumnos con faltas seguidas.
- **Ajustes**: categorías, temas y criterios editables; instructores; cambio de contraseña.

## Stack

Next.js 16 (App Router, Server Actions) · React 19 · Tailwind 4 · Prisma 7 + Postgres (Neon) · sesión propia con cookie HttpOnly firmada (`jose` + `bcryptjs`) · Vitest.

## Puesta en marcha

```bash
pnpm install
cp .env.example .env.local        # completar DATABASE_URL y SESSION_SECRET
pnpm db:push                      # crea las tablas
pnpm db:seed                      # categorías, temas y criterios iniciales (editables en Ajustes)
INSTRUCTOR_PASSWORD="..." pnpm db:crear-instructor "Nombre Apellido" email@dominio.com
pnpm dev
```

`SESSION_SECRET` se genera con `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.

`db:crear-instructor` también sirve para restablecer la contraseña de un instructor que la olvidó (mismo email, contraseña nueva). Si no se define `INSTRUCTOR_PASSWORD`, genera una al azar y la muestra una sola vez.

## Scripts

| Comando | Qué hace |
| --- | --- |
| `pnpm dev` / `pnpm build` / `pnpm start` | Desarrollo y producción |
| `pnpm test` | Tests de los cálculos (horas, asistencia, fechas, estadísticas) |
| `pnpm db:push` | Sincroniza el esquema con la base |
| `pnpm db:seed` | Carga las listas iniciales (no pisa nada) |
| `pnpm db:crear-instructor` | Crea o actualiza un instructor |

## Privacidad

Son datos de menores: toda la app exige sesión (el proxy redirige al login y cada página y acción vuelve a verificar que el instructor siga activo), no se indexa (`robots.txt` + `X-Robots-Tag` + `noindex`) y no hay páginas públicas. Las contraseñas se guardan con bcrypt.

## Notas de diseño

- "Hoy" y el mes actual se calculan con la hora de Argentina, no la del servidor.
- Las fechas son `DATE` y los horarios `"HH:mm"`; las horas en el agua salen de bajada y regreso.
- Un entrenamiento solo cuenta para asistencia, horas y temas cuando está dado por realizado.
- Es una app siempre dinámica (depende de la sesión): no usa cacheo de páginas.
