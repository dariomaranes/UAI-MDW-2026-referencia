/**
 * Vitest corre las pruebas de las funciones de dominio (`lib/**\/*.test.ts`).
 *
 * Las de `e2e/` son de Playwright: necesitan la app levantada y un navegador,
 * y se corren con `npm run test:e2e`. Sin esta exclusión, vitest las agarraría
 * por el nombre —`*.spec.ts`— y fallarían por no tener dónde correr.
 */
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    exclude: [...configDefaults.exclude, "e2e/**"],
  },
});
