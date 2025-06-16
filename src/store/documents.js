import { defineStore } from 'pinia';
import { documentService } from '@/services/api';

export const useDocumentsStore = defineStore('documents', {
  state: () => ({
    documents: [],
    loading: false,
    error: null,
    documentTypes: [],
    documentStatuses: []
  }),

  getters: {
    getDocumentById: (state) => (id) => {
      return state.documents.find(doc => doc.id === id);
    },
    
    getDocumentsByCategory: (state) => (category) => {
      if (category === 'all') return state.documents;
      return state.documents.filter(doc => doc.category === category);
    },
    
    recentDocuments: (state) => {
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      
      return state.documents
        .filter(doc => new Date(doc.created_at || doc.createdAt) >= threeDaysAgo)
        .sort((a, b) => new Date(b.created_at || b.createdAt) - new Date(a.created_at || a.createdAt))
        .slice(0, 3);
    }
  },

  actions: {
    // Загрузка документов с сервера
    async fetchDocuments(params = {}) {
      this.loading = true;
      this.error = null;

      try {
        const response = await documentService.getDocuments(params);
        
        // Проверяем, что API вернуло правильный формат данных
        if (response.data && Array.isArray(response.data.documents)) {
          this.documents = response.data.documents;
          this.total = response.data.total || this.documents.length;
          this.page = response.data.page || 1;
          this.pages = response.data.pages || 1;
          this.perPage = response.data.per_page || 10;
        } else if (response.data && Array.isArray(response.data.items)) {
          this.documents = response.data.items;
        } else if (Array.isArray(response.data)) {
          this.documents = response.data;
        } else {
          console.error('Unexpected API response format:', response.data);
          this.documents = [];
        }
        
        return this.documents;
      } catch (error) {
        console.error('Error fetching documents:', error);
        this.error = error.message || 'Ошибка загрузки документов';
        return [];
      } finally {
        this.loading = false;
      }
    },

    // Получение конкретного документа
    async fetchDocument(id) {
      try {
        const response = await documentService.getDocument(id);
        const document = response.data;
        
        // Обновляем документ в списке, если он там есть
        const index = this.documents.findIndex(doc => doc.id === id);
        if (index !== -1) {
          this.documents[index] = document;
        } else {
          this.documents.push(document);
        }
        
        return document;
      } catch (error) {
        console.error(`Error fetching document ${id}:`, error);
        throw error;
      }
    },

    // Загрузка нового документа
    async uploadDocument(formData) {
      try {
        const response = await documentService.uploadDocument(formData);
        const newDoc = response.data;
        
        // Добавляем документ в список
        this.documents.unshift(newDoc);
        
        return newDoc;
      } catch (error) {
        console.error('Error uploading document:', error);
        throw error;
      }
    },

    // Обновление документа
    async updateDocument(id, data) {
      try {
        const response = await documentService.updateDocument(id, data);
        const updatedDoc = response.data;
        
        // Обновляем документ в списке
        const index = this.documents.findIndex(doc => doc.id === id);
        if (index !== -1) {
          this.documents[index] = { ...this.documents[index], ...updatedDoc };
        }
        
        return updatedDoc;
      } catch (error) {
        console.error(`Error updating document ${id}:`, error);
        throw error;
      }
    },

    // Удаление документа
    async deleteDocument(id) {
      try {
        await documentService.deleteDocument(id);
        
        // Удаляем документ из списка
        this.documents = this.documents.filter(doc => doc.id !== id);
        
        return true;
      } catch (error) {
        console.error(`Error deleting document ${id}:`, error);
        throw error;
      }
    },
    
    // Подписание документа
    async signDocument(id) {
      try {
        const response = await documentService.signDocument(id);
        
        // Обновляем статус документа в списке
        const index = this.documents.findIndex(doc => doc.id === id);
        if (index !== -1) {
          this.documents[index].is_signed = true;
          this.documents[index].status = 'signed';
        }
        
        return response.data;
      } catch (error) {
        console.error(`Error signing document ${id}:`, error);
        throw error;
      }
    },
    
    // Получение списка типов документов
    async fetchDocumentTypes() {
      try {
        const response = await documentService.getDocumentTypes();
        this.documentTypes = response.data.documentTypes || [];
        return this.documentTypes;
      } catch (error) {
        console.error('Error fetching document types:', error);
        return [];
      }
    },
    
    // Получение списка статусов документов
    async fetchDocumentStatuses() {
      try {
        const response = await documentService.getDocumentStatuses();
        this.documentStatuses = response.data.documentStatuses || [];
        return this.documentStatuses;
      } catch (error) {
        console.error('Error fetching document statuses:', error);
        return [];
      }
    }
  }
});
