-- ¿Se cumplió el pronóstico del viento? (sí / no / sin responder)
ALTER TABLE "Entrenamiento" ADD COLUMN IF NOT EXISTS "pronosticoCumplido" BOOLEAN;
