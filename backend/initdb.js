const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const pool = require('./db');

async function main() {
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  console.log('Creando tablas...');
  await pool.query(schema);

  console.log('Creando Super Administrador (usuario: superadmin / clave: cambiar123)...');
  const hash = await bcrypt.hash('cambiar123', 10);
  const rol = await pool.query(`SELECT id FROM roles WHERE nombre = 'super_admin'`);
  await pool.query(
    `INSERT INTO usuarios (organizacion_id, rol_id, nombre_completo, usuario, password_hash, password_temporal)
     VALUES (NULL, $1, 'Super Administrador', 'superadmin', $2, true)`,
    [rol.rows[0].id, hash]
  );

  console.log('Listo. IMPORTANTE: cambia la clave de superadmin en el primer login.');
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
