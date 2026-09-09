"""
La verificación de la respuesta del modelo contra las fichas recuperadas.

Este archivo es el corazón del producto en su forma más pequeña: sintetizar
únicamente sobre fichas reales y devolver siempre los ids citados. Todo lo que
el modelo redacta pasa por aquí antes de guardarse, y lo que no se sostiene en
una ficha recuperada no se guarda.

Hay tres formas conocidas en que un modelo rompe esa promesa, y las tres se
atajan abajo: citar un id que no estaba entre las fichas que se le dieron,
responder sin citar ninguna, y responder cuando no había fichas que citar.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Mapping, Sequence

from bitacora.agente.recuperacion import FichaRecuperada


@dataclass(frozen=True)
class RespuestaVerificada:
    contenido: str
    ids_fichas_citadas: tuple[str, ...]
    """
    Ids que el modelo citó y no existían entre las recuperadas. No se muestra a
    la persona —no le sirve de nada—, pero se cuenta: una tasa que sube es la
    señal temprana de que el modelo configurado dejó de respetar la
    instrucción, y sin registrarla el fallo sería invisible hasta que alguien
    notara una cita rara.
    """
    ids_inventados: tuple[str, ...]


def _texto(valor: Any) -> str:
    return str(valor or "").strip()


MENSAJE_SIN_RESULTADOS = (
    "No encontré ninguna ficha que responda eso en el alcance de esta conversación."
)

"""
Qué se responde cuando el modelo redactó algo pero no citó ninguna ficha
válida. No se conserva su texto: una respuesta sin cita es indistinguible de
una inventada, y mostrarla —aunque fuera correcta— enseñaría a confiar en
respuestas del chat que no llevan trazabilidad detrás, que es justo el hábito
que este producto no quiere crear.
"""
MENSAJE_SIN_CITAS = (
    "Encontré fichas relacionadas, pero no pude sostener una respuesta citándolas. "
    "Te las muestro para que las revises directamente."
)


def verificar(
    crudo: Any,
    recuperadas: Sequence[FichaRecuperada],
) -> RespuestaVerificada:
    """
    Sin fichas recuperadas no hay respuesta posible, dijera lo que dijera el modelo.

    Este es el caso en que un asistente genérico contestaría de memoria y
    quedaría bien. Aquí se contesta que no hay nada, porque el catálogo es la
    única fuente admitida y una respuesta correcta que no sale del catálogo
    seguiría siendo una respuesta que nadie puede rastrear hasta un segundo de
    una charla.
    """
    if not recuperadas:
        return RespuestaVerificada(MENSAJE_SIN_RESULTADOS, (), ())

    ids_validos = {ficha.id for ficha in recuperadas}

    citados_crudos = crudo.get("ids_citados") if isinstance(crudo, Mapping) else None
    citados = [str(id_) for id_ in citados_crudos] if isinstance(citados_crudos, list) else []

    validos = tuple(dict.fromkeys(id_ for id_ in citados if id_ in ids_validos))
    inventados = tuple(dict.fromkeys(id_ for id_ in citados if id_ not in ids_validos))

    contenido = _texto(crudo.get("respuesta") if isinstance(crudo, Mapping) else None)

    if contenido == "" or not validos:
        """
        Se devuelven las fichas recuperadas como citadas aunque el modelo no
        las haya citado: existen, la persona las puede leer, y ocultarlas
        porque el redactor falló convertiría un problema de redacción en una
        pérdida de contenido real del catálogo.
        """
        return RespuestaVerificada(
            MENSAJE_SIN_CITAS,
            tuple(ficha.id for ficha in recuperadas),
            inventados,
        )

    return RespuestaVerificada(contenido, validos, inventados)


def fichas_para_indicacion(
    recuperadas: Sequence[FichaRecuperada],
    nombres_de_tema: Mapping[str, str],
) -> str:
    """
    Las fichas tal como las ve el modelo, cada una con su id delante.

    El id va en el texto porque es lo que se le pide de vuelta: pedirle que
    cite "la tercera" obligaría a mantener una correspondencia por posición
    que se rompe en cuanto el modelo reordena, y el error resultante sería
    silencioso — una cita que apunta a la ficha equivocada se ve igual de bien
    que una correcta.
    """
    lineas: list[str] = []

    for ficha in recuperadas:
        lineas.append(
            f"[{ficha.id}] ({ficha.tipo_de_unidad}, tema: "
            f"{nombres_de_tema.get(ficha.id_tema, 'sin tema')}, "
            f"{ficha.conferencia.evento} — «{ficha.conferencia.titulo}», "
            f"{ficha.hablante}, {ficha.segundo_inicio}s-{ficha.segundo_fin}s)\n"
            f"{ficha.fragmento}"
        )

    return "\n\n".join(lineas)
