import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { isPlatformBrowser } from '@angular/common';
import { Observable } from 'rxjs';
import { timeout } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object  // Para SSR
  ) {}

  /**
   * Login de usuario
   */
login(data: any): Observable<any> {
  return this.http
    .post(`${environment.baseUrl}/auth/login`, data)
    .pipe(timeout(10000));
}

  /**
   * Guardar token en localStorage
   */
  guardarToken(token: string): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('token', token);
      console.log('Token guardado correctamente');
    }
  }

  /**
   * Obtener token de localStorage
   */
// En auth.service.ts - ya está correcto ✅
obtenerToken(): string | null {
  if (isPlatformBrowser(this.platformId)) {
    return localStorage.getItem('token');
  }
  return null;
}

  /**
   * Verificar si el usuario está autenticado
   */
  estaAutenticado(): boolean {
    if (isPlatformBrowser(this.platformId)) {
      const token = localStorage.getItem('token');
      return !!token; // Retorna true si existe token
    }
    return false;
  }

  /**
   * Cerrar sesión (alias de logout para mantener consistencia)
   */
  cerrarSesion(): void {
    this.logout();
  }

  /**
   * Cerrar sesión - elimina token y limpia datos
   */
  logout(): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('token');
      localStorage.removeItem('rememberedEmail'); // Limpiar email guardado
      sessionStorage.clear(); // Limpiar sessionStorage
      console.log('Sesión cerrada correctamente');
    }
  }

  /**
   * Obtener datos del usuario desde el token
   */
  obtenerUsuarioDesdeToken(): any {
    const token = this.obtenerToken();
    if (!token) return null;

    try {
      // Decodificar token JWT (parte del payload)
      const payload = JSON.parse(atob(token.split('.')[1]));
      return {
        id: payload.id,
        nombre: payload.nombre || 'Usuario',
        correo: payload.correo || '',
        rol: payload.rol || 'usuario'
      };
    } catch (error) {
      console.error('Error al decodificar token:', error);
      return null;
    }
  }
}