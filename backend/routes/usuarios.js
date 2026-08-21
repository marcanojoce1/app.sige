const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

function soloDireccion(req, res, next) {
  if (!['super_admin', 'administrador'].includes(req.usuario.rol)) {
    return res.status(403).json({ error: 'No autorizado' });
  }
  next();
}

router.get('/', requireAuth, async (req, res) => {
  const orgFiltro = req.usuario.rol === 'super_admin' ? req.query.organizacion_id : req.usuario.organizacion_id;
  const params = [];
  let where = '';
  if (orgFiltro) {
    params.push(orgFiltro);
    where = 'WHERE u.organizacion_id = $1';
  }
  const result = await pool.query(
    `SELECT u.id, u.nombre_completo, u.usuario, u.activo, r.nombre AS rol, u.organizacion_id
     FROM usuarios u JOIN roles r ON r.id = u.rol_id
     ${where} ORDER BY u.nombre_completo`,
    params
  );
  res.json(result.rows);
});

router.post('/', requireAuth, soloDireccion, async (req, res) => {
  const { nombre, apellido, cedula, telefono, correo, direccion, cargo, usuario, password, rol, estudiante_id } = req.body;
  const nombre_completo = [nombre, apellido].filter(Boolean).join(' ') || req.body.nombre_completo;
  const organizacion_id = req.usuario.rol === 'super_admin' ? req.body.organizacion_id : req.usuario.organizacion_id;

  const rolRow = await pool.query('SELECT id FROM roles WHERE nombre = $1', [rol]);
  if (!rolRow.rows.length) return res.status(400).json({ error: 'Rol inválido' });

  const hash = await bcrypt.hash(password, 10);
  const result = await pool.query(
    `INSERT INTO usuarios (organizacion_id, rol_id, nombre_completo, nombre, apellido, cedula, telefono, correo, direccion, cargo, usuario, password_hash, estudiante_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING id, nombre_completo, usuario`,
    [organizacion_id, rolRow.rows[0].id, nombre_completo, nombre || null, apellido || null, cedula || null, telefono || null, correo || null, direccion || null, cargo || null, usuario, hash, estudiante_id || null]
  );

  if (rol === 'representante' && Array.isArray(req.body.estudiantes_a_cargo)) {
    for (const estId of req.body.estudiantes_a_cargo) {
      await pool.query(
        `INSERT INTO representante_estudiante (representante_usuario_id, estudiante_id) VALUES ($1,$2)`,
        [result.rows[0].id, estId]
      );
    }
  }

  res.status(201).json(result.rows[0]);
});

router.put('/:id', requireAuth, soloDireccion, async (req, res) => {
  const { nombre, apellido, cedula, telefono, correo, direccion, cargo, activo, nueva_password } = req.body;
  const nombre_completo = (nombre || apellido) ? [nombre, apellido].filter(Boolean).join(' ') : null;

  await pool.query(
    `UPDATE usuarios SET
       nombre = COALESCE($1, nombre), apellido = COALESCE($2, apellido),
       nombre_completo = COALESCE($3, nombre_completo),
       cedula = COALESCE($4, cedula), telefono = COALESCE($5, telefono),
       correo = COALESCE($6, correo), direccion = COALESCE($7, direccion),
       cargo = COALESCE($8, cargo)
     WHERE id = $9`,
    [nombre || null, apellido || null, nombre_completo, cedula || null, telefono || null, correo || null, direccion || null, cargo || null, req.params.id]
  );

  if (nueva_password) {
    const hash = await bcrypt.hash(nueva_password, 10);
    await pool.query('UPDATE usuarios SET password_hash = $1, password_temporal = true WHERE id = $2', [hash, req.params.id]);
  }
  if (typeof activo === 'boolean') {
    await pool.query('UPDATE usuarios SET activo = $1 WHERE id = $2', [activo, req.params.id]);
  }
  res.json({ ok: true });
});

router.get('/:id/permisos', requireAuth, soloDireccion, async (req, res) => {
  const result = await pool.query(
    `SELECT m.clave AS modulo,
            COALESCE(p.puede_ver, false) AS puede_ver,
            COALESCE(p.puede_crear, false) AS puede_crear,
            COALESCE(p.puede_editar, false) AS puede_editar,
            COALESCE(p.puede_aprobar, false) AS puede_aprobar
     FROM modulos m
     LEFT JOIN permisos_usuario p ON p.modulo_id = m.id AND p.usuario_id = $1
     ORDER BY m.clave`,
    [req.params.id]
  );
  res.json(result.rows);
});

router.put('/:id/permisos', requireAuth, soloDireccion, async (req, res) => {
  const usuarioId = req.params.id;
  const { permisos } = req.body;

  for (const p of permisos) {
    const moduloRow = await pool.query('SELECT id FROM modulos WHERE clave = $1', [p.modulo]);
    if (!moduloRow.rows.length) continue;
    await pool.query(
      `INSERT INTO permisos_usuario (usuario_id, modulo_id, puede_ver, puede_crear, puede_editar, puede_aprobar)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (usuario_id, modulo_id) DO UPDATE SET
         puede_ver = $3, puede_crear = $4, puede_editar = $5, puede_aprobar = $6`,
      [usuarioId, moduloRow.rows[0].id, !!p.puede_ver, !!p.puede_crear, !!p.puede_editar, !!p.puede_aprobar]
    );
  }
  res.json({ ok: true });
});

// Buscar un representante existente por cédula (para autocompletar al matricular un estudiante)
router.get('/buscar-representante', requireAuth, async (req, res) => {
  const { cedula } = req.query;
  const result = await pool.query(
    `SELECT id, nombre_completo, nombre, apellido, telefono, correo, direccion, cedula
     FROM usuarios
     WHERE cedula = $1 AND organizacion_id = $2 AND rol_id = (SELECT id FROM roles WHERE nombre = 'representante')`,
    [cedula, req.usuario.organizacion_id]
  );
  if (!result.rows.length) return res.status(404).json({ error: 'No se encontró ningún representante con esa cédula' });
  res.json(result.rows[0]);
});

// Obtener un usuario individual (para el formulario de edición) — va DESPUÉS de /buscar-representante a propósito
router.get('/:id', requireAuth, soloDireccion, async (req, res) => {
  const result = await pool.query(
    `SELECT u.id, u.nombre_completo, u.nombre, u.apellido, u.cedula, u.telefono, u.correo, u.direccion, u.cargo,
            u.usuario, u.activo, r.nombre AS rol, u.organizacion_id
     FROM usuarios u JOIN roles r ON r.id = u.rol_id WHERE u.id = $1`,
    [req.params.id]
  );
  if (!result.rows.length) return res.status(404).json({ error: 'Usuario no encontrado' });
  res.json(result.rows[0]);
});

module.exports = router;
