import { useLayout } from "@/layout/composables/layout";
import router from '@/router';
import axios from 'axios';
import { defineStore } from 'pinia';
const { showAlert } = useLayout();
export const useAuthStore = defineStore('auth', {
    state: () => ({
        user: null,
        groups: [],
        token: null,
        error: null,
        location: null
    }),

    actions: {
        async login(username, password) {
            try {
                // Solicitar autenticación en la API
                const response = await axios.post('https://calidad-yesentregas-api.yes.com.sv/auth/', {
                    username,
                    password,
                    country: 'sv'
                });

                // Verificar respuesta
                if (!response.data.user?.user_data || !response.data.user?.groups || !response.data.token?.access_token) {
                    throw new Error('Credenciales incorrectas o falta de información en la respuesta.');
                }

                this.user = response.data.user.user_data;
                this.groups = response.data.user.groups;
                this.token = response.data.token.access_token;
                this.error = null;

                // Verificar si el usuario tiene los permisos necesarios
                const hasRequiredGroup = this.groups.includes('YesEntregas-Supervisor');
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

                // Solicitar permisos de geolocalización después del inicio de sesión
                this.requestLocationPermissions();

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

        async requestLocationPermissions() {
            try {
                if ('geolocation' in navigator) {
                    console.log('Solicitando permisos de geolocalización...');

                    const successCallback = async (position) => {
                        const newLocation = {
                            latitude: position.coords.latitude,
                            longitude: position.coords.longitude
                        };

                        // Si la ubicación ha cambiado, actualizar la ubicación
                        if (!this.location || 
                            this.location.latitude !== newLocation.latitude || 
                            this.location.longitude !== newLocation.longitude) {
                            this.location = newLocation;
                            localStorage.setItem('location', JSON.stringify(this.location));
                            console.log('Ubicación actualizada:', this.location);
                        }
                    };

                    const errorCallback = (error) => {
                        console.error('Error al obtener la ubicación:', error.message);
                    };

                    const options = {
                        enableHighAccuracy: true,
                        timeout: 5000,
                        maximumAge: 0
                    };

                    // Usar watchPosition para actualizar la ubicación continuamente
                    navigator.geolocation.watchPosition(successCallback, errorCallback, options);
                }
            } catch (error) {
                console.error('Error al solicitar permisos de ubicación:', error);
                showAlert({
                    title: 'Error al solicitar permisos',
                    text: 'No se pudo acceder a la ubicación. Asegúrate de habilitar los permisos.',
                    icon: 'error',
                    confirmButtonText: 'Intentar de nuevo'
                });
            }
        },

        async obtenerYGuardarUbicacion() {
            return new Promise((resolve) => {
                if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(
                        (position) => {
                            const lat = position.coords.latitude;
                            const lon = position.coords.longitude;
                            localStorage.setItem('userLatitude', lat);
                            localStorage.setItem('userLongitude', lon);
                            console.log(`Ubicación obtenida y guardada: Latitud ${lat}, Longitud ${lon}`);
                            resolve({ lat, lon });
                        },
                        (error) => {
                            console.error('Error obteniendo la geolocalización:', error);
                            showAlert({
                                title: 'Error',
                                text: 'No se pudo obtener la ubicación. Asegúrate de que los permisos están habilitados.',
                                icon: 'error',
                                confirmButtonText: 'Entendido'
                            });
                            // Resolver con valores predeterminados si hay un error
                            resolve({ lat: 0, lon: 0 });
                        }
                    );
                } else {
                    console.error('Geolocalización no soportada por el navegador');
                    showAlert({
                        title: 'Error',
                        text: 'Geolocalización no soportada por el navegador',
                        icon: 'error',
                        confirmButtonText: 'Entendido'
                    });
                    // Resolver con valores predeterminados si la geolocalización no es soportada
                    resolve({ lat: 0, lon: 0 });
                }
            });
        },

        loadSession() {
            const user = localStorage.getItem('user');
            const groups = localStorage.getItem('groups');
            const token = localStorage.getItem('token');
            const location = localStorage.getItem('location');

            if (user && groups && token) {
                try {
                    this.user = JSON.parse(user);
                    this.groups = JSON.parse(groups);
                    this.token = token;
                    if (location) {
                        this.location = JSON.parse(location);
                    }

                    this.setAxiosToken(this.token);
                    console.log('Sesión cargada:', this.user, this.groups, this.location);
                } catch (error) {
                    console.error('Error al cargar la sesión:', error);
                }
            }
        },

        async logout() {
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
                    this.location = null;

                    localStorage.removeItem('user');
                    localStorage.removeItem('groups');
                    localStorage.removeItem('token');
                    localStorage.removeItem('location');

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
        },

        isAuthenticated() {
            return !!this.user && !!this.token;
        },

        hasGroup(groupName) {
            return this.groups.includes(groupName);
        },

        async registrarEntrega(kunnag, vbeln) {
            await this.obtenerUbicacionYEnviarLog('Entrega realizada', kunnag, vbeln);
        }
    }
});