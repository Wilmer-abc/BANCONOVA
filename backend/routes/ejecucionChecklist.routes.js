const express = require('express');
const router = express.Router();
const db = require('../config/db'); 
const { verificarToken } = require('../middlewares/auth');

// ===========================================
// OBTENER CHECKLISTS PENDIENTES PARA EL USUARIO
// ===========================================
router.get('/pendientes', verificarToken, async (req, res) => {
    try {
        const usuarioId = req.usuario.id;
        
        // Obtener checklists pendientes del usuario
        const [checklists] = await db.query(`
            SELECT 
                c.id_checklist,
                c.nombre,
                c.descripcion,
                a.nombre_area AS area,
                COUNT(p.id_pregunta) AS total_preguntas,
                IFNULL(MAX(e.estado), 'pendiente') AS estado,
                MAX(e.fecha_ejecucion) AS ultima_ejecucion
            FROM checklist c
            LEFT JOIN areas a 
                ON c.id_area = a.id_area
            LEFT JOIN preguntas_checklist p 
                ON c.id_checklist = p.id_checklist
            LEFT JOIN ejecucion_checklist e 
                ON c.id_checklist = e.id_checklist
                AND e.id_usuario = ?
            WHERE c.activo = TRUE
            GROUP BY 
                c.id_checklist,
                c.nombre,
                c.descripcion,
                a.nombre_area
            HAVING estado != 'completado'
        `, [usuarioId]);

        console.log('📋 Checklists pendientes encontrados:', checklists);

        res.json({
            success: true,
            data: checklists
        });

    } catch (error) {
        console.error('Error al obtener checklists pendientes:', error);
        res.status(500).json({
            success: false,
            message: 'Error al cargar checklists pendientes',
            error: error.message
        });
    }
});

// ===========================================
// GUARDAR RESPUESTA DE UNA PREGUNTA
// ===========================================
router.post('/respuesta', verificarToken, async (req, res) => {
    try {
        const { id_ejecucion, id_pregunta, respuesta, observaciones } = req.body;

        // Verificar si ya existe una respuesta
        const [existente] = await db.query(`
            SELECT id_respuesta FROM respuestas
            WHERE id_ejecucion = ? AND id_pregunta = ?
        `, [id_ejecucion, id_pregunta]);

        if (existente.length > 0) {
            // Actualizar respuesta existente
            await db.query(`
                UPDATE respuestas 
                SET respuesta = ?, observaciones = ?
                WHERE id_ejecucion = ? AND id_pregunta = ?
            `, [respuesta, observaciones, id_ejecucion, id_pregunta]);
        } else {
            // Insertar nueva respuesta
            await db.query(`
                INSERT INTO respuestas (id_ejecucion, id_pregunta, respuesta, observaciones)
                VALUES (?, ?, ?, ?)
            `, [id_ejecucion, id_pregunta, respuesta, observaciones]);
        }

        res.json({
            success: true,
            message: 'Respuesta guardada exitosamente'
        });

    } catch (error) {
        console.error('Error al guardar respuesta:', error);
        res.status(500).json({
            success: false,
            message: 'Error al guardar la respuesta',
            error: error.message
        });
    }
});

// ===========================================
// FINALIZAR CHECKLIST
// ===========================================
router.post('/finalizar/:idEjecucion', verificarToken, async (req, res) => {
    try {
        const { idEjecucion } = req.params;

        // Verificar que todas las preguntas tengan respuesta
        const [preguntasSinResponder] = await db.query(`
            SELECT COUNT(*) as total
            FROM preguntas_checklist p
            INNER JOIN ejecucion_checklist e ON p.id_checklist = e.id_checklist
            LEFT JOIN respuestas r ON p.id_pregunta = r.id_pregunta 
                AND r.id_ejecucion = e.id_ejecucion
            WHERE e.id_ejecucion = ? AND r.id_respuesta IS NULL
        `, [idEjecucion]);

        if (preguntasSinResponder[0].total > 0) {
            return res.status(400).json({
                success: false,
                message: `Faltan ${preguntasSinResponder[0].total} preguntas por responder`
            });
        }

        // Actualizar estado de la ejecución
        await db.query(`
            UPDATE ejecucion_checklist
            SET estado = 'completado',
            fecha_finalizacion = NOW()
            WHERE id_ejecucion = ?;

        `, [idEjecucion]);

        res.json({
            success: true,
            message: 'Checklist finalizado exitosamente'
        });

    } catch (error) {
        console.error('Error al finalizar checklist:', error);
        res.status(500).json({
            success: false,
            message: 'Error al finalizar el checklist',
            error: error.message
        });
    }
});

// ===========================================
// OBTENER HISTORIAL DE EJECUCIONES (TODAS)
// ===========================================
router.get('/historial', verificarToken, async (req, res) => {
    try {
        const usuarioId = req.usuario.id;

        let query = `
            SELECT 
                ec.id_ejecucion,
                c.nombre as checklist_nombre,
                a.nombre_area as area,
                ec.fecha_ejecucion,
                ec.fecha_finalizacion,
                ec.estado,
                u.nombre as ejecutado_por,
                COUNT(r.id_respuesta) as respuestas_ok,
                (SELECT COUNT(*) FROM preguntas_checklist WHERE id_checklist = c.id_checklist) as total_preguntas
            FROM ejecucion_checklist ec
            INNER JOIN checklist c ON ec.id_checklist = c.id_checklist
            INNER JOIN areas a ON c.id_area = a.id_area
            INNER JOIN usuarios u ON ec.id_usuario = u.id_usuario
            LEFT JOIN respuestas r ON ec.id_ejecucion = r.id_ejecucion
            WHERE 1=1
        `;

        const params = [];

        // Si no es admin, solo ver sus propias ejecuciones
        if (req.usuario.rol !== 'admin') {
            query += ` AND ec.id_usuario = ?`;
            params.push(usuarioId);
        }

        query += ` GROUP BY ec.id_ejecucion ORDER BY ec.fecha_ejecucion DESC LIMIT 50`;

        const [ejecuciones] = await db.query(query, params);

        res.json({
            success: true,
            data: ejecuciones
        });

    } catch (error) {
        console.error('Error al obtener historial:', error);
        res.status(500).json({
            success: false,
            message: 'Error al cargar historial',
            error: error.message
        });
    }
});

// ===========================================
// OBTENER HISTORIAL DE UN CHECKLIST ESPECÍFICO
// ===========================================
router.get('/historial/checklist/:idChecklist', verificarToken, async (req, res) => {
    try {
        const usuarioId = req.usuario.id;
        const { idChecklist } = req.params;

        let query = `
            SELECT 
                ec.id_ejecucion,
                c.nombre as checklist_nombre,
                a.nombre_area as area,
                ec.fecha_ejecucion,
                ec.fecha_finalizacion,
                ec.estado,
                u.nombre as ejecutado_por,
                COUNT(r.id_respuesta) as respuestas_ok,
                (SELECT COUNT(*) FROM preguntas_checklist WHERE id_checklist = c.id_checklist) as total_preguntas
            FROM ejecucion_checklist ec
            INNER JOIN checklist c ON ec.id_checklist = c.id_checklist
            INNER JOIN areas a ON c.id_area = a.id_area
            INNER JOIN usuarios u ON ec.id_usuario = u.id_usuario
            LEFT JOIN respuestas r ON ec.id_ejecucion = r.id_ejecucion
            WHERE ec.id_checklist = ?
        `;

        const params = [idChecklist];

        // Si no es admin, solo ver sus propias ejecuciones
        if (req.usuario.rol !== 'admin') {
            query += ` AND ec.id_usuario = ?`;
            params.push(usuarioId);
        }

        query += ` GROUP BY ec.id_ejecucion ORDER BY ec.fecha_ejecucion DESC LIMIT 50`;

        const [ejecuciones] = await db.query(query, params);

        res.json({
            success: true,
            data: ejecuciones
        });

    } catch (error) {
        console.error('Error al obtener historial:', error);
        res.status(500).json({
            success: false,
            message: 'Error al cargar historial',
            error: error.message
        });
    }
});

// ===========================================
// OBTENER DETALLE DE UNA EJECUCIÓN
// ===========================================
router.get('/detalle/:idEjecucion', verificarToken, async (req, res) => {
    try {
        const { idEjecucion } = req.params;

        // Obtener información general
        const [info] = await db.query(`
            SELECT 
                ec.id_ejecucion,
                c.nombre as checklist_nombre,
                c.descripcion,
                a.nombre_area as area,
                u.nombre as ejecutado_por,
                ec.fecha_ejecucion,
                ec.fecha_finalizacion,
                ec.estado
            FROM ejecucion_checklist ec
            INNER JOIN checklist c ON ec.id_checklist = c.id_checklist
            INNER JOIN areas a ON c.id_area = a.id_area
            INNER JOIN usuarios u ON ec.id_usuario = u.id_usuario
            WHERE ec.id_ejecucion = ?
        `, [idEjecucion]);

        if (info.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Ejecución no encontrada'
            });
        }

        // Obtener respuestas
        const [respuestas] = await db.query(`
            SELECT 
                p.pregunta,
                p.tipo_respuesta,
                r.respuesta,
                r.observaciones
            FROM respuestas r
            INNER JOIN preguntas_checklist p ON r.id_pregunta = p.id_pregunta
            WHERE r.id_ejecucion = ?
            ORDER BY p.orden ASC
        `, [idEjecucion]);

        res.json({
            success: true,
            data: {
                info: info[0],
                respuestas: respuestas
            }
        });

    } catch (error) {
        console.error('Error al obtener detalle:', error);
        res.status(500).json({
            success: false,
            message: 'Error al cargar detalle',
            error: error.message
        });
    }
});


// ===========================================
// OBTENER CHECKLIST ESPECÍFICO CON SUS PREGUNTAS
// ===========================================
router.get('/:idChecklist', verificarToken, async (req, res) => {
    try {
        const { idChecklist } = req.params;
        const usuarioId = req.usuario.id;

        // Obtener información del checklist
        const [checklistInfo] = await db.query(`
            SELECT 
                c.id_checklist,
                c.nombre,
                c.descripcion,
                a.nombre_area as area,
                u.nombre as creado_por,
                c.fecha_creacion
            FROM checklist c
            LEFT JOIN areas a ON c.id_area = a.id_area
            LEFT JOIN usuarios u ON c.creado_por = u.id_usuario
            WHERE c.id_checklist = ?
        `, [idChecklist]);

        if (checklistInfo.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Checklist no encontrado'
            });
        }

        // Obtener o crear ejecución
        let [ejecucion] = await db.query(`
            SELECT id_ejecucion, estado
            FROM ejecucion_checklist
            WHERE id_checklist = ? AND id_usuario = ? AND estado = 'en_progreso'
        `, [idChecklist, usuarioId]);

        let idEjecucion;
        if (ejecucion.length === 0) {
            // Crear nueva ejecución
            const [result] = await db.query(`
                INSERT INTO ejecucion_checklist (id_checklist, id_usuario, estado)
                VALUES (?, ?, 'en_progreso')
            `, [idChecklist, usuarioId]);
            idEjecucion = result.insertId;
        } else {
            idEjecucion = ejecucion[0].id_ejecucion;
        }

        // Obtener preguntas con respuestas previas si existen
        const [preguntas] = await db.query(`
            SELECT 
                p.id_pregunta,
                p.pregunta,
                p.tipo_respuesta,
                p.opciones,
                p.requiere_observacion,
                r.id_respuesta,
                r.respuesta,
                r.observaciones
            FROM preguntas_checklist p
            LEFT JOIN respuestas r ON p.id_pregunta = r.id_pregunta 
                AND r.id_ejecucion = ?
            WHERE p.id_checklist = ?
            ORDER BY p.orden ASC
        `, [idEjecucion, idChecklist]);

        res.json({
            success: true,
            data: {
                info: checklistInfo[0],
                idEjecucion: idEjecucion,
                preguntas: preguntas.map(p => ({
                    id_pregunta: p.id_pregunta,
                    pregunta: p.pregunta,
                    tipo_respuesta: p.tipo_respuesta,
                    opciones: p.opciones ? JSON.parse(p.opciones) : [],
                    requiere_observacion: p.requiere_observacion === 1,
                    respuesta: p.respuesta || '',
                    observaciones: p.observaciones || '',
                    id_respuesta: p.id_respuesta
                }))
            }
        });

    } catch (error) {
        console.error('Error al cargar checklist:', error);
        res.status(500).json({
            success: false,
            message: 'Error al cargar el checklist',
            error: error.message
        });
    }
});



module.exports = router;