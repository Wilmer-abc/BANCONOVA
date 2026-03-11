import { Component, OnInit, PLATFORM_ID, Inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';


@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent implements OnInit {
  correo = '';
  password = '';
  rememberMe = false;
  showPassword = false;
  isLoading = false;
  errorMessage = '';

  // Recuperar contraseña
  showForgotPassword = false;
  resetEmail = '';
  resetLoading = false;
  resetSuccess = false;
  resetError = '';

  constructor(
    private authService: AuthService,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object 
  ) {}

  ngOnInit() {
    // Solo acceder a localStorage si estamos en el navegador
    if (isPlatformBrowser(this.platformId)) {
      this.cargarEmailGuardado();
    }
  }

  cargarEmailGuardado() {
    try {
      const rememberedEmail = localStorage.getItem('rememberedEmail');
      if (rememberedEmail) {
        this.correo = rememberedEmail;
        this.rememberMe = true;
      }
    } catch (error) {
      console.error('Error accediendo a localStorage:', error);
    }
  }

  guardarEmailSiRecordar() {
    if (isPlatformBrowser(this.platformId)) {
      try {
        if (this.rememberMe) {
          localStorage.setItem('rememberedEmail', this.correo);
        } else {
          localStorage.removeItem('rememberedEmail');
        }
      } catch (error) {
        console.error('Error guardando en localStorage:', error);
      }
    }
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  login() {
    if (!this.correo || !this.password) {
      this.errorMessage = 'Por favor completa todos los campos';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    const data = {
      correo: this.correo,
      password: this.password
    };

    this.authService.login(data).subscribe({
      next: (res: any) => {
        console.log('Login exitoso', res);
        this.authService.guardarToken(res.token);
        
        // Guardar email si "Recordarme" está activado
        this.guardarEmailSiRecordar();
        
        // Redireccionar al dashboard o página principal
        this.router.navigate(['/dashboard']);
        alert("Login exitoso");
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error en login', error);
        this.errorMessage = error.error?.message || 'Credenciales incorrectas';
        this.isLoading = false;
      }
    });
  }

  // Métodos para recuperar contraseña
  openForgotPassword(event: Event) {
    event.preventDefault();
    this.showForgotPassword = true;
    this.resetEmail = '';
    this.resetSuccess = false;
    this.resetError = '';
  }

  closeForgotPassword() {
    this.showForgotPassword = false;
  }

  closeModalOnOverlay(event: MouseEvent) {
    if ((event.target as HTMLElement).classList.contains('modal')) {
      this.closeForgotPassword();
    }
  }

  sendResetEmail() {
    if (!this.resetEmail) {
      this.resetError = 'Por favor ingresa tu correo electrónico';
      return;
    }

    this.resetLoading = true;
    this.resetError = '';

    // Simular envío de email
    setTimeout(() => {
      this.resetLoading = false;
      this.resetSuccess = true;
      
      setTimeout(() => {
        this.closeForgotPassword();
      }, 3000);
    }, 1500);
  }

  register(event: Event) {
    event.preventDefault();
    console.log('Navegar a registro');
  }
}