/**
 * /certificados/:id — el certificado, y su emisión (pasos 4 y 5 del flujo).
 *
 * La misma dirección para los dos roles, con lo que a cada uno le toca:
 *
 *   el dueño          ve en qué está su pedido y, emitido, el código y el PDF
 *   el veterinario    ve lo mismo y, si está pendiente, el botón de emitir
 *
 * Es una pantalla y no dos porque es UN recurso: el certificado. Lo que
 * cambia con el rol es qué se puede hacer con él, no qué es.
 *
 * La lectura es la misma que la de `GET /api/certificados/:id`:
 * `obtenerCertificadoVisiblePara`, con la pertenencia en el WHERE. Para un
 * dueño, el certificado de la mascota del vecino no existe, y el 404 sale
 * solo.
 */
import Link from "next/link";
import { notFound } from "next/navigation";
import { requerirUsuario } from "@/lib/auth";
import { obtenerCertificadoVisiblePara } from "@/lib/db/certificados";
import {
  calcularVigencia,
  type VigenciaCertificado,
} from "@/lib/schemas/certificado";
import { NOMBRE_ESPECIE, NOMBRE_MOTIVO } from "@/lib/etiquetas";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmitirCertificado } from "./emitir";

export const dynamic = "force-dynamic";

const formatoFecha = new Intl.DateTimeFormat("es-AR", { dateStyle: "long" });

/**
 * El estado en palabras de quien lo pidió. No es el mismo texto que el de la
 * verificación pública: a la aerolínea "Sin emitir" le alcanza; al dueño hay
 * que decirle qué falta para que se emita.
 */
const PRESENTACION: Record<
  VigenciaCertificado,
  { etiqueta: string; variante: "default" | "secondary" | "destructive" | "outline" }
> = {
  PENDIENTE: { etiqueta: "Pendiente de emisión", variante: "secondary" },
  VIGENTE: { etiqueta: "Vigente", variante: "default" },
  VENCIDO: { etiqueta: "Vencido", variante: "destructive" },
  ANULADO: { etiqueta: "Anulado", variante: "destructive" },
};

type Props = { params: Promise<{ id: string }> };

export default async function Certificado({ params }: Props) {
  const { id } = await params;

  const usuario = await requerirUsuario();

  const certificado = await obtenerCertificadoVisiblePara(
    id,
    usuario.id,
    usuario.rol,
  );

  if (!certificado) notFound();

  // La vigencia se calcula al leer, como en la página pública: emitido y con
  // la fecha pasada es VENCIDO, aunque la base siga diciendo EMITIDO.
  const vigencia = calcularVigencia(certificado);
  const { etiqueta, variante } = PRESENTACION[vigencia];

  const puedeEmitir =
    usuario.rol === "VETERINARIO" && certificado.estado === "SOLICITADO";

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <Link
          href={`/mascotas/${certificado.mascota.id}`}
          className="text-sm text-muted-foreground hover:text-foreground hover:underline"
        >
          ← {certificado.mascota.nombre}
        </Link>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">
          Certificado sanitario
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardDescription>{NOMBRE_MOTIVO[certificado.motivo]}</CardDescription>
          <CardTitle className="flex flex-wrap items-center gap-3">
            {certificado.mascota.nombre}
            <Badge variant={variante}>{etiqueta}</Badge>
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          <dl className="grid gap-3 text-sm sm:grid-cols-[10rem_1fr]">
            <dt className="text-muted-foreground">Mascota</dt>
            <dd>
              {certificado.mascota.nombre} ·{" "}
              {NOMBRE_ESPECIE[certificado.mascota.especie]}
            </dd>

            {certificado.detalle ? (
              <>
                <dt className="text-muted-foreground">Detalle</dt>
                <dd>{certificado.detalle}</dd>
              </>
            ) : null}

            <dt className="text-muted-foreground">Pedido el</dt>
            <dd>{formatoFecha.format(certificado.solicitadoEn)}</dd>

            {certificado.emitidoEn ? (
              <>
                <dt className="text-muted-foreground">Emitido el</dt>
                <dd>{formatoFecha.format(certificado.emitidoEn)}</dd>
              </>
            ) : null}

            {certificado.vencimiento ? (
              <>
                <dt className="text-muted-foreground">Vence el</dt>
                <dd>{formatoFecha.format(certificado.vencimiento)}</dd>
              </>
            ) : null}

            {certificado.codigoVerificacion ? (
              <>
                <dt className="text-muted-foreground">Código</dt>
                <dd className="font-mono tracking-wider">
                  {certificado.codigoVerificacion}
                </dd>
              </>
            ) : null}
          </dl>

          {/*
            Emitido: lo que el dueño va a mostrar. El link a la verificación
            pública es el paso 7 del flujo, y abrirlo desde acá es la forma
            más rápida de ver lo que va a ver la aerolínea.

            El PDF puede no estar: es un servicio accesorio y la emisión no
            depende de él. Se dice "en preparación", no se muestra un error.
          */}
          {certificado.codigoVerificacion ? (
            <div className="flex flex-col gap-2 sm:flex-row">
              {/* También en otra pestaña, y por lo mismo que el PDF: la
                  verificación es la pantalla de AFUERA del sistema, sin
                  navegación ni sesión, porque es la que ve la aerolínea.
                  Abrirla acá dejaría a la persona en una página sin salida.
                  Y en otra pestaña tiene a mano la dirección para compartir. */}
              <a
                href={`/verificacion/${certificado.codigoVerificacion}`}
                target="_blank"
                rel="noopener"
                className="text-sm underline"
              >
                Ver la verificación pública
                <span className="sr-only"> (se abre en otra pestaña)</span>
                <span aria-hidden> ↗</span>
              </a>
              {certificado.urlPdf ? (
                // En otra pestaña: el PDF vive en el storage, fuera del
                // sistema, y abrirlo acá sacaría a la persona de la app sin
                // un camino de vuelta. `noopener` porque es otro origen: la
                // pestaña nueva no tiene por qué poder tocar esta.
                <a
                  href={certificado.urlPdf}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm underline"
                >
                  Abrir el PDF
                  {/* Avisar que se abre otra pestaña es lo que pide la
                      accesibilidad: sin eso, el "atrás" deja de funcionar
                      y nadie dijo por qué. */}
                  <span className="sr-only"> (se abre en otra pestaña)</span>
                  <span aria-hidden> ↗</span>
                </a>
              ) : (
                <span className="text-sm text-muted-foreground">
                  El PDF está en preparación.
                </span>
              )}
            </div>
          ) : null}

          {/* Pendiente: qué falta, dicho según quién mira. */}
          {certificado.estado === "SOLICITADO" && !puedeEmitir ? (
            <p className="text-sm text-muted-foreground">
              Lo tiene que emitir un veterinario. Al emitirlo, el sistema
              vuelve a revisar que las vacunas obligatorias sigan al día.
            </p>
          ) : null}
        </CardContent>
      </Card>

      {/*
        El botón aparece solo para el veterinario y solo si está pendiente.
        Esconderlo es cortesía: lo que impide es el `requerirUsuario` de la
        acción y el `estado: "SOLICITADO"` del WHERE.
      */}
      {puedeEmitir ? (
        <section className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Al emitirlo se vuelven a revisar las obligatorias, se genera el
            código de verificación y queda registrado que lo emitiste vos.
          </p>
          <EmitirCertificado certificadoId={certificado.id} />
        </section>
      ) : null}
    </div>
  );
}
