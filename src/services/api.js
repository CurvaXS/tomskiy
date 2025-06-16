import axios from 'axios';

// Указываем прямой URL бэкенда, чтобы избежать перенаправлений
// Важно: если URL использует proxy в Vue.config.js, убедитесь что настройки совпадают
// const API_URL = 'http://localhost:5000/api';
const API_URL = 'https://onlyytomskiy.pythonanywhere.com/api';

// Создаем экземпляр axios с базовым URL
const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  // Настройки CORS и перенаправлений
  withCredentials: true, // Обязательно для CORS с авторизацией
  maxRedirects: 0,       // Отключаем автоматические перенаправления
  timeout: 10000,        // Таймаут запроса 10 секунд
  validateStatus: function (status) {
    return status >= 200 && status < 500; // Принимаем все несерверные ошибки для обработки
  }
});

// Interceptor для добавления токена авторизации
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    console.log('API Request to:', config.url);
    console.log('Token exists:', !!token);
    
    if (token) {
      // Устанавливаем заголовок авторизации
      config.headers['Authorization'] = `Bearer ${token}`;
      console.log('Auth header set:', config.headers['Authorization']);
    } else {
      console.warn('No token found in localStorage for request to:', config.url);
    }
    
    // Явно отменяем перенаправления
    config.maxRedirects = 0;
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Interceptor для обработки ошибок
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response && error.response.status === 401) {
      // Неавторизован - перенаправляем на страницу логина
      localStorage.removeItem('token');
      localStorage.removeItem('userRole');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// API сервисы для работы с вопросами аутентификации
export const authService = {
  login: (credentials) => apiClient.post('/auth/login', credentials),
  logout: () => apiClient.post('/auth/logout'),
  getCurrentUser: () => apiClient.get('/auth/me'),
  register: (userData) => apiClient.post('/auth/register', userData),
  forgotPassword: (email) => apiClient.post('/auth/forgot-password', { email }),
  resetPassword: (token, newPassword) => apiClient.post('/auth/reset-password', { token, new_password: newPassword }),
  updateProfile: (userData) => apiClient.put('/auth/profile', userData),
};

// API сервисы для работы с расписанием
export const scheduleService = {
  getSchedule: (params) => apiClient.get('/schedule/', { params }),
  getUpcomingEvents: (limit = 5) => apiClient.get('/schedule/', { params: { upcoming: true, limit } }),
  getEventById: (id) => apiClient.get(`/schedule/${id}/`),
  createEvent: (eventData) => apiClient.post('/schedule/', eventData),
  updateEvent: (id, eventData) => apiClient.put(`/schedule/${id}/`, eventData),
  deleteEvent: (id) => apiClient.delete(`/schedule/${id}/`),
};

// API сервисы для работы с задачами
export const taskService = {
  getTasks: (params) => apiClient.get('/tasks/', { params }),
  getActiveTasks: (limit = 5) => apiClient.get('/tasks/', { params: { status: 'active', limit } }),
  getTaskById: (id) => apiClient.get(`/tasks/${id}/`),
  createTask: (taskData) => apiClient.post('/tasks/', taskData),
  updateTask: (id, taskData) => apiClient.put(`/tasks/${id}/`, taskData),
  deleteTask: (id) => apiClient.delete(`/tasks/${id}/`),
  completeTask: (id) => apiClient.patch(`/tasks/${id}/complete/`),
  cancelTask: (id) => apiClient.post(`/tasks/${id}/cancel/`),
  assignTask: (id, userId) => apiClient.post(`/tasks/${id}/assign/`, { userId }),
  unassignTask: (id, userId) => apiClient.delete(`/tasks/${id}/assign/${userId}/`),
};

export const documentService = {
  getDocuments: (params) => apiClient.get('/documents/', { params }),
  getDocument: (id) => apiClient.get(`/documents/${id}/`),
  uploadDocument: (formData) => apiClient.post('/documents/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  updateDocument: (id, data) => apiClient.put(`/documents/${id}/`, data),
  deleteDocument: (id) => apiClient.delete(`/documents/${id}/`),
  signDocument: (id) => apiClient.post(`/documents/${id}/sign/`),
  // Добавляем недостающие методы для работы с типами документов
  getDocumentTypes: () => {
    // Если на бэкенде нет эндпоинта, возвращаем моковые данные
    console.log('Getting document types');
    return Promise.resolve({
      data: {
        documentTypes: [
          { id: 1, name: 'Приказ' },
          { id: 2, name: 'Распоряжение' },
          { id: 3, name: 'Служебная записка' },
          { id: 4, name: 'Заявление' },
          { id: 5, name: 'Отчет' }
        ]
      }
    });
  },
  getDocumentStatuses: () => {
    // Если на бэкенде нет эндпоинта, возвращаем моковые данные
    return Promise.resolve({
      data: {
        documentStatuses: [
          { id: 1, name: 'Черновик' },
          { id: 2, name: 'На рассмотрении' },
          { id: 3, name: 'Одобрен' },
          { id: 4, name: 'Отклонен' },
          { id: 5, name: 'Подписан' }
        ]
      }
    });
  }
};

export const chatService = {
  getChats: () => apiClient.get('/chats/'),
  getChat: (id) => apiClient.get(`/chats/${id}/`),
  createChat: (data) => apiClient.post('/chats/', data),
  updateChat: (id, data) => apiClient.put(`/chats/${id}/`, data),
  deleteChat: (id) => apiClient.delete(`/chats/${id}/`),
  getMessages: (chatId, params) => apiClient.get(`/chats/${chatId}/messages/`, { params }),
  sendMessage: (chatId, data) => apiClient.post(`/chats/${chatId}/messages/`, data),
  deleteMessage: (chatId, messageId) => apiClient.delete(`/chats/${chatId}/messages/${messageId}/`),
};

export const analyticsService = {
  getTeacherLoad: (params) => apiClient.get('/analytics/teacher-load/', { params }),
  getClassroomUsage: (params) => apiClient.get('/analytics/classroom-usage/', { params }),
  exportReport: (type, format, params) => apiClient.get(`/analytics/export/${type}/`, {
    params: { ...params, format },
    responseType: 'blob',
  }),
};

// Примечание: Если маршрут /notifications/ не реализован в бэкенде, то можно использовать /messages/ или другой маршрут
export const notificationService = {
  // Временно используем фиктивные данные для дашборда
  getNotifications: (params) => {
    console.log('Using mock notifications data');
    return Promise.resolve({
      data: {
        items: [
          { id: 1, title: 'Новое уведомление', message: 'Добавлено новое событие в расписании', read: false, created_at: new Date().toISOString() },
          { id: 2, title: 'Задача назначена', message: 'Вам назначена новая задача', read: false, created_at: new Date().toISOString() }
        ],
        total: 2
      }
    });
  },
  markAsRead: (id) => Promise.resolve({ data: { success: true } }),
  markAllAsRead: () => Promise.resolve({ data: { success: true } }),
  getUnreadCount: () => Promise.resolve({ data: { count: 2 } }),
};

export default apiClient;
