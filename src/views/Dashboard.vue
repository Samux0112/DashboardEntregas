<script setup>
import { ref, onMounted, watch } from 'vue';
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

// Función para guardar valor en localStorage
const guardarValorEnLocalStorage = (clave, valor) => {
    localStorage.setItem(clave, JSON.stringify(valor));
};

// Observar cambios en calendarValue, dropdownValue y filterValue
watch(calendarValue, (nuevoValor) => {
    guardarValorEnLocalStorage('calendarValue', nuevoValor);
});

watch(dropdownValue, (nuevoValor) => {
    guardarValorEnLocalStorage('dropdownValue', nuevoValor);
});

watch(filterValue, (nuevoValor) => {
    guardarValorEnLocalStorage('filterValue', nuevoValor);
});

// Función para cargar las rutas y valores seleccionados desde localStorage
const cargarValoresDesdeLocalStorage = () => {
    const rutasGuardadas = localStorage.getItem('rutas');
    const fechaGuardada = localStorage.getItem('calendarValue');
    const rutaGuardada = localStorage.getItem('dropdownValue');
    const filtroGuardado = localStorage.getItem('filterValue');

    if (rutasGuardadas) {
        rutas.value = JSON.parse(rutasGuardadas);
    } else {
        rutas.value = [];
    }

    if (fechaGuardada) {
        calendarValue.value = new Date(JSON.parse(fechaGuardada));
    } else {
        calendarValue.value = new Date();
    }

    if (rutaGuardada) {
        dropdownValue.value = JSON.parse(rutaGuardada);
    } else {
        dropdownValue.value = '';
    }

    if (filtroGuardado) {
        filterValue.value = JSON.parse(filtroGuardado);
    } else {
        filterValue.value = 'Todas las ubicaciones';
    }
};

// Función para obtener las operaciones de una ruta específica
const obtenerOperacionesRuta = async () => {
    try {
        if (!calendarValue.value || !dropdownValue.value || !filterValue.value || dropdownValue.value === '') {
            showAlert({
                title: 'Campos incompletos',
                text: 'Por favor, selecciona la ruta, fecha y filtro antes de buscar.',
                icon: 'warning',
                confirmButtonText: 'Entendido'
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
            const logs = response.data
                .filter(log => 
                    ["Inicio de sesión", "Entrega realizada (parcial)","Entrega realizada (entregado)", "Entrega realizada (no_entregado)", "Terminar día", "Cambio de ubicación"].includes(log.json_accion.Accion)
                );

            // Filtrar solo el primer "Inicio de sesión" de cada fecha
            const firstLoginLogs = filtrarPrimerLogPorFecha(logs);

            // Combinar y ordenar los logs
            operaciones.value = [...firstLoginLogs, ...logs.filter(log => log.json_accion.Accion !== 'Inicio de sesión')].map(log => {
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

// Función para filtrar solo el primer "Inicio de sesión" de cada fecha
const filtrarPrimerLogPorFecha = (logs) => {
    const firstLogs = {};
    logs.forEach(log => {
        if (log["json_accion"].Accion === 'Inicio de sesión') {
            const fecha = log["json_accion"]["fecha-hora"].split(" ")[0];
            if (!firstLogs[fecha]) {
                firstLogs[fecha] = log;
            }
        }
    });
    return Object.values(firstLogs);
};

// Actualizar la fecha y hora cada segundo
onMounted(() => {
    actualizarFechaHora();
    setInterval(actualizarFechaHora, 1000);
    cargarValoresDesdeLocalStorage(); // Cargar las rutas y valores seleccionados desde localStorage al montar el componente
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