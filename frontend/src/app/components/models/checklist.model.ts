// src/app/models/checklist.model.ts

export interface Checklist {
  // Campos obligatorios (coinciden con tu BD)
  id_checklist?: number;        // Opcional porque es autoincremental
  nombre: string;                // Obligatorio (VARCHAR 150)
  descripcion?: string;          // Opcional (TEXT)
  id_area: number;               // Obligatorio (FK)
  creado_por: number;            // Obligatorio (FK)
  fecha_creacion?: Date | string; // Opcional (TIMESTAMP)
  
  // Campos extendidos (para joins con otras tablas)
  area_nombre?: string;          // Para mostrar nombre del área
  creador_nombre?: string;       // Para mostrar nombre del creador
  creador_email?: string;        // Email del creador (opcional)
  
  // Campos de utilidad para el frontend
  estado?: 'activo' | 'inactivo' | 'archivado';  // Estado del checklist
  fecha_actualizacion?: Date | string;           // Última actualización
  total_items?: number;          // Total de items en el checklist
  items_completados?: number;    // Items marcados como completados
  progreso?: number;             // Porcentaje de progreso (0-100)
}

// Interfaz para crear un nuevo checklist (sin campos auto-generados)
export interface CreateChecklistDTO {
  nombre: string;
  descripcion?: string;
  id_area: number;
  creado_por: number;
}

// Interfaz para actualizar un checklist (todos opcionales excepto ID)
export interface UpdateChecklistDTO {
  nombre?: string;
  descripcion?: string;
  id_area?: number;
  estado?: 'activo' | 'inactivo' | 'archivado';
}

// Interfaz para respuesta del API (con todos los campos)
export interface ChecklistResponse extends Checklist {
  message?: string;
  success?: boolean;
}

// Interfaz para filtros de búsqueda
export interface ChecklistFilters {
  id_area?: number;
  creado_por?: number;
  fecha_desde?: Date;
  fecha_hasta?: Date;
  search?: string;
  estado?: string;
  page?: number;
  limit?: number;
}

// Interfaz para estadísticas
export interface ChecklistStats {
  total: number;
  porArea: {
    [key: number]: number;  // Ej: { 1: 5, 2: 3, 3: 8 }
  };
  conDescripcion: number;
  sinDescripcion: number;
  fechaActualizacion: Date;
  ultimosCreados: Checklist[];
}

// Enum para estados (si tienes estados predefinidos)
export enum ChecklistEstado {
  ACTIVO = 'activo',
  INACTIVO = 'inactivo',
  ARCHIVADO = 'archivado',
  EN_PROGRESO = 'en_progreso',
  COMPLETADO = 'completado'
}

// Type guard para verificar si un objeto es un Checklist válido
export function isChecklist(obj: any): obj is Checklist {
  return obj 
    && typeof obj.nombre === 'string'
    && (obj.id_area === undefined || typeof obj.id_area === 'number')
    && (obj.creado_por === undefined || typeof obj.creado_por === 'number');
}

// Clase utilitaria para crear instancias de Checklist
export class ChecklistFactory {
  static create(data: Partial<Checklist>): Checklist {
    return {
      nombre: data.nombre || '',
      id_area: data.id_area || 0,
      creado_por: data.creado_por || 0,
      descripcion: data.descripcion || '',
      estado: data.estado || 'activo',
      fecha_creacion: data.fecha_creacion || new Date(),
      ...data
    };
  }

  static createEmpty(): Checklist {
    return {
      nombre: '',
      id_area: 0,
      creado_por: 0,
      descripcion: '',
      estado: 'activo',
      fecha_creacion: new Date()
    };
  }
}