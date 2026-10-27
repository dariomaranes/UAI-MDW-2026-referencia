/**
 * La Server Action que registra una mascota (H1).
 *
 * ---------------------------------------------------------------------------
 * `"use server"` NO SIGNIFICA "ESTO ES PRIVADO"
 * ---------------------------------------------------------------------------
 * Significa casi lo contrario, y es la confusión más cara de esta clase. Esa
 * directiva le pide a Next.js que PUBLIQUE cada función exportada de este
 * archivo como un endpoint HTTP, con una dirección generada, para que el
 * navegador pueda invocarla. No hay un `route.ts` a la vista, pero el endpoint
 * existe.
 *
 * La consecuencia práctica: cualquiera puede llamar a `crearMascotaAction` con
 * el `FormData` que se le ocurra, sin pasar por el formulario. Por eso acá
 * adentro se vuelve a verificar TODO —quién sos, qué podés, y si los datos
 * sirven—, exactamente como en un Route Handler.
 *
 *   una Server Action es un endpoint público con otra sintaxis
 *
 * Es la frase de la clase 6 una vez más: la UI decide qué mostrar, el servidor
 * decide qué permitir. Que el botón esté escondido no es una medida.
 *
 * ---------------------------------------------------------------------------
 * POR QUÉ ESTE ARCHIVO EXISTE APARTE DE `page.tsx`
 * ---------------------------------------------------------------------------
 * Una Server Action se puede declarar adentro del componente, y para un caso
 * de una línea está bien. Cuando tiene validación y reglas conviene afuera:
 * así el formulario de cliente la importa sin arrastrar la página entera, y
 * sobre todo, así se la puede leer sin leer la pantalla. La regla de negocio
 * no debería estar escondida en el medio de un JSX.
 */
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requerirUsuario } from "@/lib/auth";
import { crearMascota } from "@/lib/db/mascotas";
import { crearMascotaSchema } from "@/lib/schemas/mascota";
import type { EstadoDelFormulario } from "@/lib/formularios";

export async function crearMascotaAction(
  _estadoPrevio: EstadoDelFormulario,
  formData: FormData,
): Promise<EstadoDelFormulario> {
  // 1. AUTORIZAR, antes que nada. Registrar una mascota es del dueño: el
  //    veterinario registra aplicaciones, no mascotas. `requerirUsuario`
  //    lanza si no hay sesión o si el rol no corresponde, y ese error sube a
  //    `error.tsx` igual que en una página.
  const dueño = await requerirUsuario("DUENO");

  // 2. VALIDAR. `formData.get` devuelve `FormDataEntryValue | null`, que para
  //    el dominio es basura: todo lo que viaja en un formulario es texto o
  //    archivo. El mismo schema de la clase 2 lo convierte en un dato con
  //    forma, o en una lista de errores por campo.
  //
  //    Es EL MISMO schema que usa `POST /api/mascotas`. Si mañana el nombre
  //    pasa a exigir tres caracteres, las dos puertas cambian juntas porque
  //    la regla está escrita una sola vez.
  const entrada = {
    nombre: formData.get("nombre"),
    especie: formData.get("especie"),
    fechaNacimiento: formData.get("fechaNacimiento"),
    // Un campo de texto vacío llega como "" y no como `undefined`, y el chip
    // es opcional: sin esta línea, dejarlo en blanco sería "un chip inválido"
    // en vez de "no hay chip".
    chip: formData.get("chip") || undefined,
  };

  const resultado = crearMascotaSchema.safeParse(entrada);

  if (!resultado.success) {
    return {
      ok: false,
      errores: resultado.error.flatten().fieldErrors,
      // Se devuelve lo que la persona había escrito para volver a pintarlo.
      // Un formulario que se vacía al fallar es el motivo más común de que
      // alguien abandone un sistema, y acá es gratis evitarlo.
      valores: {
        nombre: String(formData.get("nombre") ?? ""),
        especie: String(formData.get("especie") ?? ""),
        fechaNacimiento: String(formData.get("fechaNacimiento") ?? ""),
        chip: String(formData.get("chip") ?? ""),
      },
    };
  }

  // 3. ESCRIBIR. El id del dueño sale de la sesión y NUNCA del formulario: si
  //    viniera del cliente, cualquiera podría cargarle una mascota a otra
  //    persona. Es la misma decisión de la clase 4, y es la razón por la que
  //    `crearMascota` lo pide como argumento aparte en vez de leerlo de los
  //    datos.
  const mascota = await crearMascota(resultado.data, dueño.id);

  // 4. INVALIDAR LA CACHÉ. El listado ya está renderizado del lado del
  //    servidor: sin esta línea, quien vuelva a `/` por navegación de cliente
  //    puede ver la lista de antes. No es un detalle de performance, es
  //    corrección: la pantalla estaría mintiendo.
  revalidatePath("/");

  // 5. IR A ALGÚN LADO. `redirect` funciona lanzando una excepción especial
  //    que Next.js atrapa, así que lo que esté después de esta línea no se
  //    ejecuta, y por eso esta función no devuelve nada acá. Mandamos al
  //    detalle y no al listado: quien acaba de cargar una mascota quiere
  //    verla, y desde ahí sigue el flujo.
  redirect(`/mascotas/${mascota.id}`);
}
