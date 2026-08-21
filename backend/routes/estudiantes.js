const express = require('express');
const pool = require('../db');
const { requireAuth, requirePermiso } = require('../middleware/auth');

const router = express.Router();

// Listar estudiantes del colegio (filtrable por sección)
router.get('/', requireAuth, requirePermiso('estudiantes', 'ver'), async (req, res) => {
  const { seccion_id } = req.query;
  const params = [req.usuario.organizacion_id];
  let where = 'WHERE e.organizacion_id = $1';
  if (seccion_id) { params.push(seccion_id); where += ` AND e.seccion_id = $${params.length}`; }
  const result = await pool.query(
    `SELECT e.*, s.nombre AS seccion, g.nombre AS grado
     FROM estudiantes e
     LEFT JOIN secciones s ON s.id = e.seccion_id
     LEFT JOIN grados g ON g.id = s.grado_id
     ${where} ORDER BY e.nombre_completo`,
    params
  );
  res.json(result.rows);
});

// Matricular estudiante nuevo
router.post('/', requireAuth, requirePermiso('estudiantes', 'crear'), async (req, res) => {
  const { nombre, apellido, cedula_o_partida, seccion_id, telefono, representante_id } = req.body;
  const nombre_completo = [nombre, apellido].filter(Boolean).join(' ') || req.body.nombre_completo;

  // Si viene de un representante encontrado por búsqueda, se hereda su dirección y correo
  let direccion = req.body.direccion || null;
  let correo = req.body.correo || null;
  if (representante_id) {
    const rep = await pool.query('SELECT direccion, correo FROM usuarios WHERE id = $1', [representante_id]);
    if (rep.rows.length) {
      direccion = direccion || rep.rows[0].direccion;
      correo = correo || rep.rows[0].correo;
    }
  }

  const result = await pool.query(
    `INSERT INTO estudiantes (organizacion_id, nombre_completo, nombre, apellido, cedula_o_partida, seccion_id, telefono, direccion, correo)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
    [req.usuario.organizacion_id, nombre_completo, nombre || null, apellido || null, cedula_o_partida || null, seccion_id || null, telefono || null, direccion, correo]
  );

  if (representante_id) {
    await pool.query(
      `INSERT INTO representante_estudiante (representante_usuario_id, estudiante_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
      [representante_id, result.rows[0].id]
    );
  }
  res.status(201).json(result.rows[0]);
});

// Editar datos del estudiante (nombre, apellido, cédula, teléfono, dirección, correo, sección, estado)
router.put('/:id', requireAuth, requirePermiso('estudiantes', 'editar'), async (req, res) => {
  const { nombre, apellido, cedula_o_partida, telefono, direccion, correo, estado, seccion_id } = req.body;
  const nombre_completo = (nombre || apellido) ? [nombre, apellido].filter(Boolean).join(' ') : null;

  const result = await pool.query(
    `UPDATE estudiantes SET
       nombre = COALESCE($1, nombre), apellido = COALESCE($2, apellido),
       nombre_completo = COALESCE($3, nombre_completo),
       cedula_o_partida = COALESCE($4, cedula_o_partida), telefono = COALESCE($5, telefono),
       direccion = COALESCE($6, direccion), correo = COALESCE($7, correo),
       estado = COALESCE($8, estado), seccion_id = COALESCE($9, seccion_id)
     WHERE id = $10 AND organizacion_id = $11 RETURNING *`,
    [nombre || null, apellido || null, nombre_completo, cedula_o_partida || null, telefono || null, direccion || null, correo || null, estado || null, seccion_id || null, req.params.id, req.usuario.organizacion_id]
  );
  res.json(result.rows[0]);
});

// Obtener un estudiante individual (para el formulario de edición)
router.get('/:id', requireAuth, requirePermiso('estudiantes', 'ver'), async (req, res) => {
  const result = await pool.query('SELECT * FROM estudiantes WHERE id = $1 AND organizacion_id = $2', [req.params.id, req.usuario.organizacion_id]);
  if (!result.rows.length) return res.status(404).json({ error: 'No encontrado' });
  res.json(result.rows[0]);
});

// Expediente: ficha completa + observaciones de conducta + asistencia reciente
router.get('/:id/expediente', requireAuth, requirePermiso('estudiantes', 'ver'), async (req, res) => {
  const est = await pool.query('SELECT * FROM estudiantes WHERE id = $1 AND organizacion_id = $2', [req.params.id, req.usuario.organizacion_id]);
  if (!est.rows.length) return res.status(404).json({ error: 'No encontrado' });

  const conducta = await pool.query('SELECT * FROM observaciones_conducta WHERE estudiante_id = $1 ORDER BY fecha DESC LIMIT 20', [req.params.id]);
  const documentos = await pool.query('SELECT * FROM documentos WHERE estudiante_id = $1 ORDER BY creado_en DESC', [req.params.id]);

  res.json({ ...est.rows[0], conducta: conducta.rows, documentos: documentos.rows });
});

module.exports = router;
