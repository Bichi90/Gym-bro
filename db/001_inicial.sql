-- ============================================================================
-- Gym Bro · esquema inicial
--
-- Notas de diseño:
--  * Toda tabla sincronizable lleva `actualizado_en` y `borrado_en`. El borrado
--    es lógico (lápida) porque el cliente trabaja sin conexión: si una fila
--    desapareciera sin dejar rastro, el dispositivo que estuvo offline la
--    volvería a subir en la siguiente sincronización.
--  * Los datos de salud (peso, grasa, medidas) son categoría sensible. El
--    acceso de un entrenador pasa siempre por `relaciones_entrenador` en
--    estado 'aceptada': sin consentimiento explícito del entrenado, no hay
--    visibilidad.
--  * Nada de contraseñas ni códigos en claro: solo derivaciones.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "citext";

-- ---------------------------------------------------------------- identidad

CREATE TYPE rol_usuario AS ENUM ('entrenado', 'entrenador');

CREATE TABLE usuarios (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email            citext NOT NULL UNIQUE,
  nombre           text NOT NULL DEFAULT '',
  -- Formato: scrypt$N$r$p$salt_b64$hash_b64. Nunca la contraseña.
  hash_contrasena  text NOT NULL,
  rol              rol_usuario NOT NULL DEFAULT 'entrenado',
  email_verificado boolean NOT NULL DEFAULT false,
  -- Bloqueo temporal tras demasiados intentos fallidos.
  bloqueado_hasta  timestamptz,
  creado_en        timestamptz NOT NULL DEFAULT now(),
  actualizado_en   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX usuarios_rol_idx ON usuarios (rol);

-- Sesiones opacas: se guarda solo el SHA-256 del token que viaja en la cookie,
-- de modo que una filtración de la base no permite suplantar a nadie.
CREATE TABLE sesiones_auth (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id     uuid NOT NULL REFERENCES usuarios (id) ON DELETE CASCADE,
  hash_token     text NOT NULL UNIQUE,
  expira_en      timestamptz NOT NULL,
  creada_en      timestamptz NOT NULL DEFAULT now(),
  ultimo_uso_en  timestamptz NOT NULL DEFAULT now(),
  revocada_en    timestamptz,
  agente         text,
  ip             inet
);

CREATE INDEX sesiones_auth_usuario_idx ON sesiones_auth (usuario_id);
CREATE INDEX sesiones_auth_expira_idx ON sesiones_auth (expira_en) WHERE revocada_en IS NULL;

CREATE TYPE proposito_codigo AS ENUM ('segundo_factor', 'verificar_email', 'restablecer_contrasena');

-- Códigos de seis dígitos. Se guarda el HMAC, no el código, y se cuentan los
-- intentos para que no se pueda probar el millón de combinaciones.
CREATE TABLE codigos_verificacion (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id  uuid NOT NULL REFERENCES usuarios (id) ON DELETE CASCADE,
  proposito   proposito_codigo NOT NULL,
  hash_codigo text NOT NULL,
  expira_en   timestamptz NOT NULL,
  intentos    smallint NOT NULL DEFAULT 0,
  consumido_en timestamptz,
  creado_en   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX codigos_usuario_proposito_idx
  ON codigos_verificacion (usuario_id, proposito)
  WHERE consumido_en IS NULL;

-- Contador por ventana para limitar intentos, tanto por cuenta como por IP.
CREATE TABLE limites_intentos (
  clave       text PRIMARY KEY,
  conteo      integer NOT NULL DEFAULT 0,
  ventana_fin timestamptz NOT NULL
);

-- ------------------------------------------------- entrenador ↔ entrenado

CREATE TYPE estado_relacion AS ENUM ('pendiente', 'aceptada', 'rechazada', 'revocada');

CREATE TABLE relaciones_entrenador (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entrenador_id uuid NOT NULL REFERENCES usuarios (id) ON DELETE CASCADE,
  entrenado_id  uuid NOT NULL REFERENCES usuarios (id) ON DELETE CASCADE,
  estado        estado_relacion NOT NULL DEFAULT 'pendiente',
  invitada_en   timestamptz NOT NULL DEFAULT now(),
  respondida_en timestamptz,
  CONSTRAINT relacion_unica UNIQUE (entrenador_id, entrenado_id),
  CONSTRAINT no_autoasignacion CHECK (entrenador_id <> entrenado_id)
);

CREATE INDEX relaciones_entrenado_idx ON relaciones_entrenador (entrenado_id, estado);

-- ------------------------------------------------------------ dominio

CREATE TABLE perfiles (
  usuario_id        uuid PRIMARY KEY REFERENCES usuarios (id) ON DELETE CASCADE,
  nombre            text NOT NULL DEFAULT '',
  sexo              text NOT NULL DEFAULT 'masculino',
  fecha_nacimiento  date,
  altura_cm         numeric(5, 1) NOT NULL DEFAULT 175,
  experiencia       text NOT NULL DEFAULT 'principiante',
  actividad         text NOT NULL DEFAULT 'ligero',
  equipamiento      text[] NOT NULL DEFAULT '{}',
  unidad            text NOT NULL DEFAULT 'kg',
  actualizado_en    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE objetivos (
  usuario_id          uuid PRIMARY KEY REFERENCES usuarios (id) ON DELETE CASCADE,
  tipo                text NOT NULL DEFAULT 'hipertrofia',
  peso_objetivo_kg    numeric(5, 1),
  grasa_objetivo_pct  numeric(4, 1),
  fecha_objetivo      date,
  dias_por_semana     smallint NOT NULL DEFAULT 3,
  minutos_por_sesion  smallint NOT NULL DEFAULT 60,
  prioridades         text[] NOT NULL DEFAULT '{}',
  objetivos_fuerza    jsonb NOT NULL DEFAULT '[]',
  notas               text,
  actualizado_en      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE mediciones (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id      uuid NOT NULL REFERENCES usuarios (id) ON DELETE CASCADE,
  fecha           date NOT NULL,
  peso_kg         numeric(5, 2) NOT NULL,
  cuello_cm       numeric(5, 1),
  cintura_cm      numeric(5, 1),
  cadera_cm       numeric(5, 1),
  pecho_cm        numeric(5, 1),
  brazo_cm        numeric(5, 1),
  antebrazo_cm    numeric(5, 1),
  muslo_cm        numeric(5, 1),
  gemelo_cm       numeric(5, 1),
  hombro_cm       numeric(5, 1),
  grasa_pct       numeric(4, 1),
  notas           text,
  actualizado_en  timestamptz NOT NULL DEFAULT now(),
  borrado_en      timestamptz
);

CREATE INDEX mediciones_usuario_fecha_idx ON mediciones (usuario_id, fecha DESC) WHERE borrado_en IS NULL;

CREATE TABLE ejercicios_propios (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id      uuid NOT NULL REFERENCES usuarios (id) ON DELETE CASCADE,
  definicion      jsonb NOT NULL,
  actualizado_en  timestamptz NOT NULL DEFAULT now(),
  borrado_en      timestamptz
);

CREATE TABLE rutinas (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id      uuid NOT NULL REFERENCES usuarios (id) ON DELETE CASCADE,
  -- Si la asignó un entrenador, queda registrado quién.
  asignada_por    uuid REFERENCES usuarios (id) ON DELETE SET NULL,
  nombre          text NOT NULL,
  split           text NOT NULL,
  objetivo_tipo   text NOT NULL,
  dias_por_semana smallint NOT NULL,
  activa          boolean NOT NULL DEFAULT false,
  notas           text,
  creada_en       timestamptz NOT NULL DEFAULT now(),
  actualizado_en  timestamptz NOT NULL DEFAULT now(),
  borrado_en      timestamptz
);

CREATE INDEX rutinas_usuario_idx ON rutinas (usuario_id) WHERE borrado_en IS NULL;
-- Una sola rutina activa por usuario.
CREATE UNIQUE INDEX rutinas_una_activa_idx ON rutinas (usuario_id) WHERE activa AND borrado_en IS NULL;

CREATE TABLE dias_rutina (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rutina_id   uuid NOT NULL REFERENCES rutinas (id) ON DELETE CASCADE,
  orden       smallint NOT NULL,
  nombre      text NOT NULL,
  dia_semana  smallint,
  UNIQUE (rutina_id, orden)
);

CREATE TABLE ejercicios_dia (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dia_id        uuid NOT NULL REFERENCES dias_rutina (id) ON DELETE CASCADE,
  orden         smallint NOT NULL,
  ejercicio_id  text NOT NULL,
  series        smallint NOT NULL,
  reps_min      smallint NOT NULL,
  reps_max      smallint NOT NULL,
  rir           smallint NOT NULL,
  descanso_seg  smallint NOT NULL,
  UNIQUE (dia_id, orden),
  CONSTRAINT rango_reps_valido CHECK (reps_max >= reps_min)
);

CREATE TABLE sesiones_entrenamiento (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id        uuid NOT NULL REFERENCES usuarios (id) ON DELETE CASCADE,
  rutina_id         uuid REFERENCES rutinas (id) ON DELETE SET NULL,
  dia_id            uuid REFERENCES dias_rutina (id) ON DELETE SET NULL,
  fecha             date NOT NULL,
  nombre            text NOT NULL,
  inicio            timestamptz NOT NULL,
  fin               timestamptz,
  peso_corporal_kg  numeric(5, 2),
  rpe               smallint,
  notas             text,
  actualizado_en    timestamptz NOT NULL DEFAULT now(),
  borrado_en        timestamptz
);

CREATE INDEX sesiones_usuario_fecha_idx
  ON sesiones_entrenamiento (usuario_id, fecha DESC)
  WHERE borrado_en IS NULL;

CREATE TABLE ejercicios_sesion (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sesion_id     uuid NOT NULL REFERENCES sesiones_entrenamiento (id) ON DELETE CASCADE,
  orden         smallint NOT NULL,
  ejercicio_id  text NOT NULL,
  plan          jsonb,
  notas         text,
  UNIQUE (sesion_id, orden)
);

CREATE TYPE tipo_serie AS ENUM ('calentamiento', 'normal', 'fallo');

CREATE TABLE series_registradas (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ejercicio_sesion_id  uuid NOT NULL REFERENCES ejercicios_sesion (id) ON DELETE CASCADE,
  orden                smallint NOT NULL,
  peso_kg              numeric(6, 2) NOT NULL DEFAULT 0,
  reps                 smallint NOT NULL DEFAULT 0,
  rir                  smallint,
  tipo                 tipo_serie NOT NULL DEFAULT 'normal',
  completada           boolean NOT NULL DEFAULT false,
  UNIQUE (ejercicio_sesion_id, orden)
);

-- Comentarios del entrenador: sobre una sesión concreta o generales.
CREATE TABLE notas_entrenador (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entrenador_id  uuid NOT NULL REFERENCES usuarios (id) ON DELETE CASCADE,
  entrenado_id   uuid NOT NULL REFERENCES usuarios (id) ON DELETE CASCADE,
  sesion_id      uuid REFERENCES sesiones_entrenamiento (id) ON DELETE CASCADE,
  ejercicio_id   text,
  texto          text NOT NULL,
  creada_en      timestamptz NOT NULL DEFAULT now(),
  actualizado_en timestamptz NOT NULL DEFAULT now(),
  borrado_en     timestamptz
);

CREATE INDEX notas_entrenado_idx ON notas_entrenador (entrenado_id) WHERE borrado_en IS NULL;

-- ------------------------------------------------------------ utilidades

-- Mantiene `actualizado_en` sin depender de que el código se acuerde.
CREATE OR REPLACE FUNCTION tocar_actualizado_en() RETURNS trigger AS $$
BEGIN
  NEW.actualizado_en := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'usuarios', 'perfiles', 'objetivos', 'mediciones', 'ejercicios_propios',
    'rutinas', 'sesiones_entrenamiento', 'notas_entrenador'
  ] LOOP
    EXECUTE format(
      'CREATE TRIGGER %I_tocar BEFORE UPDATE ON %I
       FOR EACH ROW EXECUTE FUNCTION tocar_actualizado_en()', t, t);
  END LOOP;
END $$;
