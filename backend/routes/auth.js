const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');

const router = express.Router();

router.post('/login', async (req, res) => {
  const { usuario, password } = req.body;
  if (!usuario || !password) return res.status(400).json({ error: 'Usuario y contraseña son requeridos' });

  const result = await pool.query(
    `SELECT u.id, u.nombre_completo, u.password_hash, u.password_temporal, u.activo,
            u.organizacion_id, r.nombre AS rol, o.nombre AS organizacion_nombre
     FROM usuarios u
     JOIN roles r ON r.id = u.rol_id
     LEFT JOIN organizaciones o ON o.id = u.organizacion_id
     WHERE u.usuario = $1`,
    [usuario]
  );

  if (!result.rows.length) return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });

  const user = result.rows[0];
  if (!user.activo) return res.status(403).json({ error: 'Usuario inactivo, contacta al colegio' });

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });

  const token = jwt.sign(
    {
      id: user.id,
      rol: user.rol,
      organizacion_id: user.organizacion_id,
      nombre_completo: user.nombre_completo,
    },
    process.env.JWT_SECRET,
    { expiresIn: '12h' }
  );

  res.json({
    token,
    usuario: {
      id: user.id,
      nombre_completo: user.nombre_completo,
      rol: user.rol,
      organizacion_id: user.organizacion_id,
      organizacion_nombre: user.organizacion_nombre,
      password_temporal: user.password_temporal,
    },
  });
});

module.exports = router;
