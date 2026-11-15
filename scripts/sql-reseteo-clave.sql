-- Tabla de links de recuperación de contraseña (por mail).
CREATE TABLE IF NOT EXISTS "ReseteoClave" (
  "id" TEXT NOT NULL,
  "instructorId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiraEn" TIMESTAMP(3) NOT NULL,
  "usadoEn" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ReseteoClave_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ReseteoClave_instructorId_fkey" FOREIGN KEY ("instructorId") REFERENCES "Instructor"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "ReseteoClave_tokenHash_key" ON "ReseteoClave"("tokenHash");
CREATE INDEX IF NOT EXISTS "ReseteoClave_instructorId_idx" ON "ReseteoClave"("instructorId");
