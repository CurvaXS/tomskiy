<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Вход в систему</ion-title>
      </ion-toolbar>
    </ion-header>
    
    <ion-content class="ion-padding">
      <div class="login-container">
        <div class="logo-container">
          <img src="@/assets/logo.webp" alt="Логотип" class="logo" />
          <h2>Образовательный портал</h2>
          <p>Вход для сотрудников образовательного учреждения</p>
        </div>
        
        <form @submit.prevent="login" class="login-form">
          <ion-list>
            <ion-item>
              <ion-label position="floating">Email</ion-label>
              <ion-input v-model="email" type="email" required></ion-input>
            </ion-item>
            
            <ion-item>
              <ion-label position="floating">Пароль</ion-label>
              <ion-input v-model="password" type="password" required></ion-input>
            </ion-item>
          </ion-list>
          
          <div class="error-message" v-if="error">{{ error }}</div>
          
          <ion-button expand="block" type="submit" :disabled="loading">
            <ion-spinner v-if="loading" name="crescent"></ion-spinner>
            <span v-else>Войти</span>
          </ion-button>
          
          <div class="login-footer">
            <ion-button fill="clear" size="small" router-link="/forgot-password">
              Забыли пароль?
            </ion-button>
            <ion-button fill="clear" size="small" router-link="/register">
              нет аккаунта?
            </ion-button>
          </div>
        </form>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { 
  IonPage, 
  IonHeader, 
  IonToolbar, 
  IonTitle, 
  IonContent, 
  IonList, 
  IonItem, 
  IonLabel, 
  IonInput, 
  IonButton,
  IonSpinner,
  toastController
} from '@ionic/vue';
import { useAuthStore } from '@/store/auth';

const router = useRouter();
const authStore = useAuthStore();

const email = ref('');
const password = ref('');
const error = ref('');
const loading = ref(false);

const login = async () => {
  if (!email.value || !password.value) {
    error.value = 'Пожалуйста, заполните все поля';
    return;
  }

  loading.value = true;
  try {
    await authStore.login({
      email: email.value,
      password: password.value
    });
    
    // Показываем успешное сообщение
    const toast = await toastController.create({
      message: 'Вход выполнен успешно!',
      duration: 2000,
      position: 'bottom',
      color: 'success'
    });
    await toast.present();
    
    // Перенаправляем на главную страницу
    router.push('/dashboard');
  } catch (err) {
    error.value = err.response?.data?.message || 'Ошибка при входе в систему';
    
    // Показываем сообщение об ошибке
    const toast = await toastController.create({
      message: error.value,
      duration: 3000,
      position: 'bottom',
      color: 'danger'
    });
    await toast.present();
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.login-container {
  max-width: 400px;
  margin: 0 auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  height: 100%;
  justify-content: center;
}

.logo-container {
  text-align: center;
  margin-bottom: 30px;
}

.logo {
  width: 100px;
  height: 100px;
  margin-bottom: 15px;
}

.login-form {
  width: 100%;
}

.error-message {
  color: var(--ion-color-danger);
  margin: 10px 0;
  font-size: 14px;
}

.login-footer {
  margin-top: 20px;
  text-align: center;
}

ion-button {
  margin-top: 20px;
}
</style>
