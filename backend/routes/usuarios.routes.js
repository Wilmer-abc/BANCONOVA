// routes/usuarios.routes.js
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const db = require('../config/db');

const router = express.Router();

// Middleware para verificar token
const verificarToken = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ 
      success: false, 
      message: 'Acceso denegado. Token no proporcionado.' 
    });
  }

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = verified;
    next();
  } catch (error) {
    res.status(401).json({ 
      success: false, 
      message: 'Token inválido o expirado' 
    });
  }
};

// ============ RUTAS PÚBLICAS ============

/**
 * @route   POST /api/usuarios/login
 * @desc    Autenticar usuario y obtener token
 */
router.post('/login', [
  body('correo').isEmail().normalizeEmail().withMessage('Correo inválido'),
  body('password').notEmpty().withMessage('Contraseña requerida')
], async (req, res) => {
  
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      success: false, 
      errors: errors.array() 
    });
  }

  const { correo, password } = req.body;

  try {
    // Buscar usuario por correo en MySQL
    const [rows] = await db.query(
      `SELECT u.*, r.nombre_rol, r.descripcion as rol_descripcion 
       FROM usuarios u 
       LEFT JOIN roles r ON u.id_rol = r.id_rol 
       WHERE u.correo = ? AND u.estado = 1`,
      [correo]
    );

    if (rows.length === 0) {
      return res.status(401).json({ 
        success: false, 
        message: 'Credenciales incorrectas' 
      });
    }

    const usuario = rows[0];

    // Verificar contraseña con bcrypt
    const passwordValida = await bcrypt.compare(password, usuario.password);

    if (!passwordValida) {
      return res.status(401).json({ 
        success: false, 
        message: 'Credenciales incorrectas' 
      });
    }

    // Crear token JWT
    const token = jwt.sign(
      { 
        id: usuario.id_usuario, 
        correo: usuario.correo,
        nombre: usuario.nombre,
        rol: usuario.nombre_rol || 'usuario',
        id_rol: usuario.id_rol
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );

    // Enviar respuesta (sin incluir password)
    const { password: _, ...usuarioSinPassword } = usuario;
    
    res.json({
      success: true,
      message: 'Login exitoso',
      token,
      usuario: {
        id_usuario: usuario.id_usuario,
        nombre: usuario.nombre,
        correo: usuario.correo,
        rol: usuario.nombre_rol,
        id_rol: usuario.id_rol
      }
    });

  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error en el servidor' 
    });
  }
});

/**
 * @route   POST /api/usuarios/registro
 * @desc    Registrar nuevo usuario
 */
router.post('/registro', [
  body('correo').isEmail().normalizeEmail().withMessage('Correo inválido'),
  body('password').isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres'),
  body('nombre').notEmpty().withMessage('El nombre es requerido')
], async (req, res) => {

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      success: false, 
      errors: errors.array() 
    });
  }

  const { correo, password, nombre } = req.body;

  try {
    // Verificar si el usuario ya existe
    const [existente] = await db.query(
      'SELECT id_usuario FROM usuarios WHERE correo = ?',
      [correo]
    );

    if (existente.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'El correo ya está registrado' 
      });
    }

    // Encriptar contraseña
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Obtener rol por defecto (asumiendo que existe un rol 'usuario' con id_rol = 2)
    const [rol] = await db.query(
      'SELECT id_rol FROM roles WHERE nombre_rol = ?',
      ['usuario']
    );

    const id_rol = rol.length > 0 ? rol[0].id_rol : 2; // Default a 2 si no encuentra

    // Insertar nuevo usuario
    const [result] = await db.query(
      `INSERT INTO usuarios (nombre, correo, password, id_rol, estado, fecha_creacion) 
       VALUES (?, ?, ?, ?, 1, NOW())`,
      [nombre, correo, hashedPassword, id_rol]
    );

    res.status(201).json({
      success: true,
      message: 'Usuario registrado exitosamente',
      usuario: {
        id_usuario: result.insertId,
        nombre,
        correo
      }
    });

  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error en el servidor' 
    });
  }
});

// ============ RUTAS PROTEGIDAS ============

/**
 * @route   GET /api/usuarios/perfil
 * @desc    Obtener perfil del usuario autenticado
 */
router.get('/perfil', verificarToken, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT u.id_usuario, u.nombre, u.correo, u.estado, u.fecha_creacion,
              r.nombre_rol, r.descripcion as rol_descripcion
       FROM usuarios u
       LEFT JOIN roles r ON u.id_rol = r.id_rol
       WHERE u.id_usuario = ?`,
      [req.usuario.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Usuario no encontrado' 
      });
    }

    res.json({
      success: true,
      usuario: rows[0]
    });

  } catch (error) {
    console.error('Error al obtener perfil:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error en el servidor' 
    });
  }
});

/**
 * @route   GET /api/usuarios (solo admin)
 * @desc    Obtener todos los usuarios
 */
router.get('/', verificarToken, async (req, res) => {
  try {
    // Verificar si es admin
    if (req.usuario.rol !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Acceso denegado. Se requieren permisos de administrador.' 
      });
    }

    const [rows] = await db.query(
      `SELECT u.id_usuario, u.nombre, u.correo, u.estado, u.fecha_creacion,
              r.nombre_rol
       FROM usuarios u
       LEFT JOIN roles r ON u.id_rol = r.id_rol
       ORDER BY u.fecha_creacion DESC`
    );

    res.json({
      success: true,
      usuarios: rows
    });

  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error en el servidor' 
    });
  }
});

module.exports = router;