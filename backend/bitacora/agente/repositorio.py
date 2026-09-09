"""
Consultas del agente: recuperación de fichas y persistencia de la conversación.

Lo importante de este archivo es lo que NO hace: no filtra por dueño ni por
compartición. Las políticas de `fichas` y `conferencias` ya deciden qué ve
cada quien —lo propio, más lo compartido, y de lo compartido solo lo validado
salvo que el dueño haya permitido lo pendiente— y la consulta corre con el
token de esa persona. Añadir aquí un `eq('id_dueno', ...)` no sería más
seguro: sería una segunda regla de acceso, distinta de la de la base de datos,
que tarde o temprano diverge de ella.
"""

from __future__ import annotations

from typing import Any, Protocol, Sequence

from bitacora.agente.filtros import FiltrosDeConsulta
from bitacora.agente.recuperacion import ConferenciaDeFicha, FichaRecuperada, PasoDeRazonamiento
from bitacora.compartido.datos import ClienteSupabase, traducir_fallo_de_datos
from bitacora.compartido.errores import ErrorDeBitacora
from bitacora.conferencias.tipos import Tema

"""
Tope de filas que se traen de Postgres antes de aplicar la búsqueda por
palabra en memoria (ver `recuperacion.py`). Es un límite de seguridad, no el
tamaño esperado de una respuesta: existe para que una consulta sin ningún
filtro estructurado no intente cargar el catálogo entero en RAM.
"""
LIMITE_DE_CANDIDATAS = 500

_COLUMNAS = (
    "id, fragmento, hablante, segundo_inicio, segundo_fin, id_tema, tipo_de_unidad, "
    "estado_de_validacion, id_conferencia, "
    "conferencias!inner(id, titulo, ponente, evento, fecha_del_evento)"
)


class RepositorioDelAgente(Protocol):
    def listar_temas(self) -> tuple[Tema, ...]: ...

    def listar_eventos_visibles(self) -> tuple[str, ...]: ...

    def buscar_fichas(self, filtros: FiltrosDeConsulta) -> tuple[FichaRecuperada, ...]: ...

    def asegurar_conversacion(self, id_conversacion: str | None, titulo: str) -> tuple[str, Any]: ...

    def guardar_mensaje_de_usuario(self, id_conversacion: str, contenido: str) -> None: ...

    def guardar_respuesta(
        self,
        id_conversacion: str,
        contenido: str,
        ids_fichas_citadas: Sequence[str],
        pasos: Sequence[PasoDeRazonamiento],
    ) -> str: ...


def _fila_a_ficha(fila: dict[str, Any]) -> FichaRecuperada | None:
    conferencia = fila.get("conferencias")
    if isinstance(conferencia, list):
        conferencia = conferencia[0] if conferencia else None
    if not isinstance(conferencia, dict):
        return None

    return FichaRecuperada(
        id=str(fila["id"]),
        fragmento=str(fila.get("fragmento") or ""),
        hablante=str(fila.get("hablante") or ""),
        segundo_inicio=int(fila.get("segundo_inicio") or 0),
        segundo_fin=int(fila.get("segundo_fin") or 0),
        id_tema=str(fila.get("id_tema") or ""),
        tipo_de_unidad=str(fila.get("tipo_de_unidad") or ""),
        estado_de_validacion=str(fila.get("estado_de_validacion") or ""),
        conferencia=ConferenciaDeFicha(
            id=str(conferencia.get("id") or ""),
            titulo=str(conferencia.get("titulo") or ""),
            ponente=str(conferencia.get("ponente") or ""),
            evento=str(conferencia.get("evento") or ""),
            fecha_del_evento=str(conferencia.get("fecha_del_evento") or ""),
        ),
    )


class RepositorioSupabaseDelAgente:
    def __init__(self, cliente: ClienteSupabase, id_usuario: str) -> None:
        self._cliente = cliente
        self._id_usuario = id_usuario

    def listar_temas(self) -> tuple[Tema, ...]:
        try:
            respuesta = self._cliente.table("temas").select("id, nombre").execute()
        except Exception as fallo:  # noqa: BLE001
            raise traducir_fallo_de_datos(fallo) from fallo

        return tuple(
            Tema(id=str(fila["id"]), nombre=str(fila.get("nombre") or ""))
            for fila in (getattr(respuesta, "data", None) or [])
        )

    def listar_eventos_visibles(self) -> tuple[str, ...]:
        """Los eventos que esta persona alcanza, no el directorio completo: son la lista contra la que se valida un filtro propuesto."""
        try:
            respuesta = self._cliente.table("conferencias").select("evento").execute()
        except Exception as fallo:  # noqa: BLE001
            raise traducir_fallo_de_datos(fallo) from fallo

        nombres = [
            str(fila.get("evento") or "")
            for fila in (getattr(respuesta, "data", None) or [])
            if fila.get("evento")
        ]

        return tuple(sorted(set(nombres)))

    def buscar_fichas(self, filtros: FiltrosDeConsulta) -> tuple[FichaRecuperada, ...]:
        """
        Solo los criterios estructurados van al `where`; la palabra clave no.

        El emparejamiento por palabra vive en `recuperacion.py` para que sea el
        mismo que el del catálogo (ver el comentario largo de ese archivo).
        Aquí se empuja a Postgres lo que Postgres hace mejor y sin cambiar de
        semántica: igualdades sobre columnas indexadas.
        """
        try:
            consulta = self._cliente.table("fichas").select(_COLUMNAS)

            if filtros.id_tema is not None:
                consulta = consulta.eq("id_tema", filtros.id_tema)
            if filtros.tipo_de_unidad is not None:
                consulta = consulta.eq("tipo_de_unidad", filtros.tipo_de_unidad)
            if filtros.estado != "todos":
                consulta = consulta.eq("estado_de_validacion", filtros.estado)
            if filtros.evento is not None:
                consulta = consulta.eq("conferencias.evento", filtros.evento)
            if filtros.ids_conferencias:
                consulta = consulta.in_("id_conferencia", list(filtros.ids_conferencias))

            respuesta = consulta.limit(LIMITE_DE_CANDIDATAS).execute()
        except Exception as fallo:  # noqa: BLE001
            raise traducir_fallo_de_datos(fallo) from fallo

        fichas = [
            _fila_a_ficha(fila) for fila in (getattr(respuesta, "data", None) or [])
        ]

        return tuple(ficha for ficha in fichas if ficha is not None)

    def asegurar_conversacion(
        self, id_conversacion: str | None, titulo: str
    ) -> tuple[str, Any]:
        """
        Devuelve el id y el alcance guardado. Sin id, crea la conversación.

        El alcance sale de la fila y no del cuerpo de la petición: es una
        preferencia del usuario que ya está persistida, y aceptarla desde el
        cliente permitiría a una petición manipulada ampliar el alcance de una
        conversación ajena — aunque RLS la frenaría después, la regla más
        simple es no leer del cliente lo que ya está en la base.
        """
        if id_conversacion is not None:
            try:
                respuesta = (
                    self._cliente.table("conversaciones_chat")
                    .select("id, alcance")
                    .eq("id", id_conversacion)
                    .limit(1)
                    .execute()
                )
            except Exception as fallo:  # noqa: BLE001
                raise traducir_fallo_de_datos(fallo) from fallo

            filas = getattr(respuesta, "data", None) or []
            if not filas:
                raise ErrorDeBitacora("CHAT_CONVERSACION_NO_ENCONTRADA")

            return str(filas[0]["id"]), filas[0].get("alcance")

        try:
            respuesta = (
                self._cliente.table("conversaciones_chat")
                .insert({"id_usuario": self._id_usuario, "titulo": titulo})
                .execute()
            )
        except Exception as fallo:  # noqa: BLE001
            raise traducir_fallo_de_datos(fallo) from fallo

        filas = getattr(respuesta, "data", None) or []
        if not filas:
            raise ErrorDeBitacora("DATOS_FALLO_INESPERADO", "insert sin retorno")

        return str(filas[0]["id"]), filas[0].get("alcance")

    def guardar_mensaje_de_usuario(self, id_conversacion: str, contenido: str) -> None:
        self._insertar(fila_de_mensaje_de_usuario(id_conversacion, contenido))

    def guardar_respuesta(
        self,
        id_conversacion: str,
        contenido: str,
        ids_fichas_citadas: Sequence[str],
        pasos: Sequence[PasoDeRazonamiento],
    ) -> str:
        fila = fila_de_respuesta(id_conversacion, contenido, ids_fichas_citadas, pasos)
        insertada = self._insertar(fila)

        try:
            self._cliente.table("conversaciones_chat").update(
                {"actualizada_el": "now()"}
            ).eq("id", id_conversacion).execute()
        except Exception as fallo:  # noqa: BLE001
            raise traducir_fallo_de_datos(fallo) from fallo

        return insertada

    def _insertar(self, fila: dict[str, Any]) -> str:
        try:
            respuesta = self._cliente.table("mensajes_chat").insert(fila).execute()
        except Exception as fallo:  # noqa: BLE001
            raise traducir_fallo_de_datos(fallo) from fallo

        filas = getattr(respuesta, "data", None) or []

        return str(filas[0]["id"]) if filas else ""


"""
Las tres formas de fila que admite `mensajes_chat_forma_segun_rol`, cada una
en su función pura.

La restricción de la migración es un `check` con tres ramas excluyentes, y
armar la fila a mano en cada sitio es la forma segura de violarla sin darse
cuenta: basta dejar `tipo` puesto en un mensaje de usuario, o `contenido` nulo
en una respuesta, para que Postgres rechace la inserción con un error que no
dice cuál de las tres ramas falló. Aisladas aquí, la suite las compara contra
las tres ramas del `check` y el error se atrapa antes de llegar a la base.
"""


def fila_de_mensaje_de_usuario(id_conversacion: str, contenido: str) -> dict[str, Any]:
    return {"id_conversacion": id_conversacion, "rol": "usuario", "contenido": contenido}


def fila_de_respuesta(
    id_conversacion: str,
    contenido: str,
    ids_fichas_citadas: Sequence[str],
    pasos: Sequence[PasoDeRazonamiento],
) -> dict[str, Any]:
    return {
        "id_conversacion": id_conversacion,
        "rol": "asistente",
        "tipo": "respuesta",
        "contenido": contenido,
        "ids_fichas_citadas": list(ids_fichas_citadas),
        "pasos_de_razonamiento": [
            {
                "descripcion": paso.descripcion,
                "descartadas": [dict(descartada) for descartada in paso.descartadas],
                "totalDescartadas": paso.total_descartadas,
            }
            for paso in pasos
        ],
    }


def fila_de_aclaracion(
    id_conversacion: str, pregunta: str, opciones: Sequence[dict[str, Any]]
) -> dict[str, Any]:
    return {
        "id_conversacion": id_conversacion,
        "rol": "asistente",
        "tipo": "aclaracion",
        "pregunta": pregunta,
        "opciones": list(opciones),
    }
