import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { db } from "@/lib/db";
import { requerirInstructor } from "@/lib/auth";
import { deFechaDB, fechaCorta, hoyAR, nombrePeriodo, periodoActual, periodoAnterior, periodoDe, periodoSiguiente, periodoValido } from "@/lib/fechas";
import { barras, diasEntre, formatoDuracion, formatoNota, porcentaje, promedio, rachaAusencias } from "@/lib/calculos";
import { resumir } from "@/lib/estadisticas";

export const metadata = { title: "Estadísticas" };


function Barra({ ancho, color = "bg-acento" }: { ancho: number; color?: string }) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-borde" aria-hidden>
      <div className={`h-full rounded-full ${color}`} style={{ width: `${ancho}%` }} />
    </div>
  );
}

export default async function PaginaEstadisticas({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  await requerirInstructor();
  const { mes } = await searchParams;
  const todo = mes === "todo";
  const periodo = mes && periodoValido(mes) ? mes : periodoActual();
  const hoy = hoyAR();

  const [categorias, temas, entrenamientos, evaluaciones] = await Promise.all([
    db.categoria.findMany({ orderBy: { orden: "asc" } }),
    db.tema.findMany({ where: { activo: true }, orderBy: { orden: "asc" } }),
    db.entrenamiento.findMany({
      where: { realizado: true },
      orderBy: { fecha: "desc" },
      select: {
        fecha: true,
        categoriaId: true,
        horaBajada: true,
        horaRegreso: true,
        temas: { where: { realizado: true }, select: { temaId: true } },
        asistencias: { select: { alumnoId: true, presente: true } },
      },
    }),
    db.evaluacion.findMany({
      where: todo ? {} : { periodo },
      select: { alumno: { select: { categoriaId: true } }, items: { select: { valor: true, criterio: { select: { id: true, nombre: true } } } } },
    }),
  ]);

  const aResumen = (e: (typeof entrenamientos)[number]) => ({
    fecha: deFechaDB(e.fecha),
    categoriaId: e.categoriaId,
    horaBajada: e.horaBajada,
    horaRegreso: e.horaRegreso,
    presentes: e.asistencias.filter((a) => a.presente).length,
    total: e.asistencias.length,
    temasHechos: e.temas.map((t) => t.temaId),
  });
  const todos = entrenamientos.map(aResumen);
  const enRango = todo ? todos : todos.filter((e) => periodoDe(e.fecha) === periodo);
  const r = resumir(enRango);
  // "Cuándo fue la última vez" mira todo el historial, no solo el mes elegido.
  const historial = resumir(todos);

  const nombreCat = new Map(categorias.map((c) => [c.id, c.nombre]));
  const filasTemas = barras(temas.map((t) => ({ id: t.id, nombre: t.nombre, valor: r.temas.get(t.id)?.veces ?? 0, ultima: historial.temas.get(t.id)?.ultima ?? null })));

  // Alumnos con faltas seguidas (mirando los últimos entrenamientos de su categoría).
  const presenciasPorAlumno = new Map<string, boolean[]>(); // entrenamientos ya vienen del más nuevo al más viejo
  for (const e of entrenamientos) {
    for (const a of e.asistencias) {
      const lista = presenciasPorAlumno.get(a.alumnoId) ?? [];
      lista.push(a.presente);
      presenciasPorAlumno.set(a.alumnoId, lista);
    }
  }
  const conFaltas = [...presenciasPorAlumno.entries()]
    .map(([alumnoId, p]) => ({ alumnoId, racha: rachaAusencias(p) }))
    .filter((x) => x.racha >= 2)
    .sort((a, b) => b.racha - a.racha);
  const alumnosConFaltas = conFaltas.length
    ? await db.alumno.findMany({ where: { id: { in: conFaltas.map((x) => x.alumnoId) }, activo: true }, select: { id: true, nombre: true, categoriaId: true } })
    : [];
  const faltas = conFaltas.flatMap((x) => {
    const a = alumnosConFaltas.find((al) => al.id === x.alumnoId);
    return a ? [{ ...a, racha: x.racha }] : [];
  });

  // Notas: promedio por criterio en el período elegido.
  const porCriterio = new Map<string, { nombre: string; valores: number[] }>();
  for (const ev of evaluaciones) {
    for (const it of ev.items) {
      const f = porCriterio.get(it.criterio.id) ?? { nombre: it.criterio.nombre, valores: [] };
      f.valores.push(it.valor);
      porCriterio.set(it.criterio.id, f);
    }
  }
  const notas = [...porCriterio.values()].map((f) => ({ nombre: f.nombre, promedio: promedio(f.valores)! })).sort((a, b) => b.promedio - a.promedio);

  const enlace = (p: string) => `/estadisticas?mes=${p}`;
  const maxMin = Math.max(0, ...[...r.porCategoria.values()].map((c) => c.minutos));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="display text-3xl sm:text-4xl">Estadísticas</h1>
        <p className="mt-1 text-suave">Solo cuentan los entrenamientos dados por realizados.</p>
      </div>

      <div className="flex items-center justify-between gap-2">
        <Link href={enlace(periodoAnterior(periodo))} className="boton" aria-label="Mes anterior"><ChevronLeft size={18} aria-hidden /></Link>
        <div className="text-center">
          <p className="font-semibold first-letter:uppercase">{todo ? "Todo el historial" : nombrePeriodo(periodo)}</p>
          <Link href={todo ? enlace(periodoActual()) : "/estadisticas?mes=todo"} className="text-sm text-acento underline underline-offset-4">
            {todo ? "Ver por mes" : "Ver todo"}
          </Link>
        </div>
        <Link href={enlace(periodoSiguiente(periodo))} className="boton" aria-label="Mes siguiente"><ChevronRight size={18} aria-hidden /></Link>
      </div>

      <section className="grid grid-cols-3 gap-3">
        <div className="caja p-3">
          <p className="text-xs text-suave">Entrenamientos</p>
          <p className="text-xl font-semibold">{r.cantidad}</p>
        </div>
        <div className="caja p-3">
          <p className="text-xs text-suave">En el agua</p>
          <p className="text-xl font-semibold">{r.minutos ? formatoDuracion(r.minutos) : "—"}</p>
        </div>
        <div className="caja p-3">
          <p className="text-xs text-suave">Asistencia</p>
          <p className="text-xl font-semibold">{r.asistenciaPct === null ? "—" : `${r.asistenciaPct}%`}</p>
        </div>
      </section>

      <section className="caja space-y-4 p-4">
        <h2 className="font-semibold">Horas en el agua por categoría</h2>
        {r.porCategoria.size === 0 ? (
          <p className="text-sm text-suave">No hay entrenamientos realizados en este período.</p>
        ) : (
          [...r.porCategoria.entries()].sort((a, b) => b[1].minutos - a[1].minutos).map(([id, c]) => (
            <div key={id} className="space-y-1.5">
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="font-medium">{nombreCat.get(id) ?? "—"}</span>
                <span className="text-suave">
                  {c.minutos ? formatoDuracion(c.minutos) : "sin horarios"} · {c.cantidad} {c.cantidad === 1 ? "salida" : "salidas"} · asist. {porcentaje(c.presentes, c.total) ?? "—"}%
                </span>
              </div>
              <Barra ancho={maxMin ? Math.round((c.minutos / maxMin) * 100) : 0} />
            </div>
          ))
        )}
      </section>

      <section className="caja space-y-4 p-4">
        <div>
          <h2 className="font-semibold">Temas entrenados</h2>
          <p className="text-sm text-suave">Para ver qué se repitió de más y qué hace tiempo que no se practica.</p>
        </div>
        {filasTemas.length === 0 ? (
          <p className="text-sm text-suave">No hay temas cargados.</p>
        ) : (
          filasTemas.map((t) => {
            const dias = t.ultima ? diasEntre(t.ultima, hoy) : null;
            return (
              <div key={t.id} className="space-y-1.5">
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="font-medium">{t.nombre}</span>
                  <span className={dias === null || dias > 21 ? "text-alerta" : "text-suave"}>
                    {t.valor} {t.valor === 1 ? "vez" : "veces"} · {t.ultima ? `última: ${fechaCorta(t.ultima)}${dias !== null && dias > 0 ? ` (hace ${dias} d)` : ""}` : "nunca"}
                  </span>
                </div>
                <Barra ancho={t.ancho} />
              </div>
            );
          })
        )}
      </section>

      <section className="caja space-y-4 p-4">
        <h2 className="font-semibold">Notas promedio por criterio</h2>
        {notas.length === 0 ? (
          <p className="text-sm text-suave">No hay evaluaciones en este período.</p>
        ) : (
          notas.map((n) => (
            <div key={n.nombre} className="space-y-1.5">
              <div className="flex items-baseline justify-between text-sm">
                <span className="font-medium">{n.nombre}</span>
                <span className="font-semibold">{formatoNota(n.promedio)}</span>
              </div>
              <Barra ancho={Math.round((n.promedio / 10) * 100)} color="bg-ok" />
            </div>
          ))
        )}
      </section>

      {faltas.length > 0 && (
        <section className="caja space-y-2 p-4">
          <h2 className="font-semibold">Con faltas seguidas</h2>
          <ul className="divide-y divide-borde">
            {faltas.map((f) => (
              <li key={f.id}>
                <Link href={`/alumnos/${f.id}`} className="flex min-h-11 items-center justify-between gap-3 py-2 hover:text-acento">
                  <span>{f.nombre} <span className="text-sm text-suave">· {nombreCat.get(f.categoriaId)}</span></span>
                  <span className={`text-sm font-medium ${f.racha >= 3 ? "text-peligro" : "text-alerta"}`}>{f.racha} seguidas</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
