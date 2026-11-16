// Control de versiones de un entrenamiento: cuando dos personas (o dos pantallas) lo editan a la vez,
// el segundo guardado no tiene que pisar en silencio lo que ya estaba. La "versión" es el momento
// de la última modificación; el formulario manda la que tenía al abrirse.

/** "0" = el entrenamiento todavía no existía cuando se abrió el formulario. */
export const versionDe = (modificado: Date | null | undefined): string => (modificado ? String(modificado.getTime()) : "0");

/**
 * ¿Cambió desde que se abrió el formulario? Si el formulario no informó versión (una pantalla vieja
 * abierta antes de esta mejora) no se puede comparar y se deja guardar como siempre.
 */
export function hayConflicto(versionDelFormulario: string, modificadoAhora: Date | null | undefined): boolean {
  if (versionDelFormulario === "") return false;
  return versionDelFormulario !== versionDe(modificadoAhora);
}

/** "HH:mm" en hora de Argentina. */
export function horaArgentina(fecha: Date): string {
  return new Intl.DateTimeFormat("es-AR", { timeZone: "America/Argentina/Buenos_Aires", hour: "2-digit", minute: "2-digit", hour12: false }).format(fecha);
}
