<template>
  <ion-header>
    <ion-toolbar>
      <ion-title>{{ isEdit ? 'Редактирование документа' : 'Загрузка документа' }}</ion-title>
      <ion-buttons slot="end">
        <ion-button @click="dismiss">
          <ion-icon slot="icon-only" :icon="closeOutline"></ion-icon>
        </ion-button>
      </ion-buttons>
    </ion-toolbar>
  </ion-header>
  
  <ion-content class="ion-padding">
    <form @submit.prevent="saveDocument">
      <ion-list>
        <ion-item>
          <ion-label position="floating">Название <ion-text color="danger">*</ion-text></ion-label>
          <ion-input v-model="documentData.title" required></ion-input>
        </ion-item>
        
        <ion-item>
          <ion-label position="floating">Описание</ion-label>
          <ion-textarea v-model="documentData.description" rows="3"></ion-textarea>
        </ion-item>
        
        <ion-item>
          <ion-label>Категория</ion-label>
          <ion-select v-model="documentData.category" interface="action-sheet">
            <ion-select-option value="orders">Приказы</ion-select-option>
            <ion-select-option value="reports">Отчеты</ion-select-option>
            <ion-select-option value="methodical">Методические материалы</ion-select-option>
            <ion-select-option value="regulations">Положения</ion-select-option>
            <ion-select-option value="other">Прочее</ion-select-option>
          </ion-select>
        </ion-item>
        
        <ion-item v-if="!isEdit">
          <div class="file-upload-container">
            <ion-button expand="block" color="medium" @click="selectFile" class="file-select-button">
              <ion-icon slot="start" :icon="cloudUploadOutline"></ion-icon>
              {{ selectedFile ? 'Файл выбран' : 'Выбрать файл' }}
            </ion-button>
            <input type="file" ref="fileInput" @change="handleFileSelection" style="display: none" />
            <div v-if="selectedFile" class="selected-file-info">
              <ion-icon :icon="documentOutline"></ion-icon>
              <span>{{ selectedFile.name }}</span>
              <div class="file-size">{{ formatFileSize(selectedFile.size) }}</div>
            </div>
          </div>
        </ion-item>
      </ion-list>
      
      <div class="error-message" v-if="error">{{ error }}</div>
      
      <ion-button expand="block" type="submit" :disabled="loading || (!isEdit && !selectedFile)">
        <ion-spinner v-if="loading" name="crescent"></ion-spinner>
        <span v-else>{{ isEdit ? 'Сохранить изменения' : 'Загрузить документ' }}</span>
      </ion-button>
    </form>
  </ion-content>
</template>

<script setup>
import { ref, reactive, defineProps, defineEmits, computed } from 'vue';
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
import { closeOutline, cloudUploadOutline, documentOutline } from 'ionicons/icons';
import { useDocumentsStore } from '@/store/documents';

const props = defineProps({
  document: {
    type: Object,
    default: null
  }
});

const emit = defineEmits(['dismiss', 'documentSaved']);

const documentsStore = useDocumentsStore();
const isEdit = ref(!!props.document);
const loading = ref(false);
const error = ref('');
const fileInput = ref(null);
const selectedFile = ref(null);

// Получаем категории документов из хранилища
const documentCategories = computed(() => documentsStore.documentTypes?.categories || []);

const documentData = reactive({
  title: props.document?.title || '',
  description: props.document?.description || '',
  category: props.document?.category || 'other'
});

const selectFile = () => {
  fileInput.value.click();
};

const handleFileSelection = (event) => {
  const file = event.target.files[0];
  if (file) {
    selectedFile.value = file;
    
    // Если название не заполнено, используем имя файла
    if (!documentData.title) {
      documentData.title = file.name.split('.')[0];
    }
  }
};

const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Байт';
  
  const k = 1024;
  const sizes = ['Байт', 'КБ', 'МБ', 'ГБ'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Функция закрытия модального окна с передачей данных
const dismissWithData = (data) => {
  // Отправляем событие с данными
  emit('documentSaved', data);
  
  // Закрываем модальное окно
  try {
    // Используем глобальный метод для закрытия верхнего модального окна
    document.querySelector('ion-modal:last-of-type')?.dismiss(data);
  } catch (error) {
    console.error('Ошибка при закрытии модального окна с данными:', error);
  }
};

const saveDocument = async () => {
  if (!documentData.title) {
    error.value = 'Название документа обязательно для заполнения';
    return;
  }
  
  if (!isEdit.value && !selectedFile.value) {
    error.value = 'Необходимо выбрать файл для загрузки';
    return;
  }
  
  loading.value = true;
  error.value = '';
  
  try {
    let response;
    
    if (isEdit.value) {
      // Обновляем документ через хранилище Pinia
      response = await documentsStore.updateDocument(props.document.id, documentData);
      showToast('Документ успешно обновлен', 'success');
    } else {
      // Создаем объект FormData для правильной загрузки файлов
      const formData = new FormData();
      
      // Добавляем текстовые поля
      formData.append('title', documentData.title);
      formData.append('description', documentData.description);
      formData.append('category', documentData.category);
      
      // Добавляем файл
      formData.append('file', selectedFile.value, selectedFile.value.name);
      
      // Загружаем документ через хранилище Pinia
      response = await documentsStore.uploadDocument(formData);
      showToast('Документ успешно загружен', 'success');
    }
    
    // Вместо раздельных вызовов emit и dismiss, используем одну функцию
    dismissWithData(response);
  } catch (err) {
    error.value = err.response?.data?.message || 'Ошибка при сохранении документа';
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

.file-upload-container {
  width: 100%;
  padding: 10px 0;
}

.file-select-button {
  margin-bottom: 10px;
}

.selected-file-info {
  display: flex;
  align-items: center;
  background-color: var(--ion-color-light);
  padding: 8px 12px;
  border-radius: 8px;
  margin-top: 8px;
}

.selected-file-info ion-icon {
  margin-right: 8px;
  font-size: 20px;
  color: var(--ion-color-medium);
}

.file-size {
  margin-left: auto;
  font-size: 12px;
  color: var(--ion-color-medium);
}
</style>
