-- Botes 2 a 8, costo de reparación y criterios de evaluación del club (migración puntual, ya aplicada).
ALTER TABLE "Mantenimiento" ADD COLUMN IF NOT EXISTS "costo" INTEGER;

INSERT INTO "Embarcacion" (id, nombre, orden, activa) VALUES
  ('emb_bote_2', 'Bote 2', 2, true), ('emb_bote_3', 'Bote 3', 3, true), ('emb_bote_4', 'Bote 4', 4, true),
  ('emb_bote_5', 'Bote 5', 5, true), ('emb_bote_6', 'Bote 6', 6, true), ('emb_bote_7', 'Bote 7', 7, true),
  ('emb_bote_8', 'Bote 8', 8, true)
ON CONFLICT (nombre) DO NOTHING;

-- lo que ya se había cargado en el "Gomón" pasa al bote que nombra la observación (o al Bote 2)
UPDATE "Mantenimiento" SET "embarcacionId" = 'emb_bote_7' WHERE "embarcacionId" = 'emb_gomon' AND descripcion ILIKE 'Bote 7%';
UPDATE "Mantenimiento" SET "embarcacionId" = 'emb_bote_2' WHERE "embarcacionId" = 'emb_gomon';
DELETE FROM "Embarcacion" WHERE id = 'emb_gomon';

-- criterios: se reemplazan los de ejemplo por los del club (solo si todavía no hay evaluaciones cargadas)
DELETE FROM "Criterio" WHERE NOT EXISTS (SELECT 1 FROM "EvaluacionItem");
INSERT INTO "Criterio" (id, nombre, orden, activo)
SELECT 'crit_' || lpad(n::text, 2, '0'), nombre, n, true
FROM (VALUES
  (0, 'Armado y puesta a punto'),
  (1, 'Nomenclatura / teoría'),
  (2, 'Maniobras (trasluchadas - roll tack - viradas de boyas - 720)'),
  (3, 'Llevada en franco c/ viento'),
  (4, 'Llevada en franco c/ calma'),
  (5, 'Llevada en ceñida c/ viento'),
  (6, 'Llevada en ceñida c/ calma'),
  (7, 'Estrategias / tácticas'),
  (8, 'Conocimiento del reglamento - banderas de regata - tipos de recorrido'),
  (9, 'Postura en el barco'),
  (10, 'Desenvolvimiento en situaciones difíciles (problemáticas)'),
  (11, 'Largadas (estrategia, técnicas y tácticas)'),
  (12, 'Técnicas con olas - francos'),
  (13, 'Técnicas con olas - ceñida'),
  (14, 'Comportamiento con compañeros e instructores'),
  (15, 'Cuidado del barco'),
  (16, 'Predisposición a superarse'),
  (17, 'Trabajo en equipo')
) AS v(n, nombre)
WHERE NOT EXISTS (SELECT 1 FROM "EvaluacionItem")
ON CONFLICT (nombre) DO NOTHING;
