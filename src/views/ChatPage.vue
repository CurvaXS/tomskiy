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
        
        <div v-if="loading" class="loading-container">
          <ion-spinner name="crescent"></ion-spinner>
          <p>Загрузка чатов...</p>
        </div>
        
        <div v-else-if="error" class="error-container">
          <ion-icon :icon="alertCircleOutline" color="danger" size="large"></ion-icon>
          <p>{{ error }}</p>
          <ion-button size="small" @click="loadChats">Повторить</ion-button>
        </div>
        
        <ion-list v-else-if="filteredChats.length === 0" class="chat-list empty-list">
          <div class="empty-state">
            <ion-icon :icon="chatboxOutline" size="large"></ion-icon>
            <p>У вас пока нет чатов</p>
            <ion-button size="small" @click="openNewChatModal">Создать чат</ion-button>
          </div>
        </ion-list>
        
        <ion-list v-else class="chat-list">
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
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue';
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
const loading = ref(false);
const loadingMessages = ref(false);
const error = ref(null);

// Настройки поллинга для реалтайм-обновлений
const pollingEnabled = ref(true);
const pollingInterval = 10000; // 10 секунд по умолчанию
const chatPollingIntervalId = ref(null);
const messagePollingIntervalId = ref(null);
const lastMessageTimestamp = ref(null);

// Функции для поллинга сообщений - реализация ниже

const stopMessagePolling = () => {
  if (messagePollingIntervalId.value) {
    console.log('Остановка поллинга сообщений');
    clearInterval(messagePollingIntervalId.value);
    messagePollingIntervalId.value = null;
  }
};

// Функции для поллинга списка чатов
const startChatListPolling = () => {
  if (!pollingEnabled.value || chatPollingIntervalId.value) return;
  
  console.log('Запуск поллинга списка чатов');
  
  // Функция для загрузки чатов
  const fetchChats = async () => {
    try {
      const response = await chatService.getChats();
      console.log('Response from chat server:', response.data);
      
      // Получаем список чатов из ответа
      const chatsList = response.data.chats || response.data;
      
      if (!chatsList || !Array.isArray(chatsList)) {
        console.error('Неожиданный формат ответа API:', response.data);
        return;
      }
      
      // Проверяем на новые чаты или обновления в существующих
      chatsList.forEach(serverChat => {
        // Находим чат в нашем списке
        const existingChatIndex = chats.value.findIndex(c => c.id === serverChat.id);
        
        // Преобразуем данные в формат нашего компонента
        const formattedChat = {
          id: serverChat.id,
          name: serverChat.name || 'Чат без названия',
          type: serverChat.type || 'private',
          participants: serverChat.members?.map(m => m.user_id || m.userId || m.id) || [],
          lastMessage: serverChat.last_message?.content || serverChat.lastMessage?.text || '',
          lastMessageTime: serverChat.last_message?.timestamp || serverChat.lastMessage?.timestamp ? 
            new Date(serverChat.last_message?.timestamp || serverChat.lastMessage?.timestamp) : new Date(),
          unreadCount: serverChat.unread_count || serverChat.unreadCount || 0,
          createdAt: serverChat.created_at || serverChat.createdAt ? 
            new Date(serverChat.created_at || serverChat.createdAt) : new Date()
        };
        
        // Если чат существует, обновляем его, иначе добавляем новый
        if (existingChatIndex !== -1) {
          // Обновляем только если есть изменения
          if (formattedChat.lastMessageTime > chats.value[existingChatIndex].lastMessageTime || 
              formattedChat.unreadCount !== chats.value[existingChatIndex].unreadCount) {
            chats.value[existingChatIndex] = formattedChat;
          }
        } else {
          // Добавляем новый чат
          chats.value.push(formattedChat);
        }
      });
      
      // Сортируем чаты по времени последнего сообщения
      chats.value.sort((a, b) => b.lastMessageTime - a.lastMessageTime);
      
    } catch (err) {
      console.error('Ошибка при поллинге списка чатов:', err);
    }
  };
  
  // Устанавливаем интервал для регулярной проверки списка чатов
  chatPollingIntervalId.value = setInterval(fetchChats, pollingInterval);
};

const stopChatListPolling = () => {
  if (chatPollingIntervalId.value) {
    console.log('Остановка поллинга списка чатов');
    clearInterval(chatPollingIntervalId.value);
    chatPollingIntervalId.value = null;
  }
};

// Список чатов и сообщений - загружается с сервера
const chats = ref([]);
const messages = ref([]);

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
const selectChat = async (chat) => {
  try {
    // Останавливаем предыдущий поллинг сообщений
    stopMessagePolling();
    
    activeChat.value = chat;
    messages.value = [];
    loadingMessages.value = true;
    error.value = null;
    lastMessageTimestamp.value = null;
    
    // Загрузка всех доступных сообщений с учетом пагинации
    let currentPage = 1;
    let totalPages = 1;
    let allMessages = [];
    
    do {
      const response = await chatService.getMessages(chat.id, { page: currentPage, per_page: 50 });
      console.log(`Loading messages page ${currentPage}:`, response.data);
      
      const messagesList = response.data.messages || response.data;
      if (!messagesList || !Array.isArray(messagesList)) {
        console.error('Неожиданный формат ответа API для сообщений:', response.data);
        break;
      }
      
      allMessages = [...allMessages, ...messagesList];
      
      // Проверяем информацию о пагинации
      if (response.data.pages) {
        totalPages = response.data.pages;
      } else {
        // Если информация о пагинации отсутствует, значит у нас только одна страница
        break;
      }
      
      currentPage++;
    } while (currentPage <= totalPages);
    
    if (allMessages.length === 0) {
      console.log('No messages found for this chat');
      return;
    }
    
    // Преобразуем данные сообщений в формат нашего компонента
    messages.value = allMessages.map(msg => ({
      id: msg.id,
      chatId: chat.id,
      content: msg.text || msg.content,
      senderId: msg.sender?.id || msg.sender_id || msg.user_id || msg.senderId,
      senderName: msg.sender_name || msg.senderName || 
                 (msg.sender ? `${msg.sender.first_name || ''} ${msg.sender.last_name || ''}`.trim() : ''),
      timestamp: msg.timestamp || msg.created_at || msg.createdAt ? new Date(msg.timestamp || msg.created_at || msg.createdAt) : new Date(),
      read: msg.is_read || msg.isRead || false,
      attachment: msg.attachment_id || msg.attachmentId ? {
        id: msg.attachment_id || msg.attachmentId,
        name: msg.attachment?.name || msg.attachment?.file_name || 'Прикрепленный файл',
        type: msg.attachment?.type || msg.attachment?.file_type || 'file',
        url: msg.attachment?.url || `/api/documents/${msg.attachment_id || msg.attachmentId}/download/`
      } : null
    }));
    
    // Сортируем сообщения по времени (старые сверху)
    messages.value.sort((a, b) => a.timestamp - b.timestamp);
    
    // Устанавливаем временную метку последнего сообщения для будущего поллинга
    if (messages.value.length > 0) {
      const lastMsg = messages.value[messages.value.length - 1];
      lastMessageTimestamp.value = lastMsg.timestamp;
    }
    
    // Сбрасываем счетчик непрочитанных сообщений
    chat.unreadCount = 0;
    
    console.log('Processed messages:', messages.value);

    // Запускаем поллинг для новых сообщений
    startMessagePolling(chat.id);
  } catch (error) {
    console.error('Ошибка при загрузке сообщений:', error);
    showToast('Не удалось загрузить сообщения', 'danger');
    error.value = 'Ошибка загрузки сообщений';
  } finally {
    loadingMessages.value = false;
  }
  
  // Прокручиваем к последнему сообщению после загрузки
  nextTick(() => {
    scrollToBottom();
  });
};


// Функция для начала опроса новых сообщений
const startMessagePolling = (chatId) => {
  // Остановить предыдущий интервал
  stopMessagePolling();
  
  if (!pollingEnabled.value || !chatId) return;
  
  messagePollingIntervalId.value = setInterval(async () => {
    try {
      // Проверяем, что у нас всё ещё тот же активный чат
      if (!activeChat.value || activeChat.value.id !== chatId) {
        stopMessagePolling();
        return;
      }
      
      // Проверяем наличие временной метки последнего сообщения
      if (!lastMessageTimestamp.value) return;
      
      // Форматируем дату для запроса
      const fromTimestamp = new Date(lastMessageTimestamp.value.getTime() + 1);
      
      // Получаем только новые сообщения после последней известной отметки времени
      const response = await chatService.getMessages(chatId, { 
        from_timestamp: fromTimestamp.toISOString() 
      });
      
      const newMessagesList = response.data.messages || response.data;
      
      if (!newMessagesList || !Array.isArray(newMessagesList) || newMessagesList.length === 0) {
        return;
      }
      
      // Обрабатываем новые сообщения
      const newMsgs = newMessagesList.map(msg => ({
        id: msg.id,
        chatId: chatId,
        content: msg.text || msg.content,
        senderId: msg.sender?.id || msg.sender_id || msg.user_id || msg.senderId,
        senderName: msg.sender_name || msg.senderName || (msg.user_id === currentUserId.value ? 'Вы' : 'Собеседник'),
        timestamp: msg.timestamp || msg.created_at || msg.createdAt ? 
                  new Date(msg.timestamp || msg.created_at || msg.createdAt) : new Date(),
        read: msg.is_read || msg.isRead || false
      }));
      
      // Расширенная проверка дубликатов
      // Проверяем не только ID, но и контент + отправителя + время
      const uniqueNewMsgs = newMsgs.filter(newMsg => {
        // Проверка по ID - не добавляем сообщения с существующим ID
        if (messages.value.some(msg => msg.id === newMsg.id)) {
          return false;
        }
        
        // Проверка по другим полям - чтобы избежать дубликатов, если есть одинаковые по содержанию и времени
        return !messages.value.some(msg => 
          msg.content === newMsg.content && 
          msg.senderId === newMsg.senderId &&
          Math.abs(msg.timestamp - newMsg.timestamp) < 1000 // Разница во времени менее 1 секунды
        );
      });
      
      if (uniqueNewMsgs.length === 0) return;
      
      // Добавляем новые сообщения в конец списка
      messages.value = [...messages.value, ...uniqueNewMsgs];
      
      // Обновляем временную метку последнего полученного сообщения
      const lastMessage = messages.value[messages.value.length - 1];
      lastMessageTimestamp.value = lastMessage.timestamp;
      
      // Обновляем данные последнего сообщения в списке чатов
      if (uniqueNewMsgs.length > 0 && lastMessage.senderId !== currentUserId.value) {
        const chat = chats.value.find(c => c.id === chatId);
        if (chat) {
          chat.lastMessage = lastMessage.content;
          chat.lastMessageTime = lastMessage.timestamp;
          chat.unreadCount = (chat.unreadCount || 0) + uniqueNewMsgs.length;
        }
      }
      
      // Прокручиваем к последнему сообщению, если пользователь уже находился внизу
      const container = messagesContainer.value;
      if (container && container.scrollHeight - container.scrollTop <= container.clientHeight + 100) {
        nextTick(() => {
          scrollToBottom();
        });
      }
    } catch (error) {
      console.error('Ошибка при обновлении сообщений:', error);
      // Не показываем ошибку пользователю при неудачном поллинге
    }
  }, pollingInterval);
};

const closeActiveChat = () => {
  // Останавливаем поллинг сообщений при закрытии чата
  stopMessagePolling();
  activeChat.value = null;
};

const sendMessage = async () => {
  if (!newMessage.value.trim()) return;
  
  const messageContent = newMessage.value.trim();
  
  // Очищаем поле ввода сразу, чтобы пользователь мог продолжить печатать
  newMessage.value = '';
  
  try {
    // Создаем оптимистичное временное сообщение для UI
    const tempMsg = {
      id: `temp-${Date.now()}`,
      chatId: activeChat.value.id,
      content: messageContent,
      senderId: currentUserId.value,
      senderName: 'Вы',
      timestamp: new Date(),
      read: false,
      sending: true // флаг для отображения статуса отправки
    };
    
    // Добавляем временное сообщение в список
    messages.value.push(tempMsg);
    
    // Обновляем данные чата в списке
    const chat = chats.value.find(c => c.id === activeChat.value.id);
    if (chat) {
      chat.lastMessage = messageContent;
      chat.lastMessageTime = tempMsg.timestamp;
    }
    
    // Обновляем временную метку последнего сообщения для поллинга
    // Это предотвратит дублирование, так как поллинг будет искать сообщения после этой временной метки
    lastMessageTimestamp.value = tempMsg.timestamp;
    
    // Прокручиваем к новому сообщению
    nextTick(() => {
      scrollToBottom();
    });
    
    // Отправляем сообщение на сервер
    const response = await chatService.sendMessage(activeChat.value.id, { text: messageContent });
    console.log('Message sent response:', response.data);
    
    // Получаем данные о сохраненном сообщении с сервера
    const serverMsg = response.data.message || response.data;
    
    if (!serverMsg) {
      throw new Error('Неожиданный формат ответа при отправке сообщения');
    }
    
    // Удаляем временное сообщение и заменяем его на реальное с сервера
    const tempIndex = messages.value.findIndex(msg => msg.id === tempMsg.id);
    if (tempIndex !== -1) {
      // Заменяем временное сообщение на реальное
      const realMsg = {
        id: serverMsg.id,
        chatId: activeChat.value.id,
        content: serverMsg.text || serverMsg.content || messageContent,
        senderId: serverMsg.user_id || serverMsg.sender_id || serverMsg.senderId || currentUserId.value,
        senderName: 'Вы',
        timestamp: serverMsg.timestamp || serverMsg.created_at || serverMsg.createdAt ? 
                  new Date(serverMsg.timestamp || serverMsg.created_at || serverMsg.createdAt) : new Date(),
        read: serverMsg.is_read || serverMsg.isRead || false
      };
      
      // Заменяем временное сообщение
      messages.value.splice(tempIndex, 1, realMsg);
      
      // Обновляем временную метку последнего сообщения после получения ответа от сервера
      lastMessageTimestamp.value = realMsg.timestamp;
    }
    
  } catch (error) {
    console.error('Ошибка при отправке сообщения:', error);
    showToast('Ошибка при отправке сообщения', 'danger');
    
    // Помечаем сообщение как не отправленное
    const tempIndex = messages.value.findIndex(msg => msg.sending && msg.content === messageContent);
    if (tempIndex !== -1) {
      messages.value[tempIndex].sending = false;
      messages.value[tempIndex].error = true;
    }
  }
};

// Загрузка чатов с сервера
const loadChats = async () => {
  try {
    loading.value = true;
    error.value = null;
    
    const response = await chatService.getChats();
    console.log('Response from chat server:', response.data);
    
    // Проверяем формат ответа - в зависимости от формата API
    const chatsList = response.data.chats || response.data;
    
    if (!chatsList || !Array.isArray(chatsList)) {
      console.error('Неожиданный формат ответа API:', response.data);
      error.value = 'Неверный формат данных от сервера';
      return;
    }
    
    // Преобразуем данные чатов с сервера в формат нашего компонента
    chats.value = chatsList.map(chat => {
      // Определяем имя чата в зависимости от типа
      let chatName = chat.name;
      const chatType = chat.type?.value || chat.type;
      
      if (chatType === 'private' && !chatName) {
        // Для личного чата находим имя собеседника
        const otherMember = chat.members?.find(m => {
          const memberId = m.user_id || m.userId || m.id;
          return memberId !== currentUserId.value;
        });
        
        if (otherMember) {
          const firstName = otherMember.user?.first_name || otherMember.first_name || '';
          const lastName = otherMember.user?.last_name || otherMember.last_name || '';
          chatName = `${firstName} ${lastName}`.trim() || 'Личный чат';
        } else {
          chatName = 'Личный чат';
        }
      } else if (!chatName) {
        // Для группового чата без названия
        chatName = 'Групповой чат';
      }
      
      // Определяем последнее сообщение
      const lastMsg = chat.last_message || chat.lastMessage;
      const lastMsgContent = lastMsg?.text || lastMsg?.content || '';
      const lastMsgTime = lastMsg?.timestamp || lastMsg?.created_at || lastMsg?.createdAt;
      const unreadCount = chat.unread_count || chat.unreadCount || 0;
      
      // Участники чата
      const members = chat.members || [];
      const participants = members.map(m => m.user_id || m.userId || m.id);
      
      return {
        id: chat.id,
        name: chatName,
        type: chatType,
        participants: participants,
        lastMessage: lastMsgContent,
        lastMessageTime: lastMsgTime ? new Date(lastMsgTime) : null,
        unreadCount: unreadCount,
        createdAt: chat.created_at || chat.createdAt ? new Date(chat.created_at || chat.createdAt) : new Date()
      };
    });
    
    console.log('Processed chats:', chats.value);
  } catch (error) {
    console.error('Ошибка при загрузке чатов:', error);
    error.value = 'Ошибка при загрузке чатов';
    showToast('Ошибка при загрузке чатов', 'danger');
  } finally {
    loading.value = false;
  }
};

const openNewChatModal = async () => {
  const modal = await modalController.create({
    component: ChatModal
  });
  
  modal.onDidDismiss().then(async ({ data }) => {
    if (data && (data.chat || data.id)) {
      try {
        console.log('Получены данные о новом чате:', data);
        
        const chatData = data.chat || data;
        
        if (!chatData.id) {
          console.error('Отсутствует ID чата в полученных данных');
          return;
        }
        
        // Запрашиваем полную информацию о чате с сервера
        const response = await chatService.getChat(chatData.id);
        const fullChatData = response.data.chat || response.data;
        
        // Обрабатываем данные чата для отображения
        const chatType = fullChatData.type?.value || fullChatData.type;
        let chatName = fullChatData.name;
        
        // Для личного чата пробуем определить имя собеседника
        if (chatType === 'private' && !chatName) {
          const otherMember = fullChatData.members?.find(m => {
            return m.id !== currentUserId.value;
          });
          
          if (otherMember) {
            // The API gives us the full name directly in the 'name' property
            chatName = otherMember.name || 'Личный чат';
            console.log('Set private chat name to:', chatName, 'from member:', otherMember);
          } else {
            chatName = 'Личный чат';
            console.log('Could not find other member, using default name');
          }
        } else if (!chatName) {
          chatName = 'Групповой чат';
        }
        
        // Определяем последнее сообщение
        const lastMsg = fullChatData.last_message || fullChatData.lastMessage || {};
        const lastMsgContent = lastMsg.text || lastMsg.content || '';
        const lastMsgTime = lastMsg.timestamp || lastMsg.created_at || lastMsg.createdAt || fullChatData.created_at || fullChatData.createdAt;
        
        // Создаем объект чата для отображения
        const newChat = {
          id: fullChatData.id,
          name: chatName,
          type: chatType,
          participants: fullChatData.members?.map(m => m.user_id || m.userId || m.id) || [],
          lastMessage: lastMsgContent,
          lastMessageTime: lastMsgTime ? new Date(lastMsgTime) : new Date(),
          unreadCount: fullChatData.unread_count || fullChatData.unreadCount || 0,
          createdAt: fullChatData.created_at || fullChatData.createdAt ? new Date(fullChatData.created_at || fullChatData.createdAt) : new Date()
        };
        
        // Добавляем новый чат в начало списка
        chats.value.unshift(newChat);
        
        // Автоматически выбираем новый чат
        selectChat(newChat);
        showToast('Чат успешно создан!', 'success');
      } catch (error) {
        console.error('Ошибка при обработке нового чата:', error);
        showToast('Ошибка при создании чата', 'danger');
        // Перезагружаем все чаты при ошибке
        loadChats();
      }
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
  
  // Запускаем поллинг для списка чатов
  startChatListPolling();
  
  if (messagesContainer.value) {
    scrollToBottom();
  }
});

// Останавливаем все поллинги при размонтировании компонента
onUnmounted(() => {
  stopChatListPolling();
  stopMessagePolling();
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
