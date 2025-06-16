<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Документы</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="openUploadModal">
            <ion-icon slot="icon-only" :icon="cloudUploadOutline"></ion-icon>
          </ion-button>
          <ion-button @click="openFilterModal">
            <ion-icon slot="icon-only" :icon="filterOutline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
      <ion-toolbar>
        <ion-searchbar v-model="searchQuery" placeholder="Поиск документов" @ionInput="searchDocuments"></ion-searchbar>
      </ion-toolbar>
    </ion-header>
    
    <ion-content>
      <ion-refresher slot="fixed" @ionRefresh="refreshData($event)">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>
      
      <!-- Категории документов -->
      <ion-segment v-model="currentCategory" scrollable>
        <ion-segment-button value="all">
          <ion-label>Все</ion-label>
        </ion-segment-button>
        <ion-segment-button value="orders">
          <ion-label>Приказы</ion-label>
        </ion-segment-button>
        <ion-segment-button value="reports">
          <ion-label>Отчеты</ion-label>
        </ion-segment-button>
        <ion-segment-button value="methodical">
          <ion-label>Методички</ion-label>
        </ion-segment-button>
        <ion-segment-button value="regulations">
          <ion-label>Положения</ion-label>
        </ion-segment-button>
      </ion-segment>
      
      <!-- Список документов -->
      <ion-list v-if="filteredDocuments.length > 0">
        <ion-item v-for="document in filteredDocuments" :key="document.id" button @click="openDocument(document)">
          <ion-icon slot="start" :icon="getDocumentIcon(document.type)" :color="getDocumentColor(document.type)"></ion-icon>
          <ion-label>
            <h2>{{ document.title }}</h2>
            <p>{{ document.description }}</p>
            <div class="document-meta">
              <ion-badge color="medium">{{ getCategoryLabel(document.category) }}</ion-badge>
              <ion-note>
                <ion-icon :icon="calendarOutline"></ion-icon> 
                {{ formatDate(document.createdAt) }}
              </ion-note>
              <ion-note v-if="document.signed">
                <ion-icon :icon="checkmarkCircleOutline" color="success"></ion-icon> 
                Подписан
              </ion-note>
            </div>
          </ion-label>
          <ion-button slot="end" fill="clear" @click.stop="showDocumentOptions(document)">
            <ion-icon slot="icon-only" :icon="ellipsisVerticalOutline"></ion-icon>
          </ion-button>
        </ion-item>
      </ion-list>
      
      <!-- Пустое состояние -->
      <div v-else class="empty-state ion-padding">
        <ion-icon :icon="documentOutline" class="empty-icon"></ion-icon>
        <h3>Нет документов</h3>
        <p>{{ getEmptyStateText() }}</p>
        <ion-button @click="openUploadModal">Загрузить документ</ion-button>
      </div>
      
      <!-- Последние документы -->
      <ion-list-header v-if="recentDocuments.length > 0 && currentCategory === 'all'">
        <ion-label>Недавно добавленные</ion-label>
      </ion-list-header>
      <ion-list v-if="recentDocuments.length > 0 && currentCategory === 'all'">
        <ion-item v-for="document in recentDocuments" :key="document.id" button @click="openDocument(document)">
          <ion-icon slot="start" :icon="timeOutline" color="primary"></ion-icon>
          <ion-label>
            <h2>{{ document.title }}</h2>
            <p>Добавлен {{ formatRelativeTime(document.createdAt) }}</p>
          </ion-label>
        </ion-item>
      </ion-list>
      
      <!-- FAB-кнопка для быстрой загрузки -->
      <ion-fab vertical="bottom" horizontal="end" slot="fixed">
        <ion-fab-button @click="openUploadModal">
          <ion-icon :icon="addOutline"></ion-icon>
        </ion-fab-button>
      </ion-fab>
    </ion-content>
  </ion-page>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { 
  IonPage, 
  IonHeader, 
  IonToolbar, 
  IonTitle, 
  IonContent,
  IonButtons,
  IonButton,
  IonIcon,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonList,
  IonListHeader,
  IonItem,
  IonSearchbar,
  IonBadge,
  IonNote,
  IonFab,
  IonFabButton,
  IonRefresher,
  IonRefresherContent,
  actionSheetController,
  modalController,
  toastController
} from '@ionic/vue';
import DocumentModal from '@/components/modals/DocumentModal.vue';
import { 
  documentOutline,
  documentTextOutline,
  cloudUploadOutline,
  filterOutline,
  checkmarkCircleOutline,
  ellipsisVerticalOutline,
  calendarOutline,
  timeOutline,
  addOutline,
  downloadOutline,
  shareOutline,
  pencilOutline,
  trashOutline
} from 'ionicons/icons';
import { useAuthStore } from '@/store/auth';
import { useDocumentsStore } from '@/store/documents';

const authStore = useAuthStore();
const documentsStore = useDocumentsStore();
const searchQuery = ref('');
const currentCategory = ref('all');
const loading = ref(false);

// Данные будут загружаться из хранилища Pinia
// Не используем больше локальную переменную documents, a берем из хранилища documentsStore.documents
  // {
  //   id: 1,
  //   title: 'Приказ о проведении педагогического совета',
  //   description: 'Приказ о проведении внеочередного педагогического совета 15.05.2025',
  //   type: 'docx',
  //   category: 'orders',
  //   createdAt: new Date(new Date().getTime() - 86400000), // 1 день назад
  //   createdBy: 1,
  //   createdByName: 'Петров А.И.',
  //   size: 256000, // 256 KB
  //   signed: true,
  //   url: '/documents/order-1.docx'
  // },
  // {
  //   id: 2,
  //   title: 'Отчет о проведении открытых уроков за апрель 2025',
  //   description: 'Сводный отчет о проведенных открытых уроках в апреле 2025 года',
  //   type: 'pdf',
  //   category: 'reports',
  //   createdAt: new Date(new Date().getTime() - 172800000), // 2 дня назад
  //   createdBy: 2,
  //   createdByName: 'Иванова М.С.',
  //   size: 1500000, // 1.5 MB
  //   signed: false,
  //   url: '/documents/report-april.pdf'
  // },
  // {
  //   id: 3,
  //   title: 'Методические указания по проведению лабораторных работ',
  //   description: 'Методические указания для учителей физики по проведению лабораторных работ',
  //   type: 'pdf',
  //   category: 'methodical',
  //   createdAt: new Date(new Date().getTime() - 604800000), // 7 дней назад
  //   createdBy: 3,
  //   createdByName: 'Сидоров К.Л.',
  //   size: 3500000, // 3.5 MB
  //   signed: true,
  //   url: '/documents/lab-guidelines.pdf'
  // },
  // {
  //   id: 4,
  //   title: 'Положение о проведении итоговой аттестации',
  //   description: 'Положение о порядке проведения итоговой аттестации учащихся 9 и 11 классов',
  //   type: 'pdf',
  //   category: 'regulations',
  //   createdAt: new Date(new Date().getTime() - 1209600000), // 14 дней назад
  //   createdBy: 1,
  //   createdByName: 'Петров А.И.',
  //   size: 420000, // 420 KB
  //   signed: true,
  //   url: '/documents/regulation-exams.pdf'
// Расчетные свойства
const filteredDocuments = computed(() => {
  let filtered = documentsStore.documents;
  
  // Фильтр по категории
  if (currentCategory.value !== 'all') {
    filtered = filtered.filter(doc => doc.category === currentCategory.value);
  }
  
  // Фильтр по поиску
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    filtered = filtered.filter(doc => 
      doc.title.toLowerCase().includes(query) || 
      doc.description.toLowerCase().includes(query)
    );
  }
  
  // Сортировка по дате создания (поддерживаем оба формата: createdAt и created_at)
  return filtered.sort((a, b) => {
    const dateA = new Date(a.created_at || a.createdAt);
    const dateB = new Date(b.created_at || b.createdAt);
    return dateB - dateA;
  });
});

const recentDocuments = computed(() => {
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
  
  return documentsStore.documents
    .filter(doc => {
      const docDate = new Date(doc.created_at || doc.createdAt);
      return docDate >= threeDaysAgo;
    })
    .sort((a, b) => {
      const dateA = new Date(a.created_at || a.createdAt);
      const dateB = new Date(b.created_at || b.createdAt);
      return dateB - dateA;
    })
    .slice(0, 3);
});

// Обработчики событий
const openUploadModal = async () => {
  const modal = await modalController.create({
    component: DocumentModal,
    componentProps: {
      document: null
    }
  });
  
  modal.onDidDismiss().then(({ data }) => {
    if (data) {
      // Документ уже добавлен в хранилище из модального окна
      showToast('Документ успешно загружен', 'success');
    }
  });
  
  await modal.present();
};

const openFilterModal = async () => {
  // В реальном приложении здесь будет открытие модального окна с расширенными фильтрами
  alert('Фильтры документов');
};

const openDocument = (document) => {
  // В реальном приложении здесь будет открытие документа или его подробной информации
  alert(`Открытие документа: ${document.title}`);
};

const showDocumentOptions = async (document) => {
  const actionSheet = await actionSheetController.create({
    header: document.title,
    buttons: [
      {
        text: 'Скачать',
        icon: downloadOutline,
        handler: () => {
          downloadDocument(document);
        }
      },
      {
        text: 'Поделиться',
        icon: shareOutline,
        handler: () => {
          shareDocument(document);
        }
      },
      {
        text: document.signed ? 'Просмотреть подпись' : 'Подписать',
        icon: checkmarkCircleOutline,
        handler: () => {
          if (document.signed) {
            viewSignature(document);
          } else {
            signDocument(document);
          }
        }
      },
      {
        text: 'Редактировать',
        icon: pencilOutline,
        handler: () => {
          editDocument(document);
        }
      },
      {
        text: 'Удалить',
        role: 'destructive',
        icon: trashOutline,
        handler: () => {
          confirmDeleteDocument(document);
        }
      },
      {
        text: 'Отмена',
        role: 'cancel'
      }
    ]
  });
  await actionSheet.present();
};

const downloadDocument = (document) => {
  // В реальном приложении здесь будет скачивание документа
  const toast = toastController.create({
    message: 'Документ скачан',
    duration: 2000,
    position: 'bottom',
    color: 'success'
  });
  toast.then(t => t.present());
};

const shareDocument = (document) => {
  // В реальном приложении здесь будет открытие меню для отправки ссылки на документ
  alert(`Отправка ссылки на документ: ${document.title}`);
};

const signDocument = async (document) => {
  try {
    // Подписываем документ через хранилище, которое вызывает API
    await documentsStore.signDocument(document.id);
    showToast('Документ успешно подписан', 'success');
  } catch (error) {
    console.error('Error signing document:', error);
    showToast('Ошибка при подписании документа', 'danger');
  }
};

const viewSignature = (document) => {
  // В реальном приложении здесь будет просмотр информации о подписи
  const modal = modalController.create({
    component: DocumentModal,
    componentProps: {
      document: document
    }
  });
  
  modal.onDidDismiss().then(({ data }) => {
    if (data) {
      // Обновляем документ в списке
      const index = documents.value.findIndex(d => d.id === data.id);
      if (index !== -1) {
        documents.value[index] = data;
      }
      // Показываем сообщение об успехе
      showToast('Документ успешно обновлен', 'success');
    }
  });
  
  modal.present();
};

const editDocument = async (document) => {
  const modal = await modalController.create({
    component: DocumentModal,
    componentProps: {
      document
    }
  });
  
  modal.onDidDismiss().then(({ data }) => {
    if (data) {
      // Документ уже обновлен в хранилище из модального окна
      showToast('Документ успешно обновлен', 'success');
    }
  });
  
  await modal.present();
};

const confirmDeleteDocument = async (document) => {
  const alert = await actionSheetController.create({
    header: 'Подтверждение удаления',
    subHeader: `Вы действительно хотите удалить документ "${document.title}"?`,
    buttons: [
      {
        text: 'Отмена',
        role: 'cancel'
      },
      {
        text: 'Удалить',
        role: 'destructive',
        handler: async () => {
          try {
            // Удаляем документ через хранилище, которое вызывает API
            await documentsStore.deleteDocument(document.id);
            showToast('Документ успешно удален', 'success');
          } catch (error) {
            console.error('Error deleting document:', error);
            showToast('Ошибка при удалении документа', 'danger');
          }
        }
      }
    ]
  });
  
  await alert.present();
};

const searchDocuments = () => {
  // В реальном приложении здесь будет поиск документов через API
  // Сейчас используем локальные вычисляемые свойства для демонстрации
};

const refreshData = async (event) => {
  try {
    // В реальном приложении здесь будет загрузка данных с сервера
    // const response = await documentService.getDocuments();
    // documents.value = response.data;
    
    // Для демонстрации просто обновляем текущие данные
    documents.value = [...documents.value];
    
    // Если есть событие обновления, завершаем его
    if (event) {
      event.detail.complete();
    }
  } catch (err) {
    console.error('Ошибка при обновлении данных:', err);
    showToast('Ошибка при получении документов', 'danger');
    
    if (event) {
      event.detail.complete();
    }
  }
};

// Вспомогательные функции
const formatDate = (date) => {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const formatRelativeTime = (date) => {
  if (!date) return '';
  
  const now = new Date();
  const then = new Date(date);
  const diffMs = now - then;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  
  if (diffDays > 0) {
    return `${diffDays} ${getPluralForm(diffDays, ['день', 'дня', 'дней'])} назад`;
  } else if (diffHours > 0) {
    return `${diffHours} ${getPluralForm(diffHours, ['час', 'часа', 'часов'])} назад`;
  } else if (diffMinutes > 0) {
    return `${diffMinutes} ${getPluralForm(diffMinutes, ['минуту', 'минуты', 'минут'])} назад`;
  } else {
    return 'только что';
  }
};

const getPluralForm = (number, forms) => {
  const cases = [2, 0, 1, 1, 1, 2];
  return forms[(number % 100 > 4 && number % 100 < 20) ? 2 : cases[(number % 10 < 5) ? number % 10 : 5]];
};

const getDocumentIcon = (type) => {
  const icons = {
    'pdf': documentTextOutline,
    'docx': documentTextOutline,
    'xlsx': documentTextOutline,
    'pptx': documentTextOutline,
    'txt': documentTextOutline,
    'image': documentTextOutline,
    'other': documentOutline
  };
  return icons[type] || documentOutline;
};

const getDocumentColor = (type) => {
  const colors = {
    'pdf': 'danger',
    'docx': 'primary',
    'xlsx': 'success',
    'pptx': 'warning',
    'txt': 'medium',
    'image': 'tertiary',
    'other': 'medium'
  };
  return colors[type] || 'medium';
};

const getCategoryLabel = (category) => {
  const categories = {
    'orders': 'Приказы',
    'reports': 'Отчеты',
    'methodical': 'Методички',
    'regulations': 'Положения',
    'other': 'Прочее'
  };
  return categories[category] || 'Другое';
};

const getEmptyStateText = () => {
  if (searchQuery.value) {
    return `Не найдено документов по запросу "${searchQuery.value}"`;
  } else if (currentCategory.value !== 'all') {
    return `В категории "${getCategoryLabel(currentCategory.value)}" пока нет документов`;
  } else {
    return 'В системе пока нет документов';
  }
};

// Загрузка данных при монтировании компонента
onMounted(async () => {
  loading.value = true;
  try {
    // Загружаем документы из API через хранилище
    await documentsStore.fetchDocuments();
    // Загружаем справочники типов документов
    await documentsStore.fetchDocumentTypes();
  } catch (error) {
    console.error('Failed to load documents data:', error);
    showToast('Ошибка при загрузке документов', 'danger');
  } finally {
    loading.value = false;
  }
});

// Вспомогательная функция для отображения сообщений
const showToast = async (message, color = 'primary') => {
  const toast = await toastController.create({
    message,
    duration: 3000,
    position: 'bottom',
    color
  });
  
  await toast.present();
};

// Отслеживаем изменение категории для обновления данных
watch(currentCategory, async (newCategory) => {
  loading.value = true;
  try {
    // Загружаем документы с фильтром по категории
    await documentsStore.fetchDocuments({ category: newCategory });
  } catch (error) {
    console.error('Failed to load filtered documents data:', error);
  } finally {
    loading.value = false;
  }
});

// Отслеживаем изменение поискового запроса для обновления данных
watch(searchQuery, async (newQuery) => {
  if (newQuery.length >= 3 || newQuery.length === 0) {
    loading.value = true;
    try {
      // Поиск документов через API с использованием хранилища
      await documentsStore.fetchDocuments({ search: newQuery });
    } catch (error) {
      console.error('Failed to search documents:', error);
    } finally {
      loading.value = false;
    }
  }
});
</script>

<style scoped>
.document-meta {
  display: flex;
  gap: 8px;
  margin-top: 4px;
  align-items: center;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px 16px;
  text-align: center;
}

.empty-icon {
  font-size: 64px;
  color: var(--ion-color-medium);
  margin-bottom: 16px;
}

ion-note {
  display: flex;
  align-items: center;
  font-size: 12px;
}

ion-note ion-icon {
  margin-right: 4px;
}

ion-segment {
  padding: 5px 0;
}
</style>
