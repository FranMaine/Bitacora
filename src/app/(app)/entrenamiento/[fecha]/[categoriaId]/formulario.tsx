"use client";

import { useActionState, useState } from "react";
import { Check, Clock } from "lucide-react";
import { guardarEntrenamiento, type EstadoEntrenamiento } from "./actions";
import { formatoDuracion, minutosEntre } from "@/lib/calculos";

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
    realizado: boolean;
    existe: boolean;
    temasPlan: string[];
    temasHecho: string[];
    presentes: string[];
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
  const [presentes, setPresentes] = useState(() => new Set(inicial.presentes));
  // Todos los campos son controlados: al terminar una acción React reinicia los
  // campos no controlados a su valor inicial y se vería como si se hubiera borrado lo guardado.
  const [plan, setPlan] = useState(inicial.plan);
  const [resumen, setResumen] = useState(inicial.resumen);
  const [temasPlan, setTemasPlan] = useState(() => new Set(inicial.temasPlan));
  const [temasHecho, setTemasHecho] = useState(() => new Set(inicial.temasHecho));

  const minutos = minutosEntre(bajada, regreso);
  const todos = alumnos.length > 0 && presentes.size === alumnos.length;

  function alternar(set: Set<string>, setSet: (s: Set<string>) => void, id: string) {
    const n = new Set(set);
    if (n.has(id)) n.delete(id);
    else n.add(id);
    setSet(n);
  }

  return (
    <form action={enviar} className="space-y-5">
      <section className="caja space-y-3 p-4">
        <h2 className="font-semibold">Plan</h2>
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
      </section>

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
            {alumnos.map((a) => (
              <li key={a.id}>
                <input type="hidden" name="alumno" value={a.id} />
                <label className="flex min-h-12 cursor-pointer items-center gap-3 px-3 py-2">
                  <input
                    type="checkbox"
                    name="presente"
                    value={a.id}
                    checked={presentes.has(a.id)}
                    onChange={() => alternar(presentes, setPresentes, a.id)}
                    className="size-5 accent-[var(--acento)]"
                  />
                  <span>{a.nombre}</span>
                </label>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="caja p-4">
        <label htmlFor="resumen" className="etiqueta">Cómo salió / observaciones</label>
        <textarea id="resumen" name="resumen" rows={3} value={resumen} onChange={(e) => setResumen(e.target.value)} className="campo" placeholder="Qué funcionó, qué hay que repetir…" />
      </section>

      {estado.error && <p role="alert" className="text-sm text-peligro">{estado.error}</p>}
      {estado.guardado && (
        <p role="status" className="flex items-center gap-1.5 text-sm text-ok">
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
