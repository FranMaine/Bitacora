// CSV que Excel en español abre bien: separador ";" (el de la configuración regional argentina),
// BOM UTF-8 para que respete las tildes y saltos de línea CRLF.

const SEPARADOR = ";";

/** Una celda lista para escribir: entrecomillada si hace falta, y a prueba de "inyección de fórmulas". */
export function celdaCsv(valor: string | number | boolean | null | undefined): string {
  if (valor === null || valor === undefined) return "";
  let t = String(valor);
  // Un texto que empieza con = + - @ lo interpretaría Excel como fórmula (los nombres y comentarios los escribe
  // cualquier instructor): se le antepone un apóstrofo. Los números reales no pasan por acá.
  if (typeof valor === "string" && /^[=+\-@\t\r]/.test(t)) t = `'${t}`;
  if (/[";\r\n]/.test(t)) t = `"${t.replace(/"/g, '""')}"`;
  return t;
}

export function armarCsv(encabezado: string[], filas: (string | number | boolean | null | undefined)[][]): string {
  const lineas = [encabezado, ...filas].map((f) => f.map(celdaCsv).join(SEPARADOR));
  return "﻿" + lineas.join("\r\n") + "\r\n";
}
