"""
Dobles de prueba compartidos.

Toda la suite corre sin red y sin credenciales, y estos objetos son la razón:
sustituyen a Supabase y a OpenAI por implementaciones en memoria que además
REGISTRAN lo que se les pidió, de modo que una prueba puede afirmar sobre el
orden de las escrituras (por ejemplo, que el estado pasó por `procesando`
antes que por `procesada`) y no solo sobre el valor final.
"""

from __future__ import annotations

import sys
from pathlib import Path
from typing import Any, Sequence

import pytest

RAIZ_DEL_BACKEND = Path(__file__).resolve().parent.parent
if str(RAIZ_DEL_BACKEND) not in sys.path:
    sys.path.insert(0, str(RAIZ_DEL_BACKEND))

from bitacora.agente.recuperacion import (  # noqa: E402
    ConferenciaDeFicha,
    FichaRecuperada,
    PasoDeRazonamiento,
)
from bitacora.compartido.errores import ErrorDeBitacora  # noqa: E402
from bitacora.conferencias.tipos import Conferencia, Ficha, PropuestaDeTema, Segmento, Tema  # noqa: E402


@pytest.fixture
def temas() -> tuple[Tema, ...]:
    return (
        Tema(id="tem-sesgos", nombre="Sesgos algorítmicos"),
        Tema(id="tem-evaluacion", nombre="Evaluación de modelos"),
        Tema(id="tem-datos", nombre="Gobernanza de datos"),
    )


@pytest.fixture
def conferencia() -> Conferencia:
    return Conferencia(
        id="conf-1",
        titulo="Sesgos en modelos de lenguaje",
        ponente="Ana Ruiz",
        evento="Congreso IA 2026",
        codigo_de_evento="CIA26-04",
        fecha_del_evento="2026-04-12",
        duracion_en_segundos=0,
        id_dueno="usr-1",
        estado="en-cola",
        fuente="audio",
        resumen="",
        id_tema_principal=None,
    )


class RepositorioFalso:
    """
    Repositorio de conferencias en memoria, con un diario de operaciones.

    `fallos` permite decir "esta operación falla con este código" sin tener que
    escribir una subclase por cada camino de error: es lo que hace legibles las
    pruebas del pipeline de fallo, que son la mitad de las que importan.
    """

    def __init__(
        self,
        conferencia: Conferencia,
        temas: Sequence[Tema] = (),
        fuente: tuple[str, bytes] = ("charla.mp3", b"audio"),
    ) -> None:
        self.conferencia = conferencia
        self.temas = tuple(temas)
        self.fuente = fuente
        self.estados: list[str] = []
        self.fichas_guardadas: tuple[Ficha, ...] = ()
        self.resumen_guardado = ""
        self.duracion_guardada = 0
        self.propuestas_registradas: tuple[PropuestaDeTema, ...] = ()
        self.evento_de_las_propuestas: str | None = None
        self.temas_creados: tuple[str, ...] = ()
        self.fallos: dict[str, str] = {}

    def _quizas_fallar(self, operacion: str) -> None:
        codigo = self.fallos.get(operacion)
        if codigo is not None:
            raise ErrorDeBitacora(codigo)

    def obtener_conferencia(self, id_conferencia: str) -> Conferencia:
        self._quizas_fallar("obtener_conferencia")
        if id_conferencia != self.conferencia.id:
            raise ErrorDeBitacora("CONF_NO_ENCONTRADA")

        return self.conferencia

    def listar_temas(self) -> tuple[Tema, ...]:
        self._quizas_fallar("listar_temas")

        return self.temas

    def crear_temas(self, nombres: Sequence[str]) -> tuple[Tema, ...]:
        """
        Da de alta lo que no estuviera ya, como el upsert de verdad.

        Devolver tambien los que ya existian es lo que permite al pipeline
        resolver una ficha contra un tema que otra ventana acababa de crear.
        """
        self._quizas_fallar("crear_temas")

        limpios = [n.strip() for n in nombres if n.strip()]
        self.temas_creados = tuple(dict.fromkeys(limpios))

        existentes = {t.nombre.casefold(): t for t in self.temas}
        creados: list[Tema] = []

        for nombre in self.temas_creados:
            if nombre.casefold() in existentes:
                creados.append(existentes[nombre.casefold()])
                continue

            tema = Tema(id=f"tem-nuevo-{len(existentes) + len(creados)}", nombre=nombre)
            creados.append(tema)
            self.temas = (*self.temas, tema)

        return tuple(creados)

    def marcar_estado(self, id_conferencia: str, estado: str) -> None:
        self.estados.append(estado)

    def guardar_resultado_del_analisis(
        self,
        id_conferencia: str,
        fichas: Sequence[Ficha],
        resumen: str,
        duracion_en_segundos: int,
    ) -> None:
        self._quizas_fallar("guardar_resultado_del_analisis")
        self.fichas_guardadas = tuple(fichas)
        self.resumen_guardado = resumen
        self.duracion_guardada = duracion_en_segundos
        self.estados.append("procesada")

    def registrar_temas_propuestos(
        self, id_evento: str | None, propuestas: Sequence[PropuestaDeTema]
    ) -> None:
        self._quizas_fallar("registrar_temas_propuestos")
        self.evento_de_las_propuestas = id_evento
        self.propuestas_registradas = tuple(propuestas)

    def leer_transcripcion_guardada(self, conferencia: Conferencia) -> tuple[Segmento, ...] | None:
        return None

    def guardar_transcripcion(self, conferencia: Conferencia, segmentos: Sequence[Segmento]) -> None:
        return None

    def descargar_fuente(self, conferencia: Conferencia) -> tuple[str, bytes]:
        self._quizas_fallar("descargar_fuente")

        return self.fuente


class RepositorioDelAgenteFalso:
    def __init__(
        self,
        fichas: Sequence[FichaRecuperada] = (),
        temas: Sequence[Tema] = (),
        eventos: Sequence[str] = (),
        alcance: Any = None,
    ) -> None:
        self.fichas = tuple(fichas)
        self.temas = tuple(temas)
        self.eventos = tuple(eventos)
        self.alcance = alcance
        self.filtros_recibidos: Any = None
        self.mensajes_de_usuario: list[str] = []
        self.respuestas: list[dict[str, Any]] = []
        self.conversacion_creada = False

    def listar_temas(self) -> tuple[Tema, ...]:
        return self.temas

    def listar_eventos_visibles(self) -> tuple[str, ...]:
        return self.eventos

    def buscar_fichas(self, filtros: Any) -> tuple[FichaRecuperada, ...]:
        self.filtros_recibidos = filtros

        return self.fichas

    def asegurar_conversacion(self, id_conversacion: str | None, titulo: str) -> tuple[str, Any]:
        if id_conversacion is None:
            self.conversacion_creada = True
            return "conv-nueva", self.alcance

        return id_conversacion, self.alcance

    def guardar_mensaje_de_usuario(self, id_conversacion: str, contenido: str) -> None:
        self.mensajes_de_usuario.append(contenido)

    def guardar_respuesta(
        self,
        id_conversacion: str,
        contenido: str,
        ids_fichas_citadas: Sequence[str],
        pasos: Sequence[PasoDeRazonamiento],
    ) -> str:
        self.respuestas.append(
            {
                "contenido": contenido,
                "ids": tuple(ids_fichas_citadas),
                "pasos": tuple(pasos),
            }
        )

        return f"msg-{len(self.respuestas)}"


def ficha_recuperada(
    id_ficha: str,
    fragmento: str,
    *,
    id_tema: str = "tem-sesgos",
    tipo: str = "postura",
    estado: str = "pendiente",
    inicio: int = 10,
    id_conferencia: str = "conf-1",
    titulo: str = "Sesgos en modelos de lenguaje",
    evento: str = "Congreso IA 2026",
    fecha: str = "2026-04-12",
) -> FichaRecuperada:
    return FichaRecuperada(
        id=id_ficha,
        fragmento=fragmento,
        hablante="Ana Ruiz",
        segundo_inicio=inicio,
        segundo_fin=inicio + 20,
        id_tema=id_tema,
        tipo_de_unidad=tipo,
        estado_de_validacion=estado,
        conferencia=ConferenciaDeFicha(
            id=id_conferencia,
            titulo=titulo,
            ponente="Ana Ruiz",
            evento=evento,
            fecha_del_evento=fecha,
        ),
    )


def respuesta_de_chat(contenido: str | None) -> dict[str, Any]:
    """Imita la forma de una respuesta del SDK de OpenAI sin construir sus objetos."""
    return {"choices": [{"message": {"content": contenido}}]}
