import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import('../views/Home.vue'),
  },
  {
    path: '/productos',
    name: 'Productos',
    component: () => import('../views/Productos.vue'),
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('../Admin/Login.vue'),
    meta: {
      layout: 'admin',
    },
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: () => import('../Admin/Dashboard.vue'),
    meta: {
      layout: 'admin',
    },
    children: [
      {
        path: '',
        redirect: { name: 'Agenda' },
      },
      {
        path: 'agenda',
        name: 'Agenda',
        component: () => import('../Admin/AgendaView.vue'),
      },
      // Add the rest of the sidebar sections as they get built:
      // { path: 'reportes', name: 'reportes', component: () => import('@/views/reportes/ReportesView.vue') },
      // { path: 'clientes', name: 'clientes', component: () => import('@/views/clientes/ClientesView.vue') },
      // { path: 'empleados', name: 'empleados', component: () => import('@/views/empleados/EmpleadosView.vue') },
      // { path: 'productos', name: 'productos', component: () => import('@/views/productos/ProductosView.vue') },
      // { path: 'horarios', name: 'horarios', component: () => import('@/views/horarios/HorariosView.vue') },
    ],
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,

  scrollBehavior(to, from, savedPosition) {
    if (to.hash) {
      const el = document.querySelector(to.hash)

      if (el) {
        return {
          el,
          behavior: 'smooth',
        }
      }
    }

    if (savedPosition) {
      return savedPosition
    }

    return { top: 0 }
  },
})

export default router