import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { of } from 'rxjs';

export interface ChecklistPendiente {
  id_checklist: number;
  nombre: string;
  descripcion: string;
  area: string;
  total_preguntas: number;
  estado: 'pendiente' | 'en_progreso' | 'completado';
  ultima_ejecucion?: string;
}

export interface PreguntaChecklist {
  id_pregunta: number;
  pregunta: string;
  tipo_respuesta: 'si_no' | 'texto' | 'numerico' | 'opcion_multiple' | 'fecha';
  opciones?: string[];
  requiere_observacion: boolean;
  respuesta: string;
  observaciones: string;
  id_respuesta?: number;
}

export interface ChecklistActivo {
  info: {
    id_checklist: number;
    nombre: string;
    descripcion: string;
    area: string;
    creado_por: string;
    fecha_creacion: string;
  };
  idEjecucion: number;
  preguntas: PreguntaChecklist[];
}

export interface HistorialEjecucion {
  id_ejecucion: number;
  checklist_nombre: string;
  area: string;
  fecha_ejecucion: string;
  fecha_finalizacion: string;
  estado: string;
  ejecutado_por: string;
  respuestas_ok: number;
  total_preguntas: number;
}

export interface DetalleEjecucion {
  info: {
    id_ejecucion: number;
    checklist_nombre: string;
    descripcion: string;
    area: string;
    ejecutado_por: string;
    fecha_ejecucion: string;
    fecha_finalizacion: string;
    estado: string;
  };
  respuestas: {
    pregunta: string;
    tipo_respuesta: string;
    respuesta: string;
    observaciones: string;
  }[];
}

@Injectable({
  providedIn: 'root'
})
export class EjecutarChecklistService {
  private apiUrl = 'http://localhost:3000/api/ejecutar-checklist';

  constructor(private http: HttpClient) { }

  private getHeaders() {
    const token = localStorage.getItem('token');
    return {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };
  }

  // Obtener checklists pendientes
  getChecklistsPendientes(): Observable<ChecklistPendiente[]> {
    return this.http.get<{ success: boolean; data: ChecklistPendiente[] }>(
      `${this.apiUrl}/pendientes`,
      this.getHeaders()
    ).pipe(
      map(response => response.data || []),
      catchError(error => {
        console.error('Error al cargar pendientes:', error);
        return of([]);
      })
    );
  }

  // Obtener checklist específico para ejecutar
  getChecklistParaEjecutar(idChecklist: number): Observable<ChecklistActivo | null> {
    return this.http.get<{ success: boolean; data: ChecklistActivo }>(
      `${this.apiUrl}/${idChecklist}`,
      this.getHeaders()
    ).pipe(
      map(response => response.data),
      catchError(error => {
        console.error('Error al cargar checklist:', error);
        return of(null);      })
    );
  }

  // Guardar respuesta
  guardarRespuesta(data: {
    id_ejecucion: number;
    id_pregunta: number;
    respuesta: string;
    observaciones: string;
  }): Observable<boolean> {
    return this.http.post<{ success: boolean }>(
      `${this.apiUrl}/respuesta`,
      data,
      this.getHeaders()
    ).pipe(
      map(response => response.success),
      catchError(error => {
        console.error('Error al guardar respuesta:', error);
        return of(false);
      })
    );
  }

  // Finalizar checklist
  finalizarChecklist(idEjecucion: number): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(
      `${this.apiUrl}/finalizar/${idEjecucion}`,
      {},
      this.getHeaders()
    ).pipe(
      catchError(error => {
        console.error('Error al finalizar:', error);
        return [{ success: false, message: error.error?.message || 'Error al finalizar' }];
      })
    );
  }

  // Obtener historial
  getHistorial(idChecklist?: number): Observable<HistorialEjecucion[]> {
    let url = `${this.apiUrl}/historial`;
    if (idChecklist) {
      url += `/${idChecklist}`;
    }

    return this.http.get<{ success: boolean; data: HistorialEjecucion[] }>(
      url,
      this.getHeaders()
    ).pipe(
      map(response => response.data || []),
      catchError(error => {
        console.error('Error al cargar historial:', error);
        return of([]);
      })
    );
  }

  // Obtener detalle de ejecución
  getDetalleEjecucion(idEjecucion: number): Observable<DetalleEjecucion | null> {
    return this.http.get<{ success: boolean; data: DetalleEjecucion }>(
      `${this.apiUrl}/detalle/${idEjecucion}`,
      this.getHeaders()
    ).pipe(
      map(response => response.data),
      catchError(error => {
        console.error('Error al cargar detalle:', error);
        return of(null);      })
    );
  }
}