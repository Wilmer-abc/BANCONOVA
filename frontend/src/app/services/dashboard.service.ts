import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, of, forkJoin } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { isPlatformBrowser } from '@angular/common';

export interface ResumenStats {
  totalAreas: number;
  totalChecklists: number;
  totalEjecuciones: number;
  totalIncidentes: number;
  incidentesAltoRiesgo: number;
  checklistPendientes: number;
}

export interface ActividadReciente {
  id: number;
  usuario: string;
  accion: string;
  modulo: 'checklist' | 'incidente' | 'formulario';
  fecha: Date;
  detalle?: string;
}

export interface ChecklistPorArea {
  area: string;
  ejecutados: number;
  pendientes: number;
}

export interface IncidentePorRiesgo {
  nivel: 'Alto' | 'Medio' | 'Bajo';
  cantidad: number;
  color: string;
}

export interface DashboardStats {
  totalUsuarios: number;
  usuariosActivos: number;
  totalIncidentes: number;
  incidentesPendientes: number;
  totalChecklists: number;
  checklistsCompletados: number;
  totalFormularios: number;
  formulariosPendientes: number;
  transaccionesHoy: number;
  montoTransaccionesHoy: number;
  // Nuevos campos para el dashboard SGSI
  totalAreas: number;
  totalEjecuciones: number;
  incidentesAltoRiesgo: number;
  checklistPendientes: number;
}

export interface ActivityItem {
  id: number;
  usuario: string;
  accion: string;
  modulo: string;
  fecha: Date;
  estado: 'completado' | 'pendiente' | 'error';
  ip?: string;
  detalle?: string;
}

export interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor?: string[];
    borderColor?: string;
  }[];
}

export interface Notification {
  id: number;
  titulo: string;
  mensaje: string;
  tipo: 'info' | 'success' | 'warning' | 'error';
  fecha: Date;
  leido: boolean;
  link?: string;
}

export interface ChecklistItem {
  id: number;
  titulo: string;
  descripcion: string;
  fechaLimite: Date;
  asignadoA: string;
  completado: boolean;
  prioridad: 'alta' | 'media' | 'baja';
  area?: string;
}

export interface Incidente {
  id: number;
  titulo: string;
  descripcion: string;
  fechaReporte: Date;
  fechaResolucion?: Date;
  reportadoPor: string;
  asignadoA?: string;
  estado: 'abierto' | 'en_proceso' | 'resuelto' | 'cerrado';
  prioridad: 'alta' | 'media' | 'baja';
  modulo: string;
  nivelRiesgo?: 'Alto' | 'Medio' | 'Bajo';
}

export interface Usuario {
  id_usuario: number;
  nombre: string;
  correo: string;
  rol: string;
  estado: boolean;
  fecha_creacion: Date;
  ultimo_acceso?: Date;
  avatar?: string;
}

export interface Area {
  id: number;
  nombre: string;
  descripcion?: string;
  responsable?: string;
  totalChecklists?: number;
}

export interface ReporteData {
  id: number;
  nombre: string;
  tipo: string;
  fechaGeneracion: Date;
  generadoPor: string;
  formato: 'PDF' | 'EXCEL' | 'CSV';
  url: string;
  tamaño: number;
}

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  
  private apiUrl = 'http://localhost:3000/api/dashboard';
  private statsSubject = new BehaviorSubject<ResumenStats | null>(null);
  private notificationsSubject = new BehaviorSubject<Notification[]>([]);

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  /**
   * Obtener headers con token de autenticación
   */
  private getHeaders() {
    const token = localStorage.getItem('token');
    return {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };
  }

  // ============ MÉTODOS PARA EL DASHBOARD SGSI (CONEXIÓN REAL) ============

  /**
   * Obtener resumen de estadísticas para el dashboard
   */
  getResumenStats(): Observable<ResumenStats> {
    return this.http.get<ResumenStats>(`${this.apiUrl}/resumen`, this.getHeaders()).pipe(
      tap(stats => {
        console.log('📊 Resumen stats recibidos:', stats);
        this.statsSubject.next(stats);
      }),
      catchError(this.handleError<ResumenStats>('getResumenStats', this.getDefaultResumen()))
    );
  }

  /**
   * Obtener actividad reciente filtrada por módulo
   */
  getActividadReciente(limite: number = 10, modulo?: string): Observable<ActividadReciente[]> {
    let url = `${this.apiUrl}/actividad?limite=${limite}`;
    if (modulo) url += `&modulo=${modulo}`;
    
    return this.http.get<ActividadReciente[]>(url, this.getHeaders()).pipe(
      catchError(this.handleError<ActividadReciente[]>('getActividadReciente', []))
    );
  }

  /**
   * Obtener checklist ejecutados por área
   */
  getChecklistPorArea(): Observable<ChecklistPorArea[]> {
    return this.http.get<ChecklistPorArea[]>(`${this.apiUrl}/checklist-por-area`, this.getHeaders()).pipe(
      catchError(this.handleError<ChecklistPorArea[]>('getChecklistPorArea', []))
    );
  }

  /**
   * Obtener incidentes por nivel de riesgo
   */
  getIncidentesPorRiesgo(): Observable<IncidentePorRiesgo[]> {
    return this.http.get<IncidentePorRiesgo[]>(`${this.apiUrl}/incidentes-por-riesgo`, this.getHeaders()).pipe(
      map(incidentes => {
        // Asegurar que tengan colores
        return incidentes.map(item => ({
          ...item,
          color: item.nivel === 'Alto' ? '#DC3545' : 
                 item.nivel === 'Medio' ? '#FFC107' : '#28A745'
        }));
      }),
      catchError(this.handleError<IncidentePorRiesgo[]>('getIncidentesPorRiesgo', []))
    );
  }

  /**
   * Obtener lista de áreas
   */
  getAreas(): Observable<Area[]> {
    return this.http.get<Area[]>(`${this.apiUrl}/areas`, this.getHeaders()).pipe(
      catchError(this.handleError<Area[]>('getAreas', []))
    );
  }

  /**
   * Obtener checklist pendientes por área
   */
  getChecklistPendientesPorArea(idArea?: number): Observable<ChecklistItem[]> {
    let url = `${this.apiUrl}/checklist-pendientes`;
    if (idArea) url += `?idArea=${idArea}`;
    
    return this.http.get<ChecklistItem[]>(url, this.getHeaders()).pipe(
      catchError(this.handleError<ChecklistItem[]>('getChecklistPendientesPorArea', []))
    );
  }

  /**
   * Obtener incidentes de alto riesgo
   */
  getIncidentesAltoRiesgo(limite: number = 5): Observable<Incidente[]> {
    return this.http.get<Incidente[]>(`${this.apiUrl}/incidentes/alto-riesgo?limite=${limite}`, this.getHeaders()).pipe(
      catchError(this.handleError<Incidente[]>('getIncidentesAltoRiesgo', []))
    );
  }

  /**
   * Obtener todas las estadísticas en una sola llamada
   */
  getAllDashboardData(): Observable<any> {
    return forkJoin({
      resumen: this.getResumenStats(),
      actividades: this.getActividadReciente(10),
      checklistPorArea: this.getChecklistPorArea(),
      incidentesPorRiesgo: this.getIncidentesPorRiesgo(),
      areas: this.getAreas()
    }).pipe(
      tap(data => console.log('📦 Todos los datos del dashboard:', data)),
      catchError(this.handleError('getAllDashboardData', {
        resumen: this.getDefaultResumen(),
        actividades: [],
        checklistPorArea: [],
        incidentesPorRiesgo: [],
        areas: []
      }))
    );
  }

  /**
   * Valores por defecto para resumen
   */
  private getDefaultResumen(): ResumenStats {
    return {
      totalAreas: 0,
      totalChecklists: 0,
      totalEjecuciones: 0,
      totalIncidentes: 0,
      incidentesAltoRiesgo: 0,
      checklistPendientes: 0
    };
  }

  // ============ MÉTODOS EXISTENTES (también conectarlos al backend) ============

  getEstadisticas(): Observable<DashboardStats> {
    return this.http.get<DashboardStats>(`${this.apiUrl}/estadisticas`, this.getHeaders()).pipe(
      catchError(this.handleError<DashboardStats>('getEstadisticas', {} as DashboardStats))
    );
  }

  getNotificaciones(noLeidas: boolean = false): Observable<Notification[]> {
    let url = `${this.apiUrl}/notificaciones`;
    if (noLeidas) url += '?noLeidas=true';
    
    return this.http.get<Notification[]>(url, this.getHeaders()).pipe(
      tap(notificaciones => this.notificationsSubject.next(notificaciones)),
      catchError(this.handleError<Notification[]>('getNotificaciones', []))
    );
  }

  getChecklistsPendientes(usuario?: string, area?: string): Observable<ChecklistItem[]> {
    let url = `${this.apiUrl}/checklists-pendientes`;
    const params: string[] = [];
    if (usuario) params.push(`usuario=${usuario}`);
    if (area) params.push(`area=${area}`);
    if (params.length) url += '?' + params.join('&');
    
    return this.http.get<ChecklistItem[]>(url, this.getHeaders()).pipe(
      catchError(this.handleError<ChecklistItem[]>('getChecklistsPendientes', []))
    );
  }

  getIncidentesRecientes(limite: number = 5, nivelRiesgo?: string): Observable<Incidente[]> {
    let url = `${this.apiUrl}/incidentes/recientes?limite=${limite}`;
    if (nivelRiesgo) url += `&nivelRiesgo=${nivelRiesgo}`;
    
    return this.http.get<Incidente[]>(url, this.getHeaders()).pipe(
      catchError(this.handleError<Incidente[]>('getIncidentesRecientes', []))
    );
  }

  // ============ MÉTODOS DE CONFIGURACIÓN ============

  actualizarPreferencias(preferencias: any): Observable<any> {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('dashboard_preferences', JSON.stringify(preferencias));
    }
    return this.http.post(`${this.apiUrl}/preferencias`, preferencias, this.getHeaders()).pipe(
      catchError(this.handleError('actualizarPreferencias', { success: false }))
    );
  }

  obtenerPreferencias(): any {
    if (isPlatformBrowser(this.platformId)) {
      return JSON.parse(localStorage.getItem('dashboard_preferences') || 'null') || {
        widgetOrder: ['stats', 'actividad', 'charts'],
        theme: 'light',
        refreshInterval: 30000
      };
    }
    return null;
  }

  // ============ MÉTODOS DE EXPORTACIÓN ============

  exportarAExcel(tipo: string, data: any[]): Observable<Blob> {
    return this.http.post(`${this.apiUrl}/exportar/excel`, { tipo, data }, {
      ...this.getHeaders(),
      responseType: 'blob'
    }).pipe(
      catchError(this.handleError('exportarAExcel', new Blob()))
    );
  }

  exportarAPDF(tipo: string, data: any[]): Observable<Blob> {
    return this.http.post(`${this.apiUrl}/exportar/pdf`, { tipo, data }, {
      ...this.getHeaders(),
      responseType: 'blob'
    }).pipe(
      catchError(this.handleError('exportarAPDF', new Blob()))
    );
  }

  // ============ MANEJO DE ERRORES MEJORADO ============

  private handleError<T>(operation = 'operation', result?: T) {
    return (error: any): Observable<T> => {
      console.error(`❌ ${operation} failed:`, error);
      
      // Si es error 401 (no autorizado), podrías redirigir al login
      if (error.status === 401) {
        console.log('🔒 Sesión expirada, redirigiendo a login...');
        // Aquí podrías emitir un evento para que el componente maneje la redirección
      }
      
      // Retornar resultado por defecto para que la app no se rompa
      return new Observable(observer => {
        observer.next(result as T);
        observer.complete();
      });
    };
  }
}