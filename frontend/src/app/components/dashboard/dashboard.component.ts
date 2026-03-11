import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { DashboardService } from '../../services/dashboard.service'; 
import { SidebarComponent } from '../sidebar/sidebar.component'; 
import { AreasService, Area } from '../../services/areas.service';
import { Router } from '@angular/router';


export interface ResumenStats {
  totalAreas: number;
  totalChecklists: number;
  totalEjecuciones: number;
  totalIncidentes: number;
  incidentesAltoRiesgo: number;
  checklistPendientes: number;
}

export interface ActividadReciente {
  id: number;
  usuario: string;
  accion: string;
  modulo: 'checklist' | 'incidente' | 'formulario';
  fecha: Date;
  detalle?: string;
}

export interface ChecklistPorArea {
  area: string;
  ejecutados: number;
  pendientes: number;
}

export interface IncidentePorRiesgo {
  nivel: 'Alto' | 'Medio' | 'Bajo';
  cantidad: number;
  color: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, SidebarComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {

  userName: string = '';
  sidebarCollapsed = false;
  
  // Estadísticas de resumen
  stats: ResumenStats = {
    totalAreas: 0,
    totalChecklists: 0,
    totalEjecuciones: 0,
    totalIncidentes: 0,
    incidentesAltoRiesgo: 0,
    checklistPendientes: 0
  };

    esRutaDashboard(): boolean {
    const url = this.router.url;
    return url === '/dashboard' || 
           url === '/dashboard/' || 
           url === '/dashboard/inicio' ||
           url.endsWith('/dashboard');
  }


  // Actividad reciente
  actividadesRecientes: ActividadReciente[] = [];

  // Datos para gráficas
  checklistPorArea: ChecklistPorArea[] = [];
  incidentesPorRiesgo: IncidentePorRiesgo[] = [];

  // Estado de carga
  loading = true;
  error = '';

  // Fecha actual
  fechaActual = new Date();
  areas: Area[] = [];

  constructor(
    private authService: AuthService,
    private dashboardService: DashboardService,
    private areasService: AreasService,
    private router: Router,              // ✅ Agregar Router como private
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.cargarNombreUsuario();
    this.cargarEstadoSidebar();
  }

  // ===== MÉTODOS EXISTENTES =====

  cargarEstadoSidebar() {
    if (isPlatformBrowser(this.platformId)) {
      const savedState = localStorage.getItem('sidebar_collapsed');
      if (savedState) {
        this.sidebarCollapsed = savedState === 'true';
      }
    }
  }

  cargarNombreUsuario() {
    if (isPlatformBrowser(this.platformId)) {
      const token = this.authService.obtenerToken();
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          this.userName = payload.nombre || 'Usuario';
        } catch (error) {
          console.error('Error al decodificar token:', error);
          this.userName = 'Usuario';
        }
      } else {
        this.userName = 'Usuario';
      }
    }
  }

  ngOnInit() {
    if (this.esRutaDashboard()) {
      this.cargarDatosReales();
    }
  }

  cargarDatosDashboard() {
    this.loading = true;
    
    setTimeout(() => {
      this.cargarDatosSimulados();
      this.loading = false;
    }, 1000);
  }

  cargarDatosSimulados() {
    this.stats = {
      totalAreas: 8,
      totalChecklists: 24,
      totalEjecuciones: 156,
      totalIncidentes: 7,
      incidentesAltoRiesgo: 3,
      checklistPendientes: 5
    };

    this.actividadesRecientes = [
      {
        id: 1,
        usuario: 'Admin Principal',
        accion: 'Creó nuevo checklist',
        modulo: 'checklist',
        fecha: new Date(2026, 2, 9, 10, 30),
        detalle: 'Checklist de seguridad informática'
      },
      {
        id: 2,
        usuario: 'Juan Pérez',
        accion: 'Reportó incidente',
        modulo: 'incidente',
        fecha: new Date(2026, 2, 9, 9, 15),
        detalle: 'Intento de acceso no autorizado - Riesgo ALTO'
      },
      {
        id: 3,
        usuario: 'Ana García',
        accion: 'Ejecutó checklist',
        modulo: 'checklist',
        fecha: new Date(2026, 2, 8, 16, 45),
        detalle: 'Checklist de cumplimiento normativo'
      },
      {
        id: 4,
        usuario: 'Carlos López',
        accion: 'Envió formulario',
        modulo: 'formulario',
        fecha: new Date(2026, 2, 8, 14, 20),
        detalle: 'Formulario de evaluación de riesgos'
      },
      {
        id: 5,
        usuario: 'María Rodríguez',
        accion: 'Reportó incidente',
        modulo: 'incidente',
        fecha: new Date(2026, 2, 7, 11, 10),
        detalle: 'Falla en sistema de autenticación - Riesgo MEDIO'
      }
    ];

    this.checklistPorArea = [
      { area: 'Tecnología', ejecutados: 28, pendientes: 2 },
      { area: 'Seguridad', ejecutados: 22, pendientes: 1 },
      { area: 'Operaciones', ejecutados: 18, pendientes: 3 },
      { area: 'Recursos Humanos', ejecutados: 15, pendientes: 2 },
      { area: 'Finanzas', ejecutados: 12, pendientes: 1 }
    ];

    this.incidentesPorRiesgo = [
      { nivel: 'Alto', cantidad: 3, color: '#DC3545' },
      { nivel: 'Medio', cantidad: 4, color: '#FFC107' },
      { nivel: 'Bajo', cantidad: 2, color: '#28A745' }
    ];
  }

  // ===== NUEVO MÉTODO AGREGADO =====
  /**
   * Maneja los clicks en los items del menú del sidebar
   * @param route Ruta a la que se quiere navegar
   */
  onMenuItemClicked(route: string) {
    console.log('Navegando a:', route);
    
    // Aquí puedes agregar lógica adicional si es necesario
    // Por ejemplo, cerrar el sidebar en móvil después de navegar
    if (window.innerWidth <= 768) {
      const sidebar = document.querySelector('app-sidebar .sidebar');
      sidebar?.classList.remove('show');
    }
    
    // Si quieres manejar rutas específicas
    switch(route) {
      case '/dashboard/checklist':
        console.log('Mostrando checklist...');
        break;
      case '/dashboard/incidentes':
        console.log('Mostrando incidentes...');
        break;
      case '/dashboard/formularios':
        console.log('Mostrando formularios...');
        break;
      case '/dashboard/usuarios':
        console.log('Mostrando usuarios...');
        break;
      case '/dashboard/auditoria':
        console.log('Mostrando auditoría...');
        break;
      case '/dashboard/configuracion':
        console.log('Mostrando configuración...');
        break;
      default:
        console.log('Ruta no específica:', route);
    }
  }

  toggleSidebarMobile() {
    if (window.innerWidth <= 768) {
      const sidebar = document.querySelector('app-sidebar .sidebar');
      sidebar?.classList.toggle('show');
    }
  }

  // ===== MÉTODOS DE UTILIDAD =====

  getIconForModulo(modulo: string): string {
    switch(modulo) {
      case 'checklist': return 'checklist';
      case 'incidente': return 'warning';
      case 'formulario': return 'description';
      default: return 'info';
    }
  }

  get mostrarContenidoDashboard(): boolean {
    const url = this.router.url;
    // Mostrar dashboard solo en rutas principales
    return url === '/dashboard' || 
           url === '/dashboard/inicio' || 
           url.endsWith('/dashboard');
  }

  getColorForModulo(modulo: string): string {
    switch(modulo) {
      case 'checklist': return '#0E6BA8';
      case 'incidente': return '#DC3545';
      case 'formulario': return '#00A676';
      default: return '#6C757D';
    }
  }

  getBadgeClassForRiesgo(riesgo: string): string {
    switch(riesgo) {
      case 'ALTO': return 'badge-danger';
      case 'MEDIO': return 'badge-warning';
      case 'BAJO': return 'badge-success';
      default: return 'badge-secondary';
    }
  }

formatFecha(fecha: any): string {
  // Si es null o undefined, retornar fecha actual
  if (!fecha) {
    return new Date().toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // Convertir a objeto Date si es string
  const fechaObj = typeof fecha === 'string' ? new Date(fecha) : fecha;
  
  // Verificar si es una fecha válida
  if (!(fechaObj instanceof Date) || isNaN(fechaObj.getTime())) {
    return 'Fecha inválida';
  }

  const ahora = new Date();
  const diffMs = ahora.getTime() - fechaObj.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHoras = Math.floor(diffMs / 3600000);
  const diffDias = Math.floor(diffMs / 86400000);

  if (diffMin < 1) {
    return 'hace unos segundos';
  } else if (diffMin < 60) {
    return `hace ${diffMin} ${diffMin === 1 ? 'minuto' : 'minutos'}`;
  } else if (diffHoras < 24) {
    return `hace ${diffHoras} ${diffHoras === 1 ? 'hora' : 'horas'}`;
  } else if (diffDias < 7) {
    return `hace ${diffDias} ${diffDias === 1 ? 'día' : 'días'}`;
  } else {
    return fechaObj.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}

  refrescarDashboard() {
    if (this.esRutaDashboard()) {
      this.cargarDatosReales();
    }
  }


cargarDatosReales() {
  this.loading = true;
  this.error = '';
  
  console.log('🔄 Cargando datos reales del dashboard...');
  
  // Primero cargamos las áreas usando AreasService
  this.areasService.getAreas().subscribe({
    next: (areas) => {
      console.log('✅ Áreas cargadas en dashboard:', areas);
      this.areas = areas;
      
      // Actualizar totalAreas con datos REALES
      this.stats.totalAreas = areas.length;
      
      // Crear checklistPorArea basado en áreas reales
      this.checklistPorArea = areas.map(area => ({
        area: area.nombre_area, 
        ejecutados: 0,
        pendientes: 0
      }));
      
      // Ahora cargamos el resto de datos del dashboard
      this.dashboardService.getAllDashboardData().subscribe({
        next: (data) => {
          console.log('✅ Datos del dashboard:', data);
          
          // 🔥 IMPORTANTE: Normalizar los nombres de los campos
          const resumen = data.resumen || {};
          
          // Actualizar stats pero CONSERVANDO totalAreas REAL
          this.stats = {
            totalAreas: areas.length,
            totalChecklists: resumen.totalChecklist || resumen.totalChecklists || 0,
            totalEjecuciones: resumen.totalEjecuciones || 0,
            totalIncidentes: resumen.totalIncidentes || 0,
            incidentesAltoRiesgo: resumen.incidentesAltoRiesgo || 0,
            checklistPendientes: resumen.checklistPendientes || 0
          };
          
          // 🔥 IMPORTANTE: Asegurar que actividadesRecientes tenga valores válidos
          this.actividadesRecientes = (data.actividades || []).map((act: { usuario: any; modulo: any; }) => ({
            ...act,
            usuario: act.usuario || 'Sistema',
            modulo: act.modulo || 'checklist'
          }));
          
          this.incidentesPorRiesgo = data.incidentesPorRiesgo || [];
          
          // Si hay datos de checklistPorArea del backend, los usamos
          if (data.checklistPorArea && data.checklistPorArea.length > 0) {
            this.checklistPorArea = data.checklistPorArea;
          }
          
          console.log('🏢 Total de áreas REAL:', this.stats.totalAreas);
          console.log('📊 Stats finales:', this.stats);
          this.loading = false;
        },
        error: (err) => {
          console.error('❌ Error en dashboardService:', err);
          this.cargarDatosSimulados(); // Fallback a datos simulados
          this.loading = false;
        }
      });
    },
    error: (err) => {
      console.error('❌ Error al cargar áreas:', err);
      this.error = 'Error al cargar datos';
      this.cargarDatosSimulados();
      this.loading = false;
    }
  });
}

}