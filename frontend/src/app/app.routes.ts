// app.routes.ts
import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { AreasComponent } from './components/areas/areas.component';
import { ChecklistComponent } from './components/checklist/checklist.component';
import { EjecutarChecklistComponent } from './components/ejecutarchecklist/ejecutar-checklist.component';
import { FormularioComponent } from './components/formulario/formulario.component';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { 
    path: 'dashboard', 
    component: DashboardComponent,  
    canActivate: [authGuard],
    
    children: [
      { path: '', redirectTo: 'inicio', pathMatch: 'full' },
      { path: 'inicio', component: DashboardComponent }, 
      { path: 'areas/administrar', component: AreasComponent },
      { path: 'checklist', component: ChecklistComponent },
      { path: 'checklist/ejecutar', component: EjecutarChecklistComponent },
      { path: 'checklist/ejecutar/:id', component: EjecutarChecklistComponent },
      { path: 'formularios', component: FormularioComponent },
      { path: 'formularios/crear', component: FormularioComponent },
      { path: 'formularios/editar/:id', component: FormularioComponent },
      { path: 'formularios/responder/:id', component: FormularioComponent },
      { path: 'formularios/respuestas/:id', component: FormularioComponent }
    ]
  },
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: '**', redirectTo: '/login' }
];