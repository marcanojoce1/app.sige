const express = require('express');
const pool = require('../db');
const { requireAuth, requirePermiso } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, requirePermiso('rage', 'ver'), async (req, res) => {
  const { seccion_id, momento } = req.query;

  const result = await pool.query(
    `SELECT e.id AS estudiante_id, e.nombre_completo, m.nombre AS materia,
            ROUND(AVG(cal.puntaje_obtenido), 2) AS promedio_criterio,
            ROUND(SUM(cal.puntaje_obtenido), 2) AS total_instrumento
     FROM calificaciones cal
     JOIN instrumentos_evaluacion ie ON ie.id = cal.instrumento_id
     JOIN estudiantes e ON e.id = cal.estudiante_id
     JOIN materias m ON m.id = ie.materia_id
     WHERE ie.seccion_id = $1 AND ie.momento = $2
     GROUP BY e.id, e.nombre_completo, m.nombre, ie.id
     ORDER BY e.nombre_completo`,
    [seccion_id, momento]
  );

  res.json(result.rows);
});

module.exports = router;
