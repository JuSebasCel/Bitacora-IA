-- Tablas de propiedad (conferencias/fichas), compartición explícita, y
-- espacio personal privado por usuario (PLAN.md 6.2/6.3, PRD.md sección 3).
--
-- El aislamiento vive aquí, en RLS -- nunca solo en la interfaz.

-- ---------------------------------------------------------------------------
-- Perfil público mínimo: nombre visible de cada cuenta (auth.users no expone
-- un nombre de forma cómoda de leer/unir desde RLS). Sin datos sensibles.
-- ---------------------------------------------------------------------------

create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nombre text not null,
  correo text not null,
  creado_el timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Conferencias y fichas (PLAN.md sección 3, PRD.md sección 4). `ponente` y
-- `evento` quedan como texto denormalizado, igual que el tipo `Conferencia`
-- del frontend hoy: el directorio (`eventos`/`ponentes`) es una fuente de
-- sugerencias al cargar (F3), no una relación estricta de la conferencia.
-- ---------------------------------------------------------------------------

create table conferencias (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  ponente text not null,
  evento text not null,
  codigo_de_evento text not null,
  fecha_del_evento date not null,
  duracion_en_segundos integer not null default 0,
  id_dueno uuid not null references auth.users (id) on delete cascade,
  estado text not null check (estado in ('en-cola', 'procesando', 'procesada', 'fallida')),
  id_tema_principal uuid references temas (id),
  resumen text not null default '',
  fuente text not null check (fuente in ('audio', 'transcripcion')),
  cargada_el timestamptz
);

create index conferencias_id_dueno_idx on conferencias (id_dueno);

alter table memorias
  add constraint memorias_id_conferencia_fkey
  foreign key (id_conferencia) references conferencias (id) on delete cascade;

create table fichas (
  id uuid primary key default gen_random_uuid(),
  id_conferencia uuid not null references conferencias (id) on delete cascade,
  fragmento text not null,
  hablante text not null,
  segundo_inicio integer not null,
  segundo_fin integer not null,
  id_tema uuid not null references temas (id),
  tipo_de_unidad text not null check (
    tipo_de_unidad in ('cita-textual', 'metodo', 'estrategia', 'postura', 'dato-de-impacto', 'fase-del-trabajo')
  ),
  estado_de_validacion text not null default 'pendiente' check (
    estado_de_validacion in ('validada', 'pendiente', 'automatica')
  ),
  confianza_automatica numeric not null default 0 check (confianza_automatica between 0 and 1),
  contexto_minimo text not null default ''
);

create index fichas_id_conferencia_idx on fichas (id_conferencia);

-- ---------------------------------------------------------------------------
-- Compartición explícita (PRD.md sección 3/3.2). `id_dueno` va denormalizado
-- desde `conferencias.id_dueno` para que las políticas de RLS de abajo no
-- necesiten una subconsulta extra por cada fila -- siempre coincide con el
-- dueño real porque solo el dueño puede insertar una fila aquí (ver política).
-- ---------------------------------------------------------------------------

create table comparticiones (
  id uuid primary key default gen_random_uuid(),
  id_conferencia uuid not null references conferencias (id) on delete cascade,
  id_dueno uuid not null references auth.users (id) on delete cascade,
  id_invitado uuid not null references auth.users (id) on delete cascade,
  privacidad jsonb not null default '{
    "compartirEtiquetas": false,
    "compartirFichasPendientes": false,
    "permitirValidarFichas": false,
    "permitirRecompartir": false
  }'::jsonb,
  compartida_el timestamptz not null default now(),
  unique (id_conferencia, id_invitado)
);

create index comparticiones_id_invitado_idx on comparticiones (id_invitado);
create index comparticiones_id_conferencia_idx on comparticiones (id_conferencia);

-- ---------------------------------------------------------------------------
-- Preferencia de vista privada: ocultar una conferencia del propio listado
-- (PLAN.md 7) no es una regla de acceso, sigue siendo accesible por su URL.
-- ---------------------------------------------------------------------------

create table conferencias_ocultas (
  id_usuario uuid not null references auth.users (id) on delete cascade,
  id_conferencia uuid not null references conferencias (id) on delete cascade,
  primary key (id_usuario, id_conferencia)
);

-- ---------------------------------------------------------------------------
-- Espacio personal privado (PLAN.md 6.2): etiquetas, chat, api key.
-- ---------------------------------------------------------------------------

create table etiquetas (
  id uuid primary key default gen_random_uuid(),
  id_propietario uuid not null references auth.users (id) on delete cascade,
  nombre text not null
);

create index etiquetas_id_propietario_idx on etiquetas (id_propietario);

create table etiquetas_asignaciones (
  id_etiqueta uuid not null references etiquetas (id) on delete cascade,
  id_conferencia uuid not null references conferencias (id) on delete cascade,
  primary key (id_etiqueta, id_conferencia)
);

create table conversaciones_chat (
  id uuid primary key default gen_random_uuid(),
  id_usuario uuid not null references auth.users (id) on delete cascade,
  titulo text not null,
  alcance jsonb not null default '{"tipo": "todas"}'::jsonb,
  creada_el timestamptz not null default now(),
  actualizada_el timestamptz not null default now()
);

create index conversaciones_chat_id_usuario_idx on conversaciones_chat (id_usuario);

create table mensajes_chat (
  id uuid primary key default gen_random_uuid(),
  id_conversacion uuid not null references conversaciones_chat (id) on delete cascade,
  rol text not null check (rol in ('usuario', 'asistente')),
  tipo text check (tipo in ('respuesta', 'aclaracion')),
  contenido text,
  ids_fichas_citadas uuid[],
  pasos_de_razonamiento jsonb,
  pregunta text,
  opciones jsonb,
  creado_el timestamptz not null default now(),
  constraint mensajes_chat_forma_segun_rol check (
    (rol = 'usuario' and tipo is null and contenido is not null)
    or
    (rol = 'asistente' and tipo = 'respuesta' and contenido is not null)
    or
    (rol = 'asistente' and tipo = 'aclaracion' and pregunta is not null and opciones is not null)
  )
);

create index mensajes_chat_id_conversacion_idx on mensajes_chat (id_conversacion);

-- La API key se cifra en B2 (`PRD.md` B2, `CLAUDE.md` sección 4: "nunca en
-- texto plano"). Esta tabla solo deja el lugar listo -- nada escribe aquí
-- todavía, F8 sigue sin reconectar hasta B2.
create table api_keys (
  id_usuario uuid primary key references auth.users (id) on delete cascade,
  clave_cifrada text not null,
  actualizada_el timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table profiles enable row level security;
alter table conferencias enable row level security;
alter table fichas enable row level security;
alter table comparticiones enable row level security;
alter table conferencias_ocultas enable row level security;
alter table etiquetas enable row level security;
alter table etiquetas_asignaciones enable row level security;
alter table conversaciones_chat enable row level security;
alter table mensajes_chat enable row level security;
alter table api_keys enable row level security;

-- profiles: nombre visible para todo el grupo (se necesita para mostrar
-- "compartida por <nombre>"), pero cada quien solo edita el suyo.
create policy "cualquier autenticado lee perfiles" on profiles
  for select to authenticated using (true);

create policy "cada quien crea/edita solo su propio perfil" on profiles
  for insert to authenticated with check (auth.uid() = id);

create policy "cada quien actualiza solo su propio perfil" on profiles
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- conferencias: visible para el dueño y para quien tenga una compartición.
create policy "el dueño ve y administra sus conferencias" on conferencias
  for all to authenticated using (auth.uid() = id_dueno) with check (auth.uid() = id_dueno);

create policy "un invitado ve la conferencia que le compartieron" on conferencias
  for select to authenticated using (
    exists (
      select 1 from comparticiones c
      where c.id_conferencia = conferencias.id and c.id_invitado = auth.uid()
    )
  );

-- fichas: heredan la visibilidad de su conferencia. Un invitado sin
-- "compartirFichasPendientes" solo ve las ya validadas. Un invitado con
-- "permitirValidarFichas" puede actualizar el estado de validación -- sin
-- granularidad de columna a nivel de RLS todavía, se revisa si hace falta
-- cuando B5/B8 conecten esta tabla de verdad.
create policy "el dueño administra las fichas de sus conferencias" on fichas
  for all to authenticated using (
    exists (select 1 from conferencias c where c.id = fichas.id_conferencia and c.id_dueno = auth.uid())
  ) with check (
    exists (select 1 from conferencias c where c.id = fichas.id_conferencia and c.id_dueno = auth.uid())
  );

create policy "un invitado ve las fichas según la privacidad compartida" on fichas
  for select to authenticated using (
    exists (
      select 1 from comparticiones c
      where c.id_conferencia = fichas.id_conferencia
        and c.id_invitado = auth.uid()
        and (
          fichas.estado_de_validacion = 'validada'
          or (c.privacidad ->> 'compartirFichasPendientes')::boolean is true
        )
    )
  );

create policy "un invitado con permiso valida fichas de una conferencia compartida" on fichas
  for update to authenticated using (
    exists (
      select 1 from comparticiones c
      where c.id_conferencia = fichas.id_conferencia
        and c.id_invitado = auth.uid()
        and (c.privacidad ->> 'permitirValidarFichas')::boolean is true
    )
  );

-- comparticiones: el dueño administra las que creó, el invitado solo lee las suyas.
create policy "el dueño administra sus comparticiones" on comparticiones
  for all to authenticated using (auth.uid() = id_dueno) with check (auth.uid() = id_dueno);

create policy "un invitado ve las comparticiones dirigidas a él" on comparticiones
  for select to authenticated using (auth.uid() = id_invitado);

-- conferencias_ocultas, etiquetas, chat, api_keys: privado, sin excepción.
create policy "cada quien administra sus conferencias ocultas" on conferencias_ocultas
  for all to authenticated using (auth.uid() = id_usuario) with check (auth.uid() = id_usuario);

create policy "el dueño administra sus propias etiquetas" on etiquetas
  for all to authenticated using (auth.uid() = id_propietario) with check (auth.uid() = id_propietario);

create policy "el dueño administra sus asignaciones de etiqueta" on etiquetas_asignaciones
  for all to authenticated using (
    exists (select 1 from etiquetas e where e.id = etiquetas_asignaciones.id_etiqueta and e.id_propietario = auth.uid())
  ) with check (
    exists (select 1 from etiquetas e where e.id = etiquetas_asignaciones.id_etiqueta and e.id_propietario = auth.uid())
  );

create policy "un invitado ve etiquetas ajenas si el dueño las compartió" on etiquetas_asignaciones
  for select to authenticated using (
    exists (
      select 1 from comparticiones c
      where c.id_conferencia = etiquetas_asignaciones.id_conferencia
        and c.id_invitado = auth.uid()
        and (c.privacidad ->> 'compartirEtiquetas')::boolean is true
    )
  );

create policy "el dueño administra sus conversaciones de chat" on conversaciones_chat
  for all to authenticated using (auth.uid() = id_usuario) with check (auth.uid() = id_usuario);

create policy "el dueño administra los mensajes de sus conversaciones" on mensajes_chat
  for all to authenticated using (
    exists (select 1 from conversaciones_chat cc where cc.id = mensajes_chat.id_conversacion and cc.id_usuario = auth.uid())
  ) with check (
    exists (select 1 from conversaciones_chat cc where cc.id = mensajes_chat.id_conversacion and cc.id_usuario = auth.uid())
  );

create policy "cada quien administra solo su propia api key" on api_keys
  for all to authenticated using (auth.uid() = id_usuario) with check (auth.uid() = id_usuario);
