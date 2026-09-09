"""
Acceso a OpenAI con la API key del usuario que hizo la petición.

Dos responsabilidades, las dos de seguridad antes que de comodidad:

1. La clave nunca se imprime. `ClaveDeOpenAI` redefine `__repr__` y `__str__`
   para que ni un log de depuración, ni un `pytest` que muestre variables
   locales al fallar, ni una traza no capturada la dejen escrita en ningún
   lado. Guardar la clave en un `str` pelado bastaría para que apareciera
   sola el día que alguien agregue un `logging.debug(locals())`.

2. Ninguna excepción del SDK cruza hacia arriba. Se traducen a códigos del
   catálogo, porque el mensaje de OpenAI puede incluir el prefijo de la clave
   y porque la interfaz necesita distinguir "tu clave está mal" (se arregla en
   Configuración) de "OpenAI está caído" (se reintenta) — dos acciones
   distintas que un 500 genérico vuelve indistinguibles.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Protocol

from bitacora.compartido.errores import ErrorDeBitacora


@dataclass(frozen=True)
class ClaveDeOpenAI:
    valor: str

    def __repr__(self) -> str:
        return "ClaveDeOpenAI(<oculta>)"

    def __str__(self) -> str:
        return "<oculta>"


class ClienteDeOpenAI(Protocol):
    """
    Lo mínimo que este backend usa del SDK, para poder sustituirlo en pruebas.

    Se declara el protocolo en vez de mockear `openai.OpenAI` con parches
    porque los parches se rompen cada vez que el SDK reorganiza sus módulos, y
    lo que la suite quiere fijar es el contrato de este backend, no el del SDK.
    """

    @property
    def audio(self) -> Any: ...

    @property
    def chat(self) -> Any: ...


def crear_cliente(clave: ClaveDeOpenAI) -> ClienteDeOpenAI:
    """Se importa aquí dentro para que los módulos puros no arrastren el SDK."""
    from openai import OpenAI

    return OpenAI(api_key=clave.valor)


"""
Nombres de excepción del SDK mapeados por nombre de clase y no por `isinstance`.

Importar `openai.AuthenticationError` en la firma obligaría a tener el SDK
instalado para probar la traducción de errores, que es justo la parte que hay
que poder ejercitar sin red ni credenciales. El nombre de clase es estable
entre versiones del SDK; la ubicación del módulo no lo ha sido.
"""
_CODIGOS_POR_EXCEPCION: dict[str, str] = {
    "AuthenticationError": "IA_API_KEY_RECHAZADA",
    "PermissionDeniedError": "IA_API_KEY_RECHAZADA",
    "RateLimitError": "IA_LIMITE_DE_USO",
    "APIConnectionError": "IA_SIN_RESPUESTA",
    "APITimeoutError": "IA_SIN_RESPUESTA",
    "InternalServerError": "IA_SIN_RESPUESTA",
    "APIStatusError": "IA_FALLO_INESPERADO",
    "BadRequestError": "IA_FALLO_INESPERADO",
}


def codigo_de_error_de_openai(excepcion: BaseException) -> str:
    """
    Recorre la jerarquía de clases para que una subclase caiga en su padre.

    El SDK crea subclases nuevas entre versiones (`ContentFilterFinishReason`,
    por ejemplo, hereda de `APIError`): mirar solo el nombre exacto haría que
    cada versión nueva mandara errores conocidos al genérico sin que nadie se
    entere.
    """
    for clase in type(excepcion).__mro__:
        codigo = _CODIGOS_POR_EXCEPCION.get(clase.__name__)
        if codigo is not None:
            return codigo

    return "IA_FALLO_INESPERADO"


def traducir_fallo(excepcion: BaseException) -> ErrorDeBitacora:
    """
    El detalle guarda el TIPO de la excepción, nunca su mensaje.

    El mensaje de un `AuthenticationError` de OpenAI cita la clave enviada; el
    nombre de la clase dice todo lo que sirve para depurar y no arrastra nada
    sensible al log del servidor.
    """
    return ErrorDeBitacora(codigo_de_error_de_openai(excepcion), type(excepcion).__name__)


"""
Temperatura 0 en todas las llamadas de este backend.

Ni el análisis de discurso ni el agente ganan algo con variedad: dos corridas
sobre la misma charla deberían producir el mismo catálogo, y la misma pregunta
debería devolver la misma respuesta sobre las mismas fichas. Con temperatura
alta, reprocesar se vuelve una lotería en la que desaparecen fichas que
alguien ya validó, y "el chat me dijo otra cosa ayer" deja de ser un bug
reproducible.
"""
TEMPERATURA_DETERMINISTA = 0.0


def contenido_del_mensaje(respuesta: Any) -> str | None:
    """
    Acepta el objeto tipado del SDK o un dict con la misma forma.

    Las pruebas devuelven dicts: exigir el objeto del SDK obligaría a fabricar
    en cada prueba tres capas de objetos falsos (`choices[0].message.content`)
    solo para leer un campo, y esos objetos falsos envejecen con el SDK sin que
    nadie los mire.
    """
    if isinstance(respuesta, dict):
        opciones = respuesta.get("choices") or []
        if not opciones:
            return None
        mensaje = opciones[0].get("message") or {}
        return mensaje.get("content")

    opciones = getattr(respuesta, "choices", None) or []
    if not opciones:
        return None

    return getattr(getattr(opciones[0], "message", None), "content", None)


def leer_json_del_modelo(contenido: str | None) -> Any:
    """
    Interpreta la respuesta del modelo como JSON, tolerando el cerco de markdown.

    Se pide `response_format={"type": "json_object"}` en todas las llamadas, lo
    que ya garantiza JSON válido en los modelos vigentes; esto es el cinturón
    además del tirante, porque el identificador de modelo es configurable por
    entorno y nada impide apuntar a uno que no soporte el modo JSON. Antes que
    reventar con un `JSONDecodeError` a mitad del pipeline y dejar la
    conferencia colgada en `procesando`, se falla con un código propio.
    """
    import json

    texto = (contenido or "").strip()

    if texto.startswith("```"):
        partes = texto.split("```")
        texto = partes[1] if len(partes) > 1 else texto
        if texto.startswith("json"):
            texto = texto[len("json") :]
        texto = texto.strip()

    if texto == "":
        raise ErrorDeBitacora("IA_RESPUESTA_ILEGIBLE", "respuesta vacia")

    try:
        return json.loads(texto)
    except ValueError as fallo:
        raise ErrorDeBitacora("IA_RESPUESTA_ILEGIBLE", type(fallo).__name__) from fallo


def lista_bajo(datos: Any, clave: str) -> list[Any]:
    """
    El modo JSON de OpenAI devuelve un objeto, nunca un arreglo en la raíz.

    Así que todo lo que este backend pide como lista viene envuelto en una
    clave. Se acepta además la lista pelada por si el modelo la devuelve
    directo: resolver los dos casos aquí evita repetir el mismo `isinstance`
    en cada llamador y que uno de ellos se olvide.
    """
    if isinstance(datos, list):
        return datos

    if isinstance(datos, dict):
        valor = datos.get(clave)
        if isinstance(valor, list):
            return valor

    return []
