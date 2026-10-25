"use client";

import { useActionState, useEffect, useState } from "react";
import { ChevronDown, Check, Clock, MessageSquare, MessageSquareText, Waves, Wind } from "lucide-react";
import { Avatar } from "@/components/avatar";
import { guardarEntrenamiento, type EstadoEntrenamiento } from "./actions";
import { DIRECCIONES_VIENTO, formatoDuracion, minutosEntre } from "@/lib/calculos";

type Props = {
  fecha: string;
  categoriaId: string;
  alumnos: { id: string; nombre: string }[];
  temas: { id: string; nombre: string }[];
  fases: { id: string; nombre: string }[];
  inicial: {
    tipo: "ENTRENAMIENTO" | "REGATA";
    plan: string;
    resumen: string;
    horaBajada: string;
    horaRegreso: string;
    vientoDir: string;
    vientoNudos: string;
    corrienteDir: string;
    corrienteNudos: string;
    realizado: boolean;
    existe: boolean;
    temasPlan: string[];
    temasHecho: string[];
    presentes: string[];
    notas: Record<string, string>;
    /** "alumnoId|faseId" -> 1 mala, 2 regular, 3 bien */
    califs: Record<string, number>;
  };
};

const NIVELES = [
  { valor: 1, texto: "Mala", activo: "bg-peligro text-[#fff] border-peligro dark:text-[#1a0a09]" },
  { valor: 2, texto: "Regular", activo: "bg-alerta text-[#fff] border-alerta dark:text-[#241606]" },
  { valor: 3, texto: "Bien", activo: "bg-ok text-[#fff] border-ok dark:text-[#06180e]" },
] as const;

/** Hora actual de Argentina como "HH:mm". */
function ahora(): string {
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
}

function alternarEn(set: Set<string>, id: string): Set<string> {
  const n = new Set(set);
  if (n.has(id)) n.delete(id);
  else n.add(id);
  return n;
}

export function FormularioEntrenamiento({ fecha, categoriaId, alumnos, temas, fases, inicial }: Props) {
  const accion = guardarEntrenamiento.bind(null, fecha, categoriaId);
  const [estado, enviar, pendiente] = useActionState<EstadoEntrenamiento, FormData>(accion, {});
  // Todos los campos son controlados: al terminar una acción React reinicia los
  // campos no controlados a su valor inicial y se vería como si se hubiera borrado lo guardado.
  const [tipo, setTipo] = useState(inicial.tipo);
  const [bajada, setBajada] = useState(inicial.horaBajada);
  const [regreso, setRegreso] = useState(inicial.horaRegreso);
  const [vientoDir, setVientoDir] = useState(inicial.vientoDir);
  const [vientoNudos, setVientoNudos] = useState(inicial.vientoNudos);
  const [corrienteDir, setCorrienteDir] = useState(inicial.corrienteDir);
  const [corrienteNudos, setCorrienteNudos] = useState(inicial.corrienteNudos);
  const [presentes, setPresentes] = useState(() => new Set(inicial.presentes));
  const [plan, setPlan] = useState(inicial.plan);
  const [resumen, setResumen] = useState(inicial.resumen);
  const [temasPlan, setTemasPlan] = useState(() => new Set(inicial.temasPlan));
  const [temasHecho, setTemasHecho] = useState(() => new Set(inicial.temasHecho));
  const [notas, setNotas] = useState<Record<string, string>>(inicial.notas);
  const [califs, setCalifs] = useState<Record<string, number>>(inicial.califs);
  // Cuáles tienen expandida la observación / la calificación por fase (se reinicia al navegar).
  const [abiertas, setAbiertas] = useState<Set<string>>(() => new Set(Object.keys(inicial.notas).filter((k) => inicial.notas[k])));
  const [calificando, setCalificando] = useState<Set<string>>(() => new Set());

  const esRegata = tipo === "REGATA";

  // Cambios sin guardar: se compara todo lo cargado contra lo último guardado. Mientras haya
  // diferencias, el navegador avisa antes de cerrar o recargar (cargar una jornada lleva trabajo).
  const instantanea = JSON.stringify([
    tipo, bajada, regreso, vientoDir, vientoNudos, corrienteDir, corrienteNudos, plan, resumen,
    [...presentes].sort(), [...temasPlan].sort(), [...temasHecho].sort(), notas, califs,
  ]);
  const [base, setBase] = useState(instantanea);
  const sinGuardar = instantanea !== base;
  // Cuando llega un resultado nuevo de guardado, lo cargado pasa a ser la nueva base.
  const [estadoVisto, setEstadoVisto] = useState(estado);
  if (estado !== estadoVisto) {
    setEstadoVisto(estado);
    if (estado.guardado) setBase(instantanea);
  }
  useEffect(() => {
    if (!sinGuardar) return;
    const avisar = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", avisar);
    return () => window.removeEventListener("beforeunload", avisar);
  }, [sinGuardar]);
  const minutos = minutosEntre(bajada, regreso);
  const todos = alumnos.length > 0 && presentes.size === alumnos.length;

  function calificar(alumnoId: string, faseId: string, valor: number) {
    const clave = `${alumnoId}|${faseId}`;
    // Actualización funcional: si se tocan dos fases muy seguido, ninguna pisa a la otra.
    setCalifs((prev) => {
      const n = { ...prev };
      if (n[clave] === valor) delete n[clave]; // tocar de nuevo la opción elegida la borra
      else n[clave] = valor;
      return n;
    });
  }

  const selectorTipo = (
    <div role="radiogroup" aria-label="Tipo de jornada" className="grid grid-cols-2 gap-1 rounded-[12px] border border-borde bg-superficie p-1">
      {[
        { valor: "ENTRENAMIENTO" as const, texto: "Entrenamiento", Icono: Clock },
        { valor: "REGATA" as const, texto: "Día de regata", Icono: Waves },
      ].map(({ valor, texto, Icono }) => (
        <label key={valor} className="cursor-pointer">
          <input type="radio" name="tipo" value={valor} checked={tipo === valor} onChange={() => setTipo(valor)} className="peer sr-only" />
          <span className="flex min-h-11 items-center justify-center gap-2 rounded-[9px] text-sm font-medium text-suave transition-[background-color,color] duration-[160ms] peer-checked:bg-acento peer-checked:text-[#fff] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-acento dark:peer-checked:text-[#06202e]">
            <Icono size={16} aria-hidden /> {texto}
          </span>
        </label>
      ))}
    </div>
  );

  const seccionEnElAgua = (
    <section className="caja space-y-3 p-4">
      <h2 className="font-semibold">En el agua</h2>
      <div className="grid grid-cols-2 gap-3">
        {[
          { id: "horaBajada", texto: "Bajada", valor: bajada, set: setBajada },
          { id: "horaRegreso", texto: "Regreso", valor: regreso, set: setRegreso },
        ].map((c) => (
          <div key={c.id}>
            <label htmlFor={c.id} className="etiqueta">{c.texto}</label>
            <input id={c.id} name={c.id} type="time" value={c.valor} onChange={(e) => c.set(e.target.value)} className="campo" />
            <button type="button" onClick={() => c.set(ahora())} className="boton mt-2 w-full">
              <Clock size={16} aria-hidden /> Ahora
            </button>
          </div>
        ))}
      </div>
      {minutos !== null && (
        <p className="text-sm text-suave">
          Tiempo en el agua: <strong className="text-texto">{formatoDuracion(minutos)}</strong>
        </p>
      )}
      <div className="border-t border-borde pt-3">
        <p className="etiqueta flex items-center gap-1.5">
          <Wind size={14} aria-hidden /> Viento del día
        </p>
        <div className="grid grid-cols-[1fr_1fr] gap-3">
          <div>
            <label htmlFor="vientoDir" className="sr-only">Dirección del viento</label>
            <select id="vientoDir" name="vientoDir" value={vientoDir} onChange={(e) => setVientoDir(e.target.value)} className="campo">
              <option value="">Dirección</option>
              {DIRECCIONES_VIENTO.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
          <div className="relative">
            <label htmlFor="vientoNudos" className="sr-only">Nudos de viento</label>
            <input id="vientoNudos" name="vientoNudos" type="number" inputMode="numeric" min={0} max={80} placeholder="Nudos" value={vientoNudos} onChange={(e) => setVientoNudos(e.target.value)} className="campo pr-12" />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-suave">kn</span>
          </div>
        </div>
      </div>
      {(
        <div className="border-t border-borde pt-3">
          <p className="etiqueta flex items-center gap-1.5">
            <Waves size={14} aria-hidden /> Corriente
          </p>
          <div className="grid grid-cols-[1fr_1fr] gap-3">
            <div>
              <label htmlFor="corrienteDir" className="sr-only">Dirección de la corriente</label>
              <select id="corrienteDir" name="corrienteDir" value={corrienteDir} onChange={(e) => setCorrienteDir(e.target.value)} className="campo">
                <option value="">Dirección</option>
                {DIRECCIONES_VIENTO.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <div className="relative">
              <label htmlFor="corrienteNudos" className="sr-only">Nudos de corriente</label>
              <input id="corrienteNudos" name="corrienteNudos" type="number" inputMode="decimal" min={0} max={9.9} step={0.1} placeholder="Nudos" value={corrienteNudos} onChange={(e) => setCorrienteNudos(e.target.value)} className="campo pr-12" />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-suave">kn</span>
            </div>
          </div>
        </div>
      )}
    </section>
  );

  const seccionAsistencia = (
    <section className="caja space-y-3 p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-semibold">
          {esRegata ? "Asistencia y calificación" : "Asistencia"}{" "}
          <span className="font-normal text-suave">· {presentes.size}/{alumnos.length}</span>
        </h2>
        {alumnos.length > 0 && (
          <button type="button" className="boton !min-h-9 text-sm" onClick={() => setPresentes(todos ? new Set() : new Set(alumnos.map((a) => a.id)))}>
            {todos ? "Desmarcar todos" : "Marcar todos"}
          </button>
        )}
      </div>
      {esRegata && (
        <p className="text-sm text-suave">
          Marcá quiénes corrieron y, con el botón de la derecha, calificá cada fase de la regata: mala, regular o bien.
        </p>
      )}
      {alumnos.length === 0 ? (
        <p className="text-sm text-suave">Esta categoría todavía no tiene alumnos. Cargalos en la sección Alumnos.</p>
      ) : (
        <ul className="divide-y divide-borde rounded-[12px] border border-borde">
          {alumnos.map((a) => {
            const nota = notas[a.id] ?? "";
            const tieneNota = nota.trim().length > 0;
            const abierta = abiertas.has(a.id);
            const Icono = tieneNota ? MessageSquareText : MessageSquare;
            const calificadas = fases.filter((f) => califs[`${a.id}|${f.id}`]).length;
            const abreFases = calificando.has(a.id);
            return (
              <li key={a.id}>
                <input type="hidden" name="alumno" value={a.id} />
                <div className="flex min-h-12 items-center gap-2 px-3 py-2">
                  <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
                    <input
                      type="checkbox"
                      name="presente"
                      value={a.id}
                      checked={presentes.has(a.id)}
                      onChange={() => setPresentes((p) => alternarEn(p, a.id))}
                      className="size-5 shrink-0 accent-[var(--acento)]"
                    />
                    <Avatar nombre={a.nombre} tam={28} />
                    <span className="truncate">{a.nombre}</span>
                  </label>
                  {esRegata && fases.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setCalificando((c) => alternarEn(c, a.id))}
                      aria-expanded={abreFases}
                      className={`flex h-9 shrink-0 items-center gap-1 rounded-full px-2.5 text-xs font-medium transition-colors ${
                        calificadas > 0 ? "bg-acento-suave text-acento" : "bg-borde/50 text-suave hover:text-texto"
                      }`}
                    >
                      Calificar {calificadas > 0 && <span>{calificadas}/{fases.length}</span>}
                      <ChevronDown size={14} aria-hidden className={`transition-transform duration-[200ms] ${abreFases ? "rotate-180" : ""}`} />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setAbiertas((c) => alternarEn(c, a.id))}
                    aria-expanded={abierta}
                    aria-label={tieneNota ? `Observación de ${a.nombre}` : `Agregar observación sobre ${a.nombre}`}
                    className={`flex size-9 shrink-0 items-center justify-center rounded-full transition-colors ${
                      tieneNota ? "text-acento" : "text-suave hover:text-texto"
                    }`}
                  >
                    <Icono size={18} aria-hidden />
                  </button>
                </div>

                {esRegata && abreFases && (
                  <div className="aparecer space-y-3 border-t border-borde bg-fondo/60 px-3 py-3">
                    {fases.map((f) => {
                      const clave = `${a.id}|${f.id}`;
                      const actual = califs[clave];
                      return (
                        <div key={f.id}>
                          <p className="mb-1 text-sm font-medium">{f.nombre}</p>
                          <div className="grid grid-cols-3 gap-2">
                            {NIVELES.map((n) => (
                              <button
                                key={n.valor}
                                type="button"
                                aria-pressed={actual === n.valor}
                                onClick={() => calificar(a.id, f.id, n.valor)}
                                className={`h-10 rounded-[10px] border text-sm font-medium transition-[background-color,border-color,transform] duration-[120ms] active:scale-95 ${
                                  actual === n.valor ? n.activo : "border-borde bg-superficie text-suave hover:text-texto"
                                }`}
                              >
                                {n.texto}
                              </button>
                            ))}
                          </div>
                          {actual && <input type="hidden" name={`fase_${a.id}__${f.id}`} value={actual} />}
                        </div>
                      );
                    })}
                  </div>
                )}

                {abierta && (
                  <div className="aparecer px-3 pb-3">
                    <textarea
                      name={`nota_${a.id}`}
                      rows={2}
                      value={nota}
                      onChange={(e) => setNotas((n) => ({ ...n, [a.id]: e.target.value }))}
                      placeholder={`Algo sobre ${a.nombre.split(" ")[0]}…`}
                      className="campo text-sm"
                      maxLength={500}
                    />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );

  const seccionPlanYTemas = (
    <section className="caja space-y-3 p-4">
      <h2 className="font-semibold">{esRegata ? "Plan" : "Plan y temas"}</h2>
      <div>
        <label htmlFor="plan" className="etiqueta">{esRegata ? "Qué se espera de la jornada" : "Qué se piensa hacer"}</label>
        <textarea id="plan" name="plan" rows={3} value={plan} onChange={(e) => setPlan(e.target.value)} className="campo" placeholder="Ej.: salir a boyas, práctica de largadas…" />
      </div>
      {esRegata ? (
        // Un día de regata no lleva temas, pero si el día ya los tenía se conservan.
        <>
          {[...temasPlan].map((id) => <input key={`p${id}`} type="hidden" name="temaPlan" value={id} />)}
          {[...temasHecho].map((id) => <input key={`h${id}`} type="hidden" name="temaHecho" value={id} />)}
        </>
      ) : (
        <fieldset>
          <div className="mb-2 flex items-center justify-between gap-2">
            <legend className="etiqueta !mb-0">Temas</legend>
            {temas.length > 0 && temasPlan.size > 0 && (
              <button
                type="button"
                onClick={() => setTemasHecho(new Set([...temasHecho, ...temasPlan]))}
                className="text-xs font-medium text-acento underline-offset-4 hover:underline"
              >
                Copiar plan → hecho
              </button>
            )}
          </div>
          {temas.length === 0 ? (
            <p className="text-sm text-suave">No hay temas cargados (se editan en Ajustes).</p>
          ) : (
            <div className="divide-y divide-borde rounded-[12px] border border-borde">
              <div className="grid grid-cols-[1fr_auto_auto] items-center gap-4 px-3 py-1.5 text-xs font-medium text-suave">
                <span>Tema</span>
                <span className="w-14 text-center">Plan</span>
                <span className="w-14 text-center">Hecho</span>
              </div>
              {temas.map((t) => (
                <div key={t.id} className="grid grid-cols-[1fr_auto_auto] items-center gap-4 px-3">
                  <span className="py-2.5">{t.nombre}</span>
                  <label className="flex h-11 w-14 cursor-pointer items-center justify-center">
                    <input type="checkbox" name="temaPlan" aria-label={`${t.nombre}: planificado`} value={t.id} checked={temasPlan.has(t.id)} onChange={() => setTemasPlan(alternarEn(temasPlan, t.id))} className="size-5 accent-[var(--acento)]" />
                  </label>
                  <label className="flex h-11 w-14 cursor-pointer items-center justify-center">
                    <input type="checkbox" name="temaHecho" aria-label={`${t.nombre}: realizado`} value={t.id} checked={temasHecho.has(t.id)} onChange={() => setTemasHecho(alternarEn(temasHecho, t.id))} className="size-5 accent-[var(--acento)]" />
                  </label>
                </div>
              ))}
            </div>
          )}
        </fieldset>
      )}
    </section>
  );

  const seccionResumen = (
    <section className="caja p-4">
      <label htmlFor="resumen" className="etiqueta">{esRegata ? "Cómo salió la regata / observaciones" : "Cómo salió / observaciones"}</label>
      <textarea id="resumen" name="resumen" rows={3} value={resumen} onChange={(e) => setResumen(e.target.value)} className="campo" placeholder="Qué funcionó, qué hay que repetir…" />
    </section>
  );

  return (
    <form action={enviar} className="space-y-5">
      {selectorTipo}
      {/* Orden pensado para el día: 1) horarios y condiciones, 2) asistencia (y en regata, la
          calificación por fase), 3) plan y temas, 4) cómo salió. */}
      {seccionEnElAgua}
      {seccionAsistencia}
      {seccionPlanYTemas}
      {seccionResumen}

      {sinGuardar && !estado.error && (
        <p className="text-sm text-alerta">Hay cambios sin guardar.</p>
      )}
      {estado.error && <p role="alert" className="confirmar text-sm text-peligro">{estado.error}</p>}
      {estado.guardado && (
        <p role="status" className="confirmar flex items-center gap-1.5 text-sm text-ok">
          <Check size={16} aria-hidden />
          {estado.guardado === "realizado" ? "Guardado como realizado." : "Plan guardado."}
        </p>
      )}

      <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] -mx-4 flex gap-3 border-t border-borde bg-fondo/95 px-4 py-3 backdrop-blur md:static md:mx-0 md:border-0 md:bg-transparent md:px-0 md:py-0">
        <button type="submit" name="accion" value="plan" disabled={pendiente} className="boton flex-1">
          Guardar plan
        </button>
        <button type="submit" name="accion" value="realizado" disabled={pendiente} className="boton boton-primario flex-1">
          {inicial.realizado ? "Actualizar realizado" : "Dar por realizado"}
        </button>
      </div>
    </form>
  );
}
