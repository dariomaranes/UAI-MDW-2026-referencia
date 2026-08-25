/**
 * Datos de ejemplo para desarrollo.
 *
 * Correr con: npm run db:seed
 *
 * Por qué existe: para que los cuatro integrantes del equipo trabajen contra
 * los mismos datos y para poder mostrar el sistema sin cargar todo a mano.
 * Debe poder correrse varias veces sin romper (por eso usamos upsert).
 *
 * El criterio para saber si un seed está bien: tiene que alcanzar para
 * recorrer el flujo principal COMPLETO de la spec. Por eso acá hay una
 * mascota al día y otra con una vacuna vencida — si estuvieran todas al día,
 * la mitad de las reglas de negocio no se podría probar.
 */
import { PrismaClient, Especie, Rol } from "@prisma/client";

const prisma = new PrismaClient();

/** Fecha desplazada respecto de hoy. Negativo = pasado. */
function enDias(dias: number): Date {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() + dias);
  return fecha;
}

function haceAnios(anios: number): Date {
  const fecha = new Date();
  fecha.setFullYear(fecha.getFullYear() - anios);
  return fecha;
}

async function main() {
  // --- Usuarios --------------------------------------------------------
  const duena = await prisma.usuario.upsert({
    where: { email: "ana@ejemplo.com" },
    update: {},
    create: { email: "ana@ejemplo.com", nombre: "Ana Duarte", rol: Rol.DUENO },
  });

  const veterinario = await prisma.usuario.upsert({
    where: { email: "bruno@ejemplo.com" },
    update: {},
    create: { email: "bruno@ejemplo.com", nombre: "Bruno Sosa", rol: Rol.VETERINARIO },
  });

  // El admin existe porque un veterinario no puede auto-registrarse como tal.
  await prisma.usuario.upsert({
    where: { email: "admin@ejemplo.com" },
    update: {},
    create: { email: "admin@ejemplo.com", nombre: "Admin de cátedra", rol: Rol.ADMIN },
  });

  // --- Veterinaria (el lado N-N) ---------------------------------------
  await prisma.veterinaria.upsert({
    where: { id: "vet-del-parque" },
    update: {},
    create: {
      id: "vet-del-parque",
      nombre: "Veterinaria del Parque",
      direccion: "Av. Rivadavia 4200, CABA",
      telefono: "011 4567-8900",
      veterinarios: { connect: { id: veterinario.id } },
    },
  });

  // --- Catálogo de vacunas ---------------------------------------------
  // Es el "plan de vacunación": de acá salen la edad mínima y el refuerzo con
  // los que el sistema calcula qué le falta a cada mascota.
  const catalogo = [
    { nombre: "Antirrábica", especie: Especie.PERRO, edadMinimaMeses: 3, intervaloRefuerzoDias: 365, obligatoria: true },
    { nombre: "Quíntuple", especie: Especie.PERRO, edadMinimaMeses: 2, intervaloRefuerzoDias: 365, obligatoria: true },
    { nombre: "Tos de las perreras", especie: Especie.PERRO, edadMinimaMeses: 4, intervaloRefuerzoDias: 365, obligatoria: false },
    { nombre: "Antirrábica", especie: Especie.GATO, edadMinimaMeses: 3, intervaloRefuerzoDias: 365, obligatoria: true },
    { nombre: "Triple felina", especie: Especie.GATO, edadMinimaMeses: 2, intervaloRefuerzoDias: 365, obligatoria: true },
  ];

  for (const vacuna of catalogo) {
    await prisma.vacuna.upsert({
      // La clave compuesta del @@unique([nombre, especie]): la misma vacuna
      // puede existir para perro y para gato con reglas distintas.
      where: { nombre_especie: { nombre: vacuna.nombre, especie: vacuna.especie } },
      update: {},
      create: vacuna,
    });
  }

  const antirrabicaPerro = await prisma.vacuna.findUniqueOrThrow({
    where: { nombre_especie: { nombre: "Antirrábica", especie: Especie.PERRO } },
  });
  const quintuple = await prisma.vacuna.findUniqueOrThrow({
    where: { nombre_especie: { nombre: "Quíntuple", especie: Especie.PERRO } },
  });
  const antirrabicaGato = await prisma.vacuna.findUniqueOrThrow({
    where: { nombre_especie: { nombre: "Antirrábica", especie: Especie.GATO } },
  });

  // --- Mascotas ---------------------------------------------------------
  const laika = await prisma.mascota.upsert({
    where: { chip: "982000123456789" },
    update: {},
    create: {
      nombre: "Laika",
      especie: Especie.PERRO,
      fechaNacimiento: haceAnios(3),
      chip: "982000123456789",
      duenoId: duena.id,
    },
  });

  const mishi = await prisma.mascota.upsert({
    where: { chip: "982000987654321" },
    update: {},
    create: {
      nombre: "Mishi",
      especie: Especie.GATO,
      fechaNacimiento: haceAnios(2),
      chip: "982000987654321",
      duenoId: duena.id,
    },
  });

  // --- Aplicaciones y certificados --------------------------------------
  // No tienen clave natural para hacer upsert, así que se limpian y se
  // recrean. El orden importa: primero los certificados, porque la FK a
  // Mascota es Restrict y la base no deja borrar lo que todavía se referencia.
  await prisma.certificado.deleteMany({
    where: { mascotaId: { in: [laika.id, mishi.id] } },
  });
  await prisma.aplicacion.deleteMany({
    where: { mascotaId: { in: [laika.id, mishi.id] } },
  });

  // Laika: AL DÍA. Las dos obligatorias aplicadas y con refuerzo lejos.
  await prisma.aplicacion.createMany({
    data: [
      {
        mascotaId: laika.id,
        vacunaId: antirrabicaPerro.id,
        veterinarioId: veterinario.id,
        fecha: enDias(-30),
        proximaDosis: enDias(335),
      },
      {
        mascotaId: laika.id,
        vacunaId: quintuple.id,
        veterinarioId: veterinario.id,
        fecha: enDias(-20),
        proximaDosis: enDias(345),
        observaciones: "Sin reacción adversa.",
      },
    ],
  });

  // Mishi: VENCIDA. La antirrábica se aplicó hace más de un año y el refuerzo
  // ya pasó. Es el caso que tiene que hacer fallar la solicitud de un
  // certificado, y el que prueba que el estado se calcula y no se guarda:
  // nadie tocó esta fila, la fecha la venció sola.
  await prisma.aplicacion.create({
    data: {
      mascotaId: mishi.id,
      vacunaId: antirrabicaGato.id,
      veterinarioId: veterinario.id,
      fecha: enDias(-400),
      proximaDosis: enDias(-35),
    },
  });

  // Certificado vigente de Laika, para poder probar la página pública (H6).
  await prisma.certificado.create({
    data: {
      mascotaId: laika.id,
      emisorId: veterinario.id,
      estado: "EMITIDO",
      motivo: "VIAJE",
      codigoVerificacion: "A1B2C3D4E5F6",
      emitidoEn: enDias(-5),
      // 30 días desde la emisión, que es lo que manda la regla de negocio.
      vencimiento: enDias(25),
    },
  });

  console.log("Seed completo: 3 usuarios, 5 vacunas, 2 mascotas, 3 aplicaciones.");
  console.log("  Laika → al día · Mishi → antirrábica vencida");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
