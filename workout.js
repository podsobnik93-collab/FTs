// workout.js — Тренировки: база упражнений, конструктор, выполнение, программы

// ==================== БАЗА УПРАЖНЕНИЙ ====================
const ENCYCLOPEDIA = {
  "biceps":[{"n":"Концентрированные сгибания на бицепс"},{"n":"Сгибание в стиле молоток на скамье Скотта"},{"n":"Сгибание рук в блоке лёжа"},{"n":"Сгибание рук в блоке сидя на корточках"},{"n":"Сгибание рук в кроссовере"},{"n":"Сгибание рук в тренажёре"},{"n":"Сгибание рук на скамье Скотта в блоке"},{"n":"Сгибание одной руки с гантелью на скамье Скотта"},{"n":"Сгибание рук с гантелями стоя, одновременное или поочерёдное"},{"n":"Сгибание рук с гантелями хватом молот"},{"n":"Сгибание рук с разворотом сидя на наклонной скамье"},{"n":"Сгибание рук сидя на наклонной скамье, вместе или поочерёдно"},{"n":"Сгибание рук со штангой или гантелями лёжа на наклонной скамье"},{"n":"Сгибание рук со штангой на скамье Скотта"},{"n":"Сгибание рук со штангой с армбластером"},{"n":"Сгибание руки сидя от колена"},{"n":"Сгибания рук с разворотом стоя или сидя"},{"n":"Сгибания рук со штангой EZ-грифом параллельным хватом"},{"n":"Сгибания рук стоя в кроссовере, «проповедник»"}],
  "chest":[{"n":"Жим в кроссовере горизонтально"},{"n":"Жим в рычажном тренажёре"},{"n":"Жим в Смите лёжа"},{"n":"Жим в Смите под наклоном"},{"n":"Жим гантелей лёжа"},{"n":"Жим гантелей под наклоном"},{"n":"Жим Свенда с гантелями лёжа или под наклоном"},{"n":"Жим штанги лёжа под наклоном"},{"n":"Жим штанги лёжа"},{"n":"Отжимания на брусьях"},{"n":"Отжимания широким хватом"},{"n":"Пуловер лёжа на скамье"},{"n":"Разведение гантелей"},{"n":"Сведение рук в кроссовере снизу"},{"n":"Сведение рук в кроссовере стоя или лёжа"},{"n":"Сведение рук в тренажёре"}],
  "legs":[{"n":"Сгибание ног лёжа"},{"n":"Сгибание ног сидя"},{"n":"Сгибание ног стоя"},{"n":"Жим платформы носками"},{"n":"Подъём на носки сидя в тренажёре"},{"n":"Подъём на носки стоя"},{"n":"Разгибание ног в тренажёре сидя"},{"n":"Разгибание ног в тренажёре одной ногой"},{"n":"Воздушные приседания"},{"n":"Выпады вперёд с гантелями"},{"n":"Выпады назад"},{"n":"Выпады в тренажёре Смита"},{"n":"Гакк-приседания"},{"n":"Жим ногами в тренажёре"},{"n":"Жим ногами одной ногой"},{"n":"Зашагивания на тумбу с гантелями"},{"n":"Приседания в тренажёре Смита"},{"n":"Приседания с гантелями"},{"n":"Приседания со штангой"},{"n":"Фронтальные приседания со штангой"},{"n":"Становая тяга: классика, сумо, трап-гриф"},{"n":"Приведение бедра стоя в тренажёре"},{"n":"Приведение ноги в нижнем блоке"},{"n":"Сведение ног сидя в тренажёре"}],
  "glutes":[{"n":"Доброе утро (Good Morning)"},{"n":"Мёртвая тяга на прямых ногах"},{"n":"Румынская тяга"},{"n":"Румынская тяга с гантелями"},{"n":"Румынская тяга в тренажёре Смита"},{"n":"Становая тяга на одной ноге с гантелями"},{"n":"Болгарские приседания"},{"n":"Выпады в Смите с акцентом на ягодицы"},{"n":"Выпады вперёд с акцентом на ягодицы"},{"n":"Выпады на месте с наклоном корпуса"},{"n":"Подъёмы на платформу"},{"n":"Гиперэкстензия с акцентом на ягодицы"},{"n":"Краб с резинкой"},{"n":"Ласточка"},{"n":"Махи ногой в сторону"},{"n":"Отведение бедра стоя в тренажёре"},{"n":"Отведение ноги в сторону в кроссовере"},{"n":"Отведение ноги назад в блоке"},{"n":"Отведение ноги назад в упоре на руках"},{"n":"Отведение ноги вверх на блоке"},{"n":"Отведение ног в тренажёре сидя"},{"n":"Разведение бёдер сидя с резинкой"},{"n":"Разведение ног с резинкой в ягодичном мостике"},{"n":"Разгибание бедра стоя в тренажёре"},{"n":"Хип-траст на скамье"},{"n":"Ягодичный мост в тренажёре"},{"n":"Ягодичный мост в тренажёре Смита на скамье"},{"n":"Ягодичный мост лёжа на полу"}],
  "shoulders":[{"n":"Армейский жим стоя"},{"n":"Жим гантелей сидя или стоя"},{"n":"Жим Арнольда"},{"n":"Жим вверх перед собой в тренажёре"},{"n":"Жим резины над головой"},{"n":"Махи гантелями в стороны стоя или сидя"},{"n":"Махи гантелью одной рукой в сторону"},{"n":"Махи в стороны с резинкой"},{"n":"Отведение рук в стороны в тренажёре"},{"n":"Махи гантелями перед собой"},{"n":"Подъём гантелей перед собой лёжа на наклонной скамье"},{"n":"Face Pull с резинкой"},{"n":"Обратная бабочка в тренажёре"},{"n":"Разведения гантелей в наклоне нейтральным хватом"},{"n":"Махи на заднюю дельту лёжа грудью на наклонной скамье"},{"n":"Разведения на задние дельты в наклоне с резинкой"},{"n":"Отведение руки в сторону в наклоне на блоке"},{"n":"Тяга резины с высоким креплением на задние дельты"},{"n":"Наружная и внутренняя ротация плеча с резинкой"},{"n":"Наружная ротация плеча 90 градусов с резинкой"},{"n":"Тяга штанги к подбородку"},{"n":"Тяга нижнего блока к подбородку"}],
  "back":[{"n":"Подтягивания широким прямым хватом к груди"},{"n":"Подтягивания параллельным хватом"},{"n":"Подтягивания узким обратным хватом"},{"n":"Тяга верхнего блока широким прямым хватом к груди"},{"n":"Тяга верхнего блока параллельным узким хватом к груди"},{"n":"Тяга верхнего блока обратным хватом к груди"},{"n":"Вертикальная тяга в Хаммере"},{"n":"Горизонтальная тяга блока сидя узким хватом"},{"n":"Тяга нижнего блока параллельным хватом"},{"n":"Горизонтальная рычажная тяга в Хаммере"},{"n":"Тяга Т-грифа с упором грудью"},{"n":"Тяга гантели одной рукой в упоре на скамье"},{"n":"Тяга штанги в наклоне прямым хватом"},{"n":"Тяга штанги в наклоне обратным хватом"},{"n":"Тяга Т-грифа в наклоне"},{"n":"Пуловер на верхнем блоке стоя"},{"n":"Тяга верхнего блока к лицу"},{"n":"Шраги с гантелями"}],
  "triceps":[{"n":"Жим лёжа узким хватом"},{"n":"Жим лёжа узким хватом в тренажёре Смита"},{"n":"Отжимания на брусьях"},{"n":"Отжимания на брусьях в гравитроне узким хватом"},{"n":"Отжимания с узкой постановкой рук"},{"n":"Обратные отжимания от скамьи"},{"n":"Разгибание рук на верхнем блоке"},{"n":"Разгибание рук на блоке с V-образной рукоятью и канатом"},{"n":"Разгибание одной руки в блоке"},{"n":"Французский жим лёжа"},{"n":"Разгибание рук из-за головы в кроссовере"},{"n":"Разгибание рук из-за головы в нижнем блоке"},{"n":"Разгибание одной руки с гантелью из-за головы стоя или сидя"},{"n":"Разгибание одной руки с гантелью лёжа"}],
  "abs":[{"n":"Планка"},{"n":"Боковая планка"},{"n":"Частичный подъём туловища лёжа на полу"},{"n":"Скручивания лёжа на наклонной скамье"},{"n":"Скручивания в верхнем блоке стоя на коленях"},{"n":"Обратные скручивания"},{"n":"Подъём ног в висе на локтях"},{"n":"Поочерёдный подъём ног лёжа на спине"},{"n":"Вакуум"}],
  "forearms":[{"n":"Сгибание кистей со штангой в упоре сидя"},{"n":"Сгибание кисти с гантелью в упоре"},{"n":"Разгибание кисти с гантелью в упоре"},{"n":"Сгибание кистей со штангой за спиной стоя"}]
};
for(const [cat,exs] of Object.entries(ENCYCLOPEDIA)){
  ALL_EXERCISES[cat]=exs.map(ex=>({...ex,s:3,r:12,kg:0,k:30,desc:'',tech:''}));
}
if(!ALL_EXERCISES.glutes)ALL_EXERCISES.glutes=[];
if(!ALL_EXERCISES.glutes.find(e=>e.n==='Ягодичный мостик со штангой')) ALL_EXERCISES.glutes.push({n:'Ягодичный мостик со штангой',s:3,r:15,kg:20,k:40,desc:'',tech:''});
if(!ALL_EXERCISES.back.find(e=>e.n==='Тяга горизонтального блока к поясу')) ALL_EXERCISES.back.push({n:'Тяга горизонтального блока к поясу',s:3,r:10,kg:50,k:45,desc:'',tech:''});
if(!ALL_EXERCISES.chest.find(e=>e.n==='Разводка гантелей лёжа')) ALL_EXERCISES.chest.push({n:'Разводка гантелей лёжа',s:3,r:10,kg:20,k:40,desc:'',tech:''});
if(!ALL_EXERCISES.legs.find(e=>e.n==='Жим платформы')) ALL_EXERCISES.legs.push({n:'Жим платформы',s:4,r:10,kg:80,k:60,desc:'',tech:''});

// ==================== УПРАВЛЕНИЕ ПОТОКОМ ТРЕНИРОВКИ ====================
function saveWorkoutFlowState(){
  const state = {
    currentWtScreen,
    customWt,
    editMode,
    workoutTitle: document.getElementById('exe-title')?.textContent || 'Тренировка',
    builderTitle: document.getElementById('wt-name-input')?.value || '',
    pickerChecked: pickerChecked ? Object.fromEntries(Object.entries(pickerChecked).map(([k,v]) => [k, Array.from(v)])) : {},
    pickerParams: pickerParams || {},
    activeMuscle: activeMuscle || null
  };
  localStorage.setItem('fs-workout-flow-state', JSON.stringify(state));
}
function restoreWorkoutFlowState(){
  try {
    const state = JSON.parse(localStorage.getItem('fs-workout-flow-state') || '{}');
    if (!state || typeof state !== 'object') return false;
    if (Array.isArray(state.customWt)) customWt = state.customWt;
    if (typeof state.editMode === 'boolean') editMode = state.editMode;
    if (state.builderTitle && document.getElementById('wt-name-input')) document.getElementById('wt-name-input').value = state.builderTitle;
    if (state.workoutTitle && document.getElementById('exe-title')) document.getElementById('exe-title').textContent = state.workoutTitle;
    currentWtScreen = state.currentWtScreen || (customWt.length ? 'execute' : 'home');
    if (state.pickerChecked) {
      pickerChecked = {};
      for (let [cat, arr] of Object.entries(state.pickerChecked)) {
        pickerChecked[cat] = new Set(arr);
      }
    }
    if (state.pickerParams) pickerParams = state.pickerParams;
    if (state.activeMuscle) activeMuscle = state.activeMuscle;
    return true;
  } catch(e){ return false; }
}
function clearWorkoutFlowState(){
  localStorage.removeItem('fs-workout-flow-state');
}

// ==================== ПРОГРАММЫ ТРЕНИРОВОК ====================
const PROGRAMS = [{"id":"womens","name":"Женская тренировка","level":"Средний","days_week":"4 дня/нед","goal":"Форма и тонус","desc":"Акцент на ягодицы, ноги и пресс. Подходит для девушек любого уровня.","schedule":[{"label":"Пн","name":"Ягодицы + Ноги","rest":false,"exs":["Румынская тяга","Приседания со штангой","Отведение ноги в кроссовере","Выпады с гантелями","Сгибание ног лёжа","Планка"]},{"label":"Вт","name":"Отдых","rest":true,"exs":[]},{"label":"Ср","name":"Спина + Плечи","rest":false,"exs":["Тяга верхнего блока широким прямым хватом к груди","Тяга горизонтального блока к поясу","Жим гантелей сидя или стоя","Разведение рук с гантелями в стороны","Тяга штанги в наклоне к поясу"]},{"label":"Чт","name":"Отдых","rest":true,"exs":[]},{"label":"Пт","name":"Ягодицы + Пресс","rest":false,"exs":["Ягодичный мостик со штангой","Мёртвая тяга на прямых ногах","Гиперэкстензия","Скручивания лёжа на наклонной скамье","Боковая планка","Подъём ног в висе"]},{"label":"Сб","name":"Грудь + Руки","rest":false,"exs":["Жим гантелей лёжа","Разводка гантелей лёжа","Сгибание рук в кроссовере","Жим лёжа узким хватом","Отжимания на брусьях"]},{"label":"Вс","name":"Отдых","rest":true,"exs":[]}]},{"id":"split_back_bi","name":"Сплит: Спина + Бицепс + Пресс","level":"Средний","days_week":"1 день/нед","goal":"Масса и сила","desc":"Классический сплит-день на спину и бицепс с проработкой пресса в конце.","schedule":[{"label":"Пн","name":"Спина + Бицепс + Пресс","rest":false,"exs":["Подтягивания широким прямым хватом к груди","Тяга штанги в наклоне к поясу","Тяга горизонтального блока к поясу","Тяга гантели в наклоне одной рукой","Сгибание рук со штангой стоя","Сгибание рук с гантелями поочерёдно стоя","Планка","Скручивания лёжа на наклонной скамье"]},{"label":"Вт","name":"Отдых","rest":true,"exs":[]},{"label":"Ср","name":"Отдых","rest":true,"exs":[]},{"label":"Чт","name":"Отдых","rest":true,"exs":[]},{"label":"Пт","name":"Отдых","rest":true,"exs":[]},{"label":"Сб","name":"Отдых","rest":true,"exs":[]},{"label":"Вс","name":"Отдых","rest":true,"exs":[]}]},{"id":"split_chest_tri","name":"Сплит: Грудь + Трицепс","level":"Средний","days_week":"1 день/нед","goal":"Масса и сила","desc":"Классический сплит-день на грудь и трицепс. Синергия мышц для максимального роста.","schedule":[{"label":"Пн","name":"Грудь + Трицепс","rest":false,"exs":["Жим штанги лёжа","Жим гантелей лёжа","Жим штанги лёжа под наклоном","Разводка гантелей лёжа","Жим лёжа узким хватом","Отжимания на брусьях","Разгибание руки с гантелью из-за головы"]},{"label":"Вт","name":"Отдых","rest":true,"exs":[]},{"label":"Ср","name":"Отдых","rest":true,"exs":[]},{"label":"Чт","name":"Отдых","rest":true,"exs":[]},{"label":"Пт","name":"Отдых","rest":true,"exs":[]},{"label":"Сб","name":"Отдых","rest":true,"exs":[]},{"label":"Вс","name":"Отдых","rest":true,"exs":[]}]},{"id":"split_shoulders","name":"Сплит: Плечи + Трапеция + Пресс","level":"Средний","days_week":"1 день/нед","goal":"Масса и сила","desc":"День на дельты, трапецию и пресс. Широкие плечи и визуальный V-конус.","schedule":[{"label":"Пн","name":"Плечи + Трапеция + Пресс","rest":false,"exs":["Жим Арнольда","Армейский жим стоя","Разведение рук с гантелями в стороны","Подъём гантелей перед собой","Тяга штанги к подбородку","Планка","Подъём ног в висе","Скручивания лёжа на наклонной скамье"]},{"label":"Вт","name":"Отдых","rest":true,"exs":[]},{"label":"Ср","name":"Отдых","rest":true,"exs":[]},{"label":"Чт","name":"Отдых","rest":true,"exs":[]},{"label":"Пт","name":"Отдых","rest":true,"exs":[]},{"label":"Сб","name":"Отдых","rest":true,"exs":[]},{"label":"Вс","name":"Отдых","rest":true,"exs":[]}]},{"id":"split_legs","name":"Сплит: Ноги + Пресс + Предплечья","level":"Средний","days_week":"1 день/нед","goal":"Масса и сила","desc":"День ног с проработкой пресса и предплечий. Фундамент для всего тела.","schedule":[{"label":"Пн","name":"Ноги + Пресс + Предплечья","rest":false,"exs":["Приседания со штангой","Жим платформы","Разгибание ног в тренажёре","Сгибание ног лёжа","Подъём на носки стоя в тренажёре","Планка","Скручивания лёжа на наклонной скамье","Сгибание кистей со штангой в упоре сидя"]},{"label":"Вт","name":"Отдых","rest":true,"exs":[]},{"label":"Ср","name":"Отдых","rest":true,"exs":[]},{"label":"Чт","name":"Отдых","rest":true,"exs":[]},{"label":"Пт","name":"Отдых","rest":true,"exs":[]},{"label":"Сб","name":"Отдых","rest":true,"exs":[]},{"label":"Вс","name":"Отдых","rest":true,"exs":[]}]},{"id":"split_arms","name":"Сплит: Бицепс + Трицепс + Пресс","level":"Средний","days_week":"1 день/нед","goal":"Масса и рельеф","desc":"Изолированный день на руки. Максимальный пампинг бицепса и трицепса.","schedule":[{"label":"Пн","name":"Бицепс + Трицепс + Пресс","rest":false,"exs":["Сгибание рук со штангой стоя","Сгибание рук с гантелями поочерёдно стоя","Сгибание на скамье Скотта","Жим лёжа узким хватом","Отжимания на брусьях","Разгибание руки с гантелью из-за головы","Планка","Скручивания лёжа на наклонной скамье"]},{"label":"Вт","name":"Отдых","rest":true,"exs":[]},{"label":"Ср","name":"Отдых","rest":true,"exs":[]},{"label":"Чт","name":"Отдых","rest":true,"exs":[]},{"label":"Пт","name":"Отдых","rest":true,"exs":[]},{"label":"Сб","name":"Отдых","rest":true,"exs":[]},{"label":"Вс","name":"Отдых","rest":true,"exs":[]}]},{"id":"fullbody","name":"Тренировка всего тела","level":"Средний","days_week":"3 дня/нед","goal":"Общая форма","desc":"Full body тренировка 3 раза в неделю. Каждая сессия прорабатывает всё тело.","schedule":[{"label":"Пн","name":"Full Body A","rest":false,"exs":["Приседания со штангой","Жим штанги лёжа","Тяга штанги в наклоне к поясу","Армейский жим стоя","Сгибание рук со штангой стоя","Планка"]},{"label":"Вт","name":"Отдых","rest":true,"exs":[]},{"label":"Ср","name":"Full Body B","rest":false,"exs":["Румынская тяга","Жим гантелей лёжа","Подтягивания широким прямым хватом к груди","Жим Арнольда","Жим лёжа узким хватом","Скручивания лёжа на наклонной скамье"]},{"label":"Чт","name":"Отдых","rest":true,"exs":[]},{"label":"Пт","name":"Full Body C","rest":false,"exs":["Жим платформы","Разводка гантелей лёжа","Тяга горизонтального блока к поясу","Разведение рук с гантелями в стороны","Сгибание рук с гантелями поочерёдно стоя","Подъём ног в висе"]},{"label":"Сб","name":"Отдых","rest":true,"exs":[]},{"label":"Вс","name":"Отдых","rest":true,"exs":[]}]},{"id":"beginner_bw","name":"Начальный уровень (своё тело)","level":"Начинающий","days_week":"3 дня/нед","goal":"Основа и выносливость","desc":"Только упражнения с собственным весом. Идеально для старта без оборудования.","schedule":[{"label":"Пн","name":"Верх тела","rest":false,"exs":["Отжимания с узкой постановкой рук","Планка","Боковая планка","Частичный подъём туловища лёжа на полу","Скручивания лёжа на наклонной скамье"]},{"label":"Вт","name":"Отдых","rest":true,"exs":[]},{"label":"Ср","name":"Низ тела","rest":false,"exs":["Воздушные приседания","Выпады с гантелями","Гиперэкстензия","Подъём ног в висе","Планка"]},{"label":"Чт","name":"Отдых","rest":true,"exs":[]},{"label":"Пт","name":"Всё тело","rest":false,"exs":["Отжимания с узкой постановкой рук","Воздушные приседания","Подтягивания параллельным хватом","Планка","Боковая планка","Скручивания лёжа на наклонной скамье"]},{"label":"Сб","name":"Отдых","rest":true,"exs":[]},{"label":"Вс","name":"Отдых","rest":true,"exs":[]}]}];

function getPlannedWorkoutsForMonth(year, month){
  const result = {};
  if(!activeProgId) return result;
  const prog = PROGRAMS.find(p => p.id === activeProgId);
  if(!prog || !prog.schedule || !prog.schedule.length) return result;
  const startRaw = localStorage.getItem('fs-active-prog-start');
  const start = startRaw ? new Date(startRaw) : new Date();
  start.setHours(0,0,0,0);
  const daysInMonth = new Date(year, month+1, 0).getDate();
  for(let d=1; d<=daysInMonth; d++){
    const date = new Date(year, month, d);
    date.setHours(0,0,0,0);
    const diff = Math.floor((date - start) / 86400000);
    if(diff < 0) continue;
    const planDay = prog.schedule[diff % prog.schedule.length];
    const dd = String(d).padStart(2,'0');
    const mm = String(month+1).padStart(2,'0');
    result[`${dd}.${mm}.${year}`] = planDay;
  }
  return result;
}
function startPlannedWorkoutByDate(dateStr){
  if(!activeProgId) return;
  const prog = PROGRAMS.find(p => p.id === activeProgId);
  if(!prog || !prog.schedule || !prog.schedule.length) return;
  const startRaw = localStorage.getItem('fs-active-prog-start');
  const start = startRaw ? new Date(startRaw) : new Date();
  start.setHours(0,0,0,0);
  const parts = dateStr.split('.');
  const date = new Date(Number(parts[2]), Number(parts[1])-1, Number(parts[0]));
  date.setHours(0,0,0,0);
  const diff = Math.floor((date - start) / 86400000);
  if(diff < 0) return;
  const dayIdx = diff % prog.schedule.length;
  startProgDay(activeProgId, dayIdx);
}
window.startPlannedWorkoutByDate = startPlannedWorkoutByDate;

function togglePrograms(){
  const sec=document.getElementById('prog-section'),arrow=document.getElementById('prog-toggle-arrow');
  if(!sec)return;
  const isOpen = sec.style.display !== 'none' && sec.style.display !== '';
  sec.style.display = isOpen ? 'none' : 'block';
  if(arrow) arrow.style.transform = isOpen ? '' : 'rotate(180deg)';
  if(!isOpen) renderProgList();
}
window.togglePrograms = togglePrograms;

function renderProgList(){
  const el=document.getElementById('prog-list'),detail=document.getElementById('prog-detail');
  if(!el)return;
  detail.style.display='none'; el.style.display='flex';
  const banner=document.getElementById('active-prog-banner');
  if(activeProgId){const ap=PROGRAMS.find(p=>p.id===activeProgId); if(ap&&banner){banner.style.display='block'; banner.innerHTML=`✅ Активна: <strong>${ap.name}</strong> — ${ap.days_week}`;}}else if(banner)banner.style.display='none';
  el.innerHTML=PROGRAMS.map(p=>`<div class="prog-card-item ${p.id===activeProgId?'active-prog':''}" onclick="viewProgram('${p.id}')"><div class="prog-card-top"><div class="prog-card-name">${p.name}</div>${p.id===activeProgId?'<span style="font-size:11px;color:var(--accent);font-weight:600">✅ Активна</span>':''}</div><div class="prog-card-meta"><span class="prog-meta-tag">${p.level}</span><span class="prog-meta-tag">📅 ${p.days_week}</span><span class="prog-meta-tag">🎯 ${p.goal}</span></div><div class="prog-card-desc">${p.desc}</div></div>`).join('');
}
window.renderProgList = renderProgList;

function viewProgram(id){
  viewingProgId=id; const prog=PROGRAMS.find(p=>p.id===id); if(!prog)return;
  const listEl=document.getElementById('prog-list'),detailEl=document.getElementById('prog-detail');
  listEl.style.display='none'; detailEl.style.display='block';
  const today=new Date().getDay(); const dayMap={0:6,1:0,2:1,3:2,4:3,5:4,6:5}; const todayIdx=dayMap[today];
  const cells=prog.schedule.map((d,i)=>{const isToday=i===todayIdx; const icon=d.rest?'🛌':'🏋️'; return `<div class="prog-day-cell ${d.rest?'rest':''} ${isToday?'today-cell':''}" onclick="${d.rest?'':`showProgDay('${id}',${i})`}"><div class="prog-day-label">${d.label}</div><div class="prog-day-icon">${icon}</div><div class="prog-day-name">${d.name.split('—')[0].trim().substring(0,10)}</div></div>`;}).join('');
  const todayDay=prog.schedule[todayIdx];
  const todayBlock=todayDay&&!todayDay.rest?`<div style="background:color-mix(in srgb,var(--accent) 10%,transparent);border:1.5px solid var(--accent);border-radius:12px;padding:12px 14px;margin-bottom:12px"><div style="font-size:11px;font-weight:700;color:var(--accent);margin-bottom:4px">📅 Сегодня</div><div style="font-weight:600;font-size:14px;margin-bottom:8px">${todayDay.name}</div><div>${todayDay.exs.map(e=>`<span class="prog-ex-chip">${e}</span>`).join('')}</div><button class="prog-start-btn" onclick="startProgDay('${id}',${todayIdx})">▶ Начать тренировку сейчас</button></div>`:`<div style="text-align:center;padding:12px;color:var(--text-muted);font-size:13px;margin-bottom:12px">🛌 Сегодня день отдыха</div>`;
  const isActive=activeProgId===id;
  detailEl.innerHTML = `<div class="prog-back-btn" onclick="renderProgList()">← Все программы</div>
<div style="font-weight:700;font-size:16px;margin-bottom:4px">${prog.name}</div>
<div style="font-size:13px;color:var(--text-muted);margin-bottom:12px">${prog.desc}</div>
<button class="prog-start-btn" style="margin-bottom:14px;${isActive?'background:#6b7280':''}" onclick="setActiveProgram('${id}')">
    ${isActive?'✅ Программа активна':'📌 Выбрать программу'}
</button>
${todayBlock}
<div style="font-weight:600;font-size:13px;margin-bottom:8px;color:var(--text-muted)">РАСПИСАНИЕ НА НЕДЕЛЮ</div>
<div class="prog-week-grid">${cells}</div>
<div id="prog-day-expanded"></div>`;
}
window.viewProgram = viewProgram;

function showProgDay(progId,dayIdx){
  const prog=PROGRAMS.find(p=>p.id===progId); if(!prog)return;
  const day=prog.schedule[dayIdx]; if(!day||day.rest)return;
  const el=document.getElementById('prog-day-expanded'); if(!el)return;
  el.innerHTML=`<div class="prog-day-detail"><div class="prog-day-detail-name">${day.label}: ${day.name}</div><div style="margin-bottom:10px">${day.exs.map(e=>`<span class="prog-ex-chip">${e}</span>`).join('')}</div><button class="prog-start-btn" onclick="startProgDay('${progId}',${dayIdx})">▶ Начать эту тренировку</button></div>`;
  el.scrollIntoView({behavior:'smooth',block:'nearest'});
}
window.showProgDay = showProgDay;

function setActiveProgram(id){
  if(activeProgId===id){
    activeProgId=null;
    localStorage.removeItem('fs-active-prog');
    localStorage.removeItem('fs-active-prog-start');
    toast('❎ Программа деактивирована');
  } else {
    activeProgId=id;
    localStorage.setItem('fs-active-prog',id);
    localStorage.setItem('fs-active-prog-start', new Date().toISOString().split('T')[0]);
    toast('📌 Программа активирована!');
  }
  viewProgram(id);
}
window.setActiveProgram = setActiveProgram;

function startProgDay(progId,dayIdx){
  const prog=PROGRAMS.find(p=>p.id===progId); if(!prog)return;
  const day=prog.schedule[dayIdx]; if(!day||day.rest)return;
  const allEx=Object.values(ALL_EXERCISES).flat();
  customWt=day.exs.map(name=>{const found=allEx.find(e=>e.n===name); if(found)return {...found,sets_data:Array.from({length:found.s},()=>({r:found.r,kg:found.kg,done:false})),done:false}; return {n:name,s:3,r:12,k:30,kg:0,m:'',sets_data:[{r:12,kg:0,done:false},{r:12,kg:0,done:false},{r:12,kg:0,done:false}],done:false};});
  document.getElementById('exe-title').textContent=day.name;
  showWtScreen('execute'); renderExecute(); updateCtaLabel(); toast('🏋️ '+day.name+' — поехали!');
}
window.startProgDay = startProgDay;

function initPrograms(){if(activeProgId){const banner=document.getElementById('active-prog-banner'),sec=document.getElementById('prog-section'); if(banner&&sec){const ap=PROGRAMS.find(p=>p.id===activeProgId); if(ap){sec.style.display='block';const arrow=document.getElementById('prog-toggle-arrow');if(arrow)arrow.style.transform='rotate(180deg)';renderProgList();}}}}

// ==================== КОНСТРУКТОР ТРЕНИРОВКИ ====================
let pickerChecked={}, pickerParams={}, activeMuscle=null;

function showWtScreen(screen){ currentWtScreen = screen; saveWorkoutFlowState(); updateCtaLabel();
  ['wt-home','wt-builder','wt-execute'].forEach(id=>{const el=document.getElementById(id); if(el)el.style.display=(id==='wt-'+screen)?'block':'none';});
  const titles={home:'🏋️ Тренировка',builder:'✏️ Создать тренировку',execute:'💪 Выполнение'};
  const hdr=document.getElementById('header-title'); if(hdr)hdr.textContent=titles[screen]||'FitSim';
  const scrollArea = document.querySelector('.scroll-area');
  if (scrollArea) scrollArea.scrollTop = 0;
  const cta=document.querySelector('.bottom-cta'); if(cta)cta.style.display='none';
  if(screen==='home'){renderSavedWts(); if(activeProgId)initPrograms();}
  if(screen==='builder'){if(!pickerChecked || Object.keys(pickerChecked).length===0) initBuilder(); else { renderMuscleGrid(); if(activeMuscle) renderExPicker(activeMuscle); updateBldStartBar(); }}
  if(screen==='execute'){editMode=false; renderExecute();}
}
window.showWtScreen = showWtScreen;

function renderSavedWts(){
  const card=document.getElementById('saved-wt-card'),list=document.getElementById('saved-wt-list'),cnt=document.getElementById('saved-wt-count');
  savedWts=JSON.parse(localStorage.getItem('fs-saved-wts')||'[]');
  if(!savedWts.length){if(card)card.style.display='none';return;}
  if(card)card.style.display='block'; if(cnt)cnt.textContent=savedWts.length+' шаблонов';
  if(list) list.innerHTML=savedWts.map((wt,i)=>`<div class="saved-wt-item"><div class="saved-wt-info"><div class="saved-wt-name">${wt.name||'Тренировка '+(i+1)}</div><div class="saved-wt-meta">${wt.exercises.length} упражнений</div></div><div class="saved-wt-btns"><button class="saved-wt-start" onclick="loadSavedWt(${i})">▶ Начать</button><button class="saved-wt-del" onclick="deleteSavedWt(${i})">✕</button></div></div>`).join('');
}
function saveWtTemplate(){
  if(!customWt.length){toast('Добавь упражнения сначала');return;}
  const name=(document.getElementById('wt-name-input')?.value||'').trim()||'Тренировка '+new Date().toLocaleDateString('ru');
  savedWts.push({name,exercises:customWt.map(e=>({n:e.n,s:e.s,r:e.r,kg:e.kg}))});
  localStorage.setItem('fs-saved-wts',JSON.stringify(savedWts)); toast('💾 Шаблон сохранён!'); renderSavedWts();
}
function loadSavedWt(idx){
  const wt=savedWts[idx]; if(!wt)return;
  customWt=wt.exercises.map(e=>({...e,sets_data:new Array(e.s).fill(false).map(()=>({r:e.r,kg:e.kg,done:false})),done:false}));
  showWtScreen('execute'); document.getElementById('exe-title').textContent=wt.name||'Тренировка';
}
window.loadSavedWt = loadSavedWt;

function deleteSavedWt(idx){savedWts.splice(idx,1);localStorage.setItem('fs-saved-wts',JSON.stringify(savedWts));renderSavedWts();toast('Шаблон удалён');}
window.deleteSavedWt = deleteSavedWt;

function initBuilder(){
  activeMuscle=null; pickerChecked={}; pickerParams={};
  document.querySelectorAll('.muscle-tile').forEach(t=>t.classList.remove('active-muscle'));
  const picker=document.getElementById('ex-picker'),bar=document.getElementById('bld-start-bar'),ni=document.getElementById('wt-name-input');
  if(picker) picker.style.display='none'; if(bar) bar.style.display='none'; if(ni) ni.value='';
  renderMuscleGrid();
}
function renderMuscleGrid(){
  const grid=document.getElementById('muscle-grid');
  if(!grid)return;
  const muscles=Object.keys(ALL_EXERCISES);
  const icons={chest:'💪',back:'🔙',legs:'🦵',shoulders:'🏋️',biceps:'💪',triceps:'🦾',glutes:'🍑',abs:'🎯',forearms:'✊',cardio:'🏃'};
  const names={chest:'Грудные',back:'Спина',legs:'Ноги',shoulders:'Плечи',biceps:'Бицепс',triceps:'Трицепс',glutes:'Ягодицы',abs:'Пресс',forearms:'Предплечья',cardio:'Кардио'};
  grid.innerHTML=muscles.map(cat=>`<div class="muscle-tile ${activeMuscle===cat?'active-muscle':''}" data-cat="${cat}" onclick="selectMuscle('${cat}')"><div>${icons[cat]||'💪'}</div><div>${names[cat]||cat}</div></div>`).join('');
}
function selectMuscle(cat){
  document.querySelectorAll('.muscle-tile').forEach(t=>t.classList.toggle('active-muscle',t.dataset.cat===cat));
  activeMuscle=cat;
  if(!pickerChecked[cat]) pickerChecked[cat]=new Set();
  renderExPicker(cat);
  setTimeout(()=>{const el=document.getElementById('ex-picker'); if(el)el.scrollIntoView({behavior:'smooth',block:'start'});},80);
}
window.selectMuscle = selectMuscle;

function renderExPicker(cat){
  const picker=document.getElementById('ex-picker'),list=document.getElementById('ex-picker-list'),title=document.getElementById('ex-picker-title');
  if(!picker||!list)return;
  const LABELS={chest:'Грудные',back:'Спина',legs:'Ноги',shoulders:'Плечи',biceps:'Бицепс',triceps:'Трицепс',glutes:'Ягодицы',abs:'Пресс',forearms:'Предплечья',cardio:'Кардио'};
  if(title)title.textContent=(LABELS[cat]||cat)+' — выбери упражнения';
  const exs=ALL_EXERCISES[cat]||[];
  const checked=pickerChecked[cat]||new Set();
  if(!pickerParams[cat])pickerParams[cat]={};
  let html='';
  for(let i=0;i<exs.length;i++){
    const e=exs[i]; const isChk=checked.has(e.n);
    if(!pickerParams[cat][e.n]) pickerParams[cat][e.n]={s:e.s,r:e.r,kg:e.kg};
    const p=pickerParams[cat][e.n];
    const paramsHtml=isChk?`<div class="pick-params" onclick="event.stopPropagation()"><div class="pick-param-group"><div class="pick-param-lbl">Подходы</div><div class="pick-param-ctrl"><button class="pick-param-btn" onclick="adjPickParam('${cat}','${e.n}','s',-1,${i})">−</button><span class="pick-param-val" id="pp-s-${cat}-${i}">${p.s}</span><button class="pick-param-btn" onclick="adjPickParam('${cat}','${e.n}','s',1,${i})">+</button></div></div><div class="pick-param-group"><div class="pick-param-lbl">Повторы</div><div class="pick-param-ctrl"><button class="pick-param-btn" onclick="adjPickParam('${cat}','${e.n}','r',-1,${i})">−</button><span class="pick-param-val" id="pp-r-${cat}-${i}">${p.r}</span><button class="pick-param-btn" onclick="adjPickParam('${cat}','${e.n}','r',1,${i})">+</button></div></div><div class="pick-param-group"><div class="pick-param-lbl">Вес, кг</div><div class="pick-param-ctrl"><button class="pick-param-btn" onclick="adjPickParam('${cat}','${e.n}','kg',-0.5,${i})">−</button><input class="pick-param-input" id="pp-kg-${cat}-${i}" type="number" inputmode="decimal" value="${p.kg}" onfocus="this.select()" onchange="setPickParam('${cat}','${e.n}','kg',parseFloat(this.value)||0,${i})"><button class="pick-param-btn" onclick="adjPickParam('${cat}','${e.n}','kg',0.5,${i})">+</button></div></div></div>`:'';
    html+=`<div class="ex-pick-row ${isChk?'row-checked':''}" data-i="${i}" data-cat="${cat}"><div class="ex-pick-row-top" onclick="togglePickEx(${i}, '${cat}')"><div class="ex-pick-check ${isChk?'checked':''}">${isChk?'✓':''}</div><div class="ex-pick-info"><div class="ex-pick-name">${e.n}</div></div></div>${paramsHtml}</div>`;
  }
  list.innerHTML=html||'<div style="padding:16px;color:var(--text-muted);text-align:center">Нет упражнений</div>';
  picker.style.display='block';
  updateBldStartBar();
}
function togglePickEx(exIdx,cat){
  const e=(ALL_EXERCISES[cat]||[])[exIdx]; if(!e)return;
  if(!pickerChecked[cat])pickerChecked[cat]=new Set();
  const checked=pickerChecked[cat];
  if(checked.has(e.n)) checked.delete(e.n);
  else{checked.add(e.n); if(!pickerParams[cat])pickerParams[cat]={}; if(!pickerParams[cat][e.n])pickerParams[cat][e.n]={s:e.s,r:e.r,kg:e.kg};}
  renderExPicker(cat);
}
window.togglePickEx = togglePickEx;

function adjPickParam(cat,name,field,delta,idx){
  if(!pickerParams[cat]||!pickerParams[cat][name])return;
  const mins={s:1,r:1,kg:0},maxs={s:10,r:100,kg:500};
  const cur=pickerParams[cat][name][field];
  pickerParams[cat][name][field]=Math.max(mins[field],Math.min(maxs[field],cur+delta));
  const el=document.getElementById(`pp-${field}-${cat}-${idx}`);
  if(el){if(el.tagName==='INPUT')el.value=pickerParams[cat][name][field]; else el.textContent=pickerParams[cat][name][field];}
}
window.adjPickParam = adjPickParam;

function setPickParam(cat,name,field,val,idx){
  if(!pickerParams[cat]||!pickerParams[cat][name])return;
  const mins={s:1,r:1,kg:0},maxs={s:10,r:100,kg:500};
  val=Math.max(mins[field],Math.min(maxs[field],val));
  val=Math.round(val*10)/10;
  pickerParams[cat][name][field]=val;
  const el=document.getElementById(`pp-${field}-${cat}-${idx}`);
  if(el&&el.tagName==='INPUT')el.value=val;
}
window.setPickParam = setPickParam;

function selectAllExs(){
  if(!activeMuscle)return;
  const exs=ALL_EXERCISES[activeMuscle]||[];
  if(!pickerChecked[activeMuscle])pickerChecked[activeMuscle]=new Set();
  exs.forEach(e=>pickerChecked[activeMuscle].add(e.n));
  renderExPicker(activeMuscle);
}
window.selectAllExs = selectAllExs;

function clearAllExs(){
  if(!activeMuscle)return;
  pickerChecked[activeMuscle]=new Set();
  renderExPicker(activeMuscle);
}
window.clearAllExs = clearAllExs;

function updateBldStartBar(){
  const bar=document.getElementById('bld-start-bar'),label=document.getElementById('bld-start-label');
  let total=0; for(const s of Object.values(pickerChecked)) total+=s.size;
  if(bar)bar.style.display=total>0?'block':'none';
  if(label)label.textContent='▶ Начать тренировку · '+total+' упр.';
}
function startCustomWorkout(){
  customWt=[];
  for(const [cat,names] of Object.entries(pickerChecked)){
    for(const name of names){
      const e=(ALL_EXERCISES[cat]||[]).find(x=>x.n===name);
      if(e){
        const p=(pickerParams[cat]&&pickerParams[cat][name])||{s:e.s,r:e.r,kg:e.kg};
        customWt.push({...e,s:p.s,r:p.r,kg:p.kg,sets_data:Array.from({length:p.s},()=>({r:p.r,kg:p.kg,done:false})),done:false});
      }
    }
  }
  if(!customWt.length){toast('❗ Выбери хотя бы одно упражнение');return;}
  const rawName=(document.getElementById('wt-name-input')?.value||'').trim();
  const name=rawName||(Object.keys(pickerChecked).map(cat=>({chest:'Грудь',back:'Спина',legs:'Ноги',shoulders:'Плечи',biceps:'Бицепс',triceps:'Трицепс',glutes:'Ягодицы',abs:'Пресс',forearms:'Предплечья',cardio:'Кардио'}[cat]||cat)).join(' + ')||'Тренировка');
  document.getElementById('exe-title').textContent=name;
  showWtScreen('execute');
}
window.startCustomWorkout = startCustomWorkout;

// ==================== ВЫПОЛНЕНИЕ ТРЕНИРОВКИ ====================
function toggleEditMode(){editMode=!editMode; renderExecute();}
window.toggleEditMode = toggleEditMode;

function renderExecute(){
  updateExeProgress();
  const el=document.getElementById('exe-list'),buttonsDiv=document.getElementById('execute-buttons');
  if(!el)return;
  let html='';
  for(let i=0;i<customWt.length;i++){
    const e=customWt[i];
    if(!e.sets_data)e.sets_data=Array.from({length:e.s},(_,idx)=>({r:e.r,kg:e.kg,done:false}));
    const setsHtml=e.sets_data.map((set,si)=>`<div class="exe-set-row ${set.done?'done-set':''}"><div class="set-chip" onclick="toggleSet(${i},${si})"><div class="chk">✓</div>Подход ${si+1}</div><div class="set-controls"><div class="set-ctrl"><button onclick="updateSetVal(${i},${si},'kg',-0.5)">-</button><input class="set-kg-input" id="set-kg-${i}-${si}" type="number" inputmode="decimal" value="${set.kg}" onfocus="this.select()" onchange="setSetVal(${i},${si},'kg',parseFloat(this.value)||0)"> кг<button onclick="updateSetVal(${i},${si},'kg',0.5)">+</button></div><div class="set-ctrl"><button onclick="updateSetVal(${i},${si},'r',-1)">-</button><span id="set-r-${i}-${si}">${set.r} повт</span><button onclick="updateSetVal(${i},${si},'r',1)">+</button></div></div></div>`).join('');
    const editControls=editMode?`<div style="display:flex; gap:8px; margin-top:8px; justify-content:flex-end; border-top:1px solid var(--border); padding-top:8px;"><button onclick="editExercise(${i})" style="background:var(--input-bg); border:1px solid var(--border); border-radius:8px; padding:5px 10px; font-size:12px;">⚙️ Параметры</button><button onclick="deleteExercise(${i})" style="background:#fdeaea; border:1px solid #e74c3c; border-radius:8px; padding:5px 10px; font-size:12px; color:#e74c3c;">✕ Удалить</button></div>`:'';
    html+=`<div class="exe-ex-row ${e.done?'done-row':''}" id="exe-row-${i}"><div class="exe-ex-inner"><div class="exe-ex-left"><div class="exe-ex-name">${e.n}</div><div class="exe-ex-detail" style="color:var(--text-muted); font-size:12px; margin-top:4px;">${e.s} подходов</div></div><div class="exe-check ${e.done?'checked':''}" onclick="toggleExDone(${i})">${e.done?'✓':''}</div></div><div class="exe-sets-container" id="exe-sets-${i}">${setsHtml}</div>${editControls}</div>`;
  }
  el.innerHTML=html||'<div style="text-align:center; padding:32px; color:var(--text-muted)">Нет упражнений. Нажмите «+ Добавить»</div>';
  if(editMode){
    buttonsDiv.innerHTML=`<button onclick="openAddExerciseSheet()" style="width:100%; padding:12px; border-radius:14px; background:var(--accent); color:#fff; font-weight:800; border:none; margin-bottom:8px;">➕ Добавить упражнение</button><button onclick="toggleEditMode()" style="width:100%; padding:12px; border-radius:14px; background:var(--input-bg); color:var(--text); border:1px solid var(--border);">✅ Готово</button>`;
  } else {
    buttonsDiv.innerHTML = `
      <div style="display: flex; gap: 12px; margin-top: 8px;">
        <button onclick="cancelWorkout()" style="flex:1; padding:14px; border-radius:14px; background: #fdeaea; color: #e74c3c; font-weight:800; font-size:16px; border: 1px solid #e74c3c; cursor:pointer;">✖ Отменить</button>
        <button onclick="finishCustomWorkout()" style="flex:1; padding:14px; border-radius:14px; background: linear-gradient(135deg, var(--accent), #a78bfa); color:#fff; font-weight:800; font-size:16px; border:none; cursor:pointer;">✅ Завершить</button>
      </div>
    `;
  }
}
window.renderExecute = renderExecute;

function updateSetVal(exIdx,setIdx,field,delta){
  let val=customWt[exIdx].sets_data[setIdx][field]+delta;
  if(val<0)val=0; val=Math.round(val*10)/10;
  customWt[exIdx].sets_data[setIdx][field]=val;
  const unit=field==='kg'?' кг':' повт';
  const el=document.getElementById(`set-${field}-${exIdx}-${setIdx}`);
  if(el){if(el.tagName==='INPUT')el.value=val; else el.textContent=val+unit;}
}
window.updateSetVal = updateSetVal;

function setSetVal(exIdx,setIdx,field,val){
  if(val<0)val=0; val=Math.round(val*10)/10;
  customWt[exIdx].sets_data[setIdx][field]=val;
}
window.setSetVal = setSetVal;

function toggleSet(exIdx,setIdx){
  customWt[exIdx].sets_data[setIdx].done=!customWt[exIdx].sets_data[setIdx].done;
  const allDone=customWt[exIdx].sets_data.every(s=>s.done);
  customWt[exIdx].done=allDone;
  renderExecute();
}
window.toggleSet = toggleSet;

function toggleExDone(idx){
  const willBeDone=!customWt[idx].done;
  customWt[idx].done=willBeDone;
  if(customWt[idx].sets_data)customWt[idx].sets_data.forEach(s=>s.done=willBeDone);
  renderExecute();
}
window.toggleExDone = toggleExDone;

function updateExeProgress(){
  const done=customWt.filter(e=>e.done).length;
  const total=customWt.length;
  const pct=total?Math.round(done/total*100):0;
  const bar=document.getElementById('exe-progress-bar'),txt=document.getElementById('exe-progress-text');
  if(bar)bar.style.width=pct+'%';
  if(txt)txt.textContent=`Выполнено: ${done} из ${total}`;
}
function confirmBackFromWorkout(){
  const done=customWt.filter(e=>e.done).length;
  if(done>0&&!confirm('Вернуться назад? Прогресс текущей тренировки не сохранится.'))return;
  showWtScreen('builder');
}
window.confirmBackFromWorkout = confirmBackFromWorkout;

function finishCustomWorkout(){
  const done=customWt.filter(e=>e.done||(e.sets_data&&e.sets_data.some(s=>s.done)));
  const name=document.getElementById('exe-title')?.textContent||'Тренировка';
  if(!done.length){if(!confirm('Ни один подход не отмечен. Всё равно сохранить?'))return;}
  const toLog=done.length?done:customWt;
  const kcal=toLog.reduce((s,e)=>s+(e.k||0),0);
  const today=new Date().toLocaleString('ru');
  diary.unshift({date:today,type:name,exercises:toLog.map(e=>{if(!e.sets_data)return `${e.n}: ${e.s}×${e.r}${e.kg>0?' @ '+e.kg+'кг':''}`; const completedSets=e.sets_data.filter(s=>s.done); const setsToLog=completedSets.length?completedSets:e.sets_data; const groups=[]; let current=null; for(const s of setsToLog){if(!current||current.r!==s.r||current.kg!==s.kg){if(current)groups.push(current); current={count:1,r:s.r,kg:s.kg};}else{current.count++;}} if(current)groups.push(current); const setsStr=groups.map(g=>`${g.count}×${g.r}${g.kg>0?' @ '+g.kg+'кг':''}`).join(', '); return `${e.n}: ${setsStr}`;}).join('\n'),kcal});
  localStorage.setItem('fs-diary',JSON.stringify(diary));
  const dateStr=new Date().toLocaleDateString('ru');
  toLog.forEach(e=>{if(!exlog[e.n])exlog[e.n]=[]; let maxKg=0,maxKgReps=0,totalSets=0; if(e.sets_data){const activeSets=e.sets_data.filter(s=>s.done).length?e.sets_data.filter(s=>s.done):e.sets_data; totalSets=activeSets.length; activeSets.forEach(s=>{if(s.kg>maxKg){maxKg=s.kg;maxKgReps=s.r;}});}else{maxKg=e.kg;maxKgReps=e.r;totalSets=e.s;} exlog[e.n].push({date:dateStr,kg:maxKg,s:totalSets,r:maxKgReps});});
  localStorage.setItem('fs-exlog',JSON.stringify(exlog));
  toast('✅ Тренировка сохранена!');
  customWt=[];
  clearWorkoutFlowState();
  showWtScreen('home');
  updateCtaLabel();
  renderHome();
}
window.finishCustomWorkout = finishCustomWorkout;

function cancelWorkout() {
  if (confirm('❌ Отменить тренировку? Весь прогресс будет потерян.')) {
    customWt = [];
    clearWorkoutFlowState();
    showWtScreen('home');
    updateCtaLabel();
    toast('Тренировка отменена');
  }
}
window.cancelWorkout = cancelWorkout;

function deleteExercise(idx){
  if(confirm('Удалить упражнение "'+customWt[idx].n+'"?')){customWt.splice(idx,1); renderExecute();}
}
window.deleteExercise = deleteExercise;

let currentEditingIdx=null;
function editExercise(idx){
  const ex=customWt[idx]; currentEditingIdx=idx;
  document.getElementById('edit-ex-name').value=ex.n;
  document.getElementById('edit-ex-sets').value=ex.s;
  document.getElementById('edit-ex-reps').value=ex.r;
  document.getElementById('edit-ex-kg').value=ex.kg;
  document.getElementById('edit-ex-sheet').classList.add('show');
  document.getElementById('sheet-overlay').classList.add('show');
}
window.editExercise = editExercise;

function saveExerciseParams(){
  if(currentEditingIdx===null)return;
  const ex=customWt[currentEditingIdx];
  const newName=document.getElementById('edit-ex-name').value.trim()||ex.n;
  const newSets=parseInt(document.getElementById('edit-ex-sets').value)||1;
  const newReps=parseInt(document.getElementById('edit-ex-reps').value)||1;
  const newKg=parseFloat(document.getElementById('edit-ex-kg').value)||0;
  ex.n=newName; ex.s=newSets; ex.r=newReps; ex.kg=newKg;
  const oldSets=ex.sets_data.length;
  if(newSets>oldSets){for(let i=oldSets;i<newSets;i++)ex.sets_data.push({r:newReps,kg:newKg,done:false});}
  else if(newSets<oldSets)ex.sets_data=ex.sets_data.slice(0,newSets);
  else ex.sets_data.forEach(set=>{set.r=newReps;set.kg=newKg;});
  ex.done=false;
  closeAllSheets(); renderExecute();
}
window.saveExerciseParams = saveExerciseParams;

let selectedAddCat=null, selectedAddEx=null, addExParams={s:3,r:12,kg:0};
function openAddExerciseSheet(){
  selectedAddCat=null; selectedAddEx=null; addExParams={s:3,r:12,kg:0};
  renderAddMuscleGrid(); document.getElementById('add-ex-sheet').classList.add('show'); document.getElementById('sheet-overlay').classList.add('show');
}
window.openAddExerciseSheet = openAddExerciseSheet;

function renderAddMuscleGrid(){
  const grid=document.getElementById('add-muscle-grid'); if(!grid)return;
  const muscles=Object.keys(ALL_EXERCISES);
  const icons={chest:'💪',back:'🔙',legs:'🦵',shoulders:'🏋️',biceps:'💪',triceps:'🦾',glutes:'🍑',abs:'🎯',forearms:'✊',cardio:'🏃'};
  const names={chest:'Грудные',back:'Спина',legs:'Ноги',shoulders:'Плечи',biceps:'Бицепс',triceps:'Трицепс',glutes:'Ягодицы',abs:'Пресс',forearms:'Предплечья',cardio:'Кардио'};
  grid.innerHTML=muscles.map(cat=>`<div class="muscle-tile ${selectedAddCat===cat?'active-muscle':''}" onclick="selectAddMuscle('${cat}')"><div>${icons[cat]||'💪'}</div><div>${names[cat]||cat}</div></div>`).join('');
}
function selectAddMuscle(cat){
  selectedAddCat=cat; renderAddMuscleGrid(); renderAddExList(cat);
}
window.selectAddMuscle = selectAddMuscle;

function renderAddExList(cat){
  const container=document.getElementById('add-ex-list'); const exs=ALL_EXERCISES[cat]||[];
  if(!exs.length){container.innerHTML='<div style="padding:16px; text-align:center; color:var(--text-muted)">Нет упражнений</div>'; document.getElementById('add-ex-params').style.display='none'; document.getElementById('confirm-add-ex-btn').style.display='none'; return;}
  let html='<div style="display:flex; flex-direction:column; gap:4px;">';
  exs.forEach((ex,idx)=>{html+=`<div class="ex-pick-row" data-idx="${idx}" onclick="selectAddExercise(${idx})" style="cursor:pointer; background:${selectedAddEx===ex?'var(--accent)':'transparent'}; color:${selectedAddEx===ex?'#fff':'var(--text)'}; border-radius:8px; padding:8px 12px;"><div class="ex-pick-name">${ex.n}</div></div>`;});
  html+='</div>'; container.innerHTML=html;
  if(selectedAddEx)showAddExerciseParams(selectedAddEx); else{document.getElementById('add-ex-params').style.display='none'; document.getElementById('confirm-add-ex-btn').style.display='none';}
}
function selectAddExercise(idx){
  selectedAddEx=ALL_EXERCISES[selectedAddCat][idx];
  renderAddExList(selectedAddCat); showAddExerciseParams(selectedAddEx);
}
window.selectAddExercise = selectAddExercise;

function showAddExerciseParams(ex){
  const paramsDiv=document.getElementById('add-ex-params'); paramsDiv.style.display='block';
  paramsDiv.innerHTML=`<div style="margin-bottom:12px; font-weight:700;">Параметры для "${ex.n}"</div><div class="sheet-fields-row"><div class="sheet-field"><label>Подходы</label><input id="add-sets" type="number" min="1" value="${addExParams.s}"></div><div class="sheet-field"><label>Повторы</label><input id="add-reps" type="number" min="1" value="${addExParams.r}"></div><div class="sheet-field"><label>Вес (кг)</label><input id="add-kg" type="number" step="0.5" value="${addExParams.kg}"></div></div>`;
  document.getElementById('confirm-add-ex-btn').style.display='block';
}
function confirmAddExercise(){
  if(!selectedAddEx)return;
  const sets=parseInt(document.getElementById('add-sets').value)||1;
  const reps=parseInt(document.getElementById('add-reps').value)||1;
  const kg=parseFloat(document.getElementById('add-kg').value)||0;
  const newEx={...selectedAddEx,s:sets,r:reps,kg:kg,sets_data:Array.from({length:sets},()=>({r:reps,kg:kg,done:false})),done:false};
  customWt.push(newEx);
  closeAllSheets(); renderExecute();
}
window.confirmAddExercise = confirmAddExercise;