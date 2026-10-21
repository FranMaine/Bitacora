import { Check } from "lucide-react";

/** Resultado de un formulario: error en rojo o confirmación en verde. */
export function MensajeForm({ error, ok }: { error?: string; ok?: string }) {
  if (error) return <p role="alert" className="text-sm text-peligro">{error}</p>;
  if (ok)
    return (
      <p role="status" className="flex items-center gap-1.5 text-sm text-ok">
        <Check size={16} aria-hidden /> {ok}
      </p>
    );
  return null;
}
