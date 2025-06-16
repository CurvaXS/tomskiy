<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start" v-if="activeChat">
          <ion-button @click="closeActiveChat">
            <ion-icon slot="icon-only" :icon="arrowBackOutline"></ion-icon>
          </ion-button>
        </ion-buttons>
        <ion-title>{{ activeChat ? activeChat.name : 'Чаты' }}</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="openNewChatModal" v-if="!activeChat">
            <ion-icon slot="icon-only" :icon="addOutline"></ion-icon>
          </ion-button>
          <ion-button @click="openChatInfo" v-else>
            <ion-icon slot="icon-only" :icon="informationCircleOutline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    
    <ion-content>
      <!-- Список чатов -->
      <div v-if="!activeChat">
        <ion-searchbar placeholder="Поиск чатов" v-model="searchQuery" @ionInput="searchChats"></ion-searchbar>
        
        <ion-list lines="full">
          <ion-item button v-for="chat in filteredChats" :key="chat.id" @click="selectChat(chat)" class="chat-item">
            <div class="chat-avatar" slot="start" :style="{ backgroundColor: getAvatarColor(chat.id) }">
              {{ getInitials(chat.name) }}
            </div>
            <ion-label>
              <h2>{{ chat.name }}</h2>
              <p class="chat-last-message">{{ chat.lastMessage }}</p>
            </ion-label>
            <div class="chat-meta">
              <span class="chat-time">{{ formatChatTime(chat.lastMessageTime) }}</span>
              <ion-badge v-if="chat.unreadCount > 0">{{ chat.unreadCount }}</ion-badge>
            </div>
          </ion-item>
        </ion-list>
        
        <!-- Пустое состояние -->
        <div v-if="filteredChats.length === 0" class="empty-state ion-padding">
          <ion-icon :icon="chatbubbleOutline" class="empty-icon"></ion-icon>
          <h3>Нет чатов</h3>
          <p>{{ getEmptyStateText() }}</p>
          <ion-button @click="openNewChatModal">Создать чат</ion-button>
        </div>
      </div>
      
      <!-- Активный чат с сообщениями -->
      <div v-else class="chat-container">
        <div class="messages-container" ref="messagesContainer">
          <div v-for="(message, index) in groupedMessages" :key="index" class="message-group">
            <div class="message-date-divider" v-if="shouldShowDateDivider(message, index)">
              {{ formatMessageDate(message.date) }}
            </div>
            
            <div v-for="msg in message.messages" :key="msg.id" 
                 class="message-bubble" 
                 :class="{ 'my-message': msg.senderId === currentUserId }">
              <div class="message-sender" v-if="!msg.isMyMessage && message.messages[0].id === msg.id">
                {{ msg.senderName }}
              </div>
              <div class="message-content">
                {{ msg.content }}
                <div class="message-time">
                  {{ formatMessageTime(msg.timestamp) }}
                  <ion-icon v-if="msg.senderId === currentUserId" 
                         :icon="msg.read ? checkmarkDoneOutline : checkmarkOutline"
                         class="message-status-icon"></ion-icon>
                </div>
              </div>
              <div v-if="msg.attachment" class="message-attachment">
                <div class="attachment-preview" @click="openAttachment(msg.attachment)">
                  <ion-icon :icon="documentOutline"></ion-icon>
                  <span>{{ msg.attachment.name }}</span>
                </div>
              </div>
            </div>
          </div>
          
          <div v-if="isTyping" class="typing-indicator">
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
          </div>
        </div>
      </div>
    </ion-content>
    
    <!-- Форма отправки сообщения -->
    <ion-footer v-if="activeChat">
      <ion-toolbar>
        <div class="message-input-container">
          <ion-button fill="clear" @click="openAttachmentPicker">
            <ion-icon slot="icon-only" :icon="attachOutline"></ion-icon>
          </ion-button>
          
          <ion-textarea 
            v-model="newMessage" 
            placeholder="Написать сообщение..." 
            :auto-grow="true"
            class="message-input"
            @keydown.enter.prevent="sendMessage"></ion-textarea>
          
          <ion-button fill="clear" @click="sendMessage" :disabled="!newMessage.trim()">
            <ion-icon slot="icon-only" :icon="sendOutline"></ion-icon>
          </ion-button>
        </div>
      </ion-toolbar>
    </ion-footer>
  </ion-page>
</template>

<script setup>
import { ref, computed, onMounted, nextTick, watch } from 'vue';
import { 
  IonPage, 
  IonHeader, 
  IonToolbar, 
  IonTitle, 
  IonContent,
  IonFooter,
  IonButtons,
  IonButton,
  IonIcon,
  IonList,
  IonItem,
  IonLabel,
  IonBadge,
  IonSearchbar,
  IonTextarea,
  modalController,
  actionSheetController,
  toastController
} from '@ionic/vue';
import ChatModal from '@/components/modals/ChatModal.vue';
import { 
  chatbubbleOutline,
  addOutline,
  arrowBackOutline,
  informationCircleOutline,
  checkmarkOutline,
  checkmarkDoneOutline,
  attachOutline,
  sendOutline,
  documentOutline
} from 'ionicons/icons';
import { useAuthStore } from '@/store/auth';
import { chatService } from '@/services/api';

// Состояние компонента
const authStore = useAuthStore();
const currentUserId = computed(() => authStore.user?.id || 1);
const searchQuery = ref('');
const activeChat = ref(null);
const newMessage = ref('');
const messagesContainer = ref(null);
const isTyping = ref(false);

// Список чатов - загружается с сервера
const chats = ref([]);

const messages = ref([
  // Сообщения для чата 1
  {
    id: 1,
    chatId: 1,
    content: 'Коллеги, добрый день! Напоминаю, что у нас совещание в среду в 15:00.',
    senderId: 2,
    senderName: 'Смирнова О.П.',
    timestamp: new Date(new Date().getTime() - 7200000), // 2 часа назад
    read: true
  },
  {
    id: 2,
    chatId: 1,
    content: 'Спасибо за напоминание! Буду обязательно.',
    senderId: 3,
    senderName: 'Иванов К.Н.',
    timestamp: new Date(new Date().getTime() - 3600000), // 1 час назад
    read: true
  },
  {
    id: 3,
    chatId: 1,
    content: 'Коллеги, не забудьте принести отчеты по контрольным работам.',
    senderId: 2,
    senderName: 'Смирнова О.П.',
    timestamp: new Date(new Date().getTime() - 1800000), // 30 минут назад
    read: false
  },
  
  // Сообщения для чата 2
  {
    id: 4,
    chatId: 2,
    content: 'Здравствуйте! Подскажите, пожалуйста, расписание на завтра.',
    senderId: 2,
    senderName: 'Петров И.С.',
    timestamp: new Date(new Date().getTime() - 90000), // 1.5 минуты назад
    read: true
  },
  {
    id: 5,
    chatId: 2,
    content: 'Добрый день! У вас первый урок в 9:00, кабинет 305.',
    senderId: currentUserId.value,
    senderName: 'Вы',
    timestamp: new Date(new Date().getTime() - 60000), // 1 минута назад
    read: true
  },
  
  // Сообщения для чата 3
  {
    id: 6,
    chatId: 3,
    content: 'Уважаемые коллеги! Напоминаем о сдаче квартальных отчетов до пятницы.',
    senderId: 5,
    senderName: 'Директор',
    timestamp: new Date(new Date().getTime() - 259200000), // 3 дня назад
    read: true,
    attachment: {
      id: 1,
      name: 'Шаблон отчета.docx',
      type: 'docx',
      url: '/files/report-template.docx'
    }
  },
  {
    id: 7,
    chatId: 3,
    content: 'Также не забудьте внести данные по успеваемости в систему.',
    senderId: 5,
    senderName: 'Директор',
    timestamp: new Date(new Date().getTime() - 172800000), // 2 дня назад
    read: false
  }
]);

// Расчетные свойства
const filteredChats = computed(() => {
  if (!searchQuery.value) return chats.value;
  
  const query = searchQuery.value.toLowerCase();
  return chats.value.filter(chat => 
    chat.name.toLowerCase().includes(query) || 
    chat.lastMessage.toLowerCase().includes(query)
  );
});

const activeMessages = computed(() => {
  if (!activeChat.value) return [];
  return messages.value.filter(msg => msg.chatId === activeChat.value.id)
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
});

const groupedMessages = computed(() => {
  if (!activeMessages.value.length) return [];
  
  const groups = [];
  let currentDate = null;
  let currentMessages = [];
  
  activeMessages.value.forEach(message => {
    const messageDate = new Date(message.timestamp).setHours(0, 0, 0, 0);
    
    // Проверяем, принадлежит ли сообщение к текущей группе
    if (currentDate !== messageDate) {
      if (currentMessages.length > 0) {
        groups.push({
          date: currentDate,
          messages: currentMessages
        });
      }
      
      currentDate = messageDate;
      currentMessages = [message];
    } else {
      currentMessages.push(message);
    }
  });
  
  // Добавляем последнюю группу
  if (currentMessages.length > 0) {
    groups.push({
      date: currentDate,
      messages: currentMessages
    });
  }
  
  return groups;
});

// Обработчики событий
const selectChat = (chat) => {
  activeChat.value = chat;
  // Сбрасываем счетчик непрочитанных сообщений
  chat.unreadCount = 0;
  
  // В реальном приложении здесь будет загрузка сообщений с сервера
  // chatService.getMessages(chat.id);
  
  // Прокручиваем к последнему сообщению после загрузки
  nextTick(() => {
    scrollToBottom();
  });
};

const closeActiveChat = () => {
  activeChat.value = null;
};

const sendMessage = () => {
  if (!newMessage.value.trim()) return;
  
  // Создаем новое сообщение
  const newMsg = {
    id: messages.value.length + 1,
    chatId: activeChat.value.id,
    content: newMessage.value.trim(),
    senderId: currentUserId.value,
    senderName: 'Вы',
    timestamp: new Date(),
    read: false
  };
  
  // Добавляем сообщение в список
  messages.value.push(newMsg);
  
  // Обновляем данные чата
  const chat = chats.value.find(c => c.id === activeChat.value.id);
  if (chat) {
    chat.lastMessage = newMsg.content;
    chat.lastMessageTime = newMsg.timestamp;
  }
  
  // Очищаем поле ввода
  newMessage.value = '';
  
  // Прокручиваем к новому сообщению
  nextTick(() => {
    scrollToBottom();
  });
  
  // В реальном приложении здесь будет отправка сообщения на сервер
  // chatService.sendMessage(activeChat.value.id, newMsg.content);
};

// Загрузка чатов с сервера
const loadChats = async () => {
  try {
    const response = await chatService.getChats();
    console.log('Response from server:', response.data);
    
    // Проверяем, что в ответе есть свойство chats
    if (!response.data || !response.data.chats) {
      console.error('Неожиданный формат ответа API:', response.data);
      return;
    }
    
    // Преобразуем данные чатов с сервера в формат нашего компонента
    chats.value = response.data.chats.map(chat => {
      let chatName = chat.name;
      // Для личного чата устанавливаем имя собеседника
      if (chat.type === 'private' && !chatName) {
        // Находим участника, который не является текущим пользователем
        const otherMember = chat.members?.find(m => m.id !== currentUserId.value);
        chatName = otherMember ? otherMember.name : 'Личный чат';
      } else if (!chatName) {
        // Для группового чата без названия
        chatName = 'Групповой чат';
      }
      
      return {
        id: chat.id,
        name: chatName,
        type: chat.type,
        participants: chat.members?.map(m => m.id) || [],
        lastMessage: chat.lastMessage?.content || '',
        lastMessageTime: chat.lastMessage?.createdAt ? new Date(chat.lastMessage.createdAt) : null,
        unreadCount: chat.unreadCount || 0,
        createdAt: chat.createdAt ? new Date(chat.createdAt) : new Date()
      };
    });
  } catch (error) {
    console.error('Ошибка при загрузке чатов:', error);
    showToast('Ошибка при загрузке чатов', 'danger');
  }
};

const openNewChatModal = async () => {
  const modal = await modalController.create({
    component: ChatModal
  });
  
  modal.onDidDismiss().then(async ({ data }) => {
    if (data) {
      // Добавляем новый чат в список, предварительно преобразовав его в нужный формат
      let chatName = data.name;
      
      // Определяем имя чата в зависимости от типа
      if (data.type === 'private' && !chatName) {
        // Для личного чата пытаемся найти имя собеседника
        const otherMember = data.members?.find(m => m.id !== currentUserId.value);
        chatName = otherMember ? otherMember.name : 'Личный чат';
      } else if (!chatName) {
        // Если это групповой чат без имени
        chatName = 'Групповой чат';
      }
      
      const newChat = {
        id: data.id,
        name: chatName,
        type: data.type,
        participants: data.members?.map(m => m.id) || [],
        lastMessage: '',
        lastMessageTime: data.createdAt ? new Date(data.createdAt) : new Date(),
        unreadCount: 0,
        createdAt: data.createdAt ? new Date(data.createdAt) : new Date()
      };
      
      chats.value.unshift(newChat);
      // Показываем сообщение об успехе
      showToast('Чат успешно создан', 'success');
    }
  });
  
  await modal.present();
};

const openChatInfo = () => {
  // В реальном приложении здесь будет открытие информации о чате
  alert(`Информация о чате: ${activeChat.value.name}`);
};

const openAttachmentPicker = async () => {
  const actionSheet = await actionSheetController.create({
    header: 'Прикрепить файл',
    buttons: [
      {
        text: 'Фото или видео',
        handler: () => {
          // Выбор фото или видео
        }
      },
      {
        text: 'Документ',
        handler: () => {
          // Выбор документа
        }
      },
      {
        text: 'Отмена',
        role: 'cancel'
      }
    ]
  });
  await actionSheet.present();
};

const openAttachment = (attachment) => {
  // В реальном приложении здесь будет открытие файла
  alert(`Открытие файла: ${attachment.name}`);
};

const searchChats = () => {
  // В реальном приложении здесь будет поиск чатов через API
  // Сейчас используем локальное фильтрованное свойство
};

const scrollToBottom = () => {
  if (messagesContainer.value) {
    const container = messagesContainer.value;
    container.scrollTop = container.scrollHeight;
  }
};

onMounted(async () => {
  // Загружаем чаты при монтировании компонента
  await loadChats();
  
  if (messagesContainer.value) {
    scrollToBottom();
  }
});

// ...

const formatMessageTime = (time) => {
  return new Date(time).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
};

const formatMessageDate = (timestamp) => {
  const date = new Date(timestamp);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const messageDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  
  if (messageDay.getTime() === today.getTime()) {
    return 'Сегодня';
  } else if (messageDay.getTime() === yesterday.getTime()) {
    return 'Вчера';
  } else {
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
  }
};

const formatChatTime = (time) => {
  if (!time) return '';
  
  // Проверяем, что time это объект Date
  const messageDate = time instanceof Date ? time : new Date(time);
  
  // Проверяем, что дата валидна
  if (isNaN(messageDate.getTime())) {
    return '';
  }
  
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const messageDay = new Date(messageDate.getFullYear(), messageDate.getMonth(), messageDate.getDate());
  
  if (messageDay.getTime() === today.getTime()) {
    return messageDate.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  } else if (messageDay.getTime() === yesterday.getTime()) {
    return 'Вчера';
  } else {
    return messageDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
  }
};

const shouldShowDateDivider = (message, index) => {
  return index === 0 || message.date !== groupedMessages.value[index - 1].date;
};

const getInitials = (name) => {
  // Проверяем, что name не undefined/null
  if (!name) {
    return 'ЧТ'; // Чат
  }
  return name.split(' ').map(word => word[0]).join('').toUpperCase().substring(0, 2);
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

const getEmptyStateText = () => {
  if (searchQuery.value) {
    return `Нет чатов, соответствующих запросу "${searchQuery.value}"`;
  } else {
    return 'У вас пока нет открытых чатов';
  }
};

// Загрузка данных при монтировании компонента
onMounted(async () => {
  try {
    // В реальном приложении здесь будет загрузка данных с сервера
    // const response = await chatService.getChats();
    // chats.value = response.data;
    
    // Скроллим к последнему сообщению
    nextTick(() => {
      scrollToBottom();
    });
  } catch (error) {
    console.error('Failed to load chat data:', error);
  }
});

// Вспомогательная функция для отображения сообщений
const showToast = async (message, color = 'primary') => {
  const toast = await toastController.create({
    message,
    duration: 3000,
    position: 'bottom',
    color
  });
  
  await toast.present();
};

// Отслеживаем изменения в сообщениях для автоматической прокрутки
watch(messages, () => {
  nextTick(() => {
    scrollToBottom();
  });
});
</script>

<style scoped>
.chat-item {
  --padding-start: 12px;
  --padding-end: 12px;
}

.chat-avatar {
  width: 48px;
  height: 48px;
  border-radius: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: bold;
  font-size: 18px;
}

.chat-last-message {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--ion-color-medium);
}

.chat-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  min-width: 60px;
}

.chat-time {
  font-size: 12px;
  color: var(--ion-color-medium);
  margin-bottom: 5px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px 16px;
  text-align: center;
  height: 100%;
}

.empty-icon {
  font-size: 64px;
  color: var(--ion-color-medium);
  margin-bottom: 16px;
}

/* Стили для активного чата */
.chat-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: var(--ion-color-light);
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.message-group {
  margin-bottom: 16px;
}

.message-date-divider {
  text-align: center;
  margin: 16px 0;
  font-size: 12px;
  color: var(--ion-color-medium);
  position: relative;
}

.message-date-divider::before,
.message-date-divider::after {
  content: "";
  position: absolute;
  top: 50%;
  width: 30%;
  height: 1px;
  background-color: var(--ion-color-medium);
}

.message-date-divider::before {
  left: 0;
}

.message-date-divider::after {
  right: 0;
}

.message-bubble {
  max-width: 75%;
  margin-bottom: 8px;
  padding: 8px 12px;
  border-radius: 12px;
  background-color: white;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  position: relative;
  overflow: hidden;
}

.message-bubble.my-message {
  margin-left: auto;
  background-color: var(--ion-color-primary-tint);
  color: white;
}

.message-sender {
  font-weight: bold;
  font-size: 12px;
  margin-bottom: 4px;
}

.message-content {
  word-break: break-word;
}

.message-time {
  font-size: 10px;
  color: var(--ion-color-medium);
  text-align: right;
  margin-top: 4px;
  display: flex;
  justify-content: flex-end;
  align-items: center;
}

.my-message .message-time {
  color: rgba(255, 255, 255, 0.8);
}

.message-status-icon {
  margin-left: 4px;
  font-size: 14px;
}

.message-attachment {
  margin-top: 8px;
  background-color: rgba(0, 0, 0, 0.05);
  border-radius: 8px;
  overflow: hidden;
}

.attachment-preview {
  display: flex;
  align-items: center;
  padding: 8px;
  cursor: pointer;
}

.attachment-preview ion-icon {
  margin-right: 8px;
}

/* Форма отправки сообщения */
.message-input-container {
  display: flex;
  align-items: center;
  padding: 8px;
}

.message-input {
  flex: 1;
  border-radius: 20px;
  background-color: var(--ion-color-light);
  padding: 0 10px;
  max-height: 100px;
}

/* Индикатор набора сообщения */
.typing-indicator {
  display: flex;
  padding: 10px;
  width: 50px;
  border-radius: 20px;
  background-color: var(--ion-color-light-shade);
  margin-bottom: 8px;
}

.typing-dot {
  background-color: var(--ion-color-medium);
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 4px;
  animation: typing 1.5s infinite;
}

.typing-dot:nth-child(1) {
  animation-delay: 0s;
}

.typing-dot:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-dot:nth-child(3) {
  animation-delay: 0.4s;
  margin-right: 0;
}

@keyframes typing {
  0% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-5px);
  }
  100% {
    transform: translateY(0px);
  }
}
</style>
