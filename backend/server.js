// server.js
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// rutas importadas
const usuariosRoutes = require('./routes/usuarios.routes.js');
const areasRoutes = require('./routes/areas.routes.js');
const dashboardRoutes = require('./routes/dashboard.js'); 
const checklistRoutes = require('./routes/checklist.routes');
const ejecucionChecklistRoutes = require('./routes/ejecucionChecklist.routes.js');
const formularioRoutes = require('./routes/formulario.routes.js');
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// utilizar Rutas
app.use('/auth', usuariosRoutes); 
app.use('/api/areas', areasRoutes); 
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/checklist', checklistRoutes);
app.use('/api/ejecutar-checklist', ejecucionChecklistRoutes);
app.use('/api/formulario', formularioRoutes);

// Ruta de prueba
app.get('/', (req, res) => {
  res.json({ message: 'API de Banco NOVA funcionando' });
});

// IMPORTANTE: Cambia esta parte - Manejo de errores 404
app.use((req, res, next) => {
  res.status(404).json({ 
    success: false, 
    message: 'Ruta no encontrada' 
  });
});

// Manejador de errores global (opcional pero recomendado)
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    success: false, 
    message: 'Error interno del servidor' 
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`     Servidor corriendo en http://localhost:${PORT}`);
  console.log(`     Endpoints disponibles:`);
  console.log(`   - POST http://localhost:${PORT}/auth/login`);
  console.log(`   - POST http://localhost:${PORT}/auth/registro`);
  console.log(`   - GET  http://localhost:${PORT}/auth/perfil`);
});