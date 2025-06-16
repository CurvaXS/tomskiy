<template>
  <ion-header>
    <ion-toolbar>
      <ion-title>Документы события</ion-title>
      <ion-buttons slot="end">
        <ion-button @click="dismiss">
          <ion-icon slot="icon-only" :icon="closeOutline"></ion-icon>
        </ion-button>
      </ion-buttons>
    </ion-toolbar>
  </ion-header>

  <ion-content class="ion-padding">
    <div class="event-info">
      <h2>{{ event.title }}</h2>
      <p>{{ formatDateTime(event.startTime) }} - {{ formatDateTime(event.endTime) }}</p>
    </div>

    <!-- Список прикрепленных документов -->
    <div v-if="loading" class="loading-container">
      <ion-spinner></ion-spinner>
      <p>Загрузка документов...</p>
    </div>
    <div v-else>
      <ion-list v-if="attachedDocuments.length > 0">
        <ion-list-header>Прикрепленные документы</ion-list-header>
        <ion-item v-for="doc in attachedDocuments" :key="doc.id" class="document-item">
          <ion-icon :icon="documentIcon(doc)" slot="start" class="document-icon"></ion-icon>
          <ion-label>
            <h2>{{ doc.title }}</h2>
            <p class="document-meta">{{ formatFileSize(doc.fileSize) }} | {{ doc.mimeType }}</p>
            <p v-if="doc.note" class="document-note">{{ doc.note }}</p>
          </ion-label>
          <ion-buttons slot="end">
            <ion-button fill="clear" @click="viewDocument(doc)">
              <ion-icon slot="icon-only" :icon="eyeOutline"></ion-icon>
            </ion-button>
            <ion-button fill="clear" @click="editNote(doc)">
              <ion-icon slot="icon-only" :icon="createOutline"></ion-icon>
            </ion-button>
            <ion-button fill="clear" color="danger" @click="confirmDetach(doc)">
              <ion-icon slot="icon-only" :icon="trashOutline"></ion-icon>
            </ion-button>
          </ion-buttons>
        </ion-item>
      </ion-list>
      <div v-else class="empty-state">
        <ion-icon :icon="documentOutline" class="empty-icon"></ion-icon>
        <p>К этому событию еще не прикреплены документы</p>
      </div>

      <!-- Кнопка добавления документа -->
      <ion-button expand="block" @click="openDocumentSelector" class="add-button">
        <ion-icon slot="start" :icon="attachOutline"></ion-icon>
        Прикрепить документ
      </ion-button>
    </div>
  </ion-content>
</template>

<script setup>
import { ref, computed, onMounted, defineEmits, defineProps } from 'vue';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonButton,
  IonIcon,
  IonList,
  IonItem,
  IonLabel,
  IonListHeader,
  IonSpinner,
  modalController,
  alertController,
  toastController
} from '@ionic/vue';
import {
  closeOutline,
  documentOutline,
  documentTextOutline,
  imageOutline,
  documentAttachOutline,
  eyeOutline,
  createOutline,
  trashOutline,
  attachOutline
} from 'ionicons/icons';
import { scheduleService, documentService } from '@/services/api';
import DocumentSelectorModal from '@/components/modals/DocumentSelectorModal.vue';

const emit = defineEmits(['dismiss', 'documentsUpdated']);
const props = defineProps({
  event: {
    type: Object,
    required: true
  }
});

const loading = ref(true);
const attachedDocuments = ref([]);

onMounted(async () => {
  await loadEventDocuments();
});

// Загрузка документов, прикрепленных к событию
const loadEventDocuments = async () => {
  loading.value = true;
  try {
    // Проверяем, что ID события существует
    if (!props.event || !props.event.id) {
      console.error('Отсутствует ID события');
      showToast('Невозможно загрузить документы: неизвестное событие', 'danger');
      attachedDocuments.value = [];
      return;
    }
    
    console.log('Загрузка документов для события ID:', props.event.id);
    const response = await scheduleService.getEventDocuments(props.event.id);
    
    // Проверка наличия данных в ответе
    if (response && response.data) {
      // Проверка формата ответа
      if (Array.isArray(response.data.documents)) {
        attachedDocuments.value = response.data.documents;
      } else if (Array.isArray(response.data)) {
        attachedDocuments.value = response.data;
      } else {
        // Если формат неожиданный, логируем для отладки
        console.warn('Неожиданный формат данных:', response.data);
        attachedDocuments.value = [];
      }
      console.log('Загруженные документы события:', attachedDocuments.value);
    } else {
      attachedDocuments.value = [];
    }
  } catch (error) {
    console.error('Ошибка при загрузке документов:', error);
    // Если API возвращает 404, возможно, маршрут не зарегистрирован
    let errorMessage = 'Ошибка при загрузке документов';
    if (error.response && error.response.status === 404) {
      errorMessage = 'Сервис документов недоступен';
    }
    showToast(errorMessage, 'danger');
    attachedDocuments.value = [];
  } finally {
    loading.value = false;
  }
};

// Открытие модального окна выбора документа для прикрепления
const openDocumentSelector = async () => {
  const modal = await modalController.create({
    component: DocumentSelectorModal,
    componentProps: {
      excludeDocumentIds: attachedDocuments.value.map(doc => doc.id)
    }
  });

  modal.onDidDismiss().then(async ({ data }) => {
    if (data) {
      await attachDocument(data.id);
    }
  });

  return modal.present();
};

// Прикрепление документа к событию
const attachDocument = async (documentId, note = '') => {
  try {
    await scheduleService.attachDocument(props.event.id, documentId, note);
    await loadEventDocuments();
    showToast('Документ успешно прикреплен', 'success');
    emit('documentsUpdated');
  } catch (error) {
    console.error('Ошибка при прикреплении документа:', error);
    showToast('Ошибка при прикреплении документа', 'danger');
  }
};

// Открепление документа от события
const detachDocument = async (attachmentId) => {
  try {
    await scheduleService.detachDocument(props.event.id, attachmentId);
    await loadEventDocuments();
    showToast('Документ успешно откреплен', 'success');
    emit('documentsUpdated');
  } catch (error) {
    console.error('Ошибка при откреплении документа:', error);
    showToast('Ошибка при откреплении документа', 'danger');
  }
};

// Подтверждение открепления документа
const confirmDetach = async (doc) => {
  const alert = await alertController.create({
    header: 'Подтверждение',
    message: `Вы уверены, что хотите открепить документ "${doc.title}" от этого события?`,
    buttons: [
      {
        text: 'Отмена',
        role: 'cancel'
      },
      {
        text: 'Открепить',
        role: 'destructive',
        handler: () => {
          detachDocument(doc.attachmentId);
        }
      }
    ]
  });

  await alert.present();
};

// Редактирование примечания к документу
const editNote = async (doc) => {
  const alert = await alertController.create({
    header: 'Примечание к документу',
    inputs: [
      {
        name: 'note',
        type: 'textarea',
        placeholder: 'Введите примечание',
        value: doc.note || ''
      }
    ],
    buttons: [
      {
        text: 'Отмена',
        role: 'cancel'
      },
      {
        text: 'Сохранить',
        handler: async (data) => {
          try {
            await scheduleService.updateDocumentNote(props.event.id, doc.attachmentId, data.note);
            await loadEventDocuments();
            showToast('Примечание обновлено', 'success');
          } catch (error) {
            console.error('Ошибка при обновлении примечания:', error);
            showToast('Ошибка при обновлении примечания', 'danger');
          }
        }
      }
    ]
  });

  await alert.present();
};

// Просмотр документа
const viewDocument = (doc) => {
  // Здесь можно добавить логику для просмотра документа
  // Например, открытие документа в новой вкладке или в модальном окне
  window.open(documentService.getDocumentUrl(doc.id), '_blank');
};

// Функция для закрытия модального окна
const dismiss = () => {
  emit('dismiss');
  // Используем глобальный метод для закрытия верхнего модального окна
  try {
    document.querySelector('ion-modal:last-of-type')?.dismiss();
  } catch (error) {
    console.error('Ошибка при закрытии модального окна:', error);
  }
};

// Выбор иконки в зависимости от типа документа
const documentIcon = (doc) => {
  const mimeType = doc.mimeType?.toLowerCase() || '';
  
  if (mimeType.includes('image/')) {
    return imageOutline;
  } else if (mimeType.includes('pdf')) {
    return documentTextOutline;
  } else {
    return documentAttachOutline;
  }
};

// Форматирование даты и времени
const formatDateTime = (dateTimeStr) => {
  if (!dateTimeStr) return '';
  
  const date = new Date(dateTimeStr);
  return date.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Форматирование размера файла
const formatFileSize = (bytes) => {
  if (!bytes) return '0 Б';
  
  const sizes = ['Б', 'КБ', 'МБ', 'ГБ', 'ТБ'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
};

// Отображение уведомления
const showToast = async (message, color = 'primary') => {
  const toast = await toastController.create({
    message,
    duration: 3000,
    position: 'bottom',
    color
  });
  
  await toast.present();
};
</script>

<style scoped>
.event-info {
  margin-bottom: 20px;
  border-bottom: 1px solid var(--ion-color-light);
  padding-bottom: 10px;
}

.event-info h2 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
}

.document-item {
  --padding-start: 8px;
}

.document-icon {
  font-size: 24px;
  margin-right: 10px;
}

.document-meta {
  font-size: 0.8rem;
  color: var(--ion-color-medium);
}

.document-note {
  font-style: italic;
  margin-top: 4px;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.empty-state {
  text-align: center;
  padding: 30px 20px;
  color: var(--ion-color-medium);
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 10px;
}

.add-button {
  margin-top: 20px;
}
</style>
