import { afterEach, describe, expect, it, vi } from "vitest";

describe("subirPdf", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  // EL TEST QUE IMPORTA. Sin configuración, el storage tiene que comportarse
  // como un servicio caído: devolver null. Si lanzara —o si el módulo no
  // pudiera siquiera importarse—, la falta de configuración de un PDF
  // prescindible tumbaría la emisión de certificados.
  it("sin credenciales devuelve null en vez de lanzar", async () => {
    vi.stubEnv("STORAGE_URL", "");
    vi.stubEnv("STORAGE_KEY", "");
    vi.spyOn(console, "error").mockImplementation(() => {});

    const { subirPdf } = await import("./storage");

    await expect(subirPdf("x.pdf", new Uint8Array([1]))).resolves.toBeNull();
  });

  it("si el proveedor no responde, devuelve null en vez de lanzar", async () => {
    // Una URL a la que no se puede llegar: es la falla que se prueba en el
    // taller cambiando una letra de la clave.
    vi.stubEnv("STORAGE_URL", "http://127.0.0.1:9");
    vi.stubEnv("STORAGE_KEY", "clave-invalida");
    vi.spyOn(console, "error").mockImplementation(() => {});

    const { subirPdf } = await import("./storage");

    await expect(subirPdf("x.pdf", new Uint8Array([1]))).resolves.toBeNull();
  });
});
