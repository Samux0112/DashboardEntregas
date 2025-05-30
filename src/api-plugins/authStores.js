import { useLayout } from "@/layout/composables/layout";
import router from '@/router';
import axios from 'axios';
import { defineStore } from 'pinia';

const { showAlert } = useLayout();

// Configurar el interceptor de Axios
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para manejar la expiración del token
axios.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response && error.response.status === 401) {
      const authStore = useAuthStore();
      authStore.logout(true); // Pasar true para indicar que la sesión expiró
    }
    return Promise.reject(error);
  }
);

export const useAuthStore = defineStore('auth', {
    state: () => ({
        user: null,
        groups: [],
        token: null,
        error: null,
        isMuted: false // Añadido para isMuted
    }),

    actions: {
        async login(username, password) {
            try {
                // Solicitar autenticación en la API
                const response = await axios.post('https://calidad-yesentregas-api.yes.com.sv/auth/', {
                    username,
                    password,
                    country: 'sv' // Determina el país según el nombre de usuario
                });

                // Verificar respuesta
                if (!response.data.user?.user_data || !response.data.user?.groups || !response.data.token?.access_token) {
                    throw new Error('Credenciales incorrectas o falta de información en la respuesta.');
                }

                this.user = response.data.user.user_data;
                this.groups = response.data.user.groups;
                this.token = response.data.token.access_token;
                this.error = null;

                // Guardar las rutas asignadas en localStorage
                if (response.data.asigned) {
                    localStorage.setItem('rutas', JSON.stringify(response.data.asigned));
                }

                // Verificar si el usuario tiene los permisos necesarios
                const hasRequiredGroup = this.groups.includes('YesEntregas-Supervisor') || 
                                         this.groups.includes('YesEntregas-SupervisorGT');
                if (!hasRequiredGroup) {
                    // Mostrar mensaje de error
                    showAlert({
                        title: 'Acceso Denegado',
                        text: 'No tienes los permisos necesarios para acceder a este sistema.',
                        icon: 'error',
                        confirmButtonText: 'Entendido'
                    });
                    return; // Prevenir acceso al sistema
                }

                // Guardar en localStorage
                localStorage.setItem('user', JSON.stringify(this.user));
                localStorage.setItem('groups', JSON.stringify(this.groups));
                localStorage.setItem('token', this.token);

                // Configurar token en Axios
                this.setAxiosToken(this.token);

                // Alerta de inicio de sesión exitoso
                showAlert({
                    title: '¡Inicio de sesión exitoso!',
                    text: `Bienvenido, ${this.user?.Username || 'Usuario'}`,
                    icon: 'success',
                    timer: 2000,
                    showConfirmButton: false
                });

                // Redirigir al dashboard
                router.push({ name: 'dashboard' });

            } catch (err) {
                console.error('Error al autenticar:', err);

                // Verificar si el error es por credenciales incorrectas
                if (err.response && err.response.status === 401) {
                    this.error = 'Usuario o contraseña incorrectos.';
                } else if (err.response && err.response.status === 500) {
                    this.error = 'Usuario o contraseña incorrectos.';
                } else {
                    this.error = err.message || 'Ocurrió un error inesperado.';
                }

                showAlert({
                    title: 'Error',
                    text: this.error,
                    icon: 'error',
                    confirmButtonText: 'Intentar de nuevo'
                });
            }
        },

        setAxiosToken(token) {
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        },

        loadSession() {
            const user = localStorage.getItem('user');
            const groups = localStorage.getItem('groups');
            const token = localStorage.getItem('token');

            if (user && groups && token) {
                try {
                    this.user = JSON.parse(user);
                    this.groups = JSON.parse(groups);
                    this.token = token;

                    // Guardar el token en el localStorage si no está guardado
                    if (!localStorage.getItem('token')) {
                        localStorage.setItem('token', this.token);
                    }

                    this.setAxiosToken(this.token);
                    console.log('Sesión cargada:', this.user, this.groups);
                } catch (error) {
                    console.error('Error al cargar la sesión:', error);
                }
            }
        },

        async logout(sessionExpired = false) {
            if (sessionExpired) {
                showAlert({
                    title: 'Sesión Expirada',
                    text: 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.',
                    icon: 'warning',
                    timer: 2000,
                    showConfirmButton: false
                });
            } else {
                showAlert({
                    title: '¿Estás seguro de que deseas cerrar sesión?',
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonText: 'Sí, cerrar sesión',
                    cancelButtonText: 'Cancelar'
                }).then((result) => {
                    if (result.isConfirmed) {
                        this.user = null;
                        this.groups = [];
                        this.token = null;

                        localStorage.removeItem('user');
                        localStorage.removeItem('groups');
                        localStorage.removeItem('token');

                        delete axios.defaults.headers.common['Authorization'];

                        showAlert({
                            title: 'Has cerrado sesión correctamente.',
                            icon: 'success',
                            timer: 2000,
                            showConfirmButton: false
                        });

                        router.push({ name: 'login' });
                    }
                });
            }

            if (sessionExpired) {
                this.user = null;
                this.groups = [];
                this.token = null;

                localStorage.removeItem('user');
                localStorage.removeItem('groups');
                localStorage.removeItem('token');

                delete axios.defaults.headers.common['Authorization'];

                setTimeout(() => {
                    router.push({ name: 'login' });
                }, 2000);
            }
        },

        isAuthenticated() {
            return !!this.user && !!this.token;
        },

        hasGroup(groupName) {
            return this.groups.includes(groupName);
        }
    }
});