import type { Plantilla } from './tipos'

/*
  Semilla del listado de plantillas: para que la pantalla no arranque vacía.
  Se borra cuando entre B1 y las plantillas vivan en Supabase.
*/
export const PLANTILLAS_DE_EJEMPLO: readonly Plantilla[] = [
  {
    id: 'pla-memoria-estandar',
    nombre: 'Memoria estándar',
    colorPrincipal: '#2f5fdb',
    colorSecundario: '#5b6472',
    actualizadaEl: '2026-04-02T09:00:00.000Z',
    elementos: [
      {
        id: 'el-titulo-principal',
        tipo: 'texto',
        rol: 'titulo',
        contenido: 'Memoria del evento',
        posicion: { x: 0.08, y: 0.06, ancho: 0.6, alto: 0.1 },
      },
      {
        id: 'el-marcador-tema',
        tipo: 'marcador',
        campo: 'tema_principal',
        formato: 'parrafo',
        posicion: { x: 0.08, y: 0.2, ancho: 0.84, alto: 0.12 },
      },
      {
        id: 'el-marcador-resumen',
        tipo: 'marcador',
        campo: 'resumen_metodo',
        formato: 'lista',
        posicion: { x: 0.08, y: 0.36, ancho: 0.84, alto: 0.3 },
      },
    ],
  },
  {
    id: 'pla-cita-simple',
    nombre: 'Cita simple',
    colorPrincipal: '#9a2e4f',
    colorSecundario: '#1f1f24',
    actualizadaEl: '2026-04-10T09:00:00.000Z',
    elementos: [
      {
        id: 'el-marcador-cita',
        tipo: 'marcador',
        campo: 'cita_destacada',
        formato: 'parrafo',
        posicion: { x: 0.15, y: 0.3, ancho: 0.7, alto: 0.2 },
      },
      {
        id: 'el-marcador-ponente',
        tipo: 'marcador',
        campo: 'nombre_ponente',
        formato: 'parrafo',
        posicion: { x: 0.15, y: 0.55, ancho: 0.7, alto: 0.08 },
      },
    ],
  },
]
