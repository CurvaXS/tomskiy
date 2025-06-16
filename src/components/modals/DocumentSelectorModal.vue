<template>
  <ion-header>
    <ion-toolbar>
      <ion-title>Выбор документа</ion-title>
      <ion-buttons slot="end">
        <ion-button @click="dismiss">
          <ion-icon slot="icon-only" :icon="closeOutline"></ion-icon>
        </ion-button>
      </ion-buttons>
    </ion-toolbar>
  </ion-header>

  <ion-content class="ion-padding">
    <!-- Поиск документов -->
    <ion-searchbar
      v-model="searchQuery"
      placeholder="Поиск документов..."
      @ionInput="searchDocuments"
      debounce="300"
    ></ion-searchbar>

    <!-- Фильтр по категориям -->
    <ion-segment v-model="selectedCategory" @ionChange="filterDocuments" scrollable>
      <ion-segment-button value="all">
        <ion-label>Все</ion-label>
      </ion-segment-button>
      <ion-segment-button v-for="type in documentTypes" :key="type.value" :value="type.value">
        <ion-label>{{ type.label }}</ion-label>
      </ion-segment-button>
    </ion-segment>

    <!-- Список документов -->
    <div v-if="loading" class="loading-container">
      <ion-spinner></ion-spinner>
      <p>Загрузка документов...</p>
    </div>
    <div v-else>
      <ion-list v-if="filteredDocuments.length > 0">
        <ion-item v-for="doc in filteredDocuments" :key="doc.id" button @click="selectDocument(doc)" class="document-item">
          <ion-icon :icon="documentIcon(doc)" slot="start" class="document-icon"></ion-icon>
          <ion-label>
            <h2>{{ doc.title }}</h2>
            <p class="document-meta">{{ formatFileSize(doc.fileSize) }} | {{ formatDate(doc.createdAt) }}</p>
          </ion-label>
        </ion-item>
      </ion-list>
      <div v-else class="empty-state">
        <ion-icon :icon="documentOutline" class="empty-icon"></ion-icon>
        <p v-if="searchQuery">По запросу "{{ searchQuery }}" ничего не найдено</p>
        <p v-else>Документы не найдены</p>
      </div>
    </div>

    <!-- Загрузить новый документ -->
    <ion-button expand="block" @click="openUploadModal" class="upload-button">
      <ion-icon slot="start" :icon="cloudUploadOutline"></ion-icon>
      Загрузить новый документ
    </ion-button>
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
  IonSearchbar,
  IonSegment,
  IonSegmentButton,
  IonSpinner,
  modalController
} from '@ionic/vue';
import {
  closeOutline,
  documentOutline,
  documentTextOutline,
  imageOutline,
  documentAttachOutline,
  cloudUploadOutline
} from 'ionicons/icons';
import { documentService } from '@/services/api';
import DocumentModal from '@/components/modals/DocumentModal.vue';

const emit = defineEmits(['dismiss']);
const props = defineProps({
  excludeDocumentIds: {
    type: Array,
    default: () => []
  }
});

const loading = ref(true);
const searchQuery = ref('');
const selectedCategory = ref('all');
const documents = ref([]);

// Типы документов для фильтрации
const documentTypes = [
  { value: 'report', label: 'Отчеты' },
  { value: 'order', label: 'Приказы' },
  { value: 'statement', label: 'Заявления' },
  { value: 'certificate', label: 'Справки' },
  { value: 'methodical', label: 'Методические' },
  { value: 'regulation', label: 'Положения' },
  { value: 'contract', label: 'Договоры' },
  { value: 'other', label: 'Прочие' }
];

// Фильтрованные документы
const filteredDocuments = computed(() => {
  // Убедимся, что documents.value является массивом
  if (!Array.isArray(documents.value)) {
    console.warn('Документы не являются массивом:', documents.value);
    return [];
  }
  
  // Исключаем документы, которые уже прикреплены к событию
  let result = documents.value.filter(doc => {
    if (!doc || typeof doc !== 'object') return false;
    return !props.excludeDocumentIds.includes(doc.id); 
  });
  
  // Фильтр по категории
  if (selectedCategory.value !== 'all') {
    result = result.filter(doc => doc.type === selectedCategory.value);
  }
  
  // Фильтр по поисковому запросу
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    result = result.filter(doc => {
      if (!doc.title) return false;
      return doc.title.toLowerCase().includes(query) || 
             (doc.description && doc.description.toLowerCase().includes(query));
    });
  }
  
  return result;
});

onMounted(async () => {
  await loadDocuments();
});

// Загрузка всех документов
const loadDocuments = async () => {
  loading.value = true;
  try {
    const response = await documentService.getDocuments();
    // Проверяем и обрабатываем данные
    if (response && response.data) {
      // Если данные пришли в формате { documents: [...] }
      if (Array.isArray(response.data.documents)) {
        documents.value = response.data.documents;
      }
      // Если данные пришли напрямую в виде массива
      else if (Array.isArray(response.data)) {
        documents.value = response.data;
      }
      // В крайнем случае, устанавливаем пустой массив
      else {
        documents.value = [];
        console.warn('Неожиданный формат данных документов:', response.data);
      }
    } else {
      documents.value = [];
    }
    console.log('Загруженные документы:', documents.value);
  } catch (error) {
    console.error('Ошибка при загрузке документов:', error);
    documents.value = [];
  } finally {
    loading.value = false;
  }
};

// Поиск документов
const searchDocuments = () => {
  // Поиск выполняется автоматически благодаря computed property
};

// Фильтрация документов по категории
const filterDocuments = () => {
  // Фильтрация выполняется автоматически благодаря computed property
};

// Выбор документа для прикрепления
const selectDocument = (doc) => {
  emit('dismiss', { id: doc.id, title: doc.title });
  dismiss();
};

// Открытие модального окна для загрузки нового документа
const openUploadModal = async () => {
  const modal = await modalController.create({
    component: DocumentModal
  });

  modal.onDidDismiss().then(async ({ data }) => {
    if (data) {
      await loadDocuments();
    }
  });

  return modal.present();
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

// Форматирование даты
const formatDate = (dateStr) => {
  if (!dateStr) return '';
  
  const date = new Date(dateStr);
  return date.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

// Форматирование размера файла
const formatFileSize = (bytes) => {
  if (!bytes) return '0 Б';
  
  const sizes = ['Б', 'КБ', 'МБ', 'ГБ', 'ТБ'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
};
</script>

<style scoped>
ion-segment {
  margin-bottom: 16px;
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

.upload-button {
  margin-top: 20px;
}
</style>
