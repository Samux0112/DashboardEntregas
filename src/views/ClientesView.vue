<script setup>
import { ref, onMounted, watch, computed } from "vue";
import axios from "axios";
import { useAuthStore } from "@/api-plugins/authStores";
import { useLayout } from "@/layout/composables/layout";

const authStore = useAuthStore();
const { showAlert } = useLayout();
const { getPrimary, isDarkTheme } = useLayout();

const clientes = ref([]);
const clientesFiltrados = ref([]);
const searchTerm = ref(localStorage.getItem("searchTerm") || "");
const ordenarPor = ref(localStorage.getItem("ordenarPor") || "");
const layout = ref("grid");
const options = ref(["list", "grid"]);
const clientesTotales = ref(0);
const clientesPendientes = ref(0);
const clientesAtendidos = ref(0);
const rutas = ref([]);
const dropdownValue = ref(""); // Ruta seleccionada
const loading = ref(false); // Nuevo estado de carga
const subrutasOrden = ref([]); // <-- NUEVO

const ruta = computed(() => authStore.user?.Username || "No existe la ruta");

const cargarClientes = async () => {
  loading.value = true; // Inicia cargando
  try {
    // Manejo de opciones especiales
    const especiales = [
      { texto: "Todas las SUP", prefijo: "SUP" },
      { texto: "Todas las IGM", prefijo: "IGM" },
      { texto: "Todas las SGV", prefijo: "SGV" },
      { texto: "Todas las SMG", prefijo: "SMG" }, // <-- corregido aquí
    ];
    const especial = especiales.find(e => dropdownValue.value === e.texto);
    if (especial) {
      const rutasFiltradas = rutas.value.filter(
        r => r.startsWith(especial.prefijo) && r !== especial.texto
      );
      subrutasOrden.value = [...rutasFiltradas]; // <-- Guarda el orden
      let todosClientes = [];
      for (const rutaFiltro of rutasFiltradas) {
        const response = await axios.post(
          "https://calidad-yesentregas-api.yes.com.sv/clientes/",
          { sortl: rutaFiltro }
        );
        if (response.data && response.data.length > 0) {
          todosClientes = todosClientes.concat(response.data.map((cliente) => ({
            ...cliente,
            estado: cliente.estado || "pendiente",
            distancia: cliente.distancia || "0",
            estimadoLlegada: cliente.estimadoLlegada || "",
            sortl: rutaFiltro // <-- Asegura que cada cliente tenga su sortl
          })));
        }
      }
      clientes.value = todosClientes;
      ordenarClientes();
      loading.value = false;
      return;
    } else {
      const username = dropdownValue.value || authStore.user?.Username || "";
      if (!username) return;
      const response = await axios.post(
        "https://calidad-yesentregas-api.yes.com.sv/clientes/",
        { sortl: username }
      );
      if (response.data && response.data.length > 0) {
        clientes.value = response.data.map((cliente) => ({
          ...cliente,
          estado: cliente.estado || "pendiente",
          distancia: cliente.distancia || "0",
          estimadoLlegada: cliente.estimadoLlegada || "",
        }));
      } else {
        clientes.value = [];
      }
    }
    clientesTotales.value = clientes.value.length;
    clientesPendientes.value = clientes.value.filter(
      (c) => c.estado === "pendiente"
    ).length;
    clientesAtendidos.value = clientes.value.filter((c) =>
      ["entregado", "parcial", "no_entregado"].includes(
        (c.estado || "").toLowerCase()
      )
    ).length;
    ordenarClientes();
  } catch (error) {
    clientes.value = [];
    clientesFiltrados.value = [];
    clientesTotales.value = 0;
    clientesPendientes.value = 0;
    clientesAtendidos.value = 0;
  } finally {
    loading.value = false; // Termina cargando
  }
};

const ordenarClientes = () => {
  clientesFiltrados.value = clientes.value
    .filter((cliente) => {
      const nombreCoincide =
        (cliente.NAME1 || "").toLowerCase().includes(searchTerm.value.toLowerCase()) ||
        (cliente.NAME2 || "").toLowerCase().includes(searchTerm.value.toLowerCase());
      return nombreCoincide;
    })
    .sort((a, b) => {
      if (ordenarPor.value === "nombre") {
        return (a.NAME1 || "").localeCompare(b.NAME1 || "");
      } else if (ordenarPor.value === "distancia") {
        return parseFloat(a.distancia) - parseFloat(b.distancia);
      } else {
        return 0;
      }
    });
};

const clientesPorRuta = computed(() => {
  if (
    dropdownValue.value === "Todas las SUP" ||
    dropdownValue.value === "Todas las IGM" ||
    dropdownValue.value === "Todas las SGV" ||
    dropdownValue.value === "Todas las SMG"
  ) {
    const grupos = {};
    clientesFiltrados.value.forEach((cliente) => {
      const subruta = cliente.sortl || cliente.RUTA || "Sin ruta";
      if (!grupos[subruta]) grupos[subruta] = [];
      grupos[subruta].push(cliente);
    });
    // Devuelve un array de objetos en el orden de subrutasOrden
    return subrutasOrden.value
      .filter(subruta => grupos[subruta] && grupos[subruta].length > 0)
      .map(subruta => ({
        subruta,
        clientes: grupos[subruta]
      }));
  } else {
    return null;
  }
});

watch([searchTerm, ordenarPor], () => {
  localStorage.setItem("searchTerm", searchTerm.value);
  localStorage.setItem("ordenarPor", ordenarPor.value);
  ordenarClientes();
});

onMounted(async () => {
  const rutasGuardadas = localStorage.getItem("rutas");
  rutas.value = rutasGuardadas ? JSON.parse(rutasGuardadas) : [];
  // Agrega las opciones especiales al inicio si existen rutas con esos prefijos
  const opcionesEspeciales = [
    { texto: "Todas las SUP", prefijo: "SUP" },
    { texto: "Todas las IGM", prefijo: "IGM" },
    { texto: "Todas las SGV", prefijo: "SGV" },
    { texto: "Todas las SMG", prefijo: "SMG" }, // <-- corregido aquí
  ];
  opcionesEspeciales.reverse().forEach(({ texto, prefijo }) => {
    if (rutas.value.some(r => r.startsWith(prefijo))) {
      rutas.value.unshift(texto);
    }
  });
  dropdownValue.value = localStorage.getItem("dropdownValue") || "";
  await cargarClientes();
});
</script>

<template>
  <div class="grid grid-cols-12 gap-8">
    <div class="col-span-12">
      <!-- Dropdown para seleccionar ruta -->
      <div class="mt-4">
        <Select
          v-model="dropdownValue"
          :options="rutas"
          placeholder="Selecciona la ruta"
          class="w-full p-2 border rounded mb-4"
          @change="cargarClientes"
        />
      </div>
      <div class="mt-4">
        <input
          v-model="searchTerm"
          type="text"
          placeholder="Buscar cliente por nombre..."
          class="w-full p-2 border rounded mb-4"
        />
      </div>

      <div v-if="loading" class="flex justify-center items-center my-8">
        <span class="pi pi-spin pi-spinner mr-2"></span>
        <span class="text-gray-500">Cargando clientes...</span>
      </div>

      <div v-else>
        <div class="font-semibold text-xl mb-4">
          Lista de clientes ruta: {{ dropdownValue || 'No seleccionada' }}
        </div>
        <div class="font-semibold text-xl mb-4">
          Total: <span class="font-bold">{{ clientesFiltrados.length }}</span>
        </div>

        <!-- Si hay agrupación por sub-ruta -->
        <template v-if="clientesPorRuta && clientesPorRuta.length > 0">
          <div v-for="grupo in clientesPorRuta" :key="grupo.subruta" class="mb-8">
            <div class="font-bold text-lg mb-2 text-primary-600">
              {{ grupo.subruta }} <span class="text-gray-500 font-normal">({{ grupo.clientes.length }})</span>
            </div>
            <div class="grid grid-cols-12 gap-4">
              <div
                v-for="cliente in grupo.clientes"
                :key="cliente.KUNNR"
                class="col-span-12 sm:col-span-6 lg:col-span-4 p-2"
              >
                <div
                  class="p-6 border border-surface-200 dark:border-surface-700 bg-surface-0 dark:bg-surface-900 rounded flex flex-col"
                >
                  <div class="flex flex-row justify-between items-start gap-2">
                    <div>
                      <span class="text-lg font-semibold">{{ cliente.NAME1 }}</span>
                      <div class="text-lg font-medium mt-1">
                        {{ cliente.NAME2 }}
                      </div>
                      <div class="text-lg font-medium mt-1">
                        {{ cliente.KUNNR }}
                      </div>
                      <span class="font-medium text-surface-500 dark:text-surface-400 text-sm">
                        Dirección: {{ cliente.STRAS }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </template>

        <!-- Si NO hay agrupación, muestra todos los clientes planos -->
        <template v-else>
          <div class="grid grid-cols-12 gap-4">
            <div
              v-for="cliente in clientesFiltrados"
              :key="cliente.KUNNR"
              class="col-span-12 sm:col-span-6 lg:col-span-4 p-2"
            >
              <div
                class="p-6 border border-surface-200 dark:border-surface-700 bg-surface-0 dark:bg-surface-900 rounded flex flex-col"
              >
                <div class="flex flex-row justify-between items-start gap-2">
                  <div>
                    <span class="text-lg font-semibold">{{ cliente.NAME1 }}</span>
                    <div class="text-lg font-medium mt-1">
                      {{ cliente.NAME2 }}
                    </div>
                    <div class="text-lg font-medium mt-1">
                      {{ cliente.KUNNR }}
                    </div>
                    <span class="font-medium text-surface-500 dark:text-surface-400 text-sm">
                      Dirección: {{ cliente.STRAS }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </template>

        <div v-if="!clientesFiltrados.length" class="text-xl mt-4">
          Seleccione una ruta para visualizar.
        </div>
      </div>
    </div>
  </div>
</template>