// backend/routes/auth.routes.js
const express = require('express');
const router = express.Router();
const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

console.log('✅ auth.routes.js cargado correctamente');

// Ruta de login
router.post('/login', async (req, res) => {
    console.log('\n🔐 ===== PETICIÓN DE LOGIN RECIBIDA =====');
    console.log('📝 Body:', req.body);
    console.log('📝 Headers:', req.headers);
    
    try {
        const { correo, password } = req.body;
        
        // Validaciones básicas
        if (!correo || !password) {
            console.log('❌ Faltan credenciales');
            return res.status(400).json({ 
                success: false, 
                message: 'Correo y contraseña son requeridos' 
            });
        }
        
        // Buscar usuario por correo
        const [usuarios] = await db.query(
            'SELECT id_usuario, nombre, correo, password, rol FROM usuarios WHERE correo = ?',
            [correo]
        );
        
        console.log('👤 Usuario encontrado:', usuarios.length > 0 ? 'Sí' : 'No');
        
        if (usuarios.length === 0) {
            return res.status(401).json({ 
                success: false, 
                message: 'Credenciales incorrectas' 
            });
        }
        
        const usuario = usuarios[0];
        
        // Verificar contraseña
        const passwordValida = await bcrypt.compare(password, usuario.password);
        console.log('🔑 Contraseña válida:', passwordValida ? 'Sí' : 'No');
        
        if (!passwordValida) {
            return res.status(401).json({ 
                success: false, 
                message: 'Credenciales incorrectas' 
            });
        }
        
        // Generar token
        const token = jwt.sign(
            { 
                id: usuario.id_usuario, 
                nombre: usuario.nombre,
                correo: usuario.correo,
                rol: usuario.rol 
            },
            process.env.JWT_SECRET || 'tu_secreto_super_seguro',
            { expiresIn: '8h' }
        );
        
        console.log('✅ Login exitoso para:', usuario.nombre);
        console.log('🎫 Token generado (primeros 20 chars):', token.substring(0, 20));
        
        res.json({
            success: true,
            message: 'Login exitoso',
            token: token,
            usuario: {
                id: usuario.id_usuario,
                nombre: usuario.nombre,
                correo: usuario.correo,
                rol: usuario.rol
            }
        });
        
    } catch (error) {
        console.error('❌ Error en login:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error en el servidor',
            error: error.message 
        });
    }
});

// Ruta de prueba para auth
router.get('/test', (req, res) => {
    res.json({ 
        success: true, 
        message: 'Ruta de auth funcionando',
        timestamp: new Date().toISOString()
    });
});

module.exports = router;