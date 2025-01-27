import { useAuthStore } from '@/api-plugins/authStores';
import AppLayout from '@/layout/AppLayout.vue';
import { createRouter, createWebHistory } from 'vue-router';

const routes = [
    {
        path: '/',
        redirect: '/auth/login' // Redirige a la ruta del login
    },
    {
        path: '/auth/login',
        name: 'login',
        component: () => import('@/views/pages/auth/Login.vue') // Ruta al login
    },
    {
        path: '/',
        component: AppLayout,
        meta: { requiresAuth: true },
        children: [
            {
                path: 'dashboard',
                name: 'dashboard',
                component: () => import('@/views/Dashboard.vue'),
                meta: { requiresAuth: true}
            },
            {
                path: 'control-cestas', // Nueva ruta para la vista de entregas
                name: 'control-cestas',
                component: () => import('@/views/ControlCestas.vue'), // Ruta a la vista de entregas
                meta: { requiresAuth: true}
            },
            {
                path: 'log-actividades', // Nueva ruta para la vista de entregas
                name: 'log-actividades',
                component: () => import('@/views/LogsDeActividades.vue'), // Ruta a la vista de entregas
                meta: { requiresAuth: true}
            },

        ]
    }
];

const router = createRouter({
    history: createWebHistory(),
    routes
});

export default router;