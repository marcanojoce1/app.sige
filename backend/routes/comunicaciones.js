const express = require('express');
const pool = require('../db');
const { requireAuth, requirePermiso } = require('../middleware/auth');

const router = express.Router();

// Circulares (comunicados masivos)
router.get('/circulares', requireAuth, requirePermiso('comunicaciones', 'ver'), async (req, res) => {
  const result = await pool.query(
    `SELECT c.*, u.nombre_completo AS enviado_por_nombre
     FROM circulares c LEFT JOIN usuarios u ON u.id = c.enviado_por
     WHERE c.organizacion_id = $1 ORDER BY c.creado_en DESC`,
    [req.usuario.organizacion_id]
  );
  res.json(result.rows);
});

router.post('/circulares', requireAuth, requirePermiso('comunicaciones', 'crear'), async (req, res) => {
  const { titulo, cuerpo, alcance, grado_id, seccion_id } = req.body;
  const result = await pool.query(
    `INSERT INTO circulares (organizacion_id, titulo, cuerpo, alcance, grado_id, seccion_id, enviado_por)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [req.usuario.organizacion_id, titulo, cuerpo, alcance || 'colegio', grado_id || null, seccion_id || null, req.usuario.id]
  );
  res.status(201).json(result.rows[0]);
});

// Mensajería directa (docente <-> representante) sobre un estudiante puntual
router.get('/mensajes', requireAuth, async (req, res) => {
  const { estudiante_id } = req.query;
  const params = [req.usuario.id];
  let where = '(de_usuario_id = $1 OR para_usuario_id = $1)';
  if (estudiante_id) { params.push(estudiante_id); where += ` AND estudiante_id = $${params.length}`; }
  const result = await pool.query(
    `SELECT m.*, ud.nombre_completo AS de_nombre, up.nombre_completo AS para_nombre
     FROM mensajes m
     JOIN usuarios ud ON ud.id = m.de_usuario_id
     JOIN usuarios up ON up.id = m.para_usuario_id
     WHERE ${where} ORDER BY m.creado_en`,
    params
  );
  res.json(result.rows);
});

router.post('/mensajes', requireAuth, async (req, res) => {
  const { para_usuario_id, estudiante_id, cuerpo } = req.body;
  const result = await pool.query(
    `INSERT INTO mensajes (de_usuario_id, para_usuario_id, estudiante_id, cuerpo) VALUES ($1,$2,$3,$4) RETURNING *`,
    [req.usuario.id, para_usuario_id, estudiante_id || null, cuerpo]
  );
  res.status(201).json(result.rows[0]);
});

module.exports = router;
