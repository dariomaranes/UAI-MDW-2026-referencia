import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Las pruebas e2e compilan en `.next-e2e` para no pisar el `.next` de un
  // `npm run dev` que esté corriendo al mismo tiempo (playwright.config.ts).
  distDir: process.env.NEXT_DIST_DIR || ".next",

  // El build falla si hay errores de tipos o de lint. Es a propósito:
  // preferimos enterarnos en el Pull Request y no en producción.
  typescript: { ignoreBuildErrors: false },
  eslint: { ignoreDuringBuilds: false },
};

export default nextConfig;
