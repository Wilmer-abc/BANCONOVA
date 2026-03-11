import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map, retry, switchMap, timeout } from 'rxjs/operators';
import { Checklist } from '../components/models/checklist.model';

@Injectable({
  providedIn: 'root'
})
export class ChecklistService {
  // URL base de la API - ajusta según tu configuración
  private apiUrl = 'http://localhost:3000/api/checklist';
  
  // Timeout para las peticiones (10 segundos)
  private readonly TIMEOUT = 10000;
  
  // Headers por defecto
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
   * @returns Observable con array de checklists
   */
  getChecklists(): Observable<Checklist[]> {
    return this.http.get<Checklist[]>(this.apiUrl, this.httpOptions)
      .pipe(
        timeout(this.TIMEOUT),
        retry(2), // Reintentar 2 veces si falla
        map(response => this.sortChecklistsByDate(response)),
        catchError(this.handleError)
      );
  }

  /**
   * Obtener un checklist por su ID
   * @param id ID del checklist
   * @returns Observable con el checklist encontrado
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
   * @param checklist Datos del checklist a crear
   * @returns Observable con el checklist creado
   */
createChecklist(checklist: Checklist): Observable<Checklist> {
  // Asegurar que los valores numéricos sean realmente números
  const checklistToSend = {
    nombre: checklist.nombre,
    descripcion: checklist.descripcion || '',
    id_area: Number(checklist.id_area),
    creado_por: Number(checklist.creado_por) || 1
  };

  console.log('Validando checklist:', checklistToSend); // Para depuración

  // Validar datos antes de enviar
  if (!this.validateChecklistData(checklistToSend)) {
    return throwError(() => new Error('Datos del checklist inválidos'));
  }

  return this.http.post<Checklist>(this.apiUrl, checklistToSend, this.httpOptions)
    .pipe(
      timeout(this.TIMEOUT),
      catchError(this.handleError)
    );
}

  /**
   * Actualizar un checklist existente
   * @param id ID del checklist a actualizar
   * @param checklist Datos actualizados
   * @returns Observable con el checklist actualizado
   */
  updateChecklist(id: number, checklist: Checklist): Observable<Checklist> {
    if (!id) {
      return throwError(() => new Error('ID de checklist no proporcionado'));
    }

    if (!this.validateChecklistData(checklist)) {
      return throwError(() => new Error('Datos del checklist inválidos'));
    }

    return this.http.put<Checklist>(`${this.apiUrl}/${id}`, checklist, this.httpOptions)
      .pipe(
        timeout(this.TIMEOUT),
        catchError(this.handleError)
      );
  }

  /**
   * Eliminar un checklist
   * @param id ID del checklist a eliminar
   * @returns Observable con la respuesta
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
   * @param idArea ID del área
   * @returns Observable con array de checklists del área
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
   * Buscar checklists por nombre
   * @param termino Término de búsqueda
   * @returns Observable con array de checklists que coinciden
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
   * @param limite Número máximo de checklists a obtener
   * @returns Observable con array de checklists recientes
   */
  getRecentChecklists(limite: number = 5): Observable<Checklist[]> {
    return this.getChecklists().pipe(
      map(checklists => checklists.slice(0, limite))
    );
  }

  /**
   * Verificar si existe un checklist con el mismo nombre en un área
   * @param nombre Nombre del checklist
   * @param idArea ID del área
   * @returns Observable con boolean indicando si existe
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
   * @returns Observable con objeto de estadísticas
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
          // Contar por área
          const areaId = checklist.id_area;
          stats.porArea.set(areaId, (stats.porArea.get(areaId) || 0) + 1);

          // Contar con/sin descripción
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
   * @returns Observable con string JSON
   */
  exportToJSON(): Observable<string> {
    return this.getChecklists().pipe(
      map(checklists => JSON.stringify(checklists, null, 2)),
      catchError(this.handleError)
    );
  }

  /**
   * Clonar un checklist existente
   * @param id ID del checklist a clonar
   * @param nuevoNombre Nuevo nombre para el checklist clonado
   * @returns Observable con el nuevo checklist creado
   */
  cloneChecklist(id: number, nuevoNombre: string): Observable<Checklist> {
    return this.getChecklistById(id).pipe(
      map(checklist => {
        const clonedChecklist: Checklist = {
          ...checklist,
          nombre: nuevoNombre,
          id_checklist: undefined,
          fecha_creacion: undefined
        };
        return clonedChecklist;
      }),
      switchMap(cloned => this.createChecklist(cloned)),
      catchError(this.handleError)
    );
  }

  /**
   * Ordenar checklists por fecha (más reciente primero)
   * @param checklists Array de checklists
   * @returns Array ordenado
   */
  private sortChecklistsByDate(checklists: Checklist[]): Checklist[] {
    return checklists.sort((a, b) => {
      const dateA = a.fecha_creacion ? new Date(a.fecha_creacion).getTime() : 0;
      const dateB = b.fecha_creacion ? new Date(b.fecha_creacion).getTime() : 0;
      return dateB - dateA;
    });
  }

  /**
   * Validar datos del checklist antes de enviar
   * @param checklist Datos a validar
   * @returns true si es válido, false si no
   */
// checklist.service.ts - Actualizar el método validateChecklistData

private validateChecklistData(checklist: Checklist): boolean {
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

  // Validar área - MEJORADA
  if (checklist.id_area === undefined || 
      checklist.id_area === null || 
      isNaN(Number(checklist.id_area)) || 
      Number(checklist.id_area) <= 0) {
    console.error('Error: El área es requerida y debe ser un número válido', checklist.id_area);
    return false;
  }

  // Validar creador - MEJORADA
  if (checklist.creado_por === undefined || 
      checklist.creado_por === null || 
      isNaN(Number(checklist.creado_por)) || 
      Number(checklist.creado_por) <= 0) {
    console.error('Error: El usuario creador es requerido', checklist.creado_por);
    return false;
  }

  return true;
}

  /**
   * Manejo centralizado de errores
   * @param error Error ocurrido
   * @returns Observable con error
   */
  private handleError(error: any): Observable<never> {
    let errorMessage = 'Error desconocido';

    if (error.error instanceof ErrorEvent) {
      // Error del lado del cliente
      errorMessage = `Error: ${error.error.message}`;
      console.error('Error del cliente:', error.error.message);
    } else {
      // Error del servidor
      errorMessage = `Código: ${error.status}\nMensaje: ${error.message}`;
      console.error(
        `Error del servidor: ${error.status}`,
        error.error
      );
    }

    // Registrar error en consola
    console.error('Error completo:', error);

    // Retornar observable con error
    return throwError(() => new Error(errorMessage));
  }

  /**
   * Configurar headers personalizados
   * @param customHeaders Headers adicionales
   */
  setCustomHeaders(customHeaders: HttpHeaders): void {
    this.httpOptions = {
      ...this.httpOptions,
      headers: this.httpOptions.headers.keys().reduce((headers, key) => {
        return headers.set(key, this.httpOptions.headers.get(key) || '');
      }, customHeaders)
    };
  }

  /**
   * Cambiar la URL base de la API
   * @param newUrl Nueva URL base
   */
  setApiUrl(newUrl: string): void {
    if (newUrl && newUrl.trim() !== '') {
      this.apiUrl = newUrl;
      console.log('API URL actualizada a:', this.apiUrl);
    }
  }

  /**
   * Obtener la URL base actual
   */
  getApiUrl(): string {
    return this.apiUrl;
  }

  /**
   * Limpiar cache de checklists (si usaras cache)
   */
  clearCache(): void {
    // Implementar si usas alguna estrategia de cache
    console.log('Cache limpiado');
  }
}