// src/plugins/configPlugin.js
import { globalConfig, initConfig } from '@/config/config.js'

export default {
  install(app) {
    app.config.globalProperties.$config = globalConfig
    initConfig() // comienza a escuchar Firestore apenas inicia la app
  },
}
