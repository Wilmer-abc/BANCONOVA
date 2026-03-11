// backend/routes/dashboard.js
const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { verificarToken } = require('../middlewares/auth');

// ============ ENDPOINTS SIMPLIFICADOS PARA EL DASHBOARD ============

/**
 * GET /api/dashboard/resumen
 * Obtener resumen de estadísticas
 */
router.get('/resumen', verificarToken, async (req, res) => {
  try {
    console.log('📊 Ejecutando consulta de resumen...');
    
    // CORREGIDO: 'checklist' en lugar de 'checklists'
    const [areas] = await db.query('SELECT COUNT(*) as total FROM areas');
    const [checklist] = await db.query('SELECT COUNT(*) as total FROM checklist');
    
    // Estas tablas pueden no existir, por eso usamos catch
    let ejecuciones = [{ total: 0 }];
    let incidentes = [{ total: 0 }];
    
    try {
      [ejecuciones] = await db.query('SELECT COUNT(*) as total FROM ejecuciones_checklist');
    } catch (e) {
      console.log('Tabla ejecuciones_checklist no existe');
    }
    
    try {
      [incidentes] = await db.query('SELECT COUNT(*) as total FROM incidentes');
    } catch (e) {
      console.log('Tabla incidentes no existe');
    }
    
    const resumen = { 
      totalAreas: areas[0]?.total || 0,
      totalChecklists: checklist[0]?.total || 0,
      totalEjecuciones: ejecuciones[0]?.total || 0,
      totalIncidentes: incidentes[0]?.total || 0,
      incidentesAltoRiesgo: 0,
      checklistPendientes: 0
    };

    console.log('📊 Resumen dashboard:', resumen);
    res.json(resumen);
  } catch (error) {
    console.error('❌ Error en /resumen:', error);
    res.json({
      totalAreas: 0,
      totalChecklists: 0,
      totalEjecuciones: 0,
      totalIncidentes: 0,
      incidentesAltoRiesgo: 0,
      checklistPendientes: 0
    });
  }
});

/**
 * GET /api/dashboard/areas
 * Obtener lista de áreas (versión simplificada)
 */
router.get('/areas', verificarToken, async (req, res) => {
  try {
    console.log('🏢 Obteniendo áreas para dashboard...');
    
    // CORREGIDO: 'id_area' en lugar de 'id_areas'
    const [areas] = await db.query(`
      SELECT 
        id_area,
        nombre_area,
        descripcion 
      FROM areas
      ORDER BY id_area DESC
    `);
    
    console.log(`${areas.length} áreas encontradas`);
    res.json(areas);
  } catch (error) {
    console.error('❌ Error en /areas:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/dashboard/checklist-por-area
 * Versión simplificada - áreas con contadores
 */
router.get('/checklist-por-area', verificarToken, async (req, res) => {
  try {
    // CORREGIDO: 'id_area' en lugar de 'id_areas'
    const [areas] = await db.query(`
      SELECT 
        id_area,
        nombre_area 
      FROM areas
    `);
    
    // Para cada área, contar sus checklists
    const resultado = await Promise.all(areas.map(async (area) => {
      let totalChecklists = 0;
      try {
        const [checklists] = await db.query(
          'SELECT COUNT(*) as total FROM checklist WHERE id_area = ?',
          [area.id_area]
        );
        totalChecklists = checklists[0]?.total || 0;
      } catch (e) {
        console.log(`Error contando checklists para área ${area.id_area}`);
      }
      
      return {
        id_area: area.id_area,
        area: area.nombre_area,
        ejecutados: 0, // Pendiente de implementar
        pendientes: totalChecklists, // Por ahora, todos los checklists están pendientes
        total_checklists: totalChecklists
      };
    }));
    
    res.json(resultado);
  } catch (error) {
    console.error('❌ Error en /checklist-por-area:', error);
    res.json([]);
  }
});

/**
 * GET /api/dashboard/incidentes-por-riesgo
 * Versión simplificada
 */
router.get('/incidentes-por-riesgo', verificarToken, async (req, res) => {
  try {
    // Intentar obtener datos reales de incidentes si la tabla existe
    let incidentes = [
      { nivel: 'Alto', cantidad: 0, color: '#DC3545' },
      { nivel: 'Medio', cantidad: 0, color: '#FFC107' },
      { nivel: 'Bajo', cantidad: 0, color: '#28A745' }
    ];
    
    try {
      const [result] = await db.query(`
        SELECT 
          nivel_riesgo,
          COUNT(*) as cantidad 
        FROM incidentes 
        GROUP BY nivel_riesgo
      `);
      
      // Mapear resultados
      result.forEach(item => {
        const incidente = incidentes.find(i => 
          i.nivel.toLowerCase() === item.nivel_riesgo.toLowerCase()
        );
        if (incidente) {
          incidente.cantidad = item.cantidad;
        }
      });
    } catch (e) {
      console.log('Tabla incidentes no existe o no tiene nivel_riesgo');
    }
    
    res.json(incidentes);
  } catch (error) {
    console.error('❌ Error en /incidentes-por-riesgo:', error);
    res.json([]);
  }
});

/**
 * GET /api/dashboard/actividad
 * Versión simplificada
 */
router.get('/actividad', verificarToken, async (req, res) => {
  try {
    let actividades = [];
    
    try {
      // Intentar obtener de actividades_recientes
      [actividades] = await db.query(`
        SELECT 
          id, 
          usuario, 
          accion, 
          modulo, 
          fecha, 
          detalle 
        FROM actividades_recientes 
        ORDER BY fecha DESC 
        LIMIT 10
      `);
    } catch (e) {
      console.log('Tabla actividades_recientes no existe');
      
      // Si no existe, obtener de otras tablas
      try {
        // Últimos checklists creados
        const [checklists] = await db.query(`
          SELECT 
            CONCAT('checklist_', id_checklist) as id,
            CONCAT('Usuario ', creado_por) as usuario,
            'creó' as accion,
            'Checklists' as modulo,
            fecha_creacion as fecha,
            nombre as detalle
          FROM checklist
          ORDER BY fecha_creacion DESC
          LIMIT 5
        `);
        
        actividades = checklists;
      } catch (e2) {
        console.log('No se pudo obtener actividad de checklists');
      }
    }
    
    res.json(actividades || []);
  } catch (error) {
    console.error('❌ Error en /actividad:', error);
    res.json([]);
  }
});

// Endpoints adicionales con respuestas por defecto
router.get('/checklist-pendientes', verificarToken, async (req, res) => {
  res.json([]);
});

router.get('/incidentes/alto-riesgo', verificarToken, async (req, res) => {
  res.json([]);
});

router.get('/estadisticas', verificarToken, async (req, res) => {
  res.json({});
});

router.get('/notificaciones', verificarToken, async (req, res) => {
  res.json([]);
});

router.get('/checklists-pendientes', verificarToken, async (req, res) => {
  res.json([]);
});

router.get('/incidentes/recientes', verificarToken, async (req, res) => {
  res.json([]);
});

router.post('/preferencias', verificarToken, async (req, res) => {
  res.json({ success: true });
});

router.post('/exportar/excel', verificarToken, async (req, res) => {
  res.status(501).json({ message: 'No implementado' });
});

router.post('/exportar/pdf', verificarToken, async (req, res) => {
  res.status(501).json({ message: 'No implementado' });
});

module.exports = router;