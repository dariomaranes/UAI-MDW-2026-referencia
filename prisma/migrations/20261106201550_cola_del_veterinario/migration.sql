-- La cola del veterinario: las solicitudes pendientes, las más viejas primero.
-- Medido con `npm run db:carga` (5.000 esperando): ~1 ms sin este índice,
-- 0,09 ms con él. Ver el comentario en el modelo Certificado.
-- CreateIndex
CREATE INDEX "Certificado_estado_solicitadoEn_idx" ON "Certificado"("estado", "solicitadoEn");
