<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Расписание</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="showAddEventModal">
            <ion-icon slot="icon-only" :icon="addOutline"></ion-icon>
          </ion-button>
          <ion-button @click="toggleView">
            <ion-icon slot="icon-only" :icon="viewMode === 'day' ? calendarClearOutline : todayOutline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
      <ion-toolbar>
        <ion-segment v-model="viewMode">
          <ion-segment-button value="day">
            <ion-label>День</ion-label>
          </ion-segment-button>
          <ion-segment-button value="week">
            <ion-label>Неделя</ion-label>
          </ion-segment-button>
          <ion-segment-button value="month">
            <ion-label>Месяц</ion-label>
          </ion-segment-button>
        </ion-segment>
      </ion-toolbar>
    </ion-header>
    
    <ion-content class="ion-padding">
      <ion-refresher slot="fixed" @ionRefresh="refreshSchedule($event)">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>
      
      <!-- Календарь/Дата -->
      <div class="date-navigation">
        <ion-button fill="clear" @click="navigateToPrevious">
          <ion-icon slot="icon-only" :icon="chevronBackOutline"></ion-icon>
        </ion-button>
        <h2>{{ formattedCurrentDate }}</h2>
        <ion-button fill="clear" @click="navigateToNext">
          <ion-icon slot="icon-only" :icon="chevronForwardOutline"></ion-icon>
        </ion-button>
      </div>
      
      <!-- Дневной режим -->
      <div v-if="viewMode === 'day'">
        <div class="time-slots">
          <div v-for="hour in workHours" :key="hour" class="time-slot">
            <div class="time-label">{{ formatHour(hour) }}</div>
            <div class="events-container">
              <ion-card 
                v-for="event in getEventsByHour(hour)" 
                :key="event.id" 
                :color="getEventColor(event)"
                @click="showEventDetails(event)"
                class="event-card"
              >
                <ion-card-header>
                  <ion-card-title>{{ event.title || event.name }}</ion-card-title>
                  <ion-card-subtitle>{{ formatTimeRangeFromEvent(event) }}</ion-card-subtitle>
                </ion-card-header>
                <ion-card-content>
                  <p v-if="event.location"><ion-icon :icon="locationOutline"></ion-icon> {{ event.location }}</p>
                  <p v-if="event.description || event.desc">{{ event.description || event.desc }}</p>
                  <!-- Индикатор прикрепленных документов -->
                  <div class="documents-indicator" v-if="(event.documentsCount && event.documentsCount > 0) || (event.documents && event.documents.length > 0)">
                    <ion-icon :icon="documentsOutline"></ion-icon>
                    <ion-badge>{{ event.documentsCount || (event.documents ? event.documents.length : 0) }}</ion-badge>
                  </div>
                  <div class="event-actions" v-if="canManageEvent(event)" @click.stop>
                    <!-- <ion-button size="small" fill="clear" @click="editEvent(event)">
                      <ion-icon :icon="createOutline"></ion-icon>
                    </ion-button> -->
                    <!-- <ion-button size="small" fill="clear" color="primary" @click="manageEventDocuments(event)">
                      <ion-icon :icon="documentsOutline"></ion-icon>
                    </ion-button> -->
                    <ion-button size="small" fill="clear" color="danger" @click="confirmDeleteEvent(event)">
                      <ion-icon :icon="trashOutline"></ion-icon>
                    </ion-button>
                  </div>
                </ion-card-content>
              </ion-card>
              <div v-if="getEventsByHour(hour).length === 0" class="empty-slot">
                <!-- Пустые слоты -->
                <div v-if="hour === 10" class="debug-info">
                  Всего событий: {{ scheduleStore.events.length }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Недельный режим -->
      <div v-else-if="viewMode === 'week'" class="week-view">
        <div class="week-header">
          <div class="day-header" v-for="day in weekDays" :key="day.date">
            <div class="day-name">{{ day.name }}</div>
            <div class="day-date" :class="{ 'current-day': isCurrentDay(day.date) }">
              {{ formatDayDate(day.date) }}
            </div>
          </div>
        </div>
        <div class="week-body">
          <div class="week-time-slots">
            <div v-for="hour in workHours" :key="hour" class="week-hour">
              <div class="week-time-label">{{ formatHour(hour) }}</div>
              <div class="week-day-slots">
                <div v-for="day in weekDays" :key="day.date" class="week-day-slot">
                  <ion-card v-for="event in getEventsByHourAndDay(hour, day.date)" :key="event.id" 
                         :color="getEventColor(event)" class="week-event">
                    <ion-card-header>
                      <ion-card-title>{{ event.title || event.name }}</ion-card-title>
                    </ion-card-header>
                    <ion-card-content>
                      <p>{{ formatTimeRangeFromEvent(event) }}</p>
                      <p v-if="event.location"><ion-icon :icon="locationOutline"></ion-icon> {{ event.location }}</p>
                      <p v-if="event.description || event.desc">{{ event.description || event.desc }}</p>
                    </ion-card-content>
                  </ion-card>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Месячный режим -->
      <div v-else class="month-view">
        <div class="month-grid">
          <div class="month-weekdays">
            <div v-for="dayName in ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']" :key="dayName" class="month-weekday">
              {{ dayName }}
            </div>
          </div>
          <div class="month-days">
            <div v-for="day in monthDays" :key="day.date.toISOString()" 
                 class="month-day" 
                 :class="{ 'different-month': !isSameMonth(day.date), 'current-day': isCurrentDay(day.date) }"
                 @click="selectDay(day.date)">
              <div class="month-day-number">{{ day.date.getDate() }}</div>
              <div class="month-day-events">
                <div v-for="event in day.events.slice(0, 2)" :key="event.id" 
                     class="month-day-event" 
                     :style="{ backgroundColor: getEventColorValue(event) }">
                  {{ event.title }}
                </div>
                <div v-if="day.events.length > 2" class="month-day-more">
                  +{{ day.events.length - 2 }} еще
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
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
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardSubtitle,
  IonCardContent,
  IonBadge,
  IonRefresher,
  IonRefresherContent,
  alertController,
  modalController,
  toastController
} from '@ionic/vue';
import { 
  addOutline,
  calendarOutline,
  calendarClearOutline,
  todayOutline,
  chevronBackOutline,
  chevronForwardOutline,
  locationOutline,
  documentsOutline,
  createOutline,
  trashOutline
} from 'ionicons/icons';
import { formatDate, addDays, startOfWeek, endOfWeek, addWeeks, startOfMonth, endOfMonth, addMonths } from 'date-fns';
import { ru } from 'date-fns/locale';
import EventCreateModal from '@/components/modals/EventCreateModal.vue';
import EventDetailsModal from '@/components/modals/EventDetailsModal.vue';
import EventDocumentsModal from '@/components/modals/EventDocumentsModal.vue';
import { useAuthStore } from '@/store/auth';
import { useScheduleStore } from '@/store/schedule';
import { scheduleService } from '@/services/api';

const authStore = useAuthStore();
const scheduleStore = useScheduleStore();
const loading = ref(false);
const isAdmin = computed(() => authStore.isAdmin);

// Параметры отображения
const viewMode = ref('day');
const currentDate = ref(new Date());
// Расширенный диапазон рабочих часов, чтобы включить ранние утренние часы (6:00 - 19:00)
const workHours = ref(Array.from({ length: 14 }, (_, i) => i + 6));

// Загрузка событий расписания из хранилища Pinia
const fetchEvents = async () => {
  try {
    loading.value = true;
    // Передаем параметры для загрузки событий в зависимости от режима просмотра
    const params = {
      mode: viewMode.value,
      date: currentDate.value.toISOString(),
    };
    
    console.log('Запрос к API с параметрами:', params);
    
    // Взглянем на ответ сервера напрямую через axios
    try {
      const directResponse = await import('@/services/api').then(module => module.default);
      const apiResponse = await directResponse.get('/schedule/', { params });
      console.log('Прямой ответ от API:', apiResponse.data);
      if (apiResponse.data && Array.isArray(apiResponse.data.events)) {
        console.log('Получено событий от API:', apiResponse.data.events.length); 
      } else if (Array.isArray(apiResponse.data)) {
        console.log('Получено событий от API (direct array):', apiResponse.data.length);
      } else {
        console.log('Неожиданный формат данных:', apiResponse.data);
      }
    } catch (apiError) {
      console.error('Ошибка при прямом запросе к API:', apiError);
    }
    
    // Теперь вызовем через store
    await scheduleStore.fetchEvents(params);
    
    // Логируем события после загрузки
    console.log('Загружено событий:', scheduleStore.events.length);
    
    if (scheduleStore.events.length > 0) {
      const firstEvent = scheduleStore.events[0];
      console.log('Первое событие:', firstEvent);
      
      // Выводим все ключи первого события для отладки
      console.log('Ключи события:', Object.keys(firstEvent));
      
      // Проверяем поля с датами
      const startDate = getEventStart(firstEvent);
      console.log('Дата начала события:', startDate);
      
      // Проверка с какими полями работаем
      if (firstEvent.startTime) console.log('startTime есть:', firstEvent.startTime);
      if (firstEvent.start_time) console.log('start_time есть:', firstEvent.start_time);
      if (firstEvent.start) console.log('start есть:', firstEvent.start);
    }
    
    // Проверим фильтрацию для текущего режима
    if (viewMode.value === 'day') {
      const eventsForToday = getEventsForDay(currentDate.value);
      console.log('Режим День - Событий на сегодня:', eventsForToday.length);
      
      // Проверим все часы
      workHours.value.forEach(hour => {
        const eventsForHour = getEventsByHour(hour);
        if (eventsForHour.length > 0) {
          console.log(`Событий для часа ${hour}:00:`, eventsForHour.length);
          eventsForHour.forEach((event, index) => {
            const eventStart = getEventStart(event);
            if (eventStart) {
              console.log(`Событие ${index} для часа ${hour}: время начала =`, eventStart);
            }
          });
        }
      });
    }
  } catch (error) {
    console.error('Ошибка при загрузке данных расписания:', error);
  } finally {
    loading.value = false;
  }
};

// Загрузка данных при монтировании компонента
onMounted(fetchEvents);

// Расчетные свойства
const formattedCurrentDate = computed(() => {
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  return currentDate.value.toLocaleDateString('ru-RU', options);
});

const weekDays = computed(() => {
  const startOfWeek = new Date(currentDate.value);
  // Устанавливаем начало недели на понедельник
  const day = startOfWeek.getDay();
  const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
  startOfWeek.setDate(diff);
  
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(startOfWeek);
    date.setDate(startOfWeek.getDate() + i);
    return {
      date,
      name: date.toLocaleDateString('ru-RU', { weekday: 'short' })
    };
  });
});

const monthDays = computed(() => {
  const year = currentDate.value.getFullYear();
  const month = currentDate.value.getMonth();
  
  // Первый день месяца
  const firstDay = new Date(year, month, 1);
  // День недели первого дня месяца (0 - воскресенье, 1 - понедельник, ...)
  let dayOfWeek = firstDay.getDay() || 7; // Преобразуем воскресенье (0) в 7
  dayOfWeek = dayOfWeek - 1; // Корректируем, чтобы понедельник был 0
  
  // Последний день месяца
  const lastDay = new Date(year, month + 1, 0);
  
  const days = [];
  
  // Добавляем дни предыдущего месяца
  for (let i = dayOfWeek - 1; i >= 0; i--) {
    const date = new Date(year, month, -i);
    days.push({
      date,
      events: getEventsForDay(date)
    });
  }
  
  // Добавляем дни текущего месяца
  for (let i = 1; i <= lastDay.getDate(); i++) {
    const date = new Date(year, month, i);
    days.push({
      date,
      events: getEventsForDay(date)
    });
  }
  
  // Добавляем дни следующего месяца, чтобы заполнить сетку
  const remainingDays = 42 - days.length; // 6 недель по 7 дней
  for (let i = 1; i <= remainingDays; i++) {
    const date = new Date(year, month + 1, i);
    days.push({
      date,
      events: getEventsForDay(date)
    });
  }
  
  return days;
});

// Обработчики событий
const navigateToPrevious = () => {
  if (viewMode.value === 'day') {
    currentDate.value.setDate(currentDate.value.getDate() - 1);
  } else if (viewMode.value === 'week') {
    currentDate.value.setDate(currentDate.value.getDate() - 7);
  } else if (viewMode.value === 'month') {
    currentDate.value.setMonth(currentDate.value.getMonth() - 1);
  }
  currentDate.value = new Date(currentDate.value);
};

const navigateToNext = () => {
  if (viewMode.value === 'day') {
    currentDate.value.setDate(currentDate.value.getDate() + 1);
  } else if (viewMode.value === 'week') {
    currentDate.value.setDate(currentDate.value.getDate() + 7);
  } else if (viewMode.value === 'month') {
    currentDate.value.setMonth(currentDate.value.getMonth() + 1);
  }
  currentDate.value = new Date(currentDate.value);
};

const toggleView = () => {
  if (viewMode.value === 'day') {
    viewMode.value = 'month';
  } else {
    viewMode.value = 'day';
  }
};

const showAddEventModal = async () => {
  const modal = await modalController.create({
    component: EventCreateModal,
    componentProps: {
      date: currentDate.value
    }
  });
  
  modal.onDidDismiss().then(async ({ data }) => {
    if (data && data.created) {
      try {
        // Добавляем новое событие через хранилище Pinia
        await scheduleStore.createEvent(data.event);
        // Обновляем данные
        await fetchEvents();
        
        // Показываем уведомление об успехе
        const toast = await toastController.create({
          message: 'Событие успешно создано',
          duration: 2000,
          color: 'success',
          position: 'bottom'
        });
        toast.present();
      } catch (error) {
        console.error('Ошибка при создании события:', error);
        const toast = await toastController.create({
          message: 'Ошибка при создании события',
          duration: 2000,
          color: 'danger',
          position: 'bottom'
        });
        toast.present();
      }
    }
  });
  
  return modal.present();
};

// Показ деталей события
const showEventDetails = async (event) => {
  const modal = await modalController.create({
    component: EventDetailsModal,
    componentProps: {
      event: event
    }
  });
  
  modal.onDidDismiss().then(async ({ data }) => {
    if (data && data.updated) {
      // Обновляем список событий при изменении
      try {
        // Сначала обновляем событие через хранилище
        await scheduleStore.updateEvent(data.event);
        // Затем обновляем список событий
        await fetchEvents();
        
        // Показываем уведомление об успехе
        const toast = await toastController.create({
          message: 'Событие успешно обновлено',
          duration: 2000,
          color: 'success',
          position: 'bottom'
        });
        toast.present();
      } catch (error) {
        console.error('Ошибка при обновлении события:', error);
      }
    }
  });
  
  return modal.present();
};

// Управление документами события
const manageEventDocuments = async (event) => {
  const modal = await modalController.create({
    component: EventDocumentsModal,
    componentProps: {
      event: event
    }
  });
  
  modal.onDidDismiss().then(async ({ data }) => {
    if (data && data.documentsUpdated) {
      // После обновления документов события, обновляем данные
      try {
        await fetchEvents();
        
        // Показываем уведомление об успехе
        const toast = await toastController.create({
          message: 'Документы события обновлены',
          duration: 2000,
          color: 'success',
          position: 'bottom'
        });
        toast.present();
      } catch (error) {
        console.error('Ошибка при обновлении данных события:', error);
      }
    }
  });
  
  return modal.present();
};

// Редактирование события
const editEvent = (event) => {
  showEventDetails(event);
};

const confirmDeleteEvent = async (event) => {
  const alert = await alertController.create({
    header: 'Подтверждение',
    message: `Вы уверены, что хотите удалить событие "${event.title}"?`,
    buttons: [
      {
        text: 'Отмена',
        role: 'cancel'
      },
      {
        text: 'Удалить',
        role: 'destructive',
        handler: () => deleteEvent(event)
      }
    ]
  });
  await alert.present();
};

const deleteEvent = async (event) => {
  try {
    // Удаляем событие через хранилище Pinia
    await scheduleStore.deleteEvent(event.id);
    // Обновляем данные
    await fetchEvents();
    
    // Показываем уведомление об успехе
    const toast = await toastController.create({
      message: 'Событие успешно удалено',
      duration: 2000,
      color: 'success',
      position: 'bottom'
    });
    toast.present();
  } catch (error) {
    console.error('Ошибка при удалении события:', error);
    const toast = await toastController.create({
      message: 'Ошибка при удалении события',
      duration: 2000,
      color: 'danger',
      position: 'bottom'
    });
    toast.present();
  }
};

const selectDay = (date) => {
  currentDate.value = new Date(date);
  viewMode.value = 'day';
};

// Вспомогательные функции
const formatHour = (hour) => {
  return `${hour}:00`;
};

const formatTimeRangeFromEvent = (event) => {
  const startDate = getEventStart(event);
  const endDate = getEventEnd(event);
  
  if (!startDate || !endDate) return '';
  
  return `${startDate.getHours()}:${String(startDate.getMinutes()).padStart(2, '0')} - ${endDate.getHours()}:${String(endDate.getMinutes()).padStart(2, '0')}`;
};

const formatTimeRange = (start, end) => {
  if (!start || !end) return '';
  const startDate = new Date(start);
  const endDate = new Date(end);
  return `${startDate.getHours()}:${String(startDate.getMinutes()).padStart(2, '0')} - ${endDate.getHours()}:${String(endDate.getMinutes()).padStart(2, '0')}`;
};

const formatDayDate = (date) => {
  return date.getDate();
};

// Вспомогательные функции для работы с датами и временем
const getEventStart = (event) => {
  // Получаем время начала из разных возможных форматов
  const startTimeValue = event.startTime || event.start_time || event.start;
  if (!startTimeValue) return null;
  
  // Превращаем в объект Date и корректно обрабатываем часовой пояс
  const date = new Date(startTimeValue);
  
  // Добавляем отладочную информацию для анализа проблем с часовыми поясами
  // Добавляем отладку только для важных событий
  const eventHour = date.getHours();
  if ((eventHour >= 6 && eventHour <= 12) && event.id && (event.title || event.name)) {
    console.log(`Отладка часового пояса: Событие "${event.title || event.name}" (ID: ${event.id})`);
    console.log(`- ISO строка: ${startTimeValue}`);
    console.log(`- Локальное время: ${date.toLocaleString()}`);
    console.log(`- Часы: ${eventHour}, Минуты: ${date.getMinutes()}`);
  }
  
  return date;
};

const getEventEnd = (event) => {
  // Получаем время окончания из разных возможных форматов
  const endTimeValue = event.endTime || event.end_time || event.end;
  if (!endTimeValue) {
    // Если нет времени окончания, добавляем час к времени начала
    const start = getEventStart(event);
    if (start) {
      const end = new Date(start);
      end.setHours(end.getHours() + 1);
      return end;
    }
    return null;
  }
  
  // Превращаем в объект Date и корректно обрабатываем часовой пояс
  return new Date(endTimeValue);
};

// Получение событий по часу
const getEventsByHour = (hour) => {
  // Отладочная информация - какие данные мы проверяем
  if (hour === 9 || hour === 10) {
    console.log(`Вызов getEventsByHour для часа ${hour}, текущая дата:`, currentDate.value);
    
    if (scheduleStore.events.length > 0) {
      const firstEvent = scheduleStore.events[0];
      const eventDate = getEventStart(firstEvent);
      if (eventDate) {
        console.log(`Первое событие, время:`, eventDate);
        console.log(`Событие на текущий день? ${isSameDay(eventDate, currentDate.value)}, Час события: ${eventDate.getHours()}, заданный час: ${hour}`);
      }
    }
  }
  
  // Потом профильтруем события
  return scheduleStore.events.filter(event => {
    const eventDate = getEventStart(event);
    if (!eventDate) return false;
    
    const eventHour = eventDate.getHours();
    const isForCurrentDay = isSameDay(eventDate, currentDate.value);
    const isForCurrentHour = eventHour === hour;
    
    // Отладка для конкретных часов работы
    if ((hour === 9 || hour === 10) && isForCurrentDay && !isForCurrentHour) {
      console.log(`Событие на текущий день, но не на час ${hour}. Час события: ${eventHour}`);
    }
    
    return isForCurrentDay && isForCurrentHour;
  });
};

// Получение событий по часу и дню
const getEventsByHourAndDay = (hour, day) => {
  return scheduleStore.events.filter(event => {
    const eventDate = getEventStart(event);
    if (!eventDate) return false;
    
    const eventHour = eventDate.getHours();
    const isForTheDay = isSameDay(eventDate, day);
    const isForTheHour = eventHour === hour;
    
    return isForTheDay && isForTheHour;
  });
};

// Получение событий на определенный день
const getEventsForDay = (date) => {
  return scheduleStore.events.filter(event => {
    const eventDate = getEventStart(event);
    if (!eventDate) return false;
    
    return isSameDay(eventDate, date);
  });
};

const isSameDay = (date1, date2) => {
  if (!date1 || !date2) return false;
  
  try {
    // Убедимся, что работаем с объектами Date
    const d1 = date1 instanceof Date ? date1 : new Date(date1);
    const d2 = date2 instanceof Date ? date2 : new Date(date2);
    
    // Проверим что даты валидны
    if (isNaN(d1.getTime()) || isNaN(d2.getTime())) {
      console.error('Невалидная дата при сравнении:', date1, date2);
      return false;
    }
    
    // Дебаг информация - логируем результат сравнения
    const result = d1.getDate() === d2.getDate() &&
                d1.getMonth() === d2.getMonth() &&
                d1.getFullYear() === d2.getFullYear();
    
    // При отладке, раскомментируйте этот блок
    // console.log(`Сравнение дат ${d1.toISOString()} и ${d2.toISOString()}: ${result}`);
    // console.log(`Числа: ${d1.getDate()} == ${d2.getDate()}, Месяцы: ${d1.getMonth()} == ${d2.getMonth()}, Годы: ${d1.getFullYear()} == ${d2.getFullYear()}`);
    
    return result;
  } catch (error) {
    console.error('Ошибка при сравнении дат:', error);
    return false;
  }
};

const isSameMonth = (date) => {
  return date.getMonth() === currentDate.value.getMonth() &&
         date.getFullYear() === currentDate.value.getFullYear();
};

const isCurrentDay = (date) => {
  const today = new Date();
  return isSameDay(date, today);
};

const getEventColor = (event) => {
  const colors = {
    meeting: 'primary',
    class: 'secondary',
    deadline: 'danger',
    reminder: 'warning',
    other: 'medium'
  };
  
  // Используем type или event_type в зависимости от формата данных
  const eventType = event.type || event.event_type || 'other';
  return colors[eventType] || 'var(--ion-color-medium)';
};

const getEventColorValue = (event) => {
  const colors = {
    'class': 'var(--ion-color-primary)',
    'meeting': 'var(--ion-color-secondary)',
    'deadline': 'var(--ion-color-danger)',
    'reminder': 'var(--ion-color-warning)',
    'consultation': 'var(--ion-color-success)',
    'personal': 'var(--ion-color-tertiary)',
    'other': 'var(--ion-color-medium)'
  };
  // Используем type или event_type в зависимости от формата данных
  const eventType = event.type || event.event_type || 'other';
  return colors[eventType] || 'var(--ion-color-medium)';
};

// Проверяем, может ли пользователь управлять событием
const canManageEvent = (event) => {
  const createdById = event.created_by || event.createdBy || event.user_id;
  return isAdmin.value || createdById === authStore.userId;
};

// Загрузка данных при монтировании компонента
onMounted(async () => {
  try {
    // Загружаем данные из хранилища Pinia при монтировании компонента
    await fetchEvents();
    
    // Проверяем, что события успешно загрузились
    console.log('События в хранилище после загрузки:', scheduleStore.events.length);
  } catch (error) {
    console.error('Ошибка при загрузке данных расписания:', error);
  }
});

// Функция для обновления данных при pull-to-refresh
const refreshSchedule = async (event) => {
  try {
    await fetchEvents();
    // Если есть объект event (передается из ion-refresher), завершаем анимацию обновления
    if (event) {
      event.target.complete();
    }
  } catch (error) {
    console.error('Ошибка при обновлении расписания:', error);
    if (event) {
      event.target.complete();
    }
  }
};

// Отслеживание изменений режима отображения для загрузки соответствующих данных
watch(viewMode, (newMode) => {
  console.log('Изменен режим отображения на:', newMode);
  fetchEvents();
});

// Отслеживание изменений текущей даты для загрузки соответствующих данных
watch(currentDate, (newDate) => {
  console.log('Изменена текущая дата на:', newDate);
  fetchEvents();
});
</script>

<style scoped>
.date-navigation {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.date-navigation h2 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 500;
}

.time-slots {
  display: flex;
  flex-direction: column;
}

.time-slot {
  display: flex;
  margin-bottom: 16px;
  min-height: 100px;
}

.time-label {
  width: 60px;
  font-weight: bold;
  padding-top: 8px;
}

.events-container {
  flex: 1;
  border-left: 1px solid var(--ion-color-light-shade);
  padding-left: 16px;
}

.empty-slot {
  height: 30px;
}

.event-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 8px;
}

/* Стили для карточек событий */
.event-card {
  cursor: pointer;
  transition: transform 0.2s ease;
}

.event-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

/* Стили для индикатора документов */
.documents-indicator {
  display: flex;
  align-items: center;
  margin-top: 8px;
  color: var(--ion-color-primary);
}

.documents-indicator ion-icon {
  margin-right: 5px;
  font-size: 16px;
}

.documents-indicator ion-badge {
  font-size: 10px;
  height: 16px;
  min-width: 16px;
  border-radius: 8px;
  padding: 0 4px;
}

/* Недельный вид */
.week-view {
  overflow-x: auto;
}

.week-header {
  display: flex;
  border-bottom: 1px solid var(--ion-color-light-shade);
  margin-bottom: 16px;
}

.day-header {
  flex: 1;
  min-width: 100px;
  text-align: center;
  padding: 8px 0;
}

.day-name {
  font-weight: bold;
}

.day-date {
  margin-top: 4px;
}

.current-day {
  background-color: var(--ion-color-primary);
  color: white;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto;
}

.week-body {
  margin-top: 16px;
}

.week-time-slots {
  display: flex;
  flex-direction: column;
}

.week-hour {
  display: flex;
  margin-bottom: 16px;
  min-height: 100px;
}

.week-time-label {
  width: 60px;
  font-weight: bold;
  padding-top: 8px;
}

.week-day-slots {
  display: flex;
  flex: 1;
}

.week-day-slot {
  flex: 1;
  min-width: 100px;
  border-left: 1px solid var(--ion-color-light-shade);
  padding: 0 4px;
}

.week-event {
  margin: 2px 0;
}

.week-event ion-card-header {
  padding: 8px;
}

.week-event ion-card-content {
  padding: 8px;
}

/* Месячный вид */
.month-view {
  margin-top: 16px;
}

.month-grid {
  display: flex;
  flex-direction: column;
}

.month-weekdays {
  display: flex;
  border-bottom: 1px solid var(--ion-color-light-shade);
}

.month-weekday {
  flex: 1;
  text-align: center;
  padding: 8px 0;
  font-weight: bold;
}

.month-days {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
}

.month-day {
  min-height: 80px;
  border: 1px solid var(--ion-color-light-shade);
  padding: 4px;
}

.different-month {
  background-color: var(--ion-color-light);
  opacity: 0.7;
}

.month-day-number {
  text-align: right;
  font-weight: bold;
  margin-bottom: 4px;
}

.month-day-events {
  font-size: 12px;
}

.month-day-event {
  margin: 2px 0;
  padding: 2px 4px;
  border-radius: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: white;
}

.month-day-more {
  font-size: 11px;
  text-align: center;
  color: var(--ion-color-medium);
  margin-top: 2px;
}
</style>
