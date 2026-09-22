/**
 * El PDF del certificado.
 *
 * Fijate en la firma: recibe datos y devuelve bytes. NO va a la base, no
 * llama al storage, no importa Next. Es una función pura, como las reglas de
 * la clase 5 —solo que en vez de devolver un array devuelve un archivo— y por
 * eso se puede probar sin levantar nada.
 *
 * La separación importa: generar el archivo y guardarlo son dos operaciones
 * distintas, y solo una de las dos puede fallar por culpa de un tercero.
 */
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { EstadoCertificado, Especie } from "@prisma/client";

const formatoFecha = new Intl.DateTimeFormat("es-AR", { dateStyle: "long" });

type DatosDelCertificado = {
  estado: EstadoCertificado;
  codigoVerificacion: string | null;
  emitidoEn: Date | null;
  vencimiento: Date | null;
  mascota: { nombre: string; especie: Especie };
};

export async function generarPdfCertificado(
  certificado: DatosDelCertificado,
  urlDeVerificacion: string,
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const hoja = pdf.addPage([595, 842]); // A4 en puntos
  const titulo = await pdf.embedFont(StandardFonts.HelveticaBold);
  const texto = await pdf.embedFont(StandardFonts.Helvetica);

  const negro = rgb(0.1, 0.1, 0.1);
  const gris = rgb(0.45, 0.45, 0.45);

  let y = 760;
  const escribir = (
    linea: string,
    { tam = 12, fuente = texto, color = negro, salto = 24 } = {},
  ) => {
    hoja.drawText(linea, { x: 60, y, size: tam, font: fuente, color });
    y -= salto;
  };

  escribir("Certificado sanitario", { tam: 24, fuente: titulo, salto: 40 });
  escribir(`${certificado.mascota.nombre} · ${certificado.mascota.especie}`, {
    tam: 16,
    fuente: titulo,
    salto: 44,
  });

  if (certificado.emitidoEn) {
    escribir(`Emitido el ${formatoFecha.format(certificado.emitidoEn)}`);
  }

  if (certificado.vencimiento) {
    escribir(`Vence el ${formatoFecha.format(certificado.vencimiento)}`);
  }

  escribir(`Estado: ${certificado.estado}`, { salto: 48 });

  // El código y la URL son lo único que hace verificable a este papel. Sin
  // ellos el PDF es un dibujo: cualquiera lo falsifica en un editor de texto.
  escribir("Código de verificación", { tam: 10, color: gris, salto: 18 });
  escribir(certificado.codigoVerificacion ?? "—", {
    tam: 20,
    fuente: titulo,
    salto: 36,
  });
  escribir("Verificable en", { tam: 10, color: gris, salto: 16 });
  escribir(urlDeVerificacion, { tam: 10, color: gris, salto: 40 });

  escribir(
    "Este documento no prueba por sí solo su autenticidad: se comprueba",
    { tam: 9, color: gris, salto: 13 },
  );
  escribir("ingresando el código en la dirección de arriba.", {
    tam: 9,
    color: gris,
  });

  return pdf.save();
}
