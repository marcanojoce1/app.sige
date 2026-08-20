const express = require('express');
const pool = require('../db');
const { requireAuth, requirePermiso } = require('../middleware/auth');

const router = express.Router();

// Listar asignaciones (qué docente da qué materia en qué sección) del colegio
router.get('/', requireAuth, requirePermiso('docentes', 'ver'), async (req, res) => {
  const result = await pool.query(
    `SELECT ca.id, u.nombre_completo AS docente, m.nombre AS materia, s.nombre AS seccion, g.nombre AS grado
     FROM carga_academica ca
     JOIN docentes d ON d.id = ca.docente_id
     JOIN usuarios u ON u.id = d.usuario_id
     JOIN materias m ON m.id = ca.materia_id
     JOIN secciones s ON s.id = ca.seccion_id
     JOIN grados g ON g.id = s.grado_id
     WHERE u.organizacion_id = $1
     ORDER BY u.nombre_completo`,
    [req.usuario.organizacion_id]
  );
  res.json(result.rows);
});

// Crear una asignación (docente + materia + sección)
router.post('/', requireAuth, requirePermiso('docentes', 'crear'), async (req, res) => {
  const { docente_usuario_id, materia_id, seccion_id } = req.body;

  // Asegura que exista la ficha en "docentes" para ese usuario (se crea sola la primera vez)
  let docente = await pool.query('SELECT id FROM docentes WHERE usuario_id = $1', [docente_usuario_id]);
  if (!docente.rows.length) {
    docente = await pool.query('INSERT INTO docentes (usuario_id) VALUES ($1) RETURNING id', [docente_usuario_id]);
  }

  const result = await pool.query(
    `INSERT INTO carga_academica (docente_id, materia_id, seccion_id) VALUES ($1,$2,$3) RETURNING *`,
    [docente.rows[0].id, materia_id, seccion_id]
  );
  res.status(201).json(result.rows[0]);
});

router.delete('/:id', requireAuth, requirePermiso('docentes', 'editar'), async (req, res) => {
  await pool.query('DELETE FROM carga_academica WHERE id = $1', [req.params.id]);
  res.json({ ok: true });
});

module.exports = router;
