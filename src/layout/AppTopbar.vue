<script setup>
import { ref, onMounted, computed } from 'vue'; // Importa ref, onMounted y computed para manejar el estado reactivo
import { useAuthStore } from '@/api-plugins/authStores.js'; // Importa el store de autenticación
import { useLayout } from '@/layout/composables/layout';
import AppConfigurator from './AppConfigurator.vue';

const authStore = useAuthStore(); // Instanciamos el store de autenticación
const { toggleMenu, toggleDarkMode, isDarkTheme, defaultSwal } = useLayout();

// Lógica para manejar el logout
const handleLogout = () => {
    authStore.logout(); // Llama a la acción logout del store
};
</script>

<template>
    <div class="layout-topbar">
        <div class="layout-topbar-logo-container">
            <button class="layout-menu-button layout-topbar-action" @click="toggleMenu">
                <i class="pi pi-bars"></i>
            </button>
            <router-link to="/dashboard" class="layout-topbar-logo">
                <span>Dashboard entregas</span>
            </router-link>
        </div>

        <div class="layout-topbar-actions">
            <div class="layout-config-menu">
                <AppConfigurator />
                <div class="relative">
                    <button type="button" class="layout-topbar-action btn btn-danger" @click="handleLogout">
                        <i class="pi pi-power-off"></i>
                        <span class="ml-2">Cerrar Sesión</span>
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>