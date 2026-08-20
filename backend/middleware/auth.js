const jwt = require('jsonwebtoken');
const pool = require('../db');

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'No autenticado' });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = payload;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

function requirePermiso(moduloClave, accion) {
  return async (req, res, next) => {
    const { id: usuarioId, rol } = req.usuario;

    if (rol === 'super_admin' || rol === 'administrador') return next();

    const columna = {
      ver: 'puede_ver',
      crear: 'puede_crear',
      editar: 'puede_editar',
      aprobar: 'puede_aprobar',
    }[accion];

    const result = await pool.query(
      `SELECT p.${columna} AS permitido
       FROM permisos_usuario p
       JOIN modulos m ON m.id = p.modulo_id
       WHERE p.usuario_id = $1 AND m.clave = $2`,
      [usuarioId, moduloClave]
    );

    if (result.rows.length && result.rows[0].permitido) return next();
    return res.status(403).json({ error: `No tienes permiso de "${accion}" en el módulo "${moduloClave}"` });
  };
}

module.exports = { requireAuth, requirePermiso };
