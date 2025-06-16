<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/login"></ion-back-button>
        </ion-buttons>
        <ion-title>Регистрация</ion-title>
      </ion-toolbar>
    </ion-header>
    
    <ion-content class="ion-padding">
      <div class="register-container">
        <h2>Создание учетной записи</h2>
        <p>Выберите тип учетной записи и заполните необходимые данные</p>
        
        <form @submit.prevent="register" class="register-form">
          <ion-list>
            <ion-item>
              <ion-label position="floating">Имя</ion-label>
              <ion-input v-model="formData.firstName" required></ion-input>
            </ion-item>
            
            <ion-item>
              <ion-label position="floating">Фамилия</ion-label>
              <ion-input v-model="formData.lastName" required></ion-input>
            </ion-item>
            
            <ion-item>
              <ion-label position="floating">Email</ion-label>
              <ion-input v-model="formData.email" type="email" required></ion-input>
            </ion-item>
            
            <ion-item>
              <ion-label position="floating">Пароль</ion-label>
              <ion-input v-model="formData.password" type="password" required minlength="8"></ion-input>
            </ion-item>
            
            <ion-item>
              <ion-label position="floating">Подтверждение пароля</ion-label>
              <ion-input v-model="formData.confirmPassword" type="password" required></ion-input>
            </ion-item>
            
            <ion-item>
              <ion-label>Тип учетной записи</ion-label>
              <ion-select v-model="formData.role" interface="action-sheet" required>
                <ion-select-option value="teacher">Преподаватель</ion-select-option>
                <ion-select-option value="staff">Персонал</ion-select-option>
              </ion-select>
            </ion-item>
            
            <!-- Дополнительные поля для преподавателей -->
            <div v-if="formData.role === 'teacher'">
              <ion-item>
                <ion-label position="floating">Кафедра</ion-label>
                <ion-input v-model="formData.department" required></ion-input>
              </ion-item>
              
              <ion-item>
                <ion-label position="floating">Должность</ion-label>
                <ion-input v-model="formData.position" required></ion-input>
              </ion-item>
            </div>
            
            <!-- Дополнительные поля для персонала -->
            <div v-if="formData.role === 'staff'">
              <ion-item>
                <ion-label position="floating">Отдел</ion-label>
                <ion-input v-model="formData.department" required></ion-input>
              </ion-item>
              
              <ion-item>
                <ion-label position="floating">Должность</ion-label>
                <ion-input v-model="formData.position" required></ion-input>
              </ion-item>
            </div>
          </ion-list>
          
          <div class="error-message" v-if="error">{{ error }}</div>
          
          <ion-button expand="block" type="submit" :disabled="loading">
            <ion-spinner v-if="loading" name="crescent"></ion-spinner>
            <span v-else>Зарегистрироваться</span>
          </ion-button>
          
          <div class="register-footer">
            <ion-button fill="clear" size="small" router-link="/login">
              Уже есть аккаунт? Войти
            </ion-button>
          </div>
        </form>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup>
import { ref, reactive } from 'vue';
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
  IonButtons,
  IonBackButton,
  IonSelect,
  IonSelectOption,
  toastController
} from '@ionic/vue';
import { useAuthStore } from '@/store/auth';

const router = useRouter();
const authStore = useAuthStore();

const formData = reactive({
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  confirmPassword: '',
  role: 'teacher',
  department: '',
  position: '',
  phone: ''
});

const error = ref('');
const loading = ref(false);

const register = async () => {
  // Валидация формы
  if (!formData.firstName || !formData.lastName || !formData.email || !formData.password || !formData.confirmPassword) {
    error.value = 'Пожалуйста, заполните все поля';
    return;
  }
  
  if (formData.password !== formData.confirmPassword) {
    error.value = 'Пароли не совпадают';
    return;
  }
  
  if (formData.password.length < 8) {
    error.value = 'Пароль должен содержать не менее 8 символов';
    return;
  }

  loading.value = true;
  error.value = '';
  
  try {
    await authStore.register({
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      password: formData.password,
      role: formData.role,
      department: formData.department,
      position: formData.position,
      phone: formData.phone
    });
    
    // Показываем успешное сообщение
    const toast = await toastController.create({
      message: 'Регистрация успешно завершена! Теперь вы можете войти в систему.',
      duration: 3000,
      position: 'bottom',
      color: 'success'
    });
    await toast.present();
    
    // Перенаправляем на страницу входа
    router.push('/login');
  } catch (err) {
    error.value = err.response?.data?.message || 'Ошибка при регистрации';
    
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
.register-container {
  max-width: 400px;
  margin: 0 auto;
  padding: 20px;
}

.register-form {
  width: 100%;
}

.error-message {
  color: var(--ion-color-danger);
  margin: 10px 0;
  font-size: 14px;
}

.register-footer {
  margin-top: 20px;
  text-align: center;
}

ion-button {
  margin-top: 20px;
}
</style>
