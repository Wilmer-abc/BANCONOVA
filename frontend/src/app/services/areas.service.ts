import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, catchError, map, throwError } from 'rxjs';

export interface Area {
  id_area: number;
  nombre_area: string;
  descripcion: string;
}

export interface AreasResponse {
  success: boolean;
  data: Area[];
  message?: string;
}

export interface AreaResponse {
  success: boolean;
  data: Area;
  message?: string;
}

export interface DependenciasResponse {
  success: boolean;
data: {
  total_checklists: number;
  total_ejecuciones: number;
};

}

@Injectable({
  providedIn: 'root'
})
export class AreasService {
  
  private apiUrl = 'http://localhost:3000/api/areas';

  constructor(private http: HttpClient) { }

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    
    if (!token) {
      console.warn('⚠️ No hay token en localStorage');
    }
    
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  getAreas(): Observable<Area[]> {
    return this.http.get<AreasResponse>(this.apiUrl, { 
      headers: this.getHeaders() 
    }).pipe(
      map(response => {
        return response.data;
      }),
      catchError(this.handleError)
    );
  }

  getAreaById(id: number): Observable<Area | null> {
    return this.http.get<AreaResponse>(`${this.apiUrl}/${id}`, { 
      headers: this.getHeaders() 
    }).pipe(
      map(response => response.data),
      catchError(this.handleError)
    );
  }

  crearArea(area: Partial<Area>): Observable<Area> {
    return this.http.post<AreaResponse>(this.apiUrl, area, { 
      headers: this.getHeaders() 
    }).pipe(
      map(response => response.data),
      catchError(this.handleError)
    );
  }

  actualizarArea(id: number, area: Partial<Area>): Observable<Area> {
    return this.http.put<AreaResponse>(`${this.apiUrl}/${id}`, area, { 
      headers: this.getHeaders() 
    }).pipe(
      map(response => response.data),
      catchError(this.handleError)
    );
  }

  eliminarArea(id: number): Observable<boolean> {
    return this.http.delete<{success: boolean, message: string}>(`${this.apiUrl}/${id}`, { 
      headers: this.getHeaders() 
    }).pipe(
      map(response => {
        if (response.success) {
          return true;
        }
        throw new Error(response.message || 'Error al eliminar');
      }),
      catchError(this.handleError)
    );
  }

  verificarDependencias(id: number): Observable<{total_checklists: number, total_ejecuciones: number}> {
    return this.http.get<DependenciasResponse>(`${this.apiUrl}/check-dependencias/${id}`, { 
      headers: this.getHeaders() 
    }).pipe(
      map(response => response.data),
      catchError(this.handleError)
    );
  }

  private handleError(error: HttpErrorResponse) {
    console.error('❌ Error en la petición:', error);
    
    let errorMessage = 'Error desconocido';
    let status = error.status;
    
    if (error.error instanceof ErrorEvent) {
      // Error del lado del cliente
      errorMessage = `Error de conexión: ${error.error.message}`;
    } else {
      // Error del servidor
      switch (error.status) {
        case 0:
          errorMessage = 'No se pudo conectar con el servidor';
          break;
        case 401:
          errorMessage = 'Sesión expirada. Por favor, inicie sesión nuevamente.';
          break;
        case 403:
          errorMessage = 'No tiene permisos para realizar esta acción';
          break;
        case 404:
          errorMessage = 'Recurso no encontrado';
          break;
        case 500:
          errorMessage = 'Error interno del servidor';
          break;
        default:
          errorMessage = error.error?.message || `Error ${error.status}: ${error.message}`;
      }
    }
    
    return throwError(() => ({
      message: errorMessage,
      status: status,
      originalError: error
    }));
  }
}