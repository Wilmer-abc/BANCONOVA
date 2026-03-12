import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormArray, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ChecklistService } from '../../services/checklist.service';
import { AreasService } from '../../services/areas.service';  
import { Checklist } from '../models/checklist.model'; 
import { Area } from '../../services/areas.service'; 
import Swal from 'sweetalert2';

export interface Pregunta {
  id_pregunta?: number;
  pregunta: string;
  tipo_respuesta: 'si_no' | 'texto' | 'numerico' | 'opcion_multiple' | 'fecha';
  opciones?: string[] | null;
  requiere_observacion: boolean;
  orden?: number;
}

@Component({
  selector: 'app-checklist',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './checklist.component.html',
  styleUrls: ['./checklist.component.css']
})
export class ChecklistComponent implements OnInit {
  checklists: Checklist[] = [];
  areas: Area[] = [];
  checklistForm: FormGroup;
  isEditing = false;
  selectedChecklist: Checklist | null = null;
  loading = false;
  showModal = false;

  constructor(
    private fb: FormBuilder,
    private checklistService: ChecklistService,
    private areaService: AreasService
  ) {
    this.checklistForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.maxLength(150)]],
      descripcion: [''],
      id_area: [null, Validators.required],
      creado_por: [1], // Aquí deberías poner el ID del usuario logueado
      preguntas: this.fb.array([])
    });
  }

  ngOnInit(): void {
    this.loadChecklists();
    this.loadAreas();
  }

  // Getter para el FormArray de preguntas
  get preguntasArray(): FormArray {
    return this.checklistForm.get('preguntas') as FormArray;
  }

  // Crear una nueva pregunta FormGroup
  private crearPreguntaFormGroup(pregunta?: Pregunta): FormGroup {
    return this.fb.group({
      id_pregunta: [pregunta?.id_pregunta || null],
      pregunta: [pregunta?.pregunta || '', Validators.required],
      tipo_respuesta: [pregunta?.tipo_respuesta || 'si_no'],
      opciones: [pregunta?.opciones?.join(', ') || ''],
      requiere_observacion: [pregunta?.requiere_observacion || false]
    });
  }

  // Agregar una nueva pregunta al formulario
  agregarPregunta(pregunta?: Pregunta): void {
    this.preguntasArray.push(this.crearPreguntaFormGroup(pregunta));
  }

  // Eliminar una pregunta del formulario
  eliminarPregunta(index: number): void {
    this.preguntasArray.removeAt(index);
  }

  // Cargar todos los checklists
  loadChecklists(): void {
    this.loading = true;
    this.checklistService.getChecklists().subscribe({
      next: (data) => {
        this.checklists = data;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error al cargar checklists:', error);
        this.loading = false;
        this.showError('Error al cargar los checklists');
      }
    });
  }

  // Cargar áreas disponibles
  loadAreas(): void {
    this.areaService.getAreas().subscribe({
      next: (data) => {
        this.areas = data;
        console.log('Áreas cargadas:', this.areas);
      },
      error: (error) => {
        console.error('Error al cargar áreas:', error);
      }
    });
  }

  // Abrir modal para crear nuevo checklist
  openCreateModal(): void {
    console.log('Abriendo modal de creación');
    this.isEditing = false;
    this.selectedChecklist = null;
    
    // Limpiar formulario
    this.checklistForm.reset({
      nombre: '',
      descripcion: '',
      id_area: null,
      creado_por: 1
    });
    
    // Limpiar preguntas
    while (this.preguntasArray.length) {
      this.preguntasArray.removeAt(0);
    }
    
    // Agregar una pregunta por defecto
    this.agregarPregunta();
    
    this.showModal = true;
  }

  // Abrir modal para editar checklist
  openEditModal(checklist: Checklist): void {
    console.log('Editando checklist:', checklist);
    this.isEditing = true;
    this.selectedChecklist = checklist;
    
    // Cargar datos básicos
    this.checklistForm.patchValue({
      nombre: checklist.nombre,
      descripcion: checklist.descripcion || '',
      id_area: checklist.id_area,
      creado_por: checklist.creado_por || 1
    });

    // Cargar preguntas
    while (this.preguntasArray.length) {
      this.preguntasArray.removeAt(0);
    }

    if (Array.isArray(checklist.preguntas) && checklist.preguntas.length > 0) {
      checklist.preguntas.forEach(pregunta => {
        this.agregarPregunta(pregunta);
      });
    } else {
      // Si no hay preguntas, agregar una por defecto
      this.agregarPregunta();
    }
    
    this.showModal = true;
  }

  // Cerrar modal
  closeModal(): void {
    this.showModal = false;
    this.checklistForm.reset();
    while (this.preguntasArray.length) {
      this.preguntasArray.removeAt(0);
    }
    this.isEditing = false;
    this.selectedChecklist = null;
  }

  // Procesar preguntas antes de enviar
  private procesarPreguntas(): any[] {
    const preguntas = this.preguntasArray.value;
    return preguntas.map((p: any, index: number) => {
      // Procesar opciones si es opción múltiple
      let opciones = null;
      if (p.tipo_respuesta === 'opcion_multiple' && p.opciones) {
        opciones = p.opciones.split(',').map((o: string) => o.trim());
      }

      return {
        id_pregunta: p.id_pregunta,
        pregunta: p.pregunta,
        tipo_respuesta: p.tipo_respuesta,
        opciones: opciones,
        requiere_observacion: p.requiere_observacion,
        orden: index + 1
      };
    });
  }

  // Guardar checklist (crear o actualizar)
  saveChecklist(): void {
    // Verificar que haya al menos una pregunta
    if (this.preguntasArray.length === 0) {
      this.showError('Debe agregar al menos una pregunta');
      return;
    }

    // Verificar que todas las preguntas tengan texto
    for (let i = 0; i < this.preguntasArray.length; i++) {
      const preguntaControl = this.preguntasArray.at(i).get('pregunta');
      if (!preguntaControl?.value || preguntaControl.value.trim() === '') {
        this.showError(`La pregunta #${i + 1} no puede estar vacía`);
        return;
      }
    }

    // Obtener los valores del formulario
    const formValues = this.checklistForm.value;
    
    if (!formValues.id_area) {
      this.showError('Debe seleccionar un área');
      return;
    }
    
    console.log('Valores del formulario:', formValues);
    
    const idArea = Number(formValues.id_area);
    const creadoPor = Number(formValues.creado_por) || 1;
    
    // Procesar preguntas
    const preguntasProcesadas = this.procesarPreguntas();
    
  // En el método saveChecklist()
  const checklistData = {
    nombre: this.checklistForm.value.nombre,
    descripcion: this.checklistForm.value.descripcion,
    id_area: this.checklistForm.value.id_area,
    preguntas: this.preguntasArray.value.map((p: any, index: number) => ({
      pregunta: p.pregunta,
      tipo_respuesta: p.tipo_respuesta,
      opciones: p.tipo_respuesta === 'opcion_multiple' && p.opciones 
        ? p.opciones.split(',').map((o: string) => o.trim()) 
        : null,
      requiere_observacion: p.requiere_observacion || false,
      orden: index + 1
    }))
  };

    console.log('Datos a enviar al servicio:', checklistData);
    this.loading = true;

    if (this.isEditing && this.selectedChecklist) {
      // Actualizar
      this.checklistService.updateChecklist(this.selectedChecklist.id_checklist!, checklistData as any).subscribe({
        next: () => {
          this.loading = false;
          this.showSuccess('Checklist actualizado correctamente');
          this.loadChecklists();
          this.closeModal();
        },
        error: (error) => {
          this.loading = false;
          console.error('Error al actualizar:', error);
          this.showError('Error al actualizar el checklist: ' + error.message);
        }
      });
    } else {
      // Crear nuevo
      this.checklistService.createChecklist(checklistData as any).subscribe({
        next: () => {
          this.loading = false;
          this.showSuccess('Checklist creado correctamente');
          this.loadChecklists();
          this.closeModal();
        },
        error: (error) => {
          this.loading = false;
          console.error('Error al crear:', error);
          this.showError('Error al crear el checklist: ' + error.message);
        }
      });
    }
  }

  // Eliminar checklist
  deleteChecklist(id: number): void {
    Swal.fire({
      title: '¿Estás seguro?',
      text: 'Esta acción no se puede revertir',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.loading = true;
        this.checklistService.deleteChecklist(id).subscribe({
          next: () => {
            this.loading = false;
            this.showSuccess('Checklist eliminado correctamente');
            this.loadChecklists();
          },
          error: (error) => {
            this.loading = false;
            console.error('Error al eliminar:', error);
            this.showError('Error al eliminar el checklist');
          }
        });
      }
    });
  }

  // Obtener nombre del área por ID
  getAreaName(idArea: number): string {
    const area = this.areas.find(a => a.id_area === idArea);
    return area ? area.nombre_area : 'Área no encontrada';
  }

  // Mostrar mensaje de éxito
  showSuccess(message: string): void {
    Swal.fire({
      icon: 'success',
      title: '¡Éxito!',
      text: message,
      timer: 3000,
      showConfirmButton: false
    });
  }

  // Mostrar mensaje de error
  showError(message: string): void {
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: message
    });
  }

  // Validaciones del formulario
  get nombre() { return this.checklistForm.get('nombre'); }
  get id_area() { return this.checklistForm.get('id_area'); }
}