## Qué hace este PR

<Una o dos oraciones. Si hay una historia de usuario asociada, linkeala.>

## Checklist

- [ ] Funciona en el preview deployment, no solo en local
- [ ] La validación está en el servidor
- [ ] La autorización se verifica en el servidor (no alcanza con esconder el botón)
- [ ] Estados de carga y error resueltos en la UI
- [ ] `npm run build` y `npm run typecheck` pasan
- [ ] Si se tocó el modelo de datos, hay migración y (si la decisión fue discutida) un ADR

### Pruebas

- [ ] Si cambió una regla de negocio (sección 6 de la spec), cambió su prueba unitaria
- [ ] Si cambió quién puede hacer qué, o hay un endpoint nuevo, tiene su fila en `docs/api.md` y su caso en `e2e/permisos.spec.ts`
- [ ] Si cambió el flujo principal (sección 5 de la spec), cambió `e2e/flujo-principal.spec.ts`
- [ ] Ninguna prueba se arregló cambiando el valor esperado
