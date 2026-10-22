"use client";

import { useActionState, useState } from "react";
import { Check, Clock, MessageSquare, MessageSquareText, Wind } from "lucide-react";
import { Avatar } from "@/components/avatar";
import { guardarEntrenamiento, type EstadoEntrenamiento } from "./actions";
import { DIRECCIONES_VIENTO, formatoDuracion, minutosEntre } from "@/lib/calculos";

type Props = {
  fecha: string;
  categoriaId: string;
  alumnos: { id: string; nombre: string }[];
  temas: { id: string; nombre: string }[];
  inicial: {
    plan: string;
    resumen: string;
    horaBajada: string;
    horaRegreso: string;
    vientoDir: string;
    vientoNudos: string;
    realizado: boolean;
    existe: boolean;
    temasPlan: string[];
    temasHecho: string[];
    presentes: string[];
    notas: Record<string, string>;
  };
};

/** Hora actual de Argentina como "HH:mm". */
function ahora(): string {
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
}

export function FormularioEntrenamiento({ fecha, categoriaId, alumnos, temas, inicial }: Props) {
  const accion = guardarEntrenamiento.bind(null, fecha, categoriaId);
  const [estado, enviar, pendiente] = useActionState<EstadoEntrenamiento, FormData>(accion, {});
  const [bajada, setBajada] = useState(inicial.horaBajada);
  const [regreso, setRegreso] = useState(inicial.horaRegreso);
  const [vientoDir, setVientoDir] = useState(inicial.vientoDir);
  const [vientoNudos, setVientoNudos] = useState(inicial.vientoNudos);
  const [presentes, setPresentes] = useState(() => new Set(inicial.presentes));
  // Todos los campos son controlados: al terminar una acción React reinicia los
  // campos no controlados a su valor inicial y se vería como si se hubiera borrado lo guardado.
  const [plan, setPlan] = useState(inicial.plan);
  const [resumen, setResumen] = useState(inicial.resumen);
  const [temasPlan, setTemasPlan] = useState(() => new Set(inicial.temasPlan));
  const [temasHecho, setTemasHecho] = useState(() => new Set(inicial.temasHecho));
  const [notas, setNotas] = useState<Record<string, string>>(inicial.notas);
  // Cuáles tienen el textarea expandido ahora mismo (vuelve a su estado al navegar).
  const [abiertas, setAbiertas] = useState<Set<string>>(() => new Set(Object.keys(inicial.notas).filter((k) => inicial.notas[k])));

  const minutos = minutosEntre(bajada, regreso);
  const todos = alumnos.length > 0 && presentes.size === alumnos.length;

  function alternar(set: Set<string>, setSet: (s: Set<string>) => void, id: string) {
    const n = new Set(set);
    if (n.has(id)) n.delete(id);
    else n.add(id);
    setSet(n);
  }

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
            <label htmlFor="vientoDir" className="sr-only">Dirección</label>
            <select id="vientoDir" name="vientoDir" value={vientoDir} onChange={(e) => setVientoDir(e.target.value)} className="campo">
              <option value="">Dirección</option>
              {DIRECCIONES_VIENTO.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
          <div className="relative">
            <label htmlFor="vientoNudos" className="sr-only">Nudos</label>
            <input
              id="vientoNudos"
              name="vientoNudos"
              type="number"
              inputMode="numeric"
              min={0}
              max={80}
              placeholder="Nudos"
              value={vientoNudos}
              onChange={(e) => setVientoNudos(e.target.value)}
              className="campo pr-12"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-suave">kn</span>
          </div>
        </div>
      </div>
    </section>
  );

  const seccionAsistencia = (
    <section className="caja space-y-3 p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-semibold">
          Asistencia <span className="font-normal text-suave">· {presentes.size}/{alumnos.length}</span>
        </h2>
        {alumnos.length > 0 && (
          <button type="button" className="boton !min-h-9 text-sm" onClick={() => setPresentes(todos ? new Set() : new Set(alumnos.map((a) => a.id)))}>
            {todos ? "Desmarcar todos" : "Marcar todos"}
          </button>
        )}
      </div>
      {alumnos.length === 0 ? (
        <p className="text-sm text-suave">Esta categoría todavía no tiene alumnos. Cargalos en la sección Alumnos.</p>
      ) : (
        <ul className="divide-y divide-borde rounded-[12px] border border-borde">
          {alumnos.map((a) => {
            const nota = notas[a.id] ?? "";
            const tieneNota = nota.trim().length > 0;
            const abierta = abiertas.has(a.id);
            const Icono = tieneNota ? MessageSquareText : MessageSquare;
            return (
              <li key={a.id}>
                <input type="hidden" name="alumno" value={a.id} />
                <div className="flex min-h-12 items-center gap-3 px-3 py-2">
                  <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
                    <input
                      type="checkbox"
                      name="presente"
                      value={a.id}
                      checked={presentes.has(a.id)}
                      onChange={() => alternar(presentes, setPresentes, a.id)}
                      className="size-5 shrink-0 accent-[var(--acento)]"
                    />
                    <Avatar nombre={a.nombre} tam={28} />
                    <span className="truncate">{a.nombre}</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const n = new Set(abiertas);
                      if (n.has(a.id)) n.delete(a.id);
                      else n.add(a.id);
                      setAbiertas(n);
                    }}
                    aria-expanded={abierta}
                    aria-label={tieneNota ? `Observación de ${a.nombre}` : `Agregar observación sobre ${a.nombre}`}
                    className={`flex size-9 shrink-0 items-center justify-center rounded-full transition-colors ${
                      tieneNota ? "text-acento" : "text-suave hover:text-texto"
                    }`}
                  >
                    <Icono size={18} aria-hidden />
                  </button>
                </div>
                {abierta && (
                  <div className="aparecer px-3 pb-3">
                    <textarea
                      name={`nota_${a.id}`}
                      rows={2}
                      value={nota}
                      onChange={(e) => setNotas({ ...notas, [a.id]: e.target.value })}
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
      <h2 className="font-semibold">Plan y temas</h2>
      <div>
        <label htmlFor="plan" className="etiqueta">Qué se piensa hacer</label>
        <textarea id="plan" name="plan" rows={3} value={plan} onChange={(e) => setPlan(e.target.value)} className="campo" placeholder="Ej.: salir a boyas, práctica de largadas…" />
      </div>
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
                  <input type="checkbox" name="temaPlan" aria-label={`${t.nombre}: planificado`} value={t.id} checked={temasPlan.has(t.id)} onChange={() => alternar(temasPlan, setTemasPlan, t.id)} className="size-5 accent-[var(--acento)]" />
                </label>
                <label className="flex h-11 w-14 cursor-pointer items-center justify-center">
                  <input type="checkbox" name="temaHecho" aria-label={`${t.nombre}: realizado`} value={t.id} checked={temasHecho.has(t.id)} onChange={() => alternar(temasHecho, setTemasHecho, t.id)} className="size-5 accent-[var(--acento)]" />
                </label>
              </div>
            ))}
          </div>
        )}
      </fieldset>
    </section>
  );

  const seccionResumen = (
    <section className="caja p-4">
      <label htmlFor="resumen" className="etiqueta">Cómo salió / observaciones</label>
      <textarea id="resumen" name="resumen" rows={3} value={resumen} onChange={(e) => setResumen(e.target.value)} className="campo" placeholder="Qué funcionó, qué hay que repetir…" />
    </section>
  );

  return (
    <form action={enviar} className="space-y-5">
      {/* Orden pensado para el día del entrenamiento:
          1) Horarios (lo primero que se completa al volver del agua)
          2) Asistencia (quiénes vinieron, con observación por chico)
          3) Plan y temas (lo que se piensa + lo que terminó haciéndose)
          4) Cómo salió (observaciones generales del grupo) */}
      {seccionEnElAgua}
      {seccionAsistencia}
      {seccionPlanYTemas}
      {seccionResumen}

      {estado.error && <p role="alert" className="confirmar text-sm text-peligro">{estado.error}</p>}
      {estado.guardado && (
        <p role="status" className="confirmar flex items-center gap-1.5 text-sm text-ok">
          <Check size={16} aria-hidden />
          {estado.guardado === "realizado" ? "Entrenamiento guardado como realizado." : "Plan guardado."}
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
