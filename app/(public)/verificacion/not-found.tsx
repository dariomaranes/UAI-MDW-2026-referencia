/**
 * El "no encontramos ese código" de la verificación pública.
 *
 * Es el criterio de aceptación de la H6 escrito como pantalla: si el código no
 * existe, se informa que no se encontró y NO SE REVELA NINGÚN DATO de otra
 * mascota. Tampoco se revela nada sobre el código en sí.
 *
 * Por eso el texto no distingue los tres casos que llegan acá —el código no
 * tiene el formato correcto, el código no existe, el código existía y se
 * borró—. Para quien verifica de buena fe los tres significan lo mismo: ese
 * papel no vale. Para quien está probando códigos al azar, distinguirlos sería
 * decirle cuándo está cerca.
 *
 * Es un not-found propio de esta carpeta y no el general del sistema: el de
 * `(app)` habla de "lo que te corresponde ver", que acá no significa nada
 * porque no hay nadie logueado.
 */
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function CodigoNoEncontrado() {
  return (
    <Alert>
      <AlertTitle>No encontramos ese certificado</AlertTitle>
      <AlertDescription>
        <p>
          El código que figura en la dirección no corresponde a ningún
          certificado emitido por este sistema.
        </p>
        <p>
          Revisá que esté copiado completo y sin espacios. Si el problema sigue,
          pedile a quien te lo mostró el enlace de verificación.
        </p>
      </AlertDescription>
    </Alert>
  );
}
