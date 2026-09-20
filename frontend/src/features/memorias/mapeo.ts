import type { Conferencia, Ficha, TipoDeUnidad } from '@/features/conferencias/data'
import { formatearFecha } from '@/features/conferencias/data'
import { textoDeFicha } from '@/features/conferencias/query'
import type { RegistroDeDatosDeCampo } from '@/features/plantillas/data'
import { nombreDeTema } from '@/features/taxonomia'
import type { Tema } from '@/features/taxonomia'

/*
  Traduce una conferencia y sus fichas al mismo formato de dato de campo
  (`{ parrafo, lista }`) que `campos.ts` usa para el dato de ejemplo, para que
  `generarMemoria.ts` lo pase tal cual a los `resolver*` de plantillas. Solo
  los cinco campos fijos del repositorio se resuelven aquí: a qué dato real
  se liga un marcador de etiqueta personalizada es una decisión de la IA que
  queda para B9 (ver `.agent/plans/f5-generador-de-memoria-plan-design.md`).

  Un campo sin dato real derivable de esta conferencia se omite del registro
  por completo — `campos.ts` ya sabe caer al dato de ejemplo cuando falta.

  El pool de temas entra por parámetro y no por import para que esta capa siga
  siendo pura: la memoria dice el nombre del tema, pero la conferencia solo
  guarda su id.
*/

/** Fichas de un tipo dado, de esta conferencia, priorizando las ya validadas cuando hay alguna. */
function fichasRelevantes(fichas: readonly Ficha[], idConferencia: string, tipo: TipoDeUnidad): readonly Ficha[] {
  const delTipo = fichas.filter((ficha) => ficha.idConferencia === idConferencia && ficha.tipoDeUnidad === tipo)
  const validadas = delTipo.filter((ficha) => ficha.estadoDeValidacion === 'validada')

  return validadas.length > 0 ? validadas : delTipo
}

export function mapearConferenciaACampos(
  conferencia: Conferencia,
  fichas: readonly Ficha[],
  temas: readonly Tema[],
): RegistroDeDatosDeCampo {
  const nombreDelTemaPrincipal = nombreDeTema(temas, conferencia.idTemaPrincipal)

  const registro: { -readonly [K in keyof RegistroDeDatosDeCampo]: RegistroDeDatosDeCampo[K] } = {
    nombre_ponente: { parrafo: conferencia.ponente, lista: [conferencia.ponente] },
    fecha_evento: {
      parrafo: formatearFecha(conferencia.fechaDelEvento),
      lista: [formatearFecha(conferencia.fechaDelEvento)],
    },
    tema_principal: { parrafo: nombreDelTemaPrincipal, lista: [nombreDelTemaPrincipal] },
  }

  /*
    La cita destacada va literal, y es el unico campo que lo exige: una memoria
    que entrecomilla a alguien esta afirmando que dijo exactamente eso. El
    condensado no lo dijo nadie asi, por bien escrito que este.
  */
  const citas = fichasRelevantes(fichas, conferencia.id, 'cita-textual')
  if (citas.length > 0) {
    registro.cita_destacada = {
      parrafo: citas[0]?.fragmento ?? '',
      lista: citas.map((ficha) => ficha.fragmento),
    }
  }

  /*
    El resumen del metodo no es una cita, es prosa de la memoria: aqui si entra
    la version condensada, que es la que se lee sin las vueltas del habla.
  */
  const metodos = fichasRelevantes(fichas, conferencia.id, 'metodo')
  if (metodos.length > 0) {
    registro.resumen_metodo = {
      parrafo: metodos[0] === undefined ? '' : textoDeFicha(metodos[0]),
      lista: metodos.map(textoDeFicha),
    }
  } else if (conferencia.resumen.trim().length > 0) {
    registro.resumen_metodo = { parrafo: conferencia.resumen, lista: [conferencia.resumen] }
  }

  return registro
}
