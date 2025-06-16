import { defineStore } from 'pinia';
import { taskService } from '@/services/api';

export const useTaskStore = defineStore('tasks', {
  state: () => ({
    tasks: [],
    loading: false,
    error: null,
    taskPriorities: ['high', 'medium', 'low'],
    taskStatuses: ['active', 'completed', 'archived']
  }),

  getters: {
    getTaskById: (state) => (id) => {
      return state.tasks.find(task => task.id === id);
    },
    
    activeTasks: (state) => {
      return state.tasks.filter(task => 
        task.status === 'active' || task.status === 'pending' || !task.status
      ).sort((a, b) => {
        // Сортировка по приоритету и сроку
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
        if (priorityDiff !== 0) return priorityDiff;
        
        // При равном приоритете сортируем по сроку
        const aDate = new Date(a.dueDate);
        const bDate = new Date(b.dueDate);
        return aDate - bDate;
      });
    },
    
    completedTasks: (state) => {
      return state.tasks.filter(task => task.status === 'completed')
        .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));
    },
    
    upcomingTasks: (state) => {
      const now = new Date();
      const limit = 5; // По умолчанию 5 предстоящих задач
      return state.tasks
        .filter(task => (task.status === 'active' || task.status === 'pending') && new Date(task.dueDate) >= now)
        .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
        .slice(0, limit);
    }
  },

  actions: {
    // Загрузка задач с сервера
    async fetchTasks(params = {}) {
      this.loading = true;
      this.error = null;

      try {
        const response = await taskService.getTasks(params);
        console.log('Task API response:', response);
        
        // Обрабатываем ответ в зависимости от формата данных API
        if (response.data && Array.isArray(response.data.tasks)) {
          this.tasks = response.data.tasks;
        } else if (response.data && Array.isArray(response.data.items)) {
          this.tasks = response.data.items;
        } else if (response.data && response.data.total !== undefined) {
          // Формат ответа с пагинацией
          this.tasks = response.data.items || [];
        } else if (Array.isArray(response.data)) {
          this.tasks = response.data;
        } else {
          console.error('Unexpected API response format:', response.data);
          this.tasks = [];
        }
        
        console.log('Tasks loaded into store:', this.tasks);
        return this.tasks;
      } catch (error) {
        console.error('Error fetching tasks:', error);
        this.error = error.message || 'Ошибка загрузки задач';
        return [];
      } finally {
        this.loading = false;
      }
    },
    
    // Добавление новой задачи
    async addTask(taskData) {
      this.loading = true;
      this.error = null;

      try {
        const response = await taskService.createTask(taskData);
        const newTask = response.data;
        this.tasks.unshift(newTask);
        return newTask;
      } catch (error) {
        console.error('Error adding task:', error);
        this.error = error.message || 'Ошибка при создании задачи';
        throw error;
      } finally {
        this.loading = false;
      }
    },
    
    // Обновление задачи
    async updateTask(id, taskData) {
      this.loading = true;
      this.error = null;

      try {
        const response = await taskService.updateTask(id, taskData);
        const updatedTask = response.data;
        
        const index = this.tasks.findIndex(task => task.id === id);
        if (index !== -1) {
          this.tasks[index] = { ...this.tasks[index], ...updatedTask };
        }
        
        return updatedTask;
      } catch (error) {
        console.error('Error updating task:', error);
        this.error = error.message || 'Ошибка при обновлении задачи';
        throw error;
      } finally {
        this.loading = false;
      }
    },
    
    // Удаление задачи
    async deleteTask(id) {
      this.loading = true;
      this.error = null;

      try {
        await taskService.deleteTask(id);
        const index = this.tasks.findIndex(task => task.id === id);
        if (index !== -1) {
          this.tasks.splice(index, 1);
        }
        return true;
      } catch (error) {
        console.error('Error deleting task:', error);
        this.error = error.message || 'Ошибка при удалении задачи';
        throw error;
      } finally {
        this.loading = false;
      }
    },
    
    // Изменение статуса задачи
    async changeTaskStatus(id, status) {
      return this.updateTask(id, { status });
    },
    
    // Получение типов приоритетов и статусов
    async fetchTaskMetadata() {
      try {
        const response = await taskService.getTaskMetadata();
        if (response.data) {
          if (response.data.priorities) this.taskPriorities = response.data.priorities;
          if (response.data.statuses) this.taskStatuses = response.data.statuses;
        }
        return response.data;
      } catch (error) {
        console.error('Error fetching task metadata:', error);
        this.error = error.message || 'Ошибка при получении метаданных задач';
        return null;
      }
    }
  }
});
