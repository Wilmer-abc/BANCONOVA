import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormArray, ReactiveFormsModule } from '@angular/forms';
import { FormularioService, Formulario, Pregunta } from '../../services/formulario.service';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { CommonModule, DatePipe } from '@angular/common';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-formulario',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DatePipe],
  templateUrl: './formulario.component.html',
  styleUrls: ['./formulario.component.css']
})
export class FormularioComponent implements OnInit {
  // Propiedades para el listado
  formularios: Formulario[] = [];
  loading = false;
  modo: 'lista' | 'crear' | 'editar' | 'responder' | 'ver-respuestas' = 'lista';
  
  // Propiedades para el formulario de creación/edición
  formularioForm: FormGroup;
  tiposRespuesta = [
    { valor: 'texto', etiqueta: 'Texto' },
    { valor: 'textarea', etiqueta: 'Texto largo' },
    { valor: 'numero', etiqueta: 'Número' },
    { valor: 'email', etiqueta: 'Email' },
    { valor: 'select', etiqueta: 'Lista desplegable' },
    { valor: 'radio', etiqueta: 'Opción única' },
    { valor: 'checkbox', etiqueta: 'Múltiples opciones' },
    { valor: 'fecha', etiqueta: 'Fecha' }
  ];
  
  // Propiedades para responder formulario
  formularioActual: any = null;
  respuestasForm: FormGroup;
  yaRespondio = false;
  
  // Propiedades para ver respuestas
  respuestas: any[] = [];
  formularioId: number | null = null;

  // Para manejar checkboxes
  respuestasCheckbox: { [key: string]: string[] } = {};

  constructor(
    private fb: FormBuilder,
    private formularioService: FormularioService,
    public router: Router,
    private route: ActivatedRoute
  ) {
    this.formularioForm = this.fb.group({
      nombre: ['', Validators.required],
      descripcion: ['', Validators.required],
      preguntas: this.fb.array([])
    });

    this.respuestasForm = this.fb.group({});
  }

  ngOnInit(): void {
    // Verificar si hay un ID en la URL para responder
    this.route.params.subscribe(params => {
      if (params['id']) {
        this.formularioId = +params['id'];
        
        // Verificar si es para responder o editar
        if (this.route.snapshot.url[0]?.path === 'responder') {
          this.cargarFormularioResponder(this.formularioId);
        } else if (this.route.snapshot.url[0]?.path === 'editar') {
          this.cargarFormularioEditar(this.formularioId);
        } else if (this.route.snapshot.url[0]?.path === 'respuestas') {
          this.verRespuestas(this.formularioId);
        } else {
          this.cargarFormularios();
        }
      } else {
        this.cargarFormularios();
      }
    });
  }

  // Getters para el FormArray
  get preguntasArray() {
    return this.formularioForm.get('preguntas') as FormArray;
  }

  // Agregar nueva pregunta al formulario
  agregarPregunta() {
    const preguntaGroup = this.fb.group({
      texto: ['', Validators.required],
      tipo: ['texto', Validators.required],
      opciones: this.fb.array([])
    });
    
    this.preguntasArray.push(preguntaGroup);
  }

  // Eliminar pregunta
  eliminarPregunta(index: number) {
    this.preguntasArray.removeAt(index);
  }

  // Agregar opción a una pregunta (para select, radio, checkbox)
  agregarOpcion(preguntaIndex: number) {
    const opcionesArray = this.preguntasArray.at(preguntaIndex).get('opciones') as FormArray;
    opcionesArray.push(this.fb.control('', Validators.required));
  }

  // Eliminar opción
  eliminarOpcion(preguntaIndex: number, opcionIndex: number) {
    const opcionesArray = this.preguntasArray.at(preguntaIndex).get('opciones') as FormArray;
    opcionesArray.removeAt(opcionIndex);
  }

  // Obtener opciones de una pregunta
  getOpciones(preguntaIndex: number): FormArray {
    return this.preguntasArray.at(preguntaIndex).get('opciones') as FormArray;
  }

  // Verificar si la pregunta necesita opciones
  necesitaOpciones(tipo: string): boolean {
    return ['select', 'radio', 'checkbox'].includes(tipo);
  }

  // Cargar todos los formularios
  cargarFormularios() {
    this.loading = true;
    this.formularioService.getFormularios().subscribe({
      next: (response) => {
        if (response.success) {
          this.formularios = response.data;
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Error al cargar formularios:', error);
        this.loading = false;
        Swal.fire('Error', 'No se pudieron cargar los formularios', 'error');
      }
    });
  }

  // Cargar formulario para editar
  cargarFormularioEditar(id: number) {
    this.loading = true;
    this.formularioService.getFormulario(id).subscribe({
      next: (response) => {
        if (response.success) {
          this.formularioActual = response.data;
          this.modo = 'editar';
          
          // Llenar el formulario con los datos existentes
          this.formularioForm.patchValue({
            nombre: this.formularioActual.nombre,
            descripcion: this.formularioActual.descripcion
          });
          
          // Limpiar preguntas existentes
          while (this.preguntasArray.length) {
            this.preguntasArray.removeAt(0);
          }
          
          // Agregar las preguntas existentes
          if (this.formularioActual.preguntas) {
            for (const pregunta of this.formularioActual.preguntas) {
              const preguntaGroup = this.fb.group({
                texto: [pregunta.pregunta, Validators.required],
                tipo: [pregunta.tipo_respuesta, Validators.required],
                id_pregunta: [pregunta.id_pregunta],
                opciones: this.fb.array([])
              });
              
              // Si la pregunta tiene opciones guardadas en JSON
              if (pregunta.opciones) {
                const opcionesArray = preguntaGroup.get('opciones') as FormArray;
                try {
                  const opciones = JSON.parse(pregunta.opciones);
                  opciones.forEach((opcion: string) => {
                    opcionesArray.push(this.fb.control(opcion, Validators.required));
                  });
                } catch (e) {
                  console.error('Error al parsear opciones:', e);
                }
              }
              
              this.preguntasArray.push(preguntaGroup);
            }
          }
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Error al cargar formulario:', error);
        this.loading = false;
        Swal.fire('Error', 'No se pudo cargar el formulario', 'error');
        this.router.navigate(['/formularios']);
      }
    });
  }

  // Cargar formulario para responder
  cargarFormularioResponder(id: number) {
    this.loading = true;
    
    // Verificar si ya respondió
    this.formularioService.verificarRespuesta(id).subscribe({
      next: (verificacion) => {
        if (verificacion.yaRespondio) {
          this.yaRespondio = true;
          this.loading = false;
          return;
        }
        
        // Cargar formulario
        this.formularioService.getFormulario(id).subscribe({
          next: (response) => {
            if (response.success) {
              this.formularioActual = response.data;
              this.modo = 'responder';
              
              // Crear campos del formulario de respuestas
              const respuestasGroup: any = {};
              
              if (this.formularioActual.preguntas) {
                this.formularioActual.preguntas.forEach((pregunta: any) => {
                  const validators = [];
                  
                  // Agregar validadores según el tipo
                  if (pregunta.tipo_respuesta === 'email') {
                    validators.push(Validators.email);
                  } else if (pregunta.tipo_respuesta === 'numero') {
                    validators.push(Validators.pattern('^[0-9]*$'));
                  }
                  
                  respuestasGroup[`pregunta_${pregunta.id_pregunta}`] = ['', validators];
                  
                  // Inicializar array para checkboxes
                  if (pregunta.tipo_respuesta === 'checkbox') {
                    this.respuestasCheckbox[`pregunta_${pregunta.id_pregunta}`] = [];
                  }
                });
              }
              
              this.respuestasForm = this.fb.group(respuestasGroup);
            }
            this.loading = false;
          },
          error: (error) => {
            console.error('Error al cargar formulario:', error);
            this.loading = false;
            Swal.fire('Error', 'No se pudo cargar el formulario', 'error');
          }
        });
      },
      error: (error) => {
        console.error('Error al verificar respuesta:', error);
        this.loading = false;
      }
    });
  }

  // Manejar cambio en checkbox
  onCheckboxChange(event: any, preguntaId: number) {
    const checkboxValue = event.target.value;
    const controlName = `pregunta_${preguntaId}`;
    
    if (event.target.checked) {
      // Agregar al array
      if (!this.respuestasCheckbox[controlName]) {
        this.respuestasCheckbox[controlName] = [];
      }
      this.respuestasCheckbox[controlName].push(checkboxValue);
    } else {
      // Quitar del array
      this.respuestasCheckbox[controlName] = this.respuestasCheckbox[controlName].filter(
        (v: string) => v !== checkboxValue
      );
    }
    
    // Actualizar el formulario con el array como JSON string
    this.respuestasForm.get(controlName)?.setValue(
      JSON.stringify(this.respuestasCheckbox[controlName])
    );
  }

  // Ver respuestas de un formulario
  verRespuestas(id: number) {
    this.modo = 'ver-respuestas';
    this.formularioId = id;
    this.loading = true;
    
    this.formularioService.getRespuestas(id).subscribe({
      next: (response) => {
        if (response.success) {
          this.respuestas = response.data;
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Error al cargar respuestas:', error);
        this.loading = false;
        Swal.fire('Error', 'No se pudieron cargar las respuestas', 'error');
      }
    });
  }

  // Guardar formulario (crear o actualizar)
  guardarFormulario() {
    if (this.formularioForm.invalid) {
      Swal.fire('Error', 'Por favor complete todos los campos requeridos', 'warning');
      return;
    }

    const preguntas: any[] = [];
    
    for (let i = 0; i < this.preguntasArray.length; i++) {
      const preguntaGroup = this.preguntasArray.at(i);
      const pregunta: any = {
        texto: preguntaGroup.get('texto')?.value,
        tipo: preguntaGroup.get('tipo')?.value
      };
      
      // Guardar opciones si existen
      if (this.necesitaOpciones(pregunta.tipo)) {
        const opcionesArray = preguntaGroup.get('opciones') as FormArray;
        pregunta.opciones = opcionesArray.value;
      }
      
      // Si es edición, incluir el ID
      if (preguntaGroup.get('id_pregunta')?.value) {
        pregunta.id_pregunta = preguntaGroup.get('id_pregunta')?.value;
      }
      
      preguntas.push(pregunta);
    }

    const formulario: Formulario = {
      nombre: this.formularioForm.get('nombre')?.value,
      descripcion: this.formularioForm.get('descripcion')?.value,
      preguntas: preguntas
    };

    this.loading = true;

    if (this.modo === 'crear') {
      // Crear nuevo formulario
      this.formularioService.crearFormulario(formulario).subscribe({
        next: (response) => {
          if (response.success) {
            Swal.fire('Éxito', 'Formulario creado correctamente', 'success');
            this.router.navigate(['/formularios']);
          }
          this.loading = false;
        },
        error: (error) => {
          console.error('Error al crear formulario:', error);
          this.loading = false;
          Swal.fire('Error', 'No se pudo crear el formulario', 'error');
        }
      });
    } else if (this.modo === 'editar' && this.formularioId) {
      // Actualizar formulario existente
      this.formularioService.actualizarFormulario(this.formularioId, formulario).subscribe({
        next: (response) => {
          if (response.success) {
            Swal.fire('Éxito', 'Formulario actualizado correctamente', 'success');
            this.router.navigate(['/formularios']);
          }
          this.loading = false;
        },
        error: (error) => {
          console.error('Error al actualizar formulario:', error);
          this.loading = false;
          Swal.fire('Error', 'No se pudo actualizar el formulario', 'error');
        }
      });
    }
  }

  // Enviar respuestas del formulario
  enviarRespuestas() {
    if (this.respuestasForm.invalid || !this.formularioId) {
      Swal.fire('Error', 'Por favor responda todas las preguntas', 'warning');
      return;
    }

    const respuestas: any[] = [];
    
    Object.keys(this.respuestasForm.value).forEach(key => {
      const id_pregunta = parseInt(key.replace('pregunta_', ''));
      let valor = this.respuestasForm.value[key];
      
      // Para checkboxes, ya está como JSON string
      respuestas.push({
        id_pregunta: id_pregunta,
        valor: valor
      });
    });

    this.loading = true;
    
    this.formularioService.guardarRespuestas(this.formularioId, respuestas).subscribe({
      next: (response) => {
        if (response.success) {
          Swal.fire('Éxito', 'Respuestas guardadas correctamente', 'success');
          this.router.navigate(['/formularios']);
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Error al guardar respuestas:', error);
        this.loading = false;
        Swal.fire('Error', error.error?.message || 'No se pudieron guardar las respuestas', 'error');
      }
    });
  }

  // Eliminar formulario
  eliminarFormulario(id: number) {
    Swal.fire({
      title: '¿Está seguro?',
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
        
        this.formularioService.eliminarFormulario(id).subscribe({
          next: (response) => {
            if (response.success) {
              Swal.fire('Eliminado', 'Formulario eliminado correctamente', 'success');
              this.cargarFormularios();
            }
            this.loading = false;
          },
          error: (error) => {
            console.error('Error al eliminar formulario:', error);
            this.loading = false;
            Swal.fire('Error', 'No se pudo eliminar el formulario', 'error');
          }
        });
      }
    });
  }

  // Cambiar modo
  cambiarModo(modo: 'lista' | 'crear' | 'editar' | 'responder' | 'ver-respuestas') {
    this.modo = modo;
    
    if (modo === 'crear') {
      this.formularioForm.reset();
      while (this.preguntasArray.length) {
        this.preguntasArray.removeAt(0);
      }
      // Agregar una pregunta por defecto
      this.agregarPregunta();
    } else if (modo === 'lista') {
      this.cargarFormularios();
    }
  }
}