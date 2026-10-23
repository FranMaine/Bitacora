import Link from "next/link";
import { ChevronLeft, ChevronRight, Waves, Wind } from "lucide-react";
import { db } from "@/lib/db";
import { requerirInstructor } from "@/lib/auth";
import { deFechaDB, fechaCorta, hoyAR, nombrePeriodo, periodoActual, periodoAnterior, periodoDe, periodoSiguiente, periodoValido } from "@/lib/fechas";
import {
  barras,
  diasEntre,
  formatoDuracion,
  formatoNota,
  formatoTendencia,
  minutosEntre,
  porcentaje,
  promedio,
  rachaAusencias,
  tendencia,
} from "@/lib/calculos";
import { avanceEvaluaciones, resumenFases, resumir } from "@/lib/estadisticas";
import { Avatar } from "@/components/avatar";
import { LogoClase } from "@/components/logo-clase";

export const metadata = { title: "Estadísticas" };

function Barra({ ancho, color = "bg-acento" }: { ancho: number; color?: string }) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-borde" aria-hidden>
      <div className={`h-full rounded-full ${color}`} style={{ width: `${ancho}%` }} />
    </div>
  );
}

function Delta({ valor }: { valor: number | null }) {
  const t = formatoTendencia(valor);
  if (!t || t === "=") return null;
  return <span className={`text-xs font-medium ${t.startsWith("+") ? "text-ok" : "text-peligro"}`}>{t}</span>;
}

export default async function PaginaEstadisticas({ searchParams }: { searchParams: Promise<{ mes?: string; categoria?: string }> }) {
  await requerirInstructor();
  const { mes, categoria: categoriaPedida } = await searchParams;
  const todo = mes === "todo";
  const periodo = mes && periodoValido(mes) ? mes : periodoActual();
  const hoy = hoyAR();

  const [categorias, temas, entrenamientos, evaluaciones, alumnos] = await Promise.all([
    db.categoria.findMany({ where: { activa: true }, orderBy: { orden: "asc" } }),
    db.tema.findMany({ where: { activo: true }, orderBy: { orden: "asc" } }),
    db.entrenamiento.findMany({
      where: { realizado: true },
      orderBy: { fecha: "desc" },
      select: {
        fecha: true,
        categoriaId: true,
        horaBajada: true,
        horaRegreso: true,
        vientoDir: true,
        vientoNudos: true,
        tipo: true,
        corrienteNudos: true,
        corrienteDir: true,
        notasFase: { select: { valor: true, faseId: true, fase: { select: { nombre: true, orden: true } } } },
        temas: { where: { realizado: true }, select: { temaId: true } },
        asistencias: { select: { alumnoId: true, presente: true } },
      },
    }),
    db.evaluacion.findMany({
      orderBy: { fecha: "asc" },
      select: {
        fecha: true,
        alumnoId: true,
        alumno: { select: { categoriaId: true } },
        items: { select: { valor: true, criterio: { select: { id: true, nombre: true } } } },
      },
    }),
    db.alumno.findMany({ where: { activo: true }, orderBy: { nombre: "asc" }, select: { id: true, nombre: true, categoriaId: true } }),
  ]);

  const categoria = categorias.find((c) => c.id === categoriaPedida) ?? null; // null = todas
  const enCategoria = <T extends { categoriaId: string }>(x: T) => !categoria || x.categoriaId === categoria.id;
  const nombreCat = new Map(categorias.map((c) => [c.id, c.nombre]));

  // --- entrenamientos del filtro
  const entrenos = entrenamientos.filter(enCategoria);
  const enRango = entrenos.filter((e) => todo || periodoDe(deFechaDB(e.fecha)) === periodo);
  const aResumen = (e: (typeof entrenos)[number]) => ({
    fecha: deFechaDB(e.fecha),
    categoriaId: e.categoriaId,
    horaBajada: e.horaBajada,
    horaRegreso: e.horaRegreso,
    presentes: e.asistencias.filter((a) => a.presente).length,
    total: e.asistencias.length,
    temasHechos: e.temas.map((t) => t.temaId),
  });
  const r = resumir(enRango.map(aResumen));
  // "Cuándo fue la última vez" mira todo el historial de la categoría, no solo el mes elegido.
  const historial = resumir(entrenos.map(aResumen));

  // --- viento
  const nudos = enRango.map((e) => e.vientoNudos).filter((n): n is number => n !== null);
  const vientoProm = promedio(nudos);
  const porDireccion = new Map<string, number>();
  for (const e of enRango) if (e.vientoDir) porDireccion.set(e.vientoDir, (porDireccion.get(e.vientoDir) ?? 0) + 1);
  const direcciones = [...porDireccion.entries()].sort((a, b) => b[1] - a[1]);
  const corrienteProm = promedio(enRango.map((e) => e.corrienteNudos).filter((n): n is number => n !== null));

  // --- regatas (días de regata dentro del filtro)
  const regatas = enRango.filter((e) => e.tipo === "REGATA");
  const nudosRegata = regatas.map((e) => e.vientoNudos).filter((n): n is number => n !== null);
  const corrientes = regatas.map((e) => e.corrienteNudos).filter((n): n is number => n !== null);
  const fasesRegata = resumenFases(
    regatas.flatMap((e) => e.notasFase.map((n) => ({ faseId: n.faseId, nombre: n.fase.nombre, orden: n.fase.orden, valor: n.valor }))),
  );

  // --- temas
  const filasTemas = barras(
    temas.map((t) => ({ id: t.id, nombre: t.nombre, valor: r.temas.get(t.id)?.veces ?? 0, ultima: historial.temas.get(t.id)?.ultima ?? null })),
  );

  // --- evaluaciones del filtro (por la fecha en que se hicieron)
  const evalsFiltro = evaluaciones.filter(
    (e) => (!categoria || e.alumno.categoriaId === categoria.id) && (todo || periodoDe(deFechaDB(e.fecha)) === periodo),
  );
  const porCriterio = new Map<string, { nombre: string; valores: number[] }>();
  for (const ev of evalsFiltro) {
    for (const it of ev.items) {
      const f = porCriterio.get(it.criterio.id) ?? { nombre: it.criterio.nombre, valores: [] };
      f.valores.push(it.valor);
      porCriterio.set(it.criterio.id, f);
    }
  }
  const notas = [...porCriterio.values()].map((f) => ({ nombre: f.nombre, promedio: promedio(f.valores)! })).sort((a, b) => b.promedio - a.promedio);

  // --- por alumno (las asistencias vienen de la más nueva a la más vieja)
  const alumnosFiltro = alumnos.filter(enCategoria);
  const presenciasPorAlumno = new Map<string, boolean[]>();
  for (const e of entrenos) {
    for (const a of e.asistencias) {
      const l = presenciasPorAlumno.get(a.alumnoId) ?? [];
      l.push(a.presente);
      presenciasPorAlumno.set(a.alumnoId, l);
    }
  }
  const statsAlumno = new Map<string, { presentes: number; total: number; minutos: number }>();
  for (const e of enRango) {
    const m = minutosEntre(e.horaBajada, e.horaRegreso) ?? 0;
    for (const a of e.asistencias) {
      const f = statsAlumno.get(a.alumnoId) ?? { presentes: 0, total: 0, minutos: 0 };
      f.total += 1;
      if (a.presente) {
        f.presentes += 1;
        f.minutos += m;
      }
      statsAlumno.set(a.alumnoId, f);
    }
  }
  const notasPorAlumno = new Map<string, number[]>(); // promedio de cada evaluación, de la más vieja a la más nueva
  for (const ev of evaluaciones) {
    const p = promedio(ev.items.map((i) => i.valor));
    if (p === null) continue;
    const l = notasPorAlumno.get(ev.alumnoId) ?? [];
    l.push(p);
    notasPorAlumno.set(ev.alumnoId, l);
  }
  const faltas = alumnosFiltro
    .map((a) => ({ ...a, racha: rachaAusencias(presenciasPorAlumno.get(a.id) ?? []) }))
    .filter((a) => a.racha >= 2)
    .sort((a, b) => b.racha - a.racha);

  // --- comparación entre categorías (solo cuando se mira "Todas")
  const comparacion = categorias
    .map((c) => {
      const es = enRango.filter((e) => e.categoriaId === c.id);
      const res = resumir(es.map(aResumen)).porCategoria.get(c.id);
      const n = es.map((e) => e.vientoNudos).filter((x): x is number => x !== null);
      const notasCat = evalsFiltro.filter((e) => e.alumno.categoriaId === c.id).map((e) => promedio(e.items.map((i) => i.valor))).filter((x): x is number => x !== null);
      return { c, res, viento: promedio(n), nota: promedio(notasCat) };
    })
    .filter((x) => x.res);
  const maxMin = Math.max(0, ...comparacion.map((x) => x.res!.minutos));

  // --- avance: ¿están mejorando? Siempre sobre TODO el historial del filtro (no depende del mes elegido).
  const evalsCategoria = evaluaciones.filter((e) => !categoria || e.alumno.categoriaId === categoria.id);
  const avance = avanceEvaluaciones(
    evalsCategoria.map((e) => ({
      alumnoId: e.alumnoId,
      fecha: deFechaDB(e.fecha),
      items: e.items.map((i) => ({ criterioId: i.criterio.id, nombre: i.criterio.nombre, valor: i.valor })),
    })),
  );
  // Mes a mes (últimos 6 con datos): salidas, asistencia, viento y nota media.
  const meses = [
    ...new Set([...entrenos.map((e) => periodoDe(deFechaDB(e.fecha))), ...evalsCategoria.map((e) => periodoDe(deFechaDB(e.fecha)))]),
  ]
    .sort()
    .slice(-6);
  const serieMensual = meses.map((m) => {
    const es = entrenos.filter((e) => periodoDe(deFechaDB(e.fecha)) === m);
    const rm = resumir(es.map(aResumen));
    const n = es.map((e) => e.vientoNudos).filter((x): x is number => x !== null);
    const notasMes = evalsCategoria
      .filter((e) => periodoDe(deFechaDB(e.fecha)) === m)
      .map((e) => promedio(e.items.map((i) => i.valor)))
      .filter((x): x is number => x !== null);
    return { mes: m, salidas: rm.cantidad, asistencia: rm.asistenciaPct, viento: promedio(n), nota: promedio(notasMes) };
  });

  const q = (p: { mes?: string; categoria?: string | null }) => {
    const parametros = new URLSearchParams();
    parametros.set("mes", p.mes ?? (todo ? "todo" : periodo));
    const cat = p.categoria === undefined ? categoria?.id : p.categoria;
    if (cat) parametros.set("categoria", cat);
    return `/estadisticas?${parametros.toString()}`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="display text-3xl sm:text-4xl">Estadísticas</h1>
        <p className="mt-1 text-suave">Solo cuentan los entrenamientos dados por realizados.</p>
      </div>

      <div className="-mx-4 overflow-x-auto px-4 pb-1" role="tablist" aria-label="Categoría">
        <div className="flex gap-6 border-b border-borde">
          {[{ id: null as string | null, nombre: "Todas" }, ...categorias].map((c) => {
            const activa = (c.id ?? null) === (categoria?.id ?? null);
            return (
              <Link
                key={c.id ?? "todas"}
                href={q({ categoria: c.id })}
                role="tab"
                aria-selected={activa}
                className="group shrink-0 whitespace-nowrap px-1 py-2.5 text-sm font-medium text-suave transition-colors duration-[160ms] aria-selected:text-acento hover:text-texto aria-selected:hover:text-acento"
              >
                {c.nombre}
                <span
                  aria-hidden
                  className="pointer-events-none mt-2 block h-[2px] origin-left scale-x-0 bg-acento transition-transform duration-[220ms] ease-[cubic-bezier(0.23,1,0.32,1)] group-aria-selected:scale-x-100"
                />
              </Link>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-between gap-2">
        <Link href={q({ mes: periodoAnterior(periodo) })} className="boton" aria-label="Mes anterior"><ChevronLeft size={18} aria-hidden /></Link>
        <div className="text-center">
          <p className="font-semibold first-letter:uppercase">{todo ? "Todo el historial" : nombrePeriodo(periodo)}</p>
          <Link href={q({ mes: todo ? periodoActual() : "todo" })} className="text-sm text-acento underline underline-offset-4">
            {todo ? "Ver por mes" : "Ver todo"}
          </Link>
        </div>
        <Link href={q({ mes: periodoSiguiente(periodo) })} className="boton" aria-label="Mes siguiente"><ChevronRight size={18} aria-hidden /></Link>
      </div>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <div className="caja p-3">
          <p className="text-xs text-suave">Salidas</p>
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
        <div className="caja p-3">
          <p className="text-xs text-suave">Viento medio</p>
          <p className="text-xl font-semibold">{vientoProm === null ? "—" : `${formatoNota(vientoProm)} kn`}</p>
        </div>
        <div className="caja p-3">
          <p className="text-xs text-suave">Corriente media</p>
          <p className="text-xl font-semibold">{corrienteProm === null ? "—" : `${formatoNota(corrienteProm)} kn`}</p>
        </div>
      </section>

      <section className="caja space-y-4 p-4">
        <div>
          <h2 className="font-semibold">Avance: ¿están mejorando?</h2>
          <p className="text-sm text-suave">
            Cada evaluación nueva se compara con la <strong className="font-medium text-texto">anterior del mismo alumno</strong>.
            Acá se junta eso para {categoria ? `la categoría ${categoria.nombre}` : "todos los chicos"}.
          </p>
        </div>
        {avance.comparados === 0 ? (
          <p className="text-sm text-suave">
            Todavía no hay chicos con dos o más evaluaciones, así que no hay nada para comparar. En cuanto se les haga la segunda, acá aparece si mejoraron.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-[12px] bg-ok-suave p-3">
                <p className="text-2xl font-semibold text-ok">{avance.mejoraron}</p>
                <p className="text-xs text-ok">mejoraron</p>
              </div>
              <div className="rounded-[12px] bg-borde/40 p-3">
                <p className="text-2xl font-semibold">{avance.iguales}</p>
                <p className="text-xs text-suave">igual</p>
              </div>
              <div className="rounded-[12px] bg-alerta-suave p-3">
                <p className="text-2xl font-semibold text-alerta">{avance.bajaron}</p>
                <p className="text-xs text-alerta">bajaron</p>
              </div>
            </div>
            <p className="text-sm text-suave">
              De {avance.comparados} {avance.comparados === 1 ? "chico comparado" : "chicos comparados"}, la nota promedio cambió{" "}
              <strong className={(avance.deltaMedio ?? 0) >= 0 ? "text-ok" : "text-peligro"}>{formatoTendencia(avance.deltaMedio)}</strong> entre su evaluación anterior y la última.
            </p>
            <ul className="divide-y divide-borde">
              {avance.porCriterio.map((c) => (
                <li key={c.nombre} className="flex items-baseline justify-between gap-3 py-2 text-sm">
                  <span>{c.nombre}</span>
                  <span className="flex items-baseline gap-2">
                    <span className="text-suave">{formatoNota(c.anterior)} → {formatoNota(c.actual)}</span>
                    <Delta valor={c.delta} />
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      {serieMensual.length > 0 && (
        <section className="caja space-y-3 p-4">
          <div>
            <h2 className="font-semibold">Mes a mes</h2>
            <p className="text-sm text-suave">Cómo viene cambiando {categoria ? categoria.nombre : "todo el club"} en los últimos meses.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[20rem] text-sm">
              <thead>
                <tr className="text-left text-xs text-suave">
                  <th className="py-1 font-medium">Mes</th>
                  <th className="py-1 text-right font-medium">Salidas</th>
                  <th className="py-1 text-right font-medium">Asist.</th>
                  <th className="py-1 text-right font-medium">Viento</th>
                  <th className="py-1 text-right font-medium">Nota</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-borde">
                {serieMensual.map((m, i) => (
                  <tr key={m.mes}>
                    <td className="py-2 first-letter:uppercase">{nombrePeriodo(m.mes)}</td>
                    <td className="py-2 text-right">{m.salidas}</td>
                    <td className="py-2 text-right">{m.asistencia === null ? "—" : `${m.asistencia}%`}</td>
                    <td className="py-2 text-right">{m.viento === null ? "—" : `${formatoNota(m.viento)} kn`}</td>
                    <td className="py-2 text-right font-semibold">
                      {m.nota === null ? "—" : formatoNota(m.nota)}{" "}
                      {m.nota !== null && serieMensual[i - 1]?.nota != null && <Delta valor={m.nota - serieMensual[i - 1].nota!} />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {!categoria && (
        <section className="caja space-y-4 p-4">
          <h2 className="font-semibold">Por categoría</h2>
          {comparacion.length === 0 ? (
            <p className="text-sm text-suave">No hay entrenamientos realizados en este período.</p>
          ) : (
            comparacion
              .sort((a, b) => b.res!.minutos - a.res!.minutos)
              .map(({ c, res, viento, nota }) => (
                <Link key={c.id} href={q({ categoria: c.id })} className="block space-y-1.5 rounded-[12px] transition-colors hover:text-acento">
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-2 font-medium">
                      <LogoClase nombre={c.nombre} tam={22} /> {c.nombre}
                    </span>
                    <span className="text-sm text-suave">
                      {res!.cantidad} {res!.cantidad === 1 ? "salida" : "salidas"}
                    </span>
                  </div>
                  <Barra ancho={maxMin ? Math.round((res!.minutos / maxMin) * 100) : 0} />
                  <p className="text-xs text-suave">
                    {res!.minutos ? formatoDuracion(res!.minutos) : "sin horarios"} · asistencia {porcentaje(res!.presentes, res!.total) ?? "—"}%
                    {viento !== null && ` · viento ${formatoNota(viento)} kn`}
                    {nota !== null && ` · nota ${formatoNota(nota)}`}
                  </p>
                </Link>
              ))
          )}
        </section>
      )}

      {direcciones.length > 0 && (
        <section className="caja space-y-3 p-4">
          <h2 className="flex items-center gap-1.5 font-semibold">
            <Wind size={16} aria-hidden /> Viento en las salidas
          </h2>
          <p className="text-sm text-suave">De dónde sopló más seguido{vientoProm !== null && `, con ${formatoNota(vientoProm)} nudos de media`}.</p>
          <ul className="flex flex-wrap gap-2">
            {direcciones.map(([dir, veces]) => (
              <li key={dir} className="chip">
                {dir} · {veces} {veces === 1 ? "vez" : "veces"}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="caja space-y-4 p-4">
        <div>
          <h2 className="flex items-center gap-1.5 font-semibold">
            <Waves size={16} aria-hidden /> Regatas
          </h2>
          <p className="text-sm text-suave">Los días marcados como regata: condiciones y cómo les fue a los chicos en cada fase.</p>
        </div>
        {regatas.length === 0 ? (
          <p className="text-sm text-suave">No hay días de regata en este período. Se marcan en la Jornada, eligiendo "Día de regata".</p>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-[12px] bg-borde/40 p-3">
                <p className="text-xs text-suave">Regatas</p>
                <p className="text-xl font-semibold">{regatas.length}</p>
              </div>
              <div className="rounded-[12px] bg-borde/40 p-3">
                <p className="text-xs text-suave">Viento medio</p>
                <p className="text-xl font-semibold">{promedio(nudosRegata) === null ? "—" : `${formatoNota(promedio(nudosRegata))} kn`}</p>
              </div>
              <div className="rounded-[12px] bg-borde/40 p-3">
                <p className="text-xs text-suave">Corriente media</p>
                <p className="text-xl font-semibold">{promedio(corrientes) === null ? "—" : `${formatoNota(promedio(corrientes))} kn`}</p>
              </div>
            </div>
            {fasesRegata.length === 0 ? (
              <p className="text-sm text-suave">Todavía no se calificó ninguna fase.</p>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-suave">
                  Lo más flojo primero: <strong className="font-medium text-texto">{fasesRegata[0].nombre}</strong> es la fase que más hay que trabajar.
                </p>
                {fasesRegata.map((f) => (
                  <div key={f.faseId} className="space-y-1.5">
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="font-medium">{f.nombre}</span>
                      <span className="text-suave">{f.pctBien}% bien · {f.total} {f.total === 1 ? "calificación" : "calificaciones"}</span>
                    </div>
                    <div className="flex h-2.5 overflow-hidden rounded-full bg-borde" role="img" aria-label={`${f.malas} malas, ${f.regulares} regulares, ${f.bien} bien`}>
                      <div className="bg-peligro" style={{ width: `${(f.malas / f.total) * 100}%` }} />
                      <div className="bg-alerta" style={{ width: `${(f.regulares / f.total) * 100}%` }} />
                      <div className="bg-ok" style={{ width: `${(f.bien / f.total) * 100}%` }} />
                    </div>
                  </div>
                ))}
                <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-suave">
                  <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-peligro" /> Mala</span>
                  <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-alerta" /> Regular</span>
                  <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-ok" /> Bien</span>
                </p>
              </div>
            )}
          </>
        )}
      </section>

      {categoria && (
        <section className="caja space-y-1 p-4">
          <h2 className="mb-1 flex items-center gap-2 font-semibold">
            <LogoClase nombre={categoria.nombre} tam={22} /> {categoria.nombre}: por alumno
          </h2>
          {alumnosFiltro.length === 0 ? (
            <p className="text-sm text-suave">No hay alumnos en esta categoría.</p>
          ) : (
            <ul className="divide-y divide-borde">
              {alumnosFiltro.map((a) => {
                const s = statsAlumno.get(a.id);
                const serieNotas = notasPorAlumno.get(a.id) ?? [];
                const d = tendencia(serieNotas);
                const estadoAvance =
                  serieNotas.length === 0 ? { t: "Sin evaluar", c: "chip-neutro" }
                  : d === null ? { t: "1ª evaluación", c: "chip-neutro" }
                  : d > 0.05 ? { t: `Mejoró ${formatoTendencia(d)}`, c: "chip-ok" }
                  : d < -0.05 ? { t: `Bajó ${formatoTendencia(d)}`, c: "chip-alerta" }
                  : { t: "Igual", c: "chip-neutro" };
                return (
                  <li key={a.id}>
                    <Link href={`/alumnos/${a.id}`} className="flex items-center gap-3 py-2.5 transition-colors hover:text-acento">
                      <Avatar nombre={a.nombre} tam={32} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{a.nombre}</p>
                        <p className="text-xs text-suave">
                          {s ? `${s.presentes}/${s.total} salidas · ${s.minutos ? formatoDuracion(s.minutos) : "sin horas"}` : "sin salidas en el período"}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-semibold">{serieNotas.length ? formatoNota(serieNotas.at(-1)!) : "—"}</p>
                        <span className={`chip ${estadoAvance.c} !px-2 !py-0 text-xs`}>{estadoAvance.t}</span>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

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
