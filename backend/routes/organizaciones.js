const express = require('express');
const pool = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

function soloSuperAdmin(req, res, next) {
  if (req.usuario.rol !== 'super_admin') return res.status(403).json({ error: 'Solo el Super Administrador puede hacer esto' });
  next();
}

router.get('/', requireAuth, soloSuperAdmin, async (req, res) => {
  const result = await pool.query('SELECT * FROM organizaciones ORDER BY nombre');
  res.json(result.rows);
});

router.post('/', requireAuth, soloSuperAdmin, async (req, res) => {
  const { nombre, tipo, direccion } = req.body;
  const result = await pool.query(
    `INSERT INTO organizaciones (nombre, tipo, direccion) VALUES ($1, $2, $3) RETURNING *`,
    [nombre, tipo || 'publico', direccion || null]
  );
  res.status(201).json(result.rows[0]);
});

router.put('/:id', requireAuth, soloSuperAdmin, async (req, res) => {
  const { nombre, tipo, direccion, activo } = req.body;
  const result = await pool.query(
    `UPDATE organizaciones SET nombre = COALESCE($1, nombre), tipo = COALESCE($2, tipo),
     direccion = COALESCE($3, direccion), activo = COALESCE($4, activo) WHERE id = $5 RETURNING *`,
    [nombre, tipo, direccion, activo, req.params.id]
  );
  res.json(result.rows[0]);
});

router.get('/mi-colegio/datos', requireAuth, async (req, res) => {
  const result = await pool.query('SELECT * FROM organizaciones WHERE id = $1', [req.usuario.organizacion_id]);
  res.json(result.rows[0]);
});

router.put('/mi-colegio/datos', requireAuth, async (req, res) => {
  if (req.usuario.rol !== 'administrador') return res.status(403).json({ error: 'Solo el Administrador del colegio' });
  const { logo_url, direccion, condiciones_boletin, pie_pagina, formato_cedula_id } = req.body;
  const result = await pool.query(
    `UPDATE organizaciones SET logo_url = COALESCE($1, logo_url), direccion = COALESCE($2, direccion),
     condiciones_boletin = COALESCE($3, condiciones_boletin), pie_pagina = COALESCE($4, pie_pagina),
     formato_cedula_id = COALESCE($5, formato_cedula_id)
     WHERE id = $6 RETURNING *`,
    [logo_url, direccion, condiciones_boletin, pie_pagina, formato_cedula_id, req.usuario.organizacion_id]
  );
  res.json(result.rows[0]);
});

module.exports = router;
