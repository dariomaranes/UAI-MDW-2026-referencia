/**
 * El listado con un buscador. EL PRIMER COMPONENTE DE CLIENTE DEL PROYECTO.
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
 * entera con su layout: si `page.tsx` llevara `"use client"` arriba, el header,
 * el pie y todo lo demás viajarían al cliente para que funcione un `<input>`.
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
 */
"use client";

import Link from "next/link";
import { useState } from "react";

export type Fila = {
  id: string;
  nombre: string;
  especie: string;
  nacimiento: string;
  dueno: string | null;
};

export function BuscadorMascotas({ mascotas }: { mascotas: Fila[] }) {
  const [texto, setTexto] = useState("");

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
    <section className="mt-8">
      <input
        type="search"
        value={texto}
        onChange={(evento) => setTexto(evento.target.value)}
        placeholder="Buscar por nombre"
        className="w-full rounded-md border px-3 py-2 text-sm"
        aria-label="Buscar mascotas por nombre"
      />

      {visibles.length === 0 ? (
        <p className="mt-6 text-sm opacity-70">
          Ninguna coincide con “{texto}”.
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {visibles.map((mascota) => (
            <li key={mascota.id} className="rounded-lg border">
              {/* La fila entera es el link. Navega a un Server Component: el
                  hecho de estar en el cliente no obliga a que el destino
                  también lo esté. */}
              <Link href={`/mascotas/${mascota.id}`} className="block p-4">
                <h3 className="font-medium">{mascota.nombre}</h3>
                <p className="mt-1 text-sm opacity-80">
                  {mascota.especie} · nacida el {mascota.nacimiento}
                </p>
                {mascota.dueno && (
                  <p className="mt-2 text-xs opacity-60">de {mascota.dueno}</p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
