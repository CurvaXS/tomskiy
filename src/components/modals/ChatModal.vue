<template>
  <ion-header>
    <ion-toolbar>
      <ion-title>Новый чат</ion-title>
      <ion-buttons slot="end">
        <ion-button @click="dismiss">
          <ion-icon slot="icon-only" :icon="closeOutline"></ion-icon>
        </ion-button>
      </ion-buttons>
    </ion-toolbar>
  </ion-header>
  
  <ion-content class="ion-padding">
    <form @submit.prevent="createChat">
      <ion-list>
        <ion-item>
          <ion-label>Тип чата</ion-label>
          <ion-select v-model="chatData.type" interface="action-sheet">
            <ion-select-option value="private">Личный чат</ion-select-option>
            <ion-select-option value="group">Групповой чат</ion-select-option>
          </ion-select>
        </ion-item>
        
        <ion-item v-if="chatData.type === 'group'">
          <ion-label position="floating">Название чата <ion-text color="danger">*</ion-text></ion-label>
          <ion-input v-model="chatData.name" required></ion-input>
        </ion-item>
        
        <ion-item v-if="chatData.type === 'private'">
          <ion-label>Выберите пользователя</ion-label>
          <ion-select v-model="chatData.participant" interface="action-sheet">
            <ion-select-option v-for="user in users" :key="user.id" :value="user.id">
              {{ user.firstName }} {{ user.lastName }}
            </ion-select-option>
          </ion-select>
        </ion-item>
        
        <ion-item v-if="chatData.type === 'group'">
          <ion-label>Участники</ion-label>
          <ion-select v-model="chatData.participants" multiple interface="action-sheet">
            <ion-select-option v-for="user in users" :key="user.id" :value="user.id">
              {{ user.firstName }} {{ user.lastName }}
            </ion-select-option>
          </ion-select>
        </ion-item>
        
        <ion-item v-if="chatData.type === 'group'">
          <ion-label position="floating">Описание группы</ion-label>
          <ion-textarea v-model="chatData.description" rows="3"></ion-textarea>
        </ion-item>
      </ion-list>
      
      <div class="error-message" v-if="error">{{ error }}</div>
      
      <ion-button expand="block" type="submit" :disabled="loading || !isValid">
        <ion-spinner v-if="loading" name="crescent"></ion-spinner>
        <span v-else>Создать чат</span>
      </ion-button>
    </form>
  </ion-content>
</template>

<script setup>
import { ref, reactive, computed, onMounted, defineEmits } from 'vue';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonList,
  IonItem,
  IonLabel,
  IonInput,
  IonTextarea,
  IonSelect,
  IonSelectOption,
  IonButtons,
  IonButton,
  IonIcon,
  IonText,
  IonSpinner,
  toastController
} from '@ionic/vue';
import { closeOutline } from 'ionicons/icons';
import { chatService } from '@/services/api';
import { useAuthStore } from '@/store/auth';

const emit = defineEmits(['dismiss', 'chatCreated']);

const authStore = useAuthStore();
const loading = ref(false);
const error = ref('');
const users = ref([]);

const chatData = reactive({
  type: 'private',
  name: '',
  description: '',
  participant: null, // для личного чата
  participants: [] // для группового чата
});

const isValid = computed(() => {
  if (chatData.type === 'private') {
    // Проверяем, что выбран пользователь и что это действительно число (ID)
    return chatData.participant !== null && chatData.participant !== undefined;
  } else {
    return chatData.name && chatData.participants.length > 0;
  }
});

onMounted(async () => {
  try {
    // В реальном приложении здесь будет загрузка списка пользователей
    // Для теста используем моки
    users.value = [
      { id: 1, firstName: 'Иван', lastName: 'Иванов' },
      { id: 2, firstName: 'Петр', lastName: 'Петров' },
      { id: 3, firstName: 'Анна', lastName: 'Сидорова' },
      { id: 4, firstName: 'Екатерина', lastName: 'Смирнова' },
      { id: 5, firstName: 'Михаил', lastName: 'Кузнецов' }
    ];
  } catch (err) {
    console.error('Ошибка загрузки пользователей:', err);
  }
});

// Функция закрытия модального окна с передачей данных
const dismissWithData = (data) => {
  // Отправляем событие с данными
  emit('chatCreated', data);
  
  // Закрываем модальное окно
  try {
    // Используем глобальный метод для закрытия верхнего модального окна
    document.querySelector('ion-modal:last-of-type')?.dismiss(data);
  } catch (error) {
    console.error('Ошибка при закрытии модального окна с данными:', error);
  }
};

const createChat = async () => {
  if (!isValid.value) {
    if (chatData.type === 'private' && !chatData.participant) {
      error.value = 'Выберите пользователя для чата';
    } else if (chatData.type === 'group') {
      if (!chatData.name) {
        error.value = 'Название группы обязательно для заполнения';
      } else if (chatData.participants.length === 0) {
        error.value = 'Добавьте хотя бы одного участника в группу';
      }
    }
    return;
  }
  
  loading.value = true;
  error.value = '';
  
  try {
    const payload = {
      type: chatData.type
    };
    
    if (chatData.type === 'private') {
      // Для личного чата проверяем, что участник выбран и передаем его в массиве
      if (chatData.participant === null || chatData.participant === undefined) {
        error.value = 'Выберите пользователя для чата';
        loading.value = false;
        return;
      }
      payload.members = [chatData.participant]; // Используем members вместо participants, чтобы соответствовать бэкенду
    } else {
      payload.name = chatData.name;
      payload.description = chatData.description;
      payload.members = chatData.participants; // Используем members вместо participants
    }
    
    const response = await chatService.createChat(payload);
    showToast('Чат успешно создан', 'success');
    // Вместо раздельных вызовов emit и dismiss, используем одну функцию
    dismissWithData(response.data);
  } catch (err) {
    error.value = err.response?.data?.message || 'Ошибка при создании чата';
    showToast(error.value, 'danger');
  } finally {
    loading.value = false;
  }
};

const showToast = async (message, color = 'primary') => {
  const toast = await toastController.create({
    message,
    duration: 3000,
    position: 'bottom',
    color
  });
  
  await toast.present();
};

// Функция закрытия модального окна без данных
const dismiss = () => {
  // Отправляем событие dismiss
  emit('dismiss');
  
  // Используем контроллер модальных окон Ionic для закрытия текущего окна
  try {
    // Используем глобальный метод для закрытия верхнего модального окна
    document.querySelector('ion-modal:last-of-type')?.dismiss();
  } catch (error) {
    console.error('Ошибка при закрытии модального окна:', error);
  }
};
</script>

<style scoped>
.error-message {
  color: var(--ion-color-danger);
  margin: 16px 0;
  font-size: 14px;
}
</style>
