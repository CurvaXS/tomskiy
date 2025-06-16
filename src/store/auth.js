import { defineStore } from 'pinia';
import { authService } from '@/services/api';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    token: localStorage.getItem('token') || null,
    loading: false,
    error: null,
  }),

  getters: {
    isAuthenticated: (state) => !!state.token,
    isAdmin: (state) => state.user && state.user.role === 'admin',
    isTeacher: (state) => state.user && state.user.role === 'teacher',
    isTechnicalStaff: (state) => state.user && state.user.role === 'technical',
    userRole: (state) => state.user ? state.user.role : null,
  },

  actions: {
    async login(credentials) {
      this.loading = true;
      this.error = null;
      
      try {
        const response = await authService.login(credentials);
        const { token, user } = response.data;
        
        this.token = token;
        this.user = user;
        
        localStorage.setItem('token', token);
        localStorage.setItem('userRole', user.role);
        
        return Promise.resolve(user);
      } catch (error) {
        this.error = error.response?.data?.message || 'Ошибка авторизации';
        return Promise.reject(error);
      } finally {
        this.loading = false;
      }
    },
    
    async register(userData) {
      this.loading = true;
      this.error = null;
      
      try {
        const response = await authService.register(userData);
        const { message } = response.data;
        return Promise.resolve(message);
      } catch (error) {
        this.error = error.response?.data?.message || 'Ошибка регистрации';
        return Promise.reject(error);
      } finally {
        this.loading = false;
      }
    },
    
    async forgotPassword(email) {
      this.loading = true;
      this.error = null;
      
      try {
        const response = await authService.forgotPassword(email);
        const { message } = response.data;
        return Promise.resolve(message);
      } catch (error) {
        this.error = error.response?.data?.message || 'Ошибка восстановления пароля';
        return Promise.reject(error);
      } finally {
        this.loading = false;
      }
    },
    
    async fetchCurrentUser() {
      if (!this.token) return Promise.resolve(null);
      
      this.loading = true;
      
      try {
        const response = await authService.getCurrentUser();
        this.user = response.data;
        return Promise.resolve(this.user);
      } catch (error) {
        this.logout();
        return Promise.reject(error);
      } finally {
        this.loading = false;
      }
    },
    
    logout() {
      this.user = null;
      this.token = null;
      localStorage.removeItem('token');
      localStorage.removeItem('userRole');
    },
  },
});
