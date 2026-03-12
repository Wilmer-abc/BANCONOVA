const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { verificarToken } = require('../middlewares/auth');

// ============ CRUD DE ÁREAS ============

/**
 * GET /api/areas
 * Obtener todas las áreas
 */
router.get('/', verificarToken, async (req, res) => {
    try {
        const [areas] = await db.query(`
            SELECT 
                id_area,
                nombre_area,
                descripcion
            FROM areas 
            ORDER BY id_area DESC
        `);

        res.json({
            success: true,
            data: areas
        });
    } catch (error) {
        console.error('Error al obtener áreas:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener las áreas',
            error: error.message
        });
    }
});

/**
 * GET /api/areas/:id
 * Obtener una área específica por ID
 */
router.get('/:id', verificarToken, async (req, res) => {
    try {
        const { id } = req.params;
        
        const [areas] = await db.query(`
            SELECT 
                id_area,
                nombre_area,
                descripcion
            FROM areas 
            WHERE id_area = ?
        `, [id]);
        
        if (areas.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Área no encontrada'
            });
        }
        
        res.json({
            success: true,
            data: areas[0]
        });
    } catch (error) {
        console.error('Error al obtener área:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener el área',
            error: error.message
        });
    }
});

/**
 * POST /api/areas
 * Crear una nueva área
 */
router.post('/', verificarToken, async (req, res) => {
    try {
        const { nombre_area, descripcion } = req.body;
        
        if (!nombre_area || nombre_area.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'El nombre del área es obligatorio'
            });
        }
        
        // Verificar si ya existe
        const [existente] = await db.query(
            'SELECT id_area FROM areas WHERE nombre_area = ?',
            [nombre_area.trim()]
        );

        if (existente.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Ya existe un área con ese nombre'
            });
        }
        
        // Insertar nueva área
        const [result] = await db.query(
            'INSERT INTO areas (nombre_area, descripcion) VALUES (?, ?)',
            [nombre_area.trim(), descripcion?.trim() || null]
        );
        
        // Obtener el área recién creada
        const [nuevaArea] = await db.query(`
            SELECT 
                id_area,
                nombre_area,
                descripcion
            FROM areas
            WHERE id_area = ?
        `, [result.insertId]);
        
        res.status(201).json({
            success: true,
            message: 'Área creada exitosamente',
            data: nuevaArea[0]
        });
    } catch (error) {
        console.error('Error al crear área:', error);
        res.status(500).json({
            success: false,
            message: 'Error al crear el área',
            error: error.message
        });
    }
});

/**
 * PUT /api/areas/:id
 * Actualizar un área existente
 */
router.put('/:id', verificarToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre_area, descripcion } = req.body;

        if (!nombre_area || nombre_area.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'El nombre del área es obligatorio'
            });
        }

        // Verificar si existe
        const [existe] = await db.query(
            'SELECT id_area FROM areas WHERE id_area = ?',
            [id]
        );

        if (existe.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Área no encontrada'
            });
        }

        // Actualizar
        await db.query(
            'UPDATE areas SET nombre_area = ?, descripcion = ? WHERE id_area = ?',
            [nombre_area.trim(), descripcion?.trim() || null, id]
        );

        // Obtener área actualizada
        const [areaActualizada] = await db.query(`
            SELECT 
                id_area,
                nombre_area,
                descripcion
            FROM areas 
            WHERE id_area = ?
        `, [id]);

        res.json({
            success: true,
            message: 'Área actualizada exitosamente',
            data: areaActualizada[0]
        });

    } catch (error) {
        console.error('Error al actualizar área:', error);
        res.status(500).json({
            success: false,
            message: 'Error al actualizar el área',
            error: error.message
        });
    }
});

/**
 * DELETE /api/areas/:id
 * Eliminar un área (CORREGIDO - antes estaba como PUT)
 */
router.delete('/:id', verificarToken, async (req, res) => {
    try {
        const { id } = req.params;

        // Verificar si existe
        const [existe] = await db.query(
            'SELECT id_area FROM areas WHERE id_area = ?',
            [id]
        );

        if (existe.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Área no encontrada'
            });
        }

        // Verificar dependencias
        const [dependencias] = await db.query(`
            SELECT 
                (SELECT COUNT(*) FROM checklist WHERE id_area = ?) as total_checklists
        `, [id, id]);

        if (dependencias[0].total_checklists > 0 || dependencias[0].total_usuarios > 0) {
            return res.status(400).json({
                success: false,
                message: 'No se puede eliminar el área porque tiene dependencias'
            });
        }

        // Eliminar área
        await db.query('DELETE FROM areas WHERE id_area = ?', [id]);

        res.json({
            success: true,
            message: 'Área eliminada exitosamente'
        });

    } catch (error) {
        console.error('Error al eliminar área:', error);
        res.status(500).json({
            success: false,
            message: 'Error al eliminar el área',
            error: error.message
        });
    }
});

/**
 * GET /api/areas/check-dependencias/:id
 * Verificar si un área tiene dependencias (CORREGIDO)
 */
router.get('/check-dependencias/:id', verificarToken, async (req, res) => {
    try {
        const { id } = req.params;
        
        // Verificar que el área existe
        const [area] = await db.query(
            'SELECT id_area FROM areas WHERE id_area = ?',
            [id]
        );

        if (area.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Área no encontrada'
            });
        }

        // Consulta corregida - usando placeholders correctamente
        // Verificar dependencias
            const [dependencias] = await db.query(`
                SELECT 
                    (SELECT COUNT(*) FROM checklist WHERE id_area = ?) as total_checklists
            `, [id]);

            if (dependencias[0].total_checklists > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'No se puede eliminar el área porque tiene checklists asociados'
                });
            }


        res.json({
            success: true,
            data: dependencias[0]
        });
    } catch (error) {
        console.error('Error al verificar dependencias:', error);
        res.status(500).json({
            success: false,
            message: 'Error al verificar dependencias',
            error: error.message
        });
    }
});

module.exports = router;