// Migración aditiva: agrega tablas y columnas nuevas SIN borrar datos existentes.
// Uso:  npm run migrate
const pool = require('./db');

const SQL = `
-- Niveles educativos (catálogo global: Inicial, Primaria, Media)
CREATE TABLE IF NOT EXISTS niveles_educativos (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(60) UNIQUE NOT NULL
);
INSERT INTO niveles_educativos (nombre)
  SELECT * FROM (VALUES ('Educación Inicial'), ('Educación Primaria'), ('Educación Media')) AS v(nombre)
  WHERE NOT EXISTS (SELECT 1 FROM niveles_educativos);

-- Qué niveles tiene activados cada colegio
CREATE TABLE IF NOT EXISTS colegio_niveles (
  organizacion_id INTEGER NOT NULL REFERENCES organizaciones(id),
  nivel_id INTEGER NOT NULL REFERENCES niveles_educativos(id),
  PRIMARY KEY (organizacion_id, nivel_id)
);

-- Grados ahora cuelgan de un nivel y de un año escolar
ALTER TABLE grados ADD COLUMN IF NOT EXISTS nivel_id INTEGER REFERENCES niveles_educativos(id);
ALTER TABLE grados ADD COLUMN IF NOT EXISTS anio_escolar_id INTEGER REFERENCES anios_escolares(id);

-- Períodos/Momentos con fechas y estado de cierre
CREATE TABLE IF NOT EXISTS periodos (
  id SERIAL PRIMARY KEY,
  organizacion_id INTEGER NOT NULL REFERENCES organizaciones(id),
  anio_escolar_id INTEGER REFERENCES anios_escolares(id),
  nombre VARCHAR(30) NOT NULL,
  fecha_inicio DATE,
  fecha_fin DATE,
  estado VARCHAR(20) NOT NULL DEFAULT 'abierto',
  fecha_cierre TIMESTAMP,
  fecha_publicacion TIMESTAMP
);
-- Datos ampliados del usuario (Nombres, Apellidos, Teléfono, Correo, Dirección, Cargo)
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS nombre VARCHAR(80);
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS apellido VARCHAR(80);
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS telefono VARCHAR(30);
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS correo VARCHAR(120);
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS direccion TEXT;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS cargo VARCHAR(80);

-- Datos ampliados del estudiante
ALTER TABLE estudiantes ADD COLUMN IF NOT EXISTS nombre VARCHAR(80);
ALTER TABLE estudiantes ADD COLUMN IF NOT EXISTS apellido VARCHAR(80);
ALTER TABLE estudiantes ADD COLUMN IF NOT EXISTS telefono VARCHAR(30);
ALTER TABLE estudiantes ADD COLUMN IF NOT EXISTS correo VARCHAR(120);
ALTER TABLE estudiantes ADD COLUMN IF NOT EXISTS direccion TEXT;

-- Formato de cédula por país (catálogo global, lo administra el Super Administrador)
CREATE TABLE IF NOT EXISTS formatos_cedula (
  id SERIAL PRIMARY KEY,
  pais VARCHAR(60) NOT NULL,
  prefijo VARCHAR(10) NOT NULL,
  descripcion VARCHAR(60)
);
INSERT INTO formatos_cedula (pais, prefijo, descripcion)
  SELECT * FROM (VALUES
    ('Venezuela', 'V-', 'Cédula venezolana (V-)'),
    ('Venezuela', 'E-', 'Cédula de extranjero (E-)'),
    ('Colombia', 'CC-', 'Cédula de ciudadanía'),
    ('Perú', 'DNI-', 'Documento Nacional de Identidad')
  ) AS v(pais, prefijo, descripcion)
  WHERE NOT EXISTS (SELECT 1 FROM formatos_cedula);

-- Cada colegio elige qué formato de cédula usar
ALTER TABLE organizaciones ADD COLUMN IF NOT EXISTS formato_cedula_id INTEGER REFERENCES formatos_cedula(id);
`;

async function main() {
  console.log('Aplicando migración...');
  await pool.query(SQL);
  console.log('Migración completa. No se borró ningún dato existente.');
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
