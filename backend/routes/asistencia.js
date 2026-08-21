const express = require('express');
const pool = require('../db');
const { requireAuth, requirePermiso } = require('../middleware/auth');

const router = express.Router();

// Lista de estudiantes de una sección con su estado de asistencia en una fecha
router.get('/', requireAuth, requirePermiso('asistencia', 'ver'), async (req, res) => {
  const { seccion_id, fecha } = req.query;
  const result = await pool.query(
    `SELECT e.id AS estudiante_id, e.nombre_completo,
            ae.tipo_inasistencia_id, ti.nombre AS tipo_inasistencia_nombre
     FROM estudiantes e
     LEFT JOIN asistencia_estudiante ae ON ae.estudiante_id = e.id AND ae.fecha = $2
     LEFT JOIN tipos_inasistencia ti ON ti.id = ae.tipo_inasistencia_id
     WHERE e.seccion_id = $1
     ORDER BY e.nombre_completo`,
    [seccion_id, fecha]
  );
  res.json(result.rows);
});

// Guarda la asistencia de toda la sección para una fecha (sobreescribe lo que ya había ese día)
router.post('/', requireAuth, requirePermiso('asistencia', 'crear'), async (req, res) => {
  const { seccion_id, fecha, registros } = req.body; // registros: [{estudiante_id, tipo_inasistencia_id (null = presente)}]

  for (const r of registros) {
    await pool.query('DELETE FROM asistencia_estudiante WHERE estudiante_id = $1 AND fecha = $2', [r.estudiante_id, fecha]);
    await pool.query(
      `INSERT INTO asistencia_estudiante (estudiante_id, fecha, tipo_inasistencia_id, metodo, hora_registro)
       VALUES ($1,$2,$3,'manual', CURRENT_TIME)`,
      [r.estudiante_id, fecha, r.tipo_inasistencia_id || null]
    );
  }
  res.json({ ok: true });
});

// Resumen de inasistencias por estudiante (para detectar patrones, sección 6.6 de la especificación)
router.get('/resumen', requireAuth, requirePermiso('asistencia', 'ver'), async (req, res) => {
  const { seccion_id } = req.query;
  const result = await pool.query(
    `SELECT e.id, e.nombre_completo,
            COUNT(ae.id) FILTER (WHERE ae.tipo_inasistencia_id IS NOT NULL) AS total_inasistencias
     FROM estudiantes e
     LEFT JOIN asistencia_estudiante ae ON ae.estudiante_id = e.id
     WHERE e.seccion_id = $1
     GROUP BY e.id, e.nombre_completo
     ORDER BY total_inasistencias DESC`,
    [seccion_id]
  );
  res.json(result.rows);
});

module.exports = router;
