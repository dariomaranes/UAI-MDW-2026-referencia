/**
 * El listado con un buscador. EL ÚNICO COMPONENTE DE CLIENTE DEL PROYECTO.
 *
 * ¿Por qué este sí y la página de detalle no? Por una sola razón: este tiene
 * que acordarse de algo entre un click y el siguiente —lo que la persona
 * escribió— y reaccionar a cada tecla. Eso es estado y eventos, y eso solo
 * existe en el navegador. `useState` en un Server Component no compila.
 *
 * La regla completa cabe en un renglón:
 *
 *   ¿necesita estado, eventos o APIs del navegador?
 *      NO  →  Server Component (el default, y no se escribe nada)
 *      SÍ  →  "use client", y lo más chico posible
 *
 * "Lo más chico posible" es la parte que se olvida. `"use client"` no marca un
 * archivo: marca una FRONTERA. Todo lo que este componente importe se va al
 * navegador con él. Por eso el buscador es solo el buscador, y no la página
 * entera con su layout: si `page.tsx` llevara `"use client"` arriba, la barra
 * de navegación, el pie y todo lo demás viajarían al cliente para que
 * funcione un `<input>`.
 *
 * ---------------------------------------------------------------------------
 * LO QUE CRUZA LA FRONTERA
 * ---------------------------------------------------------------------------
 * Las props van del servidor al navegador serializadas, así que tienen que ser
 * datos: strings, números, booleanos, arrays, objetos planos. Una función no
 * cruza. Una instancia de una clase, tampoco.
 *
 * Fijate que `Fila` trae `nacimiento` como STRING ya formateado y no como
 * `Date`. Es a propósito, y no es por la serialización: es porque formatear una
 * fecha en el servidor y en el navegador puede dar distinto —otra zona
 * horaria, otro idioma del sistema— y React avisa que el HTML que recibió no
 * coincide con el que generó. Formatear una sola vez, del lado del servidor,
 * hace que el problema no exista.
 *
 * ---------------------------------------------------------------------------
 * QUÉ CAMBIÓ EN LA CLASE 10
 * ---------------------------------------------------------------------------
 * El `<input>` suelto pasó a ser `Input`, y el `<li>` con borde pasó a ser
 * `Card`. No es cosmético: el día que el sistema cambie el radio de las
 * esquinas o el color del foco, cambia en `components/ui/` y no en las
 * dieciocho pantallas que lo copiaron. Eso es lo que significa tener un design
 * system, y es la razón por la que `components/ui/` existe aunque sus archivos
 * los haya escrito la CLI y no ustedes.
 */
"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export type Fila = {
  id: string;
  nombre: string;
  especie: string;
  nacimiento: string;
  dueno: string | null;
};

export function BuscadorMascotas({ mascotas }: { mascotas: Fila[] }) {
  const [texto, setTexto] = useState("");

  // `useId` y no un string fijo: si mañana hay dos buscadores en la misma
  // pantalla, dos `id="busqueda"` hacen que el `<label>` apunte al primero y
  // el segundo quede sin etiqueta. El error no se ve mirando la pantalla, se
  // ve con un lector de pantalla.
  const idCampo = useId();

  // El filtro NO le pregunta nada al servidor. Las mascotas ya están acá:
  // llegaron con el HTML, en el mismo viaje. Escribir una letra no genera
  // ningún request, y por eso responde al instante incluso sin conexión.
  //
  // Esto vale porque la lista entera cabe en la pantalla —el `take: 50` de
  // `lib/db/`—. Con diez mil filas la decisión se invierte: filtrar pasa a ser
  // trabajo del servidor, porque no se le pueden mandar diez mil filas al
  // navegador para que descarte 9.990.
  const termino = texto.trim().toLowerCase();
  const visibles = termino
    ? mascotas.filter((m) => m.nombre.toLowerCase().includes(termino))
    : mascotas;

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        {/*
          `label` de verdad, no solo `placeholder`. Es el requisito de
          accesibilidad de la clase 2, y el `placeholder` no lo cumple por dos
          razones: desaparece en cuanto se escribe la primera letra, y algunos
          lectores de pantalla no lo anuncian.

          Está en `sr-only` porque arriba ya dice "Mis mascotas" y un rótulo
          visible sería redundante para quien ve la pantalla. Lo que no puede
          pasar es que no exista.
        */}
        <label htmlFor={idCampo} className="sr-only">
          Buscar mascotas por nombre
        </label>
        <Input
          id={idCampo}
          type="search"
          value={texto}
          onChange={(evento) => setTexto(evento.target.value)}
          placeholder="Buscar por nombre"
        />
      </div>

      {/*
        EL CUARTO ESTADO: hay datos, pero ninguno coincide. No es el estado
        vacío —ese lo resolvió la página antes de renderizar esto— y no es un
        error. Es el único de los cinco estados que el servidor no puede
        resolver, porque el término de búsqueda nunca llegó al servidor.

        Y nombra lo buscado: "ninguna coincide con fifi" le dice a la persona
        qué cambiar. "Sin resultados" la deja adivinando si escribió mal o si
        el sistema está roto.
      */}
      {visibles.length === 0 ? (
        <p className="rounded-xl border border-dashed px-6 py-8 text-center text-sm text-muted-foreground">
          Ninguna de tus {mascotas.length} mascotas coincide con “{texto}”.
        </p>
      ) : (
        <ul className="space-y-3">
          {visibles.map((mascota) => (
            <li key={mascota.id}>
              {/* La tarjeta entera es el link. Navega a un Server Component:
                  el hecho de estar en el cliente no obliga a que el destino
                  también lo esté. */}
              <Card className="transition-colors hover:bg-muted/50">
                <Link
                  href={`/mascotas/${mascota.id}`}
                  className="block rounded-xl px-6 py-4 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <p className="font-medium">{mascota.nombre}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {mascota.especie} · nacida el {mascota.nacimiento}
                  </p>
                  {mascota.dueno ? (
                    <p className="mt-2 text-xs text-muted-foreground">
                      de {mascota.dueno}
                    </p>
                  ) : null}
                </Link>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
