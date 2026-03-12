import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { AreasService, Area } from '../../services/areas.service';

@Component({
  selector: 'app-areas',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './areas.component.html',
  styleUrls: ['./areas.component.css']
})
export class AreasComponent implements OnInit {
  
  areas: Area[] = [];
  loading: boolean = false;
  error: string = '';
  successMessage: string = '';
  
  // Modal de creación/edición
  showModal: boolean = false;
  modalTitle: string = 'Nueva Área';
  areaForm: Partial<Area> = {
    nombre_area: '',
    descripcion: ''
  };
  isEditing: boolean = false;
  
  // Modal de confirmación para eliminar
  showDeleteModal: boolean = false;
  areaToDelete: Area | null = null;
  deleteLoading: boolean = false;
  dependencias: any = null;
  
  // Búsqueda y filtros
  searchTerm: string = '';
  
  // Paginación
  currentPage: number = 1;
  itemsPerPage: number = 10;
  totalItems: number = 0;

  constructor(
    private areasService: AreasService,
    private router: Router
  ) { }

  ngOnInit(): void {
    const token = localStorage.getItem('token');
    if (!token) {
      this.router.navigate(['/login']);
      return;
    }
    this.cargarAreas();
  }

  cargarAreas(): void {
    this.loading = true;
    this.error = '';
    
    this.areasService.getAreas().subscribe({
      next: (areas) => {
        this.areas = areas;
        this.totalItems = areas.length;
        this.loading = false;
      },
      error: (err) => {
        console.error('❌ Error al cargar áreas:', err);
        
        if (err.status === 401) {
          this.error = 'Sesión expirada. Redirigiendo al login...';
          setTimeout(() => {
            localStorage.removeItem('token');
            this.router.navigate(['/login']);
          }, 2000);
        } else {
          this.error = err.message || 'No se pudieron cargar las áreas';
        }
        
        this.loading = false;
      }
    });
  }

  abrirModalNueva(): void {
    this.isEditing = false;
    this.modalTitle = 'Nueva Área';
    this.areaForm = {
      nombre_area: '',
      descripcion: ''
    };
    this.showModal = true;
  }

  abrirModalEditar(area: Area): void {
    this.isEditing = true;
    this.modalTitle = 'Editar Área';
    this.areaForm = { ...area };
    this.showModal = true;
  }

  cerrarModal(): void {
    this.showModal = false;
    this.areaForm = { nombre_area: '', descripcion: '' };
    this.error = '';
  }

  guardarArea(): void {
    if (!this.areaForm.nombre_area || this.areaForm.nombre_area.trim() === '') {
      this.error = 'El nombre del área es obligatorio';
      return;
    }

    this.loading = true;
    this.error = '';

    if (this.isEditing && this.areaForm.id_area) {
      this.areasService.actualizarArea(this.areaForm.id_area, this.areaForm).subscribe({
        next: (areaActualizada) => {
          const index = this.areas.findIndex(a => a.id_area === areaActualizada.id_area);
          if (index !== -1) {
            this.areas[index] = areaActualizada;
          }
          this.mostrarMensajeExito('Área actualizada exitosamente');
          this.cerrarModal();
          this.loading = false;
        },
        error: (err) => {
          this.error = err.message || 'Error al actualizar el área';
          this.loading = false;
        }
      });
    } else {
      this.areasService.crearArea(this.areaForm).subscribe({
        next: (nuevaArea) => {
          this.areas.unshift(nuevaArea);
          this.totalItems = this.areas.length;
          this.mostrarMensajeExito('Área creada exitosamente');
          this.cerrarModal();
          this.loading = false;
        },
        error: (err) => {
          this.error = err.message || 'Error al crear el área';
          this.loading = false;
        }
      });
    }
  }

  confirmarEliminar(area: Area): void {
    this.areaToDelete = area;
    this.dependencias = null;
    this.deleteLoading = true;
    this.showDeleteModal = true;
    this.error = '';
    
    this.areasService.verificarDependencias(area.id_area).subscribe({
      next: (deps) => {
        this.dependencias = deps;
        this.deleteLoading = false;
      },
      error: (err) => {
        this.error = err.message || 'Error al verificar dependencias';
        this.deleteLoading = false;
      }
    });
  }

  eliminarArea(): void {
    if (!this.areaToDelete) return;
    
    this.deleteLoading = true;
    
    this.areasService.eliminarArea(this.areaToDelete.id_area).subscribe({
      next: (exito) => {
        if (exito) {
          this.areas = this.areas.filter(a => a.id_area !== this.areaToDelete!.id_area);
          this.totalItems = this.areas.length;
          this.mostrarMensajeExito('Área eliminada exitosamente');
          this.cerrarModalEliminar();
        }
        this.deleteLoading = false;
      },
      error: (err) => {
        this.error = err.message || 'Error al eliminar el área';
        this.deleteLoading = false;
      }
    });
  }

  cerrarModalEliminar(): void {
    this.showDeleteModal = false;
    this.areaToDelete = null;
    this.dependencias = null;
    this.error = '';
  }

  mostrarMensajeExito(mensaje: string): void {
    this.successMessage = mensaje;
    setTimeout(() => {
      this.successMessage = '';
    }, 3000);
  }

  get areasFiltradas(): Area[] {
    if (!this.searchTerm) return this.areas;
    
    const term = this.searchTerm.toLowerCase();
    return this.areas.filter(area => 
      area.nombre_area.toLowerCase().includes(term) || 
      (area.descripcion && area.descripcion.toLowerCase().includes(term))
    );
  }

  get areasPaginadas(): Area[] {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    return this.areasFiltradas.slice(start, end);
  }

  cambiarPagina(page: number): void {
    this.currentPage = page;
  }

  get paginas(): number[] {
    const totalPaginas = Math.ceil(this.areasFiltradas.length / this.itemsPerPage);
    return Array.from({ length: totalPaginas }, (_, i) => i + 1);
  }

  refrescar(): void {
    this.cargarAreas();
  }
}