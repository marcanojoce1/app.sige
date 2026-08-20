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
  const { nombre_completo, cedula_o_partida, seccion_id } = req.body;
  const result = await pool.query(
    `INSERT INTO estudiantes (organizacion_id, nombre_completo, cedula_o_partida, seccion_id)
     VALUES ($1,$2,$3,$4) RETURNING *`,
    [req.usuario.organizacion_id, nombre_completo, cedula_o_partida || null, seccion_id || null]
  );
  res.status(201).json(result.rows[0]);
});

// Editar estado / sección (traslado, retiro, egreso)
router.put('/:id', requireAuth, requirePermiso('estudiantes', 'editar'), async (req, res) => {
  const { estado, seccion_id } = req.body;
  const result = await pool.query(
    `UPDATE estudiantes SET estado = COALESCE($1, estado), seccion_id = COALESCE($2, seccion_id)
     WHERE id = $3 AND organizacion_id = $4 RETURNING *`,
    [estado, seccion_id, req.params.id, req.usuario.organizacion_id]
  );
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
