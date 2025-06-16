import { createRouter, createWebHistory } from '@ionic/vue-router';
import { defineComponent } from 'vue';

// Лейауты
const MainLayout = () => import('@/views/layouts/MainLayout.vue');

// Страницы авторизации
const LoginPage = () => import('@/views/auth/LoginPage.vue');
const RegisterPage = () => import('@/views/auth/RegisterPage.vue');
const ForgotPasswordPage = () => import('@/views/auth/ForgotPasswordPage.vue');

// Основные страницы
const DashboardPage = () => import('@/views/DashboardPage.vue');
const SchedulePage = () => import('@/views/SchedulePage.vue');
const TasksPage = () => import('@/views/TasksPage.vue');
const DocumentsPage = () => import('@/views/DocumentsPage.vue');
const ChatPage = () => import('@/views/ChatPage.vue');
const ProfilePage = () => import('@/views/ProfilePage.vue');
const AnalyticsPage = () => import('@/views/AnalyticsPage.vue');

// Функция проверки авторизации
const isAuthenticated = () => {
  return !!localStorage.getItem('token');
};

// Защита маршрутов
const authGuard = (to, from, next) => {
  if (isAuthenticated()) {
    next();
  } else {
    next('/login');
  }
};

// Маршруты
const routes = [
  {
    path: '/',
    redirect: '/dashboard'
  },
  {
    path: '/login',
    name: 'login',
    component: LoginPage
  },
  {
    path: '/register',
    name: 'register',
    component: RegisterPage
  },
  {
    path: '/forgot-password',
    name: 'forgot-password',
    component: ForgotPasswordPage
  },
  {
    path: '/',
    component: MainLayout,
    beforeEnter: authGuard,
    children: [
      {
        path: 'dashboard',
        name: 'dashboard',
        component: DashboardPage
      },
      {
        path: 'schedule',
        name: 'schedule',
        component: SchedulePage
      },
      {
        path: 'tasks',
        name: 'tasks',
        component: TasksPage
      },
      {
        path: 'documents',
        name: 'documents',
        component: DocumentsPage
      },
      {
        path: 'chat',
        name: 'chat',
        component: ChatPage
      },
      {
        path: 'profile',
        name: 'profile',
        component: ProfilePage
      },
      {
        path: 'analytics',
        name: 'analytics',
        component: AnalyticsPage,
        meta: {
          requiresAdmin: true
        }
      }
    ]
  }
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
});

// Проверка прав доступа
router.beforeEach((to, from, next) => {
  if (to.matched.some(record => record.meta.requiresAdmin)) {
    const userRole = localStorage.getItem('userRole');
    if (userRole === 'admin') {
      next();
    } else {
      next('/dashboard');
    }
  } else {
    next();
  }
});

export default router;
