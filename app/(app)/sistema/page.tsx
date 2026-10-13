/**
 * La galería del sistema visual: todos los componentes, en todos sus estados.
 *
 * ---------------------------------------------------------------------------
 * POR QUÉ ESTO Y NO STORYBOOK
 * ---------------------------------------------------------------------------
 * Storybook es la herramienta de la industria para esto, y en un proyecto de
 * este tamaño sale más caro que el problema que resuelve. La razón no es el
 * peso ni la configuración: es que MITAD DE ESTOS COMPONENTES NO SE PUEDEN
 * RENDERIZAR AHÍ. `Navegacion` recibe el usuario de la sesión y las pantallas
 * leen de `lib/db/`; Storybook monta todo en un bundle de cliente aislado, así
 * que hay que mockear la sesión y la base. Lo que se ve entonces es una
 * versión falsa del componente, sin la frontera `"use client"` de verdad.
 *
 * Esta página corre en el mismo servidor, con los mismos tokens, la misma
 * fuente y el mismo CSS que las pantallas reales. Si alguien rompe
 * `globals.css`, acá se ve.
 *
 * ---------------------------------------------------------------------------
 * PARA QUÉ SIRVE, EN CONCRETO
 * ---------------------------------------------------------------------------
 *   1. Ver un componente antes de usarlo, y poder iterarlo sin tener que
 *      llegar hasta la pantalla donde va.
 *   2. Ver los estados raros SIN ENSUCIAR LA BASE. Para ver una vacuna
 *      `VENCIDA` en el sistema real hay que cargar una aplicación de hace dos
 *      años; acá es una línea de datos fijos.
 *   3. Revisar accesibilidad de una sola vez: contraste, foco visible y que
 *      ningún estado se comunique solo con color.
 *
 * Y lo que NO es: el lugar donde se decide el diseño. Todo se ve impecable con
 * "Laika" y se rompe con un nombre de sesenta caracteres. La prueba final
 * siempre es la pantalla real con datos reales.
 *
 * ---------------------------------------------------------------------------
 * POR QUÉ VIVE ADENTRO DE `(app)`
 * ---------------------------------------------------------------------------
 * Porque es una herramienta interna, y una herramienta interna también pide
 * sesión. Puesta en `(public)` sería una página sin dueño que cualquiera
 * indexa. No tiene datos sensibles —son todos inventados—, pero la regla no
 * se discute por caso: lo que no es para afuera va adentro del grupo que
 * exige sesión.
 */
import type {
  EstadoDeVacuna,
  ItemDelEstadoSanitario,
} from "@/lib/estado-sanitario";
import { EstadoSanitario } from "@/components/estado-sanitario";
import { SinDatos } from "@/components/sin-datos";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * El marco de cada caso: qué es y qué hay que mirar.
 *
 * El `nota` no es decoración. Una galería sin explicaciones se convierte en un
 * muestrario de cosas lindas; con la nota, cada caso dice qué decisión
 * representa y cuándo se usa.
 */
function Muestra({
  titulo,
  nota,
  children,
}: {
  titulo: string;
  nota?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{titulo}</p>
      {nota ? (
        <p className="max-w-prose text-xs text-muted-foreground">{nota}</p>
      ) : null}
      <div className="flex flex-wrap items-center gap-3 pt-1">{children}</div>
    </div>
  );
}

function Bloque({
  titulo,
  descripcion,
  children,
}: {
  titulo: string;
  descripcion: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">{titulo}</h2>
        <p className="max-w-prose text-sm text-muted-foreground">
          {descripcion}
        </p>
      </div>
      {children}
      <Separator />
    </section>
  );
}

/**
 * Los tokens, pintados con su propio nombre.
 *
 * La lista está escrita a mano porque CSS no se puede enumerar desde el
 * servidor: no hay forma de preguntarle a `globals.css` qué variables definió.
 * Es la única parte de esta página que hay que mantener al día a mano, y el
 * costo es bajo porque los tokens casi no cambian.
 */
const TOKENS = [
  { nombre: "--primary", clase: "bg-primary", texto: "text-primary-foreground" },
  {
    nombre: "--secondary",
    clase: "bg-secondary",
    texto: "text-secondary-foreground",
  },
  { nombre: "--muted", clase: "bg-muted", texto: "text-muted-foreground" },
  { nombre: "--card", clase: "bg-card", texto: "text-card-foreground" },
  {
    nombre: "--destructive",
    clase: "bg-destructive",
    texto: "text-background",
  },
  { nombre: "--border", clase: "bg-border", texto: "text-foreground" },
] as const;

/**
 * Un caso por cada estado posible de una vacuna.
 *
 * `Record<EstadoDeVacuna, ...>` y no un array, por la misma razón que en
 * `components/estado-sanitario.tsx`: el día que alguien agregue un quinto
 * estado al dominio, ESTA PÁGINA DEJA DE COMPILAR hasta que se decida cómo se
 * ve. Con un array, el estado nuevo simplemente no aparecería en la galería y
 * nadie se enteraría de que no sabe cómo se pinta.
 *
 * Las fechas son fijas y no `new Date()`: una galería que cambia de significado
 * según el día en que se abre no sirve para comparar. Acá "vencida" tiene que
 * decir "vencida" siempre.
 */
const CASOS: Record<EstadoDeVacuna, ItemDelEstadoSanitario> = {
  AL_DIA: {
    vacunaId: "muestra-al-dia",
    nombre: "Antirrábica",
    obligatoria: true,
    estado: "AL_DIA",
    ultimaAplicacion: new Date("2026-03-10T12:00:00Z"),
    proximaDosis: new Date("2027-03-10T12:00:00Z"),
  },
  PENDIENTE: {
    vacunaId: "muestra-pendiente",
    nombre: "Quíntuple",
    obligatoria: true,
    estado: "PENDIENTE",
    ultimaAplicacion: null,
    proximaDosis: null,
  },
  VENCIDA: {
    vacunaId: "muestra-vencida",
    nombre: "Triple felina",
    obligatoria: true,
    estado: "VENCIDA",
    ultimaAplicacion: new Date("2024-01-15T12:00:00Z"),
    proximaDosis: new Date("2025-01-15T12:00:00Z"),
  },
  NO_CORRESPONDE: {
    vacunaId: "muestra-no-corresponde",
    nombre: "Leucemia felina",
    obligatoria: false,
    estado: "NO_CORRESPONDE",
    ultimaAplicacion: null,
    proximaDosis: null,
  },
};

export default function Sistema() {
  return (
    <div className="space-y-10">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          Sistema visual
        </h1>
        <p className="max-w-prose text-sm text-muted-foreground">
          Los componentes del sistema con todos sus estados, en el mismo
          servidor y con los mismos tokens que las pantallas reales. Sirve para
          ver un componente antes de usarlo y para revisar accesibilidad de una
          sola vez. No reemplaza probar la pantalla con datos de verdad.
        </p>
      </div>

      <Separator />

      <Bloque
        titulo="Tokens"
        descripcion="Las decisiones visuales del sistema, definidas una vez en app/globals.css. Ningún componente escribe un color a mano: todos nombran uno de estos."
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {TOKENS.map((token) => (
            <div
              key={token.nombre}
              className={`rounded-lg border px-3 py-4 ${token.clase} ${token.texto}`}
            >
              <code className="text-xs">{token.nombre}</code>
            </div>
          ))}
        </div>
      </Bloque>

      <Bloque
        titulo="Button"
        descripcion="Las variantes que usa el sistema. La jerarquía es información: si todo es un botón primario, nada lo es."
      >
        <Muestra
          titulo="Variantes"
          nota="default para la acción principal de la pantalla —una sola—, outline para las secundarias, ghost para lo que casi no se usa, destructive para lo que no se puede deshacer."
        >
          <Button>Emitir certificado</Button>
          <Button variant="outline">Ver historial</Button>
          <Button variant="secondary">Filtrar</Button>
          <Button variant="ghost">Cancelar</Button>
          <Button variant="destructive">Anular</Button>
          <Button variant="link">Ver más</Button>
        </Muestra>

        <Muestra
          titulo="Tamaños y deshabilitado"
          nota="Un botón deshabilitado no explica por qué lo está, así que conviene que al lado haya un texto que lo diga. Y recordar que deshabilitar en la pantalla no impide nada en el servidor."
        >
          <Button size="sm">Chico</Button>
          <Button>Normal</Button>
          <Button size="lg">Grande</Button>
          <Button disabled>Deshabilitado</Button>
        </Muestra>
      </Bloque>

      <Bloque
        titulo="Badge"
        descripcion="Para estados y roles. Siempre con la palabra adentro: el color acompaña y no informa."
      >
        <Muestra
          titulo="Variantes"
          nota="Tapá la pantalla en blanco y negro: la información tiene que seguir completa. Es la prueba de un minuto de la lista de accesibilidad de la clase 2."
        >
          <Badge>Al día</Badge>
          <Badge variant="secondary">Pendiente</Badge>
          <Badge variant="destructive">Vencida</Badge>
          <Badge variant="outline">Todavía no corresponde</Badge>
        </Muestra>
      </Bloque>

      <Bloque
        titulo="Card e Input"
        descripcion="El contenedor del sistema y el único campo que hay hasta la clase 11. El radio, el borde y el espaciado se deciden una vez acá y no en dieciocho className."
      >
        <div className="grid w-full gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Laika</CardTitle>
              <CardDescription>Perro · nacida el 12/04/2023</CardDescription>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p className="text-muted-foreground">
                Una ficha de datos, con su título, su subtítulo y su contenido.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Un nombre deliberadamente larguísimo para ver qué pasa cuando no entra</CardTitle>
              <CardDescription>
                Este caso está acá a propósito: es el que rompe las pantallas de
                verdad, y en una galería con datos cortos nunca aparece.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <label htmlFor="muestra-buscar" className="text-sm font-medium">
                Buscar
              </label>
              <Input id="muestra-buscar" placeholder="Nombre de la mascota" />
            </CardContent>
          </Card>
        </div>
      </Bloque>

      <Bloque
        titulo="Los cinco estados de una pantalla"
        descripcion="Cargando, con datos, vacío, sin resultados y error. Acá están los cuatro que no son 'con datos', que son justamente los que nadie ve hasta que fallan."
      >
        <Muestra
          titulo="Cargando · Skeleton"
          nota="La misma forma que el contenido real: un título, un campo y tres filas. Esqueleto y no spinner, porque un spinner no reserva espacio y la página salta cuando llega el contenido."
        >
          <div className="w-full space-y-3" aria-hidden>
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        </Muestra>

        <Muestra
          titulo="Vacío · SinDatos"
          nota="Lo sabe el servidor: la consulta trajo cero filas. Dice qué pasa, por qué está así y qué hacer."
        >
          <div className="w-full">
            <SinDatos
              titulo="Todavía no cargaste ninguna mascota"
              detalle="Cuando agregues la primera, va a aparecer acá con su estado sanitario."
            />
          </div>
        </Muestra>

        <Muestra
          titulo="Vacío con acción"
          nota="La misma pieza cuando sí hay un botón que resuelve el vacío. Desde la clase 11 este va a ser el caso normal."
        >
          <div className="w-full">
            <SinDatos
              titulo="No tenés certificados emitidos"
              detalle="Se piden desde el detalle de cada mascota, y los emite el veterinario que la atiende."
              accion={<Button variant="outline">Ir a mis mascotas</Button>}
            />
          </div>
        </Muestra>

        <Muestra
          titulo="Sin resultados"
          nota="NO es el mismo estado que el vacío, y lo sabe el cliente: el término de búsqueda nunca salió del navegador. Decir 'todavía no cargaste ninguna mascota' a quien tiene ocho y buscó 'fifi' es mentirle sobre sus propios datos."
        >
          <div className="w-full rounded-xl border border-dashed px-6 py-10 text-center">
            <p className="text-sm font-medium">
              Ninguna de tus 8 mascotas coincide con “fifi”
            </p>
            <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
              Probá con otro nombre o borrá la búsqueda para ver todas.
            </p>
          </div>
        </Muestra>

        <Muestra
          titulo="Error · Alert"
          nota="Lo que ve la persona cuando la consulta falla. Tres cosas y ninguna más: que el problema es del sistema y no de lo que hizo, que no se perdió nada, y qué apretar. El mensaje de la excepción va a los logs."
        >
          <div className="w-full space-y-3">
            <Alert variant="destructive">
              <AlertTitle>No pudimos cargar el listado</AlertTitle>
              <AlertDescription>
                Fue un problema nuestro, no de lo que hiciste. No se perdió
                ningún dato.
              </AlertDescription>
            </Alert>
            <Alert>
              <AlertTitle>Variante neutra</AlertTitle>
              <AlertDescription>
                Para avisos que no son fallas: un certificado que está por
                vencer, por ejemplo.
              </AlertDescription>
            </Alert>
          </div>
        </Muestra>
      </Bloque>

      <Bloque
        titulo="EstadoSanitario"
        descripcion="El componente de dominio de la materia: pinta lo que calcula lib/estado-sanitario.ts, sin reimplementar ni una regla. Está acá porque es el que tiene estados imposibles de ver en la base sin ensuciarla."
      >
        <Muestra
          titulo="Los cuatro estados, juntos"
          nota="Acá se ve por qué NO_CORRESPONDE se muestra y no se filtra: apagado, con la explicación adelante, para que el dueño sepa que esa vacuna existe y que en dos meses se la van a pedir."
        >
          <div className="w-full">
            <EstadoSanitario items={Object.values(CASOS)} />
          </div>
        </Muestra>

        <Muestra
          titulo="Plan vacío"
          nota="El caso que más caro sale: si el catálogo de vacunas de esa especie no está cargado, el cálculo devuelve una lista vacía. Pintar eso como 'no falta nada' es decir que está todo al día cuando el sistema no sabe nada."
        >
          <div className="w-full">
            <SinDatos
              titulo="No hay un plan sanitario cargado para esta especie"
              detalle="Sin plan no se puede saber qué falta. Esto no significa que la mascota esté al día."
            />
          </div>
        </Muestra>
      </Bloque>
    </div>
  );
}
