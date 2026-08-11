const express = require('express');
const crypto = require('crypto');
const pool = require('../db');
const { requireAuth, requirePermiso } = require('../middleware/auth');

const router = express.Router();

function generarCodigo() {
  // Ej: SIGE-7K4D9A
  return 'SIGE-' + crypto.randomBytes(4).toString('hex').toUpperCase().slice(0, 6);
}

// Emitir un documento (constancia, certificado, etc.) — requiere permiso "crear" en módulo documentos
router.post('/', requireAuth, requirePermiso('documentos', 'crear'), async (req, res) => {
  const { estudiante_id, tipo } = req.body;
  const organizacion_id = req.usuario.organizacion_id;

  const correlativo = await pool.query(
    `SELECT COALESCE(MAX(numero_correlativo), 0) + 1 AS siguiente FROM documentos WHERE organizacion_id = $1`,
    [organizacion_id]
  );

  let codigo;
  // Reintenta si por azar el código ya existe (es único)
  do {
    codigo = generarCodigo();
    const existe = await pool.query('SELECT 1 FROM documentos WHERE codigo_validacion = $1', [codigo]);
    if (!existe.rows.length) break;
  } while (true);

  const result = await pool.query(
    `INSERT INTO documentos (organizacion_id, estudiante_id, tipo, numero_correlativo, codigo_validacion, emitido_por)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [organizacion_id, estudiante_id, tipo, correlativo.rows[0].siguiente, codigo, req.usuario.id]
  );

  res.status(201).json(result.rows[0]);
  // Nota: aquí se conectaría la generación real del PDF (ver skill de pdf) con el código impreso al pie.
});

// Listar documentos del colegio
router.get('/', requireAuth, requirePermiso('documentos', 'ver'), async (req, res) => {
  const result = await pool.query(
    `SELECT d.*, e.nombre_completo AS estudiante
     FROM documentos d JOIN estudiantes e ON e.id = d.estudiante_id
     WHERE d.organizacion_id = $1 ORDER BY d.creado_en DESC`,
    [req.usuario.organizacion_id]
  );
  res.json(result.rows);
});

// Un representante/estudiante descarga SUS propios documentos desde la app
router.get('/mis-documentos', requireAuth, async (req, res) => {
  if (!['representante', 'estudiante'].includes(req.usuario.rol)) {
    return res.status(403).json({ error: 'Solo representantes o estudiantes' });
  }
  let estudianteIds = [];
  if (req.usuario.rol === 'estudiante') {
    estudianteIds = [req.usuario.estudiante_id];
  } else {
    const rel = await pool.query('SELECT estudiante_id FROM representante_estudiante WHERE representante_usuario_id = $1', [req.usuario.id]);
    estudianteIds = rel.rows.map(r => r.estudiante_id);
  }
  if (!estudianteIds.length) return res.json([]);
  const result = await pool.query(
    `SELECT * FROM documentos WHERE estudiante_id = ANY($1::int[]) AND revocado = false ORDER BY creado_en DESC`,
    [estudianteIds]
  );
  res.json(result.rows);
});

// Validar un código (pantalla física en el colegio) — requiere permiso "ver" en documentos
router.post('/validar', requireAuth, requirePermiso('documentos', 'ver'), async (req, res) => {
  const { codigo } = req.body;
  const doc = await pool.query(
    `SELECT d.*, e.nombre_completo AS estudiante FROM documentos d
     JOIN estudiantes e ON e.id = d.estudiante_id
     WHERE d.codigo_validacion = $1`,
    [codigo]
  );

  const resultado = doc.rows.length && !doc.rows[0].revocado ? 'valido' : 'invalido';

  await pool.query(
    `INSERT INTO validaciones_documento (documento_id, codigo_ingresado, resultado, validado_por)
     VALUES ($1,$2,$3,$4)`,
    [doc.rows[0]?.id || null, codigo, resultado, req.usuario.id]
  );

  if (resultado === 'invalido') return res.json({ resultado, mensaje: 'Código no encontrado o documento revocado' });
  res.json({ resultado, documento: doc.rows[0] });
});

module.exports = router;
