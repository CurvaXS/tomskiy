<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Аналитика</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="exportReport">
            <ion-icon slot="icon-only" :icon="downloadOutline"></ion-icon>
          </ion-button>
          <ion-button @click="openFilterModal">
            <ion-icon slot="icon-only" :icon="filterOutline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
      <ion-toolbar>
        <ion-segment v-model="currentReport">
          <ion-segment-button value="teacherLoad">
            <ion-label>Нагрузка</ion-label>
          </ion-segment-button>
          <ion-segment-button value="classroomUsage">
            <ion-label>Аудитории</ion-label>
          </ion-segment-button>
          <ion-segment-button value="performance">
            <ion-label>Успеваемость</ion-label>
          </ion-segment-button>
        </ion-segment>
      </ion-toolbar>
    </ion-header>
    
    <ion-content class="ion-padding">
      <ion-refresher slot="fixed" @ionRefresh="refreshData($event)">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>
      
      <!-- Фильтры -->
      <div class="filter-section">
        <ion-item>
          <ion-label>Период</ion-label>
          <ion-select v-model="filters.period" interface="action-sheet">
            <ion-select-option value="week">Неделя</ion-select-option>
            <ion-select-option value="month">Месяц</ion-select-option>
            <ion-select-option value="quarter">Квартал</ion-select-option>
            <ion-select-option value="year">Год</ion-select-option>
          </ion-select>
        </ion-item>
        
        <div class="date-range-picker" v-if="filters.period === 'custom'">
          <ion-item>
            <ion-label>С</ion-label>
            <ion-datetime 
              v-model="filters.startDate" 
              presentation="date"
              :min="minDate"
              :max="today"></ion-datetime>
          </ion-item>
          <ion-item>
            <ion-label>По</ion-label>
            <ion-datetime 
              v-model="filters.endDate" 
              presentation="date"
              :min="filters.startDate"
              :max="today"></ion-datetime>
          </ion-item>
        </div>
      </div>
      
      <!-- Карточки с общей статистикой -->
      <div class="stats-cards">
        <ion-card v-for="(stat, index) in statsCards" :key="index">
          <ion-card-header>
            <ion-card-subtitle>{{ stat.title }}</ion-card-subtitle>
            <ion-card-title>{{ stat.value }}</ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <div class="trend" :class="{ 'positive': stat.trend > 0, 'negative': stat.trend < 0 }">
              <ion-icon :icon="stat.trend > 0 ? arrowUpOutline : arrowDownOutline"></ion-icon>
              {{ Math.abs(stat.trend) }}%
            </div>
          </ion-card-content>
        </ion-card>
      </div>
      
      <!-- Отчет о нагрузке преподавателей -->
      <div v-if="currentReport === 'teacherLoad'">
        <h2>Нагрузка преподавателей</h2>
        <div class="chart-container">
          <canvas ref="teacherLoadChart"></canvas>
        </div>
        
        <h3>Детализация по преподавателям</h3>
        <ion-list>
          <ion-item v-for="teacher in teacherLoadData" :key="teacher.id">
            <ion-avatar slot="start">
              <div class="avatar-placeholder">{{ getInitials(teacher.name) }}</div>
            </ion-avatar>
            <ion-label>
              <h2>{{ teacher.name }}</h2>
              <p>{{ teacher.department }}</p>
            </ion-label>
            <div class="load-info">
              <div class="hours">{{ teacher.hours }} ч</div>
              <ion-progress-bar 
                :value="teacher.hours / maxTeacherHours" 
                :color="getLoadColor(teacher.hours)"></ion-progress-bar>
            </div>
          </ion-item>
        </ion-list>
      </div>
      
      <!-- Отчет об использовании аудиторий -->
      <div v-else-if="currentReport === 'classroomUsage'">
        <h2>Использование аудиторий</h2>
        <div class="chart-container">
          <canvas ref="classroomUsageChart"></canvas>
        </div>
        
        <h3>Детализация по аудиториям</h3>
        <ion-list>
          <ion-item v-for="classroom in classroomUsageData" :key="classroom.id">
            <ion-label>
              <h2>{{ classroom.name }}</h2>
              <p>{{ classroom.type }}</p>
            </ion-label>
            <div class="load-info">
              <div class="percentage">{{ classroom.usagePercent }}%</div>
              <ion-progress-bar 
                :value="classroom.usagePercent / 100" 
                :color="getUsageColor(classroom.usagePercent)"></ion-progress-bar>
            </div>
          </ion-item>
        </ion-list>
      </div>
      
      <!-- Отчет об успеваемости -->
      <div v-else-if="currentReport === 'performance'">
        <h2>Успеваемость учащихся</h2>
        <div class="chart-container">
          <canvas ref="performanceChart"></canvas>
        </div>
        
        <h3>Детализация по классам</h3>
        <ion-list>
          <ion-item v-for="classGroup in performanceData" :key="classGroup.id">
            <ion-label>
              <h2>{{ classGroup.name }}</h2>
              <p>Классный руководитель: {{ classGroup.teacher }}</p>
            </ion-label>
            <div class="load-info">
              <div class="percentage">{{ classGroup.averageGrade.toFixed(1) }}</div>
              <ion-progress-bar 
                :value="classGroup.averageGrade / 5" 
                :color="getGradeColor(classGroup.averageGrade)"></ion-progress-bar>
            </div>
          </ion-item>
        </ion-list>
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
  IonList,
  IonItem,
  IonSelect,
  IonSelectOption,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardSubtitle,
  IonCardContent,
  IonAvatar,
  IonProgressBar,
  IonDatetime,
  IonRefresher,
  IonRefresherContent,
  modalController,
  actionSheetController,
  toastController
} from '@ionic/vue';
import { 
  downloadOutline,
  filterOutline,
  arrowUpOutline,
  arrowDownOutline
} from 'ionicons/icons';
import { useAuthStore } from '@/store/auth';
import { analyticsService } from '@/services/api';
import Chart from 'chart.js/auto';

// Состояние компонента
const authStore = useAuthStore();
const currentReport = ref('teacherLoad');
const filters = ref({
  period: 'month',
  startDate: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString(),
  endDate: new Date().toISOString()
});

// Ссылки на элементы для графиков
const teacherLoadChart = ref(null);
const classroomUsageChart = ref(null);
const performanceChart = ref(null);

// Экземпляры графиков
let teacherLoadChartInstance = null;
let classroomUsageChartInstance = null;
let performanceChartInstance = null;

// Константы для расчетов
const maxTeacherHours = 120; // Максимальное количество часов для преподавателя
const today = new Date().toISOString();
const minDate = new Date(new Date().setFullYear(new Date().getFullYear() - 1)).toISOString();

// Мок-данные для демонстрации
const statsCards = ref([
  {
    title: 'Общее количество часов',
    value: '1,256',
    trend: 5.2
  },
  {
    title: 'Средняя нагрузка',
    value: '78 ч',
    trend: -3.1
  },
  {
    title: 'Заполняемость аудиторий',
    value: '76%',
    trend: 2.8
  },
  {
    title: 'Средний балл',
    value: '4.2',
    trend: 1.5
  }
]);

const teacherLoadData = ref([
  {
    id: 1,
    name: 'Иванов Иван Петрович',
    department: 'Кафедра математики',
    hours: 105,
    subjects: ['Алгебра', 'Геометрия']
  },
  {
    id: 2,
    name: 'Петрова Мария Сергеевна',
    department: 'Кафедра русского языка',
    hours: 98,
    subjects: ['Русский язык', 'Литература']
  },
  {
    id: 3,
    name: 'Сидоров Алексей Иванович',
    department: 'Кафедра физики',
    hours: 86,
    subjects: ['Физика']
  },
  {
    id: 4,
    name: 'Козлова Екатерина Николаевна',
    department: 'Кафедра иностранных языков',
    hours: 112,
    subjects: ['Английский язык']
  },
  {
    id: 5,
    name: 'Новиков Дмитрий Александрович',
    department: 'Кафедра истории',
    hours: 75,
    subjects: ['История', 'Обществознание']
  }
]);

const classroomUsageData = ref([
  {
    id: 1,
    name: 'Аудитория 101',
    type: 'Стандартный класс',
    capacity: 30,
    usagePercent: 85
  },
  {
    id: 2,
    name: 'Аудитория 102',
    type: 'Лингафонный кабинет',
    capacity: 25,
    usagePercent: 92
  },
  {
    id: 3,
    name: 'Аудитория 201',
    type: 'Лаборатория физики',
    capacity: 20,
    usagePercent: 78
  },
  {
    id: 4,
    name: 'Аудитория 202',
    type: 'Компьютерный класс',
    capacity: 20,
    usagePercent: 95
  },
  {
    id: 5,
    name: 'Спортивный зал',
    type: 'Спортивный зал',
    capacity: 50,
    usagePercent: 65
  }
]);

const performanceData = ref([
  {
    id: 1,
    name: '10A',
    teacher: 'Иванов И.П.',
    studentCount: 25,
    averageGrade: 4.5,
    subjects: [
      { name: 'Математика', grade: 4.2 },
      { name: 'Русский язык', grade: 4.3 },
      { name: 'Физика', grade: 4.7 }
    ]
  },
  {
    id: 2,
    name: '10Б',
    teacher: 'Петрова М.С.',
    studentCount: 27,
    averageGrade: 4.1,
    subjects: [
      { name: 'Математика', grade: 3.9 },
      { name: 'Русский язык', grade: 4.2 },
      { name: 'Физика', grade: 4.0 }
    ]
  },
  {
    id: 3,
    name: '11A',
    teacher: 'Сидоров А.И.',
    studentCount: 22,
    averageGrade: 4.7,
    subjects: [
      { name: 'Математика', grade: 4.6 },
      { name: 'Русский язык', grade: 4.5 },
      { name: 'Физика', grade: 4.8 }
    ]
  },
  {
    id: 4,
    name: '11Б',
    teacher: 'Козлова Е.Н.',
    studentCount: 23,
    averageGrade: 3.9,
    subjects: [
      { name: 'Математика', grade: 3.7 },
      { name: 'Русский язык', grade: 4.0 },
      { name: 'Физика', grade: 3.8 }
    ]
  }
]);

// Обработчики событий
const exportReport = async () => {
  const actionSheet = await actionSheetController.create({
    header: 'Экспорт отчета',
    buttons: [
      {
        text: 'Экспорт в PDF',
        handler: () => {
          exportReportToFormat('pdf');
        }
      },
      {
        text: 'Экспорт в Excel',
        handler: () => {
          exportReportToFormat('excel');
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

const exportReportToFormat = async (format) => {
  try {
    // В реальном приложении здесь будет экспорт через API
    // const response = await analyticsService.exportReport(currentReport.value, format, filters.value);
    
    // Имитация скачивания
    const toast = await toastController.create({
      message: `Отчет успешно экспортирован в формате ${format.toUpperCase()}`,
      duration: 2000,
      position: 'bottom',
      color: 'success'
    });
    await toast.present();
  } catch (error) {
    console.error('Failed to export report:', error);
    const toast = await toastController.create({
      message: 'Ошибка при экспорте отчета',
      duration: 2000,
      position: 'bottom',
      color: 'danger'
    });
    await toast.present();
  }
};

const openFilterModal = async () => {
  // В реальном приложении здесь будет открытие модального окна с расширенными фильтрами
  alert('Фильтры отчетов');
};

const refreshData = async (event) => {
  try {
    // В реальном приложении здесь будет загрузка данных с сервера
    setTimeout(() => {
      event.target.complete();
    }, 1000);
  } catch (error) {
    console.error('Failed to refresh analytics data:', error);
    event.target.complete();
  }
};

// Функции для графиков
const initTeacherLoadChart = () => {
  if (teacherLoadChartInstance) {
    teacherLoadChartInstance.destroy();
  }
  
  const ctx = teacherLoadChart.value.getContext('2d');
  
  // Подготовка данных для графика
  const labels = teacherLoadData.value.map(teacher => teacher.name.split(' ')[0] + ' ' + teacher.name.split(' ')[1][0] + '.');
  const data = teacherLoadData.value.map(teacher => teacher.hours);
  
  teacherLoadChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Часов',
          data: data,
          backgroundColor: 'rgba(56, 128, 255, 0.7)',
          borderColor: 'rgba(56, 128, 255, 1)',
          borderWidth: 1
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          max: maxTeacherHours
        }
      }
    }
  });
};

const initClassroomUsageChart = () => {
  if (classroomUsageChartInstance) {
    classroomUsageChartInstance.destroy();
  }
  
  const ctx = classroomUsageChart.value.getContext('2d');
  
  // Подготовка данных для графика
  const labels = classroomUsageData.value.map(classroom => classroom.name);
  const data = classroomUsageData.value.map(classroom => classroom.usagePercent);
  
  classroomUsageChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Использование (%)',
          data: data,
          backgroundColor: 'rgba(82, 96, 255, 0.7)',
          borderColor: 'rgba(82, 96, 255, 1)',
          borderWidth: 1
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          max: 100
        }
      }
    }
  });
};

const initPerformanceChart = () => {
  if (performanceChartInstance) {
    performanceChartInstance.destroy();
  }
  
  const ctx = performanceChart.value.getContext('2d');
  
  // Подготовка данных для графика
  const labels = performanceData.value.map(classGroup => classGroup.name);
  const data = performanceData.value.map(classGroup => classGroup.averageGrade);
  
  performanceChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Средний балл',
          data: data,
          fill: false,
          backgroundColor: 'rgba(45, 211, 111, 0.7)',
          borderColor: 'rgba(45, 211, 111, 1)',
          tension: 0.1,
          pointBackgroundColor: 'rgba(45, 211, 111, 1)',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 5
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: false,
          min: 3,
          max: 5
        }
      }
    }
  });
};

// Вспомогательные функции
const getInitials = (name) => {
  return name.split(' ').map(word => word[0]).join('').toUpperCase();
};

const getLoadColor = (hours) => {
  if (hours < 60) return 'success';
  if (hours < 90) return 'warning';
  return 'danger';
};

const getUsageColor = (percent) => {
  if (percent < 50) return 'danger';
  if (percent < 75) return 'warning';
  return 'success';
};

const getGradeColor = (grade) => {
  if (grade < 3.5) return 'danger';
  if (grade < 4.5) return 'warning';
  return 'success';
};

// Загрузка данных при монтировании компонента
onMounted(async () => {
  try {
    // В реальном приложении здесь будет загрузка данных с сервера
    // const response = await analyticsService.getTeacherLoad(filters.value);
    // teacherLoadData.value = response.data;
    
    // Инициализация графиков после загрузки данных
    nextTick(() => {
      initTeacherLoadChart();
    });
  } catch (error) {
    console.error('Failed to load analytics data:', error);
  }
});

// Отслеживаем изменение текущего отчета для обновления графиков
watch(currentReport, async (newReport) => {
  try {
    // В реальном приложении здесь будет загрузка данных с сервера в зависимости от выбранного отчета
    /*
    if (newReport === 'teacherLoad') {
      const response = await analyticsService.getTeacherLoad(filters.value);
      teacherLoadData.value = response.data;
    } else if (newReport === 'classroomUsage') {
      const response = await analyticsService.getClassroomUsage(filters.value);
      classroomUsageData.value = response.data;
    } else if (newReport === 'performance') {
      const response = await analyticsService.getPerformance(filters.value);
      performanceData.value = response.data;
    }
    */
    
    // Инициализация соответствующего графика
    nextTick(() => {
      if (newReport === 'teacherLoad' && teacherLoadChart.value) {
        initTeacherLoadChart();
      } else if (newReport === 'classroomUsage' && classroomUsageChart.value) {
        initClassroomUsageChart();
      } else if (newReport === 'performance' && performanceChart.value) {
        initPerformanceChart();
      }
    });
  } catch (error) {
    console.error('Failed to load report data:', error);
  }
});

// Отслеживаем изменение фильтров для обновления данных
watch(filters, async (newFilters) => {
  try {
    // В реальном приложении здесь будет загрузка данных с сервера с учетом новых фильтров
    /*
    if (currentReport.value === 'teacherLoad') {
      const response = await analyticsService.getTeacherLoad(newFilters);
      teacherLoadData.value = response.data;
      nextTick(() => {
        initTeacherLoadChart();
      });
    } else if (currentReport.value === 'classroomUsage') {
      const response = await analyticsService.getClassroomUsage(newFilters);
      classroomUsageData.value = response.data;
      nextTick(() => {
        initClassroomUsageChart();
      });
    } else if (currentReport.value === 'performance') {
      const response = await analyticsService.getPerformance(newFilters);
      performanceData.value = response.data;
      nextTick(() => {
        initPerformanceChart();
      });
    }
    */
  } catch (error) {
    console.error('Failed to load filtered data:', error);
  }
}, { deep: true });
</script>

<style scoped>
.filter-section {
  margin-bottom: 20px;
}

.date-range-picker {
  display: flex;
  gap: 10px;
}

.stats-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 10px;
  margin-bottom: 20px;
}

.trend {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 14px;
}

.trend.positive {
  color: var(--ion-color-success);
}

.trend.negative {
  color: var(--ion-color-danger);
}

h2, h3 {
  margin: 20px 0 10px;
  color: var(--ion-color-dark);
}

.chart-container {
  height: 300px;
  margin: 20px 0;
}

.avatar-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--ion-color-primary);
  color: white;
  font-weight: bold;
  border-radius: 50%;
}

.load-info {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  width: 90px;
}

.hours, .percentage {
  text-align: right;
  margin-bottom: 5px;
  font-weight: bold;
}

ion-progress-bar {
  width: 100%;
  height: 10px;
  --buffer-background: transparent;
  --progress-background: var(--ion-color-primary);
}
</style>
