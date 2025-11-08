import { createApp } from 'vue'
import App from './App.vue'
import './global.css'
import configPlugin from './plugins/configPlugin'

const app = createApp(App)

// Carga la configuración global y escucha cambios en tiempo real
app.use(configPlugin)

app.mount('#app')
