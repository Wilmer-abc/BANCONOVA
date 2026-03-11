import { Component, OnInit, Input, Output, EventEmitter, HostListener, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { AuthService } from '../../services/auth.service';

export interface MenuItem {
  label: string;
  route: string;
  icon: string;
  iconColor?: string;
  badge?: number | string;
  badgeType?: 'danger' | 'warning' | 'success' | 'info';
  disabled?: boolean;
  queryParams?: any;
  fragment?: string;
  roles?: string[];
  children?: MenuItem[]; // Para submenús
  expanded?: boolean; // Para controlar expansión
}

export interface UsuarioInfo {
  id?: number;
  nombre: string;
  correo: string;
  rol: string;
  avatar?: string;
  permisos?: string[];
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css'
})
export class SidebarComponent implements OnInit {
  @Input() collapsed = false;
  @Input() showOnMobile = false;
  @Output() collapsedChange = new EventEmitter<boolean>();
  @Output() menuItemClicked = new EventEmitter<string>();
  @Output() logoutClicked = new EventEmitter<void>();

  usuario: UsuarioInfo | null = null;
  version = '2.5.0';
  environment = 'development';
  showUserTooltip = false;

  // Sistema de badges/contadores (simulados - conectar con servicios reales)
//   contadores = {
//     checklistPendientes: 5,
//     incidentesActivos: 3,
//     formulariosPendientes: 2,
//     auditoriasPendientes: 1
//   };

  // Menú items organizados según la nueva estructura SGSI
  menuItems: MenuItem[] = [
    {
      label: 'Dashboard',
      route: '/dashboard',
      icon: 'dashboard',
      iconColor: '#0A2472'
    },
    {
      label: 'Gestión de Áreas',
      route: '/dashboard/areas',
      icon: 'business',
      children: [
        { label: 'Administrar áreas', route: '/dashboard/areas/administrar', icon: 'edit' }
      ]
    },
    {
      label: 'Checklist de Auditoría',
      route: '/dashboard/checklist', // Esta es la ruta principal
      icon: 'checklist',
      badgeType: 'warning',
      children: [
        { label: 'Ver checklists', route: '/dashboard/checklist', icon: 'list' }, // Cambiado de 'crear' a la vista principal
        { label: 'Ejecutar checklist', route: '/dashboard/checklist/ejecutar', icon: 'play_arrow' },
        { label: 'Historial checklist', route: '/dashboard/checklist/historial', icon: 'history' }
      ]
    },
    {
      label: 'Formularios',
      route: '/dashboard/formularios',
      icon: 'description',
    //   badge: this.contadores.formulariosPendientes,
      badgeType: 'warning',
      children: [
        { label: 'Crear formulario', route: '/dashboard/formularios/crear', icon: 'add' },
        { label: 'Responder formulario', route: '/dashboard/formularios/responder', icon: 'edit' },
        { label: 'Resultados', route: '/dashboard/formularios/resultados', icon: 'assessment' }
      ]
    },
    {
      label: 'Incidentes de Seguridad',
      route: '/dashboard/incidentes',
      icon: 'warning',
    
      badgeType: 'danger',
      children: [
        { label: 'Reportar incidente', route: '/dashboard/incidentes/reportar', icon: 'add_alert' },
        { label: 'Historial de incidentes', route: '/dashboard/incidentes/historial', icon: 'list' }
      ]
    },
    {
      label: 'Usuarios',
      route: '/dashboard/usuarios',
      icon: 'people',
      roles: ['admin'],
      children: [
        { label: 'Administración de usuarios', route: '/dashboard/usuarios/administrar', icon: 'manage_accounts' }
      ]
    },
    {
      label: 'Auditoría del Sistema',
      route: '/dashboard/auditoria',
      icon: 'history',
      roles: ['admin', 'auditor'],
    //   badge: this.contadores.auditoriasPendientes,
      badgeType: 'warning',
      children: [
        { label: 'Logs del sistema', route: '/dashboard/auditoria/logs', icon: 'list' }
      ]
    }
  ];

  constructor(
    private authService: AuthService,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit() {
    this.cargarDatosUsuario();
    this.detectarRutaActiva();
    this.detectarEnvironment();
    this.cargarContadoresReales();
  }

  cargarDatosUsuario() {
    if (isPlatformBrowser(this.platformId)) {
      const token = this.authService.obtenerToken();
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          this.usuario = {
            id: payload.id,
            nombre: payload.nombre || 'Usuario',
            correo: payload.correo || '',
            rol: payload.rol || 'usuario',
            permisos: payload.permisos || []
          };

          this.filtrarMenuPorPermisos();
        } catch (error) {
          console.error('Error al decodificar token:', error);
          this.usuario = {
            nombre: 'Usuario',
            correo: 'usuario@banconova.com',
            rol: 'usuario'
          };
        }
      } else {
        this.usuario = {
          nombre: 'Admin Principal',
          correo: 'admin@banconova.com',
          rol: 'admin'
        };
      }
    }
  }

  cargarContadoresReales() {
    // Aquí conectarías con servicios reales para obtener contadores
    // Ejemplo:
    // this.checklistService.getPendientes().subscribe(count => this.contadores.checklistPendientes = count);
    // this.incidentesService.getActivos().subscribe(count => this.contadores.incidentesActivos = count);
  }

  filtrarMenuPorPermisos() {
    if (!this.usuario) return;

    // Filtrar items según rol
    this.menuItems = this.menuItems.filter(item => {
      if (!item.roles) return true;
      return item.roles.includes(this.usuario?.rol || '');
    });

    // También filtrar hijos si es necesario
    this.menuItems.forEach(item => {
      if (item.children) {
        item.children = item.children.filter(child => {
          if (!child.roles) return true;
          return child.roles.includes(this.usuario?.rol || '');
        });
      }
    });
  }

  detectarRutaActiva() {
    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.showUserTooltip = false;
        this.actualizarEstadoExpansion();
      }
    });
  }

  actualizarEstadoExpansion() {
    // Expandir automáticamente el menú que contiene la ruta activa
    const urlActual = this.router.url;
    this.menuItems.forEach(item => {
      if (item.children) {
        item.expanded = item.children.some(child => urlActual.startsWith(child.route)) ||
                        urlActual.startsWith(item.route);
      }
    });
  }

  detectarEnvironment() {
    if (isPlatformBrowser(this.platformId)) {
      const hostname = window.location.hostname;
      this.environment = hostname.includes('localhost') ? 'development' : 'production';
    }
  }

  isActive(route: string): boolean {
    return this.router.url === route || this.router.url.startsWith(route + '/');
  }

  toggleSidebar() {
    this.collapsed = !this.collapsed;
    this.collapsedChange.emit(this.collapsed);
    
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('sidebar_collapsed', String(this.collapsed));
    }
  }

  toggleSubMenu(item: MenuItem, event: Event) {
    event.preventDefault();
    event.stopPropagation();
    
    if (!this.collapsed) {
      item.expanded = !item.expanded;
    } else {
      // Si está colapsado, al hacer clic en un item con hijos, navegar a la ruta principal
      if (item.route) {
        this.navigateTo(item.route);
      }
    }
  }

  navigateTo(route: string) {
    if (!route) return;
    
    this.menuItemClicked.emit(route);
    this.router.navigate([route]);
    
    if (window.innerWidth <= 768) {
      const sidebar = document.querySelector('.sidebar');
      sidebar?.classList.remove('show');
    }
  }

  navigateToDashboard() {
    this.navigateTo('/dashboard');
  }

  logout() {
    console.log('Cerrando sesión desde SidebarComponent');
    this.authService.cerrarSesion();
    
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('user_preferences');
      sessionStorage.clear();
    }
    
    this.router.navigate(['/login']).then(success => {
      if (!success) {
        window.location.href = '/login';
      }
    });
  }

  openHelp() {
    window.open('/ayuda', '_blank');
  }

  getUserInitials(): string {
    if (!this.usuario?.nombre) return 'U';
    return this.usuario.nombre
      .split(' ')
      .map(n => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  }

  getAvatarColor(): string {
    const colors = [
      'linear-gradient(145deg, #0A2472, #0E6BA8)',
      'linear-gradient(145deg, #00A676, #0E6BA8)',
      'linear-gradient(145deg, #DC3545, #FF6B6B)',
      'linear-gradient(145deg, #6C757D, #495057)'
    ];
    
    if (!this.usuario?.nombre) return colors[0];
    const index = this.usuario.nombre.length % colors.length;
    return colors[index];
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.user-profile-mini')) {
      this.showUserTooltip = false;
    }
  }

  @HostListener('window:beforeunload')
  onBeforeUnload() {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('sidebar_collapsed', String(this.collapsed));
    }
  }
}