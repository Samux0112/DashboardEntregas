<script setup>
import { ref, onMounted, computed, nextTick, watch } from "vue";
import axios from "axios";
import { useAuthStore } from "@/api-plugins/authStores";
import { useLayout } from "@/layout/composables/layout";
import { useRouter } from "vue-router";
import { useToast } from "primevue/usetoast";
import { FilterMatchMode } from "@primevue/core/api";
import Swal from 'sweetalert2';

const { showAlert, isDarkTheme, getDarkModeStyles, getLightModeStyles, toggleDarkMode } = useLayout();
const router = useRouter();
const authStore = useAuthStore();
const toast = useToast();
const username = computed(() => authStore.user?.Username || "Invitado");

const expandedRows = ref([]);
const rutas = ref([]);
const clientes = ref([]);
const clientesFiltrados = ref([]);
const searchTerm = ref("");
const selectedRuta = ref("");
const startDate = ref(new Date());
const endDate = ref(new Date());
const logs = ref([]); // Variable reactiva para almacenar los logs
const filteredLogs = ref([]); // Variable reactiva para almacenar los logs filtrados
const selectedActions = ref([]); // Acciones seleccionadas para el filtro
const loadingLogs = ref(false); // Variable de estado de carga
const displayMapDialog = ref(false); // Variable para mostrar el diálogo del mapa
const selectedLog = ref(null); // Variable para almacenar el log seleccionado

const availableActions = [
  { label: 'Inicio de sesión', value: 'Inicio de sesión' },
  { label: 'Cambio de ubicación', value: 'Cambio de ubicación' },
  { label: 'Entrega realizada (entregado)', value: 'Entrega realizada (entregado)' },
  { label: 'Entrega realizada (parcial)', value: 'Entrega realizada (parcial)' },
  { label: 'Entrega realizada (no_entregado)', value: 'Entrega realizada (no_entregado)' },
  { label: 'Todos los logs', value: 'Todos los logs' },
];

const cargarRutas = () => {
  const rutasGuardadas = localStorage.getItem("rutas");
  if (rutasGuardadas) {
    rutas.value = JSON.parse(rutasGuardadas);
  } else {
    rutas.value = [];
  }
};

// Función para formatear las fechas en formato DD-MM-YYYY
const formatearFecha = (fecha) => {
  const dia = String(fecha.getDate()).padStart(2, '0');
  const mes = String(fecha.getMonth() + 1).padStart(2, '0'); // Los meses en JavaScript son 0-11
  const anio = fecha.getFullYear();
  return `${dia}-${mes}-${anio}`;
};

// Función para obtener los logs de una fecha específica
const obtenerLogsPorFecha = async (rutaId, fecha, token) => {
  const url = `https://calidad-yesentregas-api.yes.com.sv/logs/${rutaId}/${fecha}/T`;
  const response = await axios.get(url, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  return response.data;
};

const obtenerLogs = async () => {
  try {
    if (!selectedRuta.value || !startDate.value || !endDate.value || selectedActions.value.length === 0) {
      showAlert({
        title: 'Campos incompletos',
        text: 'Por favor, selecciona la ruta, fecha de inicio, fecha de fin y al menos una acción antes de buscar.',
        icon: 'warning',
        confirmButtonText: 'Entendido',
      });
      return;
    }

    loadingLogs.value = true; // Iniciar carga

    const rutaId = selectedRuta.value;
    const token = localStorage.getItem('token');

    if (!token) {
      throw new Error('Token no disponible. Por favor, inicia sesión.');
    }

    const start = new Date(startDate.value);
    const end = new Date(endDate.value);
    const logsTemp = [];

    for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
      const formattedDate = formatearFecha(date);
      const logsPorFecha = await obtenerLogsPorFecha(rutaId, formattedDate, token);
      logsTemp.push(...logsPorFecha);
    }

    logs.value = logsTemp;
    filtrarLogs();
  } catch (error) {
    console.error('Error al obtener los logs:', error);
    showAlert({
      title: 'Error',
      text: 'Hubo un problema al obtener los logs.',
      icon: 'error',
      confirmButtonText: 'Entendido',
    });
  } finally {
    loadingLogs.value = false; // Terminar carga
  }
};

// Función para filtrar los logs en base a las acciones seleccionadas
const filtrarLogs = () => {
  if (selectedActions.value.includes('Todos los logs')) {
    filteredLogs.value = logs.value;
  } else {
    filteredLogs.value = logs.value.filter(log => selectedActions.value.includes(log.json_accion.Accion));
  }
};

watch([selectedActions], filtrarLogs);

const filtrarClientes = () => {
  clientesFiltrados.value = clientes.value.filter((cliente) => {
    const nombreCoincide =
      cliente.NAME1.toLowerCase().includes(searchTerm.value.toLowerCase()) ||
      cliente.NAME2.toLowerCase().includes(searchTerm.value.toLowerCase());
    return nombreCoincide;
  });
};

watch([searchTerm], filtrarClientes);

const dt = ref();
const filters = ref({
  global: { value: null, matchMode: FilterMatchMode.CONTAINS },
});

function exportCSV() {
  dt.value.exportCSV();
}

// Función para abrir el diálogo del mapa y mostrar la georeferencia
const showMapDialog = (log) => {
  selectedLog.value = log;
  displayMapDialog.value = true;
  nextTick(() => {
    const entregadorPos = { lat: parseFloat(log.json_accion.latitudEntregador), lng: parseFloat(log.json_accion.longitudEntregador) };
    const clientePos = { lat: parseFloat(log.json_accion.latitudCliente), lng: parseFloat(log.json_accion.longitudCliente) };
    const mapOptions = {
      center: entregadorPos,
      zoom: 10,
      styles: isDarkTheme.value ? getDarkModeStyles.value : getLightModeStyles.value
    };
    const map = new google.maps.Map(document.getElementById('map'), mapOptions);

    // Crear los marcadores
    const entregadorMarker = new google.maps.Marker({
      position: entregadorPos,
      map,
      title: "Entregador",
      icon: 'https://img.icons8.com/stickers/50/sell.png' // Icono personalizado para el entregador
    });
    const clienteMarker = new google.maps.Marker({
      position: clientePos,
      map,
      title: "Cliente",
      icon: 'https://img.icons8.com/stickers/50/budget.png' // Icono personalizado para el cliente
    });

    // Crear la línea entre los puntos
    const line = new google.maps.Polyline({
      path: [entregadorPos, clientePos],
      geodesic: true,
      strokeColor: '#e98d58',
      strokeOpacity: 1.0,
      strokeWeight: 4,
    });
    line.setMap(map);

    // Crear el InfoWindow y anclarlo a la línea
    const distance = log.json_accion.nota_aclaratoria;
    const infowindow = new google.maps.InfoWindow({
      content: `<div style="color:black;font-weight: bold;">Esta entrega se realizo a ${distance}</div>`
    });

    // Posicionar el InfoWindow en el medio de la línea
    const midPoint = {
      lat: (entregadorPos.lat + clientePos.lat) / 2,
      lng: (entregadorPos.lng + clientePos.lng) / 2,
    };
    infowindow.setPosition(midPoint);
    infowindow.open(map);

    // Función para abrir el InfoWindow
    const openInfoWindow = () => {
      infowindow.open(map);
    };

    // Agregar eventos para mostrar el InfoWindow al tocar los marcadores y la línea
    entregadorMarker.addListener('click', openInfoWindow);
    clienteMarker.addListener('click', openInfoWindow);
    line.addListener('click', openInfoWindow);
  });
};

onMounted(() => {
  authStore.loadSession();
  cargarRutas();
});
</script>

<template>
  <div class="card">
    <Toolbar class="mb-6">
      <template #start>
        <div>
          <label for="ruta">Seleccione una Ruta</label>
          <Select
            id="ruta"
            v-model="selectedRuta"
            :options="rutas"
            placeholder="Rutas"
          />
        </div>
        <div class="ml-2">
          <label for="startDate">Fecha de Inicio</label>
          <Calendar id="startDate" v-model="startDate" dateFormat="yy-mm-dd" />
        </div>
        <div class="ml-2">
          <label for="endDate">Fecha de Fin</label>
          <Calendar id="endDate" v-model="endDate" dateFormat="yy-mm-dd" />
        </div>
        <div class="ml-2">
          <MultiSelect 
            id="actions"
            v-model="selectedActions" 
            :options="availableActions" 
            option-label="label"
            option-value="value"
            placeholder="Acciones"
            class="w-full"
            panelClass="custom-multiselect-panel"
            :show-header="false"
            display="chip"
          >
            <template #value="slotProps">
              <div class="flex flex-wrap items-center">
                <div v-for="option in slotProps.value" :key="option.value" class="inline-flex items-center py-1 px-2 bg-primary text-primary-contrast rounded-border mr-2">
                  <div>{{ option.label }}</div>
                </div>
              </div>
              <template v-if="!slotProps.value || slotProps.value.length === 0">
                <div class="p-1">Filtrar por acción</div>
              </template>
            </template>
            <template #option="slotProps">
              <div class="flex items-center">
                <div>{{ slotProps.option.label }}</div>
              </div>
            </template>
          </MultiSelect>
        </div>
        <div class="ml-2">
          <Button label="Cargar Logs" @click="obtenerLogs" :disabled="!selectedRuta || !startDate || !endDate || selectedActions.length === 0" />
        </div>
        <div class="ml-2"> 
          <Button
            label="Exportar en excel"
            icon="pi pi-upload"
            severity="secondary"
            @click="exportCSV($event)"
          />
        </div>
      </template>
    </Toolbar>
    <div v-if="loadingLogs" class="flex justify-center items-center">
      <ProgressSpinner />
    </div>
    <DataTable
      v-else
      ref="dt"
      :value="filteredLogs"
      dataKey="id"
      :paginator="true"
      :rows="25"
      paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
      :rowsPerPageOptions="[5, 10, 25]"
      currentPageReportTemplate="Mostrando del {first} al {last} de {totalRecords} logs"
      class="compact-table"
    >
      <template #header>
        <div class="flex flex-wrap gap-2 items-center justify-between">
          <h4 class="m-0">Registro de actividades</h4>
          <IconField>
            <InputIcon>
              <i class="pi pi-search" />
            </InputIcon>
            <InputText
              v-model="searchTerm"
              placeholder="Buscar por acción..."
            />
          </IconField>
        </div>
      </template>
      <Column field="json_accion.fecha-hora" header="Fecha y Hora" sortable></Column>
      <Column field="json_accion.Accion" header="Acción" sortable></Column>
      <Column field="json_accion.kunnag" header="Cód. Cliente" sortable></Column>
      <Column field="json_accion.Username" header="Usuario" sortable></Column>
      <Column field="json_accion.vbeln" header="Número de Factura" sortable></Column>
      <Column header="Georeferencia del entregador y el cliente">
        <template #body="slotProps">
          <Button icon="pi pi-map" @click="showMapDialog(slotProps.data)" />
        </template>
      </Column>
      <Column field="json_accion.nota_aclaratoria" header="Diferencia" sortable></Column>
    </DataTable>

    <!-- Dialogo para el mapa -->
    <Dialog header="Mapa de Referencia" v-model:visible="displayMapDialog" width="100%" :style="{ width: '90vw', maxWidth: '1200px' }"
    :breakpoints="{ '960px': '95vw', '640px': '100vw' }" modal>
      <div id="map" style="height:70vh; width:100%;"></div>
    </Dialog>
  </div>
</template>

<style scoped>
.card {
  padding: 1rem;
}

/* Estilos para compactar la tabla */
.compact-table .p-datatable-tbody > tr > td {
  padding: 0.5rem 0.75rem; /* Reduce el padding de las celdas */
}

.compact-table .p-datatable-thead > tr > th {
  padding: 0.5rem 0.75rem; /* Reduce el padding de los encabezados */
}
</style>