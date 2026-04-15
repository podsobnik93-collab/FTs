// app.js — полная логика FitSim (исправленная версия)
// Все глобальные переменные и функции оставлены как есть, привязаны к window.

// ==================== ИСПРАВЛЕННАЯ ВЕРСИЯ ====================
// Исправления: единый ISO-формат дат для воды, автоматический запуск напоминаний после перезагрузки.

// Глобальные переменные
let profile = JSON.parse(localStorage.getItem('fs-profile') || 'null');
let diary   = JSON.parse(localStorage.getItem('fs-diary')   || '[]');
let exlog   = JSON.parse(localStorage.getItem('fs-exlog')  || '{}');
let wlog    = JSON.parse(localStorage.getItem('fs-wlog')    || '[]');
let bodyLog = JSON.parse(localStorage.getItem('fs-bodylog') || '[]');
let waterData = JSON.parse(localStorage.getItem('fs-water') || '{"date":"","amount":0}');
let waterHistory = JSON.parse(localStorage.getItem('fs-water-hist') || '[]');
let customWt = [];
let currentWtScreen = 'home';
let workoutFlowState = JSON.parse(localStorage.getItem('fs-workout-flow-state') || '{}');
let savedWts = JSON.parse(localStorage.getItem('fs-saved-wts') || '[]');
let editMode = false;
let activeProgId = localStorage.getItem('fs-active-prog') || null;
let viewingProgId = null;
let reminderEnabled = localStorage.getItem('waterReminderEnabled') === 'true';
let reminderInterval = null;

// Единая база упражнений
let ALL_EXERCISES = {};

// Функции инициализации и утилиты
function toast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg; t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 1800);
}

function closeAllSheets() {
  const overlay = document.getElementById('sheet-overlay');
  if (overlay) overlay.classList.remove('show');
  const bodySheet = document.getElementById('body-sheet');
  if (bodySheet) bodySheet.classList.remove('show');
  const editEx = document.getElementById('edit-ex-sheet');
  if (editEx) editEx.classList.remove('show');
  const addEx = document.getElementById('add-ex-sheet');
  if (addEx) addEx.classList.remove('show');
}

// ── ТЕМА ──────────────────────────────────────────────────────
let isDark = localStorage.getItem('fs-theme') !== 'light';
function applyTheme() {
  document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  const btn = document.getElementById('theme-btn');
  if (btn) btn.textContent = isDark ? '☀️' : '🌙';
  localStorage.setItem('fs-theme', isDark ? 'dark' : 'light');
}
function toggleTheme() { isDark = !isDark; applyTheme(); toast(isDark ? '🌙 Тёмная тема' : '☀️ Светлая тема'); }
applyTheme();

// ── НАВИГАЦИЯ С СОХРАНЕНИЕМ ТРЕНИРОВКИ ──────────────────────
const PAGE_IDS = ['home','nutrition','stats','diary','profile','encyclopedia','simulation','calendar','workout'];
const NAV_IDS  = ['nav-home','nav-nutrition','nav-calendar','nav-encyclopedia'];
const CTA_LABELS = { calendar:'+ Добавить тренировку', home:'Начать тренировку', nutrition:'+ Добавить приём пищи', workout:'Сохранить тренировку', stats:'Обновить данные', diary:'+ Замеры тела', profile:'Сохранить профиль', encyclopedia:'📚 Поиск', simulation:'Рассчитать' };
let currentPage = 'home';

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
function updateCtaLabel(){
  const btn = document.getElementById('cta-btn');
  if(!btn) return;
  if(currentPage === 'home'){
    const hasActiveWorkout = Array.isArray(customWt) && customWt.length && (currentWtScreen === 'execute' || currentWtScreen === 'builder');
    btn.textContent = hasActiveWorkout ? 'Продолжить тренировку' : 'Начать тренировку';
    return;
  }
  if(currentPage === 'workout'){
    if(currentWtScreen === 'execute' && Array.isArray(customWt) && customWt.length){
      btn.textContent = 'Продолжить тренировку';
    } else if(currentWtScreen === 'builder'){
      btn.textContent = 'К тренировке';
    } else {
      btn.textContent = 'Сохранить тренировку';
    }
    return;
  }
  btn.textContent = CTA_LABELS[currentPage] || 'Начать тренировку';
}
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
function goTo(id, title) {
  if (currentPage === 'workout') saveWorkoutFlowState();
  currentPage = id;
  PAGE_IDS.forEach(p => document.getElementById('page-'+p).classList.toggle('active', p===id));
  const NAV_MAP={home:'nav-home',nutrition:'nav-nutrition',calendar:'nav-calendar',encyclopedia:'nav-encyclopedia'};
  NAV_IDS.forEach(n=>{const el=document.getElementById(n);if(el)el.classList.remove('active');});
  const activeNav=NAV_MAP[id]; if(activeNav){const el=document.getElementById(activeNav);if(el)el.classList.add('active');}
  document.getElementById('header-title').textContent = title || 'FitSim';
  updateCtaLabel();
  const cta = document.querySelector('.bottom-cta');
  if (cta) cta.style.display = id === 'encyclopedia' ? 'none' : '';
  if (id==='stats') renderStats();
  if (id==='home')  renderHome();
  if (id==='diary') { renderDiary(); renderProgress(); }
  if (id==='nutrition') { renderNutrEntries(); renderDietPrefs(); }
  if (id==='profile') loadProfileToForm();
  if (id==='workout') {
    const restored = restoreWorkoutFlowState();
    if (restored && currentWtScreen === 'execute' && customWt.length) {
      showWtScreen('execute');
      renderExecute();
    } else if (restored && currentWtScreen === 'builder') {
      showWtScreen('builder');
      renderMuscleGrid();
      if (activeMuscle) renderExPicker(activeMuscle);
      updateBldStartBar();
    } else {
      showWtScreen(customWt.length ? 'execute' : 'home');
      if (customWt.length) renderExecute();
    }
  }
  if (id==='encyclopedia') renderEncyclopedia();
  if (id==='calendar') renderCalendar();
  updateCtaLabel();
  const scrollArea = document.querySelector('.scroll-area');
  if (scrollArea) scrollArea.scrollTop = 0;
}

function ctaAction() {
  const a = {
    calendar: () => goTo('workout','🏋️ Тренировка'),
    home: () => goTo('workout','🏋️ Тренировка'),
    workout: () => {
      if (currentWtScreen === 'execute' && Array.isArray(customWt) && customWt.length) {
        renderExecute();
        updateCtaLabel();
        return;
      }
      if (currentWtScreen === 'builder' && Array.isArray(customWt) && customWt.length) {
        showWtScreen('execute');
        renderExecute();
        updateCtaLabel();
        return;
      }
      showWtScreen('builder');
      updateCtaLabel();
    },
    stats: renderStats,
    diary: openBodySheet,
    profile: saveProfile,
    simulation: runSimulation
  };
  (a[currentPage]||(() => {}))();
}

// ── ВОДА ──────────────────────────────────────────────────────
function renderWater() {
  if (!profile) return;
  const today = new Date().toISOString().split('T')[0];
  if (waterData.date !== today) {
    if (waterData.date && waterData.amount > 0) {
      const existingIdx = waterHistory.findIndex(h => h.date === waterData.date);
      if (existingIdx >= 0) waterHistory[existingIdx].amount = waterData.amount;
      else waterHistory.push({ date: waterData.date, amount: waterData.amount });
      localStorage.setItem('fs-water-hist', JSON.stringify(waterHistory));
    }
    waterData = { date: today, amount: 0 };
    localStorage.setItem('fs-water', JSON.stringify(waterData));
  }

  const goal = profile.weight ? Math.round(profile.weight * 30) : 2000;
  document.getElementById('water-current').textContent = waterData.amount;
  document.getElementById('water-goal').textContent = '/ ' + goal + ' мл';
  const pct = Math.min(100, (waterData.amount / goal) * 100);
  document.getElementById('water-bar-fill').style.width = pct + '%';
  renderWaterWeek();
}
function addWater(amount) {
  if (!amount || isNaN(amount)) return;
  waterData.amount += amount;
  if (waterData.amount < 0) waterData.amount = 0;
  localStorage.setItem('fs-water', JSON.stringify(waterData));
  renderWater();
  toast(amount>0 ? '💧 +' + amount + ' мл' : '🔙 Убрано ' + Math.abs(amount) + ' мл');
}

// ── ПРОФИЛЬ И СТАТИСТИКА ──────────────────────────────────────
function loadProfileToForm() {
  if (!profile) return;
  document.getElementById('p-name').value = profile.name || 'Атлет';
  document.getElementById('p-age').value = profile.age || 25;
  document.getElementById('p-weight').value = profile.weight || 75;
  document.getElementById('p-height').value = profile.height || 175;
  document.getElementById('p-gender').value = profile.gender || 'male';
  document.getElementById('p-activity').value = profile.activity || 1.55;
  document.getElementById('p-goal').value = profile.goal || 'maintain';
  document.getElementById('p-target').value = profile.target || 70;
  document.getElementById('p-weeks').value = profile.weeks || 12;
  renderDietPrefs();
}
function validateProfileInput(age,weight,height){
  if(age<10||age>120){toast('❗ Возраст должен быть от 10 до 120 лет');return false;}
  if(weight<20||weight>300){toast('❗ Вес должен быть от 20 до 300 кг');return false;}
  if(height<100||height>250){toast('❗ Рост должен быть от 100 до 250 см');return false;}
  return true;
}
function saveProfile() {
  const _age=+document.getElementById('p-age').value;
  const _weight=+document.getElementById('p-weight').value;
  const _height=+document.getElementById('p-height').value;
  if(!validateProfileInput(_age,_weight,_height))return;
  const oldProfile = profile || {};
  profile = {
    name:     document.getElementById('p-name').value.trim() || oldProfile.name || 'Атлет',
    age:      +document.getElementById('p-age').value || oldProfile.age || 25,
    weight:   +document.getElementById('p-weight').value || oldProfile.weight || 75,
    height:   +document.getElementById('p-height').value || oldProfile.height || 175,
    gender:   document.getElementById('p-gender').value,
    activity: +document.getElementById('p-activity').value,
    goal:     document.getElementById('p-goal').value,
    target:   +document.getElementById('p-target').value || oldProfile.target || 70,
    weeks:    +document.getElementById('p-weeks').value || oldProfile.weeks || 12,
    dietPrefs: oldProfile.dietPrefs || [],
  };
  localStorage.setItem('fs-profile', JSON.stringify(profile));
  prefillSim();
  toast('✅ Профиль сохранён');
  setTimeout(() => goTo('stats','📊 Статистика'), 500);
}
function calcBMR(p) { const w=+(p.weight)||75,h=+(p.height)||175,a=+(p.age)||25; return p.gender==='male' ? 10*w+6.25*h-5*a+5 : 10*w+6.25*h-5*a-161; }
function prefillSim() {
  if (!profile) return;
  document.getElementById('sim-start').value  = profile.weight;
  document.getElementById('sim-target').value = profile.target;
  document.getElementById('sim-weeks').value  = profile.weeks;
}
function renderStats() {
  if (!profile) { document.getElementById('stats-empty').style.display='block'; document.getElementById('stats-content').style.display='none'; return; }
  document.getElementById('stats-empty').style.display='none'; document.getElementById('stats-content').style.display='block';
  const bmr=Math.round(calcBMR(profile)), tdee=Math.round(bmr*profile.activity);
  let rec = tdee;
  if(profile.goal==='loss') rec-=400;
  if(profile.goal==='gain') rec+=300;
  const ideal=profile.target?profile.target+' кг':'—';
  const prot=Math.round(profile.weight*(profile.goal==='gain'?2.2:1.8));
  const fat=Math.round(rec*0.25/9);
  const carbs=Math.max(0,Math.round((rec-prot*4-fat*9)/4));
  document.getElementById('s-ideal').textContent=ideal; document.getElementById('s-bmr').textContent=bmr+' ккал';
  document.getElementById('s-tdee').textContent=tdee+' ккал'; document.getElementById('s-kcal').textContent=rec+' ккал';
  const goalLabels={loss:'🔥 Цель: Похудение  •  −400 ккал от TDEE', maintain:'⚖️ Цель: Поддержание  •  0 ккал', gain:'💪 Цель: Набор массы  •  +300 ккал к TDEE'};
  document.getElementById('stats-goal-banner').textContent=goalLabels[profile.goal]||'';
  document.getElementById('s-protein').textContent=prot; document.getElementById('s-carbs').textContent=carbs; document.getElementById('s-fat').textContent=fat;
}
function renderHome() {
  profile = JSON.parse(localStorage.getItem('fs-profile') || 'null');
  if (!profile) return;
  document.getElementById('home-empty').style.display='none'; document.getElementById('home-content').style.display='block';
  const tdee=Math.round(calcBMR(profile)*profile.activity);
  const goals={loss:'🔥 Похудение', maintain:'⚖️ Поддержание', gain:'💪 Набор массы'};
  document.getElementById('h-name').textContent=profile.name; document.getElementById('h-goal').textContent='Цель: '+goals[profile.goal];
  document.getElementById('h-weight').textContent=profile.weight; document.getElementById('h-tdee').textContent=tdee;
  
  const lastWorkoutDiv = document.getElementById('last-workout-info');
  if (lastWorkoutDiv) {
    if (diary.length > 0) {
      const last = diary[0];
      let dateDisplay = last.date;
      if (dateDisplay.includes(',')) dateDisplay = dateDisplay.split(',')[0];
      lastWorkoutDiv.innerHTML = `🏋️ Последняя тренировка: <strong>${last.type || 'Тренировка'}</strong> (${dateDisplay})`;
    } else {
      lastWorkoutDiv.innerHTML = `🏋️ Последняя тренировка: <em>нет тренировок</em>`;
    }
  }
  
  renderWater();
  updateReminderUI();
  if(diary.length){
    document.getElementById('home-recent').style.display='block';
    document.getElementById('home-recent-body').innerHTML=[...diary].slice(-2).reverse().map(e=>`<div class="diary-entry"><div class="diary-date">${e.date}</div><div class="diary-title">${e.type||'Тренировка'}</div><span class="badge green">🔥 ${e.kcal} ккал</span></div>`).join('');
  }
}
// ── НАПОМИНАНИЯ О ВОДЕ ──────────────────────────────────────
function requestNotificationPermission() {
    if (!("Notification" in window)) {
        toast("Ваш браузер не поддерживает уведомления");
        return false;
    }
    if (Notification.permission === "granted") {
        return true;
    } else if (Notification.permission !== "denied") {
        Notification.requestPermission().then(perm => {
            if (perm === "granted") {
                toast("Уведомления разрешены");
                startWaterReminders();
            } else {
                toast("Уведомления отклонены");
            }
        });
        return false;
    } else {
        toast("Уведомления заблокированы");
        return false;
    }
}

function startWaterReminders() {
    if (!("Notification" in window)) return;
    if (Notification.permission !== "granted") {
        requestNotificationPermission();
        return;
    }
    if (reminderInterval) clearInterval(reminderInterval);
    reminderInterval = setInterval(() => {
        showWaterReminder();
    }, 2 * 60 * 60 * 1000);
    localStorage.setItem('waterReminderEnabled', 'true');
    reminderEnabled = true;
    toast("Напоминания о воде включены");
    updateReminderUI();
}

function stopWaterReminders() {
    if (reminderInterval) {
        clearInterval(reminderInterval);
        reminderInterval = null;
    }
    localStorage.setItem('waterReminderEnabled', 'false');
    reminderEnabled = false;
    toast("Напоминания о воде отключены");
    updateReminderUI();
}

function showWaterReminder() {
    if (Notification.permission !== "granted") return;
    new Notification("💧 Пора выпить воду!", {
        body: "Не забывайте пить воду для поддержания гидратации.",
        icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%234fc3f7'%3E%3Cpath d='M12 2c-1.1 0-2 .9-2 2v2.5c0 .8.7 1.5 1.5 1.5s1.5-.7 1.5-1.5V4c0-1.1-.9-2-2-2zm0 8c-2.2 0-4 1.8-4 4s1.8 4 4 4 4-1.8 4-4-1.8-4-4-4z'/%3E%3C/svg%3E"
    });
}

function toggleWaterReminders() {
    if (reminderEnabled) {
        stopWaterReminders();
    } else {
        startWaterReminders();
    }
}

function updateReminderUI() {
    const btn = document.getElementById('reminder-toggle');
    if (!btn) return;
    if (reminderEnabled && Notification.permission === "granted") {
        btn.textContent = "🔔 Напоминания вкл";
        btn.style.background = "var(--accent)";
        btn.style.color = "#fff";
    } else {
        btn.textContent = "🔕 Включить напоминания";
        btn.style.background = "var(--input-bg)";
        btn.style.color = "var(--text)";
    }
}
// ── ДНЕВНИК, ЗАМЕРЫ ──────────────────────────────────────────
function renderDiary() {
  const dl=document.getElementById('diary-list');
  dl.innerHTML=diary.length?diary.map((e,i)=>`<div class="diary-entry" style="cursor:pointer;" onclick="const d=document.getElementById('dd-${i}'); const arr=document.getElementById('di-${i}'); if(d.style.display==='none'){d.style.display='block'; arr.style.transform='rotate(180deg)';}else{d.style.display='none'; arr.style.transform='rotate(0deg)';}"><div style="display:flex;justify-content:space-between;align-items:center"><div style="display:flex; align-items:center; gap:12px;"><div class="diary-title" style="margin:0; font-size:15px;">${e.type||'Тренировка'}</div><div class="diary-date" style="margin:0; font-size:12px; margin-top:2px;">${e.date.split(',')[0]}</div></div><div style="display:flex; align-items:center; gap:16px;"><span id="di-${i}" style="font-size:10px; color:var(--text-muted); transition: transform 0.2s; display:inline-block;">▼</span><button class="diary-del" onclick="event.stopPropagation(); delDiary(${i})" style="margin:0;">✕</button></div></div><div id="dd-${i}" style="display:none; margin-top:12px; padding-top:12px; border-top:1px dashed var(--border);"><div class="diary-date" style="margin-bottom:8px;">Полная дата: ${e.date}</div><div class="diary-exs" style="margin-bottom:8px; line-height:1.4;">${e.exercises.split(', ').join('<br>')}</div><span class="badge green">🔥 ${e.kcal} ккал</span></div></div>`).join(''):'<div class="empty-state">У вас пока нет тренировок</div>';
  renderWlog(); renderBodyLog();
}
function delDiary(i){diary.splice(i,1);localStorage.setItem('fs-diary',JSON.stringify(diary));renderDiary();toast('🗑 Удалено');}
function delDiaryFromCal(i,dateStr){if(!confirm('Удалить эту тренировку?'))return;diary.splice(i,1);localStorage.setItem('fs-diary',JSON.stringify(diary));renderCalendar();setTimeout(()=>showCalDay(dateStr),50);toast('🗑 Тренировка удалена');}
function editDiaryFromCal(i,dateStr){
  const d=diary[i];if(!d)return;
  window._editCalIdx=i;window._editCalDateStr=dateStr;
  document.getElementById('cal-edit-type').value=d.type||'';
  document.getElementById('cal-edit-exercises').value=(d.exercises||'').replace(/<br>/g,'\n');
  document.getElementById('cal-edit-overlay').style.display='flex';
}
function saveCalEdit(){
  const i=window._editCalIdx,dateStr=window._editCalDateStr;
  const d=diary[i];if(!d)return;
  d.type=document.getElementById('cal-edit-type').value.trim()||d.type;
  d.exercises=document.getElementById('cal-edit-exercises').value.trim();
  localStorage.setItem('fs-diary',JSON.stringify(diary));
  closeCalEdit();
  renderCalendar();setTimeout(()=>showCalDay(dateStr),50);
  toast('✅ Тренировка обновлена');
}
function closeCalEdit(){document.getElementById('cal-edit-overlay').style.display='none';}
function delWeight(id){wlog=wlog.filter(e=>e.id!==id);localStorage.setItem('fs-wlog',JSON.stringify(wlog));renderWlog();toast('🗑 Замер удалён');}
function renderWlog(){
  const c=document.getElementById('weight-log'),cnt=document.getElementById('wlog-count');
  if(!wlog.length){c.innerHTML='<div class="empty-state" style="color:var(--text-light);font-size:0.85rem;padding:4px 0 8px">Нет замеров. Нажми «+ Замеры тела»</div>';cnt.textContent='';return;}
  cnt.textContent=wlog.length+' замер'+(wlog.length===1?'':wlog.length<5?'а':'ов');
  const sorted=[...wlog].sort((a,b)=>b.date.localeCompare(a.date));
  c.innerHTML='<div class="wlog-list">'+sorted.map((e,i)=>{const prev=sorted[i+1];let diff=null,trendCls='same',trendIcon='•';if(prev){diff=+(e.weight-prev.weight).toFixed(1);if(diff<0){trendCls='down';trendIcon='↓';}else if(diff>0){trendCls='up';trendIcon='↑';}else{trendCls='same';trendIcon='→';}}const diffText=diff!==null?`<div class="wlog-diff ${diff<0?'neg':diff>0?'pos':'zero'}">${diff>0?'+':''}${diff} кг к пред.</div>`:'';const dateObj=new Date(e.date+'T00:00:00');const dateStr=dateObj.toLocaleDateString('ru',{day:'numeric',month:'long',year:'numeric'});return `<div class="wlog-item"><div class="wlog-trend ${trendCls}">${trendIcon}</div><div class="wlog-info"><div class="wlog-date-text">${dateStr}</div><div class="wlog-weight-text">${e.weight} кг</div>${diffText}</div><button class="wlog-delete" onclick="delWeight(${e.id})">✕</button></div>`;}).join('')+'</div>';
}
function renderBodyLog(){
  const c=document.getElementById('body-log');
  if(!bodyLog.length){c.innerHTML='<div class="empty-state" style="color:var(--text-light);font-size:0.85rem;padding:4px 0 8px">Нет замеров. Нажми «+ Замеры тела»</div>';return;}
  const sorted=[...bodyLog].sort((a,b)=>b.date.localeCompare(a.date));
  const labels={neck:'Шея',chest:'Грудь',bicep:'Бицепс',forearm:'Предпл.',waist:'Талия',glutes:'Ягодицы',thigh:'Бедро',calf:'Голень'};
  c.innerHTML=sorted.map((e,i)=>{let gridHtml='';for(let k in labels){if(e[k]){const prev=sorted[i+1];let diffHtml='';if(prev&&prev[k]){const diff=+(e[k]-prev[k]).toFixed(1);if(diff!==0){diffHtml=`<div style="font-size:0.6rem; font-weight:700; color:${diff>0?'#27ae60':'#e74c3c'}">${diff>0?'+':''}${diff}</div>`;}}gridHtml+=`<div class="bg-item"><div class="bg-val">${e[k]}</div><div class="bg-lbl">${labels[k]}</div>${diffHtml}</div>`;}}return `<div class="body-entry"><div style="display:flex; justify-content:space-between; align-items:center;"><div class="wlog-date-text" style="font-weight:700; color:var(--text)">${new Date(e.date+'T00:00:00').toLocaleDateString('ru',{day:'numeric',month:'long',year:'numeric'})}</div><button class="wlog-delete" style="width:26px;height:26px;font-size:0.8rem;" onclick="delBody('${e.date}')">✕</button></div><div class="body-grid">${gridHtml}</div></div>`;}).join('');
  renderBodyChart();
}
function delBody(date){bodyLog=bodyLog.filter(e=>e.date!==date);localStorage.setItem('fs-bodylog',JSON.stringify(bodyLog));renderBodyLog();toast('🗑 Удалено');}
function triggerBodyChart(){renderBodyChart();}
function openBodySheet(){
  document.getElementById('sheet-overlay').classList.add('show');
  document.getElementById('body-sheet').classList.add('show');
  document.getElementById('sb-date').valueAsDate=new Date();
  ['neck','chest','bicep','forearm','waist','glutes','thigh','calf'].forEach(k=>document.getElementById('sb-'+k).value='');
  document.getElementById('sb-weight').value='';
}
function addBody(){
  const d=document.getElementById('sb-date').value||new Date().toISOString().split('T')[0];
  const entry={date:d}; const keys=['neck','chest','bicep','forearm','waist','glutes','thigh','calf']; let hasData=false;
  keys.forEach(k=>{const inp=document.getElementById('sb-'+k);const v=parseFloat(inp.value);if(inp.value!==''&&!isNaN(v)){entry[k]=v;hasData=true;}});
  const weightVal=parseFloat(document.getElementById('sb-weight').value);
  if(weightVal&&weightVal>0){
    const wExists=wlog.findIndex(e=>e.date===d);
    if(wExists!==-1){wlog[wExists].weight=weightVal;}else{wlog.push({date:d,weight:weightVal,id:Date.now()});}
    localStorage.setItem('fs-wlog',JSON.stringify(wlog));renderWlog();hasData=true;
  }
  if(!hasData){toast('❗ Заполни хотя бы одно поле');return;}
  let hasBodyData=keys.some(k=>entry[k]!==undefined);
  if(hasBodyData){const exists=bodyLog.findIndex(e=>e.date===d);if(exists!==-1)bodyLog[exists]=entry;else bodyLog.push(entry);localStorage.setItem('fs-bodylog',JSON.stringify(bodyLog));renderBodyLog();}
  closeAllSheets();toast('✅ Замеры сохранены');
}

// ── СИМУЛЯЦИЯ ─────────────────────────────────────────────────
function runSimulation(){
  const start=+document.getElementById('sim-start').value||80;
  const target=+document.getElementById('sim-target').value||72;
  const weeks=+document.getElementById('sim-weeks').value||12;
  const freq=+document.getElementById('sim-freq').value;
  const deficit=+document.getElementById('sim-deficit').value;
  const wch=(deficit/7700)+(deficit!==0?(deficit<0?-freq*0.02:freq*0.01):0);
  let w=start; const lim=Math.min(weeks,20); const maxA=Math.abs(wch*lim)||1; let html='';
  for(let i=1;i<=lim;i++){w=Math.round((w+wch)*10)/10; const d=+(w-start).toFixed(1); const pct=Math.min(95,Math.abs(d)/maxA*88+7); const cls=d<0?'loss':d>0?'gain':'same'; html+=`<div class="sim-bar-row"><span class="wlbl">Нед. ${i}</span><div class="sim-bar-bg"><div class="sim-bar-fill ${cls}" style="width:${pct}%">${w} кг ${d>=0?'+':''}${d}</div></div></div>`;}
  const final=Math.round((start+wch*weeks)*10)/10;
  const hit=deficit<0?final<=target:final>=target;
  document.getElementById('sim-bars').innerHTML=html;
  document.getElementById('sim-conclusion').innerHTML=hit?`<strong>🎉 Цель достигнута!</strong> За ${weeks} нед. вы достигнете <strong>${final} кг</strong>.`:`<strong>📌 За ${weeks} нед. будет ${final} кг.</strong><br><span style="color:var(--text-light)">До цели (${target} кг) ещё ${Math.abs(+(final-target).toFixed(1))} кг.</span>`;
  document.getElementById('sim-output').style.display='block';
}

// ── ПРОГРЕСС УПРАЖНЕНИЙ ──────────────────────────────────────
function populateProgSelect(){
  const sel=document.getElementById('prog-select'); if(!sel)return;
  const cur=sel.value; const names=Object.keys(exlog).sort();
  sel.innerHTML='<option value="">— Выбери упражнение —</option>'+names.map(n=>`<option value="${n}" ${n===cur?'selected':''}>${n}</option>`).join('');
}
function renderProgress(){
  populateProgSelect();
  const sel=document.getElementById('prog-select'),chartEl=document.getElementById('prog-chart'),tableEl=document.getElementById('prog-table'),prEl=document.getElementById('prog-pr');
  if(!sel||!chartEl||!tableEl)return;
  const name=sel.value;
  if(!name||!exlog[name]||!exlog[name].length){chartEl.innerHTML='';tableEl.innerHTML='<div style="color:var(--text-muted);font-size:13px;text-align:center;padding:16px">Нет данных. Сохрани тренировку с этим упражнением.</div>';if(prEl)prEl.innerHTML='';return;}
  const entries=exlog[name].slice(-20);
  const kgVals=entries.map(e=>e.kg||0); const maxKg=Math.max(...kgVals)||1;
  if(prEl)prEl.innerHTML=maxKg>0?`<span class="prog-pr-badge">🏆 ПР: ${maxKg} кг</span>`:'';
  let bars=''; const barW=Math.max(20,Math.min(44,Math.floor(300/entries.length)));
  entries.forEach((e,i)=>{const pct=maxKg>0?Math.round((e.kg/maxKg)*100):0; const prev=i>0?entries[i-1].kg:e.kg; const diff=e.kg-prev; const color=diff>0?'#22c55e':diff<0?'#ef4444':'var(--accent)'; bars+=`<div style="display:inline-flex;flex-direction:column;align-items:center;margin:0 2px;vertical-align:bottom"><div style="font-size:9px;color:${color};font-weight:600;margin-bottom:2px">${e.kg>0?e.kg+'кг':''}</div><div style="width:${barW}px;height:${Math.max(4,Math.round(pct*0.8))}px;background:${color};border-radius:3px 3px 0 0;opacity:0.85"></div><div style="font-size:8px;color:var(--text-muted);margin-top:3px;max-width:${barW}px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${e.date.split('.').slice(0,2).join('/')}</div></div>`;});
  chartEl.innerHTML=`<div style="display:flex;align-items:flex-end;padding:8px 0 4px;overflow-x:auto;min-height:80px">${bars}</div>`;
  const rows=[...entries].reverse().map((e,i,arr)=>{const prev=arr[i+1]; let tag=''; if(e.kg>0){if(!prev||e.kg>prev.kg)tag='<span class="prog-tag up">↑ +'+(prev?(e.kg-prev.kg).toFixed(1):'')+' кг</span>'; else if(e.kg<prev.kg)tag='<span class="prog-tag down">↓</span>'; else tag='<span class="prog-tag same">= стабильно</span>';} const vol=e.s&&e.r?`${e.s}×${e.r}`:'—'; return `<tr><td>${e.date}</td><td><strong>${e.kg>0?e.kg+' кг':'б/веса'}</strong></td><td style="color:var(--text-muted)">${vol}</td><td>${tag}</td></tr>`;}).join('');
  tableEl.innerHTML=`<table class="prog-table"><thead><tr><th>Дата</th><th>Вес</th><th>Подх×Пов</th><th>Δ</th></tr></thead><tbody>${rows}</tbody></table>`;
}

// ── ПРОГРАММЫ (без изменений, корректны) ─────────────────────
const PROGRAMS = [{"id":"womens","name":"Женская тренировка","level":"Средний","days_week":"4 дня/нед","goal":"Форма и тонус","desc":"Акцент на ягодицы, ноги и пресс. Подходит для девушек любого уровня.","schedule":[{"label":"Пн","name":"Ягодицы + Ноги","rest":false,"exs":["Румынская тяга","Приседания со штангой","Отведение ноги в кроссовере","Выпады с гантелями","Сгибание ног лёжа","Планка"]},{"label":"Вт","name":"Отдых","rest":true,"exs":[]},{"label":"Ср","name":"Спина + Плечи","rest":false,"exs":["Тяга верхнего блока широким прямым хватом к груди","Тяга горизонтального блока к поясу","Жим гантелей сидя или стоя","Разведение рук с гантелями в стороны","Тяга штанги в наклоне к поясу"]},{"label":"Чт","name":"Отдых","rest":true,"exs":[]},{"label":"Пт","name":"Ягодицы + Пресс","rest":false,"exs":["Ягодичный мостик со штангой","Мёртвая тяга на прямых ногах","Гиперэкстензия","Скручивания лёжа на наклонной скамье","Боковая планка","Подъём ног в висе"]},{"label":"Сб","name":"Грудь + Руки","rest":false,"exs":["Жим гантелей лёжа","Разводка гантелей лёжа","Сгибание рук в кроссовере","Жим лёжа узким хватом","Отжимания на брусьях"]},{"label":"Вс","name":"Отдых","rest":true,"exs":[]}]},{"id":"split_back_bi","name":"Сплит: Спина + Бицепс + Пресс","level":"Средний","days_week":"1 день/нед","goal":"Масса и сила","desc":"Классический сплит-день на спину и бицепс с проработкой пресса в конце.","schedule":[{"label":"Пн","name":"Спина + Бицепс + Пресс","rest":false,"exs":["Подтягивания широким прямым хватом к груди","Тяга штанги в наклоне к поясу","Тяга горизонтального блока к поясу","Тяга гантели в наклоне одной рукой","Сгибание рук со штангой стоя","Сгибание рук с гантелями поочерёдно стоя","Планка","Скручивания лёжа на наклонной скамье"]},{"label":"Вт","name":"Отдых","rest":true,"exs":[]},{"label":"Ср","name":"Отдых","rest":true,"exs":[]},{"label":"Чт","name":"Отдых","rest":true,"exs":[]},{"label":"Пт","name":"Отдых","rest":true,"exs":[]},{"label":"Сб","name":"Отдых","rest":true,"exs":[]},{"label":"Вс","name":"Отдых","rest":true,"exs":[]}]},{"id":"split_chest_tri","name":"Сплит: Грудь + Трицепс","level":"Средний","days_week":"1 день/нед","goal":"Масса и сила","desc":"Классический сплит-день на грудь и трицепс. Синергия мышц для максимального роста.","schedule":[{"label":"Пн","name":"Грудь + Трицепс","rest":false,"exs":["Жим штанги лёжа","Жим гантелей лёжа","Жим штанги лёжа под наклоном","Разводка гантелей лёжа","Жим лёжа узким хватом","Отжимания на брусьях","Разгибание руки с гантелью из-за головы"]},{"label":"Вт","name":"Отдых","rest":true,"exs":[]},{"label":"Ср","name":"Отдых","rest":true,"exs":[]},{"label":"Чт","name":"Отдых","rest":true,"exs":[]},{"label":"Пт","name":"Отдых","rest":true,"exs":[]},{"label":"Сб","name":"Отдых","rest":true,"exs":[]},{"label":"Вс","name":"Отдых","rest":true,"exs":[]}]},{"id":"split_shoulders","name":"Сплит: Плечи + Трапеция + Пресс","level":"Средний","days_week":"1 день/нед","goal":"Масса и сила","desc":"День на дельты, трапецию и пресс. Широкие плечи и визуальный V-конус.","schedule":[{"label":"Пн","name":"Плечи + Трапеция + Пресс","rest":false,"exs":["Жим Арнольда","Армейский жим стоя","Разведение рук с гантелями в стороны","Подъём гантелей перед собой","Тяга штанги к подбородку","Планка","Подъём ног в висе","Скручивания лёжа на наклонной скамье"]},{"label":"Вт","name":"Отдых","rest":true,"exs":[]},{"label":"Ср","name":"Отдых","rest":true,"exs":[]},{"label":"Чт","name":"Отдых","rest":true,"exs":[]},{"label":"Пт","name":"Отдых","rest":true,"exs":[]},{"label":"Сб","name":"Отдых","rest":true,"exs":[]},{"label":"Вс","name":"Отдых","rest":true,"exs":[]}]},{"id":"split_legs","name":"Сплит: Ноги + Пресс + Предплечья","level":"Средний","days_week":"1 день/нед","goal":"Масса и сила","desc":"День ног с проработкой пресса и предплечий. Фундамент для всего тела.","schedule":[{"label":"Пн","name":"Ноги + Пресс + Предплечья","rest":false,"exs":["Приседания со штангой","Жим платформы","Разгибание ног в тренажёре","Сгибание ног лёжа","Подъём на носки стоя в тренажёре","Планка","Скручивания лёжа на наклонной скамье","Сгибание кистей со штангой в упоре сидя"]},{"label":"Вт","name":"Отдых","rest":true,"exs":[]},{"label":"Ср","name":"Отдых","rest":true,"exs":[]},{"label":"Чт","name":"Отдых","rest":true,"exs":[]},{"label":"Пт","name":"Отдых","rest":true,"exs":[]},{"label":"Сб","name":"Отдых","rest":true,"exs":[]},{"label":"Вс","name":"Отдых","rest":true,"exs":[]}]},{"id":"split_arms","name":"Сплит: Бицепс + Трицепс + Пресс","level":"Средний","days_week":"1 день/нед","goal":"Масса и рельеф","desc":"Изолированный день на руки. Максимальный пампинг бицепса и трицепса.","schedule":[{"label":"Пн","name":"Бицепс + Трицепс + Пресс","rest":false,"exs":["Сгибание рук со штангой стоя","Сгибание рук с гантелями поочерёдно стоя","Сгибание на скамье Скотта","Жим лёжа узким хватом","Отжимания на брусьях","Разгибание руки с гантелью из-за головы","Планка","Скручивания лёжа на наклонной скамье"]},{"label":"Вт","name":"Отдых","rest":true,"exs":[]},{"label":"Ср","name":"Отдых","rest":true,"exs":[]},{"label":"Чт","name":"Отдых","rest":true,"exs":[]},{"label":"Пт","name":"Отдых","rest":true,"exs":[]},{"label":"Сб","name":"Отдых","rest":true,"exs":[]},{"label":"Вс","name":"Отдых","rest":true,"exs":[]}]},{"id":"fullbody","name":"Тренировка всего тела","level":"Средний","days_week":"3 дня/нед","goal":"Общая форма","desc":"Full body тренировка 3 раза в неделю. Каждая сессия прорабатывает всё тело.","schedule":[{"label":"Пн","name":"Full Body A","rest":false,"exs":["Приседания со штангой","Жим штанги лёжа","Тяга штанги в наклоне к поясу","Армейский жим стоя","Сгибание рук со штангой стоя","Планка"]},{"label":"Вт","name":"Отдых","rest":true,"exs":[]},{"label":"Ср","name":"Full Body B","rest":false,"exs":["Румынская тяга","Жим гантелей лёжа","Подтягивания широким прямым хватом к груди","Жим Арнольда","Жим лёжа узким хватом","Скручивания лёжа на наклонной скамье"]},{"label":"Чт","name":"Отдых","rest":true,"exs":[]},{"label":"Пт","name":"Full Body C","rest":false,"exs":["Жим платформы","Разводка гантелей лёжа","Тяга горизонтального блока к поясу","Разведение рук с гантелями в стороны","Сгибание рук с гантелями поочерёдно стоя","Подъём ног в висе"]},{"label":"Сб","name":"Отдых","rest":true,"exs":[]},{"label":"Вс","name":"Отдых","rest":true,"exs":[]}]},{"id":"beginner_bw","name":"Начальный уровень (своё тело)","level":"Начинающий","days_week":"3 дня/нед","goal":"Основа и выносливость","desc":"Только упражнения с собственным весом. Идеально для старта без оборудования.","schedule":[{"label":"Пн","name":"Верх тела","rest":false,"exs":["Отжимания с узкой постановкой рук","Планка","Боковая планка","Частичный подъём туловища лёжа на полу","Скручивания лёжа на наклонной скамье"]},{"label":"Вт","name":"Отдых","rest":true,"exs":[]},{"label":"Ср","name":"Низ тела","rest":false,"exs":["Воздушные приседания","Выпады с гантелями","Гиперэкстензия","Подъём ног в висе","Планка"]},{"label":"Чт","name":"Отдых","rest":true,"exs":[]},{"label":"Пт","name":"Всё тело","rest":false,"exs":["Отжимания с узкой постановкой рук","Воздушные приседания","Подтягивания параллельным хватом","Планка","Боковая планка","Скручивания лёжа на наклонной скамье"]},{"label":"Сб","name":"Отдых","rest":true,"exs":[]},{"label":"Вс","name":"Отдых","rest":true,"exs":[]}]}];

function togglePrograms(){
  const sec=document.getElementById('prog-section'),arrow=document.getElementById('prog-toggle-arrow');
  if(!sec)return;
  const isOpen = sec.style.display !== 'none' && sec.style.display !== '';
  sec.style.display = isOpen ? 'none' : 'block';
  if(arrow) arrow.style.transform = isOpen ? '' : 'rotate(180deg)';
  if(!isOpen) renderProgList();
}
function renderProgList(){
  const el=document.getElementById('prog-list'),detail=document.getElementById('prog-detail');
  if(!el)return;
  detail.style.display='none'; el.style.display='flex';
  const banner=document.getElementById('active-prog-banner');
  if(activeProgId){const ap=PROGRAMS.find(p=>p.id===activeProgId); if(ap&&banner){banner.style.display='block'; banner.innerHTML=`✅ Активна: <strong>${ap.name}</strong> — ${ap.days_week}`;}}else if(banner)banner.style.display='none';
  el.innerHTML=PROGRAMS.map(p=>`<div class="prog-card-item ${p.id===activeProgId?'active-prog':''}" onclick="viewProgram('${p.id}')"><div class="prog-card-top"><div class="prog-card-name">${p.name}</div>${p.id===activeProgId?'<span style="font-size:11px;color:var(--accent);font-weight:600">✅ Активна</span>':''}</div><div class="prog-card-meta"><span class="prog-meta-tag">${p.level}</span><span class="prog-meta-tag">📅 ${p.days_week}</span><span class="prog-meta-tag">🎯 ${p.goal}</span></div><div class="prog-card-desc">${p.desc}</div></div>`).join('');
}
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
function showProgDay(progId,dayIdx){
  const prog=PROGRAMS.find(p=>p.id===progId); if(!prog)return;
  const day=prog.schedule[dayIdx]; if(!day||day.rest)return;
  const el=document.getElementById('prog-day-expanded'); if(!el)return;
  el.innerHTML=`<div class="prog-day-detail"><div class="prog-day-detail-name">${day.label}: ${day.name}</div><div style="margin-bottom:10px">${day.exs.map(e=>`<span class="prog-ex-chip">${e}</span>`).join('')}</div><button class="prog-start-btn" onclick="startProgDay('${progId}',${dayIdx})">▶ Начать эту тренировку</button></div>`;
  el.scrollIntoView({behavior:'smooth',block:'nearest'});
}
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
function startProgDay(progId,dayIdx){
  const prog=PROGRAMS.find(p=>p.id===progId); if(!prog)return;
  const day=prog.schedule[dayIdx]; if(!day||day.rest)return;
  const allEx=Object.values(ALL_EXERCISES).flat();
  customWt=day.exs.map(name=>{const found=allEx.find(e=>e.n===name); if(found)return {...found,sets_data:Array.from({length:found.s},()=>({r:found.r,kg:found.kg,done:false})),done:false}; return {n:name,s:3,r:12,k:30,kg:0,m:'',sets_data:[{r:12,kg:0,done:false},{r:12,kg:0,done:false},{r:12,kg:0,done:false}],done:false};});
  document.getElementById('exe-title').textContent=day.name;
  showWtScreen('execute'); renderExecute(); updateCtaLabel(); toast('🏋️ '+day.name+' — поехали!');
}
function initPrograms(){if(activeProgId){const banner=document.getElementById('active-prog-banner'),sec=document.getElementById('prog-section'); if(banner&&sec){const ap=PROGRAMS.find(p=>p.id===activeProgId); if(ap){sec.style.display='block';const arrow=document.getElementById('prog-toggle-arrow');if(arrow)arrow.style.transform='rotate(180deg)';renderProgList();}}}}

// ── ТРЕНИРОВКИ (КОНСТРУКТОР + ВЫПОЛНЕНИЕ) ────────────────────
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
function deleteSavedWt(idx){savedWts.splice(idx,1);localStorage.setItem('fs-saved-wts',JSON.stringify(savedWts));renderSavedWts();toast('Шаблон удалён');}

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
function adjPickParam(cat,name,field,delta,idx){
  if(!pickerParams[cat]||!pickerParams[cat][name])return;
  const mins={s:1,r:1,kg:0},maxs={s:10,r:100,kg:500};
  const cur=pickerParams[cat][name][field];
  pickerParams[cat][name][field]=Math.max(mins[field],Math.min(maxs[field],cur+delta));
  const el=document.getElementById(`pp-${field}-${cat}-${idx}`);
  if(el){if(el.tagName==='INPUT')el.value=pickerParams[cat][name][field]; else el.textContent=pickerParams[cat][name][field];}
}
function setPickParam(cat,name,field,val,idx){
  if(!pickerParams[cat]||!pickerParams[cat][name])return;
  const mins={s:1,r:1,kg:0},maxs={s:10,r:100,kg:500};
  val=Math.max(mins[field],Math.min(maxs[field],val));
  val=Math.round(val*10)/10;
  pickerParams[cat][name][field]=val;
  const el=document.getElementById(`pp-${field}-${cat}-${idx}`);
  if(el&&el.tagName==='INPUT')el.value=val;
}
function selectAllExs(){
  if(!activeMuscle)return;
  const exs=ALL_EXERCISES[activeMuscle]||[];
  if(!pickerChecked[activeMuscle])pickerChecked[activeMuscle]=new Set();
  exs.forEach(e=>pickerChecked[activeMuscle].add(e.n));
  renderExPicker(activeMuscle);
}
function clearAllExs(){
  if(!activeMuscle)return;
  pickerChecked[activeMuscle]=new Set();
  renderExPicker(activeMuscle);
}
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

// ── ВЫПОЛНЕНИЕ ТРЕНИРОВКИ (С РЕДАКТИРОВАНИЕМ) ─────────────────
function toggleEditMode(){editMode=!editMode; renderExecute();}
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

function updateSetVal(exIdx,setIdx,field,delta){
  let val=customWt[exIdx].sets_data[setIdx][field]+delta;
  if(val<0)val=0; val=Math.round(val*10)/10;
  customWt[exIdx].sets_data[setIdx][field]=val;
  const unit=field==='kg'?' кг':' повт';
  const el=document.getElementById(`set-${field}-${exIdx}-${setIdx}`);
  if(el){if(el.tagName==='INPUT')el.value=val; else el.textContent=val+unit;}
}
function setSetVal(exIdx,setIdx,field,val){
  if(val<0)val=0; val=Math.round(val*10)/10;
  customWt[exIdx].sets_data[setIdx][field]=val;
}
function toggleSet(exIdx,setIdx){
  customWt[exIdx].sets_data[setIdx].done=!customWt[exIdx].sets_data[setIdx].done;
  const allDone=customWt[exIdx].sets_data.every(s=>s.done);
  customWt[exIdx].done=allDone;
  renderExecute();
}
function toggleExDone(idx){
  const willBeDone=!customWt[idx].done;
  customWt[idx].done=willBeDone;
  if(customWt[idx].sets_data)customWt[idx].sets_data.forEach(s=>s.done=willBeDone);
  renderExecute();
}
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

function cancelWorkout() {
  if (confirm('❌ Отменить тренировку? Весь прогресс будет потерян.')) {
    customWt = [];
    clearWorkoutFlowState();
    showWtScreen('home');
    updateCtaLabel();
    toast('Тренировка отменена');
  }
}

function deleteExercise(idx){
  if(confirm('Удалить упражнение "'+customWt[idx].n+'"?')){customWt.splice(idx,1); renderExecute();}
}
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
let selectedAddCat=null, selectedAddEx=null, addExParams={s:3,r:12,kg:0};
function openAddExerciseSheet(){
  selectedAddCat=null; selectedAddEx=null; addExParams={s:3,r:12,kg:0};
  renderAddMuscleGrid(); document.getElementById('add-ex-sheet').classList.add('show'); document.getElementById('sheet-overlay').classList.add('show');
}
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

// ── ЭНЦИКЛОПЕДИЯ (ОБНОВЛЕННАЯ) ───────────────────────────────
let encCat='all';
let favExs=new Set(JSON.parse(localStorage.getItem('fs-fav-exs')||'[]'));
function filterEnc(cat,btn){encCat=cat; document.querySelectorAll('.enc-filter-btn').forEach(b=>b.classList.remove('enc-filter-active')); if(btn)btn.classList.add('enc-filter-active'); renderEncyclopedia();}
function renderEncyclopedia(){
  const q=(document.getElementById('enc-search')?.value||'').toLowerCase().trim();
  const listEl=document.getElementById('enc-list'); const countEl=document.getElementById('enc-count');
  if(!listEl)return;
  let out='', count=0;
  for(const [cat,exs] of Object.entries(ALL_EXERCISES)){
    if(encCat!=='all' && encCat!=='favs' && encCat!==cat) continue;
    for(let i=0;i<exs.length;i++){
      const e=exs[i];
      const favKey=`${cat}-${i}`;
      if(encCat==='favs' && !favExs.has(favKey)) continue;
      if(q && !e.n.toLowerCase().includes(q)) continue;
      const id=`enc-body-${cat}-${i}`;
      const label={chest:'Грудные',back:'Спина',legs:'Ноги',shoulders:'Плечи',biceps:'Бицепс',triceps:'Трицепс',glutes:'Ягодицы',abs:'Пресс',forearms:'Предплечья',cardio:'Кардио'}[cat]||cat;
      const isFav=favExs.has(favKey);
      out+=`<div class="enc-card"><div class="enc-hdr" onclick="toggleEncCard('${id}')"><div class="enc-name">${e.n}</div><span class="enc-badge">${label}</span><button onclick="event.stopPropagation();toggleFav('${favKey}')" style="background:none;border:none;cursor:pointer;font-size:1rem;padding:2px 6px;flex-shrink:0;line-height:1;" title="${isFav?'Убрать из избранного':'В избранное'}">${isFav?'❤️':'🤍'}</button><span class="enc-arrow" id="arr-${id}">▼</span></div><div class="enc-body" id="${id}"><div class="enc-sec">Описание</div><div class="enc-txt">${e.desc||'Описание отсутствует. Скоро добавим.'}</div><div class="enc-sec">Техника выполнения</div><div class="enc-txt">${e.tech||'Нет данных'}</div></div></div>`;
      count++;
    }
  }
  if(count===0)out='<div style="text-align:center;padding:30px;color:var(--text-muted)">Ничего не найдено 🔍</div>';
  listEl.innerHTML=out; if(countEl)countEl.textContent=count+' упражнений';
  const filterContainer=document.getElementById('enc-filter-btns');
  if(filterContainer){
    const cats=Object.keys(ALL_EXERCISES);
    filterContainer.innerHTML=`<button class="enc-filter-btn enc-filter-active" onclick="filterEnc('all',this)">Все</button>`+cats.map(cat=>`<button class="enc-filter-btn" onclick="filterEnc('${cat}',this)">${({chest:'Грудные',back:'Спина',legs:'Ноги',shoulders:'Плечи',biceps:'Бицепс',triceps:'Трицепс',glutes:'Ягодицы',abs:'Пресс',forearms:'Предплечья',cardio:'Кардио'}[cat]||cat)}</button>`).join('')+`<button class="enc-filter-btn" onclick="filterEnc('favs',this)">❤️ Избранное</button>`;
  }
}
function toggleEncCard(id){const body=document.getElementById(id); const arr=document.getElementById('arr-'+id); if(body){body.classList.toggle('open'); if(arr)arr.classList.toggle('open');}}

// ── КАЛЕНДАРЬ ─────────────────────────────────────────────────
let calCurrentYear=null,calCurrentMonth=null;
function initCalendarDefaults(){const now=new Date(); calCurrentYear=now.getFullYear(); calCurrentMonth=now.getMonth();}
function changeCalMonth(delta){if(calCurrentYear===null)initCalendarDefaults(); calCurrentMonth+=delta; if(calCurrentMonth<0){calCurrentMonth=11; calCurrentYear--;} if(calCurrentMonth>11){calCurrentMonth=0; calCurrentYear++;} renderCalendar();}
function renderCalendar(){
  const grid=document.getElementById('calendar-grid'),detail=document.getElementById('calendar-day-detail'),empty=document.getElementById('calendar-empty'),monthLabel=document.getElementById('cal-month-label');
  if(!grid)return;
  if(calCurrentYear===null)initCalendarDefaults();
  const year=calCurrentYear,month=calCurrentMonth;
  const first=new Date(year,month,1); let firstDay=first.getDay();
  const daysInMonth=new Date(year,month+1,0).getDate();
  const monthNames=['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
  if(monthLabel)monthLabel.textContent=monthNames[month]+' '+year;
  const workoutDays={};
  if(Array.isArray(diary)) diary.forEach(d=>{const key=d.date?d.date.split(',')[0].trim():''; if(key)workoutDays[key]=(workoutDays[key]||0)+1;});
  const plannedDays = getPlannedWorkoutsForMonth(year, month);
  const dayNames=['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];
  let html=dayNames.map(d=>`<div style="text-align:center;font-size:10px;font-weight:700;color:var(--text-light);padding:4px 0;">${d}</div>`).join('');
  html += `<div style="grid-column:1/-1;" class="cal-legend">` +
    `<span class="cal-legend-item"><span class="cal-legend-dot" style="background:var(--accent);"></span>Выполнено</span>` +
    `<span class="cal-legend-item"><span class="cal-legend-dot" style="background:#38bdf8;"></span>По программе</span>` +
    `<span class="cal-legend-item"><span class="cal-legend-dot" style="background:#94a3b8;"></span>День отдыха</span>` +
    `<span class="cal-legend-item"><span class="cal-legend-dot" style="background:var(--accent);opacity:.5;border:1px solid var(--accent);"></span>Сегодня</span>` +
    `</div>`;
  let offset=(firstDay+6)%7; for(let i=0;i<offset;i++)html+='<div></div>';
  for(let d=1;d<=daysInMonth;d++){
    const dd=d.toString().padStart(2,'0');
    const mm=(month+1).toString().padStart(2,'0');
    const dateStr=`${dd}.${mm}.${year}`;
    const isToday=d===new Date().getDate()&&month===new Date().getMonth()&&year===new Date().getFullYear();
    const hasWorkout=workoutDays[dateStr];
    const planned=plannedDays[dateStr];
    const isRest=planned&&planned.rest;
    const isPlanned=planned&&!planned.rest;
    let cellClass='cal-cell';
    if(isToday) cellClass+=' cal-cell-today';
    else if(hasWorkout) cellClass+=' cal-cell-workout';
    else if(isPlanned) cellClass+=' cal-cell-planned';
    else if(isRest) cellClass+=' cal-cell-rest';
    const textColor = isToday ? '#fff' : 'var(--text)';
    const marker = hasWorkout ? '<div style="width:5px;height:5px;border-radius:50%;background:var(--accent);margin:2px auto 0;"></div>'
      : isPlanned ? '<div style="width:5px;height:5px;border-radius:50%;background:#38bdf8;margin:2px auto 0;"></div>'
      : isRest ? '<div style="width:5px;height:5px;border-radius:50%;background:#94a3b8;margin:2px auto 0;"></div>' : '';
    html += `<div onclick="showCalDay('${dateStr}')" class="${cellClass}" style="text-align:center;border-radius:10px;padding:6px 2px;cursor:pointer;font-size:12px;font-weight:600;color:${textColor};border:1.5px solid ${isToday||hasWorkout?'var(--accent)':isPlanned?'#38bdf8':isRest?'#94a3b8':'var(--border)'};">${d}${marker}</div>`;
  }
  grid.innerHTML=html;
  if(detail)detail.style.display='none';
  const anyData = Object.keys(workoutDays).length || Object.keys(plannedDays).length;
  if(empty)empty.style.display=anyData?'none':'block';
}
function showCalDay(dateStr){
  const detail=document.getElementById('calendar-day-detail'),title=document.getElementById('cal-day-title'),entries=document.getElementById('cal-day-entries'),empty=document.getElementById('calendar-empty');
  if(!entries||!title)return;
  const dayDiary=Array.isArray(diary)?diary.filter(d=>d.date&&d.date.startsWith(dateStr)):[];
  const parts = dateStr.split('.');
  const plannedDays = getPlannedWorkoutsForMonth(Number(parts[2]), Number(parts[1])-1);
  const planned = plannedDays[dateStr];
  title.textContent='📅 '+dateStr;
  let blocks = [];
  if(dayDiary.length){
    blocks.push(dayDiary.map(d=>{
      const dIdx=diary.indexOf(d);
      return `<div class="diary-entry" style="position:relative;"><div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;"><div class="diary-title">✅ ${d.type||'Тренировка'}</div><div style="display:flex;gap:4px;flex-shrink:0;"><button onclick="editDiaryFromCal(${dIdx},'${dateStr}')" style="background:none;border:none;color:var(--accent);font-size:1rem;cursor:pointer;padding:2px 6px;border-radius:6px;line-height:1;" title="Редактировать">✏️</button><button onclick="delDiaryFromCal(${dIdx},'${dateStr}')" style="background:none;border:none;color:#ef4444;font-size:1rem;cursor:pointer;padding:2px 6px;border-radius:6px;line-height:1;" title="Удалить">🗑️</button></div></div><div class="diary-exs">${(d.exercises||'').split('\n').join('<br>')}</div>${d.kcal?`<span class="badge green">${d.kcal} ккал</span>`:''}</div>`;
    }).join(''));
  }
  if(planned && !planned.rest){
    blocks.push(`<div class="diary-entry" style="border-color:#38bdf8;"><div class="diary-title" style="color:#38bdf8;">📋 По программе: ${planned.name}</div><div class="diary-exs">${(planned.exs||[]).join('<br>')}</div><button onclick="startPlannedWorkoutByDate('${dateStr}')" style="margin-top:10px;width:100%;padding:10px;border-radius:12px;background:#38bdf8;color:#fff;font-weight:700;border:none;cursor:pointer;">➕ Добавить тренировку</button></div>`);
}
  if(planned && planned.rest && !dayDiary.length){
    blocks.push('<div style="color:var(--text-light);font-size:0.85rem;padding:6px 0;">⚪ По программе — день отдыха</div>');
  }
  if(!blocks.length){
    blocks.push('<div style="color:var(--text-light);font-size:0.85rem;padding:6px 0;">Тренировок нет</div>');
  }
  blocks.push(`<button onclick="openCalAddSheet('${dateStr}')" style="margin-top:8px;width:100%;padding:11px;border-radius:12px;background:var(--card-inner);color:var(--accent);font-weight:700;font-size:14px;border:1.5px dashed var(--accent);cursor:pointer;">➕ Добавить тренировку на этот день</button>`);
  entries.innerHTML = blocks.join('');
  if(detail)detail.style.display='block';
  if(empty)empty.style.display='none';
}


// ── ДОБАВЛЕНИЕ ТРЕНИРОВКИ ИЗ КАЛЕНДАРЯ (одним нажатием) ──────
function openCalAddSheet(dateStr) {
  const parts = dateStr.split('.');
  const d = new Date(Number(parts[2]), Number(parts[1])-1, Number(parts[0]));
  const dateForDiary = d.toLocaleDateString('ru');
  const exists = diary.some(e => e.date && e.date.startsWith(dateStr) || e.date === dateForDiary);
  if(exists) {
    toast('⚠️ Тренировка на этот день уже есть');
    return;
  }
  diary.push({
    date: dateForDiary,
    type: 'Тренировка',
    exercises: '—',
    kcal: 0
  });
  localStorage.setItem('fs-diary', JSON.stringify(diary));
  toast('✅ Тренировка добавлена');
  renderCalendar();
  setTimeout(() => showCalDay(dateStr), 150);
}

// ── ГОЛОСОВОЙ ВВОД ───────────────────────────────────────────
let recognition=null,isListening=false;
function toggleVoice(){
  if(!('webkitSpeechRecognition' in window)&&!('SpeechRecognition' in window)){toast('❌ Голосовой ввод не поддерживается в этом браузере');return;}
  if(isListening)stopVoice(); else startVoice();
}
function startVoice(){
  const SpeechRec=window.SpeechRecognition||window.webkitSpeechRecognition;
  recognition=new SpeechRec(); recognition.lang='ru-RU'; recognition.continuous=false; recognition.interimResults=false;
  recognition.onstart=()=>{isListening=true; document.getElementById('nav-mic-btn').classList.add('listening'); showVoiceResult('🎤 Слушаю...');};
  recognition.onresult=(e)=>{const text=e.results[0][0].transcript; handleVoiceResult(text);};
  recognition.onerror=(e)=>{if(e.error==='not-allowed')toast('❌ Нет доступа к микрофону'); else toast('❌ Ошибка: '+e.error);};
  recognition.onend=()=>{stopVoice();};
  recognition.start();
}
function stopVoice(){isListening=false; const btn=document.getElementById('nav-mic-btn'); if(btn)btn.classList.remove('listening'); if(recognition){try{recognition.stop();}catch(e){} recognition=null;} setTimeout(()=>hideVoiceResult(),2500);}
function showVoiceResult(text){const el=document.getElementById('voice-result'); if(el){el.textContent=text; el.classList.add('show');}}
function hideVoiceResult(){const el=document.getElementById('voice-result'); if(el)el.classList.remove('show');}
function handleVoiceResult(text){
  const builderVisible=document.getElementById('wt-builder')?.style.display!=='none';
  if(currentPage==='workout'&&builderVisible){handleVoiceForBuilder(text);return;}
  if(currentPage==='nutrition'){handleVoiceForNutrition(text);showVoiceResult('✅ "'+text+'"');return;}
  const active=document.activeElement;
  if(active&&(active.tagName==='INPUT'||active.tagName==='TEXTAREA')){
    if(active.type==='number'){const m=text.match(/(\d+(?:[.,]\d+)?)/); if(m){active.value=m[1].replace(',','.');}}else{active.value=text;}
    active.dispatchEvent(new Event('input')); showVoiceResult('✅ "'+text+'"');return;
  }
  if(currentPage==='encyclopedia'){const enc=document.getElementById('enc-search'); if(enc){enc.value=text; enc.dispatchEvent(new Event('input'));} showVoiceResult('🔍 "'+text+'"');return;}
  toast('🎤 "'+text+'"'); showVoiceResult('🎤 "'+text+'"');
}
const WORDS_TO_NUM={'один':1,'одного':1,'одну':1,'одним':1,'два':2,'две':2,'двух':2,'двумя':2,'три':3,'трёх':3,'тремя':3,'четыре':4,'четырёх':4,'четырьмя':4,'пять':5,'пяти':5,'пятью':5,'шесть':6,'шести':6,'шестью':6,'семь':7,'семи':7,'семью':7,'восемь':8,'восьми':8,'восемью':8,'девять':9,'девяти':9,'девятью':9,'десять':10,'десяти':10,'десятью':10,'одиннадцать':11,'двенадцать':12,'тринадцать':13,'четырнадцать':14,'пятнадцать':15,'шестнадцать':16,'семнадцать':17,'восемнадцать':18,'девятнадцать':19,'двадцать':20};
function parseWordNum(str){const n=parseInt(str); if(!isNaN(n))return n; return WORDS_TO_NUM[str.toLowerCase()]||null;}
function fuzzyMatchExercise(query){
  query=query.toLowerCase().trim(); const allEx=[]; for(const [cat,exs] of Object.entries(ALL_EXERCISES)){for(const e of exs)allEx.push({...e,cat});}
  const qWords=query.split(/\s+/).filter(w=>w.length>2); let best=null,bestScore=0;
  for(const e of allEx){const name=e.n.toLowerCase(); let score=0; if(name.includes(query))score+=100; for(const w of qWords){if(name.includes(w))score+=10;} for(const w of qWords){if(w.length>=4){const nWords=name.split(/\s+/); for(const nw of nWords){if(nw.startsWith(w.substring(0,4)))score+=5;}}} if(score>bestScore){bestScore=score; best=e;}}
  return bestScore>=5?best:null;
}
function parseVoiceForBuilder(text){
  const lower=text.toLowerCase(); let sets=null,reps=null,kg=null;
  const setsMatch=lower.match(/(\w+)\s+(?:подход|сет|подхода|подходов|сетов|сета)/); if(setsMatch)sets=parseWordNum(setsMatch[1]);
  const repsMatch=lower.match(/(?:по\s+)?(\w+)\s+(?:раз|повтор|повторени|повторений|повторения)/); if(repsMatch)reps=parseWordNum(repsMatch[1]);
  if(!reps){const byMatch=lower.match(/по\s+(\w+)/); if(byMatch)reps=parseWordNum(byMatch[1]);}
  const kgMatch=lower.match(/(\d+)\s*(?:кг|килограмм|кило)/); if(kgMatch)kg=parseInt(kgMatch[1]);
  let exName=lower.replace(/(\w+\s+)?(?:подход|сет|подхода|подходов|сетов|сета)/g,'').replace(/(?:по\s+)?(?:\w+\s+)?(?:раз|повтор|повторени[а-я]*)/g,'').replace(/по\s+\w+/g,'').replace(/\d+\s*(?:кг|килограмм|кило)?/g,'').replace(/\s+/g,' ').trim();
  return {exName,sets:sets||3,reps:reps||10,kg:kg||0};
}
function handleVoiceForBuilder(text){
  const {exName,sets,reps,kg}=parseVoiceForBuilder(text);
  if(!exName||exName.length<2){toast('🎤 Не удалось распознать упражнение');return;}
  const found=fuzzyMatchExercise(exName); if(!found){toast('🎤 Упражнение не найдено: "'+exName+'"');return;}
  selectMuscle(found.cat);
  if(!pickerChecked[found.cat])pickerChecked[found.cat]=new Set();
  pickerChecked[found.cat].add(found.n);
  if(!pickerParams[found.cat])pickerParams[found.cat]={};
  pickerParams[found.cat][found.n]={s:sets,r:reps,kg:kg||found.kg};
  renderExPicker(found.cat); updateBldStartBar();
  showVoiceResult('✅ '+found.n+' — '+sets+'×'+reps+(kg?' · '+kg+' кг':''));
  toast('✅ Добавлено: '+found.n);
}
function handleVoiceForNutrition(text){
  const lower=text.toLowerCase(); const weightMatch=lower.match(/(\d+(?:[.,]\d+)?)\s*(грамм|гр|г)\b/); let grams=null; if(weightMatch)grams=parseFloat(weightMatch[1].replace(',','.'));
  let namePart=lower.replace(/на завтрак|на обед|на ужин|перекус/gi,'').trim(); if(weightMatch)namePart=namePart.slice(0,weightMatch.index).trim();
  let mealName=namePart.replace(/[^a-zа-яё0-9\s]/gi,' ').replace(/\s+/g,' ').trim();
  const nameInput=document.getElementById('nutr-meal-name'); if(nameInput&&mealName)nameInput.value=mealName;
  if(grams&&nameInput)nameInput.value=(mealName||'продукт')+' ('+grams+' г)';
}
let nutrEntries=JSON.parse(localStorage.getItem('fs-nutrition')||'[]');
function renderNutrEntries(){
  const today=new Date().toLocaleDateString('ru-RU'); const todayEntries=nutrEntries.filter(e=>e.date===today); const list=document.getElementById('nutr-entries-list');
  if(!list)return;
  list.innerHTML=todayEntries.length?todayEntries.map((e,i)=>`<div style="background:var(--card-inner);border-radius:10px;padding:10px 12px;display:flex;justify-content:space-between;align-items:center"><div><div style="font-weight:600;font-size:14px">${e.name}</div><div style="font-size:12px;color:var(--text-lig)">${e.kcal} ккал · Б:${e.protein}г · У:${e.carbs}г · Ж:${e.fat}г</div></div><button onclick="removeNutrEntry(${i})" style="background:none;border:none;color:#f87171;font-size:18px;cursor:pointer">✕</button></div>`).join(''):'<div style="text-align:center;color:var(--text-lig);font-size:14px;padding:20px">Ничего не добавлено</div>';
  const totals=todayEntries.reduce((a,e)=>({kcal:a.kcal+(+e.kcal||0),protein:a.protein+(+e.protein||0),carbs:a.carbs+(+e.carbs||0),fat:a.fat+(+e.fat||0)}),{kcal:0,protein:0,carbs:0,fat:0});
  ['kcal','protein','carbs','fat'].forEach(k=>{const el=document.getElementById('nutr-total-'+k); if(el)el.textContent=totals[k];});
}
function addNutrEntry(){
  const name=document.getElementById('nutr-meal-name').value.trim()||'Блюдо';
  const kcal=document.getElementById('nutr-kcal').value||0;
  const protein=document.getElementById('nutr-protein').value||0;
  const carbs=document.getElementById('nutr-carbs').value||0;
  const fat=document.getElementById('nutr-fat').value||0;
  nutrEntries.push({id:Date.now()+'_'+Math.random().toString(36).slice(2),name,kcal,protein,carbs,fat,date:new Date().toLocaleDateString('ru-RU')});
  localStorage.setItem('fs-nutrition',JSON.stringify(nutrEntries));
  ['nutr-meal-name','nutr-kcal','nutr-protein','nutr-carbs','nutr-fat'].forEach(id=>{const el=document.getElementById(id); if(el)el.value='';});
  renderNutrEntries();
}
function removeNutrEntry(idx){
  const today=new Date().toLocaleDateString('ru-RU');
  let todayEntries=nutrEntries.filter(e=>e.date===today);
  const removed=todayEntries[idx];
  if(!removed)return;
  if(!confirm('Удалить запись «'+removed.name+'»?'))return;
  if(removed.id){
    nutrEntries=nutrEntries.filter(e=>e.id!==removed.id);
  } else {
    let once=false;
    nutrEntries=nutrEntries.filter(e=>{
      if(!once&&e.name===removed.name&&e.kcal===removed.kcal&&e.date===removed.date){once=true;return false;}
      return true;
    });
  }
  localStorage.setItem('fs-nutrition',JSON.stringify(nutrEntries));
  renderNutrEntries();
  toast('🗑 Запись удалена');
}
// ── ИНИЦИАЛИЗАЦИЯ ЕДИНОЙ БАЗЫ УПРАЖНЕНИЙ ─────────────────────
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

// ==================== ИСПРАВЛЕННЫЙ window.onload ====================
window.onload = function() {
  if (profile) { renderHome(); }
  initPrograms();
  renderEncyclopedia();
  renderNutrEntries();

  // Восстановление напоминаний о воде
  if (reminderEnabled) {
    if (Notification.permission === "granted") {
      startWaterReminders();
    } else if (Notification.permission !== "denied") {
      requestNotificationPermission();
    } else {
      toast("🔕 Уведомления заблокированы. Включите их в настройках браузера для работы напоминаний о воде.");
    }
  }
  updateReminderUI();

  document.getElementById('save-ex-params-btn').addEventListener('click', saveExerciseParams);
  document.getElementById('confirm-add-ex-btn').addEventListener('click', confirmAddExercise);
};

const DIET_PREFS_OPTIONS=[
  {id:'vegetarian',label:'🥗 Вегетарианец'},
  {id:'vegan',label:'🌿 Веган'},
  {id:'no_lactose',label:'🥛 Без лактозы'},
  {id:'no_gluten',label:'🌾 Без глютена'},
  {id:'no_sugar',label:'🍬 Без сахара'},
  {id:'halal',label:'☪️ Халяль'},
  {id:'keto',label:'🥩 Кето'},
  {id:'counting',label:'📊 Считаю ккал'},
];
function renderDietPrefs(){
  const grid=document.getElementById('diet-prefs-grid');
  if(!grid)return;
  const prefs=(profile&&profile.dietPrefs)?profile.dietPrefs:[];
  grid.innerHTML=DIET_PREFS_OPTIONS.map(o=>{
    const active=prefs.includes(o.id);
    return `<button onclick="toggleDietPref('${o.id}')" style="padding:8px 14px;border-radius:20px;font-size:13px;font-weight:600;cursor:pointer;border:1.5px solid ${active?'var(--accent)':'var(--border)'};background:${active?'var(--accent)':'var(--input-bg)'};color:${active?'#fff':'var(--text)'};transition:all .2s;">${o.label}</button>`;
  }).join('');
}
function toggleDietPref(id){
  if(!profile)return;
  if(!profile.dietPrefs)profile.dietPrefs=[];
  const i=profile.dietPrefs.indexOf(id);
  if(i===-1)profile.dietPrefs.push(id);
  else profile.dietPrefs.splice(i,1);
  localStorage.setItem('fs-profile',JSON.stringify(profile));
  renderDietPrefs();
  toast(profile.dietPrefs.includes(id)?'✅ Предпочтение добавлено':'🗑 Предпочтение убрано');
}

// ==================== ИСПРАВЛЕННАЯ renderWaterWeek (единый ISO-формат) ====================
function renderWaterWeek() {
  const el = document.getElementById('water-week-chart');
  if (!el) return;
  if (!profile) return; // защита

  const today = new Date();
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateStrISO = d.toISOString().split('T')[0];
    const inHistory = waterHistory.find(h => h.date === dateStrISO);
    const isToday = (i === 0);
    const amount = isToday ? waterData.amount : (inHistory ? inHistory.amount : 0);
    const weekDay = d.toLocaleDateString('ru-RU', { weekday: 'short' });
    days.push({ label: weekDay, amount, isToday });
  }
  const goal = profile.weight ? Math.round(profile.weight * 30) : 2000;
  const maxA = Math.max(...days.map(d => d.amount), goal, 1);
  const bars = days.map(d => {
    const pct = Math.min(100, Math.round(d.amount / maxA * 100));
    const reached = d.amount >= goal;
    const color = d.isToday ? 'var(--accent)' : (reached ? '#29b6f6' : 'var(--border)');
    const amtLabel = d.amount > 0 ? (d.amount >= 1000 ? (d.amount / 1000).toFixed(1) + 'л' : d.amount + 'мл') : '';
    return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:2px;">
      <div style="font-size:9px;color:var(--text-light);font-weight:600;height:14px;line-height:14px;">${amtLabel}</div>
      <div style="flex:1;width:100%;background:var(--input-bg);border-radius:4px;overflow:hidden;min-height:44px;display:flex;align-items:flex-end;">
        <div style="width:100%;height:${pct}%;background:${color};border-radius:4px;min-height:${d.amount > 0 ? 3 : 0}px;transition:height .4s;"></div>
      </div>
      <div style="font-size:9px;font-weight:${d.isToday ? 700 : 400};color:${d.isToday ? 'var(--accent)' : 'var(--text-light)'};">${d.label}</div>
    </div>`;
  }).join('');
  el.innerHTML = `<div style="font-size:11px;color:var(--text-light);font-weight:600;margin-bottom:6px;">💧 За 7 дней</div><div style="display:flex;gap:4px;height:80px;">${bars}</div>`;
}

function renderBodyChart(){
  const metric=document.getElementById('body-chart-metric')?.value||'waist';
  const el=document.getElementById('body-chart-canvas');
  if(!el)return;
  const sorted=[...bodyLog].filter(e=>e[metric]!==undefined&&e[metric]!==null&&e[metric]!=='').sort((a,b)=>a.date.localeCompare(b.date));
  if(sorted.length<2){
    el.innerHTML='<div style="text-align:center;color:var(--text-light);font-size:13px;padding:16px 0;">Нужно минимум 2 записи для графика</div>';
    return;
  }
  const vals=sorted.map(e=>parseFloat(e[metric]));
  const dates=sorted.map(e=>e.date);
  const minV=Math.min(...vals),maxV=Math.max(...vals);
  const range=maxV-minV||1;
  const W=280,H=90,padX=10,padY=14;
  const xs=vals.map((_,i)=>padX+(i/(vals.length-1))*(W-2*padX));
  const ys=vals.map(v=>H-padY-((v-minV)/range)*(H-2*padY));
  const polyPts=xs.map((x,i)=>`${x},${ys[i]}`).join(' ');
  const areaBot=H-padY;
  const areaPts=`${xs[0]},${areaBot} ${polyPts} ${xs[xs.length-1]},${areaBot}`;
  const circles=vals.map((v,i)=>`
    <circle cx="${xs[i]}" cy="${ys[i]}" r="3.5" fill="var(--accent)"/>
    <text x="${xs[i]}" y="${ys[i]-7}" text-anchor="middle" font-size="8" fill="var(--text-light)">${v}</text>
  `).join('');
  const xLabels=`
    <text x="${xs[0]}" y="${H+8}" text-anchor="middle" font-size="8" fill="var(--text-light)">${dates[0].split('.').slice(0,2).join('.')}</text>
    <text x="${xs[xs.length-1]}" y="${H+8}" text-anchor="end" font-size="8" fill="var(--text-light)">${dates[dates.length-1].split('.').slice(0,2).join('.')}</text>
  `;
  const metricLabel={waist:'Талия',chest:'Грудь',bicep:'Бицепс',thigh:'Бедро',neck:'Шея',forearm:'Предплечье',glutes:'Ягодицы',calf:'Голень'}[metric]||metric;
  el.innerHTML=`<div style="font-size:11px;color:var(--text-light);font-weight:600;margin-bottom:6px;">${metricLabel}: ${vals[0]} → ${vals[vals.length-1]} см</div>
  <svg viewBox="0 0 ${W} ${H+12}" style="width:100%;overflow:visible;">
    <defs><linearGradient id="bcg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="var(--accent)" stop-opacity="0.25"/><stop offset="100%" stop-color="var(--accent)" stop-opacity="0"/></linearGradient></defs>
    <polygon points="${areaPts}" fill="url(#bcg)"/>
    <polyline points="${polyPts}" fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
    ${circles}${xLabels}
  </svg>`;
}

function toggleFav(favKey){
  if(favExs.has(favKey))favExs.delete(favKey);
  else favExs.add(favKey);
  localStorage.setItem('fs-fav-exs',JSON.stringify([...favExs]));
  renderEncyclopedia();
  toast(favExs.has(favKey)?'❤️ Добавлено в избранное':'🤍 Убрано из избранного');
}

// Экспорт всех необходимых функций в глобальную область видимости
window.goTo = goTo;
window.toggleTheme = toggleTheme;
window.closeAllSheets = closeAllSheets;
window.ctaAction = ctaAction;
window.renderStats = renderStats;
window.renderHome = renderHome;
window.renderDiary = renderDiary;
window.renderProgress = renderProgress;
window.openBodySheet = openBodySheet;
window.addBody = addBody;
window.delDiary = delDiary;
window.delDiaryFromCal = delDiaryFromCal;
window.editDiaryFromCal = editDiaryFromCal;
window.saveCalEdit = saveCalEdit;
window.closeCalEdit = closeCalEdit;
window.delWeight = delWeight;
window.delBody = delBody;
window.runSimulation = runSimulation;
window.togglePrograms = togglePrograms;
window.viewProgram = viewProgram;
window.showProgDay = showProgDay;
window.setActiveProgram = setActiveProgram;
window.startProgDay = startProgDay;
window.renderProgList = renderProgList;
window.showWtScreen = showWtScreen;
window.startCustomWorkout = startCustomWorkout;
window.toggleEditMode = toggleEditMode;
window.toggleExDone = toggleExDone;
window.toggleSet = toggleSet;
window.updateSetVal = updateSetVal;
window.setSetVal = setSetVal;
window.editExercise = editExercise;
window.deleteExercise = deleteExercise;
window.openAddExerciseSheet = openAddExerciseSheet;
window.selectAddMuscle = selectAddMuscle;
window.selectAddExercise = selectAddExercise;
window.confirmAddExercise = confirmAddExercise;
window.confirmBackFromWorkout = confirmBackFromWorkout;
window.finishCustomWorkout = finishCustomWorkout;
window.cancelWorkout = cancelWorkout;
window.renderEncyclopedia = renderEncyclopedia;
window.filterEnc = filterEnc;
window.toggleEncCard = toggleEncCard;
window.toggleFav = toggleFav;
window.changeCalMonth = changeCalMonth;
window.renderCalendar = renderCalendar;
window.showCalDay = showCalDay;
window.startPlannedWorkoutByDate = startPlannedWorkoutByDate;
window.openCalAddSheet = openCalAddSheet;
window.toggleVoice = toggleVoice;
window.addNutrEntry = addNutrEntry;
window.removeNutrEntry = removeNutrEntry;
window.toggleDietPref = toggleDietPref;
window.addWater = addWater;
window.toggleWaterReminders = toggleWaterReminders;
window.selectMuscle = selectMuscle;
window.togglePickEx = togglePickEx;
window.adjPickParam = adjPickParam;
window.setPickParam = setPickParam;
window.selectAllExs = selectAllExs;
window.clearAllExs = clearAllExs;
window.loadSavedWt = loadSavedWt;
window.deleteSavedWt = deleteSavedWt;
window.renderBodyChart = renderBodyChart;
window.saveProfile = saveProfile;
window.loadProfileToForm = loadProfileToForm;