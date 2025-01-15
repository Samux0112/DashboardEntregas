<script setup>
import { ref, onMounted, computed, watch } from "vue";
import axios from "axios";
import { useAuthStore } from "@/api-plugins/authStores";
import { useLayout } from "@/layout/composables/layout";
import { useRouter } from "vue-router";
import { useToast } from "primevue/usetoast";
import { FilterMatchMode } from "@primevue/core/api";

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

const showEntradaDialog = ref(false);
const showSalidaDialog = ref(false);
const clienteSeleccionado = ref(null);
const vbelnSeleccionado = ref(null);

const cantidadEntradas = ref(0);
const cantidadPaletsEntradas = ref(0);
const cantidadSalidas = ref(0);
const cantidadPaletsSalidas = ref(0);

const cargarRutas = () => {
  const rutasGuardadas = localStorage.getItem("rutas");
  if (rutasGuardadas) {
    rutas.value = JSON.parse(rutasGuardadas);
  } else {
    rutas.value = [];
  }
};

const obtenerInventario = async (kunnr, tipoMov, vbeln = "") => {
  try {
    const response = await axios.post(
      "https://calidad-yesentregas-api.yes.com.sv/control-cestas/",
      {
        kunnr: kunnr,
        vbeln: vbeln,
        tipo_mov: tipoMov,
        start_date: startDate.value.toISOString().split("T")[0],
        end_date: endDate.value.toISOString().split("T")[0],
      }
    );

    console.log("Response data:", response.data);

    return response.data.filter(
      (inventario) =>
        inventario.kunnr === kunnr && inventario.tipo_mov === tipoMov
    );
  } catch (error) {
    console.error("Error al obtener el inventario:", error);
    showAlert({
      title: "Error",
      text: "Hubo un problema al obtener el inventario.",
      icon: "error",
      confirmButtonText: "Entendido",
    });
    return [];
  }
};

const procesarInventario = (inventarios) => {
  const resultado = {
    cantidad: 0,
    cantidad_palets: 0,
  };

  inventarios.forEach((registro) => {
    resultado.cantidad += registro.cantidad;
    resultado.cantidad_palets += registro.cantidad_palets;
  });

  return resultado;
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

    const responseClientes = await axios.post(
      "https://calidad-yesentregas-api.yes.com.sv/clientes/",
      {
        sortl: selectedRuta.value,
      }
    );

    if (responseClientes.data && responseClientes.data.length > 0) {
      clientes.value = responseClientes.data;

      for (const cliente of clientes.value) {
        const responseVBELN = await axios.post(
          "https://calidad-yesentregas-api.yes.com.sv/entregas/",
          {
            bzirk: selectedRuta.value,
          }
        );

        if (responseVBELN.data) {
          const uniqueVBELN = [
            ...new Set(
              responseVBELN.data
                .filter((entrega) => entrega.KUNAG === cliente.KUNNR)
                .map((entrega) => entrega.VBELN)
            ),
          ];
          cliente.VBELN = uniqueVBELN.map((vbeln) => ({ VBELN: vbeln }));
        } else {
          cliente.VBELN = [];
        }
      }

      filtrarClientes();
      showAlert({
        title: "Clientes cargados",
        text: "Los clientes han sido cargados correctamente.",
        icon: "success",
        confirmButtonText: "Entendido",
      });
    } else {
      showAlert({
        title: "Sin clientes",
        text: "No se encontraron clientes para la ruta seleccionada.",
        icon: "info",
        confirmButtonText: "Entendido",
      });
    }
  } catch (error) {
    console.error("Error al cargar los clientes:", error);
    showAlert({
      title: "Error",
      text: "Hubo un problema al cargar los clientes.",
      icon: "error",
      confirmButtonText: "Entendido",
    });
  }
};

const cargarInventarioEntradas = async () => {
  try {
    for (const cliente of clientes.value) {
      const entradas = await obtenerInventario(cliente.KUNNR, "E");
      const inventarioEntradas = procesarInventario(entradas);
      cliente.cantidad_entradas = inventarioEntradas.cantidad;
      cliente.cantidad_palets_entradas = inventarioEntradas.cantidad_palets;
    }

    filtrarClientes();
  } catch (error) {
    console.error("Error al cargar el inventario de entradas:", error);
    showAlert({
      title: "Error",
      text: "Hubo un problema al cargar el inventario de entradas.",
      icon: "error",
      confirmButtonText: "Entendido",
    });
  }
};

const cargarInventarioSalidas = async () => {
  try {
    for (const cliente of clientes.value) {
      const salidas = await obtenerInventario(cliente.KUNNR, "S");
      const inventarioSalidas = procesarInventario(salidas);
      cliente.cantidad_salidas = inventarioSalidas.cantidad;
      cliente.cantidad_palets_salidas = inventarioSalidas.cantidad_palets;

      for (const vbelnEntry of cliente.VBELN) {
        const vbelnSalidas = await obtenerInventario(
          cliente.KUNNR,
          "S",
          vbelnEntry.VBELN
        );
        const inventarioVBELNSalidas = procesarInventario(vbelnSalidas);
        vbelnEntry.cantidad_salidas = inventarioVBELNSalidas.cantidad;
        vbelnEntry.cantidad_palets_salidas =
          inventarioVBELNSalidas.cantidad_palets;
      }
    }

    filtrarClientes();
  } catch (error) {
    console.error("Error al cargar el inventario de salidas:", error);
    showAlert({
      title: "Error",
      text: "Hubo un problema al cargar el inventario de salidas.",
      icon: "error",
      confirmButtonText: "Entendido",
    });
  }
};

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

const insertarEntrada = async () => {
  try {
    if (!clienteSeleccionado.value) {
      throw new Error("Cliente no seleccionado");
    }

    const data = {
      kunnr: clienteSeleccionado.value.KUNNR,
      vbeln: "", // vbeln vacío para entradas
      tipo_mov: "E", // Siempre "Entrada"
      cantidad: cantidadEntradas.value,
      fecha: new Date().toISOString().split("T")[0], // Fecha en formato YYYY-MM-DD
      usuario: username.value,
      cantidad_palets: cantidadPaletsEntradas.value,
    };

    await axios.post(
      "https://calidad-yesentregas-api.yes.com.sv/control-cestas/insert/",
      data,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    showAlert({
      title: "Entrada insertada",
      text: "La entrada ha sido insertada correctamente.",
      icon: "success",
      confirmButtonText: "Entendido",
    });

    // Cerrar el diálogo
    showEntradaDialog.value = false;
  } catch (error) {
    console.error("Error al insertar la entrada:", error);
    showAlert({
      title: "Error",
      text: "Hubo un problema al insertar la entrada.",
      icon: "error",
      confirmButtonText: "Entendido",
    });
  }
};

const insertarSalida = async () => {
  try {
    if (!clienteSeleccionado.value || !vbelnSeleccionado.value) {
      throw new Error("Cliente o VBELN no seleccionado");
    }

    const data = {
      kunnr: clienteSeleccionado.value.KUNNR,
      vbeln: vbelnSeleccionado.value,
      tipo_mov: "S", // Siempre "Salida"
      cantidad: cantidadSalidas.value,
      fecha: new Date().toISOString().split("T")[0],
      usuario: username.value,
      cantidad_palets: cantidadPaletsSalidas.value,
    };

    await axios.post(
      "https://calidad-yesentregas-api.yes.com.sv/control-cestas/insert/",
      data,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    showAlert({
      title: "Salida insertada",
      text: "La salida ha sido insertada correctamente.",
      icon: "success",
      confirmButtonText: "Entendido",
    });

    // Cerrar el diálogo
    showSalidaDialog.value = false;
  } catch (error) {
    console.error("Error al insertar la salida:", error);
    showAlert({
      title: "Error",
      text: "Hubo un problema al insertar la salida.",
      icon: "error",
      confirmButtonText: "Entendido",
    });
  }
};

const hideDialog = () => {
  showEntradaDialog.value = false;
  showSalidaDialog.value = false;
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
          <label for="startDate">Seleccione una Ruta</label>
          <Select
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
          <Button label="Cargar Entradas" @click="cargarInventarioEntradas" />
        </div>
        <div class="ml-2">
          <Button label="Cargar Salidas" @click="cargarInventarioSalidas" />
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
            <InputText
              v-model="searchTerm"
              placeholder="Buscar por nombre..."
            />
          </IconField>
        </div>
      </template>

      <Column expander style="width: 3rem"></Column>
      <Column field="KUNNR" header="Kunnr" sortable></Column>
      <Column field="NAME1" header="Razon social" sortable></Column>
      <Column field="NAME2" header="Nombre" sortable></Column>
      <Column field="STRAS" header="Dirección" sortable></Column>
      <!-- Muestra solo entradas -->
      <Column
        field="cantidad_entradas"
        header="# de jabas (Entradas)"
        sortable
      ></Column>
      <Column
        field="cantidad_palets_entradas"
        header="# de palets (Entradas)"
        sortable
      ></Column>
      <Column header="Acciones">
        <template #body="slotProps">
          <Button
            label="Insertar Entrada"
            @click="() => abrirDialogoEntrada(slotProps.data)"
          />
        </template>
      </Column>
      <template #expansion="slotProps">
        <div class="p-4">
          <h5>Facturas del cliente: {{ slotProps.data.NAME1 }}</h5>
          <DataTable :value="slotProps.data.VBELN">
            <Column field="VBELN" header="VBELN" sortable></Column>
            <Column
              field="cantidad_salidas"
              header="Salidas de jabas"
              sortable
            ></Column>
            <Column
              field="cantidad_palets_salidas"
              header="Salidas de palets"
              sortable
            ></Column>
            <Column header="Acciones">
              <template #body="vbelnSlotProps">
                <Button
                  label="Insertar Salida"
                  @click="
                    () =>
                      abrirDialogoSalida(
                        slotProps.data,
                        vbelnSlotProps.data.VBELN
                      )
                  "
                />
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