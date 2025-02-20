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
const contType = ref("CESTAS"); // Valor por defecto para el radio button
const fechaconsult = ref("Todos"); // Valor por defecto para el nuevo filtro

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
        cont: contType.value,
      }
    );

    if (responseClientes.data && responseClientes.data.length > 0) {
      clientes.value = responseClientes.data;
      filtrarClientes(); // Filtrar los clientes después de cargarlos
      closeAlert(); // Cerrar el alert de cargando
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
  if (fechaconsult.value === 1) {
    clientesFiltrados.value = clientes.value.filter((cliente) => cliente.fechaconsult === 1);
  } else {
    clientesFiltrados.value = clientes.value.filter((cliente) => cliente.fechaconsult !== 1);
  }
};

const insertarMovimiento = async (cliente, tipo_mov, cantidad, cantidadPalets) => {
  try {
    const payload = {
      kunnr: cliente.kunnr,
      tipo_mov: tipo_mov,
      fecha: startDate.value.toISOString().split("T")[0],
      usuario: selectedRuta.value, // Assuming `selectedRuta` is the user
      cantidad: contType.value === "CESTAS" ? cantidad : 0,
      cantidad_palets: contType.value === "PALETS" ? cantidadPalets : 0,
    };

    await axios.post(
      "https://calidad-yesentregas-api.yes.com.sv/control-cestas/insert/",
      payload
    );

    showAlert({
      title: "Éxito",
      text: "Movimiento insertado correctamente.",
      icon: "success",
      confirmButtonText: "Entendido",
    });

    cargarClientes(); // Recargar los clientes
  } catch (error) {
    console.error("Error al insertar el movimiento:", error);
    showAlert({
      title: "Error",
      text: "Hubo un problema al insertar el movimiento.",
      icon: "error",
      confirmButtonText: "Entendido",
    });
  }
};

const handleKeyPress = (event, cliente, tipo_mov) => {
  if (event.key === "Enter") {
    const cantidad = contType.value === "CESTAS" ? event.target.value : 0;
    const cantidadPalets = contType.value === "PALETS" ? event.target.value : 0;
    insertarMovimiento(cliente, tipo_mov, cantidad, cantidadPalets);
  }
};

onMounted(() => {
  authStore.loadSession();
  cargarRutas();
  cargarClientes(); // Cargar los clientes al montar el componente
});

watch([searchTerm, fechaconsult, contType, selectedRuta], cargarClientes); // Agregar selectedRuta al watch

const dt = ref();
const filters = ref({
  global: { value: null, matchMode: FilterMatchMode.CONTAINS },
});

const exportCSV = () => {
  dt.value.exportCSV();
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
          <label for="fechaconsult">Filtro</label>
          <Select
            v-model="fechaconsult"
            :options="[
              { label: 'Todos', value: 'Todos' },
              { label: 'Agendados', value: 1 },
            ]"
            placeholder="Seleccione filtro"
            :disabled="loading"
            optionLabel="label"
            optionValue="value"
          />
        </div>
        <div class="ml-2">
          <div class="flex align-items-center">
            <RadioButton v-model="contType" inputId="cestas" value="CESTAS" />
            <label for="cestas" class="ml-2">Cestas</label>
            <RadioButton v-model="contType" inputId="palets" value="PALETS" class="ml-2" />
            <label for="palets" class="ml-2">Palets</label>
          </div>
        </div>
        <div class="ml-2">
          <Button label="Exportar en excel" icon="pi pi-upload" severity="secondary" @click="exportCSV($event)" />
        </div>
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
            <InputText v-model="searchTerm" placeholder="Buscar por nombre..." />
          </IconField>
        </div>
      </template>
      <Column field="kunnr" header="Kunnr" sortable></Column>
      <Column field="name1" header="Razon social" sortable></Column>
      <Column field="name2" header="Nombre" sortable></Column>
      <Column field="sortl" header="Ruta" sortable></Column>
      <Column field="stras" header="Dirección" sortable></Column>
      <Column field="saldo_inicial" header="Saldo inicial" sortable></Column>
      <Column field="entradas" header="Entradas" sortable>
        <template #body="slotProps">
          <InputText v-model="slotProps.data.entradas" class="small-input" @keypress="handleKeyPress($event, slotProps.data, 'E')" />
        </template>
      </Column>
      <Column field="salidas" header="Salidas" sortable>
        <template #body="slotProps">
          <InputText v-model="slotProps.data.salidas" class="small-input" @keypress="handleKeyPress($event, slotProps.data, 'S')" />
        </template>
      </Column>
      <Column field="saldo_final" header="Saldo final" sortable></Column>
    </DataTable>
  </div>
</template>

<style scoped>
.card {
  padding: 1rem;
}
.small-input {
  width: 40px; /* Ajusta el tamaño según tus necesidades */
}
</style>