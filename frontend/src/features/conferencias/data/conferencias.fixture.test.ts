import { describe, expect, it } from 'vitest'
import { CUENTAS_DE_EJEMPLO } from '@/features/auth/session'
import { CONFERENCIAS_DE_EJEMPLO } from './conferencias.fixture'
import { FICHAS_DE_EJEMPLO } from './fichas.fixture'
import { ESPACIOS_DE_ETIQUETAS_DE_EJEMPLO } from './etiquetas.fixture'
import type { EstadoDeProcesamiento, EstadoDeValidacion, TipoDeUnidad } from './tipos'

/*
  Pruebas de política del fixture, no de la interfaz. Un fixture incoherente
  (una ficha huérfana, un dueño que no existe, un rango de segundos imposible)
  produce pantallas que mienten y pruebas que pasan por accidente, así que las
  invariantes del dominio se comprueban aquí una sola vez.

  Estas mismas invariantes son las que B6 tendrá que garantizar contra datos
  reales; cuando ese módulo llegue, la prueba se conserva y lo que se borra es
  el fixture.
*/

const IDS_DE_CUENTA = new Set(CUENTAS_DE_EJEMPLO.map((cuenta) => cuenta.id))
const IDS_DE_CONFERENCIA = new Set(CONFERENCIAS_DE_EJEMPLO.map((conferencia) => conferencia.id))

const ESTADOS_DE_PROCESAMIENTO: readonly EstadoDeProcesamiento[] = [
  'en-cola',
  'procesando',
  'procesada',
  'fallida',
]

const TIPOS_DE_UNIDAD: readonly TipoDeUnidad[] = [
  'cita-textual',
  'metodo',
  'estrategia',
  'postura',
  'dato-de-impacto',
  'fase-del-trabajo',
]

const ESTADOS_DE_VALIDACION: readonly EstadoDeValidacion[] = ['validada', 'pendiente', 'automatica']

/* Guion largo, escrito como escape para no usarlo literalmente en el código. */
const GUION_LARGO = '—'

/* Formato del código de charla: cuatro letras, año, número de orden. */
const FORMATO_DE_CODIGO = /^[A-Z]{4}-\d{4}-\d{2}$/

const FORMATO_ISO = /^\d{4}-\d{2}-\d{2}$/

function fichasDe(idConferencia: string) {
  return FICHAS_DE_EJEMPLO.filter((ficha) => ficha.idConferencia === idConferencia)
}

describe('fixture de conferencias', () => {
  it('no repite identificadores de conferencia', () => {
    expect(IDS_DE_CONFERENCIA.size).toBe(CONFERENCIAS_DE_EJEMPLO.length)
  })

  it('asigna cada conferencia a una cuenta que existe', () => {
    for (const conferencia of CONFERENCIAS_DE_EJEMPLO) {
      expect(IDS_DE_CUENTA).toContain(conferencia.idDueno)
    }
  })

  it('comparte solo con cuentas existentes, nunca con el propio dueño y sin repetir invitado', () => {
    for (const conferencia of CONFERENCIAS_DE_EJEMPLO) {
      const invitados = conferencia.comparticiones.map((comparticion) => comparticion.idInvitado)

      for (const idInvitado of invitados) {
        expect(IDS_DE_CUENTA).toContain(idInvitado)
        expect(idInvitado).not.toBe(conferencia.idDueno)
      }

      expect(new Set(invitados).size).toBe(invitados.length)
    }
  })

  it('fecha cada conferencia en formato ISO', () => {
    for (const conferencia of CONFERENCIAS_DE_EJEMPLO) {
      expect(conferencia.fechaDelEvento).toMatch(FORMATO_ISO)
    }
  })

  it('codifica cada charla con el formato del evento', () => {
    for (const conferencia of CONFERENCIAS_DE_EJEMPLO) {
      expect(conferencia.codigoDeEvento).toMatch(FORMATO_DE_CODIGO)
    }
  })

  it('cubre los cuatro estados de procesamiento', () => {
    const presentes = new Set(CONFERENCIAS_DE_EJEMPLO.map((conferencia) => conferencia.estado))

    for (const estado of ESTADOS_DE_PROCESAMIENTO) {
      expect(presentes).toContain(estado)
    }
  })

  it('deja cada cuenta con al menos una conferencia a la vista', () => {
    for (const cuenta of CUENTAS_DE_EJEMPLO) {
      const visibles = CONFERENCIAS_DE_EJEMPLO.filter(
        (conferencia) =>
          conferencia.idDueno === cuenta.id ||
          conferencia.comparticiones.some((comparticion) => comparticion.idInvitado === cuenta.id),
      )

      expect(visibles.length).toBeGreaterThan(0)
    }
  })

  /*
    Las dos opciones de privacidad tienen que aparecer en los dos valores, o el
    fixture no puede demostrar que se respetan. Ver PRD.md sección 3.2.
  */
  it('ejerce las dos opciones de privacidad en sus dos valores', () => {
    const privacidades = CONFERENCIAS_DE_EJEMPLO.flatMap((conferencia) =>
      conferencia.comparticiones.map((comparticion) => comparticion.privacidad),
    )

    expect(privacidades.some((privacidad) => privacidad.compartirEtiquetas)).toBe(true)
    expect(privacidades.some((privacidad) => !privacidad.compartirEtiquetas)).toBe(true)
    expect(privacidades.some((privacidad) => privacidad.compartirFichasPendientes)).toBe(true)
    expect(privacidades.some((privacidad) => !privacidad.compartirFichasPendientes)).toBe(true)
  })

  /*
    Sin este caso, la opción de ocultar pendientes no se puede probar de verdad:
    haría falta una conferencia compartida con la opción apagada que además
    tenga fichas pendientes que ocultar.
  */
  it('incluye una conferencia compartida que oculta fichas pendientes reales', () => {
    const casos = CONFERENCIAS_DE_EJEMPLO.filter((conferencia) => {
      const ocultaPendientes = conferencia.comparticiones.some(
        (comparticion) => !comparticion.privacidad.compartirFichasPendientes,
      )
      const tienePendientes = fichasDe(conferencia.id).some(
        (ficha) => ficha.estadoDeValidacion === 'pendiente',
      )

      return ocultaPendientes && tienePendientes
    })

    expect(casos.length).toBeGreaterThan(0)
  })

  /*
    Los criterios de aceptación en Playwright cuentan filas, así que este
    reparto es un contrato y no un accidente. Si alguien añade una conferencia
    sin actualizar esta tabla, revienta aquí y no en un E2E que tarda minutos.

    Berrío a propósito no recibe nada compartido: es el único caso que permite
    probar el estado vacío del segmento "compartidas conmigo" con datos reales.
  */
  it('reparte la visibilidad entre las cuatro cuentas según el contrato del módulo', () => {
    const esperado = [
      { idUsuario: 'usr-alcantara', propias: 5, compartidas: 1 },
      { idUsuario: 'usr-berrio', propias: 4, compartidas: 0 },
      { idUsuario: 'usr-zuluaga', propias: 3, compartidas: 4 },
      { idUsuario: 'usr-penaloza', propias: 2, compartidas: 1 },
    ] as const

    for (const { idUsuario, propias, compartidas } of esperado) {
      const propiasReales = CONFERENCIAS_DE_EJEMPLO.filter(
        (conferencia) => conferencia.idDueno === idUsuario,
      )
      const compartidasReales = CONFERENCIAS_DE_EJEMPLO.filter((conferencia) =>
        conferencia.comparticiones.some((comparticion) => comparticion.idInvitado === idUsuario),
      )

      expect(propiasReales).toHaveLength(propias)
      expect(compartidasReales).toHaveLength(compartidas)
    }

    const totalPropias = esperado.reduce((suma, cuenta) => suma + cuenta.propias, 0)
    expect(CONFERENCIAS_DE_EJEMPLO).toHaveLength(totalPropias)
  })

  it('comparte al menos una conferencia con dos personas distintas', () => {
    const conVariosInvitados = CONFERENCIAS_DE_EJEMPLO.filter(
      (conferencia) => conferencia.comparticiones.length > 1,
    )

    expect(conVariosInvitados.length).toBeGreaterThan(0)
  })

  it('no usa texto de relleno en los campos visibles', () => {
    for (const conferencia of CONFERENCIAS_DE_EJEMPLO) {
      const textos = [
        conferencia.titulo,
        conferencia.ponente,
        conferencia.evento,
        conferencia.temaPrincipal,
        conferencia.resumen,
      ]

      for (const texto of textos) {
        expect(texto.trim().length).toBeGreaterThan(0)
        expect(texto.toLowerCase()).not.toContain('lorem')
        expect(texto).not.toMatch(/^(Conferencia|Ponente|Evento|Tema) \d+$/)
        expect(texto).not.toContain('ejemplo.com')
        expect(texto).not.toContain(GUION_LARGO)
      }
    }
  })
})

describe('fixture de fichas', () => {
  it('no repite identificadores de ficha', () => {
    const ids = FICHAS_DE_EJEMPLO.map((ficha) => ficha.id)

    expect(new Set(ids).size).toBe(ids.length)
  })

  it('ancla cada ficha a una conferencia existente', () => {
    for (const ficha of FICHAS_DE_EJEMPLO) {
      expect(IDS_DE_CONFERENCIA).toContain(ficha.idConferencia)
    }
  })

  /*
    La trazabilidad al segundo exacto es un requisito no funcional del PRD
    (sección 9): un rango invertido o que se sale de la charla rompe la promesa
    de poder volver al punto exacto del audio.
  */
  it('mantiene cada ficha dentro de la duración de su conferencia', () => {
    for (const ficha of FICHAS_DE_EJEMPLO) {
      const conferencia = CONFERENCIAS_DE_EJEMPLO.find(
        (candidata) => candidata.id === ficha.idConferencia,
      )

      expect(conferencia).toBeDefined()
      if (conferencia === undefined) {
        continue
      }

      expect(ficha.segundoInicio).toBeGreaterThanOrEqual(0)
      expect(ficha.segundoFin).toBeGreaterThan(ficha.segundoInicio)
      expect(ficha.segundoFin).toBeLessThanOrEqual(conferencia.duracionEnSegundos)
    }
  })

  it('reporta una confianza automática entre cero y uno', () => {
    for (const ficha of FICHAS_DE_EJEMPLO) {
      expect(ficha.confianzaAutomatica).toBeGreaterThanOrEqual(0)
      expect(ficha.confianzaAutomatica).toBeLessThanOrEqual(1)
    }
  })

  it('solo entrega fichas de conferencias ya procesadas', () => {
    for (const conferencia of CONFERENCIAS_DE_EJEMPLO) {
      if (conferencia.estado === 'procesada') {
        expect(fichasDe(conferencia.id).length).toBeGreaterThan(0)
      } else {
        expect(fichasDe(conferencia.id)).toHaveLength(0)
      }
    }
  })

  it('cubre los seis tipos de unidad y los tres estados de validación', () => {
    const tipos = new Set(FICHAS_DE_EJEMPLO.map((ficha) => ficha.tipoDeUnidad))
    const estados = new Set(FICHAS_DE_EJEMPLO.map((ficha) => ficha.estadoDeValidacion))

    for (const tipo of TIPOS_DE_UNIDAD) {
      expect(tipos).toContain(tipo)
    }

    for (const estado of ESTADOS_DE_VALIDACION) {
      expect(estados).toContain(estado)
    }
  })

  it('transcribe habla real, con su contexto mínimo, y sin guion largo', () => {
    for (const ficha of FICHAS_DE_EJEMPLO) {
      expect(ficha.fragmento.trim().length).toBeGreaterThan(20)
      expect(ficha.contextoMinimo.trim().length).toBeGreaterThan(0)
      expect(ficha.hablante.trim().length).toBeGreaterThan(0)
      expect(ficha.tema.trim().length).toBeGreaterThan(0)
      expect(ficha.fragmento).not.toContain(GUION_LARGO)
      expect(ficha.fragmento.toLowerCase()).not.toContain('lorem')
    }
  })
})

describe('fixture de etiquetas', () => {
  it('asigna cada espacio de etiquetas a una cuenta existente', () => {
    for (const idUsuario of Object.keys(ESPACIOS_DE_ETIQUETAS_DE_EJEMPLO)) {
      expect(IDS_DE_CUENTA).toContain(idUsuario)
    }
  })

  it('mantiene cada etiqueta bajo su propietario y sin identificadores repetidos', () => {
    const idsVistos = new Set<string>()

    for (const [idUsuario, espacio] of Object.entries(ESPACIOS_DE_ETIQUETAS_DE_EJEMPLO)) {
      for (const etiqueta of espacio.etiquetas) {
        expect(etiqueta.idPropietario).toBe(idUsuario)
        expect(etiqueta.nombre.trim()).toBe(etiqueta.nombre)
        expect(etiqueta.nombre.length).toBeGreaterThan(0)
        expect(idsVistos.has(etiqueta.id)).toBe(false)
        idsVistos.add(etiqueta.id)
      }
    }
  })

  it('asigna etiquetas solo a conferencias existentes y a etiquetas del propio espacio', () => {
    for (const espacio of Object.values(ESPACIOS_DE_ETIQUETAS_DE_EJEMPLO)) {
      const propias = new Set(espacio.etiquetas.map((etiqueta) => etiqueta.id))

      for (const asignacion of espacio.asignaciones) {
        expect(propias).toContain(asignacion.idEtiqueta)
        expect(IDS_DE_CONFERENCIA).toContain(asignacion.idConferencia)
      }
    }
  })

  /*
    Dos personas con una etiqueta del mismo nombre son el caso que demuestra que
    las etiquetas son privadas y no un vocabulario compartido (PRD.md 3.1).
  */
  it('repite un nombre de etiqueta entre dos personas distintas', () => {
    const nombresPorPersona = Object.values(ESPACIOS_DE_ETIQUETAS_DE_EJEMPLO).map(
      (espacio) => new Set(espacio.etiquetas.map((etiqueta) => etiqueta.nombre.toLowerCase())),
    )

    const compartidos = nombresPorPersona.flatMap((nombres, indice) =>
      nombresPorPersona
        .slice(indice + 1)
        .flatMap((otros) => [...nombres].filter((nombre) => otros.has(nombre))),
    )

    expect(compartidos.length).toBeGreaterThan(0)
  })

  /*
    Etiquetar una conferencia ajena es el caso de uso que originó la funcionalidad:
    marcar material de otra persona para un artículo propio.
  */
  it('etiqueta al menos una conferencia ajena', () => {
    const ajenas = Object.entries(ESPACIOS_DE_ETIQUETAS_DE_EJEMPLO).flatMap(
      ([idUsuario, espacio]) =>
        espacio.asignaciones.filter((asignacion) => {
          const conferencia = CONFERENCIAS_DE_EJEMPLO.find(
            (candidata) => candidata.id === asignacion.idConferencia,
          )

          return conferencia !== undefined && conferencia.idDueno !== idUsuario
        }),
    )

    expect(ajenas.length).toBeGreaterThan(0)
  })
})
