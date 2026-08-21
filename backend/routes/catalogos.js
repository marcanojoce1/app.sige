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

// ---------- NIVELES EDUCATIVOS ----------
// Catálogo global (Inicial, Primaria, Media) — cualquier colegio lo consulta
router.get('/niveles', requireAuth, async (req, res) => {
  const result = await pool.query('SELECT * FROM niveles_educativos ORDER BY id');
  res.json(result.rows);
});

// Niveles que el colegio activó (solo estos aparecen al crear grados)
router.get('/mis-niveles', requireAuth, requirePermiso('configuracion', 'ver'), async (req, res) => {
  const result = await pool.query(
    `SELECT n.* FROM colegio_niveles cn JOIN niveles_educativos n ON n.id = cn.nivel_id
     WHERE cn.organizacion_id = $1 ORDER BY n.id`,
    [req.usuario.organizacion_id]
  );
  res.json(result.rows);
});

router.post('/mis-niveles', requireAuth, requirePermiso('configuracion', 'crear'), async (req, res) => {
  const { nivel_id } = req.body;
  await pool.query(
    `INSERT INTO colegio_niveles (organizacion_id, nivel_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
    [req.usuario.organizacion_id, nivel_id]
  );
  res.status(201).json({ ok: true });
});

// ---------- AÑO ESCOLAR ACTIVO ----------
// Solo un año escolar puede estar activo por colegio a la vez
router.put('/anios-escolares/:id/activar', requireAuth, requirePermiso('configuracion', 'editar'), async (req, res) => {
  await pool.query('UPDATE anios_escolares SET activo = false WHERE organizacion_id = $1', [req.usuario.organizacion_id]);
  const result = await pool.query(
    'UPDATE anios_escolares SET activo = true WHERE id = $1 AND organizacion_id = $2 RETURNING *',
    [req.params.id, req.usuario.organizacion_id]
  );
  res.json(result.rows[0]);
});

// Grados: ahora aceptan nivel_id y anio_escolar_id
router.get('/grados', requireAuth, requirePermiso('configuracion', 'ver'), async (req, res) => {
  const result = await pool.query(
    `SELECT g.*, n.nombre AS nivel_nombre, a.nombre AS anio_nombre
     FROM grados g
     LEFT JOIN niveles_educativos n ON n.id = g.nivel_id
     LEFT JOIN anios_escolares a ON a.id = g.anio_escolar_id
     WHERE g.organizacion_id = $1 ORDER BY g.id`,
    [req.usuario.organizacion_id]
  );
  res.json(result.rows);
});

router.post('/grados', requireAuth, requirePermiso('configuracion', 'crear'), async (req, res) => {
  const { nombre, nivel_id, anio_escolar_id } = req.body;
  const result = await pool.query(
    `INSERT INTO grados (organizacion_id, nombre, nivel_id, anio_escolar_id) VALUES ($1,$2,$3,$4) RETURNING *`,
    [req.usuario.organizacion_id, nombre, nivel_id || null, anio_escolar_id || null]
  );
  res.status(201).json(result.rows[0]);
});

// ---------- PERÍODOS / MOMENTOS (con fechas y cierre) ----------
router.get('/periodos', requireAuth, requirePermiso('configuracion', 'ver'), async (req, res) => {
  const result = await pool.query(
    'SELECT * FROM periodos WHERE organizacion_id = $1 ORDER BY id',
    [req.usuario.organizacion_id]
  );
  res.json(result.rows);
});

router.post('/periodos', requireAuth, requirePermiso('configuracion', 'crear'), async (req, res) => {
  const { nombre, fecha_inicio, fecha_fin, anio_escolar_id } = req.body;
  const result = await pool.query(
    `INSERT INTO periodos (organizacion_id, anio_escolar_id, nombre, fecha_inicio, fecha_fin)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [req.usuario.organizacion_id, anio_escolar_id || null, nombre, fecha_inicio || null, fecha_fin || null]
  );
  res.status(201).json(result.rows[0]);
});

// Cerrar un período: a partir de aquí no se pueden crear más instrumentos con ese momento
router.put('/periodos/:id/cerrar', requireAuth, requirePermiso('configuracion', 'aprobar'), async (req, res) => {
  const result = await pool.query(
    `UPDATE periodos SET estado = 'cerrado', fecha_cierre = NOW()
     WHERE id = $1 AND organizacion_id = $2 RETURNING *`,
    [req.params.id, req.usuario.organizacion_id]
  );
  res.json(result.rows[0]);
});

router.put('/periodos/:id/reabrir', requireAuth, requirePermiso('configuracion', 'aprobar'), async (req, res) => {
  const result = await pool.query(
    `UPDATE periodos SET estado = 'abierto', fecha_cierre = NULL
     WHERE id = $1 AND organizacion_id = $2 RETURNING *`,
    [req.params.id, req.usuario.organizacion_id]
  );
  res.json(result.rows[0]);
});

// ---------- FORMATO DE CÉDULA POR PAÍS ----------
// Catálogo global — cualquier colegio lo consulta para saber qué prefijo usar
router.get('/formatos-cedula', requireAuth, async (req, res) => {
  const result = await pool.query('SELECT * FROM formatos_cedula ORDER BY pais, prefijo');
  res.json(result.rows);
});

// Solo el Super Administrador agrega formatos nuevos (para cuando se sume un país nuevo)
router.post('/formatos-cedula', requireAuth, async (req, res) => {
  if (req.usuario.rol !== 'super_admin') return res.status(403).json({ error: 'Solo el Super Administrador administra este catálogo' });
  const { pais, prefijo, descripcion } = req.body;
  const result = await pool.query(
    'INSERT INTO formatos_cedula (pais, prefijo, descripcion) VALUES ($1,$2,$3) RETURNING *',
    [pais, prefijo, descripcion || null]
  );
  res.status(201).json(result.rows[0]);
});

// ---------- MONEDA ----------
router.get('/monedas', requireAuth, async (req, res) => {
  const result = await pool.query('SELECT * FROM monedas ORDER BY codigo_iso');
  res.json(result.rows);
});

router.post('/monedas', requireAuth, async (req, res) => {
  if (req.usuario.rol !== 'super_admin') return res.status(403).json({ error: 'Solo el Super Administrador administra este catálogo' });
  const { nombre, simbolo, codigo_iso } = req.body;
  const result = await pool.query(
    'INSERT INTO monedas (nombre, simbolo, codigo_iso) VALUES ($1,$2,$3) RETURNING *',
    [nombre, simbolo, codigo_iso || null]
  );
  res.status(201).json(result.rows[0]);
});

module.exports = router;
