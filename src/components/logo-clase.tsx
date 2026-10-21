import Image from "next/image";

// Logos reales de cada clase (public/clases/*.png, fondo transparente). Como las
// categorías son editables desde Ajustes, el nombre puede llegar escrito de
// cualquier forma: buscamos palabras clave en el nombre sin tildes y, si no
// reconocemos ninguna clase, mostramos un círculo neutro con la inicial.

type Slug = "optimist" | "ilca" | "420" | "29er" | "snipe" | "f18" | "grumete";

const ETIQUETA: Record<Slug, string> = {
  optimist: "Optimist",
  ilca: "ILCA",
  "420": "420",
  "29er": "29er",
  snipe: "Snipe",
  f18: "F18",
  grumete: "Grumete",
};

function slugDe(nombre: string): Slug | null {
  const n = nombre
    .toLocaleLowerCase("es")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
  if (n.includes("opti")) return "optimist";
  if (n.includes("29")) return "29er";
  if (/\b420\b/.test(n)) return "420";
  if (n.includes("ilca") || n.includes("laser")) return "ilca";
  if (n.includes("snipe")) return "snipe";
  if (n.includes("f18") || n.includes("catamar")) return "f18";
  if (n.includes("grumete")) return "grumete";
  return null;
}

export function LogoClase({ nombre, tam = 36, className }: { nombre: string; tam?: number; className?: string }) {
  const slug = slugDe(nombre);
  if (!slug) {
    return (
      <span
        aria-hidden
        className={`flex items-center justify-center font-semibold ${className ?? ""}`}
        style={{ width: tam, height: tam, fontSize: Math.round(tam * 0.5) }}
      >
        {nombre.trim().charAt(0).toUpperCase() || "?"}
      </span>
    );
  }
  return (
    <Image
      src={`/clases/${slug}.png`}
      alt={ETIQUETA[slug]}
      width={tam}
      height={tam}
      className={`object-contain ${className ?? ""}`}
      style={{ width: tam, height: tam }}
    />
  );
}
