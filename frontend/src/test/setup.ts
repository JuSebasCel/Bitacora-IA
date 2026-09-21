import { olvidarPlantillasPorPruebas } from '@/features/plantillas/listaRecordada'
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'
import { reiniciarCachePorPruebas } from '@/shared/cache/useConsultaCacheada'

/*
  jsdom refleja el atributo `open` de `<dialog>` (es un atributo booleano
  estándar), pero no implementa `showModal()` ni `close()`: los deja
  indefinidos en vez de darlos como no-ops. `CreadorDeEtiqueta` (F2) usa
  `<dialog>` nativo, así que las pruebas necesitan este relleno mínimo para
  poder abrirlo y cerrarlo. `close()` dispara el evento `close`, igual que en
  un navegador real, porque `CreadorDeEtiqueta` depende de ese evento para
  sincronizar su estado ante un cierre que no pasa por el prop `alCerrar`.
*/
if (typeof HTMLDialogElement !== 'undefined') {
  if (typeof HTMLDialogElement.prototype.showModal !== 'function') {
    HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement): void {
      this.setAttribute('open', '')
    }
  }

  if (typeof HTMLDialogElement.prototype.close !== 'function') {
    HTMLDialogElement.prototype.close = function (this: HTMLDialogElement): void {
      this.removeAttribute('open')
      this.dispatchEvent(new Event('close'))
    }
  }
}

afterEach(() => {
  cleanup()
  sessionStorage.clear()
  /*
    `useConsultaCacheada` guarda su estado a nivel de módulo, fuera de React,
    así que sobrevive entre pruebas de un mismo archivo salvo que se limpie
    a mano. Va después de `cleanup()` para que las suscripciones de los
    componentes ya desmontados se hayan dado de baja primero.
  */
  reiniciarCachePorPruebas()
  olvidarPlantillasPorPruebas()
})
