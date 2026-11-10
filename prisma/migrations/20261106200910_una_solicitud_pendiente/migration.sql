-- Una sola solicitud pendiente por mascota y motivo (ADR 0002), cumplida por
-- la base y no solo por el código.
--
-- El código ya lo chequeaba: consultaba si había una pendiente y, si no,
-- creaba. Con diez pedidos al mismo tiempo los diez consultan antes de que
-- ninguno cree, y quedan diez (e2e/concurrencia.spec.ts). La base es la única
-- que ve todos los pedidos a la vez, así que la regla tiene que vivir acá.
--
-- Es un índice único PARCIAL: la unicidad vale solo entre las filas en estado
-- SOLICITADO. Un certificado emitido o anulado no cuenta, porque pedir uno
-- nuevo después de emitido es renovarlo, y eso el ADR lo permite.
--
-- Prisma 6 no sabe escribir índices parciales en `schema.prisma`, por eso este
-- SQL está escrito a mano. Ver la nota en el modelo Certificado.
-- 1. Los duplicados que ya existen. Si la carrera pasó alguna vez —y en
--    local pasó: la prueba la provoca—, el índice no se puede crear: la base
--    se niega a prometer algo que hoy ya no cumple. Se queda la solicitud más
--    vieja de cada grupo, que es la que lleva más tiempo esperando, y se
--    borran las demás: son pedidos idénticos que todavía nadie emitió, así
--    que no se pierde nada que no estuviera ya en la que queda.
DELETE FROM "Certificado" c
USING "Certificado" primera
WHERE c."estado" = 'SOLICITADO'
  AND primera."estado" = 'SOLICITADO'
  AND c."mascotaId" = primera."mascotaId"
  AND c."motivo" = primera."motivo"
  AND (c."solicitadoEn", c."id") > (primera."solicitadoEn", primera."id");

-- 2. La regla.
CREATE UNIQUE INDEX "Certificado_una_solicitud_pendiente"
  ON "Certificado" ("mascotaId", "motivo")
  WHERE "estado" = 'SOLICITADO';
