"""
Capa de acceso a datos: el cliente de Supabase montado sobre el token del
usuario que hizo la petición.

El módulo se llama `datos` y no `supabase` a propósito: un módulo propio con
el nombre del paquete del SDK que él mismo importa es una trampa lista para
que alguien la pise el día que agregue un import relativo.

Este es el requisito de seguridad que ordena todo el backend: no existe una
service-role key en ninguna parte del código ni de `.env.example`. El cliente
se construye con la anon key —la misma que usa el navegador— y con el
`access_token` que el frontend manda en `Authorization: Bearer`, de modo que
cada consulta llega a Postgres como ese usuario y las políticas de RLS de
`supabase/migrations/…_esquema_propio.sql` deciden fila por fila qué ve y qué
puede escribir, exactamente igual que cuando el frontend consulta directo.

La alternativa obvia —una service-role key y filtrar por `id_dueno` en cada
consulta— convertiría cada `where` olvidado en una fuga del catálogo completo
del grupo, y dejaría el aislamiento dependiendo de que este backend no tenga
bugs. Aquí depende de la base de datos, que es donde el proyecto decidió que
viva.

También traduce el `APIError` de PostgREST al catálogo de errores, con los
mismos tres desenlaces que `frontend/src/shared/supabase/consultas.ts`.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Literal, Protocol

from bitacora.compartido.configuracion import Configuracion
from bitacora.compartido.errores import ErrorDeBitacora
from bitacora.compartido.ia import ClaveDeOpenAI

CODIGO_PG_UNICIDAD = "23505"
CODIGO_PG_LLAVE_FORANEA = "23503"

"""
RLS rechaza una escritura con `42501`; PostgREST responde `PGRST301` cuando el
token no autoriza y `PGRST116` cuando la fila existe pero la política no la
deja ver. Desde aquí los tres significan lo mismo: no te corresponde.
"""
CODIGOS_SIN_PERMISO = frozenset({"42501", "PGRST301", "PGRST116"})


def codigo_de_error_de_postgrest(error: Any) -> str:
    codigo = str(getattr(error, "code", "") or "")
    mensaje = str(getattr(error, "message", "") or "")

    if codigo == CODIGO_PG_UNICIDAD:
        return "DATOS_CONFLICTO"

    if codigo == CODIGO_PG_LLAVE_FORANEA or codigo in CODIGOS_SIN_PERMISO:
        return "DATOS_SIN_PERMISO"

    """
    El fallo de red no trae código propio: llega como un error de httpx
    envuelto, con `code` vacío. Es el único caso que se reconoce por el
    mensaje, y solo después de descartar todos los códigos reales, para que un
    error de Postgres que mencione «network» no se reporte como conexión caída.
    """
    if codigo == "" and any(
        pista in mensaje.lower() for pista in ("connect", "network", "timeout", "conexi")
    ):
        return "DATOS_SIN_CONEXION"

    return "DATOS_FALLO_INESPERADO"


def traducir_fallo_de_datos(excepcion: BaseException) -> ErrorDeBitacora:
    """El detalle guarda código y tipo; el mensaje de Postgres puede citar datos de una fila."""
    codigo = codigo_de_error_de_postgrest(excepcion)
    detalle = f"{type(excepcion).__name__}:{getattr(excepcion, 'code', '') or 'sin-codigo'}"

    return ErrorDeBitacora(codigo, detalle)


@dataclass(frozen=True)
class Sesion:
    """Identidad de quien hizo la petición, ya verificada contra Supabase Auth."""

    id_usuario: str
    token: str


class ClienteSupabase(Protocol):
    def table(self, nombre: str) -> Any: ...

    def rpc(self, nombre: str, parametros: dict[str, Any] | None = ...) -> Any: ...

    @property
    def storage(self) -> Any: ...

    @property
    def auth(self) -> Any: ...


def crear_cliente(configuracion: Configuracion, token: str) -> ClienteSupabase:
    """
    Se importa el SDK dentro de la función para que los módulos puros y sus
    pruebas no tengan que cargar `supabase` ni su cadena de dependencias.

    `ClientOptions` se importa del paquete y no de `supabase.lib.client_options`.
    Parecen lo mismo y no lo son: ese módulo define `ClientOptions` (la base) y
    `SyncClientOptions`, y `create_client` —que es síncrono— necesita la
    segunda. El paquete reexporta justamente esa. Con la base, la creación del
    cliente muere en `AttributeError: 'ClientOptions' object has no attribute
    'storage'`, y lo hace en tiempo de ejecución contra Supabase real: la suite
    no lo veía porque ahí el SDK está mockeado.

    El token va tanto en la cabecera del cliente como en `postgrest.auth`: la
    cabecera cubre Storage y las llamadas RPC, y `postgrest.auth` cubre las
    consultas a tablas. Poner solo una de las dos deja la mitad de las
    operaciones corriendo como `anon`, que con estas políticas no ve nada —un
    fallo que se manifiesta como "no hay datos" y no como "no tienes permiso",
    y por eso cuesta tanto de diagnosticar.
    """
    from supabase import ClientOptions, create_client

    cliente = create_client(
        configuracion.supabase_url,
        configuracion.supabase_anon_key,
        options=ClientOptions(headers={"Authorization": f"Bearer {token}"}),
    )
    cliente.postgrest.auth(token)

    return cliente


def verificar_sesion(cliente: ClienteSupabase, token: str) -> Sesion:
    """
    Se le pregunta a Supabase Auth quién es, en vez de decodificar el JWT aquí.

    Verificar la firma por nuestra cuenta exigiría el secreto JWT del proyecto
    en el entorno del backend —un secreto más que custodiar, y uno que permite
    fabricar sesiones— cuando Supabase ya expone el endpoint que lo hace. Es un
    viaje de red extra por petición; en un backend cuyas operaciones duran
    segundos o minutos, no es donde está el costo.
    """
    try:
        respuesta = cliente.auth.get_user(token)
    except Exception as fallo:  # noqa: BLE001 - cualquier fallo aquí es un token no utilizable
        raise ErrorDeBitacora("AUTH_TOKEN_INVALIDO", type(fallo).__name__) from fallo

    usuario = getattr(respuesta, "user", None)
    id_usuario = getattr(usuario, "id", None)

    if not id_usuario:
        raise ErrorDeBitacora("AUTH_TOKEN_INVALIDO", "sin usuario")

    return Sesion(id_usuario=str(id_usuario), token=token)


Proposito = Literal["analisis", "chat"]
"""Para qué se usa una API key. Cada persona puede tener una por propósito."""


def leer_api_key_de_openai(cliente: ClienteSupabase, proposito: Proposito = "analisis") -> ClaveDeOpenAI:
    """
    `leer_mi_api_key()` no recibe el usuario: lo resuelve con `auth.uid()`
    del lado de Postgres, así que es estructuralmente imposible pedir la
    clave de otra persona desde aquí, aunque este backend quisiera. Sí
    recibe el propósito: hay una clave para el análisis y otra, opcional,
    para el chat.

    Sin clave de chat, el chat usa la de análisis: la separación existe para
    quien quiera dos límites de gasto distintos, no para obligar a nadie a
    pegar dos claves.

    El valor devuelto se envuelve de inmediato en `ClaveDeOpenAI` y nunca toca
    un log: la única forma de sacarlo es leer `.valor` a propósito.
    """
    try:
        respuesta = cliente.rpc("leer_mi_api_key", {"proposito": proposito}).execute()
    except Exception as fallo:  # noqa: BLE001
        raise traducir_fallo_de_datos(fallo) from fallo

    valor = getattr(respuesta, "data", None)

    if not isinstance(valor, str) or valor.strip() == "":
        if proposito == "chat":
            return leer_api_key_de_openai(cliente, "analisis")
        raise ErrorDeBitacora("CONFIG_API_KEY_REQUERIDA")

    return ClaveDeOpenAI(valor.strip())
