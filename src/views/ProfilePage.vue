<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Профиль</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="logout">
            <ion-icon slot="icon-only" :icon="logOutOutline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    
    <ion-content class="ion-padding">
      <!-- Карточка профиля -->
      <ion-card>
        <ion-card-header>
          <div class="profile-header">
            <div class="profile-avatar" :style="{ backgroundColor: getAvatarColor(user?.id || 1) }">
              {{ getInitials(user?.firstName + ' ' + user?.lastName || 'Пользователь') }}
            </div>
            <div class="profile-info">
              <ion-card-title>{{ user?.firstName }} {{ user?.lastName }}</ion-card-title>
              <ion-card-subtitle>{{ getRoleLabel(user?.role) }}</ion-card-subtitle>
            </div>
          </div>
        </ion-card-header>
        <ion-card-content>
          <div class="profile-status">
            <ion-chip color="success" v-if="isOnline">
              <ion-icon :icon="ellipseOutline"></ion-icon>
              <ion-label>Онлайн</ion-label>
            </ion-chip>
            <div class="last-active" v-if="!isOnline && user?.lastActive">
              Последний вход: {{ formatDate(user?.lastActive) }}
            </div>
          </div>
        </ion-card-content>
      </ion-card>
      
      <!-- Основная информация -->
      <ion-card>
        <ion-card-header>
          <ion-card-title>Основная информация</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <ion-list lines="full">
            <ion-item>
              <ion-label position="stacked">Email</ion-label>
              <ion-input v-model="user.email" readonly></ion-input>
            </ion-item>
            <ion-item>
              <ion-label position="stacked">Должность</ion-label>
              <ion-input v-model="user.position" readonly></ion-input>
            </ion-item>
            <ion-item>
              <ion-label position="stacked">Отдел</ion-label>
              <ion-input v-model="user.department" readonly></ion-input>
            </ion-item>
            <ion-item>
              <ion-label position="stacked">Телефон</ion-label>
              <ion-input v-model="user.phone" readonly></ion-input>
            </ion-item>
          </ion-list>
        </ion-card-content>
      </ion-card>
      
      <!-- Настройки -->
      <!-- <ion-card>
        <ion-card-header>
          <ion-card-title>Настройки</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <ion-list lines="full">
            <ion-item>
              <ion-label>Уведомления</ion-label>
              <ion-toggle v-model="settings.notifications"></ion-toggle>
            </ion-item>
            <ion-item>
              <ion-label>Push-уведомления</ion-label>
              <ion-toggle v-model="settings.pushNotifications"></ion-toggle>
            </ion-item>
            <ion-item>
              <ion-label>Email-оповещения</ion-label>
              <ion-toggle v-model="settings.emailNotifications"></ion-toggle>
            </ion-item>
            <ion-item>
              <ion-label>Темная тема</ion-label>
              <ion-toggle v-model="settings.darkTheme" @ionChange="toggleDarkTheme"></ion-toggle>
            </ion-item>
          </ion-list>
        </ion-card-content>
      </ion-card> -->
      
      <!-- Действия с аккаунтом -->
      <!-- <ion-card>
        <ion-card-header>
          <ion-card-title>Аккаунт</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <ion-button expand="block" @click="changePassword">
            Изменить пароль
          </ion-button>
          <ion-button expand="block" color="medium" @click="editProfile">
            Редактировать профиль
          </ion-button>
        </ion-card-content>
      </ion-card> -->
      
      <!-- Статистика пользователя -->
      <!-- <ion-card v-if="isTeacher">
        <ion-card-header>
          <ion-card-title>Статистика</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <div class="stats-container">
            <div class="stat-item">
              <div class="stat-value">{{ stats.lessonsCount }}</div>
              <div class="stat-label">Проведено уроков</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">{{ stats.documentsCount }}</div>
              <div class="stat-label">Документов</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">{{ stats.completedTasksCount }}</div>
              <div class="stat-label">Завершено задач</div>
            </div>
          </div>
        </ion-card-content>
      </ion-card> -->
    </ion-content>
  </ion-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
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
  IonInput,
  IonToggle,
  IonChip,
  IonLabel,
  modalController,
  alertController,
  toastController
} from '@ionic/vue';
import { 
  logOutOutline,
  ellipseOutline
} from 'ionicons/icons';
import { useAuthStore } from '@/store/auth';

const router = useRouter();
const authStore = useAuthStore();

// Мок-данные для демонстрации
const user = ref({
  id: 1,
  firstName: 'Иван',
  lastName: 'Петров',
  email: 'petrov@school.ru',
  role: 'teacher',
  position: 'Учитель математики',
  department: 'Кафедра математики',
  phone: '+7 (900) 123-45-67',
  lastActive: new Date(new Date().getTime() - 1800000) // 30 минут назад
});

const settings = ref({
  notifications: true,
  pushNotifications: true,
  emailNotifications: false,
  darkTheme: false
});

const stats = ref({
  lessonsCount: 156,
  documentsCount: 23,
  completedTasksCount: 48
});

// Расчетные свойства
const isOnline = computed(() => true); // В реальном приложении будет проверка реального статуса

const isTeacher = computed(() => user.value.role === 'teacher');

// Обработчики событий
const logout = async () => {
  const alert = await alertController.create({
    header: 'Выход из системы',
    message: 'Вы уверены, что хотите выйти?',
    buttons: [
      {
        text: 'Отмена',
        role: 'cancel'
      },
      {
        text: 'Выйти',
        role: 'destructive',
        handler: () => confirmLogout()
      }
    ]
  });
  await alert.present();
};

const confirmLogout = () => {
  authStore.logout();
  router.push('/login');
  
  const toast = toastController.create({
    message: 'Вы успешно вышли из системы',
    duration: 2000,
    position: 'bottom',
    color: 'medium'
  });
  toast.then(t => t.present());
};

const changePassword = async () => {
  const alert = await alertController.create({
    header: 'Изменение пароля',
    inputs: [
      {
        name: 'currentPassword',
        type: 'password',
        placeholder: 'Текущий пароль',
        required: true
      },
      {
        name: 'newPassword',
        type: 'password',
        placeholder: 'Новый пароль',
        required: true
      },
      {
        name: 'confirmPassword',
        type: 'password',
        placeholder: 'Подтверждение пароля',
        required: true
      }
    ],
    buttons: [
      {
        text: 'Отмена',
        role: 'cancel'
      },
      {
        text: 'Изменить',
        handler: (data) => {
          if (data.newPassword !== data.confirmPassword) {
            showErrorToast('Пароли не совпадают');
            return false;
          }
          
          if (data.newPassword.length < 8) {
            showErrorToast('Пароль должен содержать не менее 8 символов');
            return false;
          }
          
          // В реальном приложении здесь будет запрос к API для изменения пароля
          showSuccessToast('Пароль успешно изменен');
          return true;
        }
      }
    ]
  });
  await alert.present();
};

const editProfile = async () => {
  // В реальном приложении здесь будет открытие модального окна для редактирования профиля
  alert('Редактирование профиля');
};

const toggleDarkTheme = (event) => {
  document.body.classList.toggle('dark', event.detail.checked);
  // В реальном приложении здесь будет сохранение настройки в локальное хранилище
};

const showSuccessToast = (message) => {
  const toast = toastController.create({
    message: message,
    duration: 2000,
    position: 'bottom',
    color: 'success'
  });
  toast.then(t => t.present());
};

const showErrorToast = (message) => {
  const toast = toastController.create({
    message: message,
    duration: 3000,
    position: 'bottom',
    color: 'danger'
  });
  toast.then(t => t.present());
};

// Вспомогательные функции
const formatDate = (date) => {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const getInitials = (name) => {
  return name.split(' ').map(word => word[0]).join('').toUpperCase();
};

const getAvatarColor = (id) => {
  const colors = [
    '#3880ff', // primary
    '#5260ff', // secondary
    '#2dd36f', // success
    '#ffc409', // warning
    '#eb445a', // danger
    '#92949c'  // medium
  ];
  return colors[id % colors.length];
};

const getRoleLabel = (role) => {
  const roles = {
    'admin': 'Администратор',
    'teacher': 'Преподаватель',
    'technical': 'Технический персонал'
  };
  return roles[role] || role;
};

// Загрузка данных при монтировании компонента
onMounted(async () => {
  try {
    // В реальном приложении здесь будет загрузка данных пользователя с сервера
    // const userData = await authStore.fetchCurrentUser();
    // user.value = userData;
    
    // Загрузка настроек из локального хранилища
    const savedSettings = localStorage.getItem('userSettings');
    if (savedSettings) {
      settings.value = JSON.parse(savedSettings);
      document.body.classList.toggle('dark', settings.value.darkTheme);
    }
  } catch (error) {
    console.error('Failed to load user data:', error);
  }
});
</script>

<style scoped>
.profile-header {
  display: flex;
  align-items: center;
  gap: 16px;
}

.profile-avatar {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: bold;
  font-size: 32px;
}

.profile-info {
  flex: 1;
}

.profile-status {
  display: flex;
  align-items: center;
  margin-top: 8px;
}

.last-active {
  font-size: 14px;
  color: var(--ion-color-medium);
}

.stats-container {
  display: flex;
  justify-content: space-around;
  text-align: center;
  margin: 10px 0;
}

.stat-item {
  flex: 1;
  padding: 10px;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: var(--ion-color-primary);
}

.stat-label {
  font-size: 12px;
  color: var(--ion-color-medium);
}

ion-card {
  margin-bottom: 16px;
}
</style>
