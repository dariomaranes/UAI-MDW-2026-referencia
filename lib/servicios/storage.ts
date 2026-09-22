/**
 * El storage de archivos. EL ÚNICO LUGAR DEL PROYECTO QUE HABLA CON AFUERA.
 *
 * Es `lib/db/` un piso más allá: así como ningún handler habla con Prisma
 * directamente, ninguno habla con el proveedor de storage. Y por las mismas
 * razones, más una nueva:
 *
 *   - si mañana cambia el proveedor, se cambia acá y en ningún otro lado;
 *   - la credencial vive en un solo archivo y no se esparce;
 *   - y se puede SIMULAR LA FALLA sin desconectar internet, que es como se
 *     prueba una integración de verdad.
 *
 * Las cuatro reglas de la clase 7, todas visibles en este archivo:
 *   1. timeout siempre
 *   2. devuelve en vez de lanzar
 *   3. la credencial se lee acá y solo acá
 *   4. la falla se loguea
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Cinco segundos para subir un PDF de unos pocos kilobytes. El número no es
 * universal: sale del dominio. Para un archivo grande sería otro, y para una
 * pasarela de pagos —donde esperar de más es mejor que cobrar dos veces—
 * también.
 */
const TIMEOUT_MS = 5_000;

const BUCKET = "certificados";

/**
 * El cliente se crea CUANDO SE USA, no al importar este archivo. Parece un
 * detalle y es la diferencia entre un servicio accesorio y uno esencial.
 *
 * El SDK lanza en el acto si le falta la URL. Si el cliente se creara arriba
 * de todo, con la variable de entorno sin cargar este módulo no podría ni
 * importarse, y con él se caería el handler de emisión entero: ningún
 * certificado podría emitirse porque falta la configuración de un PDF que la
 * spec dice que es prescindible. Creándolo acá, la falta de configuración es
 * un caso más de "el storage no está disponible", y devuelve null como todos.
 *
 * El timeout se pone al crear el cliente, pasándole un `fetch` propio que
 * aborta solo, así ninguna llamada puede quedarse sin él por olvido.
 * `AbortSignal.timeout()` es del lenguaje, no del proveedor: funciona con
 * cualquier SDK que use `fetch` por debajo.
 *
 * La credencial es la clave de servicio, que SALTEA las reglas de acceso del
 * storage. Solo puede vivir en el servidor: con el prefijo NEXT_PUBLIC_, Next
 * la incrustaría en el bundle del navegador.
 */
function obtenerCliente(): SupabaseClient | null {
  const url = process.env.STORAGE_URL;
  const clave = process.env.STORAGE_KEY;

  if (!url || !clave) return null;

  return createClient(url, clave, {
    auth: { persistSession: false },
    global: {
      fetch: (recurso, opciones) =>
        fetch(recurso, { ...opciones, signal: AbortSignal.timeout(TIMEOUT_MS) }),
    },
  });
}

/**
 * Sube el PDF y devuelve su URL, o `null` si el storage no respondió.
 *
 * NO LANZA, y esa es la decisión de la clase: que un servicio externo falle
 * es un caso PREVISTO, no una excepción. Quien llama decide si eso importa —y
 * en la libreta no importa, porque el certificado ya está emitido y es
 * verificable con su código—.
 *
 * `upsert: true` porque reintentar tiene que ser inofensivo: subir dos veces
 * el mismo certificado deja el mismo archivo, no dos.
 */
export async function subirPdf(
  nombre: string,
  contenido: Uint8Array,
): Promise<string | null> {
  const cliente = obtenerCliente();

  if (!cliente) {
    console.error("storage: faltan STORAGE_URL o STORAGE_KEY, el PDF no se sube");
    return null;
  }

  try {
    const almacen = cliente.storage.from(BUCKET);

    const { error } = await almacen.upload(nombre, contenido, {
      contentType: "application/pdf",
      upsert: true,
    });

    if (error) throw error;

    return almacen.getPublicUrl(nombre).data.publicUrl;
  } catch (error) {
    // Si nadie se entera de que el storage se cayó, nadie lo va a arreglar.
    console.error("storage: no se pudo subir el PDF", error);
    return null;
  }
}
