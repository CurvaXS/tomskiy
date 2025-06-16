import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';

// Ionic Framework
import { IonicVue } from '@ionic/vue';

// Ionic CSS
import '@ionic/vue/css/core.css';
import '@ionic/vue/css/normalize.css';
import '@ionic/vue/css/structure.css';
import '@ionic/vue/css/typography.css';

// Optional CSS utilities
import '@ionic/vue/css/padding.css';
import '@ionic/vue/css/float-elements.css';
import '@ionic/vue/css/text-alignment.css';
import '@ionic/vue/css/text-transformation.css';
import '@ionic/vue/css/flex-utils.css';
import '@ionic/vue/css/display.css';

// Theme variables
import './assets/theme/variables.css';

const app = createApp(App)
  .use(IonicVue, {
    mode: 'md' // Используем Material Design в качестве базового дизайна
  })
  .use(createPinia())
  .use(router);
  
router.isReady().then(() => {
  app.mount('#app');
});
