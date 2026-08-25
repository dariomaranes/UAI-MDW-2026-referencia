-- CreateEnum
CREATE TYPE "Especie" AS ENUM ('PERRO', 'GATO');

-- CreateEnum
CREATE TYPE "MotivoCertificado" AS ENUM ('VIAJE', 'GUARDERIA', 'CONCURSO', 'OTRO');

-- CreateEnum
CREATE TYPE "EstadoCertificado" AS ENUM ('SOLICITADO', 'EMITIDO', 'ANULADO');

-- AlterEnum
BEGIN;
CREATE TYPE "Rol_new" AS ENUM ('DUENO', 'VETERINARIO', 'ADMIN');
ALTER TABLE "Usuario" ALTER COLUMN "rol" DROP DEFAULT;
ALTER TABLE "Usuario" ALTER COLUMN "rol" TYPE "Rol_new" USING ("rol"::text::"Rol_new");
ALTER TYPE "Rol" RENAME TO "Rol_old";
ALTER TYPE "Rol_new" RENAME TO "Rol";
DROP TYPE "Rol_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "Nota" DROP CONSTRAINT "Nota_autorId_fkey";

-- AlterTable
ALTER TABLE "Usuario" ALTER COLUMN "rol" DROP DEFAULT;

-- DropTable
DROP TABLE "Nota";

-- CreateTable
CREATE TABLE "Mascota" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "especie" "Especie" NOT NULL,
    "fechaNacimiento" TIMESTAMP(3) NOT NULL,
    "chip" TEXT,
    "duenoId" TEXT NOT NULL,
    "creadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadaEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Mascota_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vacuna" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "especie" "Especie" NOT NULL,
    "edadMinimaMeses" INTEGER NOT NULL,
    "intervaloRefuerzoDias" INTEGER,
    "obligatoria" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Vacuna_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Aplicacion" (
    "id" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "proximaDosis" TIMESTAMP(3),
    "mascotaId" TEXT NOT NULL,
    "vacunaId" TEXT NOT NULL,
    "veterinarioId" TEXT NOT NULL,
    "observaciones" TEXT,
    "creadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Aplicacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Certificado" (
    "id" TEXT NOT NULL,
    "estado" "EstadoCertificado" NOT NULL DEFAULT 'SOLICITADO',
    "codigoVerificacion" TEXT,
    "motivo" "MotivoCertificado" NOT NULL,
    "detalle" TEXT,
    "solicitadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "emitidoEn" TIMESTAMP(3),
    "anuladoEn" TIMESTAMP(3),
    "vencimiento" TIMESTAMP(3),
    "urlPdf" TEXT,
    "mascotaId" TEXT NOT NULL,
    "emisorId" TEXT,

    CONSTRAINT "Certificado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Veterinaria" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "direccion" TEXT NOT NULL,
    "telefono" TEXT,
    "creadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Veterinaria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_UsuarioToVeterinaria" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_UsuarioToVeterinaria_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "Mascota_chip_key" ON "Mascota"("chip");

-- CreateIndex
CREATE INDEX "Mascota_duenoId_idx" ON "Mascota"("duenoId");

-- CreateIndex
CREATE UNIQUE INDEX "Vacuna_nombre_especie_key" ON "Vacuna"("nombre", "especie");

-- CreateIndex
CREATE INDEX "Aplicacion_mascotaId_idx" ON "Aplicacion"("mascotaId");

-- CreateIndex
CREATE INDEX "Aplicacion_vacunaId_idx" ON "Aplicacion"("vacunaId");

-- CreateIndex
CREATE INDEX "Aplicacion_veterinarioId_idx" ON "Aplicacion"("veterinarioId");

-- CreateIndex
CREATE UNIQUE INDEX "Certificado_codigoVerificacion_key" ON "Certificado"("codigoVerificacion");

-- CreateIndex
CREATE INDEX "Certificado_mascotaId_idx" ON "Certificado"("mascotaId");

-- CreateIndex
CREATE INDEX "Certificado_emisorId_idx" ON "Certificado"("emisorId");

-- CreateIndex
CREATE INDEX "_UsuarioToVeterinaria_B_index" ON "_UsuarioToVeterinaria"("B");

-- AddForeignKey
ALTER TABLE "Mascota" ADD CONSTRAINT "Mascota_duenoId_fkey" FOREIGN KEY ("duenoId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Aplicacion" ADD CONSTRAINT "Aplicacion_mascotaId_fkey" FOREIGN KEY ("mascotaId") REFERENCES "Mascota"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Aplicacion" ADD CONSTRAINT "Aplicacion_vacunaId_fkey" FOREIGN KEY ("vacunaId") REFERENCES "Vacuna"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Aplicacion" ADD CONSTRAINT "Aplicacion_veterinarioId_fkey" FOREIGN KEY ("veterinarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certificado" ADD CONSTRAINT "Certificado_mascotaId_fkey" FOREIGN KEY ("mascotaId") REFERENCES "Mascota"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certificado" ADD CONSTRAINT "Certificado_emisorId_fkey" FOREIGN KEY ("emisorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_UsuarioToVeterinaria" ADD CONSTRAINT "_UsuarioToVeterinaria_A_fkey" FOREIGN KEY ("A") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_UsuarioToVeterinaria" ADD CONSTRAINT "_UsuarioToVeterinaria_B_fkey" FOREIGN KEY ("B") REFERENCES "Veterinaria"("id") ON DELETE CASCADE ON UPDATE CASCADE;

