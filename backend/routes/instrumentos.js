const express = require('express');
const pool = require('../db');
const { requireAuth, requirePermiso } = require('../middleware/auth');

const router = express.Router();

router.post('/', requireAuth, requirePermiso('instrumentos', 'crear'), async (req, res) => {
  const docenteRow = await pool.query('SELECT id FROM docentes WHERE usuario_id = $1', [req.usuario.id]);
  if (!docenteRow.rows.length) return res.status(400).json({ error: 'El usuario no está registrado como docente' });

  const { seccion_id, materia_id, area_id, contenido_id, indicador_id, tipo_instrumento_id, momento, fecha, criterios } = req.body;

  const instrumento = await pool.query(
    `INSERT INTO instrumentos_evaluacion
     (organizacion_id, docente_id, seccion_id, materia_id, area_id, contenido_id, indicador_id, tipo_instrumento_id, momento, fecha)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
    [req.usuario.organizacion_id, docenteRow.rows[0].id, seccion_id, materia_id, area_id, contenido_id, indicador_id, tipo_instrumento_id, momento, fecha]
  );

  const criteriosCreados = [];
  for (const c of criterios) {
    const cr = await pool.query(
      `INSERT INTO criterios_evaluacion (instrumento_id, nombre, puntaje) VALUES ($1,$2,$3) RETURNING *`,
      [instrumento.rows[0].id, c.nombre, c.puntaje]
    );
    criteriosCreados.push(cr.rows[0]);
  }

  res.status(201).json({ ...instrumento.rows[0], criterios: criteriosCreados });
});

router.post('/:id/calificar', requireAuth, requirePermiso('instrumentos', 'crear'), async (req, res) => {
  const instrumentoId = req.params.id;
  for (const c of req.body.calificaciones) {
    await pool.query(
      `INSERT INTO calificaciones (instrumento_id, criterio_id, estudiante_id, puntaje_obtenido)
       VALUES ($1,$2,$3,$4)`,
      [instrumentoId, c.criterio_id, c.estudiante_id, c.puntaje_obtenido]
    );
  }
  res.json({ ok: true });
});

router.get('/tipos', requireAuth, requirePermiso('instrumentos', 'ver'), async (req, res) => {
  const result = await pool.query(
    `SELECT * FROM tipos_instrumento WHERE organizacion_id = $1 AND activo = true ORDER BY nombre`,
    [req.usuario.organizacion_id]
  );
  res.json(result.rows);
});

router.post('/tipos', requireAuth, requirePermiso('configuracion', 'crear'), async (req, res) => {
  const result = await pool.query(
    `INSERT INTO tipos_instrumento (organizacion_id, nombre) VALUES ($1,$2) RETURNING *`,
    [req.usuario.organizacion_id, req.body.nombre]
  );
  res.status(201).json(result.rows[0]);
});

module.exports = router;
