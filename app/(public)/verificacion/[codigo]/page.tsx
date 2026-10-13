/**
 * /verificacion/:codigo — la H6, y LA ÚNICA PANTALLA PÚBLICA DEL SISTEMA.
 *
 * La abre una aerolínea o una guardería que no tiene cuenta ni la va a crear.
 * Alguien le mostró un código y quiere saber una sola cosa: si el certificado
 * es auténtico y está vigente.
 *
 * ---------------------------------------------------------------------------
 * POR QUÉ ESTA PANTALLA ES LA PRUEBA DE QUE LA API NO ES UNA CAPA
 * ---------------------------------------------------------------------------
 * Ya existe `GET /api/verificacion/:codigo` desde la clase 4, y hace lo mismo
 * que esto. La tentación es que esta página lo llame con `fetch`. No lo llama,
 * por la misma razón de la clase 8: la página corre en el servidor, al lado de
 * la base, y el viaje de red del medio no agrega nada.
 *
 * Entonces hay dos consumidores del MISMO modelo, cada uno con su formato:
 *
 *   endpoint  →  JSON, para un programa (la aerolínea que integra)
 *   pantalla  →  HTML, para una persona (la aerolínea que mira)
 *
 * Los dos llaman a `verificarCertificado` y a `calcularVigencia`. Si la regla
 * de vigencia cambia, cambia en un archivo y los dos quedan iguales. Si cada
 * uno la hubiera implementado, el día que cambie uno va a decir "vigente" y el
 * otro "vencido" sobre el mismo certificado, y nadie lo va a notar hasta que
 * alguien se quede en un aeropuerto.
 *
 * ---------------------------------------------------------------------------
 * LO QUE ESTA PANTALLA NO MUESTRA
 * ---------------------------------------------------------------------------
 * No muestra el dueño, ni su email, ni el motivo, ni el id interno. No porque
 * la página los oculte: porque `verificarCertificado` tiene su propio `select`
 * y nunca los trae. Está decidido en `lib/db/certificados.ts`, donde el
 * comentario avisa que reusar el `select` de las pantallas propias publicaría
 * en internet cualquier campo que alguien agregue después.
 *
 * Que la decisión viva en la consulta y no en la vista es lo que hace que
 * siga valiendo cuando aparezca la segunda pantalla que verifica.
 */
import { notFound } from "next/navigation";
import {
  calcularVigencia,
  codigoVerificacionSchema,
  type VigenciaCertificado,
} from "@/lib/schemas/certificado";
import { verificarCertificado } from "@/lib/db/certificados";
import { NOMBRE_ESPECIE } from "@/lib/etiquetas";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const dynamic = "force-dynamic";

const formatoFecha = new Intl.DateTimeFormat("es-AR", { dateStyle: "long" });

/**
 * Las cuatro vigencias, con su texto y su color.
 *
 * `Record<VigenciaCertificado, ...>` por lo mismo de siempre: un quinto estado
 * en el dominio rompe la compilación acá en vez de salir sin etiqueta.
 *
 * Y el texto es el que una aerolínea necesita leer, no el que la base guarda.
 * "ANULADO" es un valor de un enum; "Anulado: no sirve como comprobante" es
 * una respuesta.
 */
const PRESENTACION: Record<
  VigenciaCertificado,
  {
    etiqueta: string;
    variante: "default" | "secondary" | "destructive" | "outline";
    explicacion: string;
  }
> = {
  VIGENTE: {
    etiqueta: "Vigente",
    variante: "default",
    explicacion: "El certificado es auténtico y está vigente al día de hoy.",
  },
  VENCIDO: {
    etiqueta: "Vencido",
    variante: "destructive",
    explicacion:
      "El certificado es auténtico, pero su vigencia ya terminó. No sirve como comprobante.",
  },
  ANULADO: {
    etiqueta: "Anulado",
    variante: "destructive",
    explicacion:
      "El certificado fue anulado por el profesional que lo emitió. No sirve como comprobante.",
  },
  PENDIENTE: {
    etiqueta: "Sin emitir",
    variante: "secondary",
    explicacion:
      "El certificado fue solicitado pero todavía no lo emitió un veterinario.",
  },
};

type Props = { params: Promise<{ codigo: string }> };

export default async function Verificacion({ params }: Props) {
  const { codigo } = await params;

  // 1. VALIDAR. Lo que viene por la URL es tan público como un body: se valida
  //    igual, con el MISMO schema que usa el endpoint. El schema además
  //    normaliza a mayúsculas, así que el código funciona escrito como venga.
  const resultado = codigoVerificacionSchema.safeParse(codigo);

  // Un código con formato inválido va al 404 y no a un "formato incorrecto",
  // que es la misma excepción que hace el endpoint: un mensaje distinto le
  // diría a alguien que prueba códigos al azar cuándo se está acercando.
  if (!resultado.success) notFound();

  const certificado = await verificarCertificado(resultado.data);

  if (!certificado) notFound();

  // La vigencia se calcula al leer, contra el reloj de ahora: un certificado
  // emitido hace 40 días está VENCIDO aunque en la base siga diciendo EMITIDO.
  // Lo que se guarda y lo que se calcula son dos cosas distintas, y es la
  // decisión de la clase 3.
  const vigencia = calcularVigencia(certificado);
  const { etiqueta, variante, explicacion } = PRESENTACION[vigencia];

  return (
    <Card>
      <CardHeader>
        <CardDescription>Verificación de certificado</CardDescription>
        <CardTitle className="flex flex-wrap items-center gap-3">
          {certificado.mascota.nombre}
          {/*
            El estado en texto Y en color, nunca solo en color: es el requisito
            de accesibilidad de la clase 2. Y esta pantalla es la que más lo
            necesita, porque es la única que lee alguien de afuera, en un
            mostrador, apurado y desde un teléfono.
          */}
          <Badge variant={variante}>{etiqueta}</Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <p className="text-sm">{explicacion}</p>

        <dl className="grid gap-3 text-sm sm:grid-cols-[10rem_1fr]">
          <dt className="text-muted-foreground">Mascota</dt>
          <dd>
            {certificado.mascota.nombre} ·{" "}
            {NOMBRE_ESPECIE[certificado.mascota.especie]}
          </dd>

          <dt className="text-muted-foreground">Emitido el</dt>
          <dd>
            {certificado.emitidoEn ? (
              formatoFecha.format(certificado.emitidoEn)
            ) : (
              <span className="text-muted-foreground">todavía sin emitir</span>
            )}
          </dd>

          <dt className="text-muted-foreground">Vence el</dt>
          <dd>
            {certificado.vencimiento ? (
              formatoFecha.format(certificado.vencimiento)
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </dd>
        </dl>

        <p className="text-xs text-muted-foreground">
          Esta página no requiere cuenta y muestra únicamente los datos del
          certificado. No publica información de la persona que lo solicitó.
        </p>
      </CardContent>
    </Card>
  );
}
