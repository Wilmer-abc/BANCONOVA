import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, FormArray, FormControl } from '@angular/forms';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { EjecutarChecklistService, ChecklistPendiente, ChecklistActivo, PreguntaChecklist } from '../../services/ejecutar-checklist.service';

type RespuestaFormGroup = FormGroup<{
  id_pregunta: FormControl<number>;
  respuesta: FormControl<string>;
  observaciones: FormControl<string>;
}>;

type ChecklistFormGroup = FormGroup<{
  respuestas: FormArray<RespuestaFormGroup>;
}>;

@Component({
  selector: 'app-ejecutar-checklist',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule],
  templateUrl: './ejecutar-checklist.component.html',
  styleUrls: ['./ejecutar-checklist.component.css']
})
export class EjecutarChecklistComponent implements OnInit, OnDestroy {
  // Estados de la vista
  modoVista: 'lista' | 'ejecucion' | 'historial' | 'detalle' = 'lista';
  
  // Lista de checklists pendientes
  checklistsPendientes: ChecklistPendiente[] = [];
  
  // Checklist en ejecución
  checklistActivo: ChecklistActivo | null = null;
  formularioChecklist: ChecklistFormGroup;
  
  // Historial
  historial: any[] = [];
  detalleEjecucion: any = null;
  
  // Estados
  loading = false;
  error = '';
  guardando = false;
  preguntaActualIndex = 0;
  progreso = 0;
  
  // Temporizador
  tiempoInicio: Date = new Date();
  tiempoTranscurrido = '00:00';
  private intervalTimer: any;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private ejecutarChecklistService: EjecutarChecklistService
  ) {
    this.formularioChecklist = this.fb.nonNullable.group({
      respuestas: this.fb.nonNullable.array<RespuestaFormGroup>([])
    }) as ChecklistFormGroup;
  }

  ngOnInit() {
    // Verificar si hay parámetros en la ruta
    this.route.params.subscribe(params => {
      if (params['id']) {
        this.cargarChecklist(Number(params['id']));
      } else {
        this.cargarPendientes();
      }
    });

    this.route.queryParams.subscribe(queryParams => {
      if (queryParams['vista'] === 'historial') {
        this.modoVista = 'historial';
        this.cargarHistorial();
      }
    });
  }

  ngOnDestroy() {
    this.detenerTimer();
  }

  // ===========================================
  // MÉTODOS PARA CARGAR DATOS
  // ===========================================

  cargarPendientes() {
    this.loading = true;
    this.error = '';
    
    this.ejecutarChecklistService.getChecklistsPendientes().subscribe({
      next: (checklists) => {
        this.checklistsPendientes = checklists;
        this.loading = false;
        this.modoVista = 'lista';
      },
      error: (err) => {
        this.error = 'Error al cargar checklists pendientes';
        this.loading = false;
        console.error(err);
      }
    });
  }

  cargarChecklist(idChecklist: number) {
    this.loading = true;
    this.error = '';
    
    this.ejecutarChecklistService.getChecklistParaEjecutar(idChecklist).subscribe({
      next: (checklist) => {
        if (checklist) {
          this.checklistActivo = checklist;
          this.inicializarFormulario(checklist.preguntas);
          this.modoVista = 'ejecucion';
          this.iniciarTimer();
        } else {
          this.error = 'No se pudo cargar el checklist';
        }
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Error al cargar el checklist';
        this.loading = false;
        console.error(err);
      }
    });
  }

  cargarHistorial() {
    this.loading = true;
    this.ejecutarChecklistService.getHistorial().subscribe({
      next: (historial) => {
        this.historial = historial;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Error al cargar historial';
        this.loading = false;
      }
    });
  }

  cargarDetalleEjecucion(idEjecucion: number) {
    this.loading = true;
    this.ejecutarChecklistService.getDetalleEjecucion(idEjecucion).subscribe({
      next: (detalle) => {
        if (detalle) {
          this.detalleEjecucion = detalle;
          this.modoVista = 'detalle';
        }
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Error al cargar detalle';
        this.loading = false;
      }
    });
  }

  // ===========================================
  // MÉTODOS DEL FORMULARIO
  // ===========================================

  get respuestasArray(): FormArray<RespuestaFormGroup> {
    return this.formularioChecklist.controls.respuestas;
  }

  inicializarFormulario(preguntas: PreguntaChecklist[]) {
    const respuestasArray = this.fb.nonNullable.array<RespuestaFormGroup>([]);
    
    preguntas.forEach(pregunta => {
      respuestasArray.push(this.fb.nonNullable.group({
        id_pregunta: [pregunta.id_pregunta],
        respuesta: [pregunta.respuesta || ''],
        observaciones: [pregunta.observaciones || '']
      }) as RespuestaFormGroup);
    });
    
    this.formularioChecklist.setControl('respuestas', respuestasArray);
    this.actualizarProgreso();
  }

  getRespuestaControl(index: number, campo: string) {
    return this.respuestasArray.at(index).get(campo);
  }

  // ===========================================
  // MÉTODOS DE ACCIÓN
  // ===========================================

  iniciarChecklist(checklist: ChecklistPendiente) {
    this.router.navigate(['/dashboard/checklist/ejecutar', checklist.id_checklist]);
  }

  guardarRespuesta(index: number) {
    if (!this.checklistActivo) return;
    
    const respuestaGroup = this.respuestasArray.at(index);
    const respuesta = respuestaGroup.getRawValue();
    
    this.guardando = true;
    
    this.ejecutarChecklistService.guardarRespuesta({
      id_ejecucion: this.checklistActivo.idEjecucion,
      id_pregunta: respuesta.id_pregunta,
      respuesta: respuesta.respuesta,
      observaciones: respuesta.observaciones || ''
    }).subscribe({
      next: (exito) => {
        if (exito) {
          this.mostrarNotificacion('Respuesta guardada', 'success');
          this.actualizarProgreso();
        }
        this.guardando = false;
      },
      error: () => {
        this.mostrarNotificacion('Error al guardar', 'error');
        this.guardando = false;
      }
    });
  }

  siguientePregunta() {
    if (this.preguntaActualIndex < this.totalPreguntas - 1) {
      this.guardarRespuesta(this.preguntaActualIndex);
      this.preguntaActualIndex++;
    }
  }

  anteriorPregunta() {
    if (this.preguntaActualIndex > 0) {
      this.preguntaActualIndex--;
    }
  }

  finalizarChecklist() {
    if (!this.checklistActivo) return;
    
    // Guardar última respuesta
    this.guardarRespuesta(this.preguntaActualIndex);
    
    // Verificar que todas estén respondidas
    const respuestas = this.respuestasArray.getRawValue();
    const sinResponder = respuestas.filter((respuesta) => !respuesta.respuesta).length;
    
    if (sinResponder > 0) {
      if (!confirm(`Faltan ${sinResponder} preguntas por responder. ¿Estás seguro de finalizar?`)) {
        return;
      }
    }
    
    this.loading = true;
    
    this.ejecutarChecklistService.finalizarChecklist(this.checklistActivo.idEjecucion).subscribe({
      next: (response) => {
        if (response.success) {
          this.mostrarNotificacion('Checklist finalizado exitosamente', 'success');
          this.router.navigate(['/dashboard/checklist'], { 
            queryParams: { vista: 'historial' } 
          });
        } else {
          this.error = response.message;
        }
        this.loading = false;
      },
      error: (err) => {
        this.error = err.error?.message || 'Error al finalizar';
        this.loading = false;
      }
    });
  }

  verDetalle(idEjecucion: number) {
    this.cargarDetalleEjecucion(idEjecucion);
  }

  volverALista() {
    this.modoVista = 'lista';
    this.checklistActivo = null;
    this.cargarPendientes();
  }

  volverAHistorial() {
    this.modoVista = 'historial';
    this.detalleEjecucion = null;
    this.cargarHistorial();
  }

  // ===========================================
  // MÉTODOS DE UTILIDAD
  // ===========================================

  actualizarProgreso() {
    if (!this.checklistActivo) return;
    
    const respuestas = this.respuestasArray.getRawValue();
    const respondidas = respuestas.filter((respuesta) => respuesta.respuesta && String(respuesta.respuesta).trim() !== '').length;
    this.progreso = Math.round((respondidas / this.totalPreguntas) * 100);
  }

  get preguntaActual() {
    if (!this.checklistActivo) return null;
    return this.checklistActivo.preguntas[this.preguntaActualIndex];
  }

  get totalPreguntas(): number {
    return this.checklistActivo?.preguntas.length || 0;
  }

  iniciarTimer() {
    this.tiempoInicio = new Date();
    this.intervalTimer = setInterval(() => {
      const ahora = new Date();
      const diff = Math.floor((ahora.getTime() - this.tiempoInicio.getTime()) / 1000);
      const minutos = Math.floor(diff / 60);
      const segundos = diff % 60;
      this.tiempoTranscurrido = `${minutos.toString().padStart(2, '0')}:${segundos.toString().padStart(2, '0')}`;
    }, 1000);
  }

  detenerTimer() {
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
    }
  }

  mostrarNotificacion(mensaje: string, tipo: 'success' | 'error') {
    // Implementar según el sistema de notificaciones que uses
    console.log(`[${tipo}] ${mensaje}`);
  }

  getColorProgreso(): string {
    if (this.progreso < 30) return '#DC3545';
    if (this.progreso < 70) return '#FFC107';
    return '#28A745';
  }

  getEstadoBadgeClass(estado: string): string {
    switch(estado) {
      case 'completado': return 'badge-success';
      case 'en_progreso': return 'badge-warning';
      default: return 'badge-secondary';
    }
  }
}