# Bitácora AI

Repositorio vivo de análisis de discurso para conferencias técnicas: convierte audio y transcripciones crudas en un catálogo estructurado, validado y citable, y en memorias formateadas listas para entregar al organizador de cada evento.

## Qué es

Cada charla se descompone en fragmentos atómicos —una cita textual, un método explicado, una postura defendida, un dato de impacto en industria— y queda registrada como una **entrada de bitácora**: con hablante, evento, tema, tipo de unidad y la coordenada exacta (minuto/segundo) en la fuente original.

A partir de ese mismo origen se generan dos productos distintos:

- **Memorias del organizador** — documento formateado con la identidad visual del evento, generado automáticamente rellenando una plantilla con placeholders sobre las entradas ya validadas de una charla.
- **Catálogo de investigación** — el activo de largo plazo: un repositorio consultable por filtros estructurados (tema, tipo, evento, fecha, estado de validación) o por un chatbot conversacional que traduce lenguaje natural a esos mismos filtros y sintetiza únicamente sobre entradas reales, siempre citando de vuelta a la fuente exacta.

Cada usuario del grupo de investigación puede cargar sus propias conferencias, validar sus fichas (human-in-the-loop, según el riesgo del tipo de unidad) y compartir su información con otros miembros del grupo sin exponer su propia API key.

## Cómo funciona

1. **Carga** — se sube audio o transcripción de una charla.
2. **Chunking y análisis de discurso** — el sistema segmenta la charla en entradas atómicas y las clasifica por tema y tipo de unidad, usando la API key de quien carga.
3. **Validación (HITL)** — el dueño del contenido confirma o ajusta las entradas antes de que queden disponibles como citables; el nivel de revisión depende del riesgo (100% en citas textuales, muestreo en clasificaciones interpretativas).
4. **Catálogo** — las entradas validadas quedan disponibles en el repositorio compartido, consultables por filtro directo o por chat con trazabilidad completa.
5. **Generación de memoria** — se elige una conferencia procesada y una plantilla configurada; el sistema rellena los placeholders y exporta el documento en Word o PDF.

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Frontend | React + TypeScript (`strict`), TailwindCSS, Vite, `motion` |
| Backend — CRUD simple | Acceso directo desde el frontend al SDK de Supabase |
| Backend — orquestación de IA | Python + FastAPI (transcripción, chunking, agente conversacional, generación de documentos) |
| Base de datos | Supabase (Postgres), aislamiento por row-level security |
| Autenticación | Supabase Auth |
| Almacenamiento de archivos | Supabase Storage |
| Búsqueda semántica de respaldo | pgvector |
| LLM y embeddings | OpenAI, con API key propia por usuario |
| Observabilidad de llamadas a LLM | LangSmith |
| Testing | Vitest + React Testing Library + Playwright (frontend), pytest (backend) |
| Despliegue | Vercel (frontend), backend gestionado junto a Supabase |

## Cómo correrlo localmente

### Requisitos previos
- Node.js 20+
- Python 3.11+
- Cuenta de Supabase (proyecto propio, con `pgvector` habilitado)
- API key de OpenAI

### Frontend
```bash
cd frontend
npm install
cp .env.example .env   # completar variables de Supabase
npm run dev
```

### Backend
```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # completar API key de OpenAI, LangSmith y credenciales de Supabase
uvicorn main:app --reload
```

## Uso

Proyecto de uso interno para un grupo de investigación. No está diseñado para alta concurrencia ni distribución pública.
