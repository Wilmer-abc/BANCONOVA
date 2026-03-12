// src/app/models/checklist.model.ts

// ===========================================
// INTERFAZ PARA PREGUNTAS DEL CHECKLIST
// ===========================================
export interface Pregunta {
  id_pregunta?: number;
  id_checklist?: number;
  pregunta: string;
  tipo_respuesta: 'si_no' | 'texto' | 'numerico' | 'opcion_multiple' | 'fecha';
  opciones?: string[] | null;        // Array de opciones para respuesta múltiple
  requiere_observacion: boolean;      // Si requiere campo de observaciones
  orden: number;                      // Orden de la pregunta (1,2,3...)
  
  // Campos para el frontend (no se envían al backend)
  respuesta?: string;                 // Para almacenar respuesta temporal
  observaciones?: string;             // Para almacenar observaciones temporales
}

// ===========================================
// INTERFAZ PRINCIPAL CHECKLIST
// ===========================================
export interface Checklist {
  // Campos de la tabla checklist (BD)
  id_checklist?: number;
  nombre: string;
  descripcion?: string | null;
  id_area: number;
  activo: boolean;                    // Campo nuevo agregado
  creado_por: number;
  fecha_creacion?: Date | string;
  
  // Relaciones (preguntas del checklist)
  preguntas?: Pregunta[];              // Array de preguntas
  
  // Campos extendidos (para joins con otras tablas)
  area_nombre?: string;                // Para mostrar nombre del área
  creador_nombre?: string;              // Para mostrar nombre del creador
  creador_email?: string;               // Email del creador (opcional)
  
  // Campos calculados para el frontend
  total_preguntas?: number;             // Total de preguntas en el checklist
  estado_texto?: 'activo' | 'inactivo'; // Texto amigable del estado
  
  // Campos de utilidad
  fecha_actualizacion?: Date | string;  // Última actualización (puede ser de ejecución)
  progreso?: number;                    // Porcentaje de progreso (0-100)
  ejecucion_actual?: number;             // ID de ejecución en progreso
}

// ===========================================
// DTOs PARA OPERACIONES CRUD
// ===========================================

// Para crear un nuevo checklist (con preguntas)
export interface CreateChecklistDTO {
  nombre: string;
  descripcion?: string | null;
  id_area: number;
  creado_por: number;
  preguntas: Omit<Pregunta, 'id_pregunta' | 'id_checklist'>[]; // Preguntas sin IDs
}

// Para actualizar un checklist
export interface UpdateChecklistDTO {
  nombre?: string;
  descripcion?: string | null;
  id_area?: number;
  activo?: boolean;
  preguntas?: (Pregunta | Omit<Pregunta, 'id_pregunta' | 'id_checklist'>)[];
}

// ===========================================
// INTERFACES PARA RESPUESTAS DEL API
// ===========================================

export interface ChecklistResponse {
  success: boolean;
  data?: Checklist | Checklist[];
  message?: string;
  error?: string;
}

export interface PreguntaResponse {
  success: boolean;
  data?: Pregunta | Pregunta[];
  message?: string;
}

// ===========================================
// INTERFACES PARA FILTROS Y ESTADÍSTICAS
// ===========================================

export interface ChecklistFilters {
  id_area?: number;
  creado_por?: number;
  activo?: boolean;
  fecha_desde?: Date | string;
  fecha_hasta?: Date | string;
  search?: string;
  page?: number;
  limit?: number;
  sort_by?: 'fecha_creacion' | 'nombre' | 'total_preguntas';
  sort_order?: 'ASC' | 'DESC';
}

export interface ChecklistStats {
  total: number;
  activos: number;
  inactivos: number;
  porArea: {
    [key: number]: {
      id_area: number;
      nombre_area: string;
      total: number;
    }
  };
  conDescripcion: number;
  sinDescripcion: number;
  totalPreguntas: number;
  promedioPreguntas: number;
  fechaCalculo: Date;
}

// ===========================================
// ENUMS Y CONSTANTES
// ===========================================

export enum TipoRespuesta {
  SI_NO = 'si_no',
  TEXTO = 'texto',
  NUMERICO = 'numerico',
  OPCION_MULTIPLE = 'opcion_multiple',
  FECHA = 'fecha'
}

export const TIPOS_RESPUESTA_LABELS: Record<TipoRespuesta, string> = {
  [TipoRespuesta.SI_NO]: 'Sí / No / N/A',
  [TipoRespuesta.TEXTO]: 'Texto',
  [TipoRespuesta.NUMERICO]: 'Valor numérico',
  [TipoRespuesta.OPCION_MULTIPLE]: 'Opción múltiple',
  [TipoRespuesta.FECHA]: 'Fecha'
};

export const TIPOS_RESPUESTA_ICONOS: Record<TipoRespuesta, string> = {
  [TipoRespuesta.SI_NO]: 'fa-check-circle',
  [TipoRespuesta.TEXTO]: 'fa-font',
  [TipoRespuesta.NUMERICO]: 'fa-calculator',
  [TipoRespuesta.OPCION_MULTIPLE]: 'fa-list',
  [TipoRespuesta.FECHA]: 'fa-calendar'
};

// ===========================================
// TYPE GUARDS Y VALIDADORES
// ===========================================

export function isPregunta(obj: any): obj is Pregunta {
  return obj 
    && typeof obj.pregunta === 'string'
    && typeof obj.tipo_respuesta === 'string'
    && ['si_no', 'texto', 'numerico', 'opcion_multiple', 'fecha'].includes(obj.tipo_respuesta)
    && typeof obj.requiere_observacion === 'boolean'
    && typeof obj.orden === 'number';
}

export function isChecklist(obj: any): obj is Checklist {
  return obj 
    && typeof obj.nombre === 'string'
    && typeof obj.id_area === 'number'
    && typeof obj.creado_por === 'number'
    && typeof obj.activo === 'boolean';
}

// ===========================================
// FACTORY PARA CREAR INSTANCIAS
// ===========================================

export class ChecklistFactory {
  
  // Crear una pregunta vacía
  static crearPreguntaVacia(orden: number = 1): Pregunta {
    return {
      pregunta: '',
      tipo_respuesta: 'si_no',
      opciones: null,
      requiere_observacion: false,
      orden: orden,
      respuesta: '',
      observaciones: ''
    };
  }

  // Crear un checklist vacío
  static crearVacio(usuarioId: number = 1): Checklist {
    return {
      nombre: '',
      descripcion: '',
      id_area: 0,
      activo: true,
      creado_por: usuarioId,
      fecha_creacion: new Date(),
      preguntas: [this.crearPreguntaVacia(1)], // Una pregunta por defecto
      total_preguntas: 1,
      estado_texto: 'activo'
    };
  }

  // Crear desde datos del backend
  static fromBackend(data: any): Checklist {
    const checklist: Checklist = {
      id_checklist: data.id_checklist,
      nombre: data.nombre,
      descripcion: data.descripcion,
      id_area: data.id_area,
      activo: data.activo === 1 || data.activo === true,
      creado_por: data.creado_por,
      fecha_creacion: data.fecha_creacion,
      area_nombre: data.area_nombre || data.area,
      creador_nombre: data.creador_nombre || data.creado_por_nombre,
      estado_texto: (data.activo === 1 || data.activo === true) ? 'activo' : 'inactivo'
    };

    // Procesar preguntas si existen
    if (data.preguntas && Array.isArray(data.preguntas)) {
      checklist.preguntas = data.preguntas.map((p: any) => ({
        id_pregunta: p.id_pregunta,
        id_checklist: p.id_checklist || data.id_checklist,
        pregunta: p.pregunta,
        tipo_respuesta: p.tipo_respuesta,
        opciones: p.opciones ? (
          typeof p.opciones === 'string' ? JSON.parse(p.opciones) : p.opciones
        ) : null,
        requiere_observacion: p.requiere_observacion === 1 || p.requiere_observacion === true,
        orden: p.orden || 0
      }));
      
      checklist.total_preguntas = checklist.preguntas?.length || 0;
    } else if (data.total_preguntas) {
      checklist.total_preguntas = data.total_preguntas;
    }

    return checklist;
  }

  // Preparar datos para enviar al backend
  static toBackend(checklist: Checklist): CreateChecklistDTO {
    return {
      nombre: checklist.nombre,
      descripcion: checklist.descripcion || null,
      id_area: checklist.id_area,
      creado_por: checklist.creado_por,
      preguntas: (checklist.preguntas || []).map(p => ({
        pregunta: p.pregunta,
        tipo_respuesta: p.tipo_respuesta,
        opciones: p.opciones,
        requiere_observacion: p.requiere_observacion,
        orden: p.orden
      }))
    };
  }

  // Clonar un checklist existente
  static clonar(checklist: Checklist, nuevoNombre: string, usuarioId: number): CreateChecklistDTO {
    return {
      nombre: nuevoNombre,
      descripcion: checklist.descripcion,
      id_area: checklist.id_area,
      creado_por: usuarioId,
      preguntas: (checklist.preguntas || []).map(p => ({
        pregunta: p.pregunta,
        tipo_respuesta: p.tipo_respuesta,
        opciones: p.opciones,
        requiere_observacion: p.requiere_observacion,
        orden: p.orden
      }))
    };
  }
}

// ===========================================
// UTILIDADES PARA PREGUNTAS
// ===========================================

export class PreguntaUtils {
  
  // Validar si una pregunta es válida
  static esValida(pregunta: Partial<Pregunta>): boolean {
    if (!pregunta.pregunta || pregunta.pregunta.trim() === '') {
      return false;
    }
    
    if (pregunta.tipo_respuesta === 'opcion_multiple') {
      return !!pregunta.opciones && pregunta.opciones.length > 0;
    }
    
    return true;
  }

  // Obtener el label del tipo de respuesta
  static getTipoLabel(tipo: string): string {
    return TIPOS_RESPUESTA_LABELS[tipo as TipoRespuesta] || tipo;
  }

  // Obtener el icono del tipo de respuesta
  static getTipoIcono(tipo: string): string {
    return TIPOS_RESPUESTA_ICONOS[tipo as TipoRespuesta] || 'fa-question';
  }

  // Procesar opciones desde string
  static procesarOpciones(opcionesStr: string): string[] {
    if (!opcionesStr) return [];
    return opcionesStr.split(',').map(o => o.trim()).filter(o => o !== '');
  }

  // Convertir opciones a string para el formulario
  static opcionesToString(opciones?: string[] | null): string {
    if (!opciones || opciones.length === 0) return '';
    return opciones.join(', ');
  }
}