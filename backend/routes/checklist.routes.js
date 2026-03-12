const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { verificarToken } = require('../middlewares/auth');

// ===========================================
// OBTENER TODOS LOS CHECKLISTS (CON PREGUNTAS)
// ===========================================
router.get('/', async (req, res) => {
    try {
        const [checklists] = await db.query(`
            SELECT 
                c.*, 
                a.nombre_area as area_nombre, 
                u.nombre as creador_nombre,
                COUNT(p.id_pregunta) as total_preguntas
            FROM checklist c
            LEFT JOIN areas a ON c.id_area = a.id_area
            LEFT JOIN usuarios u ON c.creado_por = u.id_usuario
            LEFT JOIN preguntas_checklist p ON c.id_checklist = p.id_checklist
            GROUP BY c.id_checklist
            ORDER BY c.fecha_creacion DESC
        `);
        res.json(checklists);
    } catch (error) {
        console.error('Error en GET /checklist:', error);
        res.status(500).json({ message: 'Error al obtener checklists', error: error.message });
    }
});

// ===========================================
// OBTENER CHECKLIST POR ID (CON PREGUNTAS)
// ===========================================
router.get('/:id', async (req, res) => {
    try {
        // Obtener información del checklist
        const [checklists] = await db.query(`
            SELECT 
                c.*, 
                a.nombre_area as area_nombre, 
                u.nombre as creador_nombre 
            FROM checklist c
            LEFT JOIN areas a ON c.id_area = a.id_area
            LEFT JOIN usuarios u ON c.creado_por = u.id_usuario
            WHERE c.id_checklist = ?
        `, [req.params.id]);
        
        if (checklists.length === 0) {
            return res.status(404).json({ message: 'Checklist no encontrado' });
        }

        // Obtener preguntas del checklist
        const [preguntas] = await db.query(`
            SELECT 
                id_pregunta,
                id_checklist,
                pregunta,
                tipo_respuesta,
                opciones,
                requiere_observacion,
                orden
            FROM preguntas_checklist
            WHERE id_checklist = ?
            ORDER BY orden ASC
        `, [req.params.id]);

        // Procesar opciones (convertir string JSON a array)
        const preguntasProcesadas = preguntas.map(p => ({
            ...p,
            opciones: p.opciones ? JSON.parse(p.opciones) : null
        }));

        // Combinar checklist con preguntas
        const checklistCompleto = {
            ...checklists[0],
            preguntas: preguntasProcesadas
        };

        res.json(checklistCompleto);
    } catch (error) {
        console.error('Error en GET /checklist/:id:', error);
        res.status(500).json({ message: 'Error al obtener checklist', error: error.message });
    }
});

// ===========================================
// CREAR NUEVO CHECKLIST (CON PREGUNTAS)
// ===========================================
router.post('/', verificarToken, async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const { nombre, descripcion, id_area, preguntas } = req.body;
        const creado_por = req.usuario.id_usuario;

        console.log('📝 Creando checklist:', { nombre, descripcion, id_area, creado_por });
        console.log('📋 Preguntas recibidas:', preguntas);

        // Validar datos básicos
        if (!nombre || !id_area) {
            await connection.rollback();
            return res.status(400).json({ message: 'Faltan datos requeridos: nombre y área son obligatorios' });
        }

        // Insertar checklist
        const [result] = await connection.query(
            'INSERT INTO checklist (nombre, descripcion, id_area, creado_por, activo) VALUES (?, ?, ?, ?, 1)',
            [nombre, descripcion || null, id_area, creado_por]
        );

        const idChecklist = result.insertId;
        console.log('✅ Checklist creado con ID:', idChecklist);

        // Insertar preguntas si existen
        if (preguntas && Array.isArray(preguntas) && preguntas.length > 0) {
            for (let i = 0; i < preguntas.length; i++) {
                const p = preguntas[i];
                
                // Validar pregunta
                if (!p.pregunta || p.pregunta.trim() === '') {
                    throw new Error(`La pregunta ${i + 1} no puede estar vacía`);
                }

                // Procesar opciones si es opción múltiple
                let opciones = null;
                if (p.tipo_respuesta === 'opcion_multiple' && p.opciones) {
                    opciones = JSON.stringify(p.opciones);
                }

                await connection.query(`
                    INSERT INTO preguntas_checklist 
                    (id_checklist, pregunta, tipo_respuesta, opciones, requiere_observacion, orden)
                    VALUES (?, ?, ?, ?, ?, ?)
                `, [
                    idChecklist,
                    p.pregunta,
                    p.tipo_respuesta || 'si_no',
                    opciones,
                    p.requiere_observacion ? 1 : 0,
                    i + 1
                ]);

                console.log(`  ✅ Pregunta ${i + 1} insertada: "${p.pregunta.substring(0, 30)}..."`);
            }
        } else {
            console.log('⚠️ No se recibieron preguntas para este checklist');
        }

        await connection.commit();

        // Obtener el checklist completo con preguntas
        const [nuevoChecklist] = await db.query(`
            SELECT c.*, a.nombre_area as area_nombre, u.nombre as creador_nombre 
            FROM checklist c
            LEFT JOIN areas a ON c.id_area = a.id_area
            LEFT JOIN usuarios u ON c.creado_por = u.id_usuario
            WHERE c.id_checklist = ?
        `, [idChecklist]);

        // Obtener preguntas insertadas
        const [preguntasInsertadas] = await db.query(`
            SELECT * FROM preguntas_checklist 
            WHERE id_checklist = ? 
            ORDER BY orden ASC
        `, [idChecklist]);

        res.status(201).json({
            ...nuevoChecklist[0],
            preguntas: preguntasInsertadas
        });

    } catch (error) {
        await connection.rollback();
        console.error('❌ Error en POST /checklist:', error);
        res.status(500).json({ message: 'Error al crear checklist', error: error.message });
    } finally {
        connection.release();
    }
});

// ===========================================
// ACTUALIZAR CHECKLIST (CON PREGUNTAS)
// ===========================================
router.put('/:id', async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const { id } = req.params;
        const { nombre, descripcion, id_area, preguntas } = req.body;

        console.log('📝 Actualizando checklist ID:', id);
        console.log('📋 Preguntas recibidas:', preguntas);

        // Validar datos básicos
        if (!nombre || !id_area) {
            await connection.rollback();
            return res.status(400).json({ message: 'Faltan datos requeridos' });
        }

        // Actualizar checklist
        await connection.query(
            'UPDATE checklist SET nombre = ?, descripcion = ?, id_area = ? WHERE id_checklist = ?',
            [nombre, descripcion, id_area, id]
        );

        // Eliminar preguntas existentes
        await connection.query('DELETE FROM preguntas_checklist WHERE id_checklist = ?', [id]);
        console.log('✅ Preguntas anteriores eliminadas');

        // Insertar nuevas preguntas
        if (preguntas && Array.isArray(preguntas) && preguntas.length > 0) {
            for (let i = 0; i < preguntas.length; i++) {
                const p = preguntas[i];
                
                if (!p.pregunta || p.pregunta.trim() === '') {
                    throw new Error(`La pregunta ${i + 1} no puede estar vacía`);
                }

                let opciones = null;
                if (p.tipo_respuesta === 'opcion_multiple' && p.opciones) {
                    opciones = JSON.stringify(p.opciones);
                }

                await connection.query(`
                    INSERT INTO preguntas_checklist 
                    (id_checklist, pregunta, tipo_respuesta, opciones, requiere_observacion, orden)
                    VALUES (?, ?, ?, ?, ?, ?)
                `, [
                    id,
                    p.pregunta,
                    p.tipo_respuesta || 'si_no',
                    opciones,
                    p.requiere_observacion ? 1 : 0,
                    i + 1
                ]);
            }
            console.log(`✅ ${preguntas.length} preguntas insertadas`);
        }

        await connection.commit();

        // Obtener checklist actualizado con preguntas
        const [checklistActualizado] = await db.query(`
            SELECT c.*, a.nombre_area as area_nombre, u.nombre as creador_nombre 
            FROM checklist c
            LEFT JOIN areas a ON c.id_area = a.id_area
            LEFT JOIN usuarios u ON c.creado_por = u.id_usuario
            WHERE c.id_checklist = ?
        `, [id]);

        const [preguntasActualizadas] = await db.query(`
            SELECT * FROM preguntas_checklist 
            WHERE id_checklist = ? 
            ORDER BY orden ASC
        `, [id]);

        res.json({
            ...checklistActualizado[0],
            preguntas: preguntasActualizadas
        });

    } catch (error) {
        await connection.rollback();
        console.error('❌ Error en PUT /checklist/:id:', error);
        res.status(500).json({ message: 'Error al actualizar checklist', error: error.message });
    } finally {
        connection.release();
    }
});

// ===========================================
// ELIMINAR CHECKLIST (CON SUS PREGUNTAS)
// ===========================================
router.delete('/:id', async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const { id } = req.params;

        // Verificar si el checklist existe
        const [checklist] = await connection.query('SELECT * FROM checklist WHERE id_checklist = ?', [id]);
        
        if (checklist.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: 'Checklist no encontrado' });
        }

        // Primero eliminar preguntas (por la FK)
        await connection.query('DELETE FROM preguntas_checklist WHERE id_checklist = ?', [id]);
        console.log('✅ Preguntas eliminadas');

        // Luego eliminar checklist
        await connection.query('DELETE FROM checklist WHERE id_checklist = ?', [id]);
        console.log('✅ Checklist eliminado');

        await connection.commit();
        res.json({ message: 'Checklist y sus preguntas eliminados correctamente' });

    } catch (error) {
        await connection.rollback();
        console.error('❌ Error en DELETE /checklist/:id:', error);
        res.status(500).json({ message: 'Error al eliminar checklist', error: error.message });
    } finally {
        connection.release();
    }
});

module.exports = router;