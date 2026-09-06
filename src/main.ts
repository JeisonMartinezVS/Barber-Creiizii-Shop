/* eslint-disable @typescript-eslint/ban-ts-comment */
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './global.css'
// @ts-expect-error
import configPlugin from './plugins/configPlugin'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
// Carga la configuración global y escucha cambios en tiempo real
app.use(configPlugin)

app.mount('#app')
