/**
 * LOS PERMISOS, PROBADOS CONTRA EL SERVIDOR Y NO CONTRA LA PANTALLA.
 *
 * Ninguna de estas pruebas abre una página. Todas le pegan directo a la API,
 * como lo haría alguien con `curl`, porque esa es la pregunta: no si el botón
 * está escondido —eso es cortesía, clase 6— sino si el servidor dice que no
 * cuando alguien se saltea la pantalla.
 *
 * ---------------------------------------------------------------------------
 * LA TABLA SALE DEL CONTRATO
 * ---------------------------------------------------------------------------
 * Cada fila de abajo es una fila de la columna "Rol" de `docs/api.md`, dada
 * vuelta: quién NO puede, y qué tiene que contestar el servidor. Las pruebas
 * no se inventan mirando el código —el código dice lo que hace, no lo que
 * debería hacer— sino mirando el contrato.
 *
 * Y escritas así, encontraron un agujero: `POST /api/mascotas` llamaba a
 * `requerirUsuario()` sin rol, así que un veterinario podía registrar
 * mascotas por la API aunque la pantalla no le mostrara el botón. El contrato
 * decía "Dueño" desde la clase 4. Ver la fila marcada abajo.
 *
 * Los tres números, que no son intercambiables (clase 6):
 *   401  no sé quién sos
 *   403  sé quién sos, y tu ROL no puede hacer esto
 *   404  para vos, esto no existe — la mascota del vecino
 */
import { expect, test, type APIRequestContext } from "@playwright/test";
import { SESION } from "./sesiones";

/** Un body válido, para que lo que falle sea el permiso y no la validación. */
const MASCOTA = { nombre: "Intrusa", especie: "PERRO", fechaNacimiento: "2022-01-01" };
const APLICACION = {
  vacunaId: "antirrabica-perro",
  fecha: new Date().toISOString().slice(0, 10),
};

type Pedido = (api: APIRequestContext) => ReturnType<APIRequestContext["get"]>;

test.describe("sin sesión: 401", () => {
  const casos: [string, Pedido][] = [
    ["GET /api/mascotas", (api) => api.get("/api/mascotas")],
    ["POST /api/mascotas", (api) => api.post("/api/mascotas", { data: MASCOTA })],
    ["GET /api/certificados", (api) => api.get("/api/certificados")],
    ["POST /api/certificados/:id/emision", (api) => api.post("/api/certificados/cualquiera/emision")],
  ];

  for (const [endpoint, pedir] of casos) {
    test(endpoint, async ({ request }) => {
      expect((await pedir(request)).status()).toBe(401);
    });
  }
});

test.describe("el rol equivocado: 403", () => {
  test.describe("un dueño", () => {
    test.use({ storageState: SESION.dueno });

    test("no registra aplicaciones, aunque la mascota sea suya", async ({ request }) => {
      const respuesta = await request.post("/api/mascotas/laika/aplicaciones", {
        data: APLICACION,
      });
      expect(respuesta.status()).toBe(403);
    });

    test("no emite certificados, aunque la llamada no venga de la interfaz (H5)", async ({
      request,
    }) => {
      // Un pedido de verdad, de una mascota suya y al día…
      const pedido = await request.post("/api/certificados", {
        data: { mascotaId: "laika", motivo: "CONCURSO" },
      });
      // 201 la primera vez; 409 si es un reintento y el pedido ya existe, y
      // entonces la respuesta dice cuál es.
      expect([201, 409]).toContain(pedido.status());
      const cuerpo = (await pedido.json()) as { id?: string; solicitudPendienteId?: string };
      const id = cuerpo.id ?? cuerpo.solicitudPendienteId;

      // …que su dueña no puede emitirse a sí misma.
      const emision = await request.post(`/api/certificados/${id}/emision`);
      expect(emision.status()).toBe(403);

      // Y el certificado sigue como estaba: el 403 no dejó nada a medias.
      const despues = await request.get(`/api/certificados/${id}`);
      expect(((await despues.json()) as { estado: string }).estado).toBe("SOLICITADO");
    });
  });

  test.describe("un veterinario", () => {
    test.use({ storageState: SESION.veterinario });

    // ESTA ES LA FILA QUE ENCONTRÓ EL AGUJERO. Antes del arreglo respondía 201
    // y la mascota quedaba registrada a nombre del veterinario.
    test("no registra mascotas", async ({ request }) => {
      const respuesta = await request.post("/api/mascotas", { data: MASCOTA });
      expect(respuesta.status()).toBe(403);
    });
  });
});

test.describe("lo ajeno no existe: 404", () => {
  test.use({ storageState: SESION.otraDuena });

  // Laika es de Ana. Para Carla no es "prohibida": no existe. Un 403 le
  // confirmaría que hay una mascota con ese id.
  test("la ficha de la mascota de otra dueña", async ({ request }) => {
    expect((await request.get("/api/mascotas/laika")).status()).toBe(404);
  });

  test("corregir la mascota de otra dueña", async ({ request }) => {
    const respuesta = await request.patch("/api/mascotas/laika", { data: { nombre: "Mía" } });
    expect(respuesta.status()).toBe(404);
  });

  test("pedir un certificado para la mascota de otra dueña", async ({ request }) => {
    const respuesta = await request.post("/api/certificados", {
      data: { mascotaId: "laika", motivo: "VIAJE" },
    });
    expect(respuesta.status()).toBe(404);
  });

  test("y la pantalla dice lo mismo que la API", async ({ page }) => {
    await page.goto("/mascotas/laika");
    await expect(page.getByRole("heading", { name: "No encontramos esta página" })).toBeVisible();
  });
});
