import {createRouter, createWebHistory} from 'vue-router'
import HomeView from '../views/home_admin.vue'


const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes: [
        {
            path: '/',
            redirect: '/login'
        },
        {
            path: '/login',
            name: 'login',
            component: () => import('../views/Login.vue'),
        },
        {
            path: '/home_admin',
            name: 'homeAdmin',
            component: () => import('../views/home_admin.vue'),
        },
        {
            path: '/register',
            name: 'register',
            component: () => import('../views/LoginRegister.vue'),
        },
        {
            path: '/user_control',
            name: 'user_control',
            component: () => import('../views/user_control.vue'),
        },
        {
            path: '/system/detail/1',
            name: 'userController',
            component: () => import('@/views/user_control.vue')
        },
        {
            path: '/profile',
            name: 'profile',
            component: () => import('@/views/profile.vue')
        }
    ],
})

export default router
