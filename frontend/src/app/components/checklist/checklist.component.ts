import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ChecklistService } from '../../services/checklist.service';
import { AreasService } from '../../services/areas.service';  
import { Checklist } from '../models/checklist.model'; 
import { Area } from '../../services/areas.service'; 
import Swal from 'sweetalert2';


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
      creado_por: [1] // Aquí deberías poner el ID del usuario logueado
    });
  }

  ngOnInit(): void {
    this.loadChecklists();
    this.loadAreas();
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
      console.log('Áreas cargadas:', this.areas); // Verifica que cada área tenga id_area
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
    this.checklistForm.reset({
      nombre: '',
      descripcion: '',
      id_area: null, // Importante: iniciar como null
      creado_por: 1
    });
    this.showModal = true;
  }

  // Abrir modal para editar checklist
  openEditModal(checklist: Checklist): void {
    console.log('Editando checklist:', checklist);
    this.isEditing = true;
    this.selectedChecklist = checklist;
    this.checklistForm.patchValue({
      nombre: checklist.nombre,
      descripcion: checklist.descripcion || '',
      id_area: checklist.id_area, // Esto ya debería ser número
      creado_por: checklist.creado_por || 1
    });
    this.showModal = true;
  }
  // Cerrar modal
  closeModal(): void {
    this.showModal = false;
    this.checklistForm.reset();
    this.isEditing = false;
    this.selectedChecklist = null;
  }

  // Guardar checklist (crear o actualizar)
  saveChecklist(): void {
  // Obtener los valores del formulario
  const formValues = this.checklistForm.value;
  
  if (!formValues.id_area) {
    this.showError('Debe seleccionar un área');
    return;
  }
  
  console.log('Valores del formulario:', formValues); // Para depuración
  console.log('Tipo de id_area:', typeof formValues.id_area, 'Valor:', formValues.id_area);
  
  // Convertir a número asegurando que sea válido
  const idArea = formValues.id_area;
  console.log('idArea después de conversión:', idArea, 'es válido?', !isNaN(idArea) && idArea > 0);
  
  const checklistData: Checklist = {
    nombre: formValues.nombre,
    descripcion: formValues.descripcion || '',
    id_area: idArea,
    creado_por: Number(formValues.creado_por) || 1
  };

  console.log('Datos a enviar al servicio:', checklistData);

  if (this.isEditing && this.selectedChecklist) {
    // Actualizar
    this.checklistService.updateChecklist(this.selectedChecklist.id_checklist!, checklistData).subscribe({
      next: () => {
        this.showSuccess('Checklist actualizado correctamente');
        this.loadChecklists();
        this.closeModal();
      },
      error: (error) => {
        console.error('Error al actualizar:', error);
        this.showError('Error al actualizar el checklist');
      }
    });
  } else {
    // Crear nuevo
    this.checklistService.createChecklist(checklistData).subscribe({
      next: () => {
        this.showSuccess('Checklist creado correctamente');
        this.loadChecklists();
        this.closeModal();
      },
      error: (error) => {
        console.error('Error al crear:', error);
        this.showError('Error al crear el checklist');
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
    }).then((result: any) => {
      if (result.isConfirmed) {
        this.checklistService.deleteChecklist(id).subscribe({
          next: () => {
            this.showSuccess('Checklist eliminado correctamente');
            this.loadChecklists();
          },
          error: (error) => {
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


  // Marcar todos los campos como tocados para mostrar errores
  markFormFieldsTouched(): void {
    Object.keys(this.checklistForm.controls).forEach(field => {
      const control = this.checklistForm.get(field);
      control?.markAsTouched({ onlySelf: true });
    });
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