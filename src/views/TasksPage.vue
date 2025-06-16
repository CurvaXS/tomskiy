<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Задачи</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="openAddTaskModal">
            <ion-icon slot="icon-only" :icon="addOutline"></ion-icon>
          </ion-button>
          <ion-button @click="openFilterModal">
            <ion-icon slot="icon-only" :icon="filterOutline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
      <ion-toolbar>
        <ion-segment v-model="currentFilter">
          <ion-segment-button value="all">
            <ion-label>Все</ion-label>
          </ion-segment-button>
          <ion-segment-button value="active">
            <ion-label>Активные</ion-label>
          </ion-segment-button>
          <ion-segment-button value="completed">
            <ion-label>Завершенные</ion-label>
          </ion-segment-button>
        </ion-segment>
      </ion-toolbar>
    </ion-header>
    
    <ion-content class="ion-padding">
      <ion-refresher slot="fixed" @ionRefresh="refreshData($event)">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>
      
      <!-- Список задач -->
      <ion-list v-if="filteredTasks.length > 0">
        <ion-item-sliding v-for="task in filteredTasks" :key="task.id">
          <ion-item-options side="start">
            <ion-item-option color="success" @click="completeTask(task)">
              <ion-icon slot="icon-only" :icon="checkmarkOutline"></ion-icon>
            </ion-item-option>
          </ion-item-options>
          
          <ion-item @click="openTaskDetails(task)" :detail="false" class="task-item">
            <ion-checkbox slot="start" v-model="task.completed" @ionChange="toggleTaskStatus(task)"></ion-checkbox>
            <ion-label>
              <h2 :class="{ 'completed-task': task.completed }">{{ task.title }}</h2>
              <p>{{ task.description }}</p>
              <div class="task-meta">
                <ion-badge :color="getPriorityColor(task.priority)">{{ getPriorityLabel(task.priority) }}</ion-badge>
                <ion-note v-if="task.dueDate">
                  <ion-icon :icon="calendarOutline"></ion-icon> 
                  {{ formatDate(task.dueDate) }}
                </ion-note>
                <ion-note v-if="task.assignedTo">
                  <ion-icon :icon="personOutline"></ion-icon> 
                  {{ task.assignedToName }}
                </ion-note>
              </div>
            </ion-label>
            <ion-icon :icon="chevronForwardOutline" slot="end"></ion-icon>
          </ion-item>
          
          <ion-item-options side="end">
            <ion-item-option color="primary" @click="editTask(task)">
              <ion-icon slot="icon-only" :icon="createOutline"></ion-icon>
            </ion-item-option>
            <ion-item-option color="danger" @click="confirmDeleteTask(task)">
              <ion-icon slot="icon-only" :icon="trashOutline"></ion-icon>
            </ion-item-option>
          </ion-item-options>
        </ion-item-sliding>
      </ion-list>
      
      <!-- Пустое состояние -->
      <div v-else class="empty-state">
        <ion-icon :icon="checkboxOutline" class="empty-icon"></ion-icon>
        <h3>Нет задач</h3>
        <p>У вас нет {{ getEmptyStateText() }} задач</p>
        <ion-button @click="openAddTaskModal">Создать задачу</ion-button>
      </div>
      
      <!-- Заголовок раздела предстоящих задач -->
      <ion-list-header v-if="upcomingTasks.length > 0">
        <ion-label>Предстоящие задачи</ion-label>
      </ion-list-header>
      
      <!-- Список предстоящих задач -->
      <ion-list v-if="upcomingTasks.length > 0">
        <ion-item v-for="task in upcomingTasks" :key="task.id" @click="openTaskDetails(task)">
          <ion-icon :icon="timeOutline" slot="start" color="warning"></ion-icon>
          <ion-label>
            <h2>{{ task.title }}</h2>
            <p>Срок: {{ formatDate(task.dueDate) }}</p>
          </ion-label>
          <ion-badge slot="end" :color="getDueDateColor(task.dueDate)">{{ getDueDateLabel(task.dueDate) }}</ion-badge>
        </ion-item>
      </ion-list>
      
      <!-- FAB-кнопка для быстрого добавления -->
      <ion-fab vertical="bottom" horizontal="end" slot="fixed">
        <ion-fab-button @click="openAddTaskModal">
          <ion-icon :icon="addOutline"></ion-icon>
        </ion-fab-button>
      </ion-fab>
    </ion-content>
  </ion-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
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
  IonItemSliding,
  IonItemOptions,
  IonItemOption,
  IonCheckbox,
  IonBadge,
  IonNote,
  IonFab,
  IonFabButton,
  IonRefresher,
  IonRefresherContent,
  alertController,
  modalController,
  toastController
} from '@ionic/vue';
import TaskModal from '@/components/modals/TaskModal.vue';
import { 
  addOutline,
  filterOutline,
  checkboxOutline,
  checkmarkOutline,
  calendarOutline,
  personOutline,
  createOutline,
  trashOutline,
  chevronForwardOutline,
  timeOutline
} from 'ionicons/icons';
import { useAuthStore } from '@/store/auth';
import { taskService } from '@/services/api';

const authStore = useAuthStore();
const currentFilter = ref('all');

// Мок-данные для демонстрации
const tasks = ref([
  {
    id: 1,
    title: 'Подготовить материалы к уроку',
    description: 'Подготовить презентацию и раздаточные материалы для урока математики',
    priority: 'high',
    status: 'active',
    completed: false,
    createdAt: new Date(new Date().getTime() - 86400000), // 1 день назад
    dueDate: new Date(new Date().getTime() + 86400000), // через 1 день
    assignedTo: 1,
    assignedToName: 'Иванов И.И.',
    createdBy: 2
  },
  {
    id: 2,
    title: 'Проверить контрольные работы',
    description: 'Проверить контрольные работы 10А класса по алгебре',
    priority: 'medium',
    status: 'active',
    completed: false,
    createdAt: new Date(new Date().getTime() - 172800000), // 2 дня назад
    dueDate: new Date(new Date().getTime() + 172800000), // через 2 дня
    assignedTo: 1,
    assignedToName: 'Иванов И.И.',
    createdBy: 2
  },
  {
    id: 3,
    title: 'Заполнить электронный журнал',
    description: 'Заполнить оценки в электронном журнале за прошедшую неделю',
    priority: 'low',
    status: 'completed',
    completed: true,
    createdAt: new Date(new Date().getTime() - 259200000), // 3 дня назад
    dueDate: new Date(new Date().getTime() - 86400000), // 1 день назад
    assignedTo: 1,
    assignedToName: 'Иванов И.И.',
    createdBy: 1
  }
]);

// Расчетные свойства
const filteredTasks = computed(() => {
  // Проверяем, что tasks.value является массивом
  if (!tasks.value || !Array.isArray(tasks.value)) {
    console.warn('значение tasks не является массивом:', tasks.value);
    return [];
  }
  
  // Фильтрация по статусу
  let filtered = tasks.value.filter(task => {
    if (!task) return false;
    if (currentFilter.value === 'all') return true;
    if (currentFilter.value === 'active') return !task.completed;
    if (currentFilter.value === 'completed') return task.completed;
    return true;
  });
  
  return filtered;
});

const upcomingTasks = computed(() => {
  // Проверяем, что tasks.value является массивом
  if (!tasks.value || !Array.isArray(tasks.value)) {
    console.warn('значение tasks не является массивом:', tasks.value);
    return [];
  }
  
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  
  const dayAfterTomorrow = new Date();
  dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
  dayAfterTomorrow.setHours(0, 0, 0, 0);
  
  return tasks.value.filter(task => {
    if (!task || !task.dueDate || task.completed) return false;
    const dueDate = new Date(task.dueDate);
    return dueDate >= tomorrow && dueDate < dayAfterTomorrow;
  });
});

// Обработчики событий
const openAddTaskModal = async () => {
  const modal = await modalController.create({
    component: TaskModal,
    componentProps: {
      task: null
    }
  });
  
  modal.onDidDismiss().then(({ data }) => {
    if (data) {
      // Загружаем задачи с сервера для обновления списка
      loadTasksFromServer();
      // Показываем сообщение об успехе
      showToast('Задача успешно создана', 'success');
    }
  });
  
  await modal.present();
};

const openFilterModal = async () => {
  // В реальном приложении здесь будет открытие модального окна с расширенными фильтрами
  alert('Фильтры задач');
};

const openTaskDetails = (task) => {
  // В реальном приложении здесь будет открытие страницы с подробной информацией о задаче
  alert(`Детали задачи: ${task.title}`);
};

const editTask = async (task) => {
  const modal = await modalController.create({
    component: TaskModal,
    componentProps: {
      task: task
    }
  });
  
  modal.onDidDismiss().then(({ data }) => {
    if (data) {
      // Обновляем задачу в списке
      const index = tasks.value.findIndex(t => t.id === data.id);
      if (index !== -1) {
        tasks.value[index] = data;
      }
      // Показываем сообщение об успехе
      showToast('Задача успешно обновлена', 'success');
    }
  });
  
  await modal.present();
};

const completeTask = (task) => {
  task.completed = true;
  task.status = 'completed';
  
  // В реальном приложении здесь будет сохранение статуса через API
  // taskService.updateTask(task.id, { completed: true, status: 'completed' });
  
  const toast = toastController.create({
    message: 'Задача выполнена!',
    duration: 2000,
    position: 'bottom',
    color: 'success'
  });
  toast.then(t => t.present());
};

const toggleTaskStatus = (task) => {
  task.status = task.completed ? 'completed' : 'active';
  
  // В реальном приложении здесь будет сохранение статуса через API
  // taskService.updateTask(task.id, { completed: task.completed, status: task.status });
};

const confirmDeleteTask = async (task) => {
  const alert = await alertController.create({
    header: 'Подтверждение',
    message: `Вы уверены, что хотите удалить задачу "${task.title}"?`,
    buttons: [
      {
        text: 'Отмена',
        role: 'cancel'
      },
      {
        text: 'Удалить',
        role: 'destructive',
        handler: () => deleteTask(task)
      }
    ]
  });
  await alert.present();
};

const deleteTask = (task) => {
  // В реальном приложении здесь будет удаление задачи через API
  tasks.value = tasks.value.filter(t => t.id !== task.id);
  
  const toast = toastController.create({
    message: 'Задача удалена',
    duration: 2000,
    position: 'bottom',
    color: 'medium'
  });
  toast.then(t => t.present());
};

const refreshData = async (event) => {
  try {
    await loadTasksFromServer();
    
    // Если есть событие обновления, завершаем его
    if (event) {
      event.detail.complete();
    }
  } catch (err) {
    console.error('Ошибка при обновлении данных:', err);
    showToast('Ошибка при получении задач', 'danger');
    
    if (event) {
      event.detail.complete();
    }
  }
};

// Функция загрузки задач с сервера
const loadTasksFromServer = async () => {
  try {
    // Для избежания ошибок при загрузке, временно используем мок-данные
    try {
      const response = await taskService.getTasks();
      // Проверяем, что данные имеют правильный формат
      console.log('Ответ сервера:', response);
      
      if (response.data && Array.isArray(response.data)) {
        tasks.value = response.data;
      } else if (response.data && typeof response.data === 'object') {
        // Если данные приходят в формате {items: [...], pagination: ...}
        const itemsArray = response.data.items || response.data.tasks || response.data.data || [];
        tasks.value = Array.isArray(itemsArray) ? itemsArray : [];
      } else {
        // Если данные не удалось получить, используем мок-данные
        console.warn('Данные не в ожидаемом формате, используем мок-данные', response.data);
        // Используем существующие мок-данные
      }
    } catch (apiError) {
      console.error('Ошибка API при загрузке задач:', apiError);
      // Оставляем существующие данные
    }
    
    console.log('Задачи загружены:', tasks.value);
  } catch (err) {
    console.error('Ошибка при загрузке задач:', err);
    showToast('Ошибка при загрузке задач', 'danger');
  }
};

// Вспомогательные функции
const formatDate = (date) => {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const getPriorityColor = (priority) => {
  const colors = {
    'high': 'danger',
    'medium': 'warning',
    'low': 'success'
  };
  return colors[priority] || 'medium';
};

const getPriorityLabel = (priority) => {
  const labels = {
    'high': 'Высокий',
    'medium': 'Средний',
    'low': 'Низкий'
  };
  return labels[priority] || 'Не указан';
};

const getDueDateColor = (dueDate) => {
  if (!dueDate) return 'medium';
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const date = new Date(dueDate);
  
  if (date < today) {
    return 'danger';
  } else if (date.getTime() === today.getTime()) {
    return 'warning';
  } else if (date.getTime() === tomorrow.getTime()) {
    return 'primary';
  } else {
    return 'medium';
  }
};

const getDueDateLabel = (dueDate) => {
  if (!dueDate) return '';
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const date = new Date(dueDate);
  date.setHours(0, 0, 0, 0);
  
  if (date < today) {
    return 'Просрочено';
  } else if (date.getTime() === today.getTime()) {
    return 'Сегодня';
  } else if (date.getTime() === tomorrow.getTime()) {
    return 'Завтра';
  } else {
    return formatDate(dueDate);
  }
};

const getEmptyStateText = () => {
  if (currentFilter.value === 'active') {
    return 'активных';
  } else if (currentFilter.value === 'completed') {
    return 'завершенных';
  } else {
    return '';
  }
};

// Загрузка данных при монтировании компонента
onMounted(async () => {
  try {
    // Загружаем задачи с сервера при загрузке страницы
    await loadTasksFromServer();
  } catch (error) {
    console.error('Failed to load tasks data:', error);
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
</script>

<style scoped>
.completed-task {
  text-decoration: line-through;
  color: var(--ion-color-medium);
}

.task-meta {
  display: flex;
  gap: 8px;
  margin-top: 4px;
  align-items: center;
}

.task-item {
  --padding-start: 8px;
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
</style>
