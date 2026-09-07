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
      { path: 'reportes', name: 'reportes', component: () => import('../Admin/ReportView.vue') },
      { path: 'clientes', name: 'clientes', component: () => import('../Admin/ClientsView.vue') },
      { path: 'empleados', name: 'empleados', component: () => import('../Admin/EmpleadosView.vue') },
      // { path: 'productos', name: 'productos', component: () => import('@/views/productos/ProductosView.vue') },
      { path: 'horarios', name: 'horarios', component: () => import('../Admin/TimeView.vue') },
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
