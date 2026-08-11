require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const organizacionesRoutes = require('./routes/organizaciones');
const usuariosRoutes = require('./routes/usuarios');
const documentosRoutes = require('./routes/documentos');
const instrumentosRoutes = require('./routes/instrumentos');
const rageRoutes = require('./routes/rage');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => res.json({ ok: true, sistema: 'SIGE Venezuela backend' }));

app.use('/api/auth', authRoutes);
app.use('/api/organizaciones', organizacionesRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/documentos', documentosRoutes);
app.use('/api/instrumentos', instrumentosRoutes);
app.use('/api/rage', rageRoutes);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`SIGE backend corriendo en puerto ${PORT}`));
