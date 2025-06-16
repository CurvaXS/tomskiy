<template>
  <ion-page>
    <ion-tabs>
      <ion-router-outlet></ion-router-outlet>
      <ion-tab-bar slot="bottom">
        <ion-tab-button tab="dashboard" href="/dashboard">
          <ion-icon :icon="homeOutline"></ion-icon>
          <ion-label>Главная</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="schedule" href="/schedule">
          <ion-icon :icon="calendarOutline"></ion-icon>
          <ion-label>Расписание</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="tasks" href="/tasks">
          <ion-icon :icon="checkboxOutline"></ion-icon>
          <ion-label>Задачи</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="documents" href="/documents">
          <ion-icon :icon="documentOutline"></ion-icon>
          <ion-label>Документы</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="chat" href="/chat">
          <ion-icon :icon="chatbubblesOutline"></ion-icon>
          <ion-label>Чат</ion-label>
        </ion-tab-button>
      </ion-tab-bar>
    </ion-tabs>
  </ion-page>
</template>

<script setup>
import { 
  IonPage, 
  IonTabs, 
  IonTabBar, 
  IonTabButton, 
  IonIcon, 
  IonLabel, 
  IonRouterOutlet 
} from '@ionic/vue';
import { 
  homeOutline, 
  calendarOutline, 
  checkboxOutline, 
  documentOutline, 
  chatbubblesOutline 
} from 'ionicons/icons';
import { onMounted } from 'vue';
import { useAuthStore } from '@/store/auth';

const authStore = useAuthStore();

onMounted(async () => {
  // Загружаем информацию о текущем пользователе при монтировании
  try {
    await authStore.fetchCurrentUser();
  } catch (error) {
    console.error('Failed to fetch user data:', error);
  }
});
</script>

<style scoped>
/* Стили для компонента MainLayout */
ion-tab-bar {
  --background: var(--ion-color-light);
  border-top: 1px solid var(--ion-color-light-shade);
}

ion-tab-button {
  --color: var(--ion-color-medium);
  --color-selected: var(--ion-color-primary);
}
</style>
