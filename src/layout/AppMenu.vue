<script setup>
import { ref } from "vue";
import AppMenuItem from "./AppMenuItem.vue";

const model = ref([
  {
    label: "Home",
    items: [
      {
        label: "Dashboard",
        icon: "pi pi-fw pi-home",
        to: { name: "dashboard" },
      },
      {
        label: "Lista de entregas",
        icon: "pi pi-fw pi-check-square",
        to: { name: "listadeentregas" },
      },
      {
        label: "Control-Cestas",
        icon: "pi pi-fw pi-shopping-cart",
        to: { name: "control-cestas" },
      },
      {
        label: "Logs de actividades",
        icon: "pi pi-fw pi-copy",
        to: { name: "log-actividades" },
      },
      
    ],
  },
  
]);
</script>

<template>
  <ul class="layout-menu">
    <template v-for="(item, i) in model" :key="item.label">
      <app-menu-item
        v-if="!item.separator"
        :item="item"
        :index="i"
      ></app-menu-item>
      <li v-if="item.separator" class="menu-separator"></li>
    </template>
  </ul>
</template>

<style lang="scss" scoped></style>