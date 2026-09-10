# Bitácora AI

Repositorio vivo de análisis de discurso para conferencias técnicas: convierte audio y transcripciones crudas en un catálogo estructurado, validado y citable, y en memorias formateadas listas para entregar al organizador de cada evento.

## Qué es

Cada charla se descompone en fragmentos atómicos —una cita textual, un método explicado, una postura defendida, un dato de impacto en industria— y queda registrada como una **entrada de bitácora**: con hablante, evento, tema, tipo de unidad y la coordenada exacta (minuto/segundo) en la fuente original.

A partir de ese mismo origen se generan dos productos distintos:

- **Memorias del organizador** — documento formateado con la identidad visual del evento, generado automáticamente rellenando una plantilla con placeholders sobre las entradas ya validadas de una charla.
- **Catálogo de investigación** — el activo de largo plazo: un repositorio consultable por filtros estructurados (tema, tipo, evento, fecha, estado de validación) o por un chatbot conversacional que traduce lenguaje natural a esos mismos filtros y sintetiza únicamente sobre entradas reales, siempre citando de vuelta a la fuente exacta.

Cada usuario del grupo de investigación puede cargar sus propias conferencias, validar sus fichas (human-in-the-loop, según el riesgo del tipo de unidad) y compartir su información con otros miembros del grupo sin exponer su propia API key.

Sobre cualquier conferencia que vea, propia o compartida, cada persona puede poner **etiquetas personales** de texto libre, creadas en el momento de usarlas: para agrupar por interés (`IA`) o para marcar material que piensa usar en un artículo concreto (`art1`). Son privadas, y al compartir una conferencia su dueño elige por separado si sus etiquetas viajan con ella y si el invitado ve también las fichas todavía sin validar.

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

Requisitos: Node.js 22.22 o superior, que es el piso que declara React Router.

La autenticación corre contra un proyecto real de Supabase (auth, base de datos, storage), así que hace falta apuntar el frontend a uno antes de arrancar:

```bash
cd frontend
cp .env.example .env.local
# completar VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY con los del proyecto
# (Project Settings → API en supabase.com — la anon key es pública por diseño)
npm install
npm run dev
```

La aplicación queda en `http://localhost:5173`. Sin esas dos variables, arranca y falla rápido con un mensaje explícito en vez de un error genérico de red.

El esquema (tablas, RLS, buckets de Storage) vive versionado en `supabase/migrations/` y se aplica con la CLI de Supabase (`npx supabase link --project-ref <ref>` seguido de `npx supabase db push`).

### Backend de orquestación de IA

El servicio de Python (transcripción, chunking, análisis de discurso y agente
conversacional) vive en `backend/` y corre aparte del frontend. Ver
`backend/README.md` para el detalle; en corto:

```bash
cd backend
python -m venv .venv && source .venv/Scripts/activate
pip install -r requirements.txt
cp .env.example .env    # SUPABASE_URL y SUPABASE_ANON_KEY, las mismas del frontend
uvicorn main:app --reload
```

Queda en `http://localhost:8000`. El frontend lo encuentra por `VITE_API_URL`
(ver `frontend/.env.example`); si esa variable no está, el chat usa una
respuesta simulada en el navegador y la carga de conferencias queda en cola sin
procesar.

El backend consulta Supabase con la anon key más el token del usuario que hizo
la petición, así que RLS sigue aplicando; no usa service-role key.

### Comandos disponibles

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Compilación de producción |
| `npm run preview` | Sirve la compilación de producción |
| `npm run lint` | Análisis estático |
| `npm run typecheck` | Verificación de tipos |
| `npm run format` | Formato automático del código |
| `npm test` | Pruebas unitarias y de componente |
| `npm run test:e2e` | Pruebas end-to-end |

## Convenciones del frontend

El código se organiza por dominio, no por tipo de archivo:

```
frontend/src/
  app/        # router, layout del shell, providers
  features/   # un directorio por dominio del producto
    auth/         # acceso, registro y sesión
    conferencias/ # dashboard, detalle y carga de conferencia
    plantillas/   # editor de plantillas para memorias, en blanco o importadas desde .docx
    memorias/     # genera la memoria de una conferencia combinándola con una plantilla
  shared/     # primitivos de interfaz, catálogo de errores, almacenamiento
  styles/     # tokens de diseño
```

Dentro de cada dominio, la separación es por responsabilidad y no por tipo de archivo:

| Carpeta | Qué contiene |
|---|---|
| `data/` | Tipos del dominio y datos de ejemplo, con sus invariantes probadas |
| `query/` | Reglas de acceso, filtrado, orden y conteo, como funciones puras sin React |
| `tags/` | Etiquetas personales: operaciones, persistencia y su hook |
| `carga/` | Validación y simulación de la subida de una conferencia nueva |
| `components/` | Piezas de interfaz locales al dominio |
| `screens/` | Las pantallas que el router monta |

Las reglas viven en funciones puras y no dentro de los componentes, sobre todo las de acceso: quién puede ver qué no puede depender de que la interfaz decida no dibujar algo.

El estado de los filtros del dashboard vive en la URL, no en estado local ni en almacenamiento del navegador, para que una vista filtrada se pueda compartir como enlace y sobreviva a un recargado.

El tema claro y oscuro se resuelve con variables CSS definidas en `src/styles/index.css` y expuestas a Tailwind con `@theme inline`. Los componentes consumen los tokens semánticos (`bg-panel`, `text-texto`, `border-filete`, `bg-acento`) en lugar de colores literales, de modo que ambos temas funcionan sin duplicar clases.

## Uso

Proyecto de uso interno para un grupo de investigación. No está diseñado para alta concurrencia ni distribución pública.
