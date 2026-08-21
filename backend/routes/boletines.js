const express = require('express');
const crypto = require('crypto');
const pool = require('../db');
const { requireAuth, requirePermiso } = require('../middleware/auth');

const router = express.Router();

// Datos del boletín de un estudiante en un período: promedio por materia, calculado en vivo (igual que RAGE)
router.get('/', requireAuth, requirePermiso('boletines', 'ver'), async (req, res) => {
  const { estudiante_id, momento } = req.query;
  const notas = await pool.query(
    `SELECT m.nombre AS materia, ROUND(SUM(cal.puntaje_obtenido), 2) AS total
     FROM calificaciones cal
     JOIN instrumentos_evaluacion ie ON ie.id = cal.instrumento_id
     JOIN materias m ON m.id = ie.materia_id
     WHERE cal.estudiante_id = $1 AND ie.momento = $2
     GROUP BY m.nombre, ie.id
     ORDER BY m.nombre`,
    [estudiante_id, momento]
  );
  const asistencia = await pool.query(
    `SELECT COUNT(*) FILTER (WHERE tipo_inasistencia_id IS NOT NULL) AS inasistencias, COUNT(*) AS total_dias
     FROM asistencia_estudiante WHERE estudiante_id = $1`,
    [estudiante_id]
  );
  res.json({ notas: notas.rows, asistencia: asistencia.rows[0] });
});

// Emitir el boletín como documento oficial (con el mismo código de validación que las constancias)
router.post('/emitir', requireAuth, requirePermiso('boletines', 'aprobar'), async (req, res) => {
  const { estudiante_id } = req.body;
  const organizacion_id = req.usuario.organizacion_id;

  const correlativo = await pool.query(
    `SELECT COALESCE(MAX(numero_correlativo), 0) + 1 AS siguiente FROM documentos WHERE organizacion_id = $1`,
    [organizacion_id]
  );
  let codigo;
  do {
    codigo = 'SIGE-' + crypto.randomBytes(4).toString('hex').toUpperCase().slice(0, 6);
    const existe = await pool.query('SELECT 1 FROM documentos WHERE codigo_validacion = $1', [codigo]);
    if (!existe.rows.length) break;
  } while (true);

  const result = await pool.query(
    `INSERT INTO documentos (organizacion_id, estudiante_id, tipo, numero_correlativo, codigo_validacion, emitido_por)
     VALUES ($1,$2,'boletin',$3,$4,$5) RETURNING *`,
    [organizacion_id, estudiante_id, correlativo.rows[0].siguiente, codigo, req.usuario.id]
  );
  res.status(201).json(result.rows[0]);
});

module.exports = router;
