-- =========================================================
-- SIGE VENEZUELA — Esquema de base de datos
-- Mismo patrón multi-tenant de TallerOS: todo cuelga de "organizaciones"
-- =========================================================

-- ---------- RAÍZ MULTI-TENANT ----------
CREATE TABLE organizaciones (
  id            SERIAL PRIMARY KEY,
  nombre        VARCHAR(200) NOT NULL,          -- bloqueado para el Administrador, solo Super Admin lo cambia
  logo_url      TEXT,
  direccion     TEXT,
  tipo          VARCHAR(20) NOT NULL DEFAULT 'publico', -- publico | privado | mixto (activa o no Tesorería)
  condiciones_boletin TEXT,
  pie_pagina    TEXT,
  activo        BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en     TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ---------- ROLES Y USUARIOS ----------
CREATE TABLE roles (
  id     SERIAL PRIMARY KEY,
  nombre VARCHAR(40) NOT NULL UNIQUE  -- super_admin | administrador | coordinador | secretaria | docente | representante | estudiante
);

INSERT INTO roles (nombre) VALUES
  ('super_admin'), ('administrador'), ('coordinador'),
  ('secretaria'), ('docente'), ('representante'), ('estudiante');

CREATE TABLE usuarios (
  id              SERIAL PRIMARY KEY,
  organizacion_id INTEGER REFERENCES organizaciones(id), -- NULL solo para super_admin
  rol_id          INTEGER NOT NULL REFERENCES roles(id),
  nombre_completo VARCHAR(150) NOT NULL,
  cedula          VARCHAR(20),
  usuario         VARCHAR(60) NOT NULL UNIQUE,
  password_hash   TEXT NOT NULL,
  password_temporal BOOLEAN NOT NULL DEFAULT FALSE,
  estudiante_id   INTEGER,             -- si rol = estudiante, referencia directa a su ficha
  activo          BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en       TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Vínculo representante <-> estudiante(s) a su cargo (uno a muchos)
CREATE TABLE representante_estudiante (
  representante_usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
  estudiante_id             INTEGER NOT NULL,
  PRIMARY KEY (representante_usuario_id, estudiante_id)
);

-- ---------- PERMISOS GRANULARES POR USUARIO (sección 4.1 de la especificación) ----------
CREATE TABLE modulos (
  id     SERIAL PRIMARY KEY,
  clave  VARCHAR(40) NOT NULL UNIQUE  -- estudiantes | docentes | instrumentos | rage | boletines | asistencia | pagos | documentos | calendario | comunicaciones | configuracion
);

INSERT INTO modulos (clave) VALUES
  ('estudiantes'), ('docentes'), ('instrumentos'), ('rage'), ('boletines'),
  ('asistencia'), ('pagos'), ('documentos'), ('calendario'), ('comunicaciones'), ('configuracion');

CREATE TABLE permisos_usuario (
  usuario_id  INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  modulo_id   INTEGER NOT NULL REFERENCES modulos(id),
  puede_ver     BOOLEAN NOT NULL DEFAULT FALSE,
  puede_crear   BOOLEAN NOT NULL DEFAULT FALSE,
  puede_editar  BOOLEAN NOT NULL DEFAULT FALSE,
  puede_aprobar BOOLEAN NOT NULL DEFAULT FALSE,
  PRIMARY KEY (usuario_id, modulo_id)
);

-- ---------- CATÁLOGO GLOBAL (Ministerio) — solo Super Admin lo edita ----------
CREATE TABLE areas (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(80) NOT NULL UNIQUE  -- Lenguaje, Matemática, Ciencias Naturales...
);

CREATE TABLE indicadores (
  id SERIAL PRIMARY KEY,
  area_id INTEGER NOT NULL REFERENCES areas(id),
  grado VARCHAR(20) NOT NULL,     -- 1er grado, 2do grado...
  momento VARCHAR(10) NOT NULL,   -- I, II, III
  codigo VARCHAR(20),
  descripcion TEXT NOT NULL
);

CREATE TABLE contenidos (
  id SERIAL PRIMARY KEY,
  area_id INTEGER NOT NULL REFERENCES areas(id),
  grado VARCHAR(20) NOT NULL,
  momento VARCHAR(10) NOT NULL,
  descripcion TEXT NOT NULL
);

-- ---------- CATÁLOGOS POR COLEGIO ----------
CREATE TABLE anios_escolares (
  id SERIAL PRIMARY KEY,
  organizacion_id INTEGER NOT NULL REFERENCES organizaciones(id),
  nombre VARCHAR(20) NOT NULL,  -- "2026-2027"
  activo BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE grados (
  id SERIAL PRIMARY KEY,
  organizacion_id INTEGER NOT NULL REFERENCES organizaciones(id),
  nombre VARCHAR(30) NOT NULL
);

CREATE TABLE secciones (
  id SERIAL PRIMARY KEY,
  grado_id INTEGER NOT NULL REFERENCES grados(id),
  nombre VARCHAR(10) NOT NULL  -- "A", "B", "U"...
);

CREATE TABLE materias (
  id SERIAL PRIMARY KEY,
  organizacion_id INTEGER NOT NULL REFERENCES organizaciones(id),
  nombre VARCHAR(60) NOT NULL,
  area_id INTEGER REFERENCES areas(id)
);

-- Tipos de instrumento: catálogo EDITABLE por colegio (sección 6.2 de la especificación)
CREATE TABLE tipos_instrumento (
  id SERIAL PRIMARY KEY,
  organizacion_id INTEGER NOT NULL REFERENCES organizaciones(id),
  nombre VARCHAR(60) NOT NULL,
  activo BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE tipos_inasistencia (
  id SERIAL PRIMARY KEY,
  organizacion_id INTEGER NOT NULL REFERENCES organizaciones(id),
  nombre VARCHAR(40) NOT NULL  -- Justificada, Injustificada, Retardo, Permiso
);

CREATE TABLE conceptos_pago (
  id SERIAL PRIMARY KEY,
  organizacion_id INTEGER NOT NULL REFERENCES organizaciones(id),
  nombre VARCHAR(60) NOT NULL,   -- Mensualidad, Inscripción...
  monto NUMERIC(10,2) NOT NULL
);

-- ---------- ESTUDIANTES Y DOCENTES ----------
CREATE TABLE estudiantes (
  id SERIAL PRIMARY KEY,
  organizacion_id INTEGER NOT NULL REFERENCES organizaciones(id),
  nombre_completo VARCHAR(150) NOT NULL,
  cedula_o_partida VARCHAR(30),
  seccion_id INTEGER REFERENCES secciones(id),
  estado VARCHAR(20) NOT NULL DEFAULT 'activo', -- activo | retirado | egresado | trasladado
  creado_en TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE docentes (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
  area_id INTEGER REFERENCES areas(id),
  titulo VARCHAR(120)
);

CREATE TABLE carga_academica (
  id SERIAL PRIMARY KEY,
  docente_id INTEGER NOT NULL REFERENCES docentes(id),
  materia_id INTEGER NOT NULL REFERENCES materias(id),
  seccion_id INTEGER NOT NULL REFERENCES secciones(id)
);

-- ---------- HORARIOS ----------
CREATE TABLE horarios (
  id SERIAL PRIMARY KEY,
  seccion_id INTEGER NOT NULL REFERENCES secciones(id),
  materia_id INTEGER NOT NULL REFERENCES materias(id),
  docente_id INTEGER NOT NULL REFERENCES docentes(id),
  dia VARCHAR(10) NOT NULL,   -- lunes..viernes
  hora_inicio TIME NOT NULL,
  hora_fin TIME NOT NULL,
  aula VARCHAR(30)
);

-- ---------- INSTRUMENTOS DE EVALUACIÓN Y NOTAS (reemplazo del Excel) ----------
CREATE TABLE instrumentos_evaluacion (
  id SERIAL PRIMARY KEY,
  organizacion_id INTEGER NOT NULL REFERENCES organizaciones(id),
  docente_id INTEGER NOT NULL REFERENCES docentes(id),
  seccion_id INTEGER NOT NULL REFERENCES secciones(id),
  materia_id INTEGER NOT NULL REFERENCES materias(id),
  area_id INTEGER NOT NULL REFERENCES areas(id),
  contenido_id INTEGER REFERENCES contenidos(id),
  indicador_id INTEGER REFERENCES indicadores(id),
  tipo_instrumento_id INTEGER NOT NULL REFERENCES tipos_instrumento(id),
  momento VARCHAR(10) NOT NULL,
  fecha DATE NOT NULL,
  aprobado_por_coordinacion BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE criterios_evaluacion (
  id SERIAL PRIMARY KEY,
  instrumento_id INTEGER NOT NULL REFERENCES instrumentos_evaluacion(id) ON DELETE CASCADE,
  nombre VARCHAR(80) NOT NULL,
  puntaje NUMERIC(5,2) NOT NULL
);

CREATE TABLE calificaciones (
  id SERIAL PRIMARY KEY,
  instrumento_id INTEGER NOT NULL REFERENCES instrumentos_evaluacion(id),
  criterio_id INTEGER NOT NULL REFERENCES criterios_evaluacion(id),
  estudiante_id INTEGER NOT NULL REFERENCES estudiantes(id),
  puntaje_obtenido NUMERIC(5,2) NOT NULL
);
-- El total por estudiante/instrumento (RAGE) se calcula sumando calificaciones -> no se duplica en tabla aparte

-- ---------- ASISTENCIA (alumnos y docentes, con QR — sección 6.6.1) ----------
CREATE TABLE asistencia_estudiante (
  id SERIAL PRIMARY KEY,
  estudiante_id INTEGER NOT NULL REFERENCES estudiantes(id),
  fecha DATE NOT NULL,
  tipo_inasistencia_id INTEGER REFERENCES tipos_inasistencia(id), -- NULL = asistió
  metodo VARCHAR(20) NOT NULL DEFAULT 'manual', -- manual | qr
  hora_registro TIME
);

CREATE TABLE asistencia_docente (
  id SERIAL PRIMARY KEY,
  docente_id INTEGER NOT NULL REFERENCES docentes(id),
  fecha DATE NOT NULL,
  presente BOOLEAN NOT NULL DEFAULT TRUE
);

-- ---------- CONDUCTA ----------
CREATE TABLE observaciones_conducta (
  id SERIAL PRIMARY KEY,
  estudiante_id INTEGER NOT NULL REFERENCES estudiantes(id),
  docente_id INTEGER REFERENCES docentes(id),
  tipo VARCHAR(20) NOT NULL, -- excelente | buena | regular | deficiente | reconocimiento | incidencia
  descripcion TEXT,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE
);

-- ---------- DOCUMENTOS Y CERTIFICADOS (con código de validación — sección 6.14) ----------
CREATE TABLE documentos (
  id SERIAL PRIMARY KEY,
  organizacion_id INTEGER NOT NULL REFERENCES organizaciones(id),
  estudiante_id INTEGER NOT NULL REFERENCES estudiantes(id),
  tipo VARCHAR(60) NOT NULL,  -- constancia_estudio | constancia_conducta | certificado_notas | acta_retiro
  numero_correlativo INTEGER NOT NULL,
  codigo_validacion VARCHAR(20) NOT NULL UNIQUE,
  emitido_por INTEGER REFERENCES usuarios(id),
  revocado BOOLEAN NOT NULL DEFAULT FALSE,
  creado_en TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE validaciones_documento (
  id SERIAL PRIMARY KEY,
  documento_id INTEGER REFERENCES documentos(id),
  codigo_ingresado VARCHAR(20) NOT NULL,
  resultado VARCHAR(10) NOT NULL, -- valido | invalido
  validado_por INTEGER REFERENCES usuarios(id),
  fecha TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ---------- PAGOS (nivel 1: comprobante subido por el representante — sección 6.13.1) ----------
CREATE TABLE pagos (
  id SERIAL PRIMARY KEY,
  estudiante_id INTEGER NOT NULL REFERENCES estudiantes(id),
  concepto_pago_id INTEGER NOT NULL REFERENCES conceptos_pago(id),
  monto NUMERIC(10,2) NOT NULL,
  referencia VARCHAR(60),
  comprobante_url TEXT,
  estado VARCHAR(20) NOT NULL DEFAULT 'pendiente', -- pendiente | confirmado | rechazado
  confirmado_por INTEGER REFERENCES usuarios(id),
  fecha_pago DATE,
  numero_recibo INTEGER,
  creado_en TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ---------- CALENDARIO ----------
CREATE TABLE eventos_calendario (
  id SERIAL PRIMARY KEY,
  organizacion_id INTEGER NOT NULL REFERENCES organizaciones(id),
  titulo VARCHAR(150) NOT NULL,
  fecha DATE NOT NULL,
  alcance VARCHAR(20) NOT NULL DEFAULT 'colegio', -- colegio | grado | seccion
  grado_id INTEGER REFERENCES grados(id),
  seccion_id INTEGER REFERENCES secciones(id)
);

-- ---------- COMUNICACIONES ----------
CREATE TABLE circulares (
  id SERIAL PRIMARY KEY,
  organizacion_id INTEGER NOT NULL REFERENCES organizaciones(id),
  titulo VARCHAR(150) NOT NULL,
  cuerpo TEXT NOT NULL,
  alcance VARCHAR(20) NOT NULL DEFAULT 'colegio',
  grado_id INTEGER REFERENCES grados(id),
  seccion_id INTEGER REFERENCES secciones(id),
  enviado_por INTEGER REFERENCES usuarios(id),
  creado_en TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE mensajes (
  id SERIAL PRIMARY KEY,
  de_usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
  para_usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
  estudiante_id INTEGER REFERENCES estudiantes(id),
  cuerpo TEXT NOT NULL,
  leido BOOLEAN NOT NULL DEFAULT FALSE,
  creado_en TIMESTAMP NOT NULL DEFAULT NOW()
);
