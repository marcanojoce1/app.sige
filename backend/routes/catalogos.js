const express = require('express');
const pool = require('../db');
const { requireAuth, requirePermiso } = require('../middleware/auth');

const router = express.Router();

// Helper genérico para catálogos simples (grados, tipos_inasistencia)
function catalogoSimple(tabla, campos = ['nombre']) {
  const r = express.Router();

  r.get('/', requireAuth, requirePermiso('configuracion', 'ver'), async (req, res) => {
    const result = await pool.query(`SELECT * FROM ${tabla} WHERE organizacion_id = $1 ORDER BY id`, [req.usuario.organizacion_id]);
    res.json(result.rows);
  });

  r.post('/', requireAuth, requirePermiso('configuracion', 'crear'), async (req, res) => {
    const cols = campos.map((c) => req.body[c]);
    const placeholders = campos.map((_, i) => `$${i + 2}`).join(',');
    const result = await pool.query(
      `INSERT INTO ${tabla} (organizacion_id, ${campos.join(',')}) VALUES ($1,${placeholders}) RETURNING *`,
      [req.usuario.organizacion_id, ...cols]
    );
    res.status(201).json(result.rows[0]);
  });

  r.delete('/:id', requireAuth, requirePermiso('configuracion', 'editar'), async (req, res) => {
    await pool.query(`DELETE FROM ${tabla} WHERE id = $1 AND organizacion_id = $2`, [req.params.id, req.usuario.organizacion_id]);
    res.json({ ok: true });
  });

  return r;
}

router.use('/grados', catalogoSimple('grados'));
router.use('/tipos-inasistencia', catalogoSimple('tipos_inasistencia'));
router.use('/conceptos-pago', catalogoSimple('conceptos_pago', ['nombre', 'monto']));
router.use('/anios-escolares', catalogoSimple('anios_escolares'));

// Secciones (dependen de un grado)
router.get('/secciones', requireAuth, requirePermiso('configuracion', 'ver'), async (req, res) => {
  const result = await pool.query(
    `SELECT s.*, g.nombre AS grado_nombre FROM secciones s
     JOIN grados g ON g.id = s.grado_id
     WHERE g.organizacion_id = $1 ORDER BY g.nombre, s.nombre`,
    [req.usuario.organizacion_id]
  );
  res.json(result.rows);
});

router.post('/secciones', requireAuth, requirePermiso('configuracion', 'crear'), async (req, res) => {
  const { grado_id, nombre } = req.body;
  const result = await pool.query(`INSERT INTO secciones (grado_id, nombre) VALUES ($1,$2) RETURNING *`, [grado_id, nombre]);
  res.status(201).json(result.rows[0]);
});

// Materias (con área asociada del catálogo global)
router.get('/materias', requireAuth, requirePermiso('configuracion', 'ver'), async (req, res) => {
  const result = await pool.query(
    `SELECT m.*, a.nombre AS area_nombre FROM materias m
     LEFT JOIN areas a ON a.id = m.area_id
     WHERE m.organizacion_id = $1 ORDER BY m.nombre`,
    [req.usuario.organizacion_id]
  );
  res.json(result.rows);
});

router.post('/materias', requireAuth, requirePermiso('configuracion', 'crear'), async (req, res) => {
  const { nombre, area_id } = req.body;
  const result = await pool.query(
    `INSERT INTO materias (organizacion_id, nombre, area_id) VALUES ($1,$2,$3) RETURNING *`,
    [req.usuario.organizacion_id, nombre, area_id || null]
  );
  res.status(201).json(result.rows[0]);
});

// Áreas — catálogo GLOBAL (solo lectura para colegios, solo Super Admin las crea)
router.get('/areas', requireAuth, async (req, res) => {
  const result = await pool.query('SELECT * FROM areas ORDER BY nombre');
  res.json(result.rows);
});

router.post('/areas', requireAuth, async (req, res) => {
  if (req.usuario.rol !== 'super_admin') return res.status(403).json({ error: 'Solo el Super Administrador administra el banco global' });
  const result = await pool.query('INSERT INTO areas (nombre) VALUES ($1) RETURNING *', [req.body.nombre]);
  res.status(201).json(result.rows[0]);
});

// Indicadores y contenidos — catálogo GLOBAL
router.get('/indicadores', requireAuth, async (req, res) => {
  const { area_id, grado, momento } = req.query;
  const params = []; const conds = [];
  if (area_id) { params.push(area_id); conds.push(`area_id = $${params.length}`); }
  if (grado) { params.push(grado); conds.push(`grado = $${params.length}`); }
  if (momento) { params.push(momento); conds.push(`momento = $${params.length}`); }
  const where = conds.length ? 'WHERE ' + conds.join(' AND ') : '';
  const result = await pool.query(`SELECT * FROM indicadores ${where} ORDER BY id`, params);
  res.json(result.rows);
});

router.post('/indicadores', requireAuth, async (req, res) => {
  if (req.usuario.rol !== 'super_admin') return res.status(403).json({ error: 'Solo el Super Administrador administra el banco global' });
  const { area_id, grado, momento, codigo, descripcion } = req.body;
  const result = await pool.query(
    `INSERT INTO indicadores (area_id, grado, momento, codigo, descripcion) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [area_id, grado, momento, codigo || null, descripcion]
  );
  res.status(201).json(result.rows[0]);
});

router.get('/contenidos', requireAuth, async (req, res) => {
  const { area_id, grado, momento } = req.query;
  const params = []; const conds = [];
  if (area_id) { params.push(area_id); conds.push(`area_id = $${params.length}`); }
  if (grado) { params.push(grado); conds.push(`grado = $${params.length}`); }
  if (momento) { params.push(momento); conds.push(`momento = $${params.length}`); }
  const where = conds.length ? 'WHERE ' + conds.join(' AND ') : '';
  const result = await pool.query(`SELECT * FROM contenidos ${where} ORDER BY id`, params);
  res.json(result.rows);
});

router.post('/contenidos', requireAuth, async (req, res) => {
  if (req.usuario.rol !== 'super_admin') return res.status(403).json({ error: 'Solo el Super Administrador administra el banco global' });
  const { area_id, grado, momento, descripcion } = req.body;
  const result = await pool.query(
    `INSERT INTO contenidos (area_id, grado, momento, descripcion) VALUES ($1,$2,$3,$4) RETURNING *`,
    [area_id, grado, momento, descripcion]
  );
  res.status(201).json(result.rows[0]);
});

module.exports = router;
