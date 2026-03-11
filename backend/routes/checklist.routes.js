// checklist.routes.js
const express = require('express');
const router = express.Router();
const db = require('../config/db'); // Ajusta la ruta según tu configuración
const { verificarToken } = require('../middlewares/auth');


// Obtener todos los checklists
router.get('/', async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT c.*, a.nombre_area as area_nombre, u.nombre as creador_nombre 
            FROM checklist c
            LEFT JOIN areas a ON c.id_area = a.id_area
            LEFT JOIN usuarios u ON c.creado_por = u.id_usuario
            ORDER BY c.fecha_creacion DESC
        `);
        res.json(rows);
    } catch (error) {
        console.error('Error en GET /checklist:', error);
        res.status(500).json({ message: 'Error al obtener checklists', error: error.message });
    }
});

// Obtener checklists por área
router.get('/area/:id_area', async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT c.*, a.nombre_area as area_nombre, u.nombre as creador_nombre 
            FROM checklist c
            LEFT JOIN areas a ON c.id_area = a.id_area
            LEFT JOIN usuarios u ON c.creado_por = u.id_usuario
            WHERE c.id_area = ? 
            ORDER BY c.fecha_creacion DESC
        `, [req.params.id_area]);
        
        res.json(rows);
    } catch (error) {
        console.error('Error en GET /checklist/area/:id_area:', error);
        res.status(500).json({ message: 'Error al obtener checklists por área', error: error.message });
    }
});

// Obtener un checklist por ID
router.get('/:id', async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT c.*, a.nombre_area as area_nombre, u.nombre as creador_nombre 
            FROM checklist c
            LEFT JOIN areas a ON c.id_area = a.id_area
            LEFT JOIN usuarios u ON c.creado_por = u.id_usuario
            WHERE c.id_checklist = ?
        `, [req.params.id]);
        
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Checklist no encontrado' });
        }
        res.json(rows[0]);
    } catch (error) {
        console.error('Error en GET /checklist/:id:', error);
        res.status(500).json({ message: 'Error al obtener checklist', error: error.message });
    }
});

// Crear un nuevo checklist
// router.post('/', async (req, res) => {
//     try {
//         const { nombre, descripcion, id_area, creado_por } = req.body;
        
//         // Validar datos requeridos
//         if (!nombre || !id_area || !creado_por) {
//             return res.status(400).json({ message: 'Faltan datos requeridos' });
//         }

//         const [result] = await db.query(
//             'INSERT INTO checklist (nombre, descripcion, id_area, creado_por) VALUES (?, ?, ?, ?)',
//             [nombre, descripcion, id_area, creado_por]
//         );
        
//         // Obtener el checklist recién creado con los nombres relacionados
//         const [newChecklist] = await db.query(`
//             SELECT c.*, a.nombre_area as area_nombre, u.nombre as creador_nombre 
//             FROM checklist c
//             LEFT JOIN areas a ON c.id_area = a.id_area
//             LEFT JOIN usuarios u ON c.creado_por = u.id_usuario
//             WHERE c.id_checklist = ?
//         `, [result.insertId]);
        
//         res.status(201).json(newChecklist[0]);
//     } catch (error) {
//         console.error('Error en POST /checklist:', error);
//         res.status(500).json({ message: 'Error al crear checklist', error: error.message });
//     }
// });

// Crear un nuevo checklist
router.post('/', verificarToken, async (req, res) => {
    try {

        const { nombre, descripcion, id_area } = req.body;

        const creado_por = req.usuario.id_usuario;

        if (!nombre || !id_area) {
            return res.status(400).json({ message: 'Faltan datos requeridos' });
        }

        const [result] = await db.query(
            'INSERT INTO checklist (nombre, descripcion, id_area, creado_por) VALUES (?, ?, ?, ?)',
            [nombre, descripcion, id_area, creado_por]
        );

        const [newChecklist] = await db.query(`
            SELECT c.*, a.nombre_area as area_nombre, u.nombre as creador_nombre 
            FROM checklist c
            LEFT JOIN areas a ON c.id_area = a.id_area
            LEFT JOIN usuarios u ON c.creado_por = u.id_usuario
            WHERE c.id_checklist = ?
        `, [result.insertId]);

        res.status(201).json(newChecklist[0]);

    } catch (error) {
        console.error('Error en POST /checklist:', error);
        res.status(500).json({ message: 'Error al crear checklist', error: error.message });
    }
});

// Actualizar un checklist
router.put('/:id', async (req, res) => {
    try {
        const { nombre, descripcion, id_area } = req.body;
        
        // Validar datos requeridos
        if (!nombre || !id_area) {
            return res.status(400).json({ message: 'Faltan datos requeridos' });
        }

        await db.query(
            'UPDATE checklist SET nombre = ?, descripcion = ?, id_area = ? WHERE id_checklist = ?',
            [nombre, descripcion, id_area, req.params.id]
        );
        
        // Obtener el checklist actualizado con los nombres relacionados
        const [updatedChecklist] = await db.query(`
            SELECT c.*, a.nombre_area as area_nombre, u.nombre as creador_nombre 
            FROM checklist c
            LEFT JOIN areas a ON c.id_area = a.id_area
            LEFT JOIN usuarios u ON c.creado_por = u.id_usuario
            WHERE c.id_checklist = ?
        `, [req.params.id]);
        
        res.json(updatedChecklist[0]);
    } catch (error) {
        console.error('Error en PUT /checklist/:id:', error);
        res.status(500).json({ message: 'Error al actualizar checklist', error: error.message });
    }
});

// Eliminar un checklist
router.delete('/:id', async (req, res) => {
    try {
        // Primero verificar si el checklist existe
        const [checklist] = await db.query('SELECT * FROM checklist WHERE id_checklist = ?', [req.params.id]);
        
        if (checklist.length === 0) {
            return res.status(404).json({ message: 'Checklist no encontrado' });
        }

        await db.query('DELETE FROM checklist WHERE id_checklist = ?', [req.params.id]);
        res.json({ message: 'Checklist eliminado correctamente' });
    } catch (error) {
        console.error('Error en DELETE /checklist/:id:', error);
        res.status(500).json({ message: 'Error al eliminar checklist', error: error.message });
    }
});

module.exports = router;