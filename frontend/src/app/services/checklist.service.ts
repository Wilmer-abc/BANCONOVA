import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map, retry, switchMap, timeout } from 'rxjs/operators';
import { Checklist } from '../components/models/checklist.model';

@Injectable({
  providedIn: 'root'
})
export class ChecklistService {
  private apiUrl = 'http://localhost:3000/api/checklist';
  private readonly TIMEOUT = 10000;
  
  private httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    })
  };

  constructor(private http: HttpClient) { 
    console.log('ChecklistService inicializado');
  }

  /**
   * Obtener todos los checklists
   */
  getChecklists(): Observable<Checklist[]> {
    return this.http.get<Checklist[]>(this.apiUrl, this.httpOptions)
      .pipe(
        timeout(this.TIMEOUT),
        retry(2),
        map(response => this.sortChecklistsByDate(response)),
        catchError(this.handleError)
      );
  }

  /**
   * Obtener un checklist por su ID
   */
  getChecklistById(id: number): Observable<Checklist> {
    return this.http.get<Checklist>(`${this.apiUrl}/${id}`, this.httpOptions)
      .pipe(
        timeout(this.TIMEOUT),
        retry(1),
        catchError(this.handleError)
      );
  }

  /**
   * Crear un nuevo checklist
   */
  createChecklist(checklist: any): Observable<Checklist> {
    // Para creación, necesitamos validar TODOS los campos
    if (!this.validateCreateData(checklist)) {
      return throwError(() => new Error('Datos del checklist inválidos'));
    }

    const checklistToSend = {
      nombre: checklist.nombre,
      descripcion: checklist.descripcion || '',
      id_area: Number(checklist.id_area),
      creado_por: Number(localStorage.getItem('userId')) || 1, // Obtener del token/localStorage
      preguntas: checklist.preguntas || []
    };

    console.log('Enviando checklist (creación):', checklistToSend);

    return this.http.post<Checklist>(this.apiUrl, checklistToSend, this.httpOptions)
      .pipe(
        timeout(this.TIMEOUT),
        catchError(this.handleError)
      );
  }

  /**
   * Actualizar un checklist existente
   */
  updateChecklist(id: number, checklist: any): Observable<Checklist> {
    if (!id) {
      return throwError(() => new Error('ID de checklist no proporcionado'));
    }

    // Para actualización, NO necesitamos validar creado_por
    if (!this.validateUpdateData(checklist)) {
      return throwError(() => new Error('Datos del checklist inválidos'));
    }

    const checklistToSend = {
      nombre: checklist.nombre,
      descripcion: checklist.descripcion || '',
      id_area: Number(checklist.id_area),
      preguntas: checklist.preguntas || []
    };

    console.log('Enviando checklist (actualización):', checklistToSend);

    return this.http.put<Checklist>(`${this.apiUrl}/${id}`, checklistToSend, this.httpOptions)
      .pipe(
        timeout(this.TIMEOUT),
        catchError(this.handleError)
      );
  }

  /**
   * Eliminar un checklist
   */
  deleteChecklist(id: number): Observable<any> {
    if (!id) {
      return throwError(() => new Error('ID de checklist no proporcionado'));
    }

    return this.http.delete(`${this.apiUrl}/${id}`, this.httpOptions)
      .pipe(
        timeout(this.TIMEOUT),
        catchError(this.handleError)
      );
  }

  /**
   * Obtener checklists por área
   */
  getChecklistsByArea(idArea: number): Observable<Checklist[]> {
    if (!idArea) {
      return throwError(() => new Error('ID de área no proporcionado'));
    }

    return this.http.get<Checklist[]>(`${this.apiUrl}/area/${idArea}`, this.httpOptions)
      .pipe(
        timeout(this.TIMEOUT),
        map(response => this.sortChecklistsByDate(response)),
        catchError(this.handleError)
      );
  }

  /**
   * Validar datos para CREACIÓN
   */
  private validateCreateData(checklist: any): boolean {
    if (!checklist) return false;
    
    // Validar nombre
    if (!checklist.nombre || checklist.nombre.trim() === '') {
      console.error('Error: El nombre del checklist es requerido');
      return false;
    }

    if (checklist.nombre.length > 150) {
      console.error('Error: El nombre no puede exceder los 150 caracteres');
      return false;
    }

    // Validar área
    if (checklist.id_area === undefined || 
        checklist.id_area === null || 
        isNaN(Number(checklist.id_area)) || 
        Number(checklist.id_area) <= 0) {
      console.error('Error: El área es requerida', checklist.id_area);
      return false;
    }

    // Validar preguntas (si vienen)
    if (checklist.preguntas !== undefined && checklist.preguntas !== null) {
      if (!Array.isArray(checklist.preguntas)) {
        console.error('Error: Las preguntas deben ser un array');
        return false;
      }

      for (let i = 0; i < checklist.preguntas.length; i++) {
        const p = checklist.preguntas[i];
        if (!p.pregunta || p.pregunta.trim() === '') {
          console.error(`Error: La pregunta #${i + 1} no puede estar vacía`);
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Validar datos para ACTUALIZACIÓN (sin requerir creado_por)
   */
  private validateUpdateData(checklist: any): boolean {
    if (!checklist) return false;
    
    // Validar nombre
    if (!checklist.nombre || checklist.nombre.trim() === '') {
      console.error('Error: El nombre del checklist es requerido');
      return false;
    }

    if (checklist.nombre.length > 150) {
      console.error('Error: El nombre no puede exceder los 150 caracteres');
      return false;
    }

    // Validar área
    if (checklist.id_area === undefined || 
        checklist.id_area === null || 
        isNaN(Number(checklist.id_area)) || 
        Number(checklist.id_area) <= 0) {
      console.error('Error: El área es requerida', checklist.id_area);
      return false;
    }

    // Validar preguntas (si vienen)
    if (checklist.preguntas !== undefined && checklist.preguntas !== null) {
      if (!Array.isArray(checklist.preguntas)) {
        console.error('Error: Las preguntas deben ser un array');
        return false;
      }

      for (let i = 0; i < checklist.preguntas.length; i++) {
        const p = checklist.preguntas[i];
        if (!p.pregunta || p.pregunta.trim() === '') {
          console.error(`Error: La pregunta #${i + 1} no puede estar vacía`);
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Ordenar checklists por fecha
   */
  private sortChecklistsByDate(checklists: Checklist[]): Checklist[] {
    return checklists.sort((a, b) => {
      const dateA = a.fecha_creacion ? new Date(a.fecha_creacion).getTime() : 0;
      const dateB = b.fecha_creacion ? new Date(b.fecha_creacion).getTime() : 0;
      return dateB - dateA;
    });
  }

  /**
   * Manejo centralizado de errores
   */
  private handleError(error: any): Observable<never> {
    let errorMessage = 'Error desconocido';

    if (error.error instanceof ErrorEvent) {
      errorMessage = `Error: ${error.error.message}`;
      console.error('Error del cliente:', error.error.message);
    } else {
      errorMessage = error.error?.message || `Código: ${error.status}`;
      console.error('Error del servidor:', error);
    }

    console.error('Error completo:', error);
    return throwError(() => new Error(errorMessage));
  }

  /**
   * Buscar checklists por nombre
   */
  searchChecklists(termino: string): Observable<Checklist[]> {
    const params = new HttpParams().set('search', termino);
    
    return this.http.get<Checklist[]>(`${this.apiUrl}/search`, { 
      ...this.httpOptions, 
      params 
    }).pipe(
      timeout(this.TIMEOUT),
      catchError(this.handleError)
    );
  }

  /**
   * Obtener checklists recientes
   */
  getRecentChecklists(limite: number = 5): Observable<Checklist[]> {
    return this.getChecklists().pipe(
      map(checklists => checklists.slice(0, limite))
    );
  }

  /**
   * Verificar si existe un checklist con el mismo nombre en un área
   */
  checkDuplicateName(nombre: string, idArea: number): Observable<boolean> {
    return this.getChecklistsByArea(idArea).pipe(
      map(checklists => checklists.some(c => 
        c.nombre.toLowerCase().trim() === nombre.toLowerCase().trim()
      )),
      catchError(this.handleError)
    );
  }

  /**
   * Obtener estadísticas de checklists
   */
  getChecklistStats(): Observable<any> {
    return this.getChecklists().pipe(
      map(checklists => {
        const stats = {
          total: checklists.length,
          porArea: new Map(),
          conDescripcion: 0,
          sinDescripcion: 0
        };

        checklists.forEach(checklist => {
          const areaId = checklist.id_area;
          stats.porArea.set(areaId, (stats.porArea.get(areaId) || 0) + 1);

          if (checklist.descripcion && checklist.descripcion.trim() !== '') {
            stats.conDescripcion++;
          } else {
            stats.sinDescripcion++;
          }
        });

        return stats;
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Exportar checklists a JSON
   */
  exportToJSON(): Observable<string> {
    return this.getChecklists().pipe(
      map(checklists => JSON.stringify(checklists, null, 2)),
      catchError(this.handleError)
    );
  }

  /**
   * Clonar un checklist existente
   */
  cloneChecklist(id: number, nuevoNombre: string): Observable<Checklist> {
    return this.getChecklistById(id).pipe(
      map(checklist => {
        const clonedChecklist: any = {
          nombre: nuevoNombre,
          descripcion: checklist.descripcion,
          id_area: checklist.id_area,
          preguntas: checklist.preguntas?.map(p => ({
            pregunta: p.pregunta,
            tipo_respuesta: p.tipo_respuesta,
            opciones: p.opciones,
            requiere_observacion: p.requiere_observacion
          })) || []
        };
        return clonedChecklist;
      }),
      switchMap(cloned => this.createChecklist(cloned)),
      catchError(this.handleError)
    );
  }
}