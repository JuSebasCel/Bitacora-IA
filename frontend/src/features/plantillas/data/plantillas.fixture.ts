import type { Plantilla } from './tipos'

/*
  Semilla del listado de plantillas: para que la pantalla no arranque vacía.
  Se borra cuando entre B1 y las plantillas vivan en Supabase.

  `contenido` es un documento TipTap real: los nodos `marcador` y
  `seccionMarcador` son los definidos en `editor/extensiones/`.
*/
export const PLANTILLAS_DE_EJEMPLO: readonly Plantilla[] = [
  {
    id: 'pla-memoria-estandar',
    nombre: 'Memoria estándar',
    origen: 'blanco',
    colorPrincipal: '#2f5fdb',
    colorSecundario: '#5b6472',
    actualizadaEl: '2026-04-02T09:00:00.000Z',
    contenido: {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Memoria del evento' }] },
        {
          type: 'paragraph',
          content: [
            {
              type: 'marcador',
              attrs: { origenTipo: 'campo', campo: 'tema_principal', etiquetaPersonalizada: null, formato: 'parrafo' },
            },
          ],
        },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Resumen del método' }],
        },
        {
          type: 'paragraph',
          content: [
            {
              type: 'marcador',
              attrs: {
                origenTipo: 'campo',
                campo: 'resumen_metodo',
                etiquetaPersonalizada: null,
                formato: 'lista_vinetas',
              },
            },
          ],
        },
        {
          type: 'seccionMarcador',
          attrs: {
            modo: 'condicional',
            origenTipo: 'personalizado',
            campo: null,
            etiquetaPersonalizada: 'Puntos de la agenda',
          },
          content: [
            { type: 'paragraph', content: [{ type: 'text', text: 'Agenda:' }] },
            {
              type: 'paragraph',
              content: [
                {
                  type: 'marcador',
                  attrs: {
                    origenTipo: 'personalizado',
                    campo: null,
                    etiquetaPersonalizada: 'Puntos de la agenda',
                    formato: 'lista_vinetas',
                  },
                },
              ],
            },
          ],
        },
      ],
    },
  },
  {
    id: 'pla-cita-simple',
    nombre: 'Cita simple',
    origen: 'blanco',
    colorPrincipal: '#9a2e4f',
    colorSecundario: '#1f1f24',
    actualizadaEl: '2026-04-10T09:00:00.000Z',
    contenido: {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Cita destacada' }] },
        {
          type: 'paragraph',
          content: [
            {
              type: 'marcador',
              attrs: {
                origenTipo: 'campo',
                campo: 'cita_destacada',
                etiquetaPersonalizada: null,
                formato: 'parrafo',
              },
            },
          ],
        },
        {
          type: 'paragraph',
          content: [
            {
              type: 'marcador',
              attrs: {
                origenTipo: 'campo',
                campo: 'nombre_ponente',
                etiquetaPersonalizada: null,
                formato: 'parrafo',
              },
            },
          ],
        },
      ],
    },
  },
]
