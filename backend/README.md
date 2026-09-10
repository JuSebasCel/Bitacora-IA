# Backend de orquestación de IA

Transcripción, chunking, análisis de discurso y agente conversacional de Bitácora AI.
El CRUD simple lo hace el frontend directo contra Supabase; este servicio es
solo lo que necesita un modelo de por medio.

## Principio de seguridad

Todas las consultas a Supabase corren con la **anon key más el `access_token`
del usuario** que hizo la petición. No hay service-role key y no debe agregarse:
el aislamiento entre usuarios vive entero en las políticas de RLS
(`supabase/migrations/*_esquema_propio.sql`), y una service-role key las salta.

La API key de OpenAI de cada usuario se lee por RPC (`leer_mi_api_key()`) con
ese mismo token. Nunca se registra, nunca se devuelve en una respuesta.

## Cómo correrlo

Requiere Python 3.11 o superior.

```bash
cd backend
python -m venv .venv
source .venv/Scripts/activate      # En Windows con Git Bash; en Linux/Mac: source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# completar SUPABASE_URL y SUPABASE_ANON_KEY (las mismas del frontend)
uvicorn main:app --reload
```

Queda en `http://localhost:8000`. La documentación interactiva en
`http://localhost:8000/docs`. Sin las dos variables obligatorias, arranca y
falla de inmediato diciendo cuál falta.

## Pruebas

```bash
pytest
```

La suite corre sin red ni credenciales: OpenAI y Supabase están mockeados.

## Endpoints

| Método | Ruta | Qué hace |
|---|---|---|
| `GET` | `/salud` | Sonda de vida del proceso. No comprueba terceros. |
| `POST` | `/conferencias/{id}/procesar` | Encola el procesamiento de una conferencia `en-cola`. Responde 202 y sigue en segundo plano; el avance se ve en `conferencias.estado`. |
| `POST` | `/chat/preguntar` | Pregunta al agente conversacional. Recupera fichas reales respetando RLS y responde citando sus ids. Persiste en `conversaciones_chat`/`mensajes_chat`. |

Toda petición (salvo `/salud`) exige la cabecera `Authorization: Bearer <access_token>`.

## Organización

Por dominio, no por tipo de archivo:

```
bitacora/
  compartido/     configuración, catálogo de errores, cliente de Supabase y de OpenAI
  transcripcion/  descarga del audio del bucket y transcripción con timestamps
  analisis/       chunking + clasificación por tema y tipo de unidad → fichas
  agente/         pregunta en lenguaje natural → filtros → recuperación → síntesis citada
  conferencias/   lectura y actualización de estado de la conferencia
  api/            los routers de FastAPI y sus dependencias
```

## Variables de entorno

Ver `.env.example`. Obligatorias: `SUPABASE_URL`, `SUPABASE_ANON_KEY`. Los
identificadores de modelo de OpenAI son configurables por entorno para cambiar
de modelo sin desplegar.
