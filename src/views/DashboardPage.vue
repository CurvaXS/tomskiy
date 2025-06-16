<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Главная</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="openProfileMenu">
            <ion-icon slot="icon-only" :icon="personCircleOutline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    
    <ion-content class="ion-padding">
      <ion-refresher slot="fixed" @ionRefresh="refreshData($event)">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>
      
      <ion-card v-if="user">
        <ion-card-header>
          <ion-card-title>Добро пожаловать, {{ user.firstName }}!</ion-card-title>
          <ion-card-subtitle>{{ getRoleLabel(user.role) }}</ion-card-subtitle>
        </ion-card-header>
        <ion-card-content>
          <p>Последний вход: {{ formatDate(user.lastLogin || new Date()) }}</p>
        </ion-card-content>
      </ion-card>
      
      <!-- Ближайшие события/занятия -->
      <ion-card>
        <ion-card-header>
          <ion-card-title>Ближайшие события</ion-card-title>
          <ion-button fill="clear" size="small" router-link="/schedule">
            Открыть расписание
          </ion-button>
        </ion-card-header>
        <ion-card-content>
          <ion-list lines="none" v-if="upcomingEvents.length > 0">
            <ion-item v-for="event in upcomingEvents" :key="event.id">
              <ion-icon :icon="calendarOutline" slot="start" color="primary"></ion-icon>
              <ion-label>
                <h3>{{ event.title }}</h3>
                <p>{{ formatDate(event.startTime) }}, {{ event.location }}</p>
              </ion-label>
            </ion-item>
          </ion-list>
          <p v-else>У вас нет ближайших событий.</p>
        </ion-card-content>
      </ion-card>
      
      <!-- Задачи -->
      <ion-card>
        <ion-card-header>
          <ion-card-title>Текущие задачи</ion-card-title>
          <ion-button fill="clear" size="small" router-link="/tasks">
            Все задачи
          </ion-button>
        </ion-card-header>
        <ion-card-content>
          <ion-list lines="none" v-if="tasks.length > 0">
            <ion-item v-for="task in tasks" :key="task.id">
              <ion-icon :icon="checkboxOutline" slot="start" :color="getTaskColor(task.priority)"></ion-icon>
              <ion-label>
                <h3>{{ task.title }}</h3>
                <p>Срок: {{ formatDate(task.dueDate) }}</p>
              </ion-label>
              <ion-badge :color="getTaskColor(task.priority)">{{ getTaskPriorityLabel(task.priority) }}</ion-badge>
            </ion-item>
          </ion-list>
          <p v-else>У вас нет активных задач.</p>
        </ion-card-content>
      </ion-card>
      
      <!-- Уведомления -->
      <ion-card>
        <ion-card-header>
          <ion-card-title>Уведомления</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <ion-list lines="none" v-if="notifications.length > 0">
            <ion-item v-for="notification in notifications" :key="notification.id">
              <ion-icon :icon="notificationsOutline" slot="start" color="primary"></ion-icon>
              <ion-label>
                <h3>{{ notification.title }}</h3>
                <p>{{ notification.message }}</p>
                <p class="notification-time">{{ formatDate(notification.timestamp) }}</p>
              </ion-label>
            </ion-item>
          </ion-list>
          <p v-else>У вас нет новых уведомлений.</p>
        </ion-card-content>
      </ion-card>
      
      <!-- Быстрый доступ (зависит от роли) -->
      <ion-card v-if="isAdmin">
        <ion-card-header>
          <ion-card-title>Инструменты администратора</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <ion-button expand="block" router-link="/analytics">
            <ion-icon slot="start" :icon="analyticsOutline"></ion-icon>
            Аналитика
          </ion-button>
        </ion-card-content>
      </ion-card>
    </ion-content>
  </ion-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useScheduleStore } from '@/store/schedule';
import { useTaskStore } from '@/store/tasks';
import { 
  IonPage, 
  IonHeader, 
  IonToolbar, 
  IonTitle, 
  IonContent,
  IonButtons,
  IonButton,
  IonIcon,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardSubtitle,
  IonCardContent,
  IonList,
  IonItem,
  IonLabel,
  IonBadge,
  IonRefresher,
  IonRefresherContent
} from '@ionic/vue';
import { 
  personCircleOutline, 
  calendarOutline, 
  checkboxOutline, 
  notificationsOutline,
  analyticsOutline,
  logOutOutline,
  settingsOutline
} from 'ionicons/icons';
import { useAuthStore } from '@/store/auth';
import { scheduleService, taskService, notificationService } from '@/services/api';

const authStore = useAuthStore();
const scheduleStore = useScheduleStore();
const taskStore = useTaskStore();
const user = computed(() => authStore.user);
const isAdmin = computed(() => authStore.isAdmin);

// Используем данные из хранилища вместо локальных переменных
const upcomingEvents = computed(() => {
  return scheduleStore.upcomingEvents || [];
});

// Вычисляемые свойства для отображения задач
const tasks = computed(() => {
  // Проверяем наличие задач в хранилище
  console.log('Tasks in store:', taskStore.tasks);
  
  // Используем activeTasks или фильтруем задачи на месте
  const activeTasks = taskStore.tasks.filter(task => 
    task.status === 'active' || task.status === 'pending' || !task.status
  ).slice(0, 3); // Показываем только 3 задачи
  
  console.log('Active tasks for dashboard:', activeTasks);
  return activeTasks;
});

const notifications = ref([
  {
    id: 1,
    title: 'Изменение в расписании',
    message: 'Урок физики перенесен на среду',
    timestamp: new Date(new Date().getTime() - 3600000), // 1 час назад
    read: false
  },
  {
    id: 2,
    title: 'Новый документ',
    message: 'Вам необходимо ознакомиться с новым приказом',
    timestamp: new Date(new Date().getTime() - 7200000), // 2 часа назад
    read: false
  }
]);

onMounted(async () => {
  // Загрузка реальных данных с сервера через хранилища Pinia
  if (authStore.isAuthenticated) {
    try {
      console.log('Dashboard page mounted, checking authentication');
      
      // Выполняем авторизацию заново, если нет токена
      if (!localStorage.getItem('token') && authStore.token) {
        localStorage.setItem('token', authStore.token);
      } else if (!localStorage.getItem('token') && !authStore.token) {
        console.error('No authentication token found');
        router.push('/login');
        return;
      }
      
      // Получение данных пользователя, если его нет в store
      if (!authStore.user) {
        const user = await authStore.fetchCurrentUser();
        if (!user) {
          console.error('Failed to get user data');
          router.push('/login');
          return;
        }
      }
      
      // Загрузка событий расписания через хранилище Pinia
      try {
        await scheduleStore.fetchUpcomingEvents(3);
      } catch (e) {
        console.error('Failed to load upcoming events:', e);
      }
      
      // Небольшая пауза между запросами
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Загрузка активных и отложенных задач через хранилище Pinia
      try {
        // Запрашиваем задачи со всеми статусами, на стороне клиента отфильтруем нужные
        await taskStore.fetchTasks({ limit: 10 });
        console.log('Задачи загружены в хранилище:', taskStore.tasks);
      } catch (e) {
        console.error('Failed to load tasks:', e);
      }
      
      // Небольшая пауза между запросами
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Загрузка уведомлений через API
      try {
        const notificationsResponse = await notificationService.getNotifications({ unread: true, limit: 5 });
        if (notificationsResponse && notificationsResponse.data) {
          notifications.value = notificationsResponse.data;
        }
      } catch (e) {
        console.error('Failed to load notifications:', e);
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    }
  }
});

// Функция для обновления данных по pull-to-refresh
const refreshData = async (event) => {
  try {
    // Проверка авторизации
    if (!authStore.isAuthenticated) {
      router.push('/login');
      return;
    }
    
    // Проверка токена и синхронизация его между store и localStorage
    if (!localStorage.getItem('token') && authStore.token) {
      localStorage.setItem('token', authStore.token);
    } else if (!localStorage.getItem('token') && !authStore.token) {
      console.error('No authentication token available for refresh');
      router.push('/login');
      return;
    }
    
    // Получение данных пользователя
    const user = await authStore.fetchCurrentUser();
    if (!user) {
      console.error('User data unavailable');
      router.push('/login');
      return;
    }
    
    // Обновление данных с сервера через хранилища Pinia с интервалами между запросами
    try {
      await scheduleStore.fetchUpcomingEvents(3);
    } catch (e) {
      console.error('Failed to refresh events:', e);
    }
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    try {
      // Согласованные параметры для загрузки задач как в onMounted
      await taskStore.fetchTasks({ limit: 10 });
      console.log('Задачи обновлены в хранилище:', taskStore.tasks);
    } catch (e) {
      console.error('Failed to refresh tasks:', e);
    }
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    try {
      const notificationsResponse = await notificationService.getNotifications({ unread: true, limit: 5 });
      if (notificationsResponse && notificationsResponse.data) {
        notifications.value = notificationsResponse.data;
      }
    } catch (e) {
      console.error('Failed to refresh notifications:', e);
    }
  } catch (error) {
    console.error('Failed to refresh data:', error);
  } finally {
    event.target.complete();
  }
};

// Функция для открытия меню профиля
const router = useRouter();
const openProfileMenu = () => {
  // Перенаправляем пользователя на страницу профиля
  router.push('/profile');
};

// Вспомогательные функции для форматирования данных
const formatDate = (date) => {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const getRoleLabel = (role) => {
  const roles = {
    'admin': 'Администратор',
    'teacher': 'Преподаватель',
    'technical': 'Технический персонал'
  };
  return roles[role] || role;
};

const getTaskColor = (priority) => {
  const colors = {
    'high': 'danger',
    'medium': 'warning',
    'low': 'success'
  };
  return colors[priority] || 'primary';
};

const getTaskPriorityLabel = (priority) => {
  const priorities = {
    'high': 'Высокий',
    'medium': 'Средний',
    'low': 'Низкий'
  };
  return priorities[priority] || priority;
};
</script>

<style scoped>
.notification-time {
  font-size: 12px;
  color: var(--ion-color-medium);
}

ion-card {
  margin-bottom: 16px;
}

ion-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
