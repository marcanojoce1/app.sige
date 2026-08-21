const express = require('express');
const pool = require('../db');
const { requireAuth, requirePermiso } = require('../middleware/auth');

const router = express.Router();

// Estado de cuenta / lista de pagos del colegio
router.get('/', requireAuth, requirePermiso('pagos', 'ver'), async (req, res) => {
  const result = await pool.query(
    `SELECT p.*, e.nombre_completo AS estudiante, cp.nombre AS concepto
     FROM pagos p
     JOIN estudiantes e ON e.id = p.estudiante_id
     JOIN conceptos_pago cp ON cp.id = p.concepto_pago_id
     WHERE e.organizacion_id = $1
     ORDER BY p.creado_en DESC`,
    [req.usuario.organizacion_id]
  );
  res.json(result.rows);
});

// Registrar un pago (el representante reporta que pagó, o Tesorería lo registra directo)
router.post('/', requireAuth, requirePermiso('pagos', 'crear'), async (req, res) => {
  const { estudiante_id, concepto_pago_id, monto, referencia } = req.body;
  const result = await pool.query(
    `INSERT INTO pagos (estudiante_id, concepto_pago_id, monto, referencia, estado, fecha_pago)
     VALUES ($1,$2,$3,$4,'pendiente', CURRENT_DATE) RETURNING *`,
    [estudiante_id, concepto_pago_id, monto, referencia || null]
  );
  res.status(201).json(result.rows[0]);
});

// Tesorería confirma el pago (le asigna número de recibo correlativo)
router.put('/:id/confirmar', requireAuth, requirePermiso('pagos', 'aprobar'), async (req, res) => {
  const correlativo = await pool.query(
    `SELECT COALESCE(MAX(numero_recibo), 0) + 1 AS siguiente FROM pagos p
     JOIN estudiantes e ON e.id = p.estudiante_id WHERE e.organizacion_id = $1`,
    [req.usuario.organizacion_id]
  );
  const result = await pool.query(
    `UPDATE pagos SET estado = 'confirmado', confirmado_por = $1, numero_recibo = $2 WHERE id = $3 RETURNING *`,
    [req.usuario.id, correlativo.rows[0].siguiente, req.params.id]
  );
  res.json(result.rows[0]);
});

router.put('/:id/rechazar', requireAuth, requirePermiso('pagos', 'aprobar'), async (req, res) => {
  const result = await pool.query(`UPDATE pagos SET estado = 'rechazado', confirmado_por = $1 WHERE id = $2 RETURNING *`, [req.usuario.id, req.params.id]);
  res.json(result.rows[0]);
});

module.exports = router;
