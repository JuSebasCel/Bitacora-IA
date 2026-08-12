import type { Ponente } from '../data'

/*
  Semilla del directorio de ponentes: derivada de los pares (evento, ponente)
  que ya existen en `data/conferencias.fixture.ts`, uno por combinación única.
  Mariana Escobar Vallejo y Tomás Iriarte Villalba aparecen en dos eventos
  distintos a propósito, con una entrada separada en cada uno: es el caso real
  que confirma que un ponente se asocia a un evento, no es una identidad
  global (ver `directorio.ts`).

  Se borra cuando entre B1 y el directorio viva en Supabase.
*/
export const PONENTES_DE_EJEMPLO: readonly Ponente[] = [
  { id: 'pon-evt-saia-mariana-escobar-vallejo', nombre: 'Mariana Escobar Vallejo', idEvento: 'evt-saia' },
  {
    id: 'pon-evt-saia-andres-felipe-restrepo-ocampo',
    nombre: 'Andrés Felipe Restrepo Ocampo',
    idEvento: 'evt-saia',
  },
  { id: 'pon-evt-saia-tomas-iriarte-villalba', nombre: 'Tomás Iriarte Villalba', idEvento: 'evt-saia' },
  { id: 'pon-evt-saia-esteban-quiroga-lemus', nombre: 'Esteban Quiroga Lemus', idEvento: 'evt-saia' },
  { id: 'pon-evt-saia-daniela-marchena-solis', nombre: 'Daniela Marchena Solís', idEvento: 'evt-saia' },
  { id: 'pon-evt-saia-ignacio-vergara-pinto', nombre: 'Ignacio Vergara Pinto', idEvento: 'evt-saia' },

  { id: 'pon-evt-ccdn-lucia-ferreira-nogueira', nombre: 'Lucía Ferreira Nogueira', idEvento: 'evt-ccdn' },
  {
    id: 'pon-evt-ccdn-natalia-bermudez-arango',
    nombre: 'Natalia Bermúdez Arango',
    idEvento: 'evt-ccdn',
  },
  { id: 'pon-evt-ccdn-mariana-escobar-vallejo', nombre: 'Mariana Escobar Vallejo', idEvento: 'evt-ccdn' },
  { id: 'pon-evt-ccdn-tomas-iriarte-villalba', nombre: 'Tomás Iriarte Villalba', idEvento: 'evt-ccdn' },

  {
    id: 'pon-evt-jis-paula-andrea-cifuentes-mora',
    nombre: 'Paula Andrea Cifuentes Mora',
    idEvento: 'evt-jis',
  },
  { id: 'pon-evt-jis-gabriel-ossa-trujillo', nombre: 'Gabriel Ossa Trujillo', idEvento: 'evt-jis' },
  { id: 'pon-evt-jis-natalia-bermudez-arango', nombre: 'Natalia Bermúdez Arango', idEvento: 'evt-jis' },
]
