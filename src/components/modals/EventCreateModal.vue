<template>
  <ion-header>
    <ion-toolbar>
      <ion-title>Создать событие</ion-title>
      <ion-buttons slot="end">
        <ion-button @click="dismiss">
          <ion-icon :icon="closeOutline" slot="icon-only"></ion-icon>
        </ion-button>
      </ion-buttons>
    </ion-toolbar>
  </ion-header>
  
  <ion-content class="ion-padding">
    <form @submit.prevent="handleSubmit">
      <ion-list>
        <ion-item>
          <ion-label position="floating">Название *</ion-label>
          <ion-input v-model="event.title" required></ion-input>
          <ion-note slot="error" v-if="errors.title">
            {{ errors.title }}
          </ion-note>
        </ion-item>
        
        <ion-item>
          <ion-label position="floating">Описание</ion-label>
          <ion-textarea v-model="event.description" rows="3"></ion-textarea>
        </ion-item>

        <ion-item>
          <ion-label position="floating">Тип события *</ion-label>
          <ion-select v-model="event.type" interface="action-sheet" required>
            <ion-select-option value="class">Урок</ion-select-option>
            <ion-select-option value="meeting">Собрание</ion-select-option>
            <ion-select-option value="consultation">Консультация</ion-select-option>
            <ion-select-option value="personal">Личное</ion-select-option>
          </ion-select>
          <ion-note slot="error" v-if="errors.type">
            {{ errors.type }}
          </ion-note>
        </ion-item>

        <ion-item>
          <ion-label position="floating">Кабинет/Место</ion-label>
          <ion-input v-model="event.location"></ion-input>
        </ion-item>

        <ion-item>
          <ion-label position="floating">Дата *</ion-label>
          <ion-input type="date" v-model="eventDate" required></ion-input>
          <ion-note slot="error" v-if="errors.startTime">
            {{ errors.startTime }}
          </ion-note>
        </ion-item>

        <ion-item>
          <ion-label position="floating">Время начала *</ion-label>
          <ion-input type="time" v-model="startTime" required></ion-input>
        </ion-item>

        <ion-item>
          <ion-label position="floating">Время окончания *</ion-label>
          <ion-input type="time" v-model="endTime" required></ion-input>
          <ion-note slot="error" v-if="errors.endTime">
            {{ errors.endTime }}
          </ion-note>
        </ion-item>

        <ion-item>
          <ion-checkbox v-model="event.isRecurring">Повторяющееся событие</ion-checkbox>
        </ion-item>

        <div v-if="event.isRecurring" class="recurring-options ion-padding-top">
          <ion-item>
            <ion-label position="floating">Повторять</ion-label>
            <ion-select v-model="event.recurrence.type" interface="action-sheet">
              <ion-select-option value="daily">Ежедневно</ion-select-option>
              <ion-select-option value="weekly">Еженедельно</ion-select-option>
              <ion-select-option value="monthly">Ежемесячно</ion-select-option>
            </ion-select>
          </ion-item>
          
          <ion-item v-if="event.recurrence.type === 'weekly'">
            <ion-label>Дни недели</ion-label>
            <ion-select v-model="event.recurrence.daysOfWeek" multiple="true">
              <ion-select-option value="1">Понедельник</ion-select-option>
              <ion-select-option value="2">Вторник</ion-select-option>
              <ion-select-option value="3">Среда</ion-select-option>
              <ion-select-option value="4">Четверг</ion-select-option>
              <ion-select-option value="5">Пятница</ion-select-option>
              <ion-select-option value="6">Суббота</ion-select-option>
              <ion-select-option value="0">Воскресенье</ion-select-option>
            </ion-select>
          </ion-item>

          <ion-item>
            <ion-label position="floating">До даты</ion-label>
            <ion-input type="date" v-model="event.recurrence.endDate"></ion-input>
          </ion-item>
        </div>
      </ion-list>

      <div class="ion-padding">
        <ion-button type="submit" expand="block">
          Создать событие
        </ion-button>
      </div>
    </form>
  </ion-content>
</template>

<script setup>
import { ref, reactive, computed } from 'vue';
import { 
  IonHeader, 
  IonToolbar, 
  IonTitle, 
  IonContent,
  IonItem,
  IonLabel,
  IonInput,
  IonTextarea,
  IonSelect,
  IonSelectOption,
  IonCheckbox,
  IonList,
  IonButton,
  IonButtons,
  IonIcon,
  IonNote,
  modalController
} from '@ionic/vue';
import { closeOutline } from 'ionicons/icons';
// Простая валидация без внешних библиотек
import { scheduleService } from '@/services/api';

// Параметры, переданные из родительского компонента
const props = defineProps({
  date: {
    type: Date,
    default: () => new Date()
  }
});

// Локальные переменные для хранения времени начала/окончания и даты
const startTime = ref('09:00');
const endTime = ref('10:30');
const eventDate = ref(props.date.toISOString().substring(0, 10));

// Данные формы события
const event = reactive({
  title: '',
  description: '',
  type: 'class',
  location: '',
  startTime: null,
  endTime: null,
  isRecurring: false,
  recurrence: {
    type: 'weekly',
    daysOfWeek: [],
    endDate: null
  }
});

// Объект для хранения ошибок валидации
const errors = reactive({
  title: '',
  type: '',
  startTime: '',
  endTime: ''
});

// Функция для валидации формы
const validateForm = () => {
  let isValid = true;
  
  // Очистка предыдущих ошибок
  errors.title = '';
  errors.type = '';
  errors.startTime = '';
  errors.endTime = '';
  
  // Проверка заголовка
  if (!event.title) {
    errors.title = 'Название события обязательно';
    isValid = false;
  } else if (event.title.length < 3) {
    errors.title = 'Название должно быть не меньше 3 символов';
    isValid = false;
  }
  
  // Проверка типа
  if (!event.type) {
    errors.type = 'Выберите тип события';
    isValid = false;
  }
  
  // Проверка времени
  if (!startTime.value) {
    errors.startTime = 'Выберите время начала';
    isValid = false;
  }
  
  if (!endTime.value) {
    errors.endTime = 'Выберите время окончания';
    isValid = false;
  } else if (startTime.value && endTime.value && endTime.value <= startTime.value) {
    errors.endTime = 'Время окончания должно быть позже времени начала';
    isValid = false;
  }
  
  return isValid;
};

// Обработчики событий
const dismiss = (data = null) => {
  modalController.dismiss(data);
};

const handleSubmit = async () => {
  const isValid = validateForm();
  if (!isValid) return;
  
  // Формирование времени начала и окончания события из выбранных даты и времени
  const [startHour, startMinute] = startTime.value.split(':');
  const [endHour, endMinute] = endTime.value.split(':');
  
  // Создаем даты в ISO формате, чтобы избежать проблем с часовыми поясами
  const startDate = new Date(eventDate.value);
  const endDate = new Date(eventDate.value);
  
  // Устанавливаем локальное время (не UTC)
  startDate.setHours(parseInt(startHour), parseInt(startMinute));
  endDate.setHours(parseInt(endHour), parseInt(endMinute));
  
  // Преобразуем в ISO строки в локальном формате (с указанием часового пояса)
  event.startTime = startDate.toISOString();
  event.endTime = endDate.toISOString();
  
  // Добавляем информацию о часовом поясе для серверной обработки
  event.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone; // Например, 'Europe/Moscow'
  
  console.log('Отправляем событие на сервер:', {
    startTime: event.startTime,
    endTime: event.endTime,
    timezone: event.timezone,
    localStartTime: startDate.toLocaleString(),
    localEndTime: endDate.toLocaleString()
  });
  
  try {
    // В реальном приложении отправит данные на сервер
    // const response = await scheduleService.createEvent(event);
    console.log('Создание события:', event);
    
    // Возвращаем данные в родительский компонент
    dismiss({ created: true, event });
  } catch (error) {
    console.error('Ошибка при создании события:', error);
  }
};
</script>

<style scoped>
.recurring-options {
  margin-top: 16px;
  padding-left: 16px;
  border-left: 2px solid var(--ion-color-primary);
}
</style>
