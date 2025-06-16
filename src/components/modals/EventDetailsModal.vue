<template>
  <ion-header>
    <ion-toolbar>
      <ion-title>{{ event ? 'Детали события' : 'Новое событие' }}</ion-title>
      <ion-buttons slot="end">
        <ion-button @click="dismiss">
          <ion-icon slot="icon-only" :icon="closeOutline"></ion-icon>
        </ion-button>
      </ion-buttons>
    </ion-toolbar>
  </ion-header>

  <ion-content class="ion-padding">
    <ion-list>
      <ion-item>
        <ion-label position="stacked">Название</ion-label>
        <ion-input v-model="eventData.title" readonly="!canEdit"></ion-input>
      </ion-item>

      <ion-item>
        <ion-label position="stacked">Тип</ion-label>
        <ion-select v-model="eventData.type" interface="action-sheet" disabled="!canEdit">
          <ion-select-option value="class">Занятие</ion-select-option>
          <ion-select-option value="meeting">Совещание</ion-select-option>
          <ion-select-option value="exam">Экзамен</ion-select-option>
          <ion-select-option value="consultation">Консультация</ion-select-option>
          <ion-select-option value="personal">Личное</ion-select-option>
        </ion-select>
      </ion-item>

      <ion-item>
        <ion-label position="stacked">Начало</ion-label>
        <ion-datetime 
          v-model="eventData.startTime" 
          display-format="DD.MM.YYYY HH:mm" 
          picker-format="DD MMM YYYY HH:mm"
          readonly="!canEdit"
        ></ion-datetime>
      </ion-item>

      <ion-item>
        <ion-label position="stacked">Окончание</ion-label>
        <ion-datetime 
          v-model="eventData.endTime" 
          display-format="DD.MM.YYYY HH:mm" 
          picker-format="DD MMM YYYY HH:mm"
          readonly="!canEdit"
        ></ion-datetime>
      </ion-item>

      <ion-item>
        <ion-label position="stacked">Место</ion-label>
        <ion-input v-model="eventData.location" readonly="!canEdit"></ion-input>
      </ion-item>

      <ion-item>
        <ion-label position="stacked">Описание</ion-label>
        <ion-textarea v-model="eventData.description" rows="4" readonly="!canEdit"></ion-textarea>
      </ion-item>
    </ion-list>

    <!-- Информация о прикрепленных документах -->
    <div class="documents-section">
      <ion-item-divider>
        <ion-label>Документы</ion-label>
        <ion-badge slot="end" color="primary" v-if="event && event.documentsCount > 0">
          {{ event.documentsCount }}
        </ion-badge>
      </ion-item-divider>
      
      <!-- <ion-button expand="block" @click="openDocumentsModal" class="document-button">
        <ion-icon slot="start" :icon="documentsOutline"></ion-icon>
        Управление документами
      </ion-button> -->
    </div>

    <!-- Кнопки управления событием -->
    <div class="action-buttons" v-if="event && canEdit">
      <!-- <ion-button expand="block" @click="editEvent" color="primary">
        <ion-icon slot="start" :icon="createOutline"></ion-icon>
        Редактировать
      </ion-button> -->
      <ion-button expand="block" @click="confirmDeleteEvent" color="danger">
        <ion-icon slot="start" :icon="trashOutline"></ion-icon>
        Удалить
      </ion-button>
    </div>
  </ion-content>
</template>

<script setup>
import { ref, computed, onMounted, defineEmits, defineProps } from 'vue';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonButton,
  IonIcon,
  IonList,
  IonItem,
  IonItemDivider,
  IonLabel,
  IonInput,
  IonTextarea,
  IonSelect,
  IonSelectOption,
  IonDatetime,
  IonBadge,
  modalController,
  alertController
} from '@ionic/vue';
import {
  closeOutline,
  createOutline,
  trashOutline,
  documentsOutline
} from 'ionicons/icons';
import { scheduleService } from '@/services/api';
import { useAuthStore } from '@/store/auth';
import EventDocumentsModal from '@/components/modals/EventDocumentsModal.vue';

const emit = defineEmits(['dismiss', 'update', 'delete']);
const props = defineProps({
  event: {
    type: Object,
    default: null
  }
});

const authStore = useAuthStore();
const eventData = ref({
  title: '',
  type: 'class',
  startTime: new Date().toISOString(),
  endTime: new Date(new Date().getTime() + 3600000).toISOString(),
  location: '',
  description: ''
});

// Определяем, может ли пользователь редактировать событие
const canEdit = computed(() => {
  if (!props.event) return true; // Новое событие всегда можно редактировать
  
  // Преподаватель может редактировать только собственные события
  return props.event.creatorId === authStore.user?.id || authStore.user?.isAdmin;
});

onMounted(() => {
  if (props.event) {
    // Заполняем данные из переданного события
    eventData.value = {
      ...props.event,
      startTime: props.event.startTime,
      endTime: props.event.endTime
    };
  }
});

// Функция для закрытия модального окна
const dismiss = () => {
  emit('dismiss');
  try {
    document.querySelector('ion-modal:last-of-type')?.dismiss();
  } catch (error) {
    console.error('Ошибка при закрытии модального окна:', error);
  }
};

// Открытие модального окна для управления документами
const openDocumentsModal = async () => {
  if (!props.event) {
    // Нельзя прикреплять документы к несохраненному событию
    const alert = await alertController.create({
      header: 'Информация',
      message: 'Прежде чем прикреплять документы, необходимо сохранить событие.',
      buttons: ['ОК']
    });
    return alert.present();
  }

  const modal = await modalController.create({
    component: EventDocumentsModal,
    componentProps: {
      event: props.event
    }
  });

  modal.onDidDismiss().then(({ data }) => {
    if (data && data.documentsUpdated) {
      emit('update'); // Обновляем событие, если документы были изменены
    }
  });

  return modal.present();
};

// Редактирование события
const editEvent = async () => {
  try {
    // Здесь должна быть логика обновления события
    // scheduleService.updateEvent(props.event.id, eventData.value);
    emit('update', eventData.value);
    dismiss();
  } catch (error) {
    console.error('Ошибка при обновлении события:', error);
  }
};

// Подтверждение удаления события
const confirmDeleteEvent = async () => {
  const alert = await alertController.create({
    header: 'Подтверждение',
    message: `Вы уверены, что хотите удалить событие "${props.event.title}"?`,
    buttons: [
      {
        text: 'Отмена',
        role: 'cancel'
      },
      {
        text: 'Удалить',
        role: 'destructive',
        handler: () => {
          deleteEvent();
        }
      }
    ]
  });

  await alert.present();
};

// Удаление события
const deleteEvent = async () => {
  try {
    // Здесь должна быть логика удаления события
    // await scheduleService.deleteEvent(props.event.id);
    emit('delete', props.event.id);
    dismiss();
  } catch (error) {
    console.error('Ошибка при удалении события:', error);
  }
};
</script>

<style scoped>
.documents-section {
  margin-top: 20px;
}

.document-button {
  margin-top: 10px;
}

.action-buttons {
  margin-top: 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
</style>
