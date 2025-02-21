<script setup>
import { ref, onMounted, computed, watch } from "vue";
import axios from "axios";
import { useAuthStore } from "@/api-plugins/authStores";
import { useLayout } from "@/layout/composables/layout";
import { useRouter } from "vue-router";
import { useToast } from "primevue/usetoast";
import { FilterMatchMode } from "@primevue/core/api";
import { DataTable } from "primevue";
import Galleria from 'primevue/galleria';
import Dialog from 'primevue/dialog';

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
const displayGalleriaDialog = ref(false); // Variable para mostrar el diálogo del carrusel
const images = ref([]); // Variable para almacenar las imágenes del carrusel

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
      return;
    }

    loading.value = true; // Iniciar carga

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
    } else {
      showAlert({
        title: "Sin clientes",
        text: "No se encontraron clientes para la ruta seleccionada.",
        icon: "info",
        showConfirmButton: false,
      });
      setTimeout(closeAlert, 1000); // Cerrar el mensaje después de 1 segundo
    }
  } catch (error) {
    console.error("Error al cargar los clientes:", error);
    showAlert({
      title: "Error",
      text: "Hubo un problema al cargar los clientes.",
      icon: "error",
      showConfirmButton: false,
    });
    setTimeout(closeAlert, 1000); // Cerrar el mensaje después de 1 segundo
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

    cargarClientes(); // Recargar los clientes
  } catch (error) {
    console.error("Error al insertar el movimiento:", error);
    showAlert({
      title: "Error",
      text: "Hubo un problema al insertar el movimiento.",
      icon: "error",
      showConfirmButton: false,
    });
    setTimeout(closeAlert, 1000); // Cerrar el mensaje después de 1 segundo
  }
};

const handleKeyPress = (event, cliente, tipo_mov) => {
  if (event.key === "Enter") {
    const cantidad = contType.value === "CESTAS" ? event.target.value : 0;
    const cantidadPalets = contType.value === "PALETS" ? event.target.value : 0;
    insertarMovimiento(cliente, tipo_mov, cantidad, cantidadPalets);
  }
};

// Función para obtener las imágenes del carrusel
const obtenerImagenesCarrusel = async (codCliente) => {
  const token = localStorage.getItem('token');

  if (!token) {
    showAlert({
      title: 'Error',
      text: 'Token no disponible. Por favor, inicia sesión.',
      icon: 'error',
      showConfirmButton: false,
    });
    setTimeout(closeAlert, 1000); // Cerrar el mensaje después de 1 segundo
    return;
  }

  try {
    const selectedDate = startDate.value.toISOString().split("T")[0]; // Fecha seleccionada en formato YYYY-MM-DD
    images.value = []; // Limpiar imágenes anteriores

    for (let i = 1; i <= 2; i++) {
      const url = `https://calidad-yesentregas-api.yes.com.sv/img/${codCliente}_${selectedDate}_${i}.jpg`;
      try {
        const response = await axios.get(url, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.status === 200) {
          images.value.push({
            itemImageSrc: url,
            thumbnailImageSrc: url,
            alt: `Imagen ${i}`
          });
        }
      } catch (error) {
        // Si hay un error 404, continuar con la siguiente imagen
        if (error.response && error.response.status === 404) {
          continue;
        } else {
          throw error;
        }
      }
    }

    if (images.value.length > 0) {
      displayGalleriaDialog.value = true;
    } else {
      showAlert({
        title: 'Sin imágenes',
        text: 'No se encontraron imágenes para el cliente seleccionado.',
        icon: 'info',
        showConfirmButton: false,
      });
      setTimeout(closeAlert, 1000); // Cerrar el mensaje después de 1 segundo
    }
  } catch (error) {
    console.error('Error al obtener las imágenes del carrusel:', error);
    showAlert({
      title: 'Error',
      text: 'Hubo un problema al obtener las imágenes del carrusel.',
      icon: 'error',
      showConfirmButton: false,
    });
    setTimeout(closeAlert, 1800); // Cerrar el mensaje después de 1 segundo
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
      <Column header="Ver imagen" style="width: 100px;">
        <template #body="slotProps">
          <Button icon="pi pi-image" @click="obtenerImagenesCarrusel(slotProps.data.kunnr)" />
        </template>
      </Column>
    </DataTable>

    <!-- Dialogo para el carrusel -->
    <Dialog header="Imagen del Cliente" v-model:visible="displayGalleriaDialog" width="50%" :style="{ width: '50vw', maxWidth: '600px' }" :breakpoints="{ '960px': '95vw', '640px': '100vw' }" modal>
      <Galleria :value="images" :responsiveOptions="[{breakpoint: '1024px', numVisible: 1}, {breakpoint: '768px', numVisible: 1}, {breakpoint: '560px', numVisible: 1}]" :numVisible="1" containerStyle="max-width: 100%">
        <template #item="slotProps">
          <img :src="slotProps.item.itemImageSrc" :alt="slotProps.item.alt" style="width: 100%" />
        </template>
        <template #thumbnail="slotProps">
          <img :src="slotProps.item.thumbnailImageSrc" :alt="slotProps.item.alt" style="width: 50px; height: 50px;" />
        </template>
      </Galleria>
    </Dialog>
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