-- Esquema compartido entre todo el grupo, sin roles formales (PRD.md sección 3:
-- "cualquier usuario autenticado puede hacer cualquier cosa dentro de la
-- plataforma"). RLS abierta a cualquier `authenticated`, nunca a `anon`.
--
-- `memorias` referencia `conferencias`, que se crea en la siguiente migración
-- (tablas propias/privadas) -- la referencia se agrega ahí con ALTER TABLE,
-- para no invertir el orden documentado en el plan del módulo.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Directorio de eventos y ponentes (F3, PLAN.md 7)
-- ---------------------------------------------------------------------------

create table eventos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null
);

create table ponentes (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  id_evento uuid not null references eventos (id) on delete cascade
);

create index ponentes_id_evento_idx on ponentes (id_evento);

-- ---------------------------------------------------------------------------
-- Taxonomía de temas (PLAN.md 3.1, corregida esta sesión): el pool solo
-- crece por curaduría de propuestas -- nunca se crea un tema a mano.
-- ---------------------------------------------------------------------------

create table temas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique
);

create table temas_activos_evento (
  id_evento uuid not null references eventos (id) on delete cascade,
  id_tema uuid not null references temas (id) on delete cascade,
  primary key (id_evento, id_tema)
);

create table temas_propuestos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  id_evento uuid not null references eventos (id) on delete cascade,
  justificacion text not null default '',
  propuesto_el timestamptz not null default now()
);

create index temas_propuestos_id_evento_idx on temas_propuestos (id_evento);

-- ---------------------------------------------------------------------------
-- Plantillas (F4): unión blanco/docx. El .docx original vive en el bucket de
-- Storage `plantillas-docx`, `ruta_archivo_original` solo guarda la ruta.
-- ---------------------------------------------------------------------------

create table plantillas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  origen text not null check (origen in ('blanco', 'docx')),
  color_principal text,
  color_secundario text,
  contenido jsonb,
  ruta_archivo_original text,
  marcadores jsonb,
  actualizada_el timestamptz not null default now(),
  constraint plantillas_forma_segun_origen check (
    (origen = 'blanco' and contenido is not null and ruta_archivo_original is null)
    or
    (origen = 'docx' and ruta_archivo_original is not null and contenido is null)
  )
);

-- ---------------------------------------------------------------------------
-- Memorias (F5): referencia liviana a conferencia + plantilla, nunca el
-- documento congelado (PLAN.md 1.3). El FK a `conferencias` se agrega en la
-- siguiente migración.
-- ---------------------------------------------------------------------------

create table memorias (
  id uuid primary key default gen_random_uuid(),
  id_conferencia uuid not null,
  id_plantilla uuid not null references plantillas (id) on delete cascade,
  nombre text not null,
  generada_el timestamptz not null default now()
);

create index memorias_id_conferencia_idx on memorias (id_conferencia);
create index memorias_id_plantilla_idx on memorias (id_plantilla);

-- ---------------------------------------------------------------------------
-- RLS: abierta a cualquier persona autenticada, cerrada a anónimos.
-- ---------------------------------------------------------------------------

alter table eventos enable row level security;
alter table ponentes enable row level security;
alter table temas enable row level security;
alter table temas_activos_evento enable row level security;
alter table temas_propuestos enable row level security;
alter table plantillas enable row level security;
alter table memorias enable row level security;

create policy "cualquier autenticado administra eventos" on eventos
  for all to authenticated using (true) with check (true);

create policy "cualquier autenticado administra ponentes" on ponentes
  for all to authenticated using (true) with check (true);

create policy "cualquier autenticado administra temas" on temas
  for all to authenticated using (true) with check (true);

create policy "cualquier autenticado administra temas activos por evento" on temas_activos_evento
  for all to authenticated using (true) with check (true);

create policy "cualquier autenticado administra propuestas de tema" on temas_propuestos
  for all to authenticated using (true) with check (true);

create policy "cualquier autenticado administra plantillas" on plantillas
  for all to authenticated using (true) with check (true);

create policy "cualquier autenticado administra memorias" on memorias
  for all to authenticated using (true) with check (true);
