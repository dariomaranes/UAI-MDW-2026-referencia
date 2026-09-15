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

function haceMeses(meses: number): Date {
  const fecha = new Date();
  fecha.setMonth(fecha.getMonth() - meses);
  return fecha;
}

async function main() {
  // --- Usuarios --------------------------------------------------------
  // Hasta la clase 5 estos dos usuarios tenían ids FIJOS y legibles, porque
  // los handlers los llevaban escritos a mano en su `TODO (clase 6)`. Con la
  // sesión andando ese andamio se cae: el id sale del usuario logueado, y
  // acá vuelven a ser cuid() como el resto de las filas.
  //
  // Se identifican por EMAIL, que es lo que hace posible entrar con ellos:
  // `lib/auth.ts` busca por email al crear la sesión, así que si alguno de
  // estos coincide con la cuenta de Google con la que se inicia sesión, se
  // entra directamente con ese rol. Es la forma más rápida de probar el
  // camino del veterinario sin construir una pantalla de administración.
  const duena = await prisma.usuario.upsert({
    where: { email: "ana@ejemplo.com" },
    update: {},
    create: {
      email: "ana@ejemplo.com",
      nombre: "Ana Duarte",
      rol: Rol.DUENO,
    },
  });

  const veterinario = await prisma.usuario.upsert({
    where: { email: "bruno@ejemplo.com" },
    update: {},
    create: {
      email: "bruno@ejemplo.com",
      nombre: "Bruno Sosa",
      rol: Rol.VETERINARIO,
    },
  });

  // El admin existe porque un veterinario no puede auto-registrarse como tal:
  // el registro público crea SIEMPRE el rol de menor privilegio (ver el
  // `upsert` del callback `jwt` en `lib/auth.ts`), y el rol de veterinario lo
  // asigna alguien con más privilegio. Hoy eso se hace a mano en la base.
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
  //
  // Los ids también son fijos —`antirrabica-perro`, `triple-felina`— porque
  // los ejemplos de `docs/api.http` los escriben a mano. Ojo con el detalle
  // que se ve mejor acá que en ningún otro lado: la MISMA vacuna existe dos
  // veces, para perro y para gato, con edades mínimas distintas. Son dos
  // filas y dos ids, y confundirlas es el 409 de "esa vacuna no corresponde
  // a la especie de la mascota".
  const catalogo = [
    { id: "antirrabica-perro", nombre: "Antirrábica", especie: Especie.PERRO, edadMinimaMeses: 3, intervaloRefuerzoDias: 365, obligatoria: true },
    { id: "quintuple-perro", nombre: "Quíntuple", especie: Especie.PERRO, edadMinimaMeses: 2, intervaloRefuerzoDias: 365, obligatoria: true },
    { id: "tos-perreras", nombre: "Tos de las perreras", especie: Especie.PERRO, edadMinimaMeses: 4, intervaloRefuerzoDias: 365, obligatoria: false },
    { id: "antirrabica-gato", nombre: "Antirrábica", especie: Especie.GATO, edadMinimaMeses: 3, intervaloRefuerzoDias: 365, obligatoria: true },
    { id: "triple-felina", nombre: "Triple felina", especie: Especie.GATO, edadMinimaMeses: 2, intervaloRefuerzoDias: 365, obligatoria: true },
  ];

  for (const vacuna of catalogo) {
    await prisma.vacuna.upsert({
      // La clave compuesta del @@unique([nombre, especie]): la misma vacuna
      // puede existir para perro y para gato con reglas distintas.
      where: { nombre_especie: { nombre: vacuna.nombre, especie: vacuna.especie } },
      update: { id: vacuna.id },
      create: vacuna,
    });
  }

  // --- Mascotas ---------------------------------------------------------
  // Ids FIJOS y legibles, por la misma razón que los de los usuarios: los
  // ejemplos de `docs/api.http` las referencian por id, y con un cuid()
  // aleatorio habría que copiarlo a mano en cada corrida. Desde la clase 5
  // eso importa más que antes, porque las requests ya no dan lo mismo según
  // la mascota: "solicitar un certificado" es 201 para Laika y 409 para Mishi.
  //
  // El `update: { id }` no es decorativo: reasigna el id a las mascotas que
  // quedaron de corridas anteriores, cuando todavía era aleatorio. Funciona
  // porque las FK del schema son `ON UPDATE CASCADE` —Prisma las genera así—
  // y el historial viaja solo. Ojo con la asimetría, que es a propósito:
  // CASCADE al actualizar, RESTRICT al borrar. Renombrar es seguro; borrar
  // historial, no.
  const laika = await prisma.mascota.upsert({
    where: { chip: "982000123456789" },
    update: { id: "laika" },
    create: {
      id: "laika",
      nombre: "Laika",
      especie: Especie.PERRO,
      fechaNacimiento: haceAnios(3),
      chip: "982000123456789",
      duenoId: duena.id,
    },
  });

  const mishi = await prisma.mascota.upsert({
    where: { chip: "982000987654321" },
    update: { id: "mishi" },
    create: {
      id: "mishi",
      nombre: "Mishi",
      especie: Especie.GATO,
      fechaNacimiento: haceAnios(2),
      chip: "982000987654321",
      duenoId: duena.id,
    },
  });

  // Rocco: CACHORRO, un mes de vida y ninguna vacuna cargada.
  //
  // No es relleno: es el caso borde de la regla de la clase 5. A un mes no le
  // corresponde NINGUNA obligatoria —la quíntuple es a los 2 meses y la
  // antirrábica a los 3— así que su estado sanitario da todo NO_CORRESPONDE y
  // puede pedir un certificado sin tener una sola vacuna aplicada.
  //
  // Parece un bug y es la spec: "todas las vacunas obligatorias para la
  // especie Y LA EDAD de esa mascota". Si la regla tratara a Rocco como
  // "pendiente", ningún cachorro podría viajar nunca.
  const rocco = await prisma.mascota.upsert({
    where: { chip: "982000111222333" },
    update: { id: "rocco" },
    create: {
      id: "rocco",
      nombre: "Rocco",
      especie: Especie.PERRO,
      fechaNacimiento: haceMeses(1),
      chip: "982000111222333",
      duenoId: duena.id,
    },
  });

  // --- Aplicaciones y certificados --------------------------------------
  // No tienen clave natural para hacer upsert, así que se limpian y se
  // recrean. El orden importa: primero los certificados, porque la FK a
  // Mascota es Restrict y la base no deja borrar lo que todavía se referencia.
  await prisma.certificado.deleteMany({
    where: { mascotaId: { in: [laika.id, mishi.id, rocco.id] } },
  });
  await prisma.aplicacion.deleteMany({
    where: { mascotaId: { in: [laika.id, mishi.id, rocco.id] } },
  });

  // Laika: AL DÍA. Las dos obligatorias aplicadas y con refuerzo lejos.
  await prisma.aplicacion.createMany({
    data: [
      {
        mascotaId: laika.id,
        vacunaId: "antirrabica-perro",
        veterinarioId: veterinario.id,
        fecha: enDias(-30),
        proximaDosis: enDias(335),
      },
      {
        mascotaId: laika.id,
        vacunaId: "quintuple-perro",
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
      vacunaId: "antirrabica-gato",
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

  console.log("Seed completo: 3 usuarios, 5 vacunas, 3 mascotas, 3 aplicaciones.");
  console.log("  Laika → al día · Mishi → antirrábica vencida · Rocco → cachorro");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
