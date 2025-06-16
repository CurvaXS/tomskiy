import { defineStore } from 'pinia';
import { scheduleService } from '@/services/api';

export const useScheduleStore = defineStore('schedule', {
  state: () => ({
    events: [],
    loading: false,
    error: null,
    eventTypes: []
  }),

  getters: {
    getEventById: (state) => (id) => {
      return state.events.find(event => event.id === id);
    },
    
    getEventsByDate: (state) => (date) => {
      const targetDate = new Date(date);
      targetDate.setHours(0, 0, 0, 0);
      const endDate = new Date(targetDate);
      endDate.setHours(23, 59, 59, 999);
      
      return state.events.filter(event => {
        // Поддерживаем оба формата API: start_time и startTime
        const eventStartProp = event.start_time || event.startTime;
        const eventDate = new Date(eventStartProp);
        return eventDate >= targetDate && eventDate <= endDate;
      });
    },
    
    getEventsByHour: (state) => (date, hour) => {
      const targetDate = new Date(date);
      targetDate.setHours(hour, 0, 0, 0);
      const endHour = new Date(targetDate);
      endHour.setHours(hour + 1, 0, 0, 0);
      
      return state.events.filter(event => {
        // Поддерживаем оба формата API: start_time/end_time и startTime/endTime
        const eventStartProp = event.start_time || event.startTime;
        const eventEndProp = event.end_time || event.endTime;
        const eventStart = new Date(eventStartProp);
        const eventEnd = new Date(eventEndProp);
        return eventStart < endHour && eventEnd > targetDate;
      });
    },
    
    upcomingEvents: (state) => (limit = 5) => {
      const now = new Date();
      return state.events
        .filter(event => {
          const eventEndProp = event.end_time || event.endTime;
          return new Date(eventEndProp) >= now;
        })
        .sort((a, b) => {
          const aStartProp = a.start_time || a.startTime;
          const bStartProp = b.start_time || b.startTime;
          return new Date(aStartProp) - new Date(bStartProp);
        })
        .slice(0, limit);
    }
  },

  actions: {
    // Загрузка событий с сервера
    async fetchEvents(params = {}) {
      this.loading = true;
      this.error = null;

      try {
        const response = await scheduleService.getSchedule(params);
        
        // Проверяем, что API вернуло правильный формат данных
        if (response.data && Array.isArray(response.data.events)) {
          this.events = response.data.events;
        } else if (Array.isArray(response.data)) {
          this.events = response.data;
        } else {
          console.error('Unexpected API response format:', response.data);
          this.events = [];
        }
        
        return this.events;
      } catch (error) {
        console.error('Error fetching events:', error);
        this.error = error.message || 'Ошибка загрузки расписания';
        return [];
      } finally {
        this.loading = false;
      }
    },
    
    // Загрузка предстоящих событий
    async fetchUpcomingEvents(limit = 5) {
      try {
        const response = await scheduleService.getUpcomingEvents(limit);
        
        // Добавляем события в общий список, если их там еще нет
        if (response.data && Array.isArray(response.data.events)) {
          const upcomingEvents = response.data.events;
          
          upcomingEvents.forEach(event => {
            const existingIndex = this.events.findIndex(e => e.id === event.id);
            if (existingIndex === -1) {
              this.events.push(event);
            } else {
              this.events[existingIndex] = event;
            }
          });
          
          return upcomingEvents;
        }
        
        return [];
      } catch (error) {
        console.error('Error fetching upcoming events:', error);
        return [];
      }
    },

    // Получение конкретного события
    async fetchEvent(id) {
      try {
        const response = await scheduleService.getEventById(id);
        const event = response.data;
        
        // Обновляем событие в списке, если оно там есть
        const index = this.events.findIndex(e => e.id === id);
        if (index !== -1) {
          this.events[index] = event;
        } else {
          this.events.push(event);
        }
        
        return event;
      } catch (error) {
        console.error(`Error fetching event ${id}:`, error);
        throw error;
      }
    },

    // Добавление нового события
    async createEvent(eventData) {
      try {
        const response = await scheduleService.createEvent(eventData);
        const newEvent = response.data;
        
        // Добавляем событие в список
        this.events.push(newEvent);
        
        return newEvent;
      } catch (error) {
        console.error('Error creating event:', error);
        throw error;
      }
    },

    // Обновление события
    async updateEvent(id, eventData) {
      try {
        const response = await scheduleService.updateEvent(id, eventData);
        const updatedEvent = response.data;
        
        // Обновляем событие в списке
        const index = this.events.findIndex(event => event.id === id);
        if (index !== -1) {
          this.events[index] = { ...this.events[index], ...updatedEvent };
        }
        
        return updatedEvent;
      } catch (error) {
        console.error(`Error updating event ${id}:`, error);
        throw error;
      }
    },

    // Удаление события
    async deleteEvent(id) {
      try {
        await scheduleService.deleteEvent(id);
        
        // Удаляем событие из списка
        this.events = this.events.filter(event => event.id !== id);
        
        return true;
      } catch (error) {
        console.error(`Error deleting event ${id}:`, error);
        throw error;
      }
    },
    
    // Получение списка типов событий
    async fetchEventTypes() {
      try {
        const response = await scheduleService.getEventTypes();
        this.eventTypes = response.data.eventTypes || [];
        return this.eventTypes;
      } catch (error) {
        console.error('Error fetching event types:', error);
        return [];
      }
    }
  }
});
