const express = require('express');
const pool = require('../db');
const { requireAuth, requirePermiso } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, requirePermiso('calendario', 'ver'), async (req, res) => {
  const result = await pool.query(
    `SELECT ev.*, g.nombre AS grado_nombre, s.nombre AS seccion_nombre
     FROM eventos_calendario ev
     LEFT JOIN grados g ON g.id = ev.grado_id
     LEFT JOIN secciones s ON s.id = ev.seccion_id
     WHERE ev.organizacion_id = $1 ORDER BY ev.fecha`,
    [req.usuario.organizacion_id]
  );
  res.json(result.rows);
});

router.post('/', requireAuth, requirePermiso('calendario', 'crear'), async (req, res) => {
  const { titulo, fecha, alcance, grado_id, seccion_id } = req.body;
  const result = await pool.query(
    `INSERT INTO eventos_calendario (organizacion_id, titulo, fecha, alcance, grado_id, seccion_id)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [req.usuario.organizacion_id, titulo, fecha, alcance || 'colegio', grado_id || null, seccion_id || null]
  );
  res.status(201).json(result.rows[0]);
});

router.delete('/:id', requireAuth, requirePermiso('calendario', 'editar'), async (req, res) => {
  await pool.query('DELETE FROM eventos_calendario WHERE id = $1 AND organizacion_id = $2', [req.params.id, req.usuario.organizacion_id]);
  res.json({ ok: true });
});

module.exports = router;
