<script setup>
import { ref, onMounted, computed, watch } from "vue";
import axios from "axios";
import { useAuthStore } from "@/api-plugins/authStores";
import { useLayout } from "@/layout/composables/layout";
import { useRouter } from "vue-router";
import { useToast } from "primevue/usetoast";
import { FilterMatchMode } from "@primevue/core/api";
import { DataTable } from "primevue";

// Asegúrate de que estas funciones estén disponibles desde el composable useLayout
const { showAlert, closeAlert } = useLayout();
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

const showEntradaDialog = ref(false);
const showSalidaDialog = ref(false);
const clienteSeleccionado = ref(null);
const vbelnSeleccionado = ref(null);

const cantidadEntradas = ref(0);
const cantidadPaletsEntradas = ref(0);
const cantidadSalidas = ref(0);
const cantidadPaletsSalidas = ref(0);

const loading = ref(false); // Bandera de carga

const cargarRutas = () => {
  const rutasGuardadas = localStorage.getItem("rutas");
  if (rutasGuardadas) {
    rutas.value = JSON.parse(rutasGuardadas);
  } else {
    rutas.value = [];
  }
};

const cargarClientes = async () => {
  try {
    if (!selectedRuta.value) {
      showAlert({
        title: "Ruta no seleccionada",
        text: "Por favor, selecciona una ruta.",
        icon: "warning",
        confirmButtonText: "Entendido",
      });
      return;
    }

    loading.value = true; // Iniciar carga
    showAlert({
      title: "Cargando",
      text: "Cargando los clientes...",
      icon: "info",
      showConfirmButton: false,
    });

    const responseClientes = await axios.post(
      "https://calidad-yesentregas-api.yes.com.sv/control-cestas-dash/",
      {
        sortl: selectedRuta.value,
        fecha: startDate.value.toISOString().split("T")[0],
      }
    );

    if (responseClientes.data && responseClientes.data.length > 0) {
      clientes.value = responseClientes.data;
      clientesFiltrados.value = responseClientes.data;
      closeAlert(); // Cerrar el alert de cargando
      showAlert({
        title: "Éxito",
        text: "Los clientes han sido cargados correctamente.",
        icon: "success",
        confirmButtonText: "Entendido",
      });
    } else {
      closeAlert(); // Cerrar el alert de cargando
      showAlert({
        title: "Sin clientes",
        text: "No se encontraron clientes para la ruta seleccionada.",
        icon: "info",
        confirmButtonText: "Entendido",
      });
    }
  } catch (error) {
    console.error("Error al cargar los clientes:", error);
    closeAlert(); // Cerrar el alert de cargando
    showAlert({
      title: "Error",
      text: "Hubo un problema al cargar los clientes.",
      icon: "error",
      confirmButtonText: "Entendido",
    });
  } finally {
    loading.value = false; // Terminar carga
  }
};

const filtrarClientes = () => {
  clientesFiltrados.value = clientes.value.filter((cliente) => {
    const nombreCoincide =
      (cliente.name1?.toLowerCase().includes(searchTerm.value.toLowerCase()) || false) ||
      (cliente.name2?.toLowerCase().includes(searchTerm.value.toLowerCase()) || false);
    return nombreCoincide;
  });
};

onMounted(() => {
  authStore.loadSession();
  cargarRutas();
});

watch(searchTerm, filtrarClientes);

const dt = ref();
const filters = ref({
  global: { value: null, matchMode: FilterMatchMode.CONTAINS },
});

const exportCSV = () => {
  dt.value.exportCSV();
};

const abrirDialogoEntrada = (cliente) => {
  clienteSeleccionado.value = cliente;
  vbelnSeleccionado.value = "";
  showEntradaDialog.value = true;
};

const abrirDialogoSalida = (cliente, vbeln) => {
  clienteSeleccionado.value = cliente;
  vbelnSeleccionado.value = vbeln;
  showSalidaDialog.value = true;
};

const hideDialog = () => {
  showEntradaDialog.value = false;
  showSalidaDialog.value = false;
};
</script>

<template>
  <div class="card">
    <Toolbar class="mb-6">
      <template #start>
        <div>
          <label for="ruta">Seleccione una Ruta</label>
          <Select
            v-model="selectedRuta"
            :options="rutas"
            placeholder="Rutas"
            :disabled="loading"
          />
        </div>
        <div class="ml-2">
          <label for="fecha">Fecha</label>
          <Calendar id="fecha" v-model="startDate" dateFormat="yy-mm-dd" />
        </div>
        <div class="ml-2">
          <Button label="Buscar" @click="cargarClientes" />
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
      <template #end>
      </template>
    </Toolbar>
    <DataTable
      ref="dt"
      v-model:expandedRows="expandedRows"
      :value="clientesFiltrados"
      dataKey="kunnr"
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
            <InputText
              v-model="searchTerm"
              placeholder="Buscar por nombre..."
            />
          </IconField>
        </div>
      </template>
      <Column field="kunnr" header="Kunnr" sortable></Column>
      <Column field="name1" header="Razon social" sortable></Column>
      <Column field="name2" header="Nombre" sortable></Column>
      <Column field="sortl" header="Ruta" sortable></Column>
      <Column field="stras" header="Dirección" sortable></Column>
      <Column field="saldo_inicial" header="Saldo inicial" sortable></Column>
      <Column field="entradas" header="Entradas" sortable></Column>
      <Column field="salidas" header="Salidas" sortable></Column>
      <Column field="saldo_final" header="Saldo final" sortable></Column>

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
        <InputText
          id="cantidad"
          v-model="cantidadEntradas"
          class="small-input"
        />
      </div>
      <br />
      <div class="field">
        <label for="cantidad-palets" class="mr-1">Cantidad Palets</label>
        <InputText
          id="cantidad-palets"
          v-model="cantidadPaletsEntradas"
          class="small-input"
        />
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
        <InputText
          id="cantidad-salida"
          v-model="cantidadSalidas"
          class="small-input"
        />
      </div>
      <br />
      <div class="field">
        <label for="cantidad-palets-salida" class="mr-1">Cantidad Palets</label>
        <InputText
          id="cantidad-palets-salida"
          v-model="cantidadPaletsSalidas"
          class="small-input"
        />
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
  width: 50px;
}
</style>