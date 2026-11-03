/**
 * EL FLUJO PRINCIPAL, DE PUNTA A PUNTA: la sección 5 de `docs/spec.md`,
 * recorrida por un navegador.
 *
 * Es UNA prueba larga y no siete cortas, a propósito. Lo que se quiere saber
 * no es si cada pantalla anda por separado —eso lo dice cada una cuando se la
 * abre— sino si el recorrido entero se puede hacer: que lo que el dueño
 * registra le llegue al veterinario, que lo que el veterinario emite lo pueda
 * verificar alguien sin cuenta. Los errores que importan están en las
 * costuras entre pantallas.
 *
 * Cada `test.step` es un paso de la spec. Si falla, el reporte dice cuál.
 *
 * ---------------------------------------------------------------------------
 * CÓMO BUSCA LAS COSAS: COMO UNA PERSONA
 * ---------------------------------------------------------------------------
 * `getByLabel("Nombre")`, `getByRole("button", { name: "Pedir certificado" })`.
 * Nunca un `.querySelector("#campo-3")` ni una clase de Tailwind. Si la prueba
 * encuentra el campo por su etiqueta, un lector de pantalla también: el
 * `htmlFor`/`id` de `components/campo.tsx` (clase 12) se prueba solo, de
 * paso. Y cambiar el diseño no rompe la prueba; cambiar lo que la pantalla
 * DICE, sí, que es lo que tiene que pasar.
 */
import { expect, test } from "@playwright/test";
import { SESION } from "./sesiones";

/** Una fecha de hace `anios` años, como la escribe un `<input type="date">`. */
function haceAnios(anios: number): string {
  const fecha = new Date();
  fecha.setFullYear(fecha.getFullYear() - anios);
  return fecha.toISOString().slice(0, 10);
}

test("el flujo principal se recorre entero desde la interfaz", async ({ browser }) => {
  // Cada corrida registra una mascota nueva con un nombre que no se repite:
  // la prueba no depende de lo que dejó la anterior.
  const nombre = `Firulais ${Date.now()}`;

  // Dos navegadores, dos personas, cada una con su sesión.
  const dueno = await (await browser.newContext({ storageState: SESION.dueno })).newPage();
  const veterinario = await (
    await browser.newContext({ storageState: SESION.veterinario })
  ).newPage();

  let fichaDeLaMascota = "";

  await test.step("1. el dueño registra su mascota", async () => {
    await dueno.goto("/mascotas/nueva");
    await dueno.getByLabel("Nombre").fill(nombre);
    await dueno.getByLabel("Especie").selectOption("PERRO");
    await dueno.getByLabel("Fecha de nacimiento").fill(haceAnios(2));
    await dueno.getByRole("button", { name: "Registrar mascota" }).click();

    // El redirect de la acción lleva a la ficha.
    await expect(dueno.getByRole("heading", { level: 1, name: nombre })).toBeVisible();
    fichaDeLaMascota = new URL(dueno.url()).pathname;
  });

  await test.step("3 (antes de tiempo). sin vacunas, el pedido se rechaza y enumera lo que falta", async () => {
    // El caso de error de la H4, en el lugar donde lo vería la persona:
    // arriba del formulario, con la lista. Se prueba ACÁ, en el medio del
    // flujo, porque es el estado real de una mascota recién registrada.
    await dueno.getByLabel("Para qué lo necesitás").selectOption("VIAJE");
    await dueno.getByRole("button", { name: "Pedir certificado" }).click();

    const rechazo = dueno.getByRole("alert").filter({ hasText: "No se pudo pedir" });
    await expect(rechazo).toContainText("Antirrábica");
    await expect(rechazo).toContainText("Quíntuple");
  });

  await test.step("2. el veterinario registra las dos vacunas obligatorias", async () => {
    for (const vacuna of ["antirrabica-perro", "quintuple-perro"]) {
      await veterinario.goto(`${fichaDeLaMascota}/aplicaciones/nueva`);
      await veterinario.getByLabel("Vacuna").selectOption(vacuna);
      // La fecha viene puesta en hoy: no se toca.
      await veterinario.getByRole("button", { name: "Registrar aplicación" }).click();
      await expect(veterinario).toHaveURL(fichaDeLaMascota);
    }

    // Y el historial lo muestra, porque la acción invalidó la ficha.
    await expect(veterinario.getByText("Antirrábica").first()).toBeVisible();
  });

  let certificado = "";

  await test.step("3 y 4. el dueño pide el certificado y el sistema lo acepta", async () => {
    await dueno.goto(fichaDeLaMascota);
    await dueno.getByLabel("Para qué lo necesitás").selectOption("VIAJE");
    await dueno.getByRole("button", { name: "Pedir certificado" }).click();

    await expect(dueno.getByRole("heading", { name: "Certificado sanitario" })).toBeVisible();
    await expect(dueno.getByText("Pendiente de emisión")).toBeVisible();
    certificado = new URL(dueno.url()).pathname;
  });

  let codigo = "";

  await test.step("5. el veterinario lo encuentra en su inicio y lo emite", async () => {
    await veterinario.goto("/");
    await veterinario
      .getByRole("link", { name: new RegExp(nombre) })
      .first()
      .click();
    await expect(veterinario).toHaveURL(certificado);

    await veterinario.getByRole("button", { name: "Emitir certificado" }).click();

    await expect(veterinario.getByText("Vigente", { exact: true })).toBeVisible();
    // El botón desaparece: un certificado emitido no se vuelve a emitir.
    await expect(veterinario.getByRole("button", { name: "Emitir certificado" })).toHaveCount(0);
    // El storage de las pruebas no responde a propósito: la emisión no
    // depende del PDF (clase 7), y la pantalla lo dice sin mostrar un error.
    await expect(veterinario.getByText("El PDF está en preparación.")).toBeVisible();

    codigo = (await veterinario.getByText(/^[A-Z0-9]{12}$/).textContent()) ?? "";
    expect(codigo).toMatch(/^[A-Z0-9]{12}$/);
  });

  await test.step("7. alguien sin cuenta lo verifica", async () => {
    // Un navegador nuevo, sin cookie: la aerolínea.
    const contexto = await browser.newContext();
    const tercero = await contexto.newPage();
    await tercero.goto(`/verificacion/${codigo}`);

    await expect(tercero.getByText("Vigente", { exact: true })).toBeVisible();
    await expect(tercero.getByText(nombre).first()).toBeVisible();
    // Y no le ofrece volver a ninguna libreta: no tiene una.
    await expect(tercero.getByRole("link", { name: /Volver a la libreta/ })).toHaveCount(0);
  });
});
