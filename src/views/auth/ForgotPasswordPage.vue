<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/login"></ion-back-button>
        </ion-buttons>
        <ion-title>Восстановление пароля</ion-title>
      </ion-toolbar>
    </ion-header>
    
    <ion-content class="ion-padding">
      <div class="forgot-password-container">
        <h2>Восстановление доступа</h2>
        <p>Введите ваш email для получения инструкций по сбросу пароля</p>
        
        <form @submit.prevent="sendResetRequest" class="forgot-password-form">
          <ion-list>
            <ion-item>
              <ion-label position="floating">Email</ion-label>
              <ion-input v-model="email" type="email" required></ion-input>
            </ion-item>
          </ion-list>
          
          <div class="error-message" v-if="error">{{ error }}</div>
          <div class="success-message" v-if="success">{{ success }}</div>
          
          <ion-button expand="block" type="submit" :disabled="loading">
            <ion-spinner v-if="loading" name="crescent"></ion-spinner>
            <span v-else>Отправить</span>
          </ion-button>
          
          <div class="forgot-password-footer">
            <ion-button fill="clear" size="small" router-link="/login">
              Вернуться к входу
            </ion-button>
          </div>
        </form>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup>
import { ref } from 'vue';
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
  IonButtons,
  IonBackButton,
  toastController
} from '@ionic/vue';
import { useAuthStore } from '@/store/auth';

const authStore = useAuthStore();

const email = ref('');
const error = ref('');
const success = ref('');
const loading = ref(false);

const sendResetRequest = async () => {
  if (!email.value) {
    error.value = 'Пожалуйста, введите email';
    return;
  }

  loading.value = true;
  error.value = '';
  success.value = '';
  
  try {
    await authStore.forgotPassword(email.value);
    success.value = 'Инструкции по восстановлению пароля отправлены на ваш email';
    
    // Показываем успешное сообщение
    const toast = await toastController.create({
      message: success.value,
      duration: 3000,
      position: 'bottom',
      color: 'success'
    });
    await toast.present();
    
    // Очищаем форму
    email.value = '';
  } catch (err) {
    error.value = err.response?.data?.message || 'Произошла ошибка при отправке запроса';
    
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
.forgot-password-container {
  max-width: 400px;
  margin: 0 auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  height: 100%;
  justify-content: center;
}

.forgot-password-form {
  width: 100%;
}

.error-message {
  color: var(--ion-color-danger);
  margin: 10px 0;
  font-size: 14px;
}

.success-message {
  color: var(--ion-color-success);
  margin: 10px 0;
  font-size: 14px;
}

.forgot-password-footer {
  margin-top: 20px;
  text-align: center;
}

ion-button {
  margin-top: 20px;
}
</style>
