import { describe, it, expect } from "vitest";
import { armarCsv, celdaCsv } from "../csv";

describe("celdaCsv", () => {
  it("entrecomilla lo que tiene separador, comillas o saltos de línea", () => {
    expect(celdaCsv("a;b")).toBe('"a;b"');
    expect(celdaCsv('dijo "hola"')).toBe('"dijo ""hola"""');
    expect(celdaCsv("uno\ndos")).toBe('"uno\ndos"');
    expect(celdaCsv("normal")).toBe("normal");
  });
  it("neutraliza fórmulas pero no toca los números", () => {
    expect(celdaCsv("=SUMA(A1:A2)")).toBe("'=SUMA(A1:A2)");
    expect(celdaCsv("+54 11")).toBe("'+54 11");
    expect(celdaCsv("@x")).toBe("'@x");
    expect(celdaCsv(-3)).toBe("-3");
    expect(celdaCsv(7.5)).toBe("7.5");
  });
  it("vacíos y booleanos", () => {
    expect(celdaCsv(null)).toBe("");
    expect(celdaCsv(undefined)).toBe("");
    expect(celdaCsv(true)).toBe("true");
  });
});

describe("armarCsv", () => {
  it("lleva BOM, separador ; y CRLF", () => {
    const csv = armarCsv(["Fecha", "Alumno"], [["2026-10-03", "Ana; Pérez"]]);
    expect(csv.startsWith("﻿")).toBe(true);
    expect(csv).toBe('﻿Fecha;Alumno\r\n2026-10-03;"Ana; Pérez"\r\n');
  });
});
