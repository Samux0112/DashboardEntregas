<script setup>
import { ref, onMounted, computed, nextTick, watch } from "vue";
import axios from "axios";
import { useAuthStore } from "@/api-plugins/authStores";
import { useLayout } from "@/layout/composables/layout";
import { FilterMatchMode } from "@primevue/core/api";


const { showAlert, isDarkTheme, getDarkModeStyles, getLightModeStyles, toggleDarkMode } = useLayout();

const authStore = useAuthStore();
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
const displayImageDialog = ref(false); // Variable para mostrar el diálogo de la imagen
const imageUrl = ref(""); // Variable para almacenar la URL de la imagen
const imageExists = ref({}); // Variable para almacenar la existencia de imágenes

const availableActions = [
  { label: 'Inicio de sesión', value: 'Inicio de sesión' },
  { label: 'Cambio de ubicación', value: 'Cambio de ubicación' },
  { label: 'Entrega realizada (entregado)', value: 'Entrega realizada (entregado)' },
  { label: 'Entrega realizada (parcial)', value: 'Entrega realizada (parcial)' },
  { label: 'Entrega realizada (no_entregado)', value: 'Entrega realizada (no_entregado)' },
];

const cargarRutas = () => {
  const rutasGuardadas = localStorage.getItem("rutas");
  if (rutasGuardadas) {
    rutas.value = JSON.parse(rutasGuardadas);
  } else {
    rutas.value = [];
  }
};

// Función para guardar valor en localStorage
const guardarValorEnLocalStorage = (clave, valor) => {
  localStorage.setItem(clave, JSON.stringify(valor));
};

// Observar cambios en selectedRuta, startDate, endDate y selectedActions
watch(selectedRuta, (nuevoValor) => {
  guardarValorEnLocalStorage('selectedRuta', nuevoValor);
});

watch(startDate, (nuevoValor) => {
  guardarValorEnLocalStorage('startDate', nuevoValor);
});

watch(endDate, (nuevoValor) => {
  guardarValorEnLocalStorage('endDate', nuevoValor);
});

watch(selectedActions, (nuevoValor) => {
  guardarValorEnLocalStorage('selectedActions', nuevoValor);
});

// Observar cambios en logs para guardarlos en localStorage
watch(logs, (nuevoValor) => {
  guardarValorEnLocalStorage('logs', nuevoValor);
});

// Función para cargar los valores desde localStorage
const cargarValoresDesdeLocalStorage = () => {
  const rutaGuardada = localStorage.getItem('selectedRuta');
  const fechaInicioGuardada = localStorage.getItem('startDate');
  const fechaFinGuardada = localStorage.getItem('endDate');
  const accionesGuardadas = localStorage.getItem('selectedActions');
  const logsGuardados = localStorage.getItem('logs');

  if (rutaGuardada) {
    selectedRuta.value = JSON.parse(rutaGuardada);
  }

  if (fechaInicioGuardada) {
    startDate.value = new Date(JSON.parse(fechaInicioGuardada));
  }

  if (fechaFinGuardada) {
    endDate.value = new Date(JSON.parse(fechaFinGuardada));
  }

  if (accionesGuardadas) {
    selectedActions.value = JSON.parse(accionesGuardadas);
  }

  if (logsGuardados) {
    logs.value = JSON.parse(logsGuardados);
    filtrarLogs(); // Filtrar los logs después de cargarlos
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

const verificarExistenciaImagen = async (codCliente, token) => {
  try {
    const response = await axios.head(`https://calidad-yesentregas-api.yes.com.sv/img/${codCliente}.jpg`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    return response.status === 200;
  } catch (error) {
    return false;
  }
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

    // Verificar la existencia de las imágenes
    const imageExistencePromises = logsTemp.map(async log => {
      if (log.json_accion.kunnag) {
        const exists = await verificarExistenciaImagen(log.json_accion.kunnag, token);
        imageExists.value[log.json_accion.kunnag] = exists;
      }
    });
    await Promise.all(imageExistencePromises);

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

// Función para filtrar los logs y mantener solo el primer "Inicio de sesión" de cada fecha
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

// Función para filtrar los logs en base a las acciones seleccionadas
const filtrarLogs = () => {
  let logsFiltrados = logs.value;
  if (!selectedActions.value.includes('Todos los logs')) {
    logsFiltrados = logsFiltrados.filter(log => selectedActions.value.includes(log.json_accion.Accion));
  }

  // Obtener solo el primer "Inicio de sesión" de cada fecha
  const primerInicioSesion = filtrarPrimerLogPorFecha(logsFiltrados);

  // Combinar ambos resultados
  filteredLogs.value = [...primerInicioSesion, ...logsFiltrados.filter(log => log.json_accion.Accion !== 'Inicio de sesión')];
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

// Función para mostrar la imagen del cliente
const showImageDialog = async (codCliente) => {
  const token = localStorage.getItem('token');

  if (!token) {
    showAlert({
      title: 'Error',
      text: 'Token no disponible. Por favor, inicia sesión.',
      icon: 'error',
      confirmButtonText: 'Entendido',
    });
    return;
  }

  try {
    const response = await axios.get(`https://calidad-yesentregas-api.yes.com.sv/img/${codCliente}.jpg`, {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      responseType: 'blob' // Para manejar imágenes
    });

    const url = URL.createObjectURL(response.data);
    imageUrl.value = url;
    displayImageDialog.value = true;
  } catch (error) {
    console.error('Error al obtener la imagen:', error);
    showAlert({
      title: 'Error',
      text: 'Hubo un problema al obtener la imagen.',
      icon: 'error',
      confirmButtonText: 'Entendido',
    });
  }
};

// Función para determinar si se debe mostrar el botón de mapa
const shouldShowMapButton = (log) => {
  const accion = log.json_accion.Accion;
  const tieneNotaAclaratoria = log.json_accion.nota_aclaratoria;

  return (
    ["Entrega realizada (entregado)", "Entrega realizada (parcial)", "Entrega realizada (no_entregado)"].includes(accion)
    && tieneNotaAclaratoria
  );
};

// Función para determinar si se debe mostrar el botón de imagen
const shouldShowImageButton = (log) => {
  const accion = log.json_accion.Accion;
  const codCliente = log.json_accion.kunnag;

  return (
    ["Entrega realizada (entregado)", "Entrega realizada (parcial)", "Entrega realizada (no_entregado)"].includes(accion)
    && codCliente
    && imageExists.value[codCliente]
  );
};

onMounted(() => {
  authStore.loadSession();
  cargarRutas();
  cargarValoresDesdeLocalStorage(); // Cargar los valores seleccionados desde localStorage al montar el componente
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
      :rows="50"
      paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
      :rowsPerPageOptions="[50, 75 , 100]"
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
      <Column field="json_accion.fecha-hora" header="Fecha y hora" sortable style="width: 100px;"></Column>
      <Column field="json_accion.Accion" header="Acción" sortable style="width: 100px;"></Column>
      <Column field="json_accion.kunnag" header="Doc. Sap" sortable style="width: 100px;"></Column>
      <!-- <Column field="json_accion.Username" header="Usuario" sortable style="width: 100px;"></Column> -->
      <Column field="json_accion.vbeln" header="Número de Factura" sortable style="width: 100px;"></Column>
      <Column header="Ver en mapa" style="width: 100px;">
        <template #body="slotProps">
          <Button 
            v-if="shouldShowMapButton(slotProps.data)" 
            icon="pi pi-map" 
            @click="showMapDialog(slotProps.data)" 
          />
        </template>
      </Column>
      <Column field="json_accion.nota_aclaratoria" header="Distancia" sortable style="width: 150px;"></Column>
      <Column field="json_accion.tiempo de traslado" header="Dur. traslado" sortable style="width: 150px;"></Column>
      <Column field="json_accion.hora de visita" header="Hora de llegada" sortable style="width: 150px;"></Column>
      <Column field="json_accion.tiempo de visita" header="Dur. visita" sortable style="width: 150px;"></Column>
      <Column header="Img Local" style="width: 150px;">
        <template #body="slotProps">
          <Button  v-if="shouldShowImageButton(slotProps.data)" 
            icon="pi pi-image" 
            @click="showImageDialog(slotProps.data.json_accion.kunnag)" />
        </template>
      </Column>
    </DataTable>

    <!-- Dialogo para el mapa -->
    <Dialog header="Mapa de Referencia" v-model:visible="displayMapDialog" width="100%" :style="{ width: '90vw', maxWidth: '1200px' }"
    :breakpoints="{ '960px': '95vw', '640px': '100vw' }" modal>
      <div id="map" style="height:70vh; width:100%;"></div>
    </Dialog>

    <!-- Dialogo para la imagen -->
    <Dialog header="Imagen del Cliente" v-model:visible="displayImageDialog" width="50%" :style="{ width: '50vw', maxWidth: '600px' }"
    :breakpoints="{ '960px': '95vw', '640px': '100vw' }" modal>
      <img :src="imageUrl" alt="Imagen del Cliente" style="width: 100%; height: auto;" />
    </Dialog>
  </div>
</template>

<style scoped>
.card {
  padding: 1rem;
}
</style>