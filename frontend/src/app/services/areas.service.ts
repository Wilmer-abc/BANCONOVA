import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http'; // Añade HttpHeaders
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
    total_usuarios: number;
    total_ejecuciones: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class AreasService {
  
  private apiUrl = 'http://localhost:3000/api/areas';

  constructor(private http: HttpClient) { }

  /**
   * Obtener headers con token de autenticación
   */
private getHeaders(): HttpHeaders {
  const token = localStorage.getItem('token');
  
  // Depuración - muestra los primeros y últimos caracteres del token
  if (token) {
    console.log('Token completo (primeros 20 chars):', token.substring(0, 20) + '...');
    console.log('Token longitud:', token.length);
    console.log('Token formato:', token.includes('.') ? 'JWT válido' : 'Formato incorrecto');
  } else {
    console.log('❌ No hay token en localStorage');
  }
  
  return new HttpHeaders({
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  });
}

  /**
   * Obtener todas las áreas
   */
  getAreas(): Observable<Area[]> {
    console.log('Enviando petición a:', this.apiUrl);
    
    return this.http.get<AreasResponse>(this.apiUrl, { 
      headers: this.getHeaders() 
    }).pipe(
      map(response => {
        console.log('✅ Respuesta del servidor:', response);
        return response.data;
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Obtener un área por ID
   */
  getAreaById(id: number): Observable<Area | null> {
    return this.http.get<AreaResponse>(`${this.apiUrl}/${id}`, { 
      headers: this.getHeaders() 
    }).pipe(
      map(response => response.data),
      catchError(this.handleError)
    );
  }

  /**
   * Crear una nueva área
   */
  crearArea(area: Partial<Area>): Observable<Area> {
    return this.http.post<AreaResponse>(this.apiUrl, area, { 
      headers: this.getHeaders() 
    }).pipe(
      map(response => response.data),
      catchError(this.handleError)
    );
  }

  /**
   * Actualizar un área existente
   */
  actualizarArea(id: number, area: Partial<Area>): Observable<Area> {
    return this.http.put<AreaResponse>(`${this.apiUrl}/${id}`, area, { 
      headers: this.getHeaders() 
    }).pipe(
      map(response => response.data),
      catchError(this.handleError)
    );
  }

  /**
   * Eliminar un área
   */
  eliminarArea(id: number): Observable<boolean> {
    return this.http.delete<{success: boolean, message: string}>(`${this.apiUrl}/${id}`, { 
      headers: this.getHeaders() 
    }).pipe(
      map(response => response.success),
      catchError(this.handleError)
    );
  }

  /**
   * Verificar si un área tiene dependencias
   */
  verificarDependencias(id: number): Observable<{total_checklists: number, total_usuarios: number, total_ejecuciones: number}> {
    return this.http.get<DependenciasResponse>(`${this.apiUrl}/check-dependencias/${id}`, { 
      headers: this.getHeaders() 
    }).pipe(
      map(response => response.data),
      catchError(this.handleError)
    );
  }

  /**
   * Manejo de errores
   */
  private handleError(error: HttpErrorResponse) {
    console.error('❌ Error en la petición:', error);
    
    let errorMessage = 'Error desconocido';
    
    if (error.error instanceof ErrorEvent) {
      // Error del lado del cliente
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Error del servidor
      if (error.status === 401) {
        errorMessage = 'Sesión expirada o no autorizada. Por favor, inicie sesión nuevamente.';
        // Opcional: Redirigir al login
        // window.location.href = '/login';
      } else {
        errorMessage = error.error?.message || `Código: ${error.status}, Mensaje: ${error.message}`;
      }
    }
    
    console.error('📝 Mensaje de error:', errorMessage);
    
    return throwError(() => ({
      message: errorMessage,
      status: error.status,
      originalError: error
    }));
  }
}