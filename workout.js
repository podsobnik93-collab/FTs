// workout.js — Тренировки: база упражнений, конструктор, выполнение, программы
// FIX: добавлен уникальный id каждой тренировке при сохранении
// FIX: исправлен поиск упражнений (filterAddExSearch, selectAddExercise, showAddExerciseParams, confirmAddExercise)

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

// FIX: добавлен beforeunload для активной тренировки
window.addEventListener('beforeunload', (e) => {
  if (currentWtScreen === 'execute' && customWt.length > 0 && customWt.some(ex => !ex.done)) {
    e.preventDefault();
    e.returnValue = 'У вас есть незавершённая тренировка. Точно хотите покинуть страницу?';
    return e.returnValue;
  }
});

// ==================== ПРОГРАММЫ ТРЕНИРОВОК ====================
const PROGRAMS = [{"id":"womens","name":"Женская тренировка","level":"Средний","days_week":"4 дня/нед","goal":"Форма и тонус","desc":"Акцент на ягодицы, ноги и пресс. Подходит для девушек любого уровня.","schedule":[{"label":"Пн","name":"Ягодицы + Ноги","rest":false,"exs":["Румынская тяга","Приседания со штангой","Отведение ноги в кроссовере","Выпады с гантелями","Сгибание ног лёжа","Планка"]},{"label":"Вт","name":"Отдых","rest":true,"exs":[]},{"label":"Ср","name":"Спина + Плечи","rest":false,"exs":["Тяга верхнего блока широким прямым хватом к груди","Тяга горизонтального блока к поясу","Жим гантелей сидя или стоя","Разведение рук с гантелями в стороны","Тяга штанги в наклоне к поясу"]},{"label":"Чт","name":"Отдых","rest":true,"exs":[]},{"label":"Пт","name":"Ягодицы + Пресс","rest":false,"exs":["Ягодичный мостик со штангой","Мёртвая тяга на прямых ногах","Гиперэкстензия","Скручивания лёжа на наклонной скамье","Боковая планка","Подъём ног в висе"]},{"label":"Сб","name":"Грудь + Руки","rest":false,"exs":["Жим гантелей лёжа","Разводка гантелей лёжа","Сгибание рук в кроссовере","Жим лёжа узким хватом","Отжимания на брусьях"]},{"label":"Вс","name":"Отдых","rest":true,"exs":[]}]},{"id":"split_back_bi","name":"Сплит: Спина + Бицепс + Пресс","level":"Средний","days_week":"1 день/нед","goal":"Масса и сила","desc":"Классический сплит-день на спину и бицепс с проработкой пресса в конце.","schedule":[{"label":"Пн","name":"Спина + Бицепс + Пресс","rest":false,"exs":["Подтягивания широким прямым хватом к груди","Тяга штанги в наклоне к поясу","Тяга горизонтального блока к поясу","Тяга гантели в наклоне одной рукой","Сгибание рук со штангой стоя","Сгибание рук с гантелями поочерёдно стоя","Планка","Скручивания лёжа на наклонной скамье"]},{"label":"Вт","name":"Отдых","rest":true,"exs":[]},{"label":"Ср","name":"Отдых","rest":true,"exs":[]},{"label":"Чт","name":"Отдых","rest":true,"exs":[]},{"label":"Пт","name":"Отдых","rest":true,"exs":[]},{"label":"Сб","name":"Отдых","rest":true,"exs":[]},{"label":"Вс","name":"Отдых","rest":true,"exs":[]}]}];

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

function deleteSavedWt(idx){if(!confirm('Удалить сохранённую тренировку?'))return;savedWts.splice(idx,1);localStorage.setItem('fs-saved-wts',JSON.stringify(savedWts));renderSavedWts();toast('Шаблон удалён');}
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
  const icons={chest:'<img src="data:image/jpeg;base64,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" width="36" height="36" style="object-fit:contain;display:block" alt="chest">',back:'<img src="data:image/jpeg;base64,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" width="36" height="36" style="object-fit:contain;display:block" alt="back">',legs:'<img src="data:image/jpeg;base64,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" width="36" height="36" style="object-fit:contain;display:block" alt="legs">',shoulders:'<img src="data:image/jpeg;base64,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" width="36" height="36" style="object-fit:contain;display:block" alt="shoulders">',biceps:'<img src="data:image/jpeg;base64,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" width="36" height="36" style="object-fit:contain;display:block" alt="biceps">',triceps:'<img src="data:image/jpeg;base64,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" width="36" height="36" style="object-fit:contain;display:block" alt="triceps">',glutes:'<img src="data:image/jpeg;base64,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" width="36" height="36" style="object-fit:contain;display:block" alt="glutes">',abs:'<svg width="36" height="36" viewBox="0 0 36 36" fill="none"><rect x="10" y="5" width="5" height="6" rx="2" fill="#f5a623"/><rect x="21" y="5" width="5" height="6" rx="2" fill="#f5a623"/><rect x="10" y="14" width="5" height="6" rx="2" fill="#f5a623"/><rect x="21" y="14" width="5" height="6" rx="2" fill="#f5a623"/><rect x="10" y="23" width="5" height="6" rx="2" fill="#f5a623"/><rect x="21" y="23" width="5" height="6" rx="2" fill="#f5a623"/></svg>',forearms:'<svg width="36" height="36" viewBox="0 0 36 36" fill="none"><path d="M15 7 Q11 13 12 21 Q13 28 18 30 Q23 28 24 21 Q25 13 21 7 Q19 5 18 5 Q17 5 15 7Z" fill="#f5a623"/></svg>',cardio:'<svg width="36" height="36" viewBox="0 0 36 36" fill="none"><path d="M18 29 L7 18 Q4 12 10 9 Q14 7 18 14 Q22 7 26 9 Q32 12 29 18 Z" fill="#f5a623"/></svg>'};
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

// FIX: добавлен уникальный id каждой тренировке
function generateWorkoutId() {
  return Date.now() + '_' + Math.random().toString(36).slice(2);
}

function finishCustomWorkout(){
  const done=customWt.filter(e=>e.done||(e.sets_data&&e.sets_data.some(s=>s.done)));
  const name=document.getElementById('exe-title')?.textContent||'Тренировка';
  if(!done.length){if(!confirm('Ни один подход не отмечен. Всё равно сохранить?'))return;}
  const toLog=done.length?done:customWt;
  const kcal=toLog.reduce((s,e)=>s+(e.k||0),0);
  const today=new Date().toLocaleString('ru');
  const newId = generateWorkoutId();
  diary.unshift({
    id: newId,
    date: today,
    type: name,
    exercises: toLog.map(e=>{if(!e.sets_data)return `${e.n}: ${e.s}×${e.r}${e.kg>0?' - '+e.kg+'кг':''}`; const completedSets=e.sets_data.filter(s=>s.done); const setsToLog=completedSets.length?completedSets:e.sets_data; const groups=[]; let current=null; for(const s of setsToLog){if(!current||current.r!==s.r||current.kg!==s.kg){if(current)groups.push(current); current={count:1,r:s.r,kg:s.kg};}else{current.count++;}} if(current)groups.push(current); const setsStr=groups.map(g=>`${g.count}×${g.r}${g.kg>0?' - '+g.kg+'кг':''}`).join(', '); return `${e.n}: ${setsStr}`;}).join('\n'),
    kcal});
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
  renderCalendar(); // обновляем календарь
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
// FIX: добавлена глобальная переменная для хранения результатов поиска
let searchResults = [];

function openAddExerciseSheet(){
  selectedAddCat=null; selectedAddEx=null; addExParams={s:3,r:12,kg:0};
  const srch=document.getElementById('add-ex-search'); if(srch) srch.value='';
  const mg=document.getElementById('add-muscle-grid'); if(mg) mg.style.display='';
  const al=document.getElementById('add-ex-list'); if(al) al.innerHTML='';
  const ap=document.getElementById('add-ex-params'); if(ap) ap.style.display='none';
  const cb=document.getElementById('confirm-add-ex-btn'); if(cb) cb.style.display='none';
  renderAddMuscleGrid();
  document.getElementById('add-ex-sheet').classList.add('show');
  document.getElementById('sheet-overlay').classList.add('show');
}
window.openAddExerciseSheet = openAddExerciseSheet;

function renderAddMuscleGrid(){
  const grid=document.getElementById('add-muscle-grid'); if(!grid)return;
  const muscles=Object.keys(ALL_EXERCISES);
  const icons={chest:'<img src="data:image/jpeg;base64,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" width="36" height="36" style="object-fit:contain;display:block" alt="chest">',back:'<img src="data:image/jpeg;base64,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" width="36" height="36" style="object-fit:contain;display:block" alt="back">',legs:'<img src="data:image/jpeg;base64,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" width="36" height="36" style="object-fit:contain;display:block" alt="legs">',shoulders:'<img src="data:image/jpeg;base64,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" width="36" height="36" style="object-fit:contain;display:block" alt="shoulders">',biceps:'<img src="data:image/jpeg;base64,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" width="36" height="36" style="object-fit:contain;display:block" alt="biceps">',triceps:'<img src="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/4gHYSUNDX1BST0ZJTEUAAQEAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADb/2wBDAAEBAQEBAQEBAQEBAQEBAQIBAQEBAQIBAQECAgICAgICAgIDAwQDAwMDAwICAwQDAwQEBAQEAgMFBQQEBQQEBAT/2wBDAQEBAQEBAQIBAQIEAwIDBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAT/wAARCABkAGQDASIAAhEBAxEB/8QAHgABAAIDAQEBAQEAAAAAAAAAAAcIBgkKBQECAwT/xAA9EAACAQMDAgQDBAcGBwAAAAABAgMABAUGBxESIQgTFDEiQXEjUWGBCRYyQlKRoRUkJTNygjQ3YnWSs8H/xAAcAQACAwEBAQEAAAAAAAAAAAAACAYHCQQFAwL/xAA3EQACAQMCBQIDBQYHAAAAAAABAgMEBREABgcSITFBCCITQlEyUnGBkQkUYWKxshUzU3KCodH/2gAMAwEAAhEDEQA/AO/ilKUaNKUrxNR6kwekcLf6h1HkrbE4fGxebd3t0xCJyQqIqjlnd2ZUSNAWdmVVBJAr4VVVTUVNJWVsixwxqWZ2IVVVRlmZjgBQASSSAB1OvrBBNUzJT06F5GICqoJJJOAAB1JJ6ADqTr26VrM3W8UmqNWT3GK0RLeaU04CY/VxOIdRZMfxPMpPkKfkkR6vflyD0ivdhrjWmLm9RjdXamsZixcyWmduoGYnuS3Djnn58+9KRub1ibJtF5a3WShlradDhplZY1JH+mrKWdf5m5M+MjBLA2T067muNtFZc6qOmlYZEZUuQP5yCAp/gObHnByNbt6Vqj054n93cAyLPm7XUVsh/wCG1BYJckj5/bx+XMfzc1frZjd2x3c0/dZCOxOKzGIuEtMzjBN6iKIyKWimifgExyBX4DDlTGw78BjZnDb1B7A4m3FbJamlgr2UsIpkALBRluRkZ0bAycEhioJ5cA4hO8+Ee7Nk0ZudeElpAQDJGxIUscLzKwVhk9M4IzgZyRmYqUpV5aq/SlKUaNKUpRo0pSlGjX8Lq6tbG1ub29uILOzs4Huru7upVgtrWKNS8kkjsQqqqgsWJAABJrTnvPvle7463nGNlmg240fcPBpixIaIZi5bqjbJ3CHuXZeoRqw5ijkAADNIWnPx173yYuyg2a03edF7lbdMlre4t5B5lvasQ1rjyQeQZuBNIOx8tYh8SysKpHpzH/2biLWFl6ZpV9TcA9j1vweD+IHSv+2szfVhxvqNx7sfg/teYigoyHr3U/5s4wUp8j5ITh5B80q8pA+F7nP4CcM4rXZ13/e481M4IplI+xGejS4PzSDIQ+IzkE8/T3lVnZURWd3YKiKOpmJ7AAfMmpO1ftBrbQmmcJqjU9jDjrTO3XpLexaVnydoxjaVBcoF6YyyqxCFi46WBVSCKmTwkaDstSayyeqcnbpc2ujreGSwhlXqiN9ctIIZSD2PlJDMw+52jbsQK2Faq0pgNa4S709qXHx5LF3gBkhdmjkidTykkcikMjqe4ZSD7j2JB/PCT01txD4dVe7aypMdTMHWiXtHmNuVpJSAWKs6tGAo9oBch8hR1cQONI2hvCn2/Tw88MRU1J7vh1yEjyQAQpDknuSF9vUnSDV6fBVDfC53BuBG4xrwY6F5iCI3nRrtlVT7EqrsTx7da8+45lOfwhbUSzPJHcastUaSNxbw5iFoYwg4dAXgZuJPduWJBHwlR2qedG6J0zoHDjA6VxqYzG+pe8kj86S5mnlk4DSSSuS7NwqKCT2VFA7AVY3BL01762TxEpN2bllhSnpRIQI5C7SM8bxAAcgAXDlmJIOMKF6nlhvE3jRtbc2z6iwWWOVpp+QEugVUCurkn3HLZXAABHc56DOV0pSnu0rGlKUo0aUpSjRpWJ661hitv9H6j1nmn6cdpzFS5KaMOI3umUcQ26E9uuaQxxJz+9ItZZWtv9IJuQ9pjNKbV2E7JJlm/W3USISjNbwu8FhEeDwyPMtzIykdmtIiKqrjbxGh4U8MLtvVsGeGPlgU/NPIRHCMeQHYM4+4rHxqb8OdpSb33nQ7dGfhyPmQjxEnukOfBKghT94ga15XWYy+5GvspqfPy+qyObykudyrjkxLy/UIkBPaNfs4kX91AoHtUo1gWhLHyrO5yDj4rqXyYiR36I/cj6sSP9lZ7WJO2Y6mSjku1wcvU1LtLI7HLMWJOWJ7liSxPksdaX1whidKKlULFEoRVHQAAAYA8ADAH4a2K+DC3K6P1fd9PAm1LHbh+OzeVaxtxz+Hnf1q5dV68N2AXR2zuKvMo8Vgcy8+rL6W6cW8NvFMFEMjuxACm3ggck8ABvwr1sn4jtmMVdSWc2tba6mikCO2Lxt7lbT/AFLcRQtE4H3o7fnWzPCy52Dh9wj29R7tr4KNmp1cCeWOLJlJlwOdlyQH6gdQc51nTvuiuu7uIN3qNv0ktQBKVPwkaTogEeTyg4B5eh86m+lRzpLdvbfXM/pNL6txmQvixWPHzCXF5KfpUsxitrhI5XAAJLIpA+ZqRquC1Xm0X2kFwslVHUQE4DxOsiEjuAyErkfjqu6+3XC11BpLnA8Mo7rIrIw/4sAf+tKUr5yCSAQSPcc9xXpa49faUpRo0pSlGjStBPic1g2tt8twcoGDWmPzTaax4STzYfJxgFiHQ/wyvDJN27czGt+1c6W62idRbfbgan0xqeCRMlaZSWdboqfIysE0jSQ3cLH9qOVSGB9wSVbhlYDPP9ofWXqPYdht9NExoHqpHmcD2rJHFiFGPjnEkxUHoeQ+QNNd6UKe3tua6VUzgVSwKsanuUZ8yMB/KUjBPjmH11nGDgFth8bCBxxZo7AfxOOtv6sa8XUGq48Vzb2DxTZINzyyLPBaEfN1IKsf+ggj7xx2McyaizMltHaG+lSCOIQqsQWJyqjpALgBj2HzPevErNCt3mVoUorShQhQvMcAjAA9oBPX6HPTwM9nOhtGZjNVEEEk4Hn8c/01ba73c3N3D03i7XW2q7rLWURMttjYLCzwmNiVSFi6re1iijcqEBUyKxTqIUgE84zWOaVu4rvCWYQjrtU9NMnPdCvtz9RwfzrI6tQXq67gp4LneayWqnaNAZZpHlkbCgdXdmY47YJ6dhjUWittBauejttOkEQZiEjRUUZPXCqAOv1x176/SO8bpJGzJJGwdHRirowPIII7ggjnmrobPeKubBWz4PdK5vMljLa0Z8dqdY2vMtAY0JWC8HvMH4CrOfjViPMLKxkipbX4ljSaOSGQdUcqGN1PswYEEfyNTTY3EPdvDi7f41tOp5JOzI2TFKOuFlTIDDr0PRl7qynrqPbp2fYN52822/Q8y/KwwJEP1RsHB+o6qezAjVld0fEtrTXU89hgbi50jpkOyRWmPuDDlsgnsGu7lTz3HPMUZCfFwTJwGqvlnlMnj7xcjYZG/scgr+Yt9Z3clteK3PPUJVIbnnvzzUc4HMy215Lp7KOfUW8phsrl+3nqP2VY/eRwVPzB49+Oc3rxbtxE3JxBuB3Hfa6SWqDHPM2PhMD1RFGFjCnsECjz5zrvte07JtahFotNKkcGPAzzj6sxyXJ8liT41dbZ3xU5KwubbT+51w+SxcrCG21T5fORx3yHq1UfbR+3MgHmDuT5nPbYJbXNveW8F3aTw3VrcwrcW1zbyCaC4jcBkdHBIZWBBBHYg1olrcDsH/ye0F/2Y/8Avlp9fShxY3Zuyqq9lblmNQlPD8WKZyTKAHRDGzHq494Ksx5lwQSwKhVW497BsFggp9y2WMQtNJ8N41AEZJVmDqOyH24IHtOQcA5LS/SlKdjSz6VWzxK+HvH766Pmhx01hhNw8NbtJpDUt5btLbBues2N8E+NrWY8gsvLQs3mIrcPHLZOlR/dO1rBvSw1O2dz0q1FFOvK8bjIPXII+jKwDKw6qwBBBGvZ2/f7rte809+skpjqYWDKe46dwwPRlYdGUghlJBBB1ylavzO4O3GqcvozXml4sLqPA3Rs8ni7mOS3njbgMjo4dkkjkUq8csfUkiOrKzKwJ+Y3cnE3TLHf28+Ndjx5nPqrYfVgAw/8ePxroR8T3hU0P4lNORxZLowGu8NbNHpbW1rbCW7tASX9HeICDPaMxLeWSGjZmaNlLOH5zd3dm9wNj9X3mjNwsJLi8jCTLYX0XM+Gz9vzwl3YXPAWWJvyZG5SRUdWQZjcWfSxt/aFUx/cz+4ucRVERZSM9kkXJRZB/FeVwMr8yrrpwR4pcOON9oFG8S0d+jXM1OrEZx3lg5iQ8Z7lSC8RPK+Ryu854XOzWbJf4q6imhlXuUcTWtyvPseDwfn3Hcd+4qUMdrbG3QVL1XsJiOCzcy2zH8GHcfmOB99a/sbmcpiJPMx17Nbcnlo1bqhk/wBUZ5U/mKkCw3Pu4wqZLHQ3HHYzWsht3+pU9QJ+hApY6nhnvbbMjHbcqVVNnIRiFb9GIX81fr93xqe3vhfWlzJR4lHgghX/ADB9p/X8hq9sF3a3S9VtcQXC8c8wyrKB/I1/oql8O5eBIDNHkrdx8jApI+hVzXt2u6GJchVzuRtCfYSeojX+a8gfnXCZd4U6k1ljn6dygLD9Ap/qdQafh/f4skQSY/2E/wBM6m3Xdt5M2PycP2c3UYXdex5Th4z9R8Xf8BUgWk3qbS1uOw9RbpN29vjUN/8AarymafMQJIuVkyVuG5RvWm7iVuPqQD3+vepm0jkEvsPDESPOsQLWVfmFH+WfoV7fVTUd2/dI6jcVWhjMRkAPI3Q8ydD0+vUk/nrxLlRTUtIkcw9yEg9CCAfqD+msorcFsGCNntBAjj/Bef5zSkVp9rcvs7ZPj9q9v7Z1Kv8AqnZXDqw4ZTNCsxBH3jzK0H9F0Ltve7VAHtWkCn8WmjI/tOlT9SkqjbFvhPcz5/IRuD/cNSTSlK0e0mulKUo0aVgG5G1ugN3dNz6T3F0xjtT4SZxNHBeo0d1YSgcCe0uUKzQSgEjzIXVirMpJViDn9K56ukpa+mejrolkhcYZXAZWB7gqQQR/AjXXQV9da6yK42yZ4aiMhkkjYo6MOzKykMpHggg60i7yfotNT42W7y2yGrLXUmOAaaPSWspkxWoIuOgLFb5BFFtOSS55mW2ChQOpz3qgWr/DR4gNCTXkeptoNfWkOPbpusnZadnzmCj78cjIWqy2zA/IrIQfvrq3pVDX/wBOuz7nM1RZ5pKRj8oxJGO/UK/vHXx8TGOgA8N/sv1ucVNu0yUO4oYLlGuBzyAxTYGOhkjwjdPLRFyerMTnPHxb6R1Xd3Po7TTGobq7B6Ta2+FuZrkE+w6Ahb+lT9oHwaeJTcO+htcZtTqbBWr9DzZjW9i+jMXbxOQBN1XYSSVQCGK26Svx3CmuomlR63emS2RShrrdnlTPaOJYjj6ZZ5f1x/6JnefX1uyppjHYLBTwSkfalmknAP1CqsH5ZJHbOex09aV/RbZbB4YZG63kiXWPpDJJisdphpNLSShSRbPcPOszxseB5/lIy89XlHjpNMbO7yOmMvPFNBJBdWVw9jkrCcGNw0blJInHyZWUj8CPqK6U6pHuV4ItHbibhZfXA1XlNOW2fuFv8vg8bi4ZvNumH94niuHf4DMw8xg0b/G7nnhgq0z6k/STVbgitN+4MUQFyhcxzq03KZIyAUlLTPy5iZSCq4LLJ0UhMahuwPU7dbrdK48X674sTqDE6wKOQgnMXLBGCQwIKls8vJ9oc2qNbaYG43P1Fg8BgOuWTK3aRXTqvU2MhBDXE0w/dESdTHn34AHPI53c2lrBY2lrZWyCO2s7dLW3jHtGkahEX8gAKibaXYrbvZeyubfRmLn9fkEWPJ6gy1wL/OZFVYsqPKFVEQEj7OFEQlQSpYc1MNX36cODVz4T7Zml3PJG94qyhm+ES0caoG5I1ZgCTlmZyABzEKOYIGaleMXEek39eYks6MtBThhHzgB3ZsczkAkAe0BRknAycFioUpSmN1T2lKUo0aUpSjRpSlKNGlKUo0aUpSjRpSlKNGlKUo0a/9k=" width="36" height="36" style="object-fit:contain;display:block" alt="triceps">',glutes:'<img src="data:image/jpeg;base64,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" width="36" height="36" style="object-fit:contain;display:block" alt="glutes">',abs:'<svg width="36" height="36" viewBox="0 0 36 36" fill="none"><rect x="10" y="5" width="5" height="6" rx="2" fill="#f5a623"/><rect x="21" y="5" width="5" height="6" rx="2" fill="#f5a623"/><rect x="10" y="14" width="5" height="6" rx="2" fill="#f5a623"/><rect x="21" y="14" width="5" height="6" rx="2" fill="#f5a623"/><rect x="10" y="23" width="5" height="6" rx="2" fill="#f5a623"/><rect x="21" y="23" width="5" height="6" rx="2" fill="#f5a623"/></svg>',forearms:'<svg width="36" height="36" viewBox="0 0 36 36" fill="none"><path d="M15 7 Q11 13 12 21 Q13 28 18 30 Q23 28 24 21 Q25 13 21 7 Q19 5 18 5 Q17 5 15 7Z" fill="#f5a623"/></svg>',cardio:'<svg width="36" height="36" viewBox="0 0 36 36" fill="none"><path d="M18 29 L7 18 Q4 12 10 9 Q14 7 18 14 Q22 7 26 9 Q32 12 29 18 Z" fill="#f5a623"/></svg>'};
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
  if(!selectedAddCat) return;
  const ex = ALL_EXERCISES[selectedAddCat]?.[idx];
  if(!ex) return;
  selectedAddEx = ex;
  // Сбрасываем параметры на значения по умолчанию (можно оставить как есть)
  if (!addExParams.s) addExParams = { s: ex.s || 3, r: ex.r || 12, kg: ex.kg || 0 };

  // Если есть поиск, перерисовываем с подсветкой
  const searchVal = (document.getElementById('add-ex-search')?.value || '').trim();
  if (searchVal) {
    filterAddExSearch(); // обновляем список с подсветкой
  } else {
    renderAddExList(selectedAddCat);
  }
  showAddExerciseParams(ex);
}
window.selectAddExercise = selectAddExercise;

// FIX: новая функция для выбора упражнения из результатов поиска
function selectAddExerciseFromSearch(cat, idx) {
  const ex = ALL_EXERCISES[cat]?.[idx];
  if (!ex) return;

  selectedAddCat = cat;
  selectedAddEx = ex;

  // Сохраняем текущие параметры, если они были установлены
  if (!addExParams.s) addExParams = { s: ex.s || 3, r: ex.r || 12, kg: ex.kg || 0 };

  // Перерисовываем список с подсветкой
  filterAddExSearch();

  // Показываем параметры
  showAddExerciseParams(ex);
}
window.selectAddExerciseFromSearch = selectAddExerciseFromSearch;

// FIX: исправленная функция отображения параметров
function showAddExerciseParams(ex) {
  const paramsDiv = document.getElementById('add-ex-params');
  const confirmBtn = document.getElementById('confirm-add-ex-btn');
  if (!paramsDiv) return;

  paramsDiv.style.display = 'block';
  paramsDiv.innerHTML = `
    <div style="margin-bottom:12px; font-weight:700;">Параметры для "${ex.n}"</div>
    <div class="sheet-fields-row">
      <div class="sheet-field">
        <label>Подходы</label>
        <input id="add-sets" type="number" min="1" value="${addExParams.s || ex.s || 3}">
      </div>
      <div class="sheet-field">
        <label>Повторы</label>
        <input id="add-reps" type="number" min="1" value="${addExParams.r || ex.r || 12}">
      </div>
      <div class="sheet-field">
        <label>Вес (кг)</label>
        <input id="add-kg" type="number" step="0.5" value="${addExParams.kg || ex.kg || 0}">
      </div>
    </div>
  `;

  if (confirmBtn) confirmBtn.style.display = 'block';
}

// FIX: исправленный поиск упражнений
function filterAddExSearch() {
  const q = (document.getElementById('add-ex-search')?.value || '').toLowerCase().trim();
  const muscleGrid = document.getElementById('add-muscle-grid');
  const container = document.getElementById('add-ex-list');
  const paramsDiv = document.getElementById('add-ex-params');
  const confirmBtn = document.getElementById('confirm-add-ex-btn');

  if (!container) return;

  // Если поиск пуст — показываем сетку мышц и сбрасываем выбор
  if (!q) {
    if (muscleGrid) muscleGrid.style.display = '';
    container.innerHTML = '';
    if (paramsDiv) paramsDiv.style.display = 'none';
    if (confirmBtn) confirmBtn.style.display = 'none';
    selectedAddEx = null;
    searchResults = [];
    // Если выбрана категория, показываем её упражнения
    if (selectedAddCat) {
      renderAddExList(selectedAddCat);
    }
    return;
  }

  // Поиск по всем упражнениям
  const results = [];
  const catLabels = {
    chest: 'Грудные', back: 'Спина', legs: 'Ноги', shoulders: 'Плечи',
    biceps: 'Бицепс', triceps: 'Трицепс', glutes: 'Ягодицы', abs: 'Пресс',
    forearms: 'Предплечья', cardio: 'Кардио'
  };

  Object.entries(ALL_EXERCISES).forEach(([cat, exs]) => {
    exs.forEach((ex, idx) => {
      if (ex.n.toLowerCase().includes(q)) {
        results.push({ ex, cat, idx });
      }
    });
  });

  searchResults = results;

  if (!results.length) {
    container.innerHTML = '<div style="padding:16px; text-align:center; color:var(--text-muted)">Ничего не найдено 🤷</div>';
    if (paramsDiv) paramsDiv.style.display = 'none';
    if (confirmBtn) confirmBtn.style.display = 'none';
    if (muscleGrid) muscleGrid.style.display = 'none';
    selectedAddEx = null;
    return;
  }

  // Скрываем сетку мышц
  if (muscleGrid) muscleGrid.style.display = 'none';

  // Формируем список результатов
  let html = '<div style="display:flex; flex-direction:column; gap:4px;">';
  results.forEach(({ ex, cat, idx }) => {
    const isSel = selectedAddEx && selectedAddEx.n === ex.n;
    html += `
      <div class="ex-pick-row" 
           data-cat="${cat}" 
           data-idx="${idx}"
           onclick="selectAddExerciseFromSearch('${cat}', ${idx})"
           style="cursor:pointer; background:${isSel ? 'var(--accent)' : 'transparent'}; 
                  color:${isSel ? '#fff' : 'var(--text)'}; border-radius:8px; padding:8px 12px;">
        <div class="ex-pick-name">${ex.n}</div>
        <div style="font-size:11px; color:${isSel ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)'}; margin-top:2px;">
          ${catLabels[cat] || cat}
        </div>
      </div>
    `;
  });
  html += '</div>';
  container.innerHTML = html;

  // Если ранее было выбрано упражнение, подсвечиваем его и показываем параметры
  if (selectedAddEx) {
    const found = results.some(r => r.ex.n === selectedAddEx.n);
    if (found) {
      showAddExerciseParams(selectedAddEx);
    } else {
      // Если выбранное упражнение не входит в результаты, скрываем параметры
      if (paramsDiv) paramsDiv.style.display = 'none';
      if (confirmBtn) confirmBtn.style.display = 'none';
    }
  } else {
    if (paramsDiv) paramsDiv.style.display = 'none';
    if (confirmBtn) confirmBtn.style.display = 'none';
  }
}
window.filterAddExSearch = filterAddExSearch;

// FIX: исправленный confirmAddExercise — сохраняет параметры и добавляет упражнение
function confirmAddExercise(){
  if(!selectedAddEx){
    toast('❗ Сначала выберите упражнение');
    return;
  }

  const sets = parseInt(document.getElementById('add-sets')?.value) || 1;
  const reps = parseInt(document.getElementById('add-reps')?.value) || 1;
  const kg = parseFloat(document.getElementById('add-kg')?.value) || 0;

  // Сохраняем параметры в глобальную переменную для будущих выборов
  addExParams = { s: sets, r: reps, kg: kg };

  const newEx = {
    ...selectedAddEx,
    s: sets,
    r: reps,
    kg: kg,
    sets_data: Array.from({ length: sets }, () => ({ r: reps, kg: kg, done: false })),
    done: false
  };

  customWt.push(newEx);
  closeAllSheets();
  renderExecute();
  toast(`✅ ${selectedAddEx.n} добавлено`);
}
window.confirmAddExercise = confirmAddExercise;