<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import axios from 'axios';
import { useAuthStore } from '@/api-plugins/authStores';
import { useLayout } from '@/layout/composables/layout';
import { useRouter } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import { FilterMatchMode } from '@primevue/core/api';


const { showAlert } = useLayout();
const router = useRouter();
const authStore = useAuthStore();
const toast = useToast();
const username = computed(() => authStore.user?.Username || 'Invitado');

const expandedRows = ref([]);
const rutas = ref([]);
const clientes = ref([]);
const clientesFiltrados = ref([]);
const searchTerm = ref('');
const selectedRuta = ref('');
const cantidad = ref(); // Initialize as a ref to a number
const cantidadPalets = ref(); // Initialize as a ref to a number
const startDate = ref(new Date());
const endDate = ref(new Date());

const selectedClienteVBELN = ref({});
const showEntradaDialog = ref(false);
const showSalidaDialog = ref(false);
const clienteSeleccionado = ref(null);
const vbelnSeleccionado = ref(null);

// Función para cargar las rutas desde localStorage
const cargarRutas = () => {
    const rutasGuardadas = localStorage.getItem('rutas');
    if (rutasGuardadas) {
        rutas.value = JSON.parse(rutasGuardadas);
    } else {
        rutas.value = [];
    }
};

// Función para obtener la cantidad de jabas y palets
const obtenerCantidadJabasPalets = async (kunnr, vbeln = '') => {
    try {
        const response = await axios.post(
            'https://calidad-yesentregas-api.yes.com.sv/control-cestas/',
            {
                kunnr: kunnr,
                vbeln: vbeln,
                start_date: startDate.value.toISOString().split('T')[0],
                end_date: endDate.value.toISOString().split('T')[0]
            }
        );
        return {
            cantidad: response.data.cantidad || 0,
            cantidad_palets: response.data.cantidad_palets || 0
        };
    } catch (error) {
        console.error('Error al obtener la cantidad de jabas y palets:', error);
        showAlert({
            title: 'Error',
            text: 'Hubo un problema al obtener la cantidad de jabas y palets.',
            icon: 'error',
            confirmButtonText: 'Entendido',
        });
        return {
            cantidad: 0,
            cantidad_palets: 0
        };
    }
};

// Función para cargar los clientes y sus VBELN asociados
const cargarClientes = async () => {
  try {
    if (!selectedRuta.value) {
      showAlert({
        title: 'Ruta no seleccionada',
        text: 'Por favor, selecciona una ruta.',
        icon: 'warning',
        confirmButtonText: 'Entendido',
      });
      return;
    }

    // Cargar clientes
    const responseClientes = await axios.post(
      'https://calidad-yesentregas-api.yes.com.sv/clientes/',
      {
        sortl: selectedRuta.value,
      }
    );

    if (responseClientes.data && responseClientes.data.length > 0) {
      clientes.value = responseClientes.data;
      
      // Inicializar selectedClienteVBELN para cada cliente
      for (const cliente of clientes.value) {
        selectedClienteVBELN.value[cliente.KUNNR] = null;

        // Obtener cantidad de jabas y palets
        const { cantidad, cantidad_palets } = await obtenerCantidadJabasPalets(cliente.KUNNR);
        cliente.cantidad = cantidad;
        cliente.cantidad_palets = cantidad_palets;

        // Cargar VBELN asociados al cliente
        const responseVBELN = await axios.post(
          'https://calidad-yesentregas-api.yes.com.sv/entregas/',
          {
            bzirk: selectedRuta.value,
          }
        );

        if (responseVBELN.data) {
          // Usar un Set para obtener valores únicos
          const uniqueVBELN = [...new Set(responseVBELN.data
            .filter(entrega => entrega.KUNAG === cliente.KUNNR)
            .map(entrega => entrega.VBELN))];
          cliente.VBELN = uniqueVBELN.map(vbeln => ({ VBELN: vbeln })); // Ajuste para que sea compatible con DataTable
        } else {
          cliente.VBELN = [];
        }
      }

      filtrarClientes();
      showAlert({
        title: 'Clientes cargados',
        text: 'Los clientes han sido cargados correctamente.',
        icon: 'success',
        confirmButtonText: 'Entendido',
      });
    } else {
      showAlert({
        title: 'Sin clientes',
        text: 'No se encontraron clientes para la ruta seleccionada.',
        icon: 'info',
        confirmButtonText: 'Entendido',
      });
    }
  } catch (error) {
    console.error('Error al cargar los clientes:', error);
    showAlert({
      title: 'Error',
      text: 'Hubo un problema al cargar los clientes.',
      icon: 'error',
      confirmButtonText: 'Entendido',
    });
  }
};

const filtrarClientes = () => {
  clientesFiltrados.value = clientes.value.filter((cliente) => {
    const nombreCoincide = cliente.NAME1.toLowerCase().includes(searchTerm.value.toLowerCase()) ||
                           cliente.NAME2.toLowerCase().includes(searchTerm.value.toLowerCase());
    return nombreCoincide;
  });
};

watch([searchTerm], filtrarClientes);

const dt = ref();
const filters = ref({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS }
});

function exportCSV() {
    dt.value.exportCSV();
}

// Función para abrir el diálogo de insertar entrada
const abrirDialogoEntrada = async (cliente) => {
  clienteSeleccionado.value = cliente;
  const { cantidad: newCantidad, cantidad_palets: newCantidadPalets } = await obtenerCantidadJabasPalets(cliente.KUNNR);
  cantidad.value = newCantidad;
  cantidadPalets.value = newCantidadPalets;
  showEntradaDialog.value = true;
};

// Función para abrir el diálogo de insertar salida
const abrirDialogoSalida = async (cliente, vbeln) => {
  clienteSeleccionado.value = cliente;
  vbelnSeleccionado.value = vbeln;
  const { cantidad: newCantidad, cantidad_palets: newCantidadPalets } = await obtenerCantidadJabasPalets(cliente.KUNNR, vbeln);
  cantidad.value = newCantidad;
  cantidadPalets.value = newCantidadPalets;
  showSalidaDialog.value = true;
};

// Función para realizar el insert de entradas
const insertarEntrada = async () => {
  try {
    if (!clienteSeleccionado.value) {
      throw new Error('Cliente no seleccionado');
    }

    const data = {
      kunnr: clienteSeleccionado.value.KUNNR,
      vbeln: '', // vbeln vacío para entradas
      tipo_mov: 'E', // Siempre "Entrada"
      cantidad: cantidad.value,
      fecha: new Date().toISOString().split('T')[0], // Fecha en formato YYYY-MM-DD
      usuario: username.value,
      cantidad_palets: cantidadPalets.value,
    };

    await axios.post(
      'https://calidad-yesentregas-api.yes.com.sv/control-cestas/insert/',
      data,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    showAlert({
      title: 'Entrada insertada',
      text: 'La entrada ha sido insertada correctamente.',
      icon: 'success',
      confirmButtonText: 'Entendido',
    });
    
    // Cerrar el diálogo
    showEntradaDialog.value = false;
  } catch (error) {
    console.error('Error al insertar la entrada:', error);
    showAlert({
      title: 'Error',
      text: 'Hubo un problema al insertar la entrada.',
      icon: 'error',
      confirmButtonText: 'Entendido',
    });
  }
};

// Función para realizar el insert de salidas
const insertarSalida = async () => {
  try {
    if (!clienteSeleccionado.value || !vbelnSeleccionado.value) {
      throw new Error('Cliente o VBELN no seleccionado');
    }

    const data = {
      kunnr: clienteSeleccionado.value.KUNNR,
      vbeln: vbelnSeleccionado.value,
      tipo_mov: 'S', // Siempre "Salida"
      cantidad: cantidad.value,
      fecha: new Date().toISOString().split('T')[0], // Fecha en formato YYYY-MM-DD
      usuario: username.value,
      cantidad_palets: cantidadPalets.value,
    };

    await axios.post(
      'https://calidad-yesentregas-api.yes.com.sv/control-cestas/insert/',
      data,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    showAlert({
      title: 'Salida insertada',
      text: 'La salida ha sido insertada correctamente.',
      icon: 'success',
      confirmButtonText: 'Entendido',
    });
    
    // Cerrar el diálogo
    showSalidaDialog.value = false;
  } catch (error) {
    console.error('Error al insertar la salida:', error);
    showAlert({
      title: 'Error',
      text: 'Hubo un problema al insertar la salida.',
      icon: 'error',
      confirmButtonText: 'Entendido',
    });
  }
};

const hideDialog = () => {
  showEntradaDialog.value = false;
  showSalidaDialog.value = false;
};

watch(endDate, cargarClientes);

onMounted(() => {
  authStore.loadSession(); // Cargar sesión al montar el componente
  cargarRutas();
});
</script>

<template>
  <div class="card">
    <Toolbar class="mb-6">
      <template #start>
        <Select v-model="selectedRuta" :options="rutas" placeholder="Selecciona una ruta" @change="cargarClientes" />
      </template>

      <template #end>
        <Button label="Exportar en excel" icon="pi pi-upload" severity="secondary" @click="exportCSV($event)" />
      </template>
    </Toolbar>

    <div class="p-grid">
      <div class="p-col p-fluid">
        <label for="startDate">Fecha de Inicio</label>
        <Calendar id="startDate" v-model="startDate" dateFormat="yy-mm-dd" />
      </div>
      <div class="p-col p-fluid">
        <label for="endDate">Fecha de Fin</label>
        <Calendar id="endDate" v-model="endDate" dateFormat="yy-mm-dd" />
      </div>
    </div>

    <DataTable
      ref="dt"
      v-model:expandedRows="expandedRows"
      :value="clientesFiltrados"
      dataKey="KUNNR"
      :paginator="true"
      :rows="10"
      :filters="filters"
      paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
      :rowsPerPageOptions="[5, 10, 25]"
      currentPageReportTemplate="Mostrando del {first} al {last} de {totalRecords} clientes"
    >
      <template #header>
        <div class="flex flex-wrap gap-2 items-center justify-between">
          <h4 class="m-0">Lista de Clientes</h4>
          <IconField>
            <InputIcon>
              <i class="pi pi-search" />
            </InputIcon>
            <InputText v-model="searchTerm" placeholder="Buscar por nombre..." />
          </IconField>
        </div>
      </template>

      <Column expander style="width: 3rem"></Column>
      <Column selectionMode="multiple" :exportable="false"></Column>
      <Column field="KUNNR" header="Kunnr"></Column>
      <Column field="NAME1" header="Razon social"></Column>
      <Column field="NAME2" header="Nombre"></Column>
      <Column field="STRAS" header="Dirección"></Column>
      <Column field="cantidad" header="# de jabas"></Column>
      <Column field="cantidad_palets" header="# de palets"></Column>
      <Column header="Acciones">
        <template #body="slotProps">
          <Button label="Insertar Entrada" @click="() => abrirDialogoEntrada(slotProps.data)" />
        </template>
      </Column>
      <template #expansion="slotProps">
        <div class="p-4">
          <h5>Facturas del cliente: {{ slotProps.data.NAME1 }}</h5>
          <DataTable :value="slotProps.data.VBELN">
            <Column field="VBELN" header="VBELN" sortable></Column>
            <Column header="Acciones">
              <template #body="vbelnSlotProps">
                <Button label="Insertar Salida" @click="() => abrirDialogoSalida(slotProps.data, vbelnSlotProps.data.VBELN)" />
              </template>
            </Column>
          </DataTable>
        </div>
      </template>
    </DataTable>

    <!-- Dialogo para Insertar Entrada -->
    <Dialog
      v-model:visible="showEntradaDialog"
      header="Insertar Entrada"
      :modal="true"
      class="p-fluid"
      :closable="false"
    >
      <div class="field">
        <label for="cantidad" class="mr-2">Cantidad Jabas</label>
        <InputNumber id="cantidad" v-model="cantidad.value" class="small-input"/>
      </div>
      <br>
      <div class="field">
        <label for="cantidad-palets" class="mr-1">Cantidad Palets</label>
        <InputNumber id="cantidad-palets" v-model="cantidadPalets.value" class="small-input"/>
      </div>
      <template #footer>
        <Button
          label="Cancelar"
          icon="pi pi-times"
          class="p-button-text"
          @click="hideDialog"
        />
        <Button
          label="Insertar"
          icon="pi pi-check"
          class="p-button-text"
          @click="insertarEntrada"
        />
      </template>
    </Dialog>

    <!-- Dialogo para Insertar Salida -->
    <Dialog
      v-model:visible="showSalidaDialog"
      header="Insertar Salida"
      :modal="true"
      class="p-fluid"
      :closable="false"
    >
      <div class="field">
        <label for="cantidad-salida" class="mr-2">Cantidad Jabas</label>
        <InputNumber id="cantidad-salida" v-model="cantidad.value" class="small-input" />
      </div>
      <br>
      <div class="field">
        <label for="cantidad-palets-salida" class="mr-1">Cantidad Palets</label>
        <InputNumber id="cantidad-palets-salida" v-model="cantidadPalets.value" class="small-input"/>
      </div>
      <template #footer>
        <Button
          label="Cancelar"
          icon="pi pi-times"
          class="p-button-text"
          @click="hideDialog"
        />
        <Button
          label="Insertar"
          icon="pi pi-check"
          class="p-button-text"
          @click="insertarSalida"
        />
      </template>
    </Dialog>
  </div>
</template>

<style scoped>
.card {
  padding: 1rem;
}
.small-input {
  width: 100px;
}
</style>