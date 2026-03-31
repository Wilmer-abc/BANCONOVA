import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Formulario {
  id_formulario?: number;
  nombre: string;
  descripcion: string;
  creado_por?: number;
  fecha_creacion?: Date;
  creador_nombre?: string;
  preguntas?: Pregunta[];
}

export interface Pregunta {
  id_pregunta?: number;
  id_formulario?: number;
  texto: string;
  tipo: string;
}

export interface Respuesta {
  id_respuesta?: number;
  id_pregunta: number;
  id_usuario?: number;
  respuesta: string;
  fecha?: Date;
  usuario_nombre?: string;
  pregunta?: string;
  tipo_respuesta?: string;
}

@Injectable({
  providedIn: 'root'
})
export class FormularioService {
  private apiUrl = `${environment.baseUrl}/api/formulario/formularios`;

  constructor(private http: HttpClient) { }

  // Obtener todos los formularios
  getFormularios(): Observable<any> {
    return this.http.get(this.apiUrl);
  }

  // Obtener un formulario por ID
  getFormulario(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/${id}`);
  }

  // Crear nuevo formulario
  crearFormulario(formulario: Formulario): Observable<any> {
    return this.http.post(this.apiUrl, formulario);
  }

  // Actualizar formulario
  actualizarFormulario(id: number, formulario: Formulario): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, formulario);
  }

  // Eliminar formulario
  eliminarFormulario(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  // Guardar respuestas
  guardarRespuestas(idFormulario: number, respuestas: any[]): Observable<any> {
    return this.http.post(`${this.apiUrl}/${idFormulario}/respuestas`, { respuestas });
  }

  // Obtener respuestas de un formulario
  getRespuestas(idFormulario: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/${idFormulario}/respuestas`);
  }

  // Verificar si el usuario ya respondió
  verificarRespuesta(idFormulario: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/${idFormulario}/verificar-respuesta`);
  }
}