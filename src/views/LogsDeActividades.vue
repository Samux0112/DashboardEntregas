<script setup>
import { ref, onMounted, computed, watch } from "vue";
import axios from "axios";
import { useAuthStore } from "@/api-plugins/authStores";
import { useLayout } from "@/layout/composables/layout";
import { useRouter } from "vue-router";
import { useToast } from "primevue/usetoast";
import { FilterMatchMode } from "@primevue/core/api";
import Swal from 'sweetalert2';
import MultiSelect from 'primevue/multiselect';
import ProgressSpinner from 'primevue/progressspinner';

const { showAlert } = useLayout();
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
            @change="cargarClientes"
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
          <label for="actions">Filtrar por acciones</label>
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
      :rows="10"
      paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
      :rowsPerPageOptions="[5, 10, 25]"
      currentPageReportTemplate="Mostrando del {first} al {last} de {totalRecords} logs"
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
      <Column field="json_accion.kunnag" header="Código Cliente" sortable></Column>
      <Column field="json_accion.Username" header="Usuario" sortable></Column>
      <Column field="json_accion.vbeln" header="Número de Entrega" sortable></Column>
      <Column field="json_accion.latitud" header="Latitud del cliente" sortable></Column>
      <Column field="json_accion.longitud" header="Longitud cliente" sortable></Column>
      <Column field="json_accion.nota_aclaratoria" header="Georeferencia de entrega" sortable></Column>
    </DataTable>
  </div>
</template>