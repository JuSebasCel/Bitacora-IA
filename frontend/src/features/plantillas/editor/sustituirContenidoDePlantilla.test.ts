import { describe, expect, it } from 'vitest'
import type { JSONContent, RegistroDeDatosDeCampo } from '../data'
import { DATOS_DE_EJEMPLO } from '../data'
import { sustituirContenidoDePlantilla } from './sustituirContenidoDePlantilla'

/*
  Mismo patrón de construcción manual de `JSONContent` que `prepararComandos.test.ts`
  usa para XML, aplicado aquí a los nodos `marcador`/`seccionMarcador` de TipTap
  (ver `editor/extensiones/NodoMarcador.tsx`/`NodoSeccionMarcador.tsx`).
*/

function marcador(campo: string, formato: 'parrafo' | 'lista_vinetas' | 'lista_numerada' = 'parrafo'): JSONContent {
  return {
    type: 'marcador',
    attrs: { origenTipo: 'campo', campo, etiquetaPersonalizada: null, formato },
  }
}

function marcadorPersonalizado(etiqueta: string): JSONContent {
  return {
    type: 'marcador',
    attrs: { origenTipo: 'personalizado', campo: null, etiquetaPersonalizada: etiqueta, formato: 'parrafo' },
  }
}

function parrafoCon(...contenido: JSONContent[]): JSONContent {
  return { type: 'paragraph', content: contenido }
}

function seccion(modo: 'condicional' | 'repetible', campo: string, contenido: JSONContent[]): JSONContent {
  return {
    type: 'seccionMarcador',
    attrs: { modo, origenTipo: 'campo', campo, etiquetaPersonalizada: null },
    content: contenido,
  }
}

function textosDe(contenido: JSONContent): readonly string[] {
  const textos: string[] = []

  function recorrer(nodo: JSONContent): void {
    if (nodo.text !== undefined) textos.push(nodo.text)
    for (const hijo of nodo.content ?? []) recorrer(hijo)
  }

  recorrer(contenido)
  return textos
}

function tiposDe(contenido: JSONContent): readonly string[] {
  const tipos: string[] = []

  function recorrer(nodo: JSONContent): void {
    if (nodo.type !== undefined) tipos.push(nodo.type)
    for (const hijo of nodo.content ?? []) recorrer(hijo)
  }

  recorrer(contenido)
  return tipos
}

describe('sustituirContenidoDePlantilla', () => {
  it('un marcador de campo fijo con dato real se reemplaza por un nodo de texto con ese dato', () => {
    const contenido: JSONContent = { type: 'doc', content: [parrafoCon(marcador('nombre_ponente'))] }
    const datosReales: RegistroDeDatosDeCampo = {
      nombre_ponente: { parrafo: 'Rodrigo Peñaloza', lista: ['Rodrigo Peñaloza'] },
    }

    const resultado = sustituirContenidoDePlantilla(contenido, datosReales)

    expect(textosDe(resultado)).toEqual(['Rodrigo Peñaloza'])
    expect(tiposDe(resultado)).not.toContain('marcador')
  })

  it('sin dato real para ese campo, cae al dato de ejemplo', () => {
    const contenido: JSONContent = { type: 'doc', content: [parrafoCon(marcador('tema_principal'))] }

    const resultado = sustituirContenidoDePlantilla(contenido, {})

    expect(textosDe(resultado)).toEqual([DATOS_DE_EJEMPLO.tema_principal.parrafo])
  })

  it('un marcador con formato de lista une los elementos con « · »', () => {
    const contenido: JSONContent = {
      type: 'doc',
      content: [parrafoCon(marcador('resumen_metodo', 'lista_vinetas'))],
    }
    const datosReales: RegistroDeDatosDeCampo = {
      resumen_metodo: { parrafo: 'x', lista: ['Primero', 'Segundo', 'Tercero'] },
    }

    const resultado = sustituirContenidoDePlantilla(contenido, datosReales)

    expect(textosDe(resultado)).toEqual(['Primero · Segundo · Tercero'])
  })

  it('un marcador personalizado siempre usa el dato de ejemplo, sin importar los datos reales', () => {
    const contenido: JSONContent = { type: 'doc', content: [parrafoCon(marcadorPersonalizado('Puntos de la agenda'))] }
    const datosReales: RegistroDeDatosDeCampo = {
      tema_principal: { parrafo: 'Un tema real', lista: ['Un tema real'] },
    }

    const resultado = sustituirContenidoDePlantilla(contenido, datosReales)

    expect(textosDe(resultado)[0]).toContain('Puntos de la agenda')
  })

  it('una sección condicional verdadera conserva su contenido, sin el nodo de sección', () => {
    const contenido: JSONContent = {
      type: 'doc',
      content: [seccion('condicional', 'cita_destacada', [parrafoCon(marcador('cita_destacada'))])],
    }
    const datosReales: RegistroDeDatosDeCampo = {
      cita_destacada: { parrafo: 'Una cita real', lista: ['Una cita real'] },
    }

    const resultado = sustituirContenidoDePlantilla(contenido, datosReales)

    expect(tiposDe(resultado)).not.toContain('seccionMarcador')
    expect(textosDe(resultado)).toEqual(['Una cita real'])
  })

  it('una sección condicional falsa omite todo su contenido', () => {
    const contenido: JSONContent = {
      type: 'doc',
      content: [
        parrafoCon({ type: 'text', text: 'Antes.' }),
        seccion('condicional', 'cita_destacada', [parrafoCon(marcador('cita_destacada'))]),
        parrafoCon({ type: 'text', text: 'Después.' }),
      ],
    }
    const datosReales: RegistroDeDatosDeCampo = {
      cita_destacada: { parrafo: '', lista: [] },
    }

    const resultado = sustituirContenidoDePlantilla(contenido, datosReales)

    expect(textosDe(resultado)).toEqual(['Antes.', 'Después.'])
  })

  it('una sección repetible expande su contenido una vez por dato, sustituyendo el marcador interno por cada valor', () => {
    const contenido: JSONContent = {
      type: 'doc',
      content: [seccion('repetible', 'resumen_metodo', [parrafoCon(marcador('resumen_metodo'))])],
    }
    const datosReales: RegistroDeDatosDeCampo = {
      resumen_metodo: { parrafo: 'x', lista: ['Primer punto', 'Segundo punto'] },
    }

    const resultado = sustituirContenidoDePlantilla(contenido, datosReales)

    expect(textosDe(resultado)).toEqual(['Primer punto', 'Segundo punto'])
    expect(tiposDe(resultado).filter((tipo) => tipo === 'paragraph')).toHaveLength(2)
  })

  it('una sección repetible sin datos reales cae a la lista de ejemplo (un párrafo por elemento de ejemplo)', () => {
    const contenido: JSONContent = {
      type: 'doc',
      content: [seccion('repetible', 'resumen_metodo', [parrafoCon(marcador('resumen_metodo'))])],
    }

    const resultado = sustituirContenidoDePlantilla(contenido, {})

    expect(textosDe(resultado)).toEqual([...DATOS_DE_EJEMPLO.resumen_metodo.lista])
  })

  it('deja intactos los nodos que no son marcador ni sección (texto, encabezados)', () => {
    const contenido: JSONContent = {
      type: 'doc',
      content: [{ type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Memoria del evento' }] }],
    }

    const resultado = sustituirContenidoDePlantilla(contenido, {})

    expect(resultado).toEqual(contenido)
  })
})
