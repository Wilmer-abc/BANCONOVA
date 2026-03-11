import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router'; // Añade Router
import { AreasService, Area } from '../../services/areas.service';

@Component({
  selector: 'app-areas',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './areas.component.html',
  styleUrls: ['./areas.component.css']
})
export class AreasComponent implements OnInit {
  
  // Lista de áreas
  areas: Area[] = [];
  
  // Estados
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
    private router: Router // Inyecta Router
  ) { }

  ngOnInit(): void {
    // Verificar si hay token
    const token = localStorage.getItem('token');
    if (!token) {
      console.log('No hay token, redirigiendo a login...');
      this.router.navigate(['/login']);
      return;
    }
    
    this.cargarAreas();
  }

  /**
   * Cargar todas las áreas
   */
  cargarAreas(): void {
    this.loading = true;
    this.error = '';
    
    this.areasService.getAreas().subscribe({
      next: (areas) => {
        console.log('✅ Áreas cargadas:', areas);
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
          this.error = err.message || 'No se pudieron cargar las áreas. Intente nuevamente.';
        }
        
        this.loading = false;
      }
    });
  }

  /**
   * Abrir modal para crear nueva área
   */
  abrirModalNueva(): void {
    this.isEditing = false;
    this.modalTitle = 'Nueva Área';
    this.areaForm = {
      nombre_area: '',
      descripcion: ''
    };
    this.showModal = true;
  }

  /**
   * Abrir modal para editar área existente
   */
  abrirModalEditar(area: Area): void {
    this.isEditing = true;
    this.modalTitle = 'Editar Área';
    this.areaForm = { ...area }; // Copiar para no modificar el original
    this.showModal = true;
  }

  /**
   * Cerrar modal
   */
  cerrarModal(): void {
    this.showModal = false;
    this.areaForm = { nombre_area: '', descripcion: '' };
    this.error = '';
  }

  /**
   * Guardar área (crear o actualizar)
   */
  guardarArea(): void {
    // Validar formulario
    if (!this.areaForm.nombre_area || this.areaForm.nombre_area.trim() === '') {
      this.error = 'El nombre del área es obligatorio';
      return;
    }

    this.loading = true;
    this.error = '';

    if (this.isEditing && this.areaForm.id_area) {
      // Actualizar área existente
      this.areasService.actualizarArea(this.areaForm.id_area, this.areaForm).subscribe({
        next: (areaActualizada) => {
          // Actualizar en la lista
          const index = this.areas.findIndex(a => a.id_area === areaActualizada.id_area);
          if (index !== -1) {
            this.areas[index] = areaActualizada;
          }
          
          this.mostrarMensajeExito('Área actualizada exitosamente');
          this.cerrarModal();
          this.loading = false;
        },
        error: (err) => {
          console.error('Error al actualizar área:', err);
          this.error = err.error?.message || 'Error al actualizar el área';
          this.loading = false;
        }
      });
    } else {
      // Crear nueva área
      this.areasService.crearArea(this.areaForm).subscribe({
        next: (nuevaArea) => {
          this.areas.unshift(nuevaArea); // Agregar al inicio
          this.totalItems = this.areas.length;
          
          this.mostrarMensajeExito('Área creada exitosamente');
          this.cerrarModal();
          this.loading = false;
        },
        error: (err) => {
          console.error('Error al crear área:', err);
          this.error = err.error?.message || 'Error al crear el área';
          this.loading = false;
        }
      });
    }
  }

  /**
   * Abrir modal de confirmación para eliminar
   */
  confirmarEliminar(area: Area): void {
    this.areaToDelete = area;
    this.dependencias = null;
    this.deleteLoading = true;
    this.showDeleteModal = true;
    
    // Verificar dependencias
    this.areasService.verificarDependencias(area.id_area).subscribe({
      next: (deps) => {
        this.dependencias = deps;
        this.deleteLoading = false;
      },
      error: (err) => {
        console.error('Error al verificar dependencias:', err);
        this.deleteLoading = false;
      }
    });
  }

  /**
   * Eliminar área
   */
  eliminarArea(): void {
    if (!this.areaToDelete) return;
    
    this.deleteLoading = true;
    
    this.areasService.eliminarArea(this.areaToDelete.id_area).subscribe({
      next: (exito) => {
        if (exito) {
          // Eliminar de la lista
          this.areas = this.areas.filter(a => a.id_area !== this.areaToDelete!.id_area);
          this.totalItems = this.areas.length;
          
          this.mostrarMensajeExito('Área eliminada exitosamente');
          this.cerrarModalEliminar();
        }
        this.deleteLoading = false;
      },
      error: (err) => {
        console.error('Error al eliminar área:', err);
        this.error = err.error?.message || 'Error al eliminar el área';
        this.deleteLoading = false;
      }
    });
  }

  /**
   * Cerrar modal de eliminar
   */
  cerrarModalEliminar(): void {
    this.showDeleteModal = false;
    this.areaToDelete = null;
    this.dependencias = null;
  }

  /**
   * Mostrar mensaje de éxito temporal
   */
  mostrarMensajeExito(mensaje: string): void {
    this.successMessage = mensaje;
    setTimeout(() => {
      this.successMessage = '';
    }, 3000);
  }

  /**
   * Filtrar áreas por término de búsqueda
   */
  get areasFiltradas(): Area[] {
    if (!this.searchTerm) return this.areas;
    
    const term = this.searchTerm.toLowerCase();
    return this.areas.filter(area => 
      area.nombre_area.toLowerCase().includes(term) || 
      (area.descripcion && area.descripcion.toLowerCase().includes(term))
    );
  }

  /**
   * Obtener áreas paginadas
   */
  get areasPaginadas(): Area[] {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    return this.areasFiltradas.slice(start, end);
  }

  /**
   * Cambiar página
   */
  cambiarPagina(page: number): void {
    this.currentPage = page;
  }

  /**
   * Obtener array de páginas para la paginación
   */
  get paginas(): number[] {
    const totalPaginas = Math.ceil(this.areasFiltradas.length / this.itemsPerPage);
    return Array.from({ length: totalPaginas }, (_, i) => i + 1);
  }

  /**
   * Refrescar lista de áreas
   */
  refrescar(): void {
    this.cargarAreas();
  }
}