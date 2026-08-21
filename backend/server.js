require('dotenv').config();
const express = require('express');
require('express-async-errors'); // hace que los errores dentro de rutas async lleguen al manejador de abajo
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth');
const organizacionesRoutes = require('./routes/organizaciones');
const usuariosRoutes = require('./routes/usuarios');
const documentosRoutes = require('./routes/documentos');
const instrumentosRoutes = require('./routes/instrumentos');
const rageRoutes = require('./routes/rage');
const estudiantesRoutes = require('./routes/estudiantes');
const catalogosRoutes = require('./routes/catalogos');
const asignacionesRoutes = require('./routes/asignaciones');
const asistenciaRoutes = require('./routes/asistencia');
const boletinesRoutes = require('./routes/boletines');
const calendarioRoutes = require('./routes/calendario');
const comunicacionesRoutes = require('./routes/comunicaciones');
const pagosRoutes = require('./routes/pagos');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/organizaciones', organizacionesRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/documentos', documentosRoutes);
app.use('/api/instrumentos', instrumentosRoutes);
app.use('/api/rage', rageRoutes);
app.use('/api/estudiantes', estudiantesRoutes);
app.use('/api/catalogos', catalogosRoutes);
app.use('/api/asignaciones', asignacionesRoutes);
app.use('/api/asistencia', asistenciaRoutes);
app.use('/api/boletines', boletinesRoutes);
app.use('/api/calendario', calendarioRoutes);
app.use('/api/comunicaciones', comunicacionesRoutes);
app.use('/api/pagos', pagosRoutes);

app.get('/api', (req, res) => res.json({ ok: true, sistema: 'SIGE Venezuela backend' }));

// Sirve la plataforma web (web-admin/index.html) desde este mismo servicio
app.use(express.static(path.join(__dirname, '..', 'web-admin')));

// Manejador de errores: cualquier error que ocurra en una ruta llega aquí
// y se devuelve como JSON legible, en vez de romper la conexión sin explicación.
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Error interno del servidor' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`SIGE backend corriendo en puerto ${PORT}`));
