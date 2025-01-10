<script setup>
import { ref, onMounted } from 'vue';
import axios from 'axios';
import Swal from 'sweetalert2';
import GoogleMap from '@/layout/GoogleMap.vue'; // Asegúrate de tener el paquete instalado

// Manejo de fecha y hora actual
const fechaHoraActual = ref('');
const rutas = ref(['SUP001', 'SUP002']); // Ejemplo de rutas
const calendarValue = ref(new Date()); // Valor por defecto para la fecha
const dropdownValue = ref(''); // Valor seleccionado del dropdown
const operaciones = ref([]);

// Función para actualizar la fecha y hora cada segundo
const actualizarFechaHora = () => {
    const now = new Date();
    const opciones = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
    };
    fechaHoraActual.value = now.toLocaleString('es-ES', opciones);
};

// Función para obtener las operaciones de una ruta específica
const obtenerOperacionesRuta = async () => {
    try {
        const rutaId = dropdownValue.value;
        const fecha = calendarValue.value.toLocaleDateString('es-ES').replace(/\//g, '-'); // Formato DD-MM-YYYY
        const token = localStorage.getItem('token');

        if (!token) {
            throw new Error('Token no disponible. Por favor, inicia sesión.');
        }

        const response = await axios.get(`https://calidad-yesentregas-api.yes.com.sv/logs/${rutaId}/${fecha}/E`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.data) {
            operaciones.value = response.data.map(log => ({
                lat: parseFloat(log.json_accion.latitud),
                lng: parseFloat(log.json_accion.longitud),
                tipo: log.json_accion.Accion, // Tipo de acción
                cliente: log.json_accion.kunnag, // Información del cliente
                fechaHora: log.json_accion['fecha-hora'],
                usuario: log.json_accion.Username, // Usuario
                vbeln: log.json_accion.vbeln // Número de entrega
            }));

            console.log('Operaciones obtenidas:', operaciones.value);
        } else {
            Swal.fire({
                title: 'Sin operaciones',
                text: 'No se encontraron operaciones para esta ruta.',
                icon: 'info',
                confirmButtonText: 'Entendido',
            });
        }
    } catch (error) {
        console.error('Error al obtener las operaciones de la ruta:', error);
        Swal.fire({
            title: 'Error',
            text: 'Hubo un problema al obtener las operaciones de la ruta.',
            icon: 'error',
            confirmButtonText: 'Entendido',
        });
    }
};

// Actualizar la fecha y hora cada segundo
onMounted(() => {
    actualizarFechaHora();
    setInterval(actualizarFechaHora, 1000);
});
</script>
<template>
  <div>
    <!-- Fila con inputs y botón -->
    <div class="flex items-center gap-x-4 mb-4">
      <div class="flex items-center gap-x-2">
        <div class="font-semibold text-xl">Ingresa la fecha:</div>
        <DatePicker v-model="calendarValue" :showIcon="true" :showButtonBar="true" />
      </div>
      <div class="flex items-center gap-x-2">
        <div class="font-semibold text-xl">Ingresa la ruta:</div>
        <Select v-model="dropdownValue" :options="rutas" placeholder="Selecciona la ruta" />
      </div>
      <Button @click="obtenerOperacionesRuta" class="px-4 py-2 bg-blue-500 text-white rounded">Buscar</Button>
    </div>  

    <!-- Contenedor para el mapa -->
    <div class="flex h-screen">
      <GoogleMap class="custom-google-map" :operaciones="operaciones" />
    </div>
  </div>
</template>

<style scoped>
.custom-google-map {
    width: 100%; /* Ajusta el ancho del mapa */
    height: calc(100% - 200px); /* Ajusta la altura del mapa restando el espacio para la fecha, ruta y botón */
}
</style>