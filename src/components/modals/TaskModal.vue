<template>
  <ion-header>
    <ion-toolbar>
      <ion-title>{{ isEdit ? 'Редактирование задачи' : 'Новая задача' }}</ion-title>
      <ion-buttons slot="end">
        <ion-button @click="dismiss">
          <ion-icon slot="icon-only" :icon="closeOutline"></ion-icon>
        </ion-button>
      </ion-buttons>
    </ion-toolbar>
  </ion-header>
  
  <ion-content class="ion-padding">
    <form @submit.prevent="saveTask">
      <ion-list>
        <ion-item>
          <ion-label position="floating">Название <ion-text color="danger">*</ion-text></ion-label>
          <ion-input v-model="taskData.title" required></ion-input>
        </ion-item>
        
        <ion-item>
          <ion-label position="floating">Описание</ion-label>
          <ion-textarea v-model="taskData.description" rows="4"></ion-textarea>
        </ion-item>
        
        <ion-item>
          <ion-label>Приоритет</ion-label>
          <ion-select v-model="taskData.priority" interface="action-sheet">
            <ion-select-option value="low">Низкий</ion-select-option>
            <ion-select-option value="medium">Средний</ion-select-option>
            <ion-select-option value="high">Высокий</ion-select-option>
          </ion-select>
        </ion-item>
        
        <ion-item>
          <ion-label>Срок выполнения</ion-label>
          <ion-datetime v-model="taskData.dueDate" display-format="DD.MM.YYYY HH:mm" picker-format="DD MMM YYYY HH:mm"></ion-datetime>
        </ion-item>
        
        <ion-item>
          <ion-label>Исполнитель</ion-label>
          <ion-select v-model="taskData.assignedTo" interface="action-sheet">
            <ion-select-option :value="null">Не назначено</ion-select-option>
            <ion-select-option v-for="user in users" :key="user.id" :value="user.id">
              {{ user.firstName }} {{ user.lastName }}
            </ion-select-option>
          </ion-select>
        </ion-item>
      </ion-list>
      
      <div class="error-message" v-if="error">{{ error }}</div>
      
      <ion-button expand="block" type="submit" :disabled="loading">
        <ion-spinner v-if="loading" name="crescent"></ion-spinner>
        <span v-else>{{ isEdit ? 'Сохранить изменения' : 'Создать задачу' }}</span>
      </ion-button>
    </form>
  </ion-content>
</template>

<script setup>
import { ref, reactive, onMounted, defineProps, defineEmits } from 'vue';
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
  IonDatetime,
  IonText,
  IonSpinner,
  toastController
} from '@ionic/vue';
import { closeOutline } from 'ionicons/icons';
import { taskService } from '@/services/api';

const props = defineProps({
  task: {
    type: Object,
    default: null
  }
});

const emit = defineEmits(['dismiss', 'taskSaved']);

const isEdit = ref(!!props.task);
const loading = ref(false);
const error = ref('');
const users = ref([]);

const taskData = reactive({
  title: props.task?.title || '',
  description: props.task?.description || '',
  priority: props.task?.priority || 'medium',
  dueDate: props.task?.dueDate || new Date(new Date().getTime() + 86400000).toISOString(), // завтра по умолчанию
  assignedTo: props.task?.assignedTo || null
});

onMounted(async () => {
  try {
    // В реальном приложении здесь будет загрузка списка пользователей
    // Для теста используем моки
    users.value = [
      { id: 1, firstName: 'Иван', lastName: 'Иванов' },
      { id: 2, firstName: 'Петр', lastName: 'Петров' },
      { id: 3, firstName: 'Анна', lastName: 'Сидорова' }
    ];
  } catch (err) {
    console.error('Ошибка загрузки пользователей:', err);
  }
});

// Функция закрытия модального окна с передачей данных
const dismissWithData = (data) => {
  // Отправляем событие с данными
  emit('taskSaved', data);
  
  // Закрываем модальное окно
  try {
    // Используем глобальный метод для закрытия верхнего модального окна
    document.querySelector('ion-modal:last-of-type')?.dismiss(data);
  } catch (error) {
    console.error('Ошибка при закрытии модального окна с данными:', error);
  }
};

const saveTask = async () => {
  if (!taskData.title) {
    error.value = 'Название задачи обязательно для заполнения';
    return;
  }
  
  loading.value = true;
  error.value = '';
  
  try {
    // Проверка наличия токена
    const token = localStorage.getItem('token');
    if (!token) {
      error.value = 'Токен авторизации отсутствует. Выполните вход в систему.';
      showToast(error.value, 'danger');
      return;
    }
    
    console.log('Токен авторизации:', token);
    
    let response;
    
    if (isEdit.value) {
      response = await taskService.updateTask(props.task.id, taskData);
      showToast('Задача успешно обновлена', 'success');
    } else {
      response = await taskService.createTask(taskData);
      showToast('Задача успешно создана', 'success');
    }
    
    // Вместо раздельных вызовов emit и dismiss, используем одну функцию
    dismissWithData(response.data);
  } catch (err) {
    error.value = err.response?.data?.message || 'Ошибка при сохранении задачи';
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

ion-datetime {
  width: 100%;
}
</style>
