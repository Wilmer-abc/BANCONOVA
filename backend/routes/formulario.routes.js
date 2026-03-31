const express = require('express');
const router = express.Router();
const db = require('../config/db'); 
const { verificarToken } = require('../middlewares/auth');

// Obtener todos los formularios
router.get('/formularios', verificarToken, async (req, res) => {
    try {
        const [formularios] = await db.query(`
            SELECT f.*, u.nombre as creador_nombre 
            FROM formularios f
            LEFT JOIN usuarios u ON f.creado_por = u.id_usuario
            ORDER BY f.fecha_creacion DESC
        `);
        
        res.json({
            success: true,
            data: formularios
        });
    } catch (error) {
        console.error('Error al obtener formularios:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener los formularios'
        });
    }
});

// Obtener un formulario específico con sus preguntas
router.get('/formularios/:id', verificarToken, async (req, res) => {
    try {
        const { id } = req.params;
        
        // Obtener datos del formulario
        const [formulario] = await db.query(
            'SELECT * FROM formularios WHERE id_formulario = ?',
            [id]
        );
        
        if (formulario.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Formulario no encontrado'
            });
        }
        
        // Obtener preguntas del formulario
        const [preguntas] = await db.query(
            'SELECT * FROM preguntas_formulario WHERE id_formulario = ? ORDER BY id_pregunta',
            [id]
        );
        
        res.json({
            success: true,
            data: {
                ...formulario[0],
                preguntas
            }
        });
    } catch (error) {
        console.error('Error al obtener formulario:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener el formulario'
        });
    }
});

// Crear nuevo formulario con sus preguntas
router.post('/formularios', verificarToken, async (req, res) => {
    const connection = await db.getConnection();
    
    try {
        await connection.beginTransaction();
        
        const { nombre, descripcion, preguntas } = req.body;
        const creado_por = req.user.id_usuario; // Asumiendo que tienes el usuario en el token
        
        // Insertar formulario
        const [resultFormulario] = await connection.query(
            'INSERT INTO formularios (nombre, descripcion, creado_por) VALUES (?, ?, ?)',
            [nombre, descripcion, creado_por]
        );
        
        const id_formulario = resultFormulario.insertId;
        
        // Insertar preguntas
        if (preguntas && preguntas.length > 0) {
            for (const pregunta of preguntas) {
                await connection.query(
                    'INSERT INTO preguntas_formulario (id_formulario, pregunta, tipo_respuesta) VALUES (?, ?, ?)',
                    [id_formulario, pregunta.texto, pregunta.tipo]
                );
            }
        }
        
        await connection.commit();
        
        res.status(201).json({
            success: true,
            message: 'Formulario creado exitosamente',
            data: { id_formulario }
        });
    } catch (error) {
        await connection.rollback();
        console.error('Error al crear formulario:', error);
        res.status(500).json({
            success: false,
            message: 'Error al crear el formulario'
        });
    } finally {
        connection.release();
    }
});

// Actualizar formulario
router.put('/formularios/:id', verificarToken, async (req, res) => {
    const connection = await db.getConnection();
    
    try {
        await connection.beginTransaction();
        
        const { id } = req.params;
        const { nombre, descripcion, preguntas } = req.body;
        
        // Actualizar formulario
        await connection.query(
            'UPDATE formularios SET nombre = ?, descripcion = ? WHERE id_formulario = ?',
            [nombre, descripcion, id]
        );
        
        // Eliminar preguntas existentes
        await connection.query(
            'DELETE FROM preguntas_formulario WHERE id_formulario = ?',
            [id]
        );
        
        // Insertar nuevas preguntas
        if (preguntas && preguntas.length > 0) {
            for (const pregunta of preguntas) {
                await connection.query(
                    'INSERT INTO preguntas_formulario (id_formulario, pregunta, tipo_respuesta) VALUES (?, ?, ?)',
                    [id, pregunta.texto, pregunta.tipo]
                );
            }
        }
        
        await connection.commit();
        
        res.json({
            success: true,
            message: 'Formulario actualizado exitosamente'
        });
    } catch (error) {
        await connection.rollback();
        console.error('Error al actualizar formulario:', error);
        res.status(500).json({
            success: false,
            message: 'Error al actualizar el formulario'
        });
    } finally {
        connection.release();
    }
});

// Eliminar formulario
router.delete('/formularios/:id', verificarToken, async (req, res) => {
    const connection = await db.getConnection();
    
    try {
        await connection.beginTransaction();
        
        const { id } = req.params;
        
        // Eliminar respuestas (por integridad referencial)
        await connection.query(`
            DELETE r FROM respuestas_formulario r
            INNER JOIN preguntas_formulario p ON r.id_pregunta = p.id_pregunta
            WHERE p.id_formulario = ?
        `, [id]);
        
        // Eliminar preguntas
        await connection.query('DELETE FROM preguntas_formulario WHERE id_formulario = ?', [id]);
        
        // Eliminar formulario
        await connection.query('DELETE FROM formularios WHERE id_formulario = ?', [id]);
        
        await connection.commit();
        
        res.json({
            success: true,
            message: 'Formulario eliminado exitosamente'
        });
    } catch (error) {
        await connection.rollback();
        console.error('Error al eliminar formulario:', error);
        res.status(500).json({
            success: false,
            message: 'Error al eliminar el formulario'
        });
    } finally {
        connection.release();
    }
});

// Guardar respuestas de un formulario
router.post('/formularios/:id/respuestas', verificarToken, async (req, res) => {
    const connection = await db.getConnection();
    
    try {
        await connection.beginTransaction();
        
        const { id } = req.params;
        const { respuestas } = req.body;
        const id_usuario = req.user.id_usuario;
        
        // Verificar si el usuario ya respondió este formulario
        const [existeRespuesta] = await connection.query(`
            SELECT COUNT(*) as total FROM respuestas_formulario r
            INNER JOIN preguntas_formulario p ON r.id_pregunta = p.id_pregunta
            WHERE p.id_formulario = ? AND r.id_usuario = ?
        `, [id, id_usuario]);
        
        if (existeRespuesta[0].total > 0) {
            return res.status(400).json({
                success: false,
                message: 'Ya has respondido este formulario'
            });
        }
        
        // Guardar cada respuesta
        for (const respuesta of respuestas) {
            await connection.query(
                'INSERT INTO respuestas_formulario (id_pregunta, id_usuario, respuesta) VALUES (?, ?, ?)',
                [respuesta.id_pregunta, id_usuario, respuesta.valor]
            );
        }
        
        await connection.commit();
        
        res.json({
            success: true,
            message: 'Respuestas guardadas exitosamente'
        });
    } catch (error) {
        await connection.rollback();
        console.error('Error al guardar respuestas:', error);
        res.status(500).json({
            success: false,
            message: 'Error al guardar las respuestas'
        });
    } finally {
        connection.release();
    }
});

// Obtener respuestas de un formulario
router.get('/formularios/:id/respuestas', verificarToken, async (req, res) => {
    try {
        const { id } = req.params;
        
        const [respuestas] = await db.query(`
            SELECT 
                r.*,
                u.nombre as usuario_nombre,
                u.correo as usuario_correo,
                p.pregunta,
                p.tipo_respuesta
            FROM respuestas_formulario r
            INNER JOIN preguntas_formulario p ON r.id_pregunta = p.id_pregunta
            INNER JOIN usuarios u ON r.id_usuario = u.id_usuario
            WHERE p.id_formulario = ?
            ORDER BY r.fecha DESC
        `, [id]);
        
        res.json({
            success: true,
            data: respuestas
        });
    } catch (error) {
        console.error('Error al obtener respuestas:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener las respuestas'
        });
    }
});

// Verificar si un usuario ya respondió un formulario
router.get('/formularios/:id/verificar-respuesta', verificarToken, async (req, res) => {
    try {
        const { id } = req.params;
        const id_usuario = req.user.id_usuario;
        
        const [result] = await db.query(`
            SELECT COUNT(*) as total FROM respuestas_formulario r
            INNER JOIN preguntas_formulario p ON r.id_pregunta = p.id_pregunta
            WHERE p.id_formulario = ? AND r.id_usuario = ?
        `, [id, id_usuario]);
        
        res.json({
            success: true,
            yaRespondio: result[0].total > 0
        });
    } catch (error) {
        console.error('Error al verificar respuesta:', error);
        res.status(500).json({
            success: false,
            message: 'Error al verificar si ya respondió'
        });
    }
});

module.exports = router;