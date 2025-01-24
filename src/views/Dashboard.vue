<script setup>
import { ref, onMounted } from 'vue';
import axios from 'axios';
import { useLayout } from "@/layout/composables/layout";
import Swal from 'sweetalert2';
import GoogleMap from '@/layout/GoogleMap.vue'; // Asegúrate de tener el componente GoogleMap
const { showAlert } = useLayout();
// Manejo de fecha y hora actual
const fechaHoraActual = ref('');
const rutas = ref([]); // Lista de rutas obtenidas de localStorage
const calendarValue = ref(new Date()); // Valor por defecto para la fecha
const dropdownValue = ref(''); // Valor seleccionado del dropdown para la ruta
const filterValue = ref('Todas las ubicaciones'); // Valor seleccionado del dropdown para el filtro
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

// Función para cargar las rutas desde localStorage
const cargarRutas = () => {
    const rutasGuardadas = localStorage.getItem('rutas');
    if (rutasGuardadas) {
        rutas.value = JSON.parse(rutasGuardadas);
    } else {
        rutas.value = [];
    }
};

// Función para obtener las operaciones de una ruta específica
const obtenerOperacionesRuta = async () => {
    try {
        if (!dropdownValue.value || !calendarValue.value || !filterValue.value) {
            showAlert({
                title: 'Campos incompletos',
                text: 'Por favor, selecciona la ruta, fecha y filtro antes de buscar.',
                icon: 'warning',
                confirmButtonText: 'Entendido',
            });
            return;
        }

        const rutaId = dropdownValue.value;
        const fecha = calendarValue.value.toLocaleDateString('es-ES').replace(/\//g, '-'); // Formato DD-MM-YYYY
        const filtroMap = {
            'Todas las ubicaciones': 'T',
            'No incluir cambios de ubicacion': 'E',
            'Cambios de ubicacion': 'U'
        };
        const filtro = filtroMap[filterValue.value]; // Mapear el valor del filtro seleccionado
        const token = localStorage.getItem('token');

        if (!token) {
            throw new Error('Token no disponible. Por favor, inicia sesión.');
        }

        const response = await axios.get(`https://calidad-yesentregas-api.yes.com.sv/logs/${rutaId}/${fecha}/${filtro}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.data) {
            let entregaCount = 0;
            operaciones.value = response.data
                .filter(log => 
                    ["Inicio de sesión", "Entrega realizada (parcial)","Entrega realizada (entregado)", "Entrega realizada (no_entregado)", "Terminar día", "Cambio de ubicación"].includes(log.json_accion.Accion)
                )
                .map(log => {
                    let tipo = log.json_accion.Accion;
                    let tipoSinNumero = tipo;
                    let numero = null;
                    if (["Entrega realizada (parcial)", "Entrega realizada (entregado)", "Entrega realizada (no_entregado)"].includes(tipo)) {
                        numero = ++entregaCount;
                    }
                    return {
                        lat: parseFloat(log.json_accion.latitudEntregador),
                        lng: parseFloat(log.json_accion.longitudEntregador),
                        tipo: tipo, // Tipo de acción con número de entrega si aplica
                        tipoSinNumero: tipoSinNumero, // Tipo de acción sin número de entrega
                        cliente: log.json_accion.kunnag, // Información del cliente
                        fechaHora: log.json_accion['fecha-hora'],
                        usuario: log.json_accion.Username, // Usuario
                        vbeln: log.json_accion.vbeln, // Número de entrega
                        numero: numero // Número de entrega (solo para entregas)
                    };
                });

            console.log('Operaciones obtenidas:', operaciones.value);
        } else {
            showAlert({
                title: 'Sin operaciones',
                text: 'No se encontraron operaciones para esta ruta.',
                icon: 'info',
                confirmButtonText: 'Entendido',
            });
        }
    } catch (error) {
        console.error('Error al obtener las operaciones de la ruta:', error);
        showAlert({
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
    cargarRutas(); // Cargar las rutas desde localStorage al montar el componente
});
</script>

<template>
    <div>
      <!-- Fila con inputs y botón -->
      <div class="flex items-center gap-x-4 mb-4">
        <div class="flex items-center gap-x-2">
          <div class="font-semibold text-l">Ingresa la fecha:</div>
          <DatePicker v-model="calendarValue" :showIcon="true" :showButtonBar="true" />
        </div>
        <div class="flex items-center gap-x-2">
          <div class="font-semibold text-l">Ingresa la ruta:</div>
          <Select v-model="dropdownValue" :options="rutas" placeholder="Selecciona la ruta" />
        </div>
        <div class="flex items-center gap-x-2">
          <div class="font-semibold text-l">Filtrar por:</div>
          <Select v-model="filterValue" :options="['Todas las ubicaciones', 'No incluir cambios de ubicacion', 'Cambios de ubicacion']" placeholder="Selecciona el filtro" />
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
    height: calc(100% - 0px); /* Ajusta la altura del mapa restando el espacio para la fecha, ruta y botón */
}
</style>