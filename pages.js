// pages.js — Исправленная версия (календарь объединён, дубликат удалён)
// FIX: добавлены уникальные id тренировкам, обновление календаря после удаления,
//      редактирование и удаление по id
// FIX: убраны кнопки добавления тренировки из календаря, скрыта CTA-кнопка на календаре

// ==================== НАВИГАЦИЯ ====================
const PAGE_IDS = ['home','nutrition','foodpick','stats','diary','profile','simulation','workout','calendar','ai','encyclopedia'];
const NAV_IDS  = ['nav-home','nav-workout','nav-ai-btn','nav-nutrition','nav-calendar'];
const CTA_LABELS = {
  home:'Начать тренировку',
  calendar:'+ Добавить тренировку',
  nutrition:'+ Добавить приём пищи',
  workout:'Сохранить тренировку',
  stats:'Обновить данные',
  diary:'+ Замеры тела',
  profile:'Сохранить профиль',
  simulation:'Рассчитать'
};
let currentPage = 'home';

function updateCtaLabel(){
  const btn = document.getElementById('cta-btn');
  if(!btn) return;
  const cta = document.querySelector('.bottom-cta');
  // Скрываем на страницах, где кнопка не нужна
  if(currentPage === 'nutrition' || currentPage === 'foodpick' || currentPage === 'home' || currentPage === 'calendar' || currentPage === 'ai' || currentPage === 'diary' || currentPage === 'encyclopedia' || currentPage === 'profile'){
    if(cta) cta.style.display = 'none';
    return;
  }
  if(cta) cta.style.display = 'block';
  if(currentPage === 'workout'){
    if(currentWtScreen === 'home'){
      if(cta) cta.style.display = 'none';
      return;
    }
    // FIX: на execute своя панель кнопок в #execute-buttons — глобальная CTA не нужна
    // и перекрывала кнопку «+ Добавить"
    if(currentWtScreen === 'execute'){
      if(cta) cta.style.display = 'none';
      return;
    } else if(currentWtScreen === 'builder'){
      if(Array.isArray(customWt) && customWt.length){
        btn.textContent = '▶ Начать тренировку';
      } else {
        if(cta) cta.style.display = 'none';
        return;
      }
    } else {
      if(cta) cta.style.display = 'none';
      return;
    }
    return;
  }
  btn.textContent = CTA_LABELS[currentPage] || 'Начать тренировку';
}

function goTo(id, title) {
  if (currentPage === 'workout') saveWorkoutFlowState();
  currentPage = id;

  PAGE_IDS.forEach(p => {
    const el = document.getElementById('page-'+p);
    if (el) el.classList.toggle('active', p === id);
  });

  const NAV_MAP = {
    home: 'nav-home',
    workout: 'nav-workout',
    ai: 'nav-ai-btn',
    nutrition: 'nav-nutrition',
    calendar: 'nav-calendar',
  };
  NAV_IDS.forEach(n => {
    const el = document.getElementById(n);
    if (el) el.classList.remove('active');
  });
  const activeNav = NAV_MAP[id];
  if (activeNav) {
    const el = document.getElementById(activeNav);
    if (el) el.classList.add('active');
  }

  document.getElementById('header-title').textContent = title || 'FitSim';
  updateCtaLabel();

  if (id === 'stats') renderStats();
  if (id === 'home') renderHome();
  if (id === 'diary') { requestAnimationFrame(() => setTimeout(() => { renderBodyLog(); }, 50)); }
  if (id === 'nutrition') { renderNutrEntries(); renderDietPrefs(); renderNutrQuickCard(); }
  if (id === 'profile') { loadProfileToForm(); renderStats(); }
  if (id === 'calendar') renderCalendar();
  if (id === 'encyclopedia') {
    ['enc-search','kb-food-search','supp-search'].forEach(key=>{
      const input=document.getElementById(key);if(input)input.value='';
    });
    if(typeof encCat!=='undefined')encCat='all';
    if(typeof kbFoodFilter!=='undefined')kbFoodFilter='all';
    if(typeof syncSearchClearButtons==='function')syncSearchClearButtons();
    if(typeof renderEncyclopedia==='function')renderEncyclopedia();
    if(typeof openKnowledgeSection==='function')openKnowledgeSection('home');
  }
  if (id === 'workout') {
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

  updateCtaLabel();

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    });
  });
}
window.goTo = goTo;

function ctaAction() {
  const actions = {
    calendar: () => goTo('workout','Тренировка'),
    home: () => goTo('workout','Тренировка'),
    workout: () => {
      if (currentWtScreen === 'execute' && Array.isArray(customWt) && customWt.length) {
        saveCurrentWorkout();
        return;
      }
      if (currentWtScreen === 'builder' && Array.isArray(customWt) && customWt.length) {
        startCustomWorkout();
        return;
      }
    },
    stats: renderStats,
    diary: openBodySheet,
    profile: saveProfile,
    simulation: runSimulation,
    nutrition: openMealPickerSheet
  };
  (actions[currentPage] || (() => {}))();
}
window.ctaAction = ctaAction;


function saveCurrentWorkout() {
  if (!Array.isArray(customWt) || !customWt.length) {
    toast('Нет упражнений для сохранения');
    return;
  }

  const date = workoutDiaryDate();
  if(!date){toast('Укажи корректную дату тренировки');return;}
  const completedExercises = customWt.map(ex => ({
    name: String(ex.name || ex.n || 'Упражнение').trim(),
    sets: Math.max(0, Number(ex.sets ?? ex.s ?? 0)),
    reps: Math.max(0, Number(ex.reps ?? ex.r ?? 0)),
    kg: Math.max(0, Number(ex.kg ?? ex.weight ?? 0))
  }));

  const exercises = completedExercises.map(ex => {
    const load = ex.kg ? ` (${ex.kg} кг)` : '';
    return `${ex.name}: ${ex.sets}×${ex.reps}${load}`;
  }).join('\n');

  const kcal = typeof calcWorkoutCalories === 'function'
    ? Math.round(Number(calcWorkoutCalories(customWt)) || 0)
    : 0;

  const entry = {
    id: typeof generateWorkoutId === 'function'
      ? generateWorkoutId()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    date,
    type: 'Тренировка',
    exercises,
    kcal
  };

  if (!Array.isArray(diary)) diary = [];
  diary.unshift(entry);
  sortWorkoutRecords(diary,{});
  localStorage.setItem('fs-diary', JSON.stringify(diary));

  if (!exlog || typeof exlog !== 'object' || Array.isArray(exlog)) exlog = {};
  completedExercises.forEach(ex => {
    if (!ex.name) return;
    if (!Array.isArray(exlog[ex.name])) exlog[ex.name] = [];
    exlog[ex.name].push({ date, kg: ex.kg, s: ex.sets, r: ex.reps });
  });
  sortWorkoutRecords(diary,exlog);
  localStorage.setItem('fs-exlog', JSON.stringify(exlog));

  customWt = [];
  currentWtScreen = 'home';
  clearWorkoutFlowState();

  // showWtScreen может не скрыть экран выполнения, если его внутреннее
  // состояние ещё хранит старую тренировку. Явно возвращаем домашний экран.
  if (typeof showWtScreen === 'function') showWtScreen('home');
  currentWtScreen = 'home';
  const executeScreen = document.getElementById('wt-execute');
  const builderScreen = document.getElementById('wt-builder');
  const homeScreen = document.getElementById('wt-home');
  const builderBar = document.getElementById('bld-start-bar');
  if (executeScreen) executeScreen.style.display = 'none';
  if (builderScreen) builderScreen.style.display = 'none';
  if (homeScreen) homeScreen.style.display = 'block';
  if (builderBar) builderBar.style.display = 'none';

  if (typeof renderDiary === 'function') renderDiary();
  if (typeof renderCalendar === 'function') renderCalendar();
  if (typeof renderProgress === 'function') renderProgress();
  updateCtaLabel();
  toast('Тренировка сохранена');
}
window.saveCurrentWorkout = saveCurrentWorkout;

// ==================== HOME ====================
function renderHome() {
  profile = JSON.parse(localStorage.getItem('fs-profile') || 'null');
  if (!profile) return;

  document.getElementById('home-empty').style.display = 'none';
  document.getElementById('home-content').style.display = 'block';

  const lastWorkoutDiv = document.getElementById('last-workout-info');
  if (lastWorkoutDiv) {
    if (diary.length > 0) {
      const last = diary[0];
      let dateDisplay = last.date;
      if (dateDisplay.includes(',')) dateDisplay = dateDisplay.split(',')[0];
      lastWorkoutDiv.textContent = String(last.type || 'Тренировка').replace(/\s*\+\s*/g, ' · ') + (dateDisplay ? ' ' + dateDisplay : '');
    } else {
      lastWorkoutDiv.innerHTML = `Нет тренировок`;
    }
  }

  renderWater();
  updateReminderUI();

  const scrollArea = document.querySelector('.scroll-area');
  if (scrollArea) scrollArea.scrollTop = 0;
}
window.renderHome = renderHome;

// ==================== STATS ====================
function renderStats() {
  if (!profile) return;

  const bmr      = Math.round(calcBMR(profile));
  const baseTdee = Math.round(bmr * profile.activity);

  // ── Поправка на стаж тренировок ──
  const expVal   = parseFloat(profile.exp || 0);
  const coachVal = profile.coach || 'no';
  const expFactors = { 0: 0.97, 0.5: 0.98, 1: 1.00, 2: 1.02, 3: 1.04, 5: 1.06 };
  let expFactor = expFactors[expVal] !== undefined ? expFactors[expVal] : 1.00;
  if (coachVal === 'now' || coachVal === 'past') expFactor = Math.min(expFactor + 0.01, 1.07);
  const tdee     = Math.round(baseTdee * expFactor);
  const expDelta = tdee - baseTdee;

  // Авто-коррекция цели по соотношению текущего и целевого веса
  const w = +profile.weight;
  const t = +profile.target;
  let smartGoal = profile.goal;
  if (w && t) {
    if      (t > w + 1)  smartGoal = 'gain';
    else if (t < w - 1)  smartGoal = 'loss';
    else                  smartGoal = 'maintain';
  }
  const contradiction = profile.goal && smartGoal !== profile.goal;
  if (contradiction) {
    profile.goal = smartGoal;
    const sel = document.getElementById('p-goal');
    if (sel) sel.value = smartGoal;
    localStorage.setItem('fs-profile', JSON.stringify(profile));
  }

  // Рекомендация с учётом возраста
  const _statsAge = Number(profile.age) || 25;
  let rec = tdee;
  if (profile.goal === 'loss') rec -= (_statsAge > 55 ? 300 : 400);
  if (profile.goal === 'gain') rec += (_statsAge > 55 ? 200 : 300);
  rec = Math.max(1200, rec);

  const ideal = t ? t + ' кг' : '—';
  document.getElementById('s-ideal').textContent = ideal;
  document.getElementById('s-bmr').textContent   = bmr  + ' ккал';
  document.getElementById('s-tdee').textContent  = tdee + ' ккал';
  document.getElementById('s-kcal').textContent  = rec  + ' ккал';
  // сохраняем поправку в глобал для попапа
  window._expDelta = expDelta;
  window._expFactor = expFactor;
  window._expVal = expVal;
  window._coachVal = coachVal;

  // ===== ИМТ =====
  const h_m = (profile.height || 175) / 100;
  const curBMI  = profile.weight ? +(profile.weight / (h_m * h_m)).toFixed(1) : null;
  const targBMI = t               ? +(t              / (h_m * h_m)).toFixed(1) : null;
  const bmiEl    = document.getElementById('s-bmi');
  const bmiBadge = document.getElementById('s-bmi-badge');
  const bmiLabel = document.getElementById('s-bmi-label');
  function bmiCategory(b) {
    if (b < 16)   return { label: 'Критический дефицит', color: '#b91c1c', bg: 'rgba(185,28,28,0.12)' };
    if (b < 18.5) return { label: 'Дефицит массы',       color: '#d97706', bg: 'rgba(217,119,6,0.12)' };
    if (b < 25)   return { label: 'Норма',                color: '#16a34a', bg: 'rgba(22,163,74,0.12)' };
    if (b < 27)   return { label: 'Предызбыток',          color: '#84cc16', bg: 'rgba(132,204,22,0.12)' };
    if (b < 30)   return { label: 'Выше нормы',           color: '#d97706', bg: 'rgba(217,119,6,0.12)' };
    if (b < 35)   return { label: 'Ожирение I',           color: '#dc2626', bg: 'rgba(220,38,38,0.12)' };
    if (b < 40)   return { label: 'Ожирение II',          color: '#b91c1c', bg: 'rgba(185,28,28,0.15)' };
    return               { label: 'Ожирение III',         color: '#7f1d1d', bg: 'rgba(127,29,29,0.18)' };
  }
  if (bmiEl && curBMI) {
    const cat = bmiCategory(curBMI);
    bmiEl.textContent = curBMI;
    bmiEl.style.color = cat.color;
    if (bmiBadge) {
      bmiBadge.textContent = cat.label;
      bmiBadge.style.color = cat.color;
      bmiBadge.style.background = cat.bg;
      bmiBadge.style.display = 'inline-block';
    }
    if (bmiLabel) {
      if (targBMI) {
        const tcat = bmiCategory(targBMI);
        // При наборе мышечной массы ИМТ 25-30 — норма для спортсмена
        const isGain = profile.goal === 'gain';
        const muscleNote = (isGain && targBMI >= 25 && targBMI < 30)
          ? ' <span style="color:var(--text-muted);font-size:10px;">(норма для набора мышц)</span>'
          : '';
        bmiLabel.innerHTML = 'Сейчас: ' + curBMI + ' &nbsp;·&nbsp; <span style="color:' + tcat.color + '">Цель: ' + targBMI + ' (' + tcat.label + ')</span>' + muscleNote;
      } else {
        bmiLabel.textContent = 'Индекс массы тела';
      }
    }
  }

  const goalLabels = {
    loss:     (_statsAge > 55)
                ? '🔥 Цель: Похудение  •  −300 ккал от TDEE (норма 55+)'
                : '🔥 Цель: Похудение  •  −400 ккал от TDEE',
    maintain: '⚖️ Цель: Поддержание  •  ±0 ккал',
    gain:     (_statsAge > 55)
                ? '💪 Цель: Набор  •  +200 ккал к TDEE (норма 55+)'
                : (_statsAge < 18
                    ? '💪 Цель: Рост  •  +200 ккал к TDEE (до 18 лет)'
                    : '💪 Цель: Набор массы  •  +300 ккал к TDEE')
  };
  const fixLabels = { loss: 'Похудение', maintain: 'Поддержание', gain: 'Набор массы' };
  const banner = document.getElementById('stats-goal-banner');
  let txt = goalLabels[profile.goal] || '';
  if (contradiction) {
    txt += '\n⚠️ Цель автоматически скорректирована на «' + (fixLabels[smartGoal] || smartGoal) + '» — соответствует твоим весам';
  }
  banner.style.whiteSpace = 'pre-line';
  banner.textContent = txt;
}

function showStatsTip(key) {
  var expLabels = {'0':'новичок','0.5':'до 6 мес','1':'6-12 мес','2':'1-2 года','3':'2-5 лет','5':'5+ лет'};
  var coachLabels = {'no':'самостоятельно','past':'опыт с тренером','now':'с тренером сейчас'};
  var expLbl   = expLabels[String(window._expVal  !== undefined ? window._expVal  : 0)] || '';
  var coachLbl = coachLabels[window._coachVal || 'no'] || '';
  var delta    = window._expDelta || 0;
  var sign     = delta > 0 ? '+' : '';
  var factor   = window._expFactor || 1;
  var tdeeBody = 'BMR × коэффициент активности. Столько калорий ты тратишь в реальности с учётом тренировок и образа жизни.';
  if (factor !== 1.00) {
    tdeeBody += '\n\nПоправка стажа (' + expLbl + (coachLbl !== 'самостоятельно' ? ', ' + coachLbl : '') + '): ' + sign + delta + ' ккал\nОпытные атлеты сжигают больше; новички — чуть меньше, пока тело адаптируется.';
  }
  var tips = {
    goal: { title: 'Цель', body: 'Целевой вес, к которому ты стремишься. Влияет на выбор стратегии: похудение, поддержание или набор массы.' },
    bmi:  { title: 'ИМТ', body: 'ИМТ = вес / рост². Норма: 18.5–24.9. При наборе мышечной массы ИМТ 25–27 допустим — мышцы тяжелее жира.' },
    bmr:  { title: 'BMR', body: 'Калории, которые тело сжигает в полном покое — на дыхание, сердце, органы. Формула Миффлина–Сан Жеора.' },
    tdee: { title: 'TDEE', body: tdeeBody },
    kcal: { title: 'Рекомендуемые ккал', body: 'TDEE ± поправка на цель:\n• Похудение: −400 ккал (−300 после 55 лет)\n• Поддержание: без изменений\n• Набор массы: +300 ккал (+200 после 55 лет)\n\nМинимум — 1200 ккал.' }
  };
  var t = tips[key];
  if (!t) return;

  document.getElementById('nutrient-info-overlay')?.remove();
  var overlay = document.createElement('div');
  overlay.id = 'stats-tip-overlay';
  overlay.className = 'nutrient-info-overlay';
  overlay.innerHTML = '<section class="nutrient-info-panel" role="dialog" aria-modal="true" aria-labelledby="stats-tip-title">' +
    '<button type="button" class="nutrient-info-close" aria-label="Закрыть">×</button>' +
    '<h2 id="stats-tip-title"></h2><div class="nutrient-info-body"></div></section>';
  overlay.querySelector('h2').textContent = t.title;
  overlay.querySelector('.nutrient-info-body').textContent = t.body;
  overlay.querySelector('.nutrient-info-close').onclick = function() { overlay.remove(); };
  overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };
  document.body.appendChild(overlay);
}
window.showStatsTip = showStatsTip;
window.renderStats = renderStats;

// ==================== DIARY & BODY LOG ====================
// FIX: добавлен уникальный id для каждой тренировки
function generateWorkoutId() {
  return Date.now() + '_' + Math.random().toString(36).slice(2);
}

function diaryIso(value) {
  const parts = (value || '').split(',')[0].trim().split('.');
  return parts.length === 3 ? `${parts[2]}-${parts[1]}-${parts[0]}` : value || '';
}

function renderDiary() {
  const dl = document.getElementById('diary-list');
  if (!dl) return;
  const countEl = document.getElementById('diary-count');
  const summaryEl = document.getElementById('diary-summary');
  if (countEl) countEl.textContent = `${diary.length} ${diary.length === 1 ? 'тренировка' : diary.length < 5 ? 'тренировки' : 'тренировок'}`;
  if (summaryEl) summaryEl.textContent = diary.length ? `Всего записей: ${diary.length}` : 'Добавляйте тренировки в разделе «Тренировка»';
  if (!diary.length) { dl.innerHTML = '<div class="diary-empty">Тренировок пока нет</div>'; renderBodyLog(); return; }
  const months = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
  const sorted = [...diary].sort((a,b) => diaryIso(b.date).localeCompare(diaryIso(a.date)));
  const years = new Map();
  sorted.forEach(e => {
    const p = (e.date || '').split(',')[0].trim().split('.');
    const year = p.length === 3 ? p[2] : 'other', month = p.length === 3 ? p[1] : 'other';
    if (!years.has(year)) years.set(year, new Map());
    const ms = years.get(year);
    if (!ms.has(month)) ms.set(month, { label: p.length === 3 ? months[Number(month)-1] : 'История', entries:[], kcal:0 });
    const g = ms.get(month); g.entries.push(e); g.kcal += Number(e.kcal) || 0;
  });
  let html = '', yi = 0;
  years.forEach((monthMap, year) => {
    const yId = `history-year-${yi}`;
    const yearTitle = year === 'other' ? 'История тренировок' : year;
    html += `<section class="history-year"><button class="history-year-head" type="button" onclick="toggleHistoryGroup('${yId}',this)"><span>${yearTitle}</span><small>${[...monthMap.values()].reduce((n,g)=>n+g.entries.length,0)} тренировок</small></button><div id="${yId}" class="history-year-content">`;
    let mi = 0;
    monthMap.forEach((g, month) => {
      const mId = `history-month-${yi}-${mi}`;
      const countWord = g.entries.length === 1 ? 'тренировка' : g.entries.length < 5 ? 'тренировки' : 'тренировок';
      html += `<section class="history-month"><button class="history-month-head" type="button" onclick="toggleHistoryGroup('${mId}',this)"><span><b class="history-month-title">${g.label}</b><small class="history-month-meta">${g.entries.length} ${countWord}${g.kcal ? ` · ${g.kcal} ккал` : ''}</small></span></button><div class="history-rows" id="${mId}">`;
      g.entries.forEach(e => {
        const p = (e.date || '').split(',')[0].trim().split('.'), day = p[0] || '—';
        const weekday = p.length === 3 ? new Date(`${p[2]}-${p[1]}-${p[0]}T00:00:00`).toLocaleDateString('ru-RU',{weekday:'short'}).replace('.','') : '';
        const exerciseCount = (e.exercises || '').split('\n').filter(Boolean).length;
        const previewId='history-preview-'+yi+'-'+mi+'-'+g.entries.indexOf(e);
        html += `<article class="compact-history-entry"><div class="history-entry-heading"><button class="history-row" type="button" aria-expanded="false" aria-controls="${previewId}" onclick="toggleWorkoutHistoryPreview(this)"><span class="history-date"><b>${day}</b><small>${weekday}</small></span><span class="history-main"><b>${escCalNote(e.type || 'Тренировка')}</b><small>${exerciseCount ? `${exerciseCount} упр.` : 'Без упражнений'}${e.kcal ? ` · ${e.kcal} ккал` : ''}</small></span></button><button type="button" class="history-more-actions" data-id="${escCalNote(String(e.id))}" aria-label="Действия с тренировкой" aria-haspopup="menu" aria-expanded="false" onclick="toggleHistoryWorkoutActions(this)">⋮</button></div><div class="compact-history-preview" id="${previewId}" hidden>${compactWorkoutEntryHTML(e)}</div></article>`;
      });
      html += `</div></section>`; mi++;
    });
    html += `</div></section>`; yi++;
  });
  dl.innerHTML = html;
  renderBodyLog();
}
window.renderDiary = renderDiary;

function toggleHistoryGroup(id, button) {
  const content = document.getElementById(id); if (!content) return;
  const open = content.classList.toggle('history-group-open');
  button.classList.toggle('history-group-open', open);
  button.setAttribute('aria-expanded',String(open));
}
window.toggleHistoryGroup = toggleHistoryGroup;

function showMoreHistory(monthIndex) {
  document.querySelectorAll(`#history-month-${monthIndex} .history-row-hidden`).forEach(el => el.classList.remove('history-row-hidden'));
  const btn = document.getElementById(`history-more-${monthIndex}`); if (btn) btn.remove();
}
window.showMoreHistory = showMoreHistory;

function delDiary(id) {
  const entry=diary.find(e=>String(e.id)===String(id));if(!entry)return;
  confirmDanger({
    title:'Удалить запись?',
    message:escCalNote(String(entry.type||'Тренировка').replace(/\s*\+\s*/g,' · ')+(entry.date?' · '+entry.date:'')),
    hideIcon:true,
    confirmText:'Удалить',
    onConfirm:()=>{
      const remaining=diary.filter(e=>String(e.id)!==String(id));
      try{localStorage.setItem('fs-diary',JSON.stringify(remaining));}
      catch(error){console.error(error);toast('Не удалось удалить тренировку. Данные не изменены.');return;}
      diary=remaining;
      renderDiary();renderCalendar();
      if(window._calSelectedDate&&typeof showCalDay==='function')showCalDay(window._calSelectedDate);
      toast('🗑 Удалено');
    }
  });
}
window.delDiary=delDiary;

(function(){
  let active=null;
  function close(restoreFocus){
    if(!active)return;
    const trigger=active.trigger;
    trigger.setAttribute('aria-expanded','false');active.menu.remove();active=null;
    if(restoreFocus&&trigger.isConnected)trigger.focus();
  }
  window.toggleHistoryWorkoutActions=function(trigger){
    if(active?.trigger===trigger){close(true);return;}close(false);
    const menu=document.createElement('div');menu.className='scheduled-floating-menu history-workout-menu';menu.setAttribute('role','menu');
    const remove=document.createElement('button');remove.type='button';remove.className='danger';remove.setAttribute('role','menuitem');remove.textContent='Удалить';
    remove.onclick=function(){const id=trigger.dataset.id;close(false);delDiary(id);};menu.appendChild(remove);
    document.body.appendChild(menu);active={trigger,menu};trigger.setAttribute('aria-expanded','true');
    const t=trigger.getBoundingClientRect(),m=menu.getBoundingClientRect();
    const vw=document.documentElement.clientWidth||window.innerWidth,vh=window.innerHeight;
    menu.style.maxWidth=Math.max(0,vw-16)+'px';menu.style.maxHeight=Math.max(0,vh-16)+'px';
    menu.style.left=Math.max(8,Math.min(t.left-m.width-6,vw-m.width-8))+'px';
    menu.style.top=Math.max(8,Math.min(t.top,vh-m.height-8))+'px';
    remove.focus({preventScroll:true});
  };
  document.addEventListener('click',function(e){if(active&&!active.menu.contains(e.target)&&!active.trigger.contains(e.target))close(false);});
  document.addEventListener('keydown',function(e){
    if(!active)return;
    if(e.key==='Escape'){e.preventDefault();close(true);}
    else if(e.key==='Tab')close(false);
  });
  document.addEventListener('scroll',function(e){if(active&&!active.menu.contains(e.target))close(false);},true);
  window.addEventListener('resize',function(){close(false);});
})();

function renderWlog() {
  // Weight is rendered together with body measurements in renderBodyLog.
}

function normalizeBodyDate(value) {
  const text = String(value || '').trim();
  if (!text) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  let match = text.match(/^(\d{1,2})[.\/](\d{1,2})[.\/](\d{4})/);
  if (match) return `${match[3]}-${String(match[2]).padStart(2, '0')}-${String(match[1]).padStart(2, '0')}`;
  match = text.match(/^(\d{4})[.\/](\d{1,2})[.\/](\d{1,2})/);
  if (match) return `${match[1]}-${String(match[2]).padStart(2, '0')}-${String(match[3]).padStart(2, '0')}`;
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? '' : getLocalISODate(parsed);
}

function normalizeBodyEntry(entry) {
  if (!entry || typeof entry !== 'object') return null;
  const date = normalizeBodyDate(entry.date) || getLocalISODate();
  const normalized = { date };
  ['weight', 'neck', 'shoulders', 'chest', 'bicepLeft', 'bicepRight', 'forearmLeft', 'forearmRight', 'waist', 'glutes', 'thighLeft', 'thighRight', 'calfLeft', 'calfRight', 'bicep', 'forearm', 'thigh', 'calf'].forEach(key => {
    const raw = String(entry[key] ?? '').trim().replace(',', '.');
    const value = Number(raw);
    if (raw !== '' && Number.isFinite(value) && value >= 0) normalized[key] = value;
  });
  return Object.keys(normalized).length > 1 ? normalized : null;
}

function refreshBodyStorage() {
  try {
    const rawWeight = JSON.parse(localStorage.getItem('fs-wlog') || '[]');
    const rawBody = JSON.parse(localStorage.getItem('fs-bodylog') || '[]');
    wlog = Array.isArray(rawWeight) ? rawWeight.map(normalizeBodyEntry).filter(Boolean).map(e => ({ date:e.date, weight:e.weight, id:e.id || e.date })).filter(e => e.weight) : [];
    bodyLog = Array.isArray(rawBody) ? rawBody.map(normalizeBodyEntry).filter(Boolean) : [];
  } catch (error) {
    wlog = Array.isArray(wlog) ? wlog : [];
    bodyLog = Array.isArray(bodyLog) ? bodyLog : [];
  }
}

function exportBodyBackup() {
  refreshBodyStorage();
  const blob = new Blob([JSON.stringify({ wlog, bodyLog }, null, 2)], { type:'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url; link.download = 'fitsim-zamery.json'; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
window.exportBodyBackup = exportBodyBackup;

function importBodyBackup() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/json,.json';
  input.onchange = event => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        const weights = Array.isArray(data.wlog) ? data.wlog : Array.isArray(data['fs-wlog']) ? data['fs-wlog'] : [];
        const measurements = Array.isArray(data.bodyLog) ? data.bodyLog : Array.isArray(data['fs-bodylog']) ? data['fs-bodylog'] : [];
        if (!weights.length && !measurements.length) throw new Error('empty');
        localStorage.setItem('fs-wlog', JSON.stringify(weights));
        localStorage.setItem('fs-bodylog', JSON.stringify(measurements));
        refreshBodyStorage();
        renderBodyLog();
        toast('✅ Замеры импортированы');
      } catch (error) { toast('❗ Не удалось прочитать файл замеров'); }
    };
    reader.readAsText(file);
  };
  input.click();
}
window.importBodyBackup = importBodyBackup;

let bodyLogRetryTimer = null;
function renderBodyLog() {
  const c = document.getElementById('body-log');
  if (!c) { if (!bodyLogRetryTimer) bodyLogRetryTimer = setTimeout(() => { bodyLogRetryTimer = null; renderBodyLog(); }, 80); return; }
  refreshBodyStorage();
  const labels = { neck:'Шея', chest:'Грудь', bicep:'Бицепс', forearm:'Предплечье', waist:'Талия', glutes:'Ягодицы', thigh:'Бедро', calf:'Икра' };
  const byDate = new Map();
  bodyLog.forEach(e => byDate.set(e.date, { ...(byDate.get(e.date) || {}), ...e }));
  wlog.forEach(e => byDate.set(e.date, { ...(byDate.get(e.date) || {}), weight:e.weight, weightId:e.id }));
  const entries = [...byDate.values()].sort((a, b) => b.date.localeCompare(a.date));
  const lastEl = document.getElementById('diary-last-body'), chartCard = document.getElementById('body-chart-card');
  if (lastEl) lastEl.innerHTML = entries[0] ? `<div class="diary-last-date">${formatBodyDate(entries[0].date)}</div>` : '<div class="diary-empty">Пока нет замеров</div>';
  if (chartCard) chartCard.style.display = entries.length >= 2 ? '' : 'none';
  const historySection=c.closest('.diary-measurements-history');
  if(historySection){historySection.hidden=!entries.length;historySection.style.display=entries.length?'':'none';}
  if (!entries.length) { c.innerHTML = ''; renderBodyChart(); return; }
  const months = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'], groups = new Map();
  entries.forEach(e => { const [year, month] = e.date.split('-'), key = `${year}-${month}`; if (!groups.has(key)) groups.set(key, { key, title:`${year} ${months[+month - 1]}`, entries:[] }); groups.get(key).entries.push(e); });
  c.innerHTML = [...groups.values()].map(g => `<section class="body-month-group"><button type="button" class="body-month-head is-collapsed" onclick="toggleBodyMonth('${g.key}', this)" aria-expanded="false"><span>${g.title}</span><small>${g.entries.length} ${bodyEntryWord(g.entries.length)}</small><i>⌃</i></button><div class="body-month-rows is-collapsed" id="body-month-${g.key}">${g.entries.map((e,i) => bodyEntryHtml(e, null, labels, entries)).join('')}</div></section>`).join('');
  const state = JSON.parse(localStorage.getItem('fs-body-months-collapsed') || '{}');
  Object.keys(state).forEach(key => { if (state[key] === false) { const rows=document.getElementById(`body-month-${key}`), btn=rows?.previousElementSibling; if(rows&&btn){ rows.classList.remove('is-collapsed'); btn.classList.remove('is-collapsed'); btn.setAttribute('aria-expanded','true'); } } });
  renderBodyChart();
}
function bodyEntryWord(n) { const r=n%10,h=n%100; return r===1&&h!==11?'замер':r>=2&&r<=4&&!(h>=12&&h<=14)?'замера':'замеров'; }
const BODY_SIDE_METRICS={neck:'Шея',shoulders:'Плечи',chest:'Грудь',bicepLeft:'Л · Бицепс',bicepRight:'П · Бицепс',forearmLeft:'Л · Предплечье',forearmRight:'П · Предплечье',waist:'Талия',glutes:'Ягодицы',thighLeft:'Л · Бедро',thighRight:'П · Бедро',calfLeft:'Л · Голень',calfRight:'П · Голень',weight:'Вес'};
const BODY_MAP_ROWS=[['neck','weight'],['chest','shoulders'],['bicepRight','bicepLeft'],['forearmRight','forearmLeft'],['glutes','waist'],['thighRight','thighLeft'],['calfRight','calfLeft']];
function bodyMetricPresent(e,k){return !!e&&e[k]!==undefined&&e[k]!==null&&e[k]!==''&&Number.isFinite(Number(e[k]))&&Number(e[k])>0;}
function bodyEntryHtml(e,prev,labels,entries){
 const history=Array.isArray(entries)?entries:prev?[e,prev]:[e],goal=(typeof profile!=='undefined'&&profile&&profile.goal)||'';
 const weights=history.filter(row=>bodyMetricPresent(row,'weight')),first=weights[weights.length-1],latest=weights[0];
 let map='';
 BODY_MAP_ROWS.forEach((cells,row)=>cells.forEach((key,col)=>{
  if(!key)return;const present=bodyMetricPresent(e,key),unit=key==='weight'?'кг':'см',value=present?Number(e[key]):null;
  const previous=history.find(item=>item.date<e.date&&bodyMetricPresent(item,key));
  const delta=present&&previous?Math.round((value-Number(previous[key]))*10)/10:null;
  let badge='';
  if(delta!==null){let tone=delta===0?'flat':'neutral';if(delta&&key==='weight'&&(goal==='loss'||goal==='gain'))tone=((goal==='loss'&&delta<0)||(goal==='gain'&&delta>0))?'good':'bad';
   const text=delta===0?'±0':(delta>0?'↑':'↓')+Math.abs(delta).toLocaleString('ru-RU');
   const description=`${delta>0?'+':''}${delta.toLocaleString('ru-RU')} ${unit} к замеру от ${formatBodyDate(previous.date)}`;
   badge=`<span class="bm-delta ${tone}" title="${description}" aria-label="${description}">${text}</span>`;
  }
  map+=`<div class="bm-metric ${key==='weight'?'bm-weight':''} ${present?'':'bm-missing'}" data-metric="${key}" style="grid-column:${col+1};grid-row:${row+1}"><span class="bm-label">${BODY_SIDE_METRICS[key]}</span><div class="bm-value" ${present?'':'aria-label="Нет замера"'}>${present?value.toLocaleString('ru-RU'):'—'}${present?` <small>${unit}</small>`:''}</div>${badge}</div>`;
 }));
 let total='';if(bodyMetricPresent(e,'weight')&&latest&&latest.date===e.date&&first&&first.date!==e.date){const d=Math.round((Number(e.weight)-Number(first.weight))*10)/10;total=`<div class="bm-map-total"><span>С первого взвешивания</span><strong>${d>0?'+':d===0?'±':''}${d.toLocaleString('ru-RU')} <small>кг</small></strong><small>от ${formatBodyDate(first.date)}</small></div>`;}
 const shared={bicep:'Бицепс',forearm:'Предплечье',thigh:'Бедро',calf:'Голень'};
 const old=Object.entries(shared).filter(([key])=>bodyMetricPresent(e,key)).map(([key,label])=>`<span>${label}: ${Number(e[key]).toLocaleString('ru-RU')} см</span>`).join('');
 const legacy=old?`<details class="bm-legacy"><summary>Старые общие замеры</summary><p>Сторона не была указана. Эти значения не используются как левый или правый замер.</p><div>${old}</div></details>`:'';
 const date=new Date(e.date+'T00:00:00'),day=Number.isNaN(date.getTime())?'Замеры тела':date.toLocaleDateString('ru-RU',{weekday:'long'});
 return `<article class="bm-entry"><header class="bm-entry-head"><div><span class="bm-eyebrow">${day.charAt(0).toUpperCase()+day.slice(1)}</span><h3>${formatBodyDate(e.date)}</h3></div><button type="button" class="bm-delete" aria-label="Удалить замеры за ${formatBodyDate(e.date)}" onclick="delBody('${e.date}')"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7"/></svg></button></header><div class="bm-map">${map}</div>${total}${legacy}</article>`;
}
function toggleBodyMonth(key, button) { const rows=document.getElementById(`body-month-${key}`); if(!rows)return; const closed=rows.classList.toggle('is-collapsed'); button.classList.toggle('is-collapsed',closed); button.setAttribute('aria-expanded',String(!closed)); const state=JSON.parse(localStorage.getItem('fs-body-months-collapsed')||'{}'); state[key]=closed; localStorage.setItem('fs-body-months-collapsed',JSON.stringify(state)); }
window.toggleBodyMonth=toggleBodyMonth;
function delBody(date) {
  confirmDanger({
    title: 'Удалить замеры?',
    message: '',
    compact: true,
    onConfirm: () => {
  bodyLog = bodyLog.filter(e => e.date !== date);
  wlog = wlog.filter(e => e.date !== date);
  localStorage.setItem('fs-bodylog', JSON.stringify(bodyLog));
  localStorage.setItem('fs-wlog', JSON.stringify(wlog));
  renderBodyLog();
  toast('🗑 Запись удалена');
}
  });
}
window.delBody = delBody;
window.delWeight = delBody;


function getLocalISODate(date = new Date()) {
  const offset = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function formatBodyDate(value) {
  const parts = String(value || '').split('-');
  if (parts.length !== 3) return value ? String(value) : 'Без даты';
  const date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString('ru-RU', {
    day: 'numeric', month: 'long', year: 'numeric'
  });
}

function openBodySheet() {
  setupBodySidesForm();stopBodyVoice();
  document.getElementById('body-voice-status').textContent='';
  document.getElementById('sheet-overlay').classList.add('show');
  document.getElementById('body-sheet').classList.add('show');
  document.getElementById('sb-date').value = getLocalISODate();
  ['neck', 'shoulders', 'chest', 'bicepLeft', 'bicepRight', 'forearmLeft', 'forearmRight', 'waist', 'glutes', 'thighLeft', 'thighRight', 'calfLeft', 'calfRight'].forEach(k => {
    document.getElementById('sb-' + k).value = '';
  });
  document.getElementById('sb-weight').value = '';
  bodyFigureSelected=null;renderBodyFigure();
  document.getElementById('body-sheet').scrollTop=0;
}
window.openBodySheet = openBodySheet;

function addBody() {
  stopBodyVoice();
  const bodyInputs=document.querySelectorAll('#body-sheet input[id^="sb-"][type="number"]');
  for(const input of bodyInputs){if(input.value!==''&&(!Number.isFinite(Number(input.value))||Number(input.value)<=0)){toast('Укажи положительное число в поле замера');input.focus();return;}}
  refreshBodyStorage();
  const d = document.getElementById('sb-date').value || getLocalISODate();
  const entry = { date: d };
  const keys = ['neck', 'shoulders', 'chest', 'bicepLeft', 'bicepRight', 'forearmLeft', 'forearmRight', 'waist', 'glutes', 'thighLeft', 'thighRight', 'calfLeft', 'calfRight'];
  let hasData = false;

  keys.forEach(k => {
    const inp = document.getElementById('sb-' + k);
    const v = parseFloat(inp.value);
    if (inp.value !== '' && !isNaN(v)) {
      entry[k] = v;
      hasData = true;
    }
  });

  const weightVal = parseFloat(document.getElementById('sb-weight').value);
  if (Number.isFinite(weightVal) && weightVal > 0) {
    const wExists = wlog.findIndex(e => e.date === d);
    if (wExists !== -1) wlog[wExists].weight = weightVal;
    else wlog.push({ date: d, weight: weightVal, id: Date.now() });
    localStorage.setItem('fs-wlog', JSON.stringify(wlog));
    hasData = true;
  }

  if (!hasData) {
    toast('❗ Заполни хотя бы одно поле');
    return;
  }

  const hasBodyData = keys.some(k => entry[k] !== undefined);
  if (hasBodyData) {
    const exists = bodyLog.findIndex(e => e.date === d);
    if (exists !== -1) bodyLog[exists] = {...bodyLog[exists], ...entry};
    else bodyLog.push(entry);
    localStorage.setItem('fs-bodylog', JSON.stringify(bodyLog));
  }

  refreshBodyStorage();
  renderBodyLog();
  closeAllSheets();
  toast('✅ Замеры сохранены');
}
window.addBody = addBody;

function renderBodyChart() {
  const metric = document.getElementById('body-chart-metric')?.value || 'weight';
  const el = document.getElementById('body-chart-canvas');
  if (!el) return;
  const source = metric === 'weight' ? wlog : bodyLog;
  const sorted = [...source].filter(e => e[metric] !== undefined && e[metric] !== null && e[metric] !== '').sort((a,b) => a.date.localeCompare(b.date));
  if (sorted.length < 2) { el.innerHTML = '<div style="text-align:center;color:var(--text-light);font-size:13px;padding:16px 0 2px">Добавьте минимум две записи для графика</div>'; return; }
  const vals = sorted.map(e => parseFloat(e[metric])), dates = sorted.map(e => e.date), minV = Math.min(...vals), maxV = Math.max(...vals), range = maxV - minV || 1, W = 280, H = 90, padX = 10, padY = 14;
  const xs = vals.map((v,i) => padX + i/(vals.length-1)*(W-2*padX)), ys = vals.map(v => H-padY-(v-minV)/range*(H-2*padY));
  const poly = xs.map((x,i) => `${x},${ys[i]}`).join(' '), area = `${xs[0]},${H-padY} ${poly} ${xs[xs.length-1]},${H-padY}`;
  const dots = vals.map((v,i) => `<circle cx="${xs[i]}" cy="${ys[i]}" r="3.5" fill="var(--accent)"/><text x="${xs[i]}" y="${ys[i]-7}" text-anchor="middle" font-size="8" fill="var(--text-light)">${v}</text>`).join('');
  const names = {weight:'Вес',waist:'Талия',chest:'Грудь',bicep:'Бицепс',thigh:'Бедро',neck:'Шея',forearm:'Предплечье',glutes:'Ягодицы',calf:'Голень'}, unit = metric === 'weight' ? ' кг' : ' см';
  el.innerHTML = `<div style="font-size:11px;color:var(--text-light);font-weight:600;margin-bottom:6px">${names[metric]}: ${vals[0]}${unit} → ${vals[vals.length-1]}${unit}</div><svg viewBox="0 0 ${W} ${H+12}" style="width:100%;overflow:visible"><defs><linearGradient id="bcg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--accent)" stop-opacity=".25"/><stop offset="1" stop-color="var(--accent)" stop-opacity="0"/></linearGradient></defs><polygon points="${area}" fill="url(#bcg)"/><polyline points="${poly}" fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>${dots}<text x="${xs[0]}" y="${H+8}" text-anchor="middle" font-size="8" fill="var(--text-light)">${dates[0].split('-').slice(1).reverse().join('.')}</text><text x="${xs.at(-1)}" y="${H+8}" text-anchor="end" font-size="8" fill="var(--text-light)">${dates[dates.length - 1].split('-').slice(1).reverse().join('.')}</text></svg>`;
}
window.renderBodyChart = renderBodyChart;

function populateProgSelect() {
  const sel = document.getElementById('prog-select');
  if (!sel) return;
  const cur = sel.value;
  const names = Object.keys(exlog).sort();
  sel.innerHTML = '<option value="">— Выбери упражнение —</option>' +
    names.map(n => `<option value="${n}" ${n === cur ? 'selected' : ''}>${n}</option>`).join('');
}

function renderProgress() {
  populateProgSelect();
  const sel = document.getElementById('prog-select');
  const chartEl = document.getElementById('prog-chart');
  const tableEl = document.getElementById('prog-table');
  const prEl = document.getElementById('prog-pr');
  if (!sel || !chartEl || !tableEl) return;

  const name = sel.value;
  if (!name || !exlog[name] || !exlog[name].length) {
    chartEl.innerHTML = '';
    tableEl.innerHTML = '<div style="color:var(--text-muted);font-size:13px;text-align:center;padding:16px">Нет данных. Сохрани тренировку с этим упражнением.</div>';
    if (prEl) prEl.innerHTML = '';
    return;
  }

  const entries = exlog[name].slice(-20);
  const kgVals = entries.map(e => e.kg || 0);
  const maxKg = Math.max(...kgVals) || 1;
  if (prEl) prEl.innerHTML = maxKg > 0 ? `<span class="prog-pr-badge">🏆 ПР: ${maxKg} кг</span>` : '';

  let bars = '';
  const barW = Math.max(20, Math.min(44, Math.floor(300 / entries.length)));
  entries.forEach((e, i) => {
    const pct = maxKg > 0 ? Math.round((e.kg / maxKg) * 100) : 0;
    const prev = i > 0 ? entries[i - 1].kg : e.kg;
    const diff = e.kg - prev;
    const color = diff > 0 ? '#22c55e' : diff < 0 ? '#ef4444' : 'var(--accent)';
    bars += `
      <div style="display:inline-flex;flex-direction:column;align-items:center;margin:0 2px;vertical-align:bottom">
        <div style="font-size:9px;color:${color};font-weight:600;margin-bottom:2px">${e.kg > 0 ? e.kg + 'кг' : ''}</div>
        <div style="width:${barW}px;height:${Math.max(4, Math.round(pct * 0.8))}px;background:${color};border-radius:3px 3px 0 0;opacity:0.85"></div>
        <div style="font-size:8px;color:var(--text-muted);margin-top:3px;max-width:${barW}px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${e.date.split('.').slice(0,2).join('/')}</div>
      </div>
    `;
  });
  chartEl.innerHTML = `<div style="display:flex;align-items:flex-end;padding:8px 0 4px;overflow-x:auto;min-height:80px">${bars}</div>`;

  const rows = [...entries].reverse().map((e, i, arr) => {
    const prev = arr[i + 1];
    let tag = '';
    if (e.kg > 0) {
      if (!prev || e.kg > prev.kg) tag = '<span class="prog-tag up">↑ +' + (prev ? (e.kg - prev.kg).toFixed(1) : '') + ' кг</span>';
      else if (e.kg < prev.kg) tag = '<span class="prog-tag down">↓</span>';
      else tag = '<span class="prog-tag same">= стабильно</span>';
    }
    const vol = e.s && e.r ? `${e.s}×${e.r}` : '—';
    return `<tr><td>${e.date}</td><td><strong>${e.kg > 0 ? e.kg + ' кг' : 'б/веса'}</strong></td><td style="color:var(--text-muted)">${vol}</td><td>${tag}</td></tr>`;
  }).join('');

  tableEl.innerHTML = `
    <table class="prog-table">
      <thead><tr><th>Дата</th><th>Вес</th><th>Подх×Пов</th><th>Δ</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}
window.renderProgress = renderProgress;

// ==================== КАЛЕНДАРЬ ====================
let calCurrentYear = null;
let calCurrentMonth = null;

function initCalendarDefaults() {
  const now = new Date();
  calCurrentYear = now.getFullYear();
  calCurrentMonth = now.getMonth();
}

function changeCalMonth(delta) {
  if (calCurrentYear === null) initCalendarDefaults();
  calCurrentMonth += delta;
  if (calCurrentMonth < 0) {
    calCurrentMonth = 11;
    calCurrentYear--;
  }
  if (calCurrentMonth > 11) {
    calCurrentMonth = 0;
    calCurrentYear++;
  }
  renderCalendar();
}
window.changeCalMonth = changeCalMonth;

function getCalendarNotes(){try{const n=JSON.parse(localStorage.getItem('fs-calendar-notes')||'{}');return n&&typeof n==='object'&&!Array.isArray(n)?n:{}}catch(e){return{}}}
function escCalNote(t){const e=document.createElement('div');e.textContent=String(t||'');return e.innerHTML}
function calIso(d){const p=String(d||'').split('.');return p.length===3?`${p[2]}-${p[1]}-${p[0]}`:''}
function calDate(i){const p=String(i||'').split('-');return p.length===3?`${p[2]}.${p[1]}.${p[0]}`:''}
function openCalendarNoteSheet(d){const date=d||window._calSelectedDate||calDate(new Date().toISOString().slice(0,10)),old=getCalendarNotes()[date]||'';let o=document.getElementById('calendar-note-overlay'),s=document.getElementById('calendar-note-sheet');if(!o){o=document.createElement('div');o.id='calendar-note-overlay';o.className='sheet-overlay';o.onclick=closeCalendarNoteSheet;document.body.appendChild(o)}if(!s){s=document.createElement('div');s.id='calendar-note-sheet';s.className='bottom-sheet calendar-note-sheet';document.body.appendChild(s)}s.innerHTML=`<div class="sheet-handle"></div><div class="calendar-note-sheet-head"><div><div class="calendar-note-eyebrow">КАЛЕНДАРЬ</div><div class="sheet-title">Заметка в календаре</div></div><button type="button" class="calendar-note-close" onclick="closeCalendarNoteSheet()" aria-label="Закрыть">×</button></div><div class="sheet-field calendar-note-date-field"><label for="cal-note-date">Дата</label><div class="calendar-note-date-control"><input id="cal-note-date" type="date" value="${calIso(date)}"><button type="button" class="calendar-note-voice" aria-label="Голосовой ввод" title="Диктовка заметки" onclick="startCalendarNoteVoice(this)"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="2" width="6" height="12" rx="3"></rect><path d="M5 10a7 7 0 0 0 14 0M12 17v4M8 21h8"></path></svg></button></div></div><div class="sheet-field calendar-note-text-field"><label for="cal-note-text">Заметка</label><textarea id="cal-note-text" maxlength="500" placeholder="Например: замерить вес, купить продукты, день отдыха…"></textarea><div class="calendar-note-helper">До 500 символов</div></div><div class="calendar-note-actions"><button type="button" class="calendar-note-cancel" onclick="closeCalendarNoteSheet()">Отмена</button><button type="button" class="sheet-add-btn" onclick="saveCalendarNote()">Сохранить</button></div>`;document.getElementById('cal-note-text').value=old;o.classList.add('show');s.classList.add('show')}
function startCalendarNoteVoice(button){
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    toast('❌ Голосовой ввод не поддерживается');
    return;
  }
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const rec = new SR();
  const btn = button || document.querySelector('.calendar-note-voice');
  const note = document.getElementById('cal-note-text');
  rec.lang = 'ru-RU';
  rec.interimResults = false;
  rec.maxAlternatives = 1;
  if(btn) btn.classList.add('listening');
  rec.onresult = e => {
    const text = e.results[0][0].transcript.trim();
    if(note){
      note.value = note.value.trim() ? note.value.trimEnd() + ' ' + text : text;
      note.dispatchEvent(new Event('input',{bubbles:true}));
      note.focus();
    }
  };
  rec.onerror = e => {
    if(e.error !== 'aborted' && e.error !== 'no-speech') toast(e.error === 'not-allowed' ? '❌ Нет доступа к микрофону' : '❌ Ошибка микрофона');
  };
  rec.onend = () => { if(btn) btn.classList.remove('listening'); };
  rec.start();
}
window.startCalendarNoteVoice = startCalendarNoteVoice;

function closeCalendarNoteSheet(){document.getElementById('calendar-note-overlay')?.classList.remove('show');document.getElementById('calendar-note-sheet')?.classList.remove('show')}
function saveCalendarNote(){const iso=document.getElementById('cal-note-date')?.value,text=document.getElementById('cal-note-text')?.value.trim();if(!iso){toast('Выбери дату');return}const d=calDate(iso),n=getCalendarNotes();if(text)n[d]=text;else delete n[d];localStorage.setItem('fs-calendar-notes',JSON.stringify(n));closeCalendarNoteSheet();const [y,m]=iso.split('-');calCurrentYear=+y;calCurrentMonth=+m-1;renderCalendar();showCalDay(d);toast(text?'Заметка сохранена':'Заметка удалена')}
function deleteCalendarNote(d){const n=getCalendarNotes();delete n[d];localStorage.setItem('fs-calendar-notes',JSON.stringify(n));renderCalendar();showCalDay(d);toast('Заметка удалена')}
window.openCalendarNoteSheet=openCalendarNoteSheet;window.closeCalendarNoteSheet=closeCalendarNoteSheet;window.saveCalendarNote=saveCalendarNote;window.deleteCalendarNote=deleteCalendarNote;

function getWaterDrinkJournal(){try{const value=JSON.parse(localStorage.getItem('fs-water-drinks')||'[]');return Array.isArray(value)?value:[];}catch(error){return [];}}
function saveWaterDrinkJournal(entries){localStorage.setItem('fs-water-drinks',JSON.stringify(entries));}
function getWaterDateKey(){return new Date().toISOString().slice(0,10);}
function renderCalendar() {
  const grid=document.getElementById('calendar-grid'),detail=document.getElementById('cal-day-detail'),empty=document.getElementById('calendar-empty'),monthLabel=document.getElementById('cal-month-label');
  if(!grid)return;
  if(calCurrentYear===null)initCalendarDefaults();
  const year=calCurrentYear,month=calCurrentMonth,first=new Date(year,month,1),daysInMonth=new Date(year,month+1,0).getDate();
  const monthNames=['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
  if(monthLabel)monthLabel.textContent=monthNames[month]+' '+year;
  const workoutDays={},foodDays={},waterDays={},noteDays=getCalendarNotes();
  if(Array.isArray(diary))diary.forEach(d=>{const k=d.date?d.date.split(',')[0].trim():'';if(k)workoutDays[k]=1});
  JSON.parse(localStorage.getItem('fs-nutrition')||'[]').forEach(e=>{if(e.date)foodDays[e.date]=1});
  const hist=JSON.parse(localStorage.getItem('fs-water-hist')||'[]'),cur=JSON.parse(localStorage.getItem('fs-water')||'{}');
  hist.forEach(e=>{if(e.date&&Number(e.amount)>0){const [y,m,d]=e.date.split('-');waterDays[`${d}.${m}.${y}`]=1}});
  if(cur.date&&Number(cur.amount)>0){const [y,m,d]=cur.date.split('-');waterDays[`${d}.${m}.${y}`]=1}
  const plannedDays=typeof getPlannedWorkoutsForMonth==='function'?getPlannedWorkoutsForMonth(year,month):{};
  const scheduledDays=typeof scheduledWorkoutDays==='function'?scheduledWorkoutDays():new Set();
  let html='',offset=(first.getDay()+6)%7;
  for(let i=0;i<offset;i++)html+='<div class="cal-blank"></div>';
  for(let d=1;d<=daysInMonth;d++){
    const dd=String(d).padStart(2,'0'),mm=String(month+1).padStart(2,'0'),dateStr=`${dd}.${mm}.${year}`;
    const today=d===new Date().getDate()&&month===new Date().getMonth()&&year===new Date().getFullYear();
    const wt=workoutDays[dateStr],food=foodDays[dateStr],water=waterDays[dateStr],note=noteDays[dateStr],planned=plannedDays[dateStr],isPlanned=planned&&!planned.rest;
    const marks=[water?'water':'',food?'food':'',wt||isPlanned?'workout':'',note?'note':''].filter(Boolean).map(x=>`<i class="cal-mark ${x}"></i>`).join('');
    const scheduled=scheduledDays.has(dateStr);
    html+=`<button type="button" onclick="showCalDay('${dateStr}')" class="cal-cell${scheduled?' has-scheduled-workout':''}${today?' cal-cell-today':''}${window.calSelectedDate===dateStr?' cal-cell-selected':''}${wt||isPlanned?' has-workout':''}${food?' has-food':''}${water?' has-water':''}${note?' has-note':''}" aria-label="${dateStr}"><span>${d}</span><b class="cal-marks">${marks}</b></button>`;
  }
  grid.innerHTML=html;
  if(detail)detail.style.display='none';
  const anyData=Object.keys(workoutDays).length||Object.keys(foodDays).length||Object.keys(waterDays).length||Object.keys(noteDays).length||Object.keys(plannedDays).length||scheduledDays.size;
  if(empty)empty.style.display=anyData?'none':'block';
}
window.renderCalendar=renderCalendar;

function getCalendarWorkoutSummary(entries){
  const categoryLabels={chest:'Грудь',back:'Спина',legs:'Ноги',shoulders:'Плечи',biceps:'Бицепс',triceps:'Трицепс',glutes:'Ягодицы',abs:'Пресс',forearms:'Предплечья',cardio:'Кардио'};
  const normalizeExerciseName=value=>String(value||'').toLowerCase().replace(/ё/g,'е').replace(/[^а-яa-z0-9]+/g,' ').trim();
  const exerciseCategories=new Map();
  if(typeof ALLEXERCISES!=='undefined'&&ALLEXERCISES){
    Object.entries(ALLEXERCISES).forEach(([category,exercises])=>{
      (Array.isArray(exercises)?exercises:[]).forEach(exercise=>{
        const name=normalizeExerciseName(exercise?.n||exercise?.name||exercise||'');
        if(name) exerciseCategories.set(name,category);
      });
    });
  }
  const getCategory=name=>{
    const normalized=normalizeExerciseName(name);
    if(exerciseCategories.has(normalized)) return exerciseCategories.get(normalized);
    for(const [exerciseName,category] of exerciseCategories){
      if(exerciseName&&((normalized.includes(exerciseName)&&exerciseName.length>4)||(exerciseName.includes(normalized)&&normalized.length>4))) return category;
    }
    if(/бицепс|сгибан.*рук|молот|подъем.*(?:штанг|гантел).*рук/.test(normalized)) return 'biceps';
    if(/трицепс|разгибан.*рук|француз|узк.*хват|отжиман.*скам/.test(normalized)) return 'triceps';
    if(/груд|жим.*(?:лежа|гантел)|разводк/.test(normalized)) return 'chest';
    if(/спин|тяга|подтягиван/.test(normalized)) return 'back';
    if(/ног|присед|выпад|икр|сгибан.*ног|разгибан.*ног/.test(normalized)) return 'legs';
    if(/плеч|дельт|жим.*стоя|махи/.test(normalized)) return 'shoulders';
    if(/ягод|мост/.test(normalized)) return 'glutes';
    if(/пресс|скручиван|планк/.test(normalized)) return 'abs';
    if(/предплеч|кист/.test(normalized)) return 'forearms';
    if(/бег|ходьб|велосипед|кардио/.test(normalized)) return 'cardio';
    return 'other';
  };
  const groups=[];
  const byCategory=new Map();
  const addExercise=(name,kcalShare)=>{
    const category=getCategory(name);
    if(!byCategory.has(category)){
      const group={category,label:categoryLabels[category]||'Другое',exerciseCount:0,kcalRaw:0,kcal:0};
      byCategory.set(category,group);
      groups.push(group);
    }
    const group=byCategory.get(category);
    group.exerciseCount+=1;
    group.kcalRaw+=kcalShare;
  };
  let totalExercises=0;
  let totalKcal=0;
  (Array.isArray(entries)?entries:[]).forEach(entry=>{
    const exercises=String(entry?.exercises||'').split(/\n|<br\s*\/?\s*>/i).map(line=>line.trim()).filter(Boolean);
    const entryKcal=Math.max(0,Number(entry?.kcal)||0);
    totalKcal+=entryKcal;
    totalExercises+=exercises.length;
    const kcalShare=exercises.length?entryKcal/exercises.length:0;
    exercises.forEach(line=>addExercise(line.split(':')[0].trim(),kcalShare));
  });
  groups.forEach(group=>{group.kcal=Math.round(group.kcalRaw);});
  const roundedTotal=groups.reduce((sum,group)=>sum+group.kcal,0);
  if(groups.length&&totalKcal&&roundedTotal!==Math.round(totalKcal)) groups[groups.length-1].kcal+=Math.round(totalKcal)-roundedTotal;
  return {groups,totalExercises,totalKcal:Math.round(totalKcal)};
}

function toggleCalWorkout(id,button){
  const body=document.getElementById(id);
  if(!body) return;
  const open=body.classList.toggle('open');
  button.classList.toggle('open',open);
  button.setAttribute('aria-expanded',String(open));
}
window.toggleCalWorkout=toggleCalWorkout;


// Calendar detail rendering: structured workouts and legacy diary entries.
function calendarWorkoutExercises(entry){
  const detailed=Array.isArray(entry.exerciseDetails)?entry.exerciseDetails:null;
  if(detailed&&detailed.length)return detailed.map(ex=>({
    name:String(ex.name||ex.n||'Упражнение'),category:ex.category||'',
    sets:Array.isArray(ex.sets)?ex.sets.map(set=>({r:Number(set.r),kg:Number(set.kg)})):[],raw:''
  }));
  return String(entry.exercises||'').split(/\n|<br\s*\/?\s*>/i).map(line=>line.trim()).filter(Boolean).map(line=>{
    const split=line.indexOf(':');
    const name=split<0?line:line.slice(0,split).trim(),raw=split<0?'':line.slice(split+1).trim();
    const sets=[];
    const pattern=/(\d+)\s*[×xх*]\s*(\d+)(?:\s*(?:[-–—]\s*|\(\s*)(\d+(?:[.,]\d+)?)\s*кг\s*\)?)?/gi;
    let match;
    while((match=pattern.exec(raw))!==null){
      const count=Math.min(200,Number(match[1]));
      for(let i=0;i<count;i++)sets.push({r:Number(match[2]),kg:match[3]===undefined?null:Number(match[3].replace(',','.'))});
    }
    return {name,category:'',sets,raw};
  });
}
function calendarWorkoutGroup(ex){
  const labels={chest:'Грудь',back:'Спина',legs:'Ноги',shoulders:'Плечи',biceps:'Бицепс',triceps:'Трицепс',glutes:'Ягодицы',abs:'Пресс',forearms:'Предплечья',cardio:'Кардио'};
  if(labels[ex.category])return labels[ex.category];
  const summary=getCalendarWorkoutSummary([{exercises:ex.name,kcal:0}]);
  return summary.groups[0]?.label||'Другое';
}

// Compact read-only set descriptions shared by plans, history and calendar.
function compactWorkoutExerciseHTML(ex){
  const name=String(ex.name||ex.n||'Упражнение');
  const sets=Array.isArray(ex.sets)?ex.sets:[];
  let html='<section class="compact-workout-exercise"><b>'+escCalNote(name)+'</b>';
  if(!sets.length)return html+'<p class="compact-workout-missing">'+escCalNote(ex.raw||'Данные подходов не сохранены')+'</p></section>';
  const groups=new Map();
  sets.forEach(set=>{
    const known=set.kg!==null&&set.kg!==undefined&&String(set.kg).trim()!==''&&Number.isFinite(Number(set.kg));
    const w=known?Number(set.kg):null;
    const hasReps=set.r!==null&&set.r!==undefined&&String(set.r).trim()!==''&&Number.isFinite(Number(set.r));
    const r=hasReps?Math.round(Number(set.r)):'—';
    if(!groups.has(w))groups.set(w,[]);
    groups.get(w).push(String(r));
  });
  html+='<div class="compact-workout-sets">';
  groups.forEach((reps,w)=>{
    const line=w===null?reps.join('·'):(w===0?'б/в: ':String(w)+'×')+reps.join('·');
    const description=(w===null?'Вес не указан':w===0?'Без внешнего веса':w+' кг')+'. Повторения по подходам: '+reps.join(', ');
    html+='<span class="compact-workout-set" aria-label="'+escCalNote(description)+'" title="'+escCalNote(description)+'">'+escCalNote(line)+'</span>';
  });
  return html+'</div></section>';
}
function compactWorkoutEntryHTML(entry){
  const exercises=calendarWorkoutExercises(entry);
  return exercises.length?exercises.map(compactWorkoutExerciseHTML).join(''):'<p class="compact-workout-missing">Упражнения не сохранены</p>';
}
function toggleWorkoutHistoryPreview(button){
  const body=button.closest('.compact-history-entry')?.querySelector('.compact-history-preview');if(!body)return;
  body.hidden=!body.hidden;button.setAttribute('aria-expanded',String(!body.hidden));
}
window.toggleWorkoutHistoryPreview=toggleWorkoutHistoryPreview;
function renderCalendarWorkoutDetails(entries){
  return entries.map((entry,index)=>'<div class="cal-workout-session compact-workout-session">'+
    (entries.length>1?'<div class="compact-session-label">Тренировка '+(index+1)+'</div>':'')+
    compactWorkoutEntryHTML(entry)+'</div>').join('');
}
function renderCalendarMeals(entries){
  const labels={breakfast:'Завтрак',lunch:'Обед',dinner:'Ужин',snack:'Перекус',other:'Приём пищи не указан'};
  const groups={breakfast:[],lunch:[],dinner:[],snack:[],other:[]};
  entries.forEach(entry=>groups[Object.prototype.hasOwnProperty.call(labels,entry.mealType)?entry.mealType:'other'].push(entry));
  return Object.keys(groups).filter(key=>groups[key].length).map(key=>{
    const items=groups[key],kcal=items.reduce((sum,e)=>sum+(Number(e.kcal)||0),0);
    let html=`<div class="cal-meal-group"><div class="cal-meal-group-head"><b>${labels[key]}</b><small>${Math.round(kcal)} ккал</small></div>`;
    items.forEach(e=>{
      const name=String(e.name||'Продукт').replace(/^\s*\d{1,2}:\d{2}\s*[-–—·]?\s*/, '');
      html+=`<div class="cal-food-item"><span>${escCalNote(name)}</span><small>${foodEntryStatsHTML(e)}</small></div>`;
    });return html+'</div>';
  }).join('');
}

function showCalDay(dateStr) {
  window._calSelectedDate=dateStr;
  const detail=document.getElementById('cal-day-detail'),title=document.getElementById('cal-day-title'),entries=document.getElementById('cal-day-entries');
  if(!entries||!title)return;
  const parts=dateStr.split('.'),isoDate=`${parts[2]}-${parts[1]}-${parts[0]}`;
  const dayDiary=Array.isArray(diary)?diary.filter(d=>d.date&&d.date.startsWith(dateStr)):[];
  const calendarNote=getCalendarNotes()[dateStr]||'';
  const allFood=JSON.parse(localStorage.getItem('fs-nutrition')||'[]'),dayNutr=allFood.filter(e=>e.date===dateStr);
  const sum=k=>dayNutr.reduce((s,e)=>s+(Number(e[k])||0),0),totalKcal=sum('kcal'),totalProt=sum('protein'),totalFat=sum('fat'),totalCarbs=sum('carbs');
  const waterHist=JSON.parse(localStorage.getItem('fs-water-hist')||'[]'),waterToday=JSON.parse(localStorage.getItem('fs-water')||'{"date":"","amount":0}');
  const waterAmount=waterToday.date===isoDate?(waterToday.amount||0):((waterHist.find(h=>h.date===isoDate)||{}).amount||0);
  const waterGoal=typeof calcWaterGoal==='function'?calcWaterGoal(profile):((profile&&profile.weight)?Math.round(profile.weight*30):2000),waterPct=Math.min(100,Math.round(waterAmount/waterGoal*100));
  const months=['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
  const weekdays=['Воскресенье','Понедельник','Вторник','Среда','Четверг','Пятница','Суббота'];
  title.textContent=`${weekdays[new Date(+parts[2],+parts[1]-1,+parts[0]).getDay()]}, ${+parts[0]} ${months[+parts[1]-1]}`;
  let html=typeof renderScheduledWorkoutsForDay==='function'?renderScheduledWorkoutsForDay(isoDate):'';
  if(calendarNote){
    const noteId=`cal-note-${dateStr.replaceAll('.','-')}`;
    const notePreview=String(calendarNote).replace(/\s+/g,' ').trim();
    const noteShort=notePreview.length>72?notePreview.slice(0,72).trimEnd()+'…':notePreview;
    html+=`<section class="cal-detail-block note"><button class="cal-detail-toggle" type="button" onclick="toggleCalNote('${noteId}',this)"><span><b>Заметка</b><small class="cal-note-preview" data-note-full="${encodeURIComponent(String(calendarNote))}" data-note-short="${encodeURIComponent(noteShort)}">${escCalNote(noteShort)}</small></span><i>⌄</i></button><div class="cal-note-body" id="${noteId}"><div class="cal-note-actions"><button type="button" class="cal-note-icon-btn" onclick="openCalendarNoteSheet('${dateStr}')" aria-label="Изменить" title="Изменить"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9"></path><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"></path></svg></button><button type="button" class="cal-note-icon-btn danger" onclick="deleteCalendarNote('${dateStr}')" aria-label="Удалить" title="Удалить"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18"></path><path d="M8 6V4h8v2"></path><path d="M19 6l-1 14H6L5 6"></path><path d="M10 11v5M14 11v5"></path></svg></button></div></div></section>`;
  }
  if(dayDiary.length){
    const workoutSummary=getCalendarWorkoutSummary(dayDiary);
    const workoutId=`cal-workout-${dateStr.replaceAll('.','-')}`;
    const musclesText=workoutSummary.groups.map(group=>group.label).join(' - ');
    const workoutMeta=[musclesText,`${workoutSummary.totalExercises} упр.`,workoutSummary.totalKcal?`${workoutSummary.totalKcal} ккал`:'' ].filter(Boolean).join(' · ');
    html+=`<section class="cal-detail-block workout"><button class="cal-detail-toggle" type="button" onclick="toggleCalWorkout('${workoutId}',this)"><span><b>Тренировка</b><small>${workoutMeta}</small></span></button><div class="cal-workout-body" id="${workoutId}">`;
    html+=renderCalendarWorkoutDetails(dayDiary);
    html+='</div></section>';
  }
  if(dayNutr.length){
    const foodId=`cal-food-${dateStr.replaceAll('.','-')}`;
    html+=`<section class="cal-detail-block food"><button class="cal-detail-toggle" type="button" onclick="toggleCalFood('${foodId}',this)"><span><b>Питание</b><small>${foodStatsHTML(totalKcal,Math.round(totalProt),Math.round(totalFat),Math.round(totalCarbs))}</small></span><i>⌄</i></button><div class="cal-food-body" id="${foodId}">`;
    html+=renderCalendarMeals(dayNutr);html+='</div></section>';
  }
  if(waterAmount>0){
    const waterId=`cal-water-${dateStr.replaceAll('.','-')}`;
    const drinks=getWaterDrinkJournal().filter(item=>item.date===isoDate);
    const drinkRows=drinks.map(item=>`<div class="cal-water-item"><span>${escCalNote(item.name)}</span><small>${Math.round(Number(item.amount)||0)} мл</small></div>`).join('');
    html+=`<section class="cal-detail-block water"><button class="cal-detail-toggle" type="button" onclick="toggleCalWater('${waterId}',this)"><span><b>Вода</b><small>${waterPct}% из суточной нормы</small></span><i>⌄</i></button><div class="cal-water-body" id="${waterId}">${drinkRows?`<div class="cal-water-drinks">${drinkRows}</div>`:''}<div class="cal-water"><b>${waterAmount}</b><span>из ${waterGoal} мл</span></div><div class="cal-water-bar"><i style="width:${waterPct}%"></i></div></div></section>`;
  }
  entries.innerHTML=html;
  if(detail)detail.style.display=html?'block':'none';
}
window.showCalDay=showCalDay;

function toggleCalWater(id,button){const body=document.getElementById(id);if(!body)return;const open=body.classList.toggle('open');button.classList.toggle('open',open);}
window.toggleCalWater=toggleCalWater;

function toggleCalNote(id,button){
  const body=document.getElementById(id);if(!body)return;
  const open=body.classList.toggle('open');button.classList.toggle('open',open);
  const preview=button.querySelector('.cal-note-preview');
  if(preview){preview.textContent=decodeURIComponent(open?preview.dataset.noteFull:preview.dataset.noteShort);preview.classList.toggle('expanded',open);}
  button.setAttribute('aria-expanded',String(open));
}
window.toggleCalNote=toggleCalNote;

function toggleCalFood(id,button){const body=document.getElementById(id);if(!body)return;const open=body.classList.toggle('open');button.classList.toggle('open',open)}
window.toggleCalFood=toggleCalFood;

function openCalAddSheet(dateStr) {
  // Этот вызов теперь ниоткуда не происходит, но оставляем заглушку
  toast('Добавление тренировки через календарь отключено');
}
window.openCalAddSheet = openCalAddSheet;

function delDiaryFromCal(id, dateStr) {
  confirmDanger({
    title: 'Удалить тренировку?',
    message: 'Тренировка будет удалена из дневника без возможности восстановления.',
    onConfirm: () => {
  diary = diary.filter(e => e.id !== id);
  localStorage.setItem('fs-diary', JSON.stringify(diary));
  renderCalendar();
  setTimeout(() => showCalDay(dateStr), 50);
  toast('🗑 Тренировка удалена');
}
  });
}
window.delDiaryFromCal = delDiaryFromCal;

function editDiaryFromCal(id, dateStr) {
  const entry = diary.find(e => e.id === id);
  if (!entry) return;
  window._editCalId = id;
  window._editCalDateStr = dateStr;
  document.getElementById('cal-edit-type').value = entry.type || '';
  document.getElementById('cal-edit-exercises').value = (entry.exercises || '').replace(/<br>/g, '\n');
  document.getElementById('cal-edit-overlay').style.display = 'flex';
}
window.editDiaryFromCal = editDiaryFromCal;

function saveCalEdit() {
  const id = window._editCalId;
  const dateStr = window._editCalDateStr;
  const idx = diary.findIndex(e => e.id === id);
  if (idx === -1) return;
  const d = diary[idx];
  d.type = document.getElementById('cal-edit-type').value.trim() || d.type;
  d.exercises = document.getElementById('cal-edit-exercises').value.trim();
  delete d.exerciseDetails;
  localStorage.setItem('fs-diary', JSON.stringify(diary));
  closeCalEdit();
  renderCalendar();
  setTimeout(() => showCalDay(dateStr), 50);
  toast('✅ Тренировка обновлена');
}
window.saveCalEdit = saveCalEdit;

function closeCalEdit() {
  document.getElementById('cal-edit-overlay').style.display = 'none';
}
window.closeCalEdit = closeCalEdit;

// ==================== ЭНЦИКЛОПЕДИЯ ====================


// Голосовой поиск в справочнике: упражнения и продукты.
let knowledgeVoiceRecognition = null;
let knowledgeVoiceButton = null;

function startKnowledgeVoice(inputId, renderFunction, button) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    toast('Голосовой поиск не поддерживается этим браузером');
    return;
  }

  if (knowledgeVoiceRecognition) {
    try { knowledgeVoiceRecognition.stop(); } catch (e) {}
    return;
  }

  const input = document.getElementById(inputId);
  if (!input) return;

  knowledgeVoiceButton = button;
  knowledgeVoiceRecognition = new SpeechRecognition();
  knowledgeVoiceRecognition.lang = 'ru-RU';
  knowledgeVoiceRecognition.continuous = false;
  knowledgeVoiceRecognition.interimResults = false;
  knowledgeVoiceRecognition.maxAlternatives = 1;

  knowledgeVoiceRecognition.onstart = function () {
    button.classList.add('listening');
  };

  knowledgeVoiceRecognition.onresult = function (event) {
    const text = event.results[0][0].transcript.trim();
    input.value = text;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    if (typeof window[renderFunction] === 'function') window[renderFunction]();
    if (typeof showVoiceResult === 'function') showVoiceResult(text);
  };

  knowledgeVoiceRecognition.onerror = function (event) {
    if (event.error !== 'no-speech' && event.error !== 'aborted') {
      toast(event.error === 'not-allowed' ? 'Нет доступа к микрофону' : 'Не удалось распознать голос');
    }
  };

  knowledgeVoiceRecognition.onend = function () {
    if (knowledgeVoiceButton) knowledgeVoiceButton.classList.remove('listening');
    knowledgeVoiceButton = null;
    knowledgeVoiceRecognition = null;
  };

  knowledgeVoiceRecognition.start();
}
window.startKnowledgeVoice = startKnowledgeVoice;

let kbFoodFilter = 'all';
function openKnowledgeSection(section) {
  document.querySelectorAll('#page-encyclopedia .knowledge-home, #page-encyclopedia .knowledge-panel').forEach(el => el.classList.remove('active'));
  const target = document.getElementById(section === 'home' ? 'knowledge-home' : 'knowledge-' + section);
  if (target) target.classList.add('active');
  const allSections=document.getElementById('knowledge-all-sections');
  if(allSections)allSections.hidden=section==='home';
  if (section === 'exercises') renderEncyclopedia();
  if (section === 'foods') renderKnowledgeFoods();
  if (section === 'supplements') renderSportsSupplements();
  const scroller=document.querySelector('.scroll-area'); if(scroller) scroller.scrollTop=0;
}
window.openKnowledgeSection=openKnowledgeSection;
function clearEncSearch(){const i=document.getElementById('enc-search');if(i){i.value='';i.focus();renderEncyclopedia();}}
window.clearEncSearch=clearEncSearch;
function foodCategory(f){const n=String(f.n||'').toLowerCase();if(/куриц|индейк|говядин|свинин|рыб|тунц|семг|минта|кревет|кальмар|творог|яйц/.test(n))return'protein';if(/огур|помидор|капуст|морков|свекл|броккол|кабач|лук/.test(n))return'vegetables';if(/яблок|банан|апельсин|виноград|груш|черник|клубник/.test(n))return'fruit';if(/овся|греч|рис|макарон|булгур|перлов|кускус|пшено|хлеб|лаваш|картоф/.test(n))return'carbs';if(/орех|миндал|арахис|масло/.test(n))return'fats';return'other';}
function knowledgeFoodCategory(food){return String(food.category||'').trim()||'Без категории';}
function knowledgeFoodCategories(){
 const foods=typeof FOOD_DB!=='undefined'&&Array.isArray(FOOD_DB)?FOOD_DB:[];
 return Array.from(new Set(foods.map(knowledgeFoodCategory))).sort((a,b)=>a.localeCompare(b,'ru'));
}
function filterKnowledgeFoods(cat){kbFoodFilter=cat;renderKnowledgeFoods();}
window.filterKnowledgeFoods=filterKnowledgeFoods;
function clearKnowledgeFoodSearch(){const i=document.getElementById('kb-food-search');if(i){i.value='';i.focus();renderKnowledgeFoods();}}
window.clearKnowledgeFoodSearch=clearKnowledgeFoodSearch;
;
function renderKnowledgeFoods(){
 const list=document.getElementById('kb-food-list'),countEl=document.getElementById('kb-food-count'),input=document.getElementById('kb-food-search');
 if(!list)return;
 const foods=typeof FOOD_DB!=='undefined'&&Array.isArray(FOOD_DB)?FOOD_DB:[];
 const q=input?.value||'',fav=foodPickerFavorites(),categories=knowledgeFoodCategories();
 if(kbFoodFilter!=='all'&&!categories.includes(kbFoodFilter))kbFoodFilter='all';
 const found=(foodSearchNorm(q)?searchFoodPrefix(q,foods.length):foods).filter(f=>kbFoodFilter==='all'||knowledgeFoodCategory(f)===kbFoodFilter);
 list.innerHTML=found.map(f=>{
   const saved=fav.has(f.n),privateFood=isMyFoodName(f.n),name=foodCartEscape(f.n);
   return `<div class="knowledge-item food"><div class="knowledge-food-details"><b>${name}</b>${foodCategoryHTML(f.n,f.category)}<small>${foodStatsHTML(f.kcal,f.p,f.f,f.c,f.unit||'100 г')}</small></div>${privateFood?'':`<button type="button" class="food-library-star knowledge-food-star ${saved?'is-favorite':''}" data-name="${name}" onclick="toggleKnowledgeFoodFavorite(this.dataset.name)" aria-pressed="${saved}" aria-label="${saved?'Убрать из избранного':'Добавить в избранное'}: ${name}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h12v18l-6-4-6 4V3Z"/></svg></button>`}</div>`;
 }).join('')||'<div class="knowledge-empty">Ничего не найдено. Измени запрос или фильтр.</div>';
 if(countEl)countEl.textContent=found.length;
 const filters=document.getElementById('kb-food-filters');
 if(filters)filters.innerHTML=[['all','Все'],...categories.map(category=>[category,category])].map(([key,label])=>`<button type="button" class="knowledge-chip ${kbFoodFilter===key?'active':''}" data-category="${foodCartEscape(key)}" aria-pressed="${kbFoodFilter===key}" onclick="filterKnowledgeFoods(this.dataset.category)">${foodCartEscape(label)}</button>`).join('');
}
function toggleKnowledgeFoodFavorite(name){
 if(!setFoodFavoriteState(name))return;
 const scroller=document.querySelector('.scroll-area'),position=scroller?.scrollTop||0;
 renderKnowledgeFoods();
 if(scroller)scroller.scrollTop=position;
}
window.renderKnowledgeFoods=renderKnowledgeFoods;
window.toggleKnowledgeFoodFavorite=toggleKnowledgeFoodFavorite;

let encCat = 'all';
let favExs = new Set(JSON.parse(localStorage.getItem('fs-fav-exs') || '[]'));

function filterEnc(cat, btn) {
  encCat = cat;
  document.querySelectorAll('.enc-filter-btn').forEach(b => b.classList.remove('enc-filter-active'));
  if (btn) btn.classList.add('enc-filter-active');
  renderEncyclopedia();
}
window.filterEnc = filterEnc;

function renderEncyclopedia() {
  const clearButton = document.getElementById('enc-search-clear');
  if (clearButton) clearButton.hidden = !(document.getElementById('enc-search')?.value || '').length;
  const q = (document.getElementById('enc-search')?.value || '').toLowerCase().trim();
  const listEl = document.getElementById('enc-list');
  const countEl = document.getElementById('enc-count');
  if (!listEl) return;

  let out = '';
  let count = 0;

  for (const [cat, exs] of Object.entries(ALL_EXERCISES)) {
    if (encCat !== 'all' && encCat !== 'favs' && encCat !== cat) continue;
    for (let i = 0; i < exs.length; i++) {
      const e = exs[i];
      const favKey = `${cat}-${i}`;
      if (encCat === 'favs' && !favExs.has(favKey)) continue;
      if (q && !e.n.toLowerCase().includes(q)) continue;
      const isFav = favExs.has(favKey);

      out += `
        <div class="enc-item" style="display:flex; align-items:center; padding:12px 0; border-bottom:1px solid var(--border);">
          <button type="button" class="enc-exercise-name" data-exercise-name="${escapeSearchAttr(e.n)}" data-exercise-category="${escapeSearchAttr(cat)}" onclick="showWorkoutExerciseInfo(this.dataset.exerciseName,this,this.dataset.exerciseCategory)" aria-haspopup="dialog">${escapeSearchAttr(e.n)}</button>
<button type="button" class="enc-bookmark ${isFav ? 'is-favorite' : ''}" onclick="toggleFav('${favKey}')" aria-pressed="${isFav}" aria-label="${isFav ? 'Убрать из избранного' : 'Добавить в избранное'}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h12v18l-6-4-6 4V3Z"/></svg></button>
        </div>
      `;
      count++;
    }
  }

  if (count === 0) out = '<div style="text-align:center;padding:30px;color:var(--text-muted)">Ничего не найдено 🔍</div>';
  listEl.innerHTML = out;
  if (countEl) countEl.textContent = count + ' упражнений';

  if (listEl) {
    listEl.style.marginTop = '0';
    listEl.style.paddingTop = '0';
  }

  const scrollArea = document.querySelector('.scroll-area');
  if (scrollArea) {
    scrollArea.scrollTop = 0;
    scrollArea.scrollTo(0, 0);
  }
  window.scrollTo(0, 0);

  const filterContainer = document.getElementById('enc-filter-btns');
  if (filterContainer) {
    const cats = Object.keys(ALL_EXERCISES);
    const categoryLabels = {
      chest: 'Грудные', back: 'Спина', legs: 'Ноги', shoulders: 'Плечи',
      biceps: 'Бицепс', triceps: 'Трицепс', glutes: 'Ягодицы',
      abs: 'Пресс', forearms: 'Предплечья', cardio: 'Кардио'
    };
    filterContainer.innerHTML = `
      <button class="enc-filter-btn ${encCat === 'all' ? 'enc-filter-active' : ''}" onclick="filterEnc('all',this)">Все</button>
      ${cats.map(cat => `<button class="enc-filter-btn ${encCat === cat ? 'enc-filter-active' : ''}" onclick="filterEnc('${cat}',this)">${categoryLabels[cat] || cat}</button>`).join('')}
      <button class="enc-filter-btn ${encCat === 'favs' ? 'enc-filter-active' : ''}" onclick="filterEnc('favs',this)">Избранное</button>
    `;
  }

  // При вводе нельзя терять фокус: иначе после первой буквы поле перестаёт принимать текст.
  // Перерисовка списка и фильтров не должна прерывать печать.
}
window.renderEncyclopedia = renderEncyclopedia;

function toggleEncCard(id) {
  // заглушка
}
window.toggleEncCard = toggleEncCard;

function toggleFav(favKey) {
  if (favExs.has(favKey)) favExs.delete(favKey);
  else favExs.add(favKey);
  localStorage.setItem('fs-fav-exs', JSON.stringify([...favExs]));
  renderEncyclopedia();
  toast(favExs.has(favKey) ? 'Добавлено в избранное' : 'Убрано из избранного');
}
window.toggleFav = toggleFav;

// ==================== ПИТАНИЕ ====================
let nutrEntries = JSON.parse(localStorage.getItem('fs-nutrition') || '[]');

function getNutritionTargets(profileData) {
  const p = profileData || {};
  const bmr = typeof calcBMR === 'function' ? calcBMR(p) : 0;
  if (!p.weight || !bmr) return { kcal: 2000, protein: 126, fat: 56, carbs: 230, bmr: 0, tdee: 2000 };
  const activity = Number(p.activity) || 1.55;
  const exp = parseFloat(p.exp || 0);
  const expFactors = { 0: 0.97, 0.5: 0.98, 1: 1, 2: 1.02, 3: 1.04, 5: 1.06 };
  let factor = expFactors[exp] !== undefined ? expFactors[exp] : 1;
  if (p.coach === 'now' || p.coach === 'past') factor = Math.min(factor + 0.01, 1.07);
  const age = Number(p.age) || 25;
  const tdee = Math.round(bmr * activity * factor);
  let kcal = tdee;
  if (p.goal === 'loss') kcal -= age > 55 ? 300 : 400;
  if (p.goal === 'gain') kcal += age > 55 ? 200 : 300;
  kcal = Math.max(1200, kcal);
  const protein = Math.round((Number(p.weight) || 70) * (age > 55 ? (p.goal === 'gain' ? 2.4 : 2) : (p.goal === 'gain' ? 2.2 : 1.8)));
  const fat = Math.round(kcal * 0.25 / 9);
  const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4));
  return { kcal, protein, fat, carbs, bmr, tdee };
}
window.getNutritionTargets = getNutritionTargets;

function renderNutrEntries() {
  const _baseDate = new Date();
  _baseDate.setDate(_baseDate.getDate() + (window._nutrOffset || 0));
  const today = _baseDate.toLocaleDateString('ru-RU');
  const todayEntries = nutrEntries.filter(e => e.date === today);
  if (typeof renderMealAnalytics === 'function') renderMealAnalytics();

  // Обновляем секции приёмов пищи
  const mealTypes = ['breakfast','lunch','dinner','snack'];
  mealTypes.forEach(function(mt) {
    const items = todayEntries.filter(e => (e.mealType || 'breakfast') === mt);
    const kcalTotal = items.reduce((s, e) => s + (+e.kcal || 0), 0);
    const kcalEl = document.getElementById('meal-kcal-' + mt);
    if (kcalEl) kcalEl.textContent = Math.round(kcalTotal) + ' ккал';
    const listEl = document.getElementById('meal-items-' + mt);
    if (!listEl) return;
    if (!items.length) {
      listEl.innerHTML = '<div class="meal-empty">Нет записей</div>';
      return;
    }
    listEl.innerHTML = items.map(function(e) {
      return '<div class="meal-item" onclick="editNutrEntry(\'' + e.id + '\')">' +
        '<div class="meal-item-info">' +
          '<div class="meal-item-name">' + e.name + '</div>' +
          foodCategoryHTML(e.name, e.category) +
          '<div class="meal-item-meta">' + foodEntryStatsHTML(e) + '</div>' +
        '</div>' +
        '<button onclick="event.stopPropagation();removeNutrEntryById(\'' + e.id + '\')" class="meal-item-del">✕</button>' +
      '</div>';
    }).join('');
  });

  const totals = todayEntries.reduce((a, e) => ({
    kcal:    a.kcal    + (+e.kcal    || 0),
    protein: a.protein + (+e.protein || 0),
    carbs:   a.carbs   + (+e.carbs   || 0),
    fat:     a.fat     + (+e.fat     || 0)
  }), { kcal: 0, protein: 0, carbs: 0, fat: 0 });

  /* ---- nutrition targets are shared across the app ---- */
  const _pr = JSON.parse(localStorage.getItem('fs-profile') || '{}');
  const _targets = getNutritionTargets(_pr);
  const _kGoal = _targets.kcal;
  const _pGoal = _targets.protein;
  const _fGoal = _targets.fat;
  const _cGoal = _targets.carbs;
  const _cons  = Math.round(totals.kcal);
  const _left  = Math.max(0, _kGoal - _cons);
  const _s = (id,v) => { const e=document.getElementById(id); if(e) e.textContent=v; };
  _s('nutr-consumed',  _cons);
  _s('nutr-remaining', _left);
  _s('nutr-goal-kcal', _kGoal);
  // Gauge 240°: длина дуги = (240/360)*2π*90 ≈ 377
  const _GARC = 377;
  const _arc = document.getElementById('nutr-arc-main');
  if (_arc) {
    const _pct = Math.min(1, _kGoal > 0 ? _cons / _kGoal : 0);
    const _len = (_pct * _GARC).toFixed(1);
    _arc.setAttribute('stroke-dasharray', _len + ' ' + _GARC);
    // Два цвета: зелёный — в норме, красный — свыше нормы
    _arc.setAttribute('stroke', _cons > _kGoal ? '#ef4444' : '#22c55e');
  }
  // Метка под числом
  const _lbl = document.getElementById('nutr-gauge-label');
  if (_lbl) {
    const _over = _cons > _kGoal;
    _lbl.textContent = _over ? 'Свыше нормы' : ('Осталось ' + _left + ' ккал');
    _lbl.style.color = _over ? '#ef4444' : 'var(--text-light)';
  }
  const _bar = (cId,gId,bId,cur,goal) => {
    _s(cId, Math.round(cur)); _s(gId, goal);
    const b=document.getElementById(bId);
    if(b) b.style.width = Math.min(100, goal>0?(cur/goal*100):0).toFixed(1)+'%';
  };
  _bar('carbs-current','carbs-goal-val','carbs-bar', totals.carbs,   _cGoal);
  _bar('prot-current', 'prot-goal-val', 'prot-bar',  totals.protein, _pGoal);
  _bar('fat-current',  'fat-goal-val',  'fat-bar',   totals.fat,     _fGoal);

  // date label
  const _dlbl = document.getElementById('nutr-date-label');
  if (_dlbl) {
    const _off = window._nutrOffset || 0;
    if (_off === 0) {
      _dlbl.textContent = '📅 СЕГОДНЯ';
    } else {
      const _d = new Date(); _d.setDate(_d.getDate() + _off);
      const _mn = ['ЯНВ','ФЕВ','МАР','АПР','МАЙ','ИЮН','ИЮЛ','АВГ','СЕН','ОКТ','НОЯ','ДЕК'];
      _dlbl.textContent = '📅 ' + _d.getDate() + ' ' + _mn[_d.getMonth()];
    }
  }

  // burned calories (from workout diary for today)
  const _burnedEl = document.getElementById('nutr-burned');
  if (_burnedEl) {
    const _todayStr = new Date().toLocaleDateString('ru-RU');
    const _burned = (typeof diary !== 'undefined' ? diary : [])
      .filter(e => e.date && (e.date === _todayStr || e.date.startsWith(_todayStr)))
      .reduce((s, e) => s + (Number(e.kcal) || 0), 0);
    _burnedEl.textContent = _burned;
  }

  // slide 2 — fill nutr-extra bars based on current macros (estimated)
  const _fillExtra = (id, val, maxVal) => {
    const el = document.getElementById(id);
    if (el) el.textContent = Math.round(val);
    const fills = document.querySelectorAll('.nutr-bar-fill');
    const extras = ['nutr-fiber','nutr-sugar','nutr-sodium','nutr-satfat','nutr-pot'];
    const idx = extras.indexOf(id);
    if (idx >= 0 && fills[idx]) {
      const pct = maxVal > 0 ? Math.min(100, val / maxVal * 100) : 0;
      fills[idx].dataset.pct = pct.toFixed(1);
      if (window.nutrSlide === 1) fills[idx].style.width = pct.toFixed(1) + '%';
    }
  };
  _fillExtra('nutr-fiber',  totals.carbs * 0.15,       30);
  _fillExtra('nutr-sugar',  totals.carbs * 0.40,       50);
  _fillExtra('nutr-sodium', totals.kcal  * 1.0,      2300);
  _fillExtra('nutr-satfat', totals.fat   * 0.35,       20);
  _fillExtra('nutr-pot',    totals.kcal  * 0.5,      3500);
  // Render recipe & plan cards
  if (typeof renderRecipesCard === 'function') renderRecipesCard();
  if (typeof renderNutrPlansCard === 'function') renderNutrPlansCard();
}

function addNutrEntry(mealType) {
  const name = document.getElementById('nutr-meal-name').value.trim() || 'Блюдо';
  const kcal    = parseFloat(document.getElementById('nutr-kcal').value)    || 0;
  const protein = parseFloat(document.getElementById('nutr-protein').value) || 0;
  const carbs   = parseFloat(document.getElementById('nutr-carbs').value)   || 0;
  const fat     = parseFloat(document.getElementById('nutr-fat').value)     || 0;
  nutrEntries.push({
    id: Date.now() + '_' + Math.random().toString(36).slice(2),
    name,
    kcal: Math.round(kcal),
    protein: +protein.toFixed ? +protein.toFixed(1) : +protein,
    carbs:   +carbs.toFixed   ? +carbs.toFixed(1)   : +carbs,
    fat:     +fat.toFixed     ? +fat.toFixed(1)      : +fat,
    mealType: mealType || window._currentMealType || 'breakfast',
    date: (function(){ var d=new Date(); d.setDate(d.getDate()+(window._nutrOffset||0)); return d.toLocaleDateString('ru-RU'); })()
  });
  localStorage.setItem('fs-nutrition', JSON.stringify(nutrEntries));
  ['nutr-meal-name', 'nutr-kcal', 'nutr-protein', 'nutr-carbs', 'nutr-fat'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  renderNutrEntries();
}
window.addNutrEntry = addNutrEntry;

function removeNutrEntry(idx) {
  const today = new Date().toLocaleDateString('ru-RU');
  const entry = nutrEntries.filter(e => e.date === today)[idx];
  if (!entry) return;
  if (!confirm('Удалить запись «' + entry.name + '»?')) return;
  if (entry.id) {
    nutrEntries = nutrEntries.filter(e => e.id !== entry.id);
  } else {
    let removed = false;
    nutrEntries = nutrEntries.filter(e => {
      const same = e.date === entry.date && e.name === entry.name && e.kcal === entry.kcal;
      if (!removed && same) { removed = true; return false; }
      return true;
    });
  }
  localStorage.setItem('fs-nutrition', JSON.stringify(nutrEntries));
  renderNutrEntries();
  toast('🗑 Запись удалена');
}
window.removeNutrEntry = removeNutrEntry;

function removeNutrEntryById(id) {
  if (!confirm('Удалить запись?')) return;
  nutrEntries = nutrEntries.filter(e => e.id !== id);
  localStorage.setItem('fs-nutrition', JSON.stringify(nutrEntries));
  renderNutrEntries();
  toast('🗑 Запись удалена');
}
window.removeNutrEntryById = removeNutrEntryById;

// Открыть food picker для конкретного приёма пищи
function openMealPicker(mealType) {
  window._currentMealType = mealType;
  openFoodPicker();
}
window.openMealPicker = openMealPicker;

// Показывает bottom sheet выбора приёма пищи (для CTA кнопки)
function openMealPickerSheet() {
  var existing = document.getElementById('meal-picker-sheet');
  if (existing) {
    document.getElementById('meal-picker-overlay').classList.add('show');
    existing.classList.add('show');
    return;
  }
  var ov = document.createElement('div');
  ov.id = 'meal-picker-overlay';
  ov.className = 'sheet-overlay';
  ov.onclick = closeMealPickerSheet;
  document.body.appendChild(ov);

  var sh = document.createElement('div');
  sh.id = 'meal-picker-sheet';
  sh.className = 'bottom-sheet';
  sh.innerHTML = '<div class="sheet-handle"></div>' +
    '<div class="sheet-title">Куда добавить?</div>' +
    '<div style="display:flex;flex-direction:column;gap:10px;" id="meal-pick-list"></div>';
  document.body.appendChild(sh);

  var meals = [
    {id:'breakfast', icon:'🌅', label:'Завтрак'},
    {id:'lunch',     icon:'☀️',  label:'Обед'},
    {id:'dinner',    icon:'🌙', label:'Ужин'},
    {id:'snack',     icon:'🍎', label:'Перекус'}
  ];
  var list = sh.querySelector('#meal-pick-list');
  meals.forEach(function(m) {
    var btn = document.createElement('button');
    btn.className = 'meal-pick-sheet-btn';
    btn.innerHTML = '<span>' + m.icon + '</span> ' + m.label;
    btn.addEventListener('click', function() {
      closeMealPickerSheet();
      openMealPicker(m.id);
    });
    list.appendChild(btn);
  });

  setTimeout(function() {
    sh.style.transform = 'translateY(0)';
    ov.classList.add('show');
    sh.classList.add('show');
    attachGramsSheetGestures();
    var inp = document.getElementById('grams-input');
    if (inp) {
      inp.addEventListener('focus', function() { try { inp.select(); } catch(e){} }, {once:true});
    }
  }, 10);
}
window.openMealPickerSheet = openMealPickerSheet;

function closeMealPickerSheet() {
  var ov = document.getElementById('meal-picker-overlay');
  var sh = document.getElementById('meal-picker-sheet');
  if (ov) ov.classList.remove('show');
  if (sh) sh.classList.remove('show');
}
window.closeMealPickerSheet = closeMealPickerSheet;

// Переключение секций приёмов пищи
function toggleMealSection(mt) {
  const items = document.getElementById('meal-items-' + mt);
  const arrow = document.getElementById('meal-arrow-' + mt);
  if (!items) return;
  const isOpen = items.classList.contains('open');
  items.classList.toggle('open', !isOpen);
  if (arrow) arrow.style.transform = isOpen ? 'rotate(0deg)' : 'rotate(90deg)';
}
window.toggleMealSection = toggleMealSection;

// ==================== ГОТОВЫЙ ПЛАН ПИТАНИЯ ====================
const NUTRITION_PLAN_2626 = {
  title: 'Рацион 2626 ккал (6 приёмов)',
  meals: [
    {
      time: '08:00', meal_type: 'Завтрак',
      items: [
        { name: 'Овсяная каша на молоке', weight_g: 250, protein: 8.8, fat: 8.0, carbs: 37.5, kcal: 255 },
        { name: 'Яйцо куриное', weight_g: 110, protein: 14.3, fat: 12.5, kcal: 172, carbs: 0.7 },
        { name: 'Банан', weight_g: 120, protein: 1.8, fat: 0.1, carbs: 25.2, kcal: 108 },
        { name: 'Масло сливочное', weight_g: 10, protein: 0.1, fat: 8.2, carbs: 0.1, kcal: 75 }
      ]
    },
    {
      time: '11:30', meal_type: 'Перекус',
      items: [
        { name: 'Творог 5%', weight_g: 150, protein: 25.5, fat: 7.5, carbs: 2.7, kcal: 181 },
        { name: 'Мёд', weight_g: 15, protein: 0.1, fat: 0.0, carbs: 12.0, kcal: 49 },
        { name: 'Грецкий орех', weight_g: 15, protein: 2.3, fat: 9.8, carbs: 1.1, kcal: 98 }
      ]
    },
    {
      time: '14:00', meal_type: 'Обед',
      items: [
        { name: 'Куриная грудка', weight_g: 150, protein: 34.7, fat: 1.8, carbs: 0.0, kcal: 165 },
        { name: 'Гречневая каша отварная', weight_g: 250, protein: 9.8, fat: 2.0, carbs: 49.8, kcal: 253 },
        { name: 'Помидор свежий', weight_g: 80, protein: 0.5, fat: 0.2, carbs: 3.4, kcal: 16 },
        { name: 'Огурец свежий', weight_g: 80, protein: 0.6, fat: 0.1, carbs: 2.4, kcal: 12 },
        { name: 'Перец болгарский', weight_g: 80, protein: 0.8, fat: 0.1, carbs: 4.3, kcal: 22 },
        { name: 'Масло оливковое', weight_g: 15, protein: 0.0, fat: 14.9, carbs: 0.0, kcal: 135 }
      ]
    },
    {
      time: '17:00', meal_type: 'Полдник',
      items: [
        { name: 'Хлебцы цельнозерновые', weight_g: 25, protein: 2.3, fat: 0.3, carbs: 18.0, kcal: 85 },
        { name: 'Сыр Российский', weight_g: 50, protein: 11.6, fat: 14.8, carbs: 0.0, kcal: 182 },
        { name: 'Яблоко зелёное', weight_g: 150, protein: 0.6, fat: 0.6, carbs: 14.7, kcal: 71 }
      ]
    },
    {
      time: '19:30', meal_type: 'Ужин',
      items: [
        { name: 'Горбуша запечённая', weight_g: 150, protein: 31.5, fat: 10.5, carbs: 0.0, kcal: 222 },
        { name: 'Картофель отварной', weight_g: 200, protein: 4.0, fat: 0.8, carbs: 33.4, kcal: 164 },
        { name: 'Спаржа тушёная', weight_g: 150, protein: 2.9, fat: 0.2, carbs: 4.8, kcal: 30 },
        { name: 'Сметана 10%', weight_g: 20, protein: 0.6, fat: 2.0, carbs: 0.6, kcal: 23 }
      ]
    },
    {
      time: '22:00', meal_type: 'На ночь (казеин)',
      items: [
        { name: 'Кефир 1%', weight_g: 250, protein: 7.5, fat: 2.5, carbs: 9.5, kcal: 100 },
        { name: 'Отруби ржаные', weight_g: 10, protein: 1.1, fat: 0.3, carbs: 3.2, kcal: 19 }
      ]
    }
  ]
};

function loadNutritionPlan() {
  if (!confirm('Загрузить готовый план «' + NUTRITION_PLAN_2626.title + '» на сегодня?\nВсе продукты будут добавлены в дневник питания за сегодня.')) return;
  const today = new Date().toLocaleDateString('ru-RU');
  let added = 0;
  NUTRITION_PLAN_2626.meals.forEach(meal => {
    meal.items.forEach(item => {
      nutrEntries.push({
        id: Date.now() + '_' + Math.random().toString(36).slice(2),
        name: meal.time + ' ' + meal.meal_type + ': ' + item.name + ' (' + item.weight_g + 'г)',
        kcal: item.kcal,
        protein: item.protein,
        carbs: item.carbs,
        fat: item.fat,
        date: today
      });
      added++;
    });
  });
  localStorage.setItem('fs-nutrition', JSON.stringify(nutrEntries));
  renderNutrEntries();
  toast('✅ Добавлено ' + added + ' продуктов из плана!');
}
window.loadNutritionPlan = loadNutritionPlan;

// ==================== БАЗА ПРОДУКТОВ: ВЫБОР ====================
const FOOD_MEAL_TITLES = { breakfast: 'Завтрак', lunch: 'Обед', dinner: 'Ужин', snack: 'Перекус' };
const NUTRITION_PAGE_TITLE = '🍽️ Питание';

function openFoodPicker() {
  resetFoodVoicePortion();
  foodPickerTab=null;
  resetFoodLibraryControls();
  const input = document.getElementById('food-search');
  if (input) input.value = '';
  renderFoodPicker();
  refreshFoodCart();
  goTo('foodpick', FOOD_MEAL_TITLES[window._currentMealType] || 'Продукты');
  const sa = document.querySelector('.scroll-area');
  if (sa) sa.scrollTop = 0;
  if (input) { try { input.blur(); } catch (e) {} }
}


// Выбор приёма пищи в заголовке страницы поиска. Поиск не получает фокус автоматически.
function syncFoodMealHeading() {
  const h=document.getElementById('header-title');if(!h)return;
  const meal=window._currentMealType||'breakfast';
  h.innerHTML='<span class="food-meal-heading"><span class="food-meal-label">'+foodCartEscape(FOOD_MEAL_TITLES[meal]||'Завтрак')+'</span><svg class="food-meal-arrow" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m4 6 4 4 4-4"/></svg><select id="food-meal-select" aria-label="Приём пищи" onchange="changeFoodPickerMeal(this.value)">'+Object.keys(FOOD_MEAL_TITLES).map(k=>'<option value="'+k+'" '+(meal===k?'selected':'')+'>'+FOOD_MEAL_TITLES[k]+'</option>').join('')+'</select></span>';
}
function changeFoodPickerMeal(meal) {
  if(!Object.prototype.hasOwnProperty.call(FOOD_MEAL_TITLES,meal))return;
  const input=document.getElementById('food-search');if(input)input.blur();
  const select=document.getElementById('food-meal-select');if(select)select.blur();
  window._currentMealType=meal;
  closeFoodCart();
  const label=document.querySelector('#header-title .food-meal-label');
  if(label)label.textContent=FOOD_MEAL_TITLES[meal];
  refreshFoodCart();
}
window.changeFoodPickerMeal=changeFoodPickerMeal;

function closeFoodPicker() {
  resetFoodVoicePortion();
  if(foodVoiceRecognition)foodVoiceRecognition.abort();
  const input = document.getElementById('food-search');
  if (input) input.blur();
  goTo('nutrition', NUTRITION_PAGE_TITLE);
}
window.closeFoodPicker = closeFoodPicker;
window.openFoodPicker = openFoodPicker;

let _foodSearchIndex = null;
let _foodSearchIndexSize = -1;

function foodSearchNorm(value) {
  return String(value == null ? '' : value).toLowerCase().replace(/ё/g, 'е').replace(/[^a-zа-я0-9]+/g, ' ').trim();
}

function foodSearchBuildIndex() {
  const db = Array.isArray(FOOD_DB) ? FOOD_DB : [];
  if (_foodSearchIndex && _foodSearchIndexSize === db.length) return _foodSearchIndex;
  _foodSearchIndex = db.map(function(item) {
    const n = foodSearchNorm(item.n);
    return { item: item, n: n, words: n.split(' ') };
  });
  _foodSearchIndexSize = db.length;
  return _foodSearchIndex;
}

// Поиск по началу названия или начала любого слова: «ру» -> «Рукола», «Салат из руколы», но не «Груша».
function searchFoodPrefix(query, limit) {
  const qn = foodSearchNorm(query);
  if (!qn) return [];
  const qWords = qn.split(' ');
  const found = [];
  foodSearchBuildIndex().forEach(function(entry) {
    let rank;
    if (entry.n.indexOf(qn) === 0) {
      rank = 0;
    } else {
      const ok = qWords.every(function(qw) {
        return entry.words.some(function(w) { return w.indexOf(qw) === 0; });
      });
      if (!ok) return;
      rank = entry.words[0].indexOf(qWords[0]) === 0 ? 1 : 2;
    }
    found.push({ rank: rank, entry: entry });
  });
  found.sort(function(a, b) {
    return a.rank - b.rank || a.entry.n.length - b.entry.n.length || a.entry.n.localeCompare(b.entry.n, 'ru');
  });
  return found.slice(0, limit || 60).map(function(x) { return x.entry.item; });
}
window.searchFoodPrefix = searchFoodPrefix;


function foodCategoryLabel(name, savedCategory) {
  if (savedCategory) return savedCategory;
  const db = typeof FOOD_DB !== 'undefined' ? FOOD_DB : [];
  const f = pickerFoodByName(name);
  return f && f.category ? f.category : '';
}
function foodCategoryHTML(name, savedCategory) {
  const cat = foodCategoryLabel(name, savedCategory);
  return cat ? '<div class="food-category-label" style="font-size:12px;line-height:1.35;color:var(--text-light);font-weight:500;margin:3px 0 5px">' + foodCartEscape(cat) + '</div>' : '';
}

// ===== История / Избранное / собственные продукты =====
let foodPickerTab = null;
let foodPickerSortOpen = false;
let foodLibraryMenuOpen=false;
let foodLibrarySelecting=false;
let foodLibrarySelected=new Set();
function foodPickerRead(key, fallback) {
  try { const value=JSON.parse(localStorage.getItem(key)); return value == null ? fallback : value; }
  catch(e) { return fallback; }
}
function foodPickerNames(key) {
  const a=foodPickerRead(key,[]);return Array.isArray(a)?a.filter(v=>typeof v==='string'):[];
}
function foodPickerStore(key, value) {
  try {localStorage.setItem(key,JSON.stringify(value));return true;} catch(e) {toast('Не удалось сохранить: хранилище недоступно или заполнено');return false;}
}
function ownFoods() {
  const a=myFoodRead();
  return Array.isArray(a)?a.filter(f=>f&&typeof f.n==='string'&&Number.isFinite(f.kcal)):[];
}
function pickerAllFoods() {return (typeof FOOD_DB!=='undefined'?FOOD_DB:[]).concat(ownFoods());}
function pickerFoodByName(name) {return ownFoods().find(f=>f.n===name)||(typeof FOOD_DB!=='undefined'?FOOD_DB.find(f=>f.n===name):null);}
function foodPickerFavorites() {return new Set(foodPickerNames('fs-food-favorites').filter(n=>!isMyFoodName(n)));}
const FOOD_HISTORY_TTL=14*24*60*60*1000;
function foodPickerRecentNames() {
  const now=Date.now(),cutoff=now-FOOD_HISTORY_TTL;
  let saved=foodPickerNames('fs-food-recent').filter(n=>!isMyFoodName(n));
  const raw=foodPickerRead('fs-food-recent-used-at',null);
  let dates=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:null;
  if(!dates){
    dates={};
    const journalDates=new Map();
    for(const entry of (Array.isArray(nutrEntries)?nutrEntries:[])){
      const parts=String(entry.date||'').split('.');
      if(parts.length!==3)continue;
      const year=Number(parts[2]),month=Number(parts[1]),day=Number(parts[0]);
      const date=new Date(year,month-1,day);
      if(date.getFullYear()!==year||date.getMonth()!==month-1||date.getDate()!==day)continue;
      const time=Math.min(now,date.getTime());
      if(entry.name&&!isMyFoodName(entry.name))journalDates.set(entry.name,Math.max(journalDates.get(entry.name)||0,time));
    }
    if(!foodPickerRead('fs-food-history-managed',false)){
      saved=Array.from(new Set(saved.concat(Array.from(journalDates.keys()))));
    }
    for(const name of saved)dates[name]=journalDates.has(name)?journalDates.get(name):now;
  }
  const names=Array.from(new Set(saved)).filter(name=>Number.isFinite(dates[name])&&dates[name]>cutoff)
    .sort((a,b)=>dates[b]-dates[a]).slice(0,40);
  const active=Object.fromEntries(names.map(name=>[name,dates[name]]));
  foodPickerStore('fs-food-recent-used-at',active);
  foodPickerStore('fs-food-recent',names);
  foodPickerStore('fs-food-history-managed',true);
  return names;
}
function rememberFoodPickerProduct(name) {
  if(isMyFoodName(name))return;
  const names=[name].concat(foodPickerRecentNames().filter(n=>n!==name)).slice(0,40);
  const dates=foodPickerRead('fs-food-recent-used-at',{});
  const updated=Object.fromEntries(names.map(n=>[n,n===name?Date.now():dates[n]]));
  if(foodPickerStore('fs-food-recent-used-at',updated))foodPickerStore('fs-food-recent',names);
}

// Порция из голосового поиска действует только для текущего запроса.
let foodVoicePortion=null;
let foodVoiceRecognition=null;
function resetFoodVoicePortion(){foodVoicePortion=null;}
function parseFoodVoiceQuery(text){
  const original=String(text||'').trim();
  const normalized=original.toLowerCase().replace(/ё/g,'е');
  const unitRx='(?:миллилитр(?:а|ов|ы)?|килограмм(?:а|ов|ы)?|грамм(?:а|ов|ы)?|литр(?:а|ов|ы)?|мл|кг|г|л)';
  const units=new RegExp('(^|\\s)(\\d+(?:[.,]\\d+)?)\\s*('+unitRx+')(?![а-яa-z])','i');
  let match=units.exec(normalized), amount=null, start=0, end=0, unit='г';
  if(match){amount=Number(match[2].replace(',','.'));unit=match[3];start=match.index;end=start+match[0].length;}
  if(!match){
    const words={ноль:0,один:1,одна:1,одно:1,два:2,две:2,три:3,четыре:4,пять:5,шесть:6,семь:7,восемь:8,девять:9,десять:10,одиннадцать:11,двенадцать:12,тринадцать:13,четырнадцать:14,пятнадцать:15,шестнадцать:16,семнадцать:17,восемнадцать:18,девятнадцать:19,двадцать:20,тридцать:30,сорок:40,пятьдесят:50,шестьдесят:60,семьдесят:70,восемьдесят:80,девяносто:90,сто:100,двести:200,триста:300,четыреста:400,пятьсот:500,шестьсот:600,семьсот:700,восемьсот:800,девятьсот:900,тысяча:1000};
    const wordRx=new RegExp('(^|\\s)((?:(?:'+Object.keys(words).join('|')+')\\s+)+)('+unitRx+')(?![а-яa-z])','i');
    match=wordRx.exec(normalized);
    if(match){amount=match[2].trim().split(/\s+/).reduce((sum,w)=>sum+words[w],0);unit=match[3];start=match.index;end=start+match[0].length;}
  }
  if(!match)return {query:original,portion:null};
  if(/^(кг|килограмм)/.test(unit)){amount*=1000;unit='г';}
  else if(/^(л|литр)/.test(unit)){amount*=1000;unit='мл';}
  else unit=/^(мл|миллилитр)/.test(unit)?'мл':'г';
  const query=(original.slice(0,start)+' '+original.slice(end)).replace(/\s+/g,' ').replace(/^[\s,.;:]+|[\s,.;:]+$/g,'').trim();
  if(!query||!Number.isFinite(amount)||amount<1||amount>9999)return {query:original,portion:null};
  return {query,portion:{amount:+amount.toFixed(2),unit,query:foodSearchNorm(query)}};
}
function applyFoodVoiceQuery(text){
  resetFoodVoicePortion();
  const parsed=parseFoodVoiceQuery(text),input=document.getElementById('food-search');
  if(!input)return;
  input.value=parsed.query;
  foodVoicePortion=parsed.portion;
  foodPickerTab=null;resetFoodLibraryControls();renderFoodPicker();
  input.blur();
}
window.applyFoodVoiceQuery=applyFoodVoiceQuery;
function startFoodPickerVoice(){
  if(foodVoiceRecognition){foodVoiceRecognition.stop();return;}
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!SR){toast('Голосовой ввод не поддерживается в этом браузере');return;}
  resetFoodVoicePortion();
  const recognizer=new SR(),button=document.getElementById('food-mic-btn');
  const voiceTab=foodPickerTab, voiceForm=document.getElementById('my-food-form');
  foodVoiceRecognition=recognizer;
  recognizer.lang='ru-RU';recognizer.continuous=false;recognizer.interimResults=false;
  recognizer.onstart=()=>button?.classList.add('listening');
  recognizer.onresult=e=>{
    if(currentPage!=='foodpick'||foodPickerTab!==voiceTab)return;
    const text=e.results[0][0].transcript;
    if(voiceTab==='add'){
      if(voiceForm!==document.getElementById('my-food-form'))return;
      if(window.fsPrivateFoodVoice)window.fsPrivateFoodVoice(text);
    }else if(window.handleBatchMealVoice&&window.handleBatchMealVoice(text)){}else applyFoodVoiceQuery(text);
  };
  recognizer.onerror=e=>{if(e.error!=='aborted'&&e.error!=='no-speech')toast(e.error==='not-allowed'?'Разрешите доступ к микрофону':'Не удалось распознать речь. Попробуйте ещё раз.');};
  recognizer.onend=()=>{if(foodVoiceRecognition===recognizer)foodVoiceRecognition=null;button?.classList.remove('listening');};
  try{recognizer.start();}catch(e){foodVoiceRecognition=null;button?.classList.remove('listening');toast('Не удалось включить микрофон');}
}
window.startFoodPickerVoice=startFoodPickerVoice;
function bindFoodPickerVoice(){
  const button=document.getElementById('food-mic-btn');
  if(button)button.onclick=startFoodPickerVoice;
}
bindFoodPickerVoice();
window.addEventListener('load',bindFoodPickerVoice);
document.addEventListener('input',function(e){if(e.target.id==='food-search')resetFoodVoicePortion();},true);

function selectFoodPickerTab(tab) {
  resetFoodVoicePortion();
  const next=['favorites','add','mine'].includes(tab)?tab:'recent';
  const input=document.getElementById('food-search');
  const wasSearching=!!foodSearchNorm(input?.value||'');
  if(input){input.value='';input.blur();}
  foodPickerTab=next==='add'?'add':(!wasSearching&&foodPickerTab===next?null:next);
  if(next==='mine'||next==='add')myFoodView={mode:next==='add'?'choose':'list',kind:'product',id:null};
  myFoodEditingPick=false;
  foodPickerSortOpen=false;foodLibraryMenuOpen=false;foodLibrarySelecting=false;foodLibrarySelected.clear();
  renderFoodPicker();
}
window.selectFoodPickerTab=selectFoodPickerTab;
function setFoodFavoriteState(name){
  if(isMyFoodName(name))return false;
  const fav=foodPickerFavorites();if(fav.has(name))fav.delete(name);else fav.add(name);
  return foodPickerStore('fs-food-favorites',Array.from(fav));
}
function toggleFoodPickerFavorite(name) {
  if(!setFoodFavoriteState(name))return;
  const sa=document.querySelector('.scroll-area'),pos=sa?sa.scrollTop:0;
  renderFoodPicker();if(sa)sa.scrollTop=pos;
}
window.toggleFoodPickerFavorite=toggleFoodPickerFavorite;
function getFoodPickerSort() {
  const modes=foodPickerRead('fs-food-library-sort',{});
  const v=modes&&modes[foodPickerTab];return ['recent','az','za'].includes(v)?v:'recent';
}
function toggleFoodPickerSort() {
  if(['own','recipes','add'].includes(foodPickerTab))foodPickerTab='recent';foodPickerSortOpen=!foodPickerSortOpen;foodLibraryMenuOpen=false;renderFoodPicker();}
window.toggleFoodPickerSort=toggleFoodPickerSort;
function setFoodPickerSort(mode) {
  if(!['recent','az','za'].includes(mode))return;
  const old=foodPickerRead('fs-food-library-sort',{}),modes=old&&typeof old==='object'&&!Array.isArray(old)?old:{};
  modes[foodPickerTab]=mode;foodPickerStore('fs-food-library-sort',modes);foodPickerSortOpen=false;renderFoodPicker();
}
window.setFoodPickerSort=setFoodPickerSort;
function foodLibrarySort(items) {
  const mode=getFoodPickerSort();
  if(mode==='az'||mode==='za')return items.slice().sort((a,b)=>(mode==='az'?1:-1)*a.n.localeCompare(b.n,'ru',{numeric:true,sensitivity:'base'}));
  const recent=foodPickerRecentNames(),order=new Map(recent.map((n,i)=>[n,i]));
  const favAdded=Array.from(foodPickerFavorites()).reverse(),fallback=new Map(favAdded.map((n,i)=>[n,i]));
  const rank=n=>order.has(n)?order.get(n):1000+(fallback.has(n)?fallback.get(n):10000);
  return items.slice().sort((a,b)=>rank(a.n)-rank(b.n));
}

function resetFoodLibraryControls() {
  foodLibraryMenuOpen=false;foodPickerSortOpen=false;foodLibrarySelecting=false;foodLibrarySelected.clear();
}
function toggleFoodLibraryMenu() {
  if(foodPickerTab==='add'){return;}
  if(!foodPickerTab||['own','recipes'].includes(foodPickerTab))foodPickerTab='recent';
  foodLibraryMenuOpen=!foodLibraryMenuOpen;foodPickerSortOpen=false;renderFoodPicker();
}
window.toggleFoodLibraryMenu=toggleFoodLibraryMenu;
function foodLibraryActiveNames() {
  if(foodPickerTab==='mine')return myFoodVisibleRows().map(x=>x.id);
  return foodPickerTab==='favorites'?Array.from(foodPickerFavorites()):foodPickerRecentNames();
}
function beginFoodLibrarySelection() {
  myFoodEditingPick=false;
  const input=document.getElementById('food-search');if(input){input.value='';input.blur();}
  foodLibraryMenuOpen=false;foodPickerSortOpen=false;foodLibrarySelected.clear();foodLibrarySelecting=true;renderFoodPicker();
}
window.beginFoodLibrarySelection=beginFoodLibrarySelection;
function cancelFoodLibrarySelection() {
  myFoodEditingPick=false;
  foodLibrarySelecting=false;foodLibrarySelected.clear();renderFoodPicker();
}
window.cancelFoodLibrarySelection=cancelFoodLibrarySelection;
function toggleFoodLibrarySelection(name) {
  if(foodLibrarySelected.has(name))foodLibrarySelected.delete(name);else foodLibrarySelected.add(name);
  const sa=document.querySelector('.scroll-area'),pos=sa?sa.scrollTop:0;renderFoodPicker();if(sa)sa.scrollTop=pos;
}
window.toggleFoodLibrarySelection=toggleFoodLibrarySelection;
function removeFoodLibraryNames(names, tab) {
  const remove=new Set(names);
  const target=tab||foodPickerTab;
  if(target==='mine'){myFoodDeleteMany(names);return;}
  const key=target==='favorites'?'fs-food-favorites':'fs-food-recent';
  const current=target==='favorites'?Array.from(foodPickerFavorites()):foodPickerRecentNames();
  const values=current.filter(n=>!remove.has(n));
  if(!foodPickerStore(key,values))return;
  resetFoodLibraryControls();renderFoodPicker();
}
function deleteSelectedFoodLibrary() {
  if(!foodLibrarySelected.size)return;
  const tab=foodPickerTab;
  const names=Array.from(foodLibrarySelected);
  confirmDanger({
    title:tab==='mine'?'Удалить выбранные записи?':'Удалить выбранные продукты?',
    confirmText:'Удалить',
    compact:true,
    onConfirm:function(){removeFoodLibraryNames(names,tab);}
  });
}
window.deleteSelectedFoodLibrary=deleteSelectedFoodLibrary;
function clearFoodLibrary() {
  const tab=foodPickerTab;
  const names=foodLibraryActiveNames();
  if(!names.length){foodLibraryMenuOpen=false;renderFoodPicker();return;}
  const input=document.getElementById('food-search');if(input)input.blur();
  foodLibraryMenuOpen=false;renderFoodPicker();
  confirmDanger({
    title:tab==='mine'?(myFoodKindFilter==='recipe'?'Удалить все рецепты?':myFoodKindFilter==='product'?'Удалить все продукты?':'Очистить мою еду?'):tab==='favorites'?'Очистить избранное?':'Очистить историю?',
    confirmText:'Удалить',
    compact:true,
    onConfirm:function(){
      const search=document.getElementById('food-search');if(search)search.value='';
      removeFoodLibraryNames(names,tab);
    }
  });
}
window.clearFoodLibrary=clearFoodLibrary;
document.addEventListener('click',function(e){
  if(foodLibraryMenuOpen&&!e.target.closest('.food-library-overflow')){
    foodLibraryMenuOpen=false;
    document.querySelector('.food-library-action-menu')?.remove();
    document.querySelector('.food-library-more')?.setAttribute('aria-expanded','false');
  }
  if(foodPickerSortOpen&&!e.target.closest('.food-sort-button,.food-sort-menu')){
    foodPickerSortOpen=false;
    document.querySelector('.food-sort-menu')?.remove();
    document.querySelector('.food-sort-button')?.setAttribute('aria-expanded','false');
  }
});
document.addEventListener('keydown',function(e){
  if(e.key==='Escape'&&(foodLibraryMenuOpen||foodPickerSortOpen||foodLibrarySelecting||myFoodEditingPick)){myFoodEditingPick=false;resetFoodLibraryControls();renderFoodPicker();}
});
function foodLibraryRow(f,fav) {
  if(foodLibrarySelecting){
    const checked=foodLibrarySelected.has(f.n);
    return `<div class="food-pick-item food-library-row food-library-select-row ${checked?'selected':''}">
      <button type="button" class="food-library-main" data-name="${foodCartEscape(f.n)}" onclick="toggleFoodLibrarySelection(this.dataset.name)" aria-label="${checked?'Снять выделение: ':'Выбрать: '}${foodCartEscape(f.n)}">
        <span class="food-library-name">${foodCartEscape(f.n)}</span>${foodCategoryHTML(f.n)}
        <span class="food-library-meta">${foodStatsHTML(f.kcal,f.p,f.f,f.c,f.unit||'100 г')}</span>
      </button>
      <button type="button" class="food-library-add" role="checkbox" aria-checked="${checked}" data-name="${foodCartEscape(f.n)}" onclick="toggleFoodLibrarySelection(this.dataset.name)" aria-label="Выбрать: ${foodCartEscape(f.n)}"><span class="food-library-checkbox" aria-hidden="true">${checked?'✓':''}</span></button>
    </div>`;
  }
  return `<div class="food-pick-item food-library-row">
    <button type="button" class="food-library-main" data-name="${foodCartEscape(f.n)}" onclick="applyFoodItem(this.dataset.name)">
      <span class="food-library-name">${foodCartEscape(f.n)}</span>${foodCategoryHTML(f.n)}
      <span class="food-library-meta">${foodStatsHTML(f.kcal,f.p,f.f,f.c,f.unit||'100 г')}</span>
    </button>
    <button type="button" class="food-library-star ${fav.has(f.n)?'is-favorite':''}" data-name="${foodCartEscape(f.n)}" onclick="toggleFoodPickerFavorite(this.dataset.name)" aria-pressed="${fav.has(f.n)}" aria-label="${fav.has(f.n)?'Убрать из избранного':'Добавить в избранное'}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h12v18l-6-4-6 4V3Z"/></svg></button>
  </div>`;
}
function ownFoodFormHTML() {
  return `<section class="food-own-panel food-own-inline" aria-labelledby="food-own-title">
    <div class="food-own-head"><h2 id="food-own-title">Свой продукт</h2></div>
    <form id="food-own-form" novalidate>
      <label class="food-own-field">Название<input id="food-own-name" type="text" maxlength="160" autocomplete="off"></label>
      <label class="food-own-field">Значения<select id="food-own-unit"><option value="г">100 г</option><option value="мл">100 мл</option></select></label>
      <div class="food-own-grid">
        <label class="food-own-field">Калории, ккал<input id="food-own-kcal" type="text" inputmode="decimal" placeholder="0"></label>
        <label class="food-own-field">Белки, г<input id="food-own-p" type="text" inputmode="decimal" placeholder="0"></label>
        <label class="food-own-field">Жиры, г<input id="food-own-f" type="text" inputmode="decimal" placeholder="0"></label>
        <label class="food-own-field">Углеводы, г<input id="food-own-c" type="text" inputmode="decimal" placeholder="0"></label>
      </div>
      <div id="food-own-error" class="food-own-error" role="alert"></div>
      <button type="submit" class="food-own-save">Сохранить продукт</button>
    </form></section>`;
}
function openOwnFoodForm() {
  resetFoodVoicePortion();
  resetFoodLibraryControls();
  const input=document.getElementById('food-search');
  if(input){input.value='';input.blur();}
  foodPickerTab='own';
  renderFoodPicker();
}
window.openOwnFoodForm=openOwnFoodForm;
function closeOwnFoodForm() {
  const el=document.getElementById('food-own-overlay');
  if(el)el.remove();
  const form=document.getElementById('food-own-form');
  const active=document.activeElement;
  if(form&&active&&form.contains(active))active.blur();
  if(foodPickerTab==='own')foodPickerTab=null;
}
window.closeOwnFoodForm=closeOwnFoodForm;

// Удаление своего продукта и его порций только из выбранной корзины.
function privateFoodForPortion(item){
  if(!item)return null;
  const rows=myFoodRead();
  if(item.myFoodId!=null)return rows.find(x=>String(x.id)===String(item.myFoodId))||null;
  const matches=rows.filter(x=>x.n===item.name);
  return matches.length===1?matches[0]:null;
}
function requestDeleteOwnFood(){
  const entry=privateFoodForPortion(window._gramsItem);
  if(!entry){toast('Не удалось определить запись для удаления. Откройте её заново из «Моей еды».');return;}
  const id=String(entry.id),recipe=entry.kind==='recipe';
  confirmDanger({
    title:recipe?'Удалить рецепт?':'Удалить продукт?',
    message:'Запись будет удалена из «Моей еды». Уже добавленные порции в дневнике останутся.',
    confirmText:'Удалить',
    onConfirm:function(){
      if(!myFoodDeleteMany([id]))return;
      if(myFoodRead().some(x=>String(x.id)===id)){toast('Не удалось удалить запись');return;}
      window._cartEditReturn=false;
      closeGramsSheet();
      renderFoodPicker();refreshFoodCart();
      toast(recipe?'Рецепт удалён':'Продукт удалён');
    }
  });
}
window.requestDeleteOwnFood=requestDeleteOwnFood;

function saveOwnFood() {
  const name=document.getElementById('food-own-name').value.trim().replace(/\s+/g,' ');
  const error=document.getElementById('food-own-error');
  if(!name){error.textContent='Введите название продукта.';return;}
  if(pickerAllFoods().some(f=>foodSearchNorm(f.n)===foodSearchNorm(name))){error.textContent='Такое название уже есть. Уточните бренд или добавьте «мой рецепт».';return;}
  const values={};
  for(const key of ['kcal','p','f','c']){
    const raw=document.getElementById('food-own-'+key).value.trim().replace(',','.');
    const n=Number(raw);
    if(!raw||!Number.isFinite(n)||n<0||n>(key==='kcal'?1000:100)){error.textContent='Заполните все поля: ккал от 0 до 1000, БЖУ от 0 до 100. Можно указать 0.';return;}
    values[key]=n;
  }
  if(values.p+values.f+values.c>100.5){error.textContent='Сумма белков, жиров и углеводов не должна превышать 100 г.';return;}
  const u=document.getElementById('food-own-unit').value;
  const f=Object.assign({n:name,unit:'100 '+u,category:'Свой продукт',source:'Пользователь',createdAt:Date.now()},values);
  const all=ownFoods();all.push(f);if(!foodPickerStore('fs-own-foods',all))return;
  const fav=foodPickerFavorites();fav.add(name);
  const savedToFavorites=foodPickerStore('fs-food-favorites',Array.from(fav));
  closeOwnFoodForm();
  foodPickerTab='favorites';
  resetFoodLibraryControls();
  renderFoodPicker();
  if(savedToFavorites)toast('Сохранено в избранном');
}
window.saveOwnFood=saveOwnFood;
function renderFoodPicker() {
  const q=document.getElementById('food-search')?.value||'';
  if(foodVoicePortion&&foodVoicePortion.query!==foodSearchNorm(q))resetFoodVoicePortion();
  const clear=document.getElementById('food-search-clear');if(clear)clear.hidden=!q.length;
  const box=document.getElementById('food-picker-list');if(!box)return;
  if(typeof FOOD_DB==='undefined'){box.innerHTML='<div class="food-library-empty">База продуктов не загружена.</div>';return;}
  const hasQuery=!!foodSearchNorm(q),fav=foodPickerFavorites();
  if(hasQuery&&foodLibrarySelecting){foodLibrarySelecting=false;foodLibrarySelected.clear();}
  const mode=getFoodPickerSort(),labels={recent:'Сначала недавние',az:'По алфавиту: А–Я',za:'По алфавиту: Я–А'};
  const menu=foodPickerSortOpen?'<div class="food-sort-menu" role="group" aria-label="Порядок продуктов">'+Object.keys(labels).map(k=>`<button type="button" class="${mode===k?'active':''}" aria-pressed="${mode===k}" onclick="setFoodPickerSort('${k}')">${labels[k]}</button>`).join('')+'</div>':'';
  const bar=`<div class="food-library-bar">
    <button type="button" class="food-sort-button" onclick="toggleFoodPickerSort()" aria-label="Сортировка: ${labels[mode]}" aria-expanded="${foodPickerSortOpen}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 20V4m-4 4 4-4 4 4M17 4v16m-4-4 4 4 4-4"/></svg></button>
    <div class="food-library-tabs" role="tablist" aria-label="Мои продукты">
      <button type="button" role="tab" aria-selected="${!hasQuery&&foodPickerTab==='recent'}" class="food-library-tab ${!hasQuery&&foodPickerTab==='recent'?'active':''}" onclick="selectFoodPickerTab('recent')">История</button>
      <button type="button" role="tab" aria-selected="${!hasQuery&&foodPickerTab==='favorites'}" class="food-library-tab ${!hasQuery&&foodPickerTab==='favorites'?'active':''}" onclick="selectFoodPickerTab('favorites')">Избранное</button>
    </div><button type="button" class="food-library-create food-library-mine ${!hasQuery&&foodPickerTab==='mine'?'active':''}" aria-pressed="${!hasQuery&&foodPickerTab==='mine'}" onclick="selectFoodPickerTab('mine')">Моя еда</button><button type="button" class="food-library-create food-library-add-tab ${!hasQuery&&foodPickerTab==='add'?'active':''}" aria-pressed="${!hasQuery&&foodPickerTab==='add'}" onclick="selectFoodPickerTab('add')">Добавить</button>
    <div class="food-library-overflow"><button type="button" class="food-library-more" onclick="toggleFoodLibraryMenu()" aria-label="Действия со списком" aria-expanded="${foodLibraryMenuOpen}" aria-haspopup="menu"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="5" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="12" cy="19" r="1.8"/></svg></button>
    ${foodLibraryMenuOpen?`<div class="food-library-action-menu" role="menu" aria-label="${foodPickerTab==='mine'?'Моя еда':foodPickerTab==='favorites'?'Избранное':'История'}">${foodPickerTab==='mine'?'<button type="button" role="menuitem" onclick="myFoodBeginEditing()">Изменить</button>':''}<button type="button" role="menuitem" onclick="beginFoodLibrarySelection()">Выбрать</button><button type="button" role="menuitem" class="danger" onclick="clearFoodLibrary()">Очистить</button></div>`:''}</div>
  ${menu}</div>`;
  if(!hasQuery&&['mine','add'].includes(foodPickerTab)){
    box.innerHTML=bar+'<section id="my-food-content" aria-label="Моя еда"></section>';
    myFoodRender(document.getElementById('my-food-content'));return;
  }
  let items;
  if(hasQuery){
    
    items=searchFoodPrefix(q);
  }else{
    const names=foodPickerTab==='favorites'?Array.from(fav):foodPickerRecentNames();
    items=foodPickerTab?foodLibrarySort(names.map(pickerFoodByName).filter(Boolean)):[];
  }
  let body=items.map(f=>foodLibraryRow(f,fav)).join('');
  if(!items.length&&(hasQuery||foodPickerTab))body='<div class="food-library-empty">'+(hasQuery?'Ничего не найдено. Создайте запись в разделе «Моя еда».':'Пусто')+'</div>';
  const selection=foodLibrarySelecting?`<div class="food-library-selection-tools"><button type="button" onclick="cancelFoodLibrarySelection()">Отмена</button><button type="button" class="danger" onclick="deleteSelectedFoodLibrary()" ${foodLibrarySelected.size?'':'disabled'}>Удалить</button></div>`:'';
  box.innerHTML=bar+selection+body;
}
window.renderFoodPicker = renderFoodPicker;

function clearFoodPickerSearch() {
  resetFoodVoicePortion();
  const input = document.getElementById('food-search');
  if (input) { input.value = ''; input.focus(); }
  renderFoodPicker();
}
window.clearFoodPickerSearch = clearFoodPickerSearch;

function applyFoodItem(name) {
  const item = pickerFoodByName(name);
  if (!item) return;
  const query=document.getElementById('food-search')?.value||'';
  const portion=foodVoicePortion&&foodVoicePortion.query===foodSearchNorm(query)?foodVoicePortion:null;
  closeAllSheets();
  openGramsSheet({ name:item.n, kcal100:item.kcal, p100:item.p, c100:item.c, f100:item.f, unit:/мл/i.test(item.unit||'')?'мл':'г', initialAmount:portion?.amount, initialUnit:portion?.unit }, null);
}
window.applyFoodItem = applyFoodItem;

// Открыть шторку редактирования граммов
function openGramsSheet(item100, entryId) {
  window._gramsItem    = item100;
  window._gramsEntryId = entryId;

  const existing = entryId ? nutrEntries.find(e => e.id === entryId) : null;
  const grams = existing ? (existing.grams || 100) : (item100.initialUnit&&item100.initialUnit!==(item100.baseUnit||item100.unit||'г')&&!liquidDensity(item100)?100:(item100.initialAmount || 100));
  const sourceFood = typeof FOOD_DB !== 'undefined' ? FOOD_DB.find(f => f.n === item100.name) : null;
  item100.baseUnit = item100.baseUnit || (sourceFood ? (/мл/i.test(sourceFood.unit || '') ? 'мл' : 'г') : (item100.unit || (existing && existing.unit) || 'г'));
  window._gramsUnit = (existing && existing.unit) || item100.unit || item100.baseUnit;
  if (!existing && !liquidDensity(item100)) window._gramsUnit = item100.baseUnit;
  if(!existing&&item100.initialUnit){
    if(item100.initialUnit===item100.baseUnit||liquidDensity(item100))window._gramsUnit=item100.initialUnit;
    else toast('Нет данных для перевода г/мл. Укажите порцию в единицах базы.');
  }

  let ov = document.getElementById('grams-overlay');
  let sh = document.getElementById('grams-sheet');
  if (!ov) {
    ov = document.createElement('div');
    ov.id = 'grams-overlay';
    ov.className = 'sheet-overlay';
    ov.onclick = closeGramsSheet;
    document.body.appendChild(ov);
    sh = document.createElement('div');
    sh.id = 'grams-sheet';
    sh.className = 'bottom-sheet';
    document.body.appendChild(sh);
  }

  sh.innerHTML = buildGramsSheetHTML(item100, grams);
  syncGramsUnitView();
  recalcGrams(grams);

  setTimeout(function() {
    sh.style.transform = 'translateY(0)';
    ov.classList.add('show');
    sh.classList.add('show');
    attachGramsSheetGestures();
    layoutGramsSheet();
    var inp = document.getElementById('grams-input');
    if (inp) {
      inp.addEventListener('focus', function() {
        try { inp.select(); } catch(e){}
        setTimeout(layoutGramsSheet, 120);
        setTimeout(layoutGramsSheet, 400);
      });
      inp.addEventListener('blur', function() { setTimeout(layoutGramsSheet, 120); });
    }
  }, 10);
}
window.openGramsSheet = openGramsSheet;

function attachGramsSheetGestures() {
  var sh = document.getElementById('grams-sheet');
  if (!sh || sh._gramsGesturesAttached) return;
  sh._gramsGesturesAttached = true;

  var startY = 0;
  var currentY = 0;
  var dragging = false;

  sh.addEventListener('touchstart', function(e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON') return;
    var t = e.touches ? e.touches[0] : e;
    startY = t.clientY;
    currentY = startY;
    dragging = true;
    sh.style.transition = 'none';
  }, { passive: true });

  sh.addEventListener('touchmove', function(e) {
    if (!dragging) return;
    var t = e.touches ? e.touches[0] : e;
    currentY = t.clientY;
    var delta = currentY - startY;

    if (delta > 0) {
      sh.style.transform = 'translateY(' + delta + 'px)';
    }
    if (e.cancelable) e.preventDefault();
    e.stopPropagation();
  }, { passive: false });

  sh.addEventListener('touchend', function(e) {
    if (!dragging) return;
    dragging = false;
    var delta = currentY - startY;
    sh.style.transition = 'transform 0.25s cubic-bezier(0.32,0.72,0,1)';

    if (delta > 80) {
      sh.style.transform = 'translateY(100%)';
      setTimeout(closeGramsSheet, 200);
    } else {
      sh.style.transform = 'translateY(0)';
    }
  });
}

function foodStatsHTML(kcal, protein, fat, carbs, quantity='', colored=false) {
  const num=v=>Number.isFinite(Number(v))?String(Number(v)):'0';
  const letter=(text,color)=>colored?'<span style="color:'+color+'">'+text+'</span>':text;
  return Math.round(Number(kcal)||0)+' ккал: '+
    letter('Б','#ec4899')+' '+num(protein)+' · '+
    letter('Ж','#eab308')+' '+num(fat)+' · '+
    letter('У','#22c55e')+' '+num(carbs)+
    (quantity?' · '+foodCartEscape(quantity):'');
}
function foodEntryStatsHTML(entry) {
  return foodStatsHTML(entry.kcal,entry.protein,entry.fat,entry.carbs,
    entry.grams?entry.grams+' '+(entry.unit||'г'):'');
}

function gramsBaseSummaryHTML(item, unit) {
  return foodStatsHTML(item.kcal100,item.p100,item.f100,item.c100,'100 '+unit,true);
}

function buildGramsSheetHTML(item, grams) {
  const unit = window._gramsUnit || 'г';
  return '<div class="sheet-handle"></div>' +
    '<div class="grams-sheet-name">' + foodCartEscape(item.name) + '</div>' +
    '<div style="text-align:center">' + foodCategoryHTML(item.name, item.category) + '</div>' +
    '<div class="grams-sheet-sub" id="grams-sheet-sub">' + gramsBaseSummaryHTML(item, item.baseUnit || unit) + '</div>' +

    '<div class="grams-entry">' +
      '<button type="button" class="grams-round-btn" aria-label="Минус 10" onclick="stepGrams(-10)">−</button>' +
      '<div class="grams-input-wrap">' +
        '<input id="grams-input" type="number" inputmode="decimal" enterkeyhint="done" value="' + grams + '" min="1" max="9999"' +
          ' oninput="recalcGrams(+this.value||0)" onkeydown="if(event.key===\'Enter\'){this.blur();}">' +
        '<button type="button" id="grams-unit-btn" class="grams-unit-btn" aria-label="Единица измерения: ' + unit + '. Нажмите, чтобы переключить" onclick="toggleGramsUnit()">' + unit + '</button>' +
      '</div>' +
      '<button type="button" class="grams-round-btn" aria-label="Плюс 10" onclick="stepGrams(10)">+</button>' +
    '</div>' +

    '<div class="grams-summary">' +
      '<div class="grams-macro k"><div class="grams-macro-val" id="grams-kcal">0</div><div class="grams-macro-lbl">ккал</div></div>' +
      '<div class="grams-macro p"><div class="grams-macro-val" id="grams-prot">0</div><div class="grams-macro-lbl">Белки, г</div></div>' +
      '<div class="grams-macro f"><div class="grams-macro-val" id="grams-fat">0</div><div class="grams-macro-lbl">Жиры, г</div></div>' +
      '<div class="grams-macro c"><div class="grams-macro-val" id="grams-carb">0</div><div class="grams-macro-lbl">Углеводы, г</div></div>' +
    '</div>' +

    '<button class="grams-save-btn" onclick="saveGramsEntry()">Добавить</button>';
}

// Переключатель единиц: граммы (г) <-> миллилитры (мл). Значения КБЖУ в базе даны на 100 единиц.

// Приближённые плотности г/мл: FAO/INFOODS Density Database v2.
// Для кефира/ряженки используется оценка по жидким молочным продуктам, не точное измерение бренда.
function liquidDensity(item) {
  const n = String(item.name || '').toLowerCase().replace(/ё/g, 'е');
  if (/сух|порош|сгущ|морожен|каша|шоколад|сыр|творог|соус|печень|торт/.test(n)) return null;
  if (/^суп(?:\s|-|$)/.test(n)) return 1; // Приближение, явно показанное в окне порции.
  if (/^(кефир|ряженка|простокваша|молоко)(\s|$)/.test(n) && !/кокос|миндал|соев|овсян/.test(n)) return 1.03;
  if (/^масло\s+(оливков|подсолнечн|кукурузн|соев|растительн)/.test(n)) {
    if (/оливков/.test(n)) return 0.918;
    if (/подсолнечн/.test(n)) return 0.96;
    if (/кукурузн/.test(n)) return 0.922;
    if (/соев/.test(n)) return 0.927;
    return 0.92;
  }
  return null;
}

function gramsPortionFactor(amount) {
  const item = window._gramsItem;
  const base = item.baseUnit || 'г';
  const chosen = window._gramsUnit || base;
  if (chosen === base) return amount / 100;
  const rho = liquidDensity(item);
  if (!rho) return amount / 100;
  return (base === 'г' ? amount * rho : amount / rho) / 100;
}

function syncGramsUnitView() {
  const item = window._gramsItem;
  if (!item) return;
  const base = item.baseUnit || 'г';
  const chosen = window._gramsUnit || base;
  const rho = liquidDensity(item);
  const btn = document.getElementById('grams-unit-btn');
  if (btn) {
    btn.textContent = chosen;
    btn.disabled = !rho;
    btn.style.opacity = rho ? '1' : '.65';
    btn.setAttribute('aria-label', rho ? 'Единица: ' + chosen + '. Переключить г/мл' : 'Единица: ' + chosen + '. Нет данных для перевода');
  }
  const sub = document.getElementById('grams-sheet-sub');
  if (sub) {
    sub.innerHTML = gramsBaseSummaryHTML(item, base);
    if (chosen !== base && rho) sub.appendChild(document.createTextNode(' · 1 мл ≈ ' + String(rho).replace('.', ',') + ' г' + (/^суп(?:\s|-|$)/i.test(item.name)?' (приблизительно; точнее — взвесить порцию)':'')));
  }
}
function toggleGramsUnit() {
  if (!window._gramsItem || !liquidDensity(window._gramsItem)) return;
  window._gramsUnit = window._gramsUnit === 'мл' ? 'г' : 'мл';
  syncGramsUnitView();
  const inp = document.getElementById('grams-input');
  recalcGrams(inp ? (+inp.value || 0) : 0);
}
window.toggleGramsUnit = toggleGramsUnit;

function layoutGramsSheet() {
  const sh = document.getElementById('grams-sheet');
  if (!sh || !sh.classList.contains('show')) return;
  const vv = window.visualViewport;
  const vh = vv ? vv.height : window.innerHeight;
  const off = vv ? vv.offsetTop : 0;
  sh.style.maxHeight = Math.max(240, Math.floor(vh - 24)) + 'px';
  const top = Math.max(12, Math.round((vh - sh.offsetHeight) / 2 - vh * 0.04));
  sh.style.top = Math.round(off + top) + 'px';
}

(function() {
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', layoutGramsSheet);
    window.visualViewport.addEventListener('scroll', layoutGramsSheet);
  }
  window.addEventListener('resize', layoutGramsSheet);
})();

function recalcGrams(g) {
  const item = window._gramsItem;
  if (!item) return;
  const k = gramsPortionFactor(g);
  const kGoal = 2000;
  const kcal = Math.round(item.kcal100 * k);
  const pct  = Math.min(1, kcal / kGoal);
  const arc  = document.getElementById('grams-arc');
  if (arc) arc.setAttribute('stroke-dasharray', (pct * 314).toFixed(1) + ' 314');
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  set('grams-kcal', kcal);
  set('grams-prot', (+item.p100 * k).toFixed(1));
  set('grams-fat',  (+item.f100 * k).toFixed(1));
  set('grams-carb', (+item.c100 * k).toFixed(1));
}
window.recalcGrams = recalcGrams;

function stepGrams(delta) {
  const inp = document.getElementById('grams-input');
  if (!inp) return;
  const v = Math.max(1, Math.min(9999, (+inp.value || 100) + delta));
  inp.value = v;
  recalcGrams(v);
}
window.stepGrams = stepGrams;

function saveGramsEntry() {
  const inp = document.getElementById('grams-input');
  const g = Math.max(1, +inp.value || 100);
  const item = window._gramsItem;
  const resetPickerAfterSave=currentPage==='foodpick'&&!window._gramsEntryId;
  const k = gramsPortionFactor(g);
  const kcal    = Math.round(item.kcal100 * k);
  const protein = +((+item.p100 * k).toFixed(1));
  const carbs   = +((+item.c100 * k).toFixed(1));
  const fat     = +((+item.f100 * k).toFixed(1));

  if (window._gramsEntryId) {
    const idx = nutrEntries.findIndex(e => e.id === window._gramsEntryId);
    if (idx !== -1) {
      nutrEntries[idx] = Object.assign({}, nutrEntries[idx], { grams: g, unit: window._gramsUnit || 'г', kcal, protein, carbs, fat });
      localStorage.setItem('fs-nutrition', JSON.stringify(nutrEntries));
    }
  } else {
    document.getElementById('nutr-meal-name').value = item.name;
    document.getElementById('nutr-kcal').value      = kcal;
    document.getElementById('nutr-protein').value   = protein;
    document.getElementById('nutr-carbs').value     = carbs;
    document.getElementById('nutr-fat').value       = fat;
    const entry = {
      id: Date.now() + '_' + Math.random().toString(36).slice(2),
      name: item.name,
      myFoodId:item.myFoodId||null,
      kcal, protein, carbs, fat,
      grams: g,
      category: foodCategoryLabel(item.name, item.category),
      unit: window._gramsUnit || 'г',
      mealType: window._currentMealType || 'breakfast',
      date: (function(){ var d=new Date(); d.setDate(d.getDate()+(window._nutrOffset||0)); return d.toLocaleDateString('ru-RU'); })()
    };
    nutrEntries.push(entry);
    localStorage.setItem('fs-nutrition', JSON.stringify(nutrEntries));
  }

  if(!item.myFoodId)rememberFoodPickerProduct(item.name);
  if(resetPickerAfterSave){
    resetFoodVoicePortion();
    const search=document.getElementById('food-search');
    if(search){search.value='';search.blur();}
    foodPickerTab=item.myFoodId?'mine':null;
    resetFoodLibraryControls();
  }
  closeGramsSheet();
  renderNutrEntries();
  renderFoodPicker();
  toast('✅ ' + item.name + ' — ' + g + ' ' + (window._gramsUnit || 'г'));
}
window.saveGramsEntry = saveGramsEntry;

function closeGramsSheet() {
  const gi = document.getElementById('grams-input');
  if (gi) { try { gi.blur(); } catch (e) {} }
  const ov = document.getElementById('grams-overlay');
  const sh = document.getElementById('grams-sheet');
  if (ov) ov.classList.remove('show');
  if (sh) {
    sh.classList.remove('show');
    sh.style.transition = '';
    sh.style.transform = 'translateY(100%)';
    setTimeout(function(){
      if (sh && !sh.classList.contains('show')) sh.style.transform = '';
    }, 220);
  }
  window._gramsItem = null;
  window._gramsEntryId = null;
}
window.closeGramsSheet = closeGramsSheet;

function editNutrEntry(entryId) {
  const entry = nutrEntries.find(e => e.id === entryId);
  if (!entry) return;
  const dbItem = pickerFoodByName(entry.name);
  let item100;
  if (dbItem) {
    item100 = { name: dbItem.n, kcal100: dbItem.kcal, p100: dbItem.p, c100: dbItem.c, f100: dbItem.f, baseUnit: /мл/i.test(dbItem.unit||'') ? 'мл' : 'г', category: dbItem.category };
  } else {
    const g = entry.grams || 100;
    const k = 100 / g;
    item100 = {
      name: entry.name,
      kcal100: +(+entry.kcal * k).toFixed(1),
      p100:    +(+entry.protein * k).toFixed(1),
      c100:    +(+entry.carbs * k).toFixed(1),
      f100:    +(+entry.fat * k).toFixed(1)
    };
  }
  window._currentMealType = entry.mealType;
  openGramsSheet(item100, entryId);
}
window.editNutrEntry = editNutrEntry;

// ==================== ГОЛОСОВОЙ ВВОД ====================
let recognition = null;
let isListening = false;

function toggleVoice() {
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    toast('❌ Голосовой ввод не поддерживается в этом браузере');
    return;
  }
  if (isListening) stopVoice();
  else startVoice();
}
window.toggleVoice = toggleVoice;

function startVoice() {
  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SpeechRec();
  recognition.lang = 'ru-RU';
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.onstart = () => {
    isListening = true;
    document.getElementById('nav-mic-btn').classList.add('listening');
    showVoiceResult('🎤 Слушаю...');
  };
  recognition.onresult = (e) => {
    const text = e.results[0][0].transcript;
    handleVoiceResult(text);
  };
  recognition.onerror = (e) => {
    if (e.error === 'not-allowed') toast('❌ Нет доступа к микрофону');
    else toast('❌ Ошибка: ' + e.error);
  };
  recognition.onend = () => {
    stopVoice();
  };
  recognition.start();
}

function stopVoice() {
  isListening = false;
  const btn = document.getElementById('nav-mic-btn');
  if (btn) btn.classList.remove('listening');
  if (recognition) {
    try { recognition.stop(); } catch (e) {}
    recognition = null;
  }
  setTimeout(() => hideVoiceResult(), 2500);
}

function showVoiceResult() {
  // Распознанная команда используется обработчиками, но не показывается сверху экрана.
}

function hideVoiceResult() {
  const el = document.getElementById('voice-result');
  if (el) {
    el.classList.remove('show');
    el.textContent = '';
  }
}

function handleVoiceResult(text) {
  const builderVisible = document.getElementById('wt-builder')?.style.display !== 'none';
  if (currentPage === 'workout' && builderVisible) {
    handleVoiceForBuilder(text);
    return;
  }
  if (currentPage === 'nutrition') {
    handleVoiceForNutrition(text);
    showVoiceResult('✅ "' + text + '"');
    return;
  }
  const active = document.activeElement;
  if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) {
    if (active.type === 'number') {
      const m = text.match(/(\d+(?:[.,]\d+)?)/);
      if (m) active.value = m[1].replace(',', '.');
    } else {
      active.value = text;
    }
    active.dispatchEvent(new Event('input'));
    showVoiceResult('✅ "' + text + '"');
    return;
  }
  if (currentPage === 'encyclopedia') {
    const enc = document.getElementById('enc-search');
    if (enc) {
      enc.value = text;
      enc.dispatchEvent(new Event('input'));
    }
    showVoiceResult('🔍 "' + text + '"');
    return;
  }
  toast('🎤 "' + text + '"');
  showVoiceResult('🎤 "' + text + '"');
}

const WORDS_TO_NUM = {
  'один':1, 'одного':1, 'одну':1, 'одним':1,
  'два':2, 'две':2, 'двух':2, 'двумя':2,
  'три':3, 'трёх':3, 'тремя':3,
  'четыре':4, 'четырёх':4, 'четырьмя':4,
  'пять':5, 'пяти':5, 'пятью':5,
  'шесть':6, 'шести':6, 'шестью':6,
  'семь':7, 'семи':7, 'семью':7,
  'восемь':8, 'восьми':8, 'восемью':8,
  'девять':9, 'девяти':9, 'девятью':9,
  'десять':10, 'десяти':10, 'десятью':10,
  'одиннадцать':11, 'двенадцать':12, 'тринадцать':13, 'четырнадцать':14,
  'пятнадцать':15, 'шестнадцать':16, 'семнадцать':17, 'восемнадцать':18, 'девятнадцать':19, 'двадцать':20
};

function parseWordNum(str) {
  const n = parseInt(str);
  if (!isNaN(n)) return n;
  return WORDS_TO_NUM[str.toLowerCase()] || null;
}

function fuzzyMatchExercise(query) {
  query = query.toLowerCase().trim();
  const allEx = [];
  for (const [cat, exs] of Object.entries(ALL_EXERCISES)) {
    for (const e of exs) allEx.push({ ...e, cat });
  }
  const qWords = query.split(/\s+/).filter(w => w.length > 2);
  let best = null;
  let bestScore = 0;
  for (const e of allEx) {
    const name = e.n.toLowerCase();
    let score = 0;
    if (name.includes(query)) score += 100;
    for (const w of qWords) {
      if (name.includes(w)) score += 10;
    }
    for (const w of qWords) {
      if (w.length >= 4) {
        const nWords = name.split(/\s+/);
        for (const nw of nWords) {
          if (nw.startsWith(w.substring(0, 4))) score += 5;
        }
      }
    }
    if (score > bestScore) {
      bestScore = score;
      best = e;
    }
  }
  return bestScore >= 5 ? best : null;
}

function parseVoiceForBuilder(text) {
  const lower = text.toLowerCase();
  let sets = null, reps = null, kg = null;
  const setsMatch = lower.match(/(\w+)\s+(?:подход|сет|подхода|подходов|сетов|сета)/);
  if (setsMatch) sets = parseWordNum(setsMatch[1]);
  const repsMatch = lower.match(/(?:по\s+)?(\w+)\s+(?:раз|повтор|повторени|повторений|повторения)/);
  if (repsMatch) reps = parseWordNum(repsMatch[1]);
  if (!reps) {
    const byMatch = lower.match(/по\s+(\w+)/);
    if (byMatch) reps = parseWordNum(byMatch[1]);
  }
  const kgMatch = lower.match(/(\d+)\s*(?:кг|килограмм|кило)/);
  if (kgMatch) kg = parseInt(kgMatch[1]);
  let exName = lower
    .replace(/(\w+\s+)?(?:подход|сет|подхода|подходов|сетов|сета)/g, '')
    .replace(/(?:по\s+)?(?:\w+\s+)?(?:раз|повтор|повторени[а-я]*)/g, '')
    .replace(/по\s+\w+/g, '')
    .replace(/\d+\s*(?:кг|килограмм|кило)?/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return { exName, sets: sets || 3, reps: reps || 10, kg: kg || 0 };
}

function handleVoiceForBuilder(text) {
  const { exName, sets, reps, kg } = parseVoiceForBuilder(text);
  if (!exName || exName.length < 2) {
    toast('🎤 Не удалось распознать упражнение');
    return;
  }
  const found = fuzzyMatchExercise(exName);
  if (!found) {
    toast('🎤 Упражнение не найдено: "' + exName + '"');
    return;
  }
  selectMuscle(found.cat);
  if (!pickerChecked[found.cat]) pickerChecked[found.cat] = new Set();
  pickerChecked[found.cat].add(found.n);
  if (!pickerParams[found.cat]) pickerParams[found.cat] = {};
  pickerParams[found.cat][found.n] = { s: sets, r: reps, kg: kg || found.kg };
  renderExPicker(found.cat);
  updateBldStartBar();
  showVoiceResult('✅ ' + found.n + ' — ' + sets + '×' + reps + (kg ? ' · ' + kg + ' кг' : ''));
  toast('✅ Добавлено: ' + found.n);
}

function handleVoiceForNutrition(text) {
  const lower = text.toLowerCase();
  const weightMatch = lower.match(/(\d+(?:[.,]\d+)?)\s*(?:грамм|гр|г)\b/);
  let grams = weightMatch ? parseFloat(weightMatch[1].replace(',', '.')) : 100;
  let namePart = lower.replace(/на завтрак|на обед|на ужин|перекус/gi, '').trim();
  if (weightMatch) namePart = namePart.slice(0, weightMatch.index).trim();
  let mealName = namePart.replace(/[^a-zа-яё0-9\s]/gi, ' ').replace(/\s+/g, ' ').trim();

  const found = FOOD_DB.find(f => f.n.toLowerCase() === mealName.toLowerCase() || f.n.toLowerCase().includes(mealName));
  if (found) {
    const factor = grams / 100;
    document.getElementById('nutr-meal-name').value = found.n + ' (' + grams + ' г)';
    document.getElementById('nutr-kcal').value = Math.round(found.kcal * factor);
    document.getElementById('nutr-protein').value = (found.p * factor).toFixed(1);
    document.getElementById('nutr-carbs').value = (found.c * factor).toFixed(1);
    document.getElementById('nutr-fat').value = (found.f * factor).toFixed(1);
    showVoiceResult('✅ ' + found.n + ' ' + grams + 'г');
  } else {
    if (document.getElementById('nutr-meal-name')) document.getElementById('nutr-meal-name').value = mealName;
    showVoiceResult('🔍 "' + text + '"');
  }
}

window._nutrOffset = 0;
function changeNutrDate(delta) {
  window._nutrOffset = (window._nutrOffset || 0) + delta;
  if (window._nutrOffset > 0) window._nutrOffset = 0;
  renderNutrEntries();
}
window.changeNutrDate = changeNutrDate;


function renderMealAnalytics(){
 var ch=document.getElementById('meal-macro-chart'),out=document.getElementById('meal-analytics-totals');if(!ch||!out)return;
 var period=window.mealAnalyticsPeriod||'day',shift=Number(window._mealPeriodShift)||0,base=new Date();base.setHours(0,0,0,0);base.setDate(base.getDate()+(window._nutrOffset||0));var start=new Date(base),end=new Date(base);
 if(period==='day'){start.setDate(start.getDate()+shift);end=new Date(start)}else if(period==='week'){end.setDate(end.getDate()+shift*7);start.setDate(end.getDate()-6)}else if(period==='year'){start=new Date(base.getFullYear()+shift,0,1);end=new Date(base.getFullYear()+shift,11,31)}else{start.setDate(1);start.setMonth(start.getMonth()+shift);end=new Date(start.getFullYear(),start.getMonth()+1,0)}
 var fmt=d=>d.toLocaleDateString('ru-RU'),ds=[],cur=new Date(start);while(cur<=end){ds.push(fmt(cur));cur.setDate(cur.getDate()+1)}
 var entries=Array.isArray(window.nutrEntries)?window.nutrEntries:Array.isArray(nutrEntries)?nutrEntries:[],t=entries.filter(x=>ds.indexOf(String(x.date||'').trim())>=0).reduce((a,x)=>{a.k+=Number(x.kcal)||0;a.p+=Number(x.protein)||0;a.f+=Number(x.fat)||0;a.c+=Number(x.carbs)||0;return a},{k:0,p:0,f:0,c:0});
 var label=document.getElementById('meal-period-label');if(label)label.textContent=period==='day'?(shift===0?'Сегодня':shift===-1?'Вчера':start.getDate()+ ' '+['янв','фев','мар','апр','май','июн','июл','авг','сен','окт','ноя','дек'][start.getMonth()]):period==='week'?'Неделя · '+start.getDate()+'–'+end.getDate()+' '+['янв','фев','мар','апр','май','июн','июл','авг','сен','окт','ноя','дек'][end.getMonth()]:['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'][start.getMonth()];
 var v=[t.p*4,t.f*9,t.c*4],sum=v[0]+v[1]+v[2],pc=n=>sum?Math.round(n/sum*100):0;var seen={};entries.forEach(function(x){var d=String(x.date||'').trim();if(ds.indexOf(d)>=0&&(Number(x.kcal)||0)>0)seen[d]=1});var nd=Object.keys(seen).length,kk=period==='day'?Math.round(t.k):(nd?Math.round(t.k/nd):0),kt=kk>=100000?Math.round(kk/1000)+'к':kk>=10000?(kk/1000).toFixed(1).replace('.0','')+'к':String(kk);out.innerHTML='<div class="meal-total k"><b>'+kt+'</b><span>'+(period==='day'?'ккал':'ккал/день')+'</span></div><div class="meal-total p"><b>'+pc(v[0])+'%</b><span>Белки</span></div><div class="meal-total f"><b>'+pc(v[1])+'%</b><span>Жиры</span></div><div class="meal-total c"><b>'+pc(v[2])+'%</b><span>Углеводы</span></div>';if(!sum){ch.innerHTML='<div class="meal-chart-empty">Нет данных за выбранный период</div>';return}
 var cx=150,cy=72,r=96,dep=22,cols=['#ec4899','#f59e0b','#22c55e'],dark=['#9d174d','#a16207','#15803d'],ang=-Math.PI/2,svg='<svg viewBox="45 0 210 180" preserveAspectRatio="xMidYMid meet"><ellipse cx="150" cy="156" rx="96" ry="18" fill="rgba(0,0,0,.12)"/>';function point(a,y){return[cx+r*Math.cos(a),y+r*.58*Math.sin(a)]}v.forEach((val,i)=>{var b=ang+val/sum*Math.PI*2,A=point(ang,cy),B=point(b,cy),C=point(b,cy+dep),D=point(ang,cy+dep),l=b-ang>Math.PI?1:0;svg+='<path d="M '+A[0]+' '+A[1]+' A '+r+' '+r*.58+' 0 '+l+' 1 '+B[0]+' '+B[1]+' L '+C[0]+' '+C[1]+' A '+r+' '+r*.58+' 0 '+l+' 0 '+D[0]+' '+D[1]+' Z" fill="'+dark[i]+'"/>';ang=b});ang=-Math.PI/2;v.forEach((val,i)=>{var b=ang+val/sum*Math.PI*2,A=point(ang,cy),B=point(b,cy),l=b-ang>Math.PI?1:0;svg+='<path d="M 150 82 L '+A[0]+' '+A[1]+' A '+r+' '+r*.58+' 0 '+l+' 1 '+B[0]+' '+B[1]+' Z" fill="'+cols[i]+'" stroke="var(--bg)" stroke-width="3"/>';ang=b});ch.innerHTML=svg+'</svg>';
}
window.renderMealAnalytics=renderMealAnalytics;
setTimeout(renderMealAnalytics, 0);

// ===== РЕЦЕПТЫ И ПЛАНЫ =====
// ==================== РЕЦЕПТЫ ====================
const RECIPES = [
  {
    id: 'r1',
    name: 'Куриная грудка с рисом',
    emoji: '🍗',
    time: '25 мин',
    kcal: 450,
    protein: 48,
    carbs: 42,
    fat: 6,
    tags: ['Высокий белок', 'Обед'],
    mealType: 'lunch',
    ingredients: [
      { name: 'Куриная грудка', grams: 200, kcal: 220, protein: 42, carbs: 0, fat: 4.4 },
      { name: 'Рис варёный', grams: 150, kcal: 174, protein: 3.6, carbs: 38.4, fat: 0.3 },
      { name: 'Оливковое масло', grams: 10, kcal: 90, protein: 0, carbs: 0, fat: 10 },
      { name: 'Свежие овощи', grams: 100, kcal: 25, protein: 1.2, carbs: 4.5, fat: 0.3 },
    ]
  },
  {
    id: 'r2',
    name: 'Овсянка с бананом',
    emoji: '🥣',
    time: '10 мин',
    kcal: 340,
    protein: 12,
    carbs: 58,
    fat: 7,
    tags: ['Завтрак', 'Углеводы'],
    mealType: 'breakfast',
    ingredients: [
      { name: 'Овсяные хлопья', grams: 80, kcal: 288, protein: 9.6, carbs: 51, fat: 5.6 },
      { name: 'Банан', grams: 100, kcal: 89, protein: 1.1, carbs: 23, fat: 0.3 },
      { name: 'Молоко 2%', grams: 150, kcal: 63, protein: 4.8, carbs: 6.9, fat: 2.4 },
    ]
  },
  {
    id: 'r3',
    name: 'Омлет с овощами',
    emoji: '🍳',
    time: '15 мин',
    kcal: 280,
    protein: 22,
    carbs: 8,
    fat: 18,
    tags: ['Завтрак', 'Низкие углеводы'],
    mealType: 'breakfast',
    ingredients: [
      { name: 'Яйцо куриное', grams: 150, kcal: 215, protein: 18, carbs: 1.2, fat: 15 },
      { name: 'Перец болгарский', grams: 60, kcal: 20, protein: 0.7, carbs: 4, fat: 0.2 },
      { name: 'Шпинат', grams: 40, kcal: 9, protein: 1.2, carbs: 1.1, fat: 0.2 },
      { name: 'Сыр', grams: 20, kcal: 70, protein: 4.2, carbs: 0.6, fat: 5.8 },
    ]
  },
  {
    id: 'r4',
    name: 'Творог с ягодами',
    emoji: '🫐',
    time: '5 мин',
    kcal: 220,
    protein: 24,
    carbs: 22,
    fat: 4,
    tags: ['Перекус', 'Высокий белок'],
    mealType: 'snack',
    ingredients: [
      { name: 'Творог 5%', grams: 200, kcal: 174, protein: 22, carbs: 5.6, fat: 10 },
      { name: 'Ягоды (замороженные)', grams: 100, kcal: 46, protein: 1, carbs: 11, fat: 0.4 },
      { name: 'Мёд', grams: 10, kcal: 32, protein: 0, carbs: 8.5, fat: 0 },
    ]
  },
  {
    id: 'r5',
    name: 'Лосось с брокколи',
    emoji: '🐟',
    time: '30 мин',
    kcal: 400,
    protein: 40,
    carbs: 12,
    fat: 22,
    tags: ['Ужин', 'Омега-3'],
    mealType: 'dinner',
    ingredients: [
      { name: 'Лосось', grams: 200, kcal: 280, protein: 38, carbs: 0, fat: 14 },
      { name: 'Брокколи', grams: 200, kcal: 68, protein: 5.6, carbs: 11.2, fat: 0.8 },
      { name: 'Оливковое масло', grams: 10, kcal: 90, protein: 0, carbs: 0, fat: 10 },
      { name: 'Лимон', grams: 30, kcal: 10, protein: 0.3, carbs: 3.2, fat: 0.1 },
    ]
  },
  {
    id: 'r6',
    name: 'Протеиновый смузи',
    emoji: '🥤',
    time: '5 мин',
    kcal: 310,
    protein: 30,
    carbs: 36,
    fat: 5,
    tags: ['Перекус', 'После тренировки'],
    mealType: 'snack',
    ingredients: [
      { name: 'Протеин (1 мерная)' , grams: 30, kcal: 120, protein: 24, carbs: 3, fat: 1.5 },
      { name: 'Банан', grams: 100, kcal: 89, protein: 1.1, carbs: 23, fat: 0.3 },
      { name: 'Молоко 2%', grams: 200, kcal: 84, protein: 6.4, carbs: 9.2, fat: 3.2 },
      { name: 'Арахисовая паста', grams: 10, kcal: 60, protein: 2.5, carbs: 2, fat: 5 },
    ]
  }
];

// Планы питания
const NUTR_PLANS = [
  {
    id: 'plan_loss',
    name: 'Похудение',
    emoji: '🔥',
    kcal: 1600,
    desc: '~1600 ккал, дефицит 400 ккал. Высокий белок.',
    color: 'ef4444',
    days: [
      { time: '08:00', mealType: 'breakfast', name: 'Омлет с овощами', kcal: 280, protein: 22, carbs: 8, fat: 18 },
      { time: '11:00', mealType: 'snack',     name: 'Творог с ягодами', kcal: 180, protein: 22, carbs: 14, fat: 3 },
      { time: '13:30', mealType: 'lunch',     name: 'Куриная грудка с овощами', kcal: 350, protein: 42, carbs: 18, fat: 8 },
      { time: '16:00', mealType: 'snack',     name: 'Яблоко + миндаль 20г', kcal: 150, protein: 4, carbs: 22, fat: 8 },
      { time: '19:00', mealType: 'dinner',    name: 'Рыба с брокколи на пару', kcal: 320, protein: 38, carbs: 10, fat: 12 },
      { time: '21:00', mealType: 'snack',     name: 'Казеиновый творог', kcal: 120, protein: 18, carbs: 8, fat: 2 },
    ]
  },
  {
    id: 'plan_maintain',
    name: 'Поддержание',
    emoji: '⚖️',
    kcal: 2000,
    desc: '~2000 ккал. Сбалансированный рацион.',
    color: '22c55e',
    days: [
      { time: '08:00', mealType: 'breakfast', name: 'Овсянка с бананом и орехами', kcal: 380, protein: 12, carbs: 60, fat: 10 },
      { time: '10:30', mealType: 'snack',     name: 'Протеиновый йогурт', kcal: 160, protein: 18, carbs: 14, fat: 2 },
      { time: '13:00', mealType: 'lunch',     name: 'Куриная грудка с рисом', kcal: 450, protein: 48, carbs: 42, fat: 6 },
      { time: '16:00', mealType: 'snack',     name: 'Творог с ягодами', kcal: 220, protein: 24, carbs: 22, fat: 4 },
      { time: '19:00', mealType: 'dinner',    name: 'Лосось с брокколи', kcal: 400, protein: 40, carbs: 12, fat: 22 },
      { time: '21:00', mealType: 'snack',     name: 'Кефир 1%', kcal: 90, protein: 8, carbs: 10, fat: 1 },
    ]
  },
  {
    id: 'plan_gain',
    name: 'Набор массы',
    emoji: '💪',
    kcal: 2800,
    desc: '~2800 ккал, профицит +300-400. Акцент на белок.',
    color: 'a78bfa',
    days: [
      { time: '08:00', mealType: 'breakfast', name: 'Овсянка + 3 яйца + тост', kcal: 580, protein: 30, carbs: 68, fat: 18 },
      { time: '10:30', mealType: 'snack',     name: 'Протеиновый смузи', kcal: 380, protein: 35, carbs: 40, fat: 8 },
      { time: '13:00', mealType: 'lunch',     name: 'Говядина с гречкой и овощами', kcal: 600, protein: 52, carbs: 55, fat: 16 },
      { time: '16:00', mealType: 'snack',     name: 'Орехи + банан', kcal: 280, protein: 8, carbs: 35, fat: 14 },
      { time: '19:00', mealType: 'dinner',    name: 'Куриная грудка с макаронами', kcal: 620, protein: 50, carbs: 72, fat: 10 },
      { time: '21:00', mealType: 'snack',     name: 'Творог с арахисовой пастой', kcal: 280, protein: 28, carbs: 12, fat: 16 },
    ]
  }
];

// ——— РЕНДЕР карточки рецептов ———
function renderNutrQuickCard() {
  var wrap = document.getElementById('nutr-quick-card');
  if (!wrap) return;
  wrap.innerHTML = `
    <div class="card-header" style="display:flex;justify-content:space-between;align-items:center;">
      <span style="font-weight:700;font-size:14px;color:var(--text)">🍽️ Инструменты питания</span>
    </div>
    <div class="card-body" style="padding-top:8px;">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
        <button onclick="event.stopPropagation();openRecipesPanel()" class="nutr-quick-btn">
          <div class="nutr-quick-icon">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 2h18v6a9 9 0 01-18 0V2z"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="12" y1="8" x2="12" y2="22"/><line x1="6" y1="22" x2="18" y2="22"/>
            </svg>
          </div>
          <div class="nutr-quick-label">Рецепты</div>
        </button>
        <button onclick="event.stopPropagation();openPlansPanel()" class="nutr-quick-btn">
          <div class="nutr-quick-icon">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="4" width="18" height="17" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="8" y1="14" x2="10" y2="16"/><line x1="10" y1="16" x2="14" y2="12"/>
            </svg>
          </div>
          <div class="nutr-quick-label">План питания</div>
        </button>
      </div>
    </div>
  `;
}
window.renderNutrQuickCard = renderNutrQuickCard;

function openRecipesPanel() {
  var ov = document.getElementById('recipes-panel-overlay');
  var sh = document.getElementById('recipes-panel-sheet');
  if (ov && sh) { ov.classList.add('show'); sh.classList.add('show'); return; }
  ov = document.createElement('div');
  ov.id = 'recipes-panel-overlay';
  ov.className = 'sheet-overlay';
  ov.onclick = function(){ closeRecipesPanel(); };
  document.body.appendChild(ov);
  sh = document.createElement('div');
  sh.id = 'recipes-panel-sheet';
  sh.className = 'bottom-sheet';
  sh.style.maxHeight = '85vh';
  sh.innerHTML = `
    <div class="sheet-handle"></div>
    <div class="sheet-title">🍳 Рецепты</div>
    <div style="padding:0 16px 20px;overflow-y:auto;max-height:65vh;">
      <div class="recipe-chips" style="margin-bottom:12px;">
        ${RECIPES.map(r => `<button class="recipe-chip" onclick="event.stopPropagation();closeRecipesPanel();setTimeout(function(){openRecipeSheet('${r.id}')},180)">
          <span class="recipe-chip-emoji">${r.emoji}</span>
          <span class="recipe-chip-name">${r.name}</span>
          <span class="recipe-chip-kcal">${r.kcal} ккал</span>
        </button>`).join('')}
      </div>
      <button onclick="closeRecipesPanel();setTimeout(openAddRecipeSheet,180)" style="margin-top:4px;width:100%;padding:11px;background:var(--accent);color:#fff;border:none;border-radius:12px;font-size:0.85rem;font-weight:700;cursor:pointer;">+ Добавить рецепт</button>
    </div>
  `;
  document.body.appendChild(sh);
  // свайп вниз для закрытия
  var sy=0, cy=0, drag=false;
  sh.addEventListener('touchstart', function(e){ if(e.target.tagName==='BUTTON') return; sy=e.touches[0].clientY; cy=sy; drag=true; sh.style.transition='none'; },{passive:true});
  sh.addEventListener('touchmove', function(e){ if(!drag) return; e.preventDefault(); cy=e.touches[0].clientY; var dy=Math.max(0,cy-sy); sh.style.transform='translateY('+dy+'px)'; },{passive:false});
  sh.addEventListener('touchend', function(){ if(!drag) return; drag=false; var dy=cy-sy; sh.style.transition='transform 0.25s cubic-bezier(0.32,0.72,0,1)'; if(dy>80){closeRecipesPanel();}else{sh.style.transform='translateY(0)';} });
  setTimeout(function(){ sh.style.transform='translateY(0)'; ov.classList.add('show'); sh.classList.add('show'); }, 10);
  // блокируем скролл страницы
  document.body.style.overflow = 'hidden';
  var sa = document.querySelector('.scroll-area');
  if (sa) sa.style.overflow = 'hidden';
}
window.openRecipesPanel = openRecipesPanel;

function closeRecipesPanel() {
  var ov = document.getElementById('recipes-panel-overlay');
  var sh = document.getElementById('recipes-panel-sheet');
  if (sh) { sh.style.transition='transform 0.25s cubic-bezier(0.32,0.72,0,1)'; sh.style.transform='translateY(100%)'; }
  if (ov) ov.classList.remove('show');
  // разблокируем скролл
  document.body.style.overflow = '';
  var sa = document.querySelector('.scroll-area');
  if (sa) sa.style.overflow = '';
  setTimeout(function(){
    var o2=document.getElementById('recipes-panel-overlay');
    var s2=document.getElementById('recipes-panel-sheet');
    if(o2) o2.remove();
    if(s2) s2.remove();
  }, 260);
}
window.closeRecipesPanel = closeRecipesPanel;

function openPlansPanel() {
  var ov = document.getElementById('plans-panel-overlay');
  var sh = document.getElementById('plans-panel-sheet');
  if (ov && sh) { ov.classList.add('show'); sh.classList.add('show'); return; }
  ov = document.createElement('div');
  ov.id = 'plans-panel-overlay';
  ov.className = 'sheet-overlay';
  ov.onclick = function(){ closePlansPanel(); };
  document.body.appendChild(ov);
  sh = document.createElement('div');
  sh.id = 'plans-panel-sheet';
  sh.className = 'bottom-sheet';
  sh.style.maxHeight = '85vh';
  sh.innerHTML = `
    <div class="sheet-handle"></div>
    <div class="sheet-title">📋 Планы питания</div>
    <div style="padding:0 16px 20px;overflow-y:auto;max-height:65vh;">
      <div style="font-size:0.78rem;color:var(--text-light);margin-bottom:10px;">Нажми на план — рацион загрузится в дневник питания на сегодня</div>
      ${NUTR_PLANS.map(p => `
        <div class="nutr-plan-row" onclick="event.stopPropagation();closePlansPanel();confirmLoadPlan('${p.id}')">
          <div class="nutr-plan-left">
            <span class="nutr-plan-emoji">${p.emoji}</span>
            <div>
              <div class="nutr-plan-name">${p.name}</div>
              <div class="nutr-plan-desc">${p.desc}</div>
            </div>
          </div>
          <div class="nutr-plan-kcal">${p.kcal} ккал</div>
        </div>`).join('')}
    </div>
  `;
  document.body.appendChild(sh);
  // свайп вниз для закрытия
  var sy=0, cy=0, drag=false;
  sh.addEventListener('touchstart', function(e){ if(e.target.tagName==='BUTTON') return; sy=e.touches[0].clientY; cy=sy; drag=true; sh.style.transition='none'; },{passive:true});
  sh.addEventListener('touchmove', function(e){ if(!drag) return; e.preventDefault(); cy=e.touches[0].clientY; var dy=Math.max(0,cy-sy); sh.style.transform='translateY('+dy+'px)'; },{passive:false});
  sh.addEventListener('touchend', function(){ if(!drag) return; drag=false; var dy=cy-sy; sh.style.transition='transform 0.25s cubic-bezier(0.32,0.72,0,1)'; if(dy>80){closePlansPanel();}else{sh.style.transform='translateY(0)';} });
  setTimeout(function(){ sh.style.transform='translateY(0)'; ov.classList.add('show'); sh.classList.add('show'); }, 10);
  // блокируем скролл страницы
  document.body.style.overflow = 'hidden';
  var sa = document.querySelector('.scroll-area');
  if (sa) sa.style.overflow = 'hidden';
}
window.openPlansPanel = openPlansPanel;

function closePlansPanel() {
  var ov = document.getElementById('plans-panel-overlay');
  var sh = document.getElementById('plans-panel-sheet');
  if (sh) { sh.style.transition='transform 0.25s cubic-bezier(0.32,0.72,0,1)'; sh.style.transform='translateY(100%)'; }
  if (ov) ov.classList.remove('show');
  // разблокируем скролл
  document.body.style.overflow = '';
  var sa = document.querySelector('.scroll-area');
  if (sa) sa.style.overflow = '';
  setTimeout(function(){
    var o2=document.getElementById('plans-panel-overlay');
    var s2=document.getElementById('plans-panel-sheet');
    if(o2) o2.remove();
    if(s2) s2.remove();
  }, 260);
}
window.closePlansPanel = closePlansPanel;

// legacy stubs
function renderRecipesCard() { renderNutrQuickCard(); }
function renderNutrPlansCard() {}
window.renderRecipesCard = renderRecipesCard;
window.renderNutrPlansCard = renderNutrPlansCard;

function confirmLoadPlan(planId) {
  const plan = NUTR_PLANS.find(p => p.id === planId);
  if (!plan) return;
  if (!confirm(`Загрузить план «${plan.name}» (~${plan.kcal} ккал) в дневник питания на сегодня?`)) return;
  loadNutrPlanToday(plan);
}
window.confirmLoadPlan = confirmLoadPlan;

function loadNutrPlanToday(plan) {
  const today = (function() { const d = new Date(); d.setDate(d.getDate() + (window.nutrOffset || 0)); return d.toLocaleDateString('ru-RU'); })();
  let added = 0;
  plan.days.forEach(item => {
    const entry = {
      id: Date.now() + '' + Math.random().toString(36).slice(2),
      name: `${item.time} ${item.name}`,
      kcal: item.kcal,
      protein: item.protein,
      carbs: item.carbs,
      fat: item.fat,
      grams: null,
      mealType: item.mealType,
      date: today
    };
    if (typeof nutrEntries !== 'undefined') nutrEntries.push(entry);
    added++;
  });
  if (typeof nutrEntries !== 'undefined') localStorage.setItem('fs-nutrition', JSON.stringify(nutrEntries));
  renderNutrEntries();
  toast(`✅ Загружено ${added} приёмов пищи`);
}
window.loadNutrPlanToday = loadNutrPlanToday;

// ==================== SIMULATION ====================
function runSimulation() {
  const start   = parseFloat(document.getElementById('sim-start')?.value);
  const target  = parseFloat(document.getElementById('sim-target')?.value);
  const weeks   = parseInt(document.getElementById('sim-weeks')?.value);
  const freq    = parseInt(document.getElementById('sim-freq')?.value) || 3;
  const deficit = parseFloat(document.getElementById('sim-deficit')?.value) || -400;

  ['sim-start','sim-target','sim-weeks'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    if (!el.value) { el.style.borderColor = '#ef4444'; setTimeout(() => el.style.borderColor = '', 2000); }
    else el.style.borderColor = '';
  });

  if (!start || !target || !weeks) return;
  // Валидация реалистичности цели в симуляции
  if (target < 10 || target > 400) {
    const warnEl2 = document.getElementById('sim-warn');
    if (warnEl2) {
      warnEl2.innerHTML = '<div class="sim-warn-item">❗ Целевой вес ' + target + ' кг нереалистичен. Введи значение от 20 до 300 кг.</div>';
      warnEl2.style.display = 'block';
    }
    return;
  }
  if (Math.abs(start - target) < 0.1) {
    const warnEl2 = document.getElementById('sim-warn');
    if (warnEl2) {
      warnEl2.innerHTML = '<div class="sim-warn-item">⚠️ Текущий и целевой вес совпадают — цель не задана. Измени целевой вес.</div>';
      warnEl2.style.display = 'block';
    }
    return;
  }

  const output = document.getElementById('sim-output');
  const barsEl = document.getElementById('sim-bars');
  const concEl = document.getElementById('sim-conclusion');
  const chartEl = document.getElementById('sim-chart');
  const kpiEl  = document.getElementById('sim-kpi');
  const warnEl = document.getElementById('sim-warn');
  if (!output || !barsEl || !concEl) return;

  const weeklyChange = (deficit * 7) / 7700;
  const step = Math.max(1, Math.floor(weeks / 8));
  const maxDelta = Math.abs(weeklyChange * weeks) || 1;

  // --- KPI ---
  const totalChange = +(weeklyChange * weeks).toFixed(1);
  const finalWeight = +(start + totalChange).toFixed(1);
  const reached = deficit < 0 ? finalWeight <= target : finalWeight >= target;
  const weeksToGoal = Math.abs((target - start) / (weeklyChange || 0.001));
  const tdeeVal = profile ? Math.round(calcBMR(profile) * profile.activity) : 2000;
  const _simAge = Number(profile?.age) || 25;
  let rec = tdeeVal;
  if (profile?.goal === 'loss') rec -= (_simAge > 55 ? 300 : 400);
  if (profile?.goal === 'gain') rec += (_simAge > 55 ? 200 : 300);
  const eatPerDay = Math.max(1200, rec + deficit);

  if (kpiEl) {
    kpiEl.innerHTML = `
      <div class="sim-kpi-grid">
        <div class="sim-kpi-item">
          <div class="sim-kpi-val" style="color:var(--accent)">${weeklyChange > 0 ? '+' : ''}${weeklyChange.toFixed(2)} кг</div>
          <div class="sim-kpi-lbl">изменение/нед</div>
        </div>
        <div class="sim-kpi-item">
          <div class="sim-kpi-val">${finalWeight} кг</div>
          <div class="sim-kpi-lbl">вес через ${weeks} нед</div>
        </div>
        <div class="sim-kpi-item">
          <div class="sim-kpi-val" style="color:var(--accent)">${eatPerDay}</div>
          <div class="sim-kpi-lbl">ккал/день для цели</div>
        </div>
        <div class="sim-kpi-item">
          <div class="sim-kpi-val">${reached ? '✅ ' + weeks + ' нед' : '~' + Math.ceil(weeksToGoal) + ' нед'}</div>
          <div class="sim-kpi-lbl">${reached ? 'цель достигнута' : 'нужно для цели'}</div>
        </div>
      </div>`;
  }

  // --- WARNING ---
  if (warnEl) {
    const warnings = [];
    const _warnAge = Number(profile?.age) || 25;
    const _maxSafeDeficit = _warnAge > 55 ? -400 : -700;
    const _maxSafeSurplus = _warnAge > 55 ?  400 :  700;
    if (deficit < _maxSafeDeficit) warnings.push(_warnAge > 55
      ? '⚠️ После 55 лет дефицит более 400 ккал/день ускоряет потерю мышечной массы'
      : '⚠️ Дефицит больше 700 ккал/день — риск потери мышц и слабости');
    if (deficit > _maxSafeSurplus) warnings.push(_warnAge > 55
      ? '⚠️ После 55 лет профицит более 400 ккал/день даёт преимущественно жир'
      : '⚠️ Профицит больше 700 ккал/день — высокий набор жира');
    if (eatPerDay < 1200) warnings.push('⚠️ Менее 1200 ккал/день — слишком мало для нормального обмена веществ');
    if (_warnAge < 18 && deficit < 0) warnings.push('⚠️ До 18 лет дефицит калорий нежелателен — организм ещё растёт');
    if (freq < 2 && deficit < -300) warnings.push('💡 Добавь тренировки — без них при дефиците теряются мышцы');
    warnEl.innerHTML = warnings.map(w => `<div class="sim-warn-item">${w}</div>`).join('');
    warnEl.style.display = warnings.length ? 'block' : 'none';
  }

  // --- SVG CHART ---
  if (chartEl) {
    const points = [];
    for (let w = 0; w <= weeks; w++) {
      points.push({ w, kg: +(start + weeklyChange * w).toFixed(2) });
    }
    const W = 280, H = 100, padX = 28, padY = 12;
    const minKg = Math.min(...points.map(p => p.kg), target) - 1;
    const maxKg = Math.max(...points.map(p => p.kg), target) + 1;
    const range = maxKg - minKg || 1;
    const px = p => padX + (p.w / weeks) * (W - padX * 2);
    const py = p => H - padY - ((p.kg - minKg) / range) * (H - padY * 2);
    const targetY = H - padY - ((target - minKg) / range) * (H - padY * 2);

    const polyline = points.map(p => `${px(p)},${py(p)}`).join(' ');
    const area = `${padX},${H - padY} ` + points.map(p => `${px(p)},${py(p)}`).join(' ') + ` ${px(points[points.length-1])},${H - padY}`;

    // x-axis labels
    const xLabels = [0, Math.round(weeks/2), weeks].map(w => {
      const xp = padX + (w / weeks) * (W - padX * 2);
      return `<text x="${xp}" y="${H}" text-anchor="middle" font-size="8" fill="var(--text-light)">${w === 0 ? 'Старт' : w + ' нед'}</text>`;
    }).join('');

    // y-axis labels
    const yLabels = [minKg+1, target, maxKg-1].map(kg => {
      const yp = H - padY - ((kg - minKg) / range) * (H - padY * 2);
      return `<text x="${padX - 4}" y="${yp + 3}" text-anchor="end" font-size="8" fill="var(--text-light)">${kg.toFixed(0)}</text>`;
    }).join('');

    chartEl.innerHTML = `
      <div style="font-size:11px;color:var(--text-light);font-weight:600;margin-bottom:6px;">📈 График изменения веса</div>
      <svg viewBox="0 0 ${W} ${H + 10}" style="width:100%;overflow:visible;">
        <defs>
          <linearGradient id="simGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="var(--accent)" stop-opacity="0.3"/>
            <stop offset="100%" stop-color="var(--accent)" stop-opacity="0"/>
          </linearGradient>
        </defs>
        <!-- target line -->
        <line x1="${padX}" y1="${targetY}" x2="${W - padX}" y2="${targetY}"
          stroke="var(--accent)" stroke-width="1" stroke-dasharray="4 3" opacity="0.5"/>
        <text x="${W - padX + 2}" y="${targetY + 3}" font-size="8" fill="var(--accent)">${target} кг</text>
        <!-- area -->
        <polygon points="${area}" fill="url(#simGrad)"/>
        <!-- line -->
        <polyline points="${polyline}" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <!-- start dot -->
        <circle cx="${px(points[0])}" cy="${py(points[0])}" r="3.5" fill="var(--accent)"/>
        <text x="${px(points[0])}" y="${py(points[0]) - 5}" text-anchor="middle" font-size="8" fill="var(--text)">${start} кг</text>
        <!-- end dot -->
        <circle cx="${px(points[points.length-1])}" cy="${py(points[points.length-1])}" r="3.5" fill="${reached ? '#22c55e' : 'var(--accent)'}"/>
        <text x="${px(points[points.length-1])}" y="${py(points[points.length-1]) - 5}" text-anchor="middle" font-size="8" fill="var(--text)">${finalWeight} кг</text>
        ${xLabels}
        ${yLabels}
      </svg>`;
  }

  // --- BARS ---
  let bars = '';
  for (let w = 0; w <= weeks; w += step) {
    const projected = +(start + weeklyChange * w).toFixed(1);
    const delta = Math.abs(projected - start);
    const pct = Math.min(100, Math.max(4, (delta / maxDelta) * 100));
    const cls = deficit < 0 ? 'loss' : deficit > 0 ? 'gain' : 'same';
    bars += `
      <div class="sim-bar-row">
        <span class="wlbl">${w === 0 ? 'Старт' : w + ' нед'}</span>
        <div class="sim-bar-bg">
          <div class="sim-bar-fill ${cls}" style="width:${w === 0 ? 4 : pct}%">${projected} кг</div>
        </div>
      </div>`;
  }

  // --- CONCLUSION ---
  let conclusion = `<b>Через ${weeks} нед:</b> ~${finalWeight} кг`;
  if (reached) {
    conclusion += ` ✅ Цель ${target} кг достигнута!`;
  } else {
    conclusion += ` — цель ${target} кг ещё не достигнута.`;
    conclusion += `<br>Нужно ~<b>${Math.ceil(weeksToGoal)} нед</b> при дефиците ${deficit} ккал/день.`;
  }
  if (freq >= 3) {
    conclusion += `<br><span style="color:var(--accent);font-size:0.82em">🏋️ ${freq} тр/нед — отличный темп для сохранения мышц</span>`;
  }

  barsEl.innerHTML = bars;
  concEl.innerHTML = conclusion;
  output.style.display = 'block';
}
window.runSimulation = runSimulation;
// ==================== ГОЛОСОВОЙ ВВОД В ШТОРКАХ ====================
let _sheetRec = null;
let _sheetMicActive = false;

window.startSheetVoice = function(inputId, callbackName, clickedButton) {
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    toast('❌ Голосовой ввод не поддерживается');
    return;
  }
  const input = document.getElementById(inputId);
  const btn = clickedButton || (input ? input.parentElement.querySelector('button[aria-label="Голосовой ввод"]') : null);
  const setListening = active => {
    if (!btn) return;
    btn.classList.toggle('listening', active);
    btn.style.removeProperty('background');
    btn.style.removeProperty('color');
    btn.style.removeProperty('animation');
  };

  if (_sheetMicActive) {
    _sheetMicActive = false;
    if (_sheetRec) { try { _sheetRec.stop(); } catch(e) {} _sheetRec = null; }
    setListening(false);
    return;
  }

  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  _sheetRec = new SR();
  _sheetRec.lang = 'ru-RU';
  _sheetRec.interimResults = false;
  _sheetRec.maxAlternatives = 1;
  _sheetMicActive = true;
  setListening(true);

  _sheetRec.onresult = e => {
    const text = e.results[0][0].transcript;
    if (input) { input.value = text; input.dispatchEvent(new Event('input', { bubbles:true })); }
    if (callbackName && window[callbackName]) window[callbackName]();
    _sheetMicActive = false;
    setListening(false);
  };
  _sheetRec.onerror = () => {
    _sheetMicActive = false;
    setListening(false);
    toast('❌ Ошибка микрофона');
  };
  _sheetRec.onend = () => {
    _sheetMicActive = false;
    setListening(false);
  };
  _sheetRec.start();
};


// Возврат из конструктора без потери сохранённой истории.
function exitWorkoutBuilder() {
  confirmDanger({
    title:'Прекратить создание тренировки?',
    message:'',
    confirmText:'Прекратить',
    hideIcon:true,
    onConfirm:()=>{
      customWt=[];
      pickerChecked={};pickerParams={};activeMuscle=null;
      if(typeof editMode!=='undefined')editMode=false;
      if(typeof clearWorkoutFlowState==='function')clearWorkoutFlowState();
      else localStorage.removeItem('fs-workout-flow-state');
      const input=document.getElementById('builder-ex-search');if(input)input.value='';
      const name=document.getElementById('wt-name-input');if(name)name.value='';
      ['builder-selected-exercises','builder-ex-search-list'].forEach(id=>{
        const el=document.getElementById(id);if(el){el.innerHTML='';el.hidden=id==='builder-selected-exercises';if(id==='builder-ex-search-list')el.style.display='none';}
      });
      if(typeof syncBuilderExerciseClear==='function')syncBuilderExerciseClear();
      currentWtScreen='home';
      if(typeof showWtScreen==='function')showWtScreen('home');
      const builder=document.getElementById('wt-builder'),home=document.getElementById('wt-home'),execute=document.getElementById('wt-execute');
      if(builder){builder.style.display='none';builder.classList.remove('has-muscle-picker','has-selection');builder.removeAttribute('data-mode');}
      if(execute)execute.style.display='none';if(home)home.style.display='block';
      if(typeof updateCtaLabel==='function')updateCtaLabel();
      if(typeof renderDiary==='function')renderDiary();
    }
  });
}
window.exitWorkoutBuilder = exitWorkoutBuilder;

const goToWithWorkoutHistory = window.goTo;
window.goTo = function(id, title) {
  goToWithWorkoutHistory(id, title);
  if (id === 'workout' && typeof renderDiary === 'function') renderDiary();
};


const NUTRIENT_INFO = {
  fiber: {title:'Клетчатка', body:`Пищевые волокна из овощей, фруктов, бобовых, цельных злаков, орехов и семян. Они поддерживают работу кишечника, дольше сохраняют сытость и помогают более плавно повышать уровень глюкозы после еды.

Ориентир: 30 г в день. Увеличивайте количество постепенно и пейте достаточно воды.`},
  sugar: {title:'Добавленный сахар', body:`Это сахар и сиропы, которые добавляют при производстве или приготовлении: например, в сладкие напитки, десерты, соусы и сладкие йогурты. Сахар, который естественно есть в целом фрукте или молоке, сюда не относится.

Ориентир: до 50 г в день. Чем меньше сладких напитков и ультраобработанных сладостей, тем легче оставаться в лимите.`},
  sodium: {title:'Натрий', body:`Минерал, который регулирует баланс жидкости, нервные импульсы и сокращение мышц. Основной источник в рационе — соль, а также колбасы, сыры, готовые соусы и полуфабрикаты.

Ориентир: до 2 300 мг натрия в день. При высоком давлении врач может рекомендовать более низкую цель.`},
  satfat: {title:'Насыщенные жиры', body:`Тип жиров, которого обычно много в жирном мясе, колбасах, сливочном масле, жирных молочных продуктах, выпечке и кокосовом масле. Избыток может повышать уровень LDL-холестерина у части людей.

Ориентир: до 20 г в день. Чаще выбирайте рыбу, орехи, семена, авокадо и растительные масла.`},
  potassium: {title:'Калий', body:`Минерал для работы мышц, нервной системы и поддержания нормального давления. Его источники: картофель, бобовые, зелень, овощи, фрукты, молочные продукты и рыба.

Ориентир: 3 500 мг в день. При болезнях почек или приёме некоторых лекарств цель нужно согласовать с врачом.`}
};
function showNutrientInfo(key) {
  const item=NUTRIENT_INFO[key]; if(!item) return;
  document.getElementById('nutrient-info-overlay')?.remove();
  const overlay=document.createElement('div'); overlay.id='nutrient-info-overlay'; overlay.className='nutrient-info-overlay';
  overlay.innerHTML='<section class="nutrient-info-panel" role="dialog" aria-modal="true" aria-labelledby="nutrient-info-title"><button type="button" class="nutrient-info-close" aria-label="Закрыть">×</button><h2 id="nutrient-info-title"></h2><div class="nutrient-info-body"></div></section>';
  overlay.querySelector('h2').textContent=item.title; overlay.querySelector('.nutrient-info-body').textContent=item.body;
  overlay.querySelector('.nutrient-info-close').onclick=()=>overlay.remove(); overlay.onclick=e=>{if(e.target===overlay) overlay.remove();}; document.body.appendChild(overlay);
}
window.showNutrientInfo=showNutrientInfo;


// === ЕДИНЫЙ ДИАЛОГ УДАЛЕНИЯ ===
function confirmDanger({ title = 'Удалить?', message = 'Действие необратимо.', confirmText = 'Удалить', onConfirm, compact = false, hideIcon = false }) {
  document.getElementById('danger-confirm-overlay')?.remove();
  const overlay = document.createElement('div');
  overlay.id = 'danger-confirm-overlay';
  overlay.className = 'confirm-overlay';
  overlay.innerHTML = `
    <div class="confirm-dialog" role="dialog" aria-modal="true">
      ${compact || hideIcon ? '' : '<div class="confirm-icon">!</div>'}
      <h2${compact || !message ? ' style="margin-bottom:20px"' : ''}>${title}</h2>
      ${compact || !message ? '' : '<p>' + message + '</p>'}
      <div class="confirm-actions">
        <button class="confirm-btn-cancel" type="button">Отмена</button>
        <button class="confirm-btn-danger" type="button">${confirmText}</button>
      </div>
    </div>
  `;
  const close = () => overlay.remove();
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
  overlay.querySelector('.confirm-btn-cancel').onclick = close;
  overlay.querySelector('.confirm-btn-danger').onclick = () => { close(); onConfirm?.(); };
  document.body.appendChild(overlay);
}
window.confirmDanger = confirmDanger;


// FITSIM MEAL SLIDER — RELIABLE FIX
(function () {
  'use strict';

  var mealIndex = 0;
  var initialized = false;

  function getTrack() { return document.getElementById('meal-slides'); }
  function getOuter() { return document.querySelector('.meal-slides-outer'); }
  function getDots() { return document.querySelectorAll('#page-nutrition .meal-dots-in-card .meal-dot'); }

  function syncMealSliderHeight() {
    var outer=getOuter(),track=getTrack();
    if(!outer||!track)return;
    var mealsSlide=track.children[0],analyticsSlide=track.children[1];
    var mealsCard=mealsSlide&&mealsSlide.querySelector('.card');
    if(!mealsCard)return;
    var rect=mealsCard.getBoundingClientRect();
    if(rect.width<=0||rect.height<=0)return;
    // The meals card is the only source of truth; never resize it to match analytics.
    var cardHeight=rect.height+'px';
    if(outer.style.getPropertyValue('--meal-reference-height')!==cardHeight){
      outer.style.setProperty('--meal-reference-height',cardHeight);
    }
    var slide=track.children[mealIndex];
    if(!slide)return;
    var height=Math.ceil(slide.getBoundingClientRect().height);
    if(height>0&&outer.style.height!==height+'px')outer.style.height=height+'px';
  }
  var mealHeightFrame=0;
  function scheduleMealSliderHeight(){
    if(mealHeightFrame)return;
    mealHeightFrame=requestAnimationFrame(function(){mealHeightFrame=0;syncMealSliderHeight();});
  }

  function applyTransform(animate) {
    var track = getTrack();
    if (!track) return;
    track.style.transition = animate === false
      ? 'none'
      : 'transform 0.42s cubic-bezier(0.16, 1, 0.3, 1)';
    track.style.transform = 'translate3d(' + (-50 * mealIndex) + '%, 0, 0)';
  }

  function updateDots() {
    var dots = getDots();
    for (var i = 0; i < dots.length; i++) {
      var isActive = (i % 2) === mealIndex;
      dots[i].classList.toggle('meal-dot-active', isActive);
      dots[i].setAttribute('aria-pressed', isActive ? 'true' : 'false');
    }
  }

  window.mealGoTo = function (index, animate) {
    index = Number(index);
    if (isNaN(index)) index = 0;
    mealIndex = Math.max(0, Math.min(1, index));
    window.mealSlide = mealIndex;
    window._mealSlide = mealIndex;
    applyTransform(animate !== false);
    updateDots();
    syncMealSliderHeight();
    scheduleMealSliderHeight();
    if (mealIndex === 1 && typeof window.renderMealAnalytics === 'function') {
      setTimeout(function () {
        try { window.renderMealAnalytics(); } catch (error) { console.warn('renderMealAnalytics:', error); }
      }, 50);
    }
  };

  function onDotClick(event) {
    var target = event.target;
    if (!target || !target.closest) return;
    var dot = target.closest('#page-nutrition .meal-dots-in-card .meal-dot');
    if (!dot) return;
    var dots = Array.prototype.slice.call(getDots());
    var index = dots.indexOf(dot);
    if (index < 0) return;
    event.preventDefault();
    event.stopPropagation();
    window.mealGoTo(index % 2, true);
  }

  function initSwipe() {
    var outer = getOuter();
    if (!outer || outer._fitsimMealSwipeReady) return;
    outer._fitsimMealSwipeReady = true;

    var startX = 0, startY = 0, lastX = 0;
    var dragging = false, horizontal = false, startIndex = 0;

    outer.addEventListener('touchstart', function (event) {
      if (event.touches.length !== 1) return;
      startX = lastX = event.touches[0].clientX;
      startY = event.touches[0].clientY;
      dragging = true;
      horizontal = false;
      startIndex = mealIndex;
    }, { passive: true });

    outer.addEventListener('touchmove', function (event) {
      if (!dragging || event.touches.length !== 1) return;
      lastX = event.touches[0].clientX;
      var dx = lastX - startX;
      var dy = event.touches[0].clientY - startY;
      if (!horizontal) {
        if (Math.abs(dx) < 10) return;
        horizontal = Math.abs(dx) > Math.abs(dy);
      }
      if (!horizontal) return;
      if (event.cancelable) event.preventDefault();

      var track = getTrack();
      if (!track) return;
      var width = outer.getBoundingClientRect().width || window.innerWidth;
      var edge = (startIndex === 0 && dx > 0) || (startIndex === 1 && dx < 0);
      var resistance = edge ? 0.3 : 1;
      var percent = startIndex * 50 - (dx / width) * 50 * resistance;
      percent = Math.max(0, Math.min(50, percent));
      track.style.transition = 'none';
      track.style.transform = 'translate3d(-' + percent + '%, 0, 0)';
    }, { passive: false });

    function finishSwipe() {
      if (!dragging) return;
      dragging = false;
      var dx = lastX - startX;
      if (horizontal && Math.abs(dx) >= 40) {
        window.mealGoTo(dx < 0 ? startIndex + 1 : startIndex - 1, true);
      } else {
        window.mealGoTo(startIndex, true);
      }
    }

    outer.addEventListener('touchend', finishSwipe, { passive: true });
    outer.addEventListener('touchcancel', finishSwipe, { passive: true });
  }

  function init() {
    if (initialized) return true;
    if (!getTrack() || !getOuter()) return false;
    initialized = true;
    mealIndex = Math.max(0, Math.min(1, Number(window._mealSlide || window.mealSlide || 0)));
    initSwipe();
    if(typeof ResizeObserver==='function'){
      var observer=new ResizeObserver(scheduleMealSliderHeight);
      Array.prototype.forEach.call(getTrack().children,function(slide){observer.observe(slide);});
    }else{
      new MutationObserver(scheduleMealSliderHeight).observe(getTrack(),{childList:true,subtree:true,attributes:true});
    }
    window.addEventListener('resize',scheduleMealSliderHeight);
    document.addEventListener('click',scheduleMealSliderHeight);
    document.addEventListener('click', onDotClick, true);
    window.mealGoTo(mealIndex, false);
    window.addEventListener('pageshow', function () { window.mealGoTo(mealIndex, false); });
    return true;
  }

  function tryInit() {
    if (init()) return;
    var tries = 0;
    var timer = setInterval(function () {
      tries++;
      if (init() || tries > 20) clearInterval(timer);
    }, 100);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', tryInit, { once: true });
  else tryInit();
  window.addEventListener('load', tryInit);
// ===== RECIPE FUNCTIONS =====

// Открытие карточки рецепта
window.openRecipeSheet = function(recipeId) {
  var recipe = RECIPES.find(r => r.id === recipeId);
  if (!recipe) return;

  var ov = document.getElementById('recipe-sheet-overlay');
  var sh = document.getElementById('recipe-sheet');
  if (ov && sh) { ov.classList.add('show'); sh.classList.add('show'); return; }

  ov = document.createElement('div');
  ov.id = 'recipe-sheet-overlay';
  ov.className = 'sheet-overlay';
  ov.onclick = window.closeRecipeSheet;
  document.body.appendChild(ov);

  sh = document.createElement('div');
  sh.id = 'recipe-sheet';
  sh.className = 'bottom-sheet';
  sh.style.maxHeight = '85vh';
  sh.innerHTML = `
    <div class="sheet-handle"></div>
    <div class="sheet-title">${recipe.emoji} ${recipe.name}</div>
    <div style="padding:0 16px 20px;overflow-y:auto;max-height:65vh;">
      <div style="display:flex;gap:10px;margin-bottom:16px;flex-wrap:wrap;">
        <span style="background:var(--input-bg);padding:6px 12px;border-radius:10px;font-size:12px;font-weight:700;">⏱️ ${recipe.time}</span>
        <span style="background:var(--accent);color:#fff;padding:6px 12px;border-radius:10px;font-size:12px;font-weight:700;">${recipe.kcal} ккал</span>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:20px;">
        <div style="background:rgba(236,72,153,0.12);padding:12px;border-radius:12px;text-align:center;">
          <div style="font-size:18px;font-weight:800;color:#ec4899;">${recipe.protein}г</div>
          <div style="font-size:11px;color:var(--text-light);font-weight:600;">Белки</div>
        </div>
        <div style="background:rgba(34,197,94,0.12);padding:12px;border-radius:12px;text-align:center;">
          <div style="font-size:18px;font-weight:800;color:#22c55e;">${recipe.carbs}г</div>
          <div style="font-size:11px;color:var(--text-light);font-weight:600;">Углеводы</div>
        </div>
        <div style="background:rgba(245,158,11,0.12);padding:12px;border-radius:12px;text-align:center;">
          <div style="font-size:18px;font-weight:800;color:#f59e0b;">${recipe.fat}г</div>
          <div style="font-size:11px;color:var(--text-light);font-weight:600;">Жиры</div>
        </div>
      </div>
      ${(recipe.ingredients||[]).length > 0 ? `
      <div style="font-weight:700;margin-bottom:10px;">Ингредиенты:</div>
      ${(recipe.ingredients||[]).map(ing => `
        <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);">
          <span>${ing.name}</span>
          <span style="color:var(--text-light);font-weight:600;">${ing.grams}г</span>
        </div>
      `).join('')}
      ` : ''}
      <div style="margin-top:16px;">
        <div style="font-weight:700;margin-bottom:8px;">Добавить в:</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
          <button onclick="window.addRecipeToMeal('${recipe.id}','breakfast')" style="padding:12px;background:rgba(251,146,60,0.15);color:#fb923c;border:1px solid rgba(251,146,60,0.3);border-radius:12px;font-size:13px;font-weight:700;cursor:pointer;">🍳 Завтрак</button>
          <button onclick="window.addRecipeToMeal('${recipe.id}','lunch')" style="padding:12px;background:rgba(34,197,94,0.15);color:#22c55e;border:1px solid rgba(34,197,94,0.3);border-radius:12px;font-size:13px;font-weight:700;cursor:pointer;">🍲 Обед</button>
          <button onclick="window.addRecipeToMeal('${recipe.id}','dinner')" style="padding:12px;background:rgba(99,102,241,0.15);color:#818cf8;border:1px solid rgba(99,102,241,0.3);border-radius:12px;font-size:13px;font-weight:700;cursor:pointer;">🍽️ Ужин</button>
          <button onclick="window.addRecipeToMeal('${recipe.id}','snack')" style="padding:12px;background:rgba(236,72,153,0.15);color:#ec4899;border:1px solid rgba(236,72,153,0.3);border-radius:12px;font-size:13px;font-weight:700;cursor:pointer;">🍎 Перекус</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(sh);

  var sy=0, cy=0, drag=false;
  sh.addEventListener('touchstart', function(e){ if(e.target.tagName==='BUTTON') return; sy=e.touches[0].clientY; cy=sy; drag=true; sh.style.transition='none'; },{passive:true});
  sh.addEventListener('touchmove', function(e){ if(!drag) return; e.preventDefault(); cy=e.touches[0].clientY; var dy=Math.max(0,cy-sy); sh.style.transform='translateY('+dy+'px)'; },{passive:false});
  sh.addEventListener('touchend', function(){ if(!drag) return; drag=false; var dy=cy-sy; sh.style.transition='transform 0.25s cubic-bezier(0.32,0.72,0,1)'; if(dy>80){window.closeRecipeSheet();}else{sh.style.transform='translateY(0)';} });

  setTimeout(() => { sh.classList.add('show'); ov.classList.add('show'); sh.style.transform='translateY(0)'; }, 10);
};

// Закрытие карточки рецепта
window.closeRecipeSheet = function() {
  var ov = document.getElementById('recipe-sheet-overlay');
  var sh = document.getElementById('recipe-sheet');
  if (ov) ov.classList.remove('show');
  if (sh) { sh.classList.remove('show'); sh.style.transform = 'translateY(100%)'; }
  setTimeout(() => { if (ov) ov.remove(); if (sh) sh.remove(); }, 300);
};

// Добавление рецепта в выбранный приём пищи
window.addRecipeToMeal = function(recipeId, mealType) {
  var recipe = RECIPES.find(r => r.id === recipeId);
  if (!recipe) return;

  window.closeRecipeSheet();

  var item100 = { name: recipe.name, kcal100: recipe.kcal, p100: recipe.protein, c100: recipe.carbs, f100: recipe.fat };
  window.currentMealType = mealType;
  window.openGramsSheet(item100, null);

  toast('Выбрано: ' + (mealType==='breakfast'?'Завтрак':mealType==='lunch'?'Обед':mealType==='dinner'?'Ужин':'Перекус'));
};

// Открытие формы добавления нового рецепта
window.openAddRecipeSheet = function() {
  var ov = document.getElementById('add-recipe-overlay');
  var sh = document.getElementById('add-recipe-sheet');
  if (ov && sh) { ov.classList.add('show'); sh.classList.add('show'); return; }

  ov = document.createElement('div');
  ov.id = 'add-recipe-overlay';
  ov.className = 'sheet-overlay';
  ov.onclick = window.closeAddRecipeSheet;
  document.body.appendChild(ov);

  sh = document.createElement('div');
  sh.id = 'add-recipe-sheet';
  sh.className = 'bottom-sheet';
  sh.innerHTML = `
    <div class="sheet-handle"></div>
    <div class="sheet-title">Добавить рецепт</div>
    <div style="padding:16px 20px 24px;overflow-y:auto;max-height:70vh;">
      <div class="sheet-field">
        <label>Название</label>
        <input type="text" id="new-recipe-name" placeholder="Например: Овсянка с бананом" style="width:100%;padding:12px 14px;border-radius:12px;border:1px solid var(--border);background:var(--input-bg);color:var(--text);font-size:15px;outline:none;" />
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px;">
        <div class="sheet-field">
          <label>Ккал</label>
          <input type="number" id="new-recipe-kcal" placeholder="" style="width:100%;padding:12px 14px;border-radius:12px;border:1px solid var(--border);background:var(--input-bg);color:var(--text);font-size:15px;outline:none;" />
        </div>
        <div class="sheet-field">
          <label>Время (мин)</label>
          <input type="number" id="new-recipe-time" placeholder="" style="width:100%;padding:12px 14px;border-radius:12px;border:1px solid var(--border);background:var(--input-bg);color:var(--text);font-size:15px;outline:none;" />
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:16px;">
        <div class="sheet-field">
          <label>Белки (г)</label>
          <input type="number" id="new-recipe-protein" placeholder="" style="width:100%;padding:12px 14px;border-radius:12px;border:1px solid var(--border);background:var(--input-bg);color:var(--text);font-size:15px;outline:none;" />
        </div>
        <div class="sheet-field">
          <label>Жиры (г)</label>
          <input type="number" id="new-recipe-fat" placeholder="" style="width:100%;padding:12px 14px;border-radius:12px;border:1px solid var(--border);background:var(--input-bg);color:var(--text);font-size:15px;outline:none;" />
        </div>
        <div class="sheet-field">
          <label>Углеводы (г)</label>
          <input type="number" id="new-recipe-carbs" placeholder="" style="width:100%;padding:12px 14px;border-radius:12px;border:1px solid var(--border);background:var(--input-bg);color:var(--text);font-size:15px;outline:none;" />
        </div>
      </div>
      <button onclick="window.saveNewRecipe()" style="width:100%;padding:14px;background:var(--accent);color:#fff;border:none;border-radius:14px;font-size:15px;font-weight:700;cursor:pointer;">Сохранить рецепт</button>
    </div>
  `;
  document.body.appendChild(sh);

  var sy=0, cy=0, drag=false;
  sh.addEventListener('touchstart', function(e){ if(e.target.tagName==='BUTTON') return; sy=e.touches[0].clientY; cy=sy; drag=true; sh.style.transition='none'; },{passive:true});
  sh.addEventListener('touchmove', function(e){ if(!drag) return; e.preventDefault(); cy=e.touches[0].clientY; var dy=Math.max(0,cy-sy); sh.style.transform='translateY('+dy+'px)'; },{passive:false});
  sh.addEventListener('touchend', function(){ if(!drag) return; drag=false; var dy=cy-sy; sh.style.transition='transform 0.25s cubic-bezier(0.32,0.72,0,1)'; if(dy>80){window.closeAddRecipeSheet();}else{sh.style.transform='translateY(0)';} });

  setTimeout(() => { sh.classList.add('show'); ov.classList.add('show'); sh.style.transform='translateY(0)'; }, 10);
};

// Закрытие формы добавления рецепта
window.closeAddRecipeSheet = function() {
  var ov = document.getElementById('add-recipe-overlay');
  var sh = document.getElementById('add-recipe-sheet');
  if (ov) ov.classList.remove('show');
  if (sh) { sh.classList.remove('show'); sh.style.transform = 'translateY(100%)'; }
  setTimeout(() => { if (ov) ov.remove(); if (sh) sh.remove(); }, 300);
};

// Сохранение нового рецепта
window.saveNewRecipe = function() {
  var name = document.getElementById('new-recipe-name')?.value.trim();
  var kcal = parseFloat(document.getElementById('new-recipe-kcal')?.value) || 0;
  var time = document.getElementById('new-recipe-time')?.value.trim() || '0 мин';
  var protein = parseFloat(document.getElementById('new-recipe-protein')?.value) || 0;
  var fat = parseFloat(document.getElementById('new-recipe-fat')?.value) || 0;
  var carbs = parseFloat(document.getElementById('new-recipe-carbs')?.value) || 0;

  if (!name) { toast('Введите название рецепта'); return; }

  var newRecipe = {
    id: 'r' + Date.now(),
    name: name,
    emoji: '🍽️',
    time: time,
    kcal: Math.round(kcal),
    protein: Math.round(protein),
    fat: Math.round(fat),
    carbs: Math.round(carbs),
    tags: ['Пользовательский'],
    ingredients: []
  };

  RECIPES.push(newRecipe);
  localStorage.setItem('fs-recipes', JSON.stringify(RECIPES));

  window.closeAddRecipeSheet();
  window.openRecipesPanel();
  toast('Рецепт сохранён: ' + name);
};

// Загрузка рецептов из localStorage
var savedRecipes = localStorage.getItem('fs-recipes');
if (savedRecipes) {
  try {
    var userRecipes = JSON.parse(savedRecipes);
    var existingIds = RECIPES.map(r => r.id);
    userRecipes.forEach(function(r) { if (!existingIds.includes(r.id)) RECIPES.push(r); });
  } catch(e) { console.warn('Failed to load saved recipes:', e); }
}

// Переключение периода аналитики питания (День/Неделя/Месяц)
window.setMealAnalyticsPeriod = function(period, btn) {
  window.mealAnalyticsPeriod = period;

  // Переключаем класс active на кнопках
  document.querySelectorAll('.meal-period-btn').forEach(function(b) {
    b.classList.remove('active');
  });
  if (btn) btn.classList.add('active');

  // Обновляем label
  var label = document.getElementById('meal-period-label');
  if (label) {
    var names = { day: 'День', week: 'Неделя', month: 'Месяц' };
    label.textContent = names[period] || period;
  }

  // Перерисовываем аналитику
  if (typeof window.renderMealAnalytics === 'function') {
    window.renderMealAnalytics();
  }
};



// ===== SWIPE DOWN TO CLOSE =====
function attachSwipeDown(sheetEl, opts) {
  if (!sheetEl || sheetEl._fitsimSwipeAttached) return;
  sheetEl._fitsimSwipeAttached = true;
  opts = opts || {};
  var scrollSel = opts.scrollSelector || null;
  var closeFn = opts.closeFn || function() {
    if (typeof closeAllSheets === 'function') closeAllSheets();
  };
  var THRESHOLD = 80;
  var sy = 0, cy = 0;
  var dragging = false, decided = false, allow = false, startScroll = 0;

  function getScroll() {
    if (scrollSel) {
      var el = sheetEl.querySelector(scrollSel);
      if (el) return el.scrollTop;
    }
    return sheetEl.scrollTop || 0;
  }
  function resetTransform() {
    sheetEl.style.transition = '';
    sheetEl.style.transform  = '';
  }

  sheetEl.addEventListener('touchstart', function(e) {
    var tag = (e.target.tagName || '').toUpperCase();
    if (tag === 'BUTTON' || tag === 'INPUT' || tag === 'TEXTAREA' ||
        tag === 'SELECT' || tag === 'LABEL') return;
    sy = cy = e.touches[0].clientY;
    startScroll = getScroll();
    dragging = true;
    decided = false;
    allow = false;
    sheetEl.style.transition = 'none';
  }, { passive: true });

  sheetEl.addEventListener('touchmove', function(e) {
    if (!dragging) return;
    cy = e.touches[0].clientY;
    var dy = cy - sy;

    if (!decided) {
      if (Math.abs(dy) < 6) return;
      decided = true;
      // Свайп вниз закрывает шторку только если её содержимое не прокручено
      allow = (dy > 0 && startScroll <= 0);
    }
    if (!allow) {
      // Пользователь скроллит вверх — отдаём жест браузеру
      if (dy < 0) { dragging = false; resetTransform(); }
      return;
    }
    if (e.cancelable) e.preventDefault();
    sheetEl.style.transform = 'translateY(' + Math.max(0, dy) + 'px)';
  }, { passive: false });

  function finish() {
    if (!dragging) return;
    dragging = false;
    if (!allow) { resetTransform(); return; }
    var dy = cy - sy;
    sheetEl.style.transition = 'transform 0.25s cubic-bezier(0.32,0.72,0,1)';
    if (dy > THRESHOLD) {
      sheetEl.style.transform = 'translateY(100%)';
      setTimeout(function() {
        if (closeFn) closeFn();
        resetTransform();
      }, 240);
    } else {
      sheetEl.style.transform = 'translateY(0)';
      setTimeout(resetTransform, 260);
    }
  }
  sheetEl.addEventListener('touchend', finish);
  sheetEl.addEventListener('touchcancel', function() {
    dragging = false;
    resetTransform();
  });
}
window.attachSwipeDown = attachSwipeDown;

// Body sheet (замеры тела) — существует в DOM с самого начала
(function() {
  var sh = document.getElementById('body-sheet');
  if (sh) {
    attachSwipeDown(sh, {
      scrollSelector: '.ui-inline-155'   // внутренний скролл-контейнер
    });
  }
})();

// Calendar note sheet — создаётся динамически.
// Навешиваем свайп через обёртку над openCalendarNoteSheet().
(function() {
  function bindNoteSheet() {
    var sh = document.getElementById('calendar-note-sheet');
    if (sh && !sh._fitsimSwipeAttached) {
      attachSwipeDown(sh, {
        closeFn: function() {
          if (typeof window.closeCalendarNoteSheet === 'function') {
            window.closeCalendarNoteSheet();
          }
        }
      });
    }
  }
  if (typeof window.openCalendarNoteSheet === 'function') {
    var _orig = window.openCalendarNoteSheet;
    window.openCalendarNoteSheet = function(d) {
      _orig(d);
      setTimeout(bindNoteSheet, 0);   // ждём, пока шторка появится в DOM
    };
  }
})();


}());


// CLICKABLE ENCYCLOPEDIA HEADER BACK TO HOME
(function () {
  function bindEncyclopediaHomeBack() {
    var page = document.getElementById('page-encyclopedia');
    if (!page || page.dataset.homeBackBound === '1') return;
    var header = page.querySelector('.card-header');
    if (!header) return;
    var text = header.textContent.replace(/\s+/g, ' ').trim();
    if (text !== 'Справочник') return;
    page.dataset.homeBackBound = '1';
    header.classList.add('encyclopedia-home-back');
    header.setAttribute('role', 'button');
    header.setAttribute('tabindex', '0');
    header.setAttribute('aria-label', 'Вернуться на главный экран');
    header.addEventListener('click', function (event) {
      if (event.target.closest('button, input, a')) return;
      goTo('home', 'FitSim');
    });
    header.addEventListener('keydown', function (event) {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        goTo('home', 'FitSim');
      }
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bindEncyclopediaHomeBack, { once: true });
  else bindEncyclopediaHomeBack();
  window.addEventListener('load', bindEncyclopediaHomeBack);
}());

/* FITSIM: пользовательские рецепты — смайлик и ингредиенты с граммовкой */
(function() {
  window.openAddRecipeSheet = function() {
    var ov = document.getElementById('add-recipe-overlay');
    var sh = document.getElementById('add-recipe-sheet');
    if (ov && sh) { ov.classList.add('show'); sh.classList.add('show'); return; }
    ov = document.createElement('div');
    ov.id = 'add-recipe-overlay'; ov.className = 'sheet-overlay';
    ov.onclick = window.closeAddRecipeSheet;
    document.body.appendChild(ov);
    sh = document.createElement('div');
    sh.id = 'add-recipe-sheet'; sh.className = 'bottom-sheet'; sh.style.maxHeight = 'calc(100dvh - 20px)';
    sh.innerHTML = `
      <div class="sheet-handle"></div>
      <div class="sheet-title">Добавить рецепт</div>
      <div style="padding:0 20px 24px;overflow-y:auto;max-height:76vh;">
        <div style="display:grid;grid-template-columns:minmax(0,1fr) 82px;gap:10px;align-items:start;">
          <div class="sheet-field" style="min-width:0;">
            <label>Название</label>
            <input type="text" id="new-recipe-name" placeholder="Например: Овсянка с бананом" style="box-sizing:border-box;width:100%;height:50px;padding:10px 14px;border-radius:12px;border:1px solid var(--border);background:var(--input-bg);color:var(--text);font-size:15px;line-height:1.2;outline:none;" />
          </div>
          <div class="sheet-field" style="min-width:0;">
            <label>Смайлик</label>
            <input type="text" id="new-recipe-emoji" value="🍽️" maxlength="8" aria-label="Смайлик рецепта" style="box-sizing:border-box;width:100%;height:50px;padding:8px 4px;border-radius:12px;border:1px solid var(--border);background:var(--input-bg);color:var(--text);font-size:18px;line-height:1;text-align:center;outline:none;" />
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px;">
          <div class="sheet-field"><label>Ккал</label><input type="number" inputmode="decimal" min="0" id="new-recipe-kcal" placeholder="" style="width:100%;padding:12px 14px;border-radius:12px;border:1px solid var(--border);background:var(--input-bg);color:var(--text);font-size:15px;outline:none;" /></div>
          <div class="sheet-field"><label>Время (мин)</label><input type="number" inputmode="numeric" min="0" id="new-recipe-time" placeholder="" style="width:100%;padding:12px 14px;border-radius:12px;border:1px solid var(--border);background:var(--input-bg);color:var(--text);font-size:15px;outline:none;" /></div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:18px;">
          <div class="sheet-field"><label>Белки (г)</label><input type="number" inputmode="decimal" min="0" id="new-recipe-protein" placeholder="" style="width:100%;padding:12px 10px;border-radius:12px;border:1px solid var(--border);background:var(--input-bg);color:var(--text);font-size:15px;outline:none;" /></div>
          <div class="sheet-field"><label>Жиры (г)</label><input type="number" inputmode="decimal" min="0" id="new-recipe-fat" placeholder="" style="width:100%;padding:12px 10px;border-radius:12px;border:1px solid var(--border);background:var(--input-bg);color:var(--text);font-size:15px;outline:none;" /></div>
          <div class="sheet-field"><label>Углеводы (г)</label><input type="number" inputmode="decimal" min="0" id="new-recipe-carbs" placeholder="" style="width:100%;padding:12px 10px;border-radius:12px;border:1px solid var(--border);background:var(--input-bg);color:var(--text);font-size:15px;outline:none;" /></div>
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin:2px 0 10px;"><div style="font-size:15px;font-weight:800;color:var(--text);">Ингредиенты</div><button type="button" onclick="window.addRecipeIngredientRow()" style="padding:8px 11px;background:var(--input-bg);color:var(--accent);border:1px solid var(--border);border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;">＋ Добавить</button></div>
        <div id="new-recipe-ingredients" style="display:flex;flex-direction:column;gap:8px;margin-bottom:18px;"></div>
        <button onclick="window.saveNewRecipe()" style="width:100%;padding:14px;background:var(--accent);color:#fff;border:none;border-radius:14px;font-size:15px;font-weight:700;cursor:pointer;">Сохранить рецепт</button>
      </div>`;
    document.body.appendChild(sh);
    window.addRecipeIngredientRow();
    var sy=0, cy=0, drag=false;
    sh.addEventListener('touchstart', function(e){ if(['BUTTON','INPUT'].includes(e.target.tagName)) return; sy=e.touches[0].clientY; cy=sy; drag=true; sh.style.transition='none'; }, {passive:true});
    sh.addEventListener('touchmove', function(e){ if(!drag)return; e.preventDefault(); cy=e.touches[0].clientY; sh.style.transform='translateY('+Math.max(0,cy-sy)+'px)'; }, {passive:false});
    sh.addEventListener('touchend', function(){ if(!drag)return; drag=false; sh.style.transition='transform .25s cubic-bezier(.32,.72,0,1)'; if(cy-sy>80) window.closeAddRecipeSheet(); else sh.style.transform='translateY(0)'; });
    setTimeout(function(){ sh.classList.add('show'); ov.classList.add('show'); sh.style.transform='translateY(0)'; }, 10);
  };

  window.addRecipeIngredientRow = function(name, grams) {
    var list=document.getElementById('new-recipe-ingredients'); if(!list)return;
    var row=document.createElement('div');
    row.style.cssText='display:grid;grid-template-columns:minmax(0,1fr) 92px 36px;gap:8px;align-items:center;';
    row.innerHTML=`<div class="new-recipe-ingredient-field"><input class="new-recipe-ingredient-name" type="text" value="" autocomplete="off" style="box-sizing:border-box;width:100%;height:44px;padding:10px 12px;border-radius:11px;border:1px solid var(--border);background:var(--input-bg);color:var(--text);font-size:14px;outline:none"></div><div class="new-recipe-ingredient-field"><input class="new-recipe-ingredient-grams" type="number" value="" min="0" autocomplete="off" style="box-sizing:border-box;width:100%;height:44px;padding:10px 8px;border-radius:11px;border:1px solid var(--border);background:var(--input-bg);color:var(--text);font-size:14px;text-align:center;outline:none"><\/div><button type="button" aria-label="Удалить ингредиент" style="width:38px;height:38px;min-width:38px;min-height:38px;padding:0;border:1px solid var(--border);border-radius:9px;background:var(--input-bg);color:#ef4444;font-size:17px;line-height:1;cursor:pointer;pointer-events:auto">×</button>`; list.appendChild(row);
  const removeBtn = row.querySelector('button[aria-label="Удалить ингредиент"]');
  if (removeBtn) removeBtn.addEventListener('click', function(e){ e.preventDefault(); e.stopPropagation(); row.remove(); });
  };

  window.closeAddRecipeSheet = function(){ var ov=document.getElementById('add-recipe-overlay'),sh=document.getElementById('add-recipe-sheet'); if(ov)ov.classList.remove('show'); if(sh){sh.classList.remove('show');sh.style.transform='translateY(100%)';} setTimeout(function(){if(ov)ov.remove();if(sh)sh.remove();},300); };
  window.saveNewRecipe = function(){
    var name=document.getElementById('new-recipe-name')?.value.trim(), emoji=document.getElementById('new-recipe-emoji')?.value.trim()||'🍽️';
    if(!name){toast('Введите название рецепта');return;}
    var ingredients=[], rows=document.querySelectorAll('#new-recipe-ingredients > div');
    for(var i=0;i<rows.length;i++){var n=rows[i].querySelector('.new-recipe-ingredient-name').value.trim(), raw=rows[i].querySelector('.new-recipe-ingredient-grams').value;if(!n&&!raw)continue;var g=parseFloat(raw);if(!n){toast('Введите название ингредиента');return;}if(!Number.isFinite(g)||g<=0){toast('Укажите граммовку для: '+n);return;}ingredients.push({name:n,grams:Math.round(g*10)/10});}
    var mins=parseFloat(document.getElementById('new-recipe-time')?.value)||0;
    var recipe={id:'r'+Date.now(),name:name,emoji:emoji,time:mins>0?Math.round(mins)+' мин':'0 мин',kcal:Math.round(parseFloat(document.getElementById('new-recipe-kcal')?.value)||0),protein:Math.round(parseFloat(document.getElementById('new-recipe-protein')?.value)||0),fat:Math.round(parseFloat(document.getElementById('new-recipe-fat')?.value)||0),carbs:Math.round(parseFloat(document.getElementById('new-recipe-carbs')?.value)||0),tags:['Пользовательский'],ingredients:ingredients};
    RECIPES.push(recipe);localStorage.setItem('fs-recipes',JSON.stringify(RECIPES));window.closeAddRecipeSheet();window.openRecipesPanel();toast('Рецепт сохранён: '+name);
  };
})();

/* FITSIM — редактирование рецептов и возврат из формы изменения */
(function(){
  var deletedKey='fs-deleted-recipe-ids', overridesKey='fs-recipe-overrides', editMode=false;
  function read(key,fallback){try{return JSON.parse(localStorage.getItem(key)||'')||fallback;}catch(e){return fallback;}}
  function write(key,value){localStorage.setItem(key,JSON.stringify(value));}
  var removed=read(deletedKey,[]), changed=read(overridesKey,{});
  for(var x=RECIPES.length-1;x>=0;x--){if(removed.indexOf(RECIPES[x].id)!==-1)RECIPES.splice(x,1);else if(changed[RECIPES[x].id])Object.assign(RECIPES[x],changed[RECIPES[x].id]);}
  var pen='<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>';
  var bin='<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v5M14 11v5"/></svg>';
  function action(fn,id,icon,color,label){return '<button type="button" aria-label="'+label+'" title="'+label+'" onclick="event.stopPropagation();'+fn+'(\''+id+'\')" style="width:36px;height:36px;display:inline-flex;align-items:center;justify-content:center;padding:0;border:1px solid var(--border);border-radius:10px;background:var(--input-bg);color:'+color+';cursor:pointer;">'+icon+'</button>';}
  function draw(sh){var list=RECIPES.map(function(r){var controls=editMode?'<span style="display:flex;gap:6px;flex-shrink:0;">'+action('openRecipeEditor',r.id,pen,'var(--accent)','Изменить рецепт')+action('deleteRecipe',r.id,bin,'#ef4444','Удалить рецепт')+'</span>':'';var click=editMode?'openRecipeEditor(\''+r.id+'\')':'closeRecipesPanel();setTimeout(function(){openRecipeSheet(\''+r.id+'\')},180)';return '<div class="recipe-chip" role="button" tabindex="0" onclick="event.stopPropagation();'+click+'"><span class="recipe-chip-emoji">'+r.emoji+'</span><span class="recipe-chip-name">'+r.name+'</span><span class="recipe-chip-kcal">'+r.kcal+' ккал</span>'+controls+'</div>';}).join('');sh.innerHTML='<div class="sheet-handle"></div><div style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:0 16px;margin:0 0 14px;"><div class="sheet-title" style="margin:0;">🔍 Рецепты</div><button type="button" aria-label="Редактировать рецепты" title="Редактировать рецепты" onclick="toggleRecipesEditing()" style="width:42px;height:42px;display:inline-flex;align-items:center;justify-content:center;padding:0;border:1px solid '+(editMode?'var(--accent)':'var(--border)')+';border-radius:10px;background:'+(editMode?'rgba(34,197,94,.14)':'var(--input-bg)')+';color:'+(editMode?'var(--accent)':'var(--text-light)')+';cursor:pointer;">'+pen+'</button></div><div class="recipes-panel-scroll" style="padding:0 16px 20px;overflow-y:auto;max-height:65vh;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;"><div class="recipe-chips" style="margin-bottom:12px;">'+list+'</div>'+(editMode?'<div style="font-size:12px;color:var(--text-light);text-align:center;margin:4px 0 12px;">Нажмите на рецепт, чтобы изменить его.</div>':'')+'<button onclick="closeRecipesPanel();setTimeout(openAddRecipeSheet,180)" style="margin-top:4px;width:100%;padding:11px;background:var(--accent);color:#fff;border:0;border-radius:12px;font-size:.85rem;font-weight:700;cursor:pointer;">+ Добавить рецепт</button></div>';}
  window.renderInlineRecipes=function(host){if(host)draw(host);};
  function bindRecipesSwipe(sh){
    var sy=0,dy=0,lastY=0,lastT=0,vel=0,drag=false,decided=false,list=null,startTop=0;
    sh.addEventListener('touchstart',function(e){
      if(e.touches.length!==1)return;
      list=sh.querySelector('.recipes-panel-scroll');
      sy=lastY=e.touches[0].clientY;lastT=Date.now();dy=0;vel=0;drag=false;decided=false;
      startTop=list?list.scrollTop:0;
    },{passive:true});
    sh.addEventListener('touchmove',function(e){
      var y=e.touches[0].clientY,d=y-sy;
      if(!decided){
        if(Math.abs(d)<6)return;
        decided=true;
        var onList=list&&list.contains(e.target);
        drag=d>0&&(!onList||(list.scrollTop<=0&&startTop<=0));
        if(drag)sh.style.transition='none';
      }
      if(!drag)return;
      if(e.cancelable)e.preventDefault();
      dy=Math.max(0,d);
      sh.style.transform='translateY('+dy+'px)';
      var now=Date.now();vel=(y-lastY)/Math.max(1,now-lastT);lastY=y;lastT=now;
    },{passive:false});
    function end(){
      if(!drag)return;
      drag=false;
      if(dy>90||vel>0.6){closeRecipesPanel();}
      else{sh.style.transition='transform .25s cubic-bezier(.32,.72,0,1)';sh.style.transform='translateY(0)';}
    }
    sh.addEventListener('touchend',end,{passive:true});
    sh.addEventListener('touchcancel',end,{passive:true});
  }
  window.openRecipesPanel=openRecipesPanel=function(){
    if(typeof currentPage!=='undefined'&&currentPage==='foodpick'){
      const input=document.getElementById('food-search');
      if(input){input.value='';input.blur();}
      resetFoodVoicePortion();resetFoodLibraryControls();foodPickerTab='recipes';renderFoodPicker();return;
    }
    var ov=document.getElementById('recipes-panel-overlay'),sh=document.getElementById('recipes-panel-sheet');if(ov&&sh){draw(sh);return;}ov=document.createElement('div');ov.id='recipes-panel-overlay';ov.className='sheet-overlay';ov.onclick=function(){closeRecipesPanel();};document.body.appendChild(ov);sh=document.createElement('div');sh.id='recipes-panel-sheet';sh.className='bottom-sheet';sh.style.maxHeight='85vh';draw(sh);document.body.appendChild(sh);bindRecipesSwipe(sh);document.body.style.overflow='hidden';var sa=document.querySelector('.scroll-area');if(sa)sa.style.overflow='hidden';setTimeout(function(){ov.classList.add('show');sh.classList.add('show');},10);};
  window.toggleRecipesEditing=function(){editMode=!editMode;var sh=document.getElementById('recipes-panel-inline')||document.getElementById('recipes-panel-sheet');if(sh)draw(sh);};
  window.exitRecipeEditor=function(){if(typeof closeAddRecipeSheet==='function')closeAddRecipeSheet();editMode=true;setTimeout(function(){openRecipesPanel();},180);};
  window.openRecipeEditor=function(id){var r=RECIPES.find(function(v){return v.id===id;});if(!r)return;closeRecipesPanel();setTimeout(function(){openAddRecipeSheet();setTimeout(function(){var title=document.querySelector('#add-recipe-sheet .sheet-title');if(title)title.innerHTML='<button type="button" onclick="exitRecipeEditor()" style="border:0;background:none;padding:0;color:var(--text);font:800 1rem inherit;cursor:pointer;">‹ Изменить рецепт</button>';function fill(s,v){var e=document.querySelector(s);if(e)e.value=v==null?'':v;}fill('#new-recipe-name',r.name);fill('#new-recipe-emoji',r.emoji||'🍽️');fill('#new-recipe-kcal',r.kcal);fill('#new-recipe-time',String(r.time||'').replace(/\D/g,''));fill('#new-recipe-protein',r.protein);fill('#new-recipe-fat',r.fat);fill('#new-recipe-carbs',r.carbs);var box=document.getElementById('new-recipe-ingredients');if(box){box.innerHTML='';(r.ingredients||[]).forEach(function(ing){addRecipeIngredientRow();var row=box.lastElementChild;row.querySelector('.new-recipe-ingredient-name').value=ing.name||'';row.querySelector('.new-recipe-ingredient-grams').value=ing.grams||'';});if(!box.children.length)addRecipeIngredientRow();}var btn=document.querySelector('#add-recipe-sheet button[onclick*="saveNewRecipe"]');if(btn){btn.textContent='Сохранить изменения';btn.onclick=function(){saveRecipeChanges(id);};}},30);},280);};
  window.saveRecipeChanges=function(id){var r=RECIPES.find(function(v){return v.id===id;});if(!r)return;var name=document.getElementById('new-recipe-name')?.value.trim();if(!name){toast('Введите название рецепта');return;}var ingredients=[],rows=document.querySelectorAll('#new-recipe-ingredients > div');for(var i=0;i<rows.length;i++){var n=rows[i].querySelector('.new-recipe-ingredient-name').value.trim(),raw=rows[i].querySelector('.new-recipe-ingredient-grams').value,g=parseFloat(raw);if(!n&&!raw)continue;if(!n){toast('Введите название ингредиента');return;}if(!Number.isFinite(g)||g<=0){toast('Укажите граммовку для: '+n);return;}ingredients.push({name:n,grams:Math.round(g*10)/10});}var mins=parseFloat(document.getElementById('new-recipe-time')?.value)||0;Object.assign(r,{name:name,emoji:document.getElementById('new-recipe-emoji')?.value.trim()||'🍽️',time:mins>0?Math.round(mins)+' мин':'0 мин',kcal:Math.round(parseFloat(document.getElementById('new-recipe-kcal')?.value)||0),protein:Math.round(parseFloat(document.getElementById('new-recipe-protein')?.value)||0),fat:Math.round(parseFloat(document.getElementById('new-recipe-fat')?.value)||0),carbs:Math.round(parseFloat(document.getElementById('new-recipe-carbs')?.value)||0),ingredients:ingredients});var all=read(overridesKey,{});all[id]=r;write(overridesKey,all);localStorage.setItem('fs-recipes',JSON.stringify(RECIPES));if(typeof closeAddRecipeSheet==='function')closeAddRecipeSheet();toast('Рецепт обновлён');editMode=true;setTimeout(openRecipesPanel,180);};
  window.deleteRecipe=function(id){var r=RECIPES.find(function(v){return v.id===id;});if(!r||!confirm('Удалить рецепт «'+r.name+'»?'))return;var del=read(deletedKey,[]);if(del.indexOf(id)===-1)del.push(id);write(deletedKey,del);var old=read(overridesKey,{});delete old[id];write(overridesKey,old);RECIPES.splice(RECIPES.indexOf(r),1);localStorage.setItem('fs-recipes',JSON.stringify(RECIPES));var sh=document.getElementById('recipes-panel-inline')||document.getElementById('recipes-panel-sheet');if(sh)draw(sh);toast('Рецепт удалён');};
})();

/* FITSIM — отдельное поле способа приготовления в форме нового рецепта */
(function(){
  var preparationStoreKey='fs-recipe-preparation';
  function readPreparation(){try{return JSON.parse(localStorage.getItem(preparationStoreKey)||'{}');}catch(e){return {};}}
  function savePreparation(data){localStorage.setItem(preparationStoreKey,JSON.stringify(data));}
  function escapeHtml(value){return String(value||'').replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c];});}
  var originalOpen=window.openAddRecipeSheet;
  if(typeof originalOpen==='function'){
    window.openAddRecipeSheet=function(){originalOpen();setTimeout(function(){
      if(document.getElementById('new-recipe-preparation'))return;
      var list=document.getElementById('new-recipe-ingredients');if(!list)return;
      var block=document.createElement('div');block.className='sheet-field';block.style.cssText='margin:0 0 18px;';
      block.innerHTML='<label>Как приготовить</label><textarea id="new-recipe-preparation" placeholder="Напишите или вставьте способ приготовления..." style="box-sizing:border-box;width:100%;min-height:112px;padding:12px 14px;border-radius:12px;border:1px solid var(--border);background:var(--input-bg);color:var(--text);font:inherit;font-size:15px;line-height:1.45;outline:none;resize:vertical;"></textarea>';
      list.parentNode.insertBefore(block,list);
    },40);};
  }
  var originalSave=window.saveNewRecipe;
  if(typeof originalSave==='function')window.saveNewRecipe=function(){var name=document.getElementById('new-recipe-name')?.value.trim();if(!name){originalSave();return;}var before=RECIPES.length;originalSave();if(RECIPES.length>before){var recipe=RECIPES[RECIPES.length-1],data=readPreparation();data[recipe.id]=document.getElementById('new-recipe-preparation')?.value||'';recipe.preparation=data[recipe.id];savePreparation(data);localStorage.setItem('fs-recipes',JSON.stringify(RECIPES));}};
  var originalDetail=window.openRecipeSheet;
  if(typeof originalDetail==='function')window.openRecipeSheet=function(id){originalDetail(id);setTimeout(function(){var data=readPreparation(),text=data[id]||(RECIPES.find(function(r){return r.id===id;})||{}).preparation||'';if(!text)return;var sheet=document.getElementById('recipe-sheet');if(!sheet||sheet.querySelector('.recipe-preparation-block'))return;var block=document.createElement('div');block.className='recipe-preparation-block';block.style.cssText='margin:16px 0 0;padding:12px 0;border-top:1px solid var(--border);';block.innerHTML='<div style="font-weight:700;margin-bottom:8px;">Как приготовить:</div><div style="color:var(--text-light);font-size:14px;line-height:1.55;white-space:pre-wrap;">'+escapeHtml(text)+'</div>';var target=sheet.querySelector('[style*="margin-top:16px"]');if(target)target.parentNode.insertBefore(block,target);},50);};
})();

/* FITSIM — отмечать выбранную дату без рамки */
(function(){
  var originalShowCalDay=window.showCalDay;
  window.showCalDay=function(date){
    window.calSelectedDate=date;
    if(typeof originalShowCalDay==='function') originalShowCalDay(date);
    var cells=document.querySelectorAll('#calendar-grid .cal-cell');
    cells.forEach(function(cell){cell.classList.toggle('cal-cell-selected',cell.getAttribute('aria-label')===date);});
  };
})();


(function bindWaterDrinkJournal(){
  const originalAddWaterDrink=window.addWaterDrink;
  if(typeof originalAddWaterDrink!=='function') return;
  if(originalAddWaterDrink.__fitSimJournalWrapped) return;
  const wrapped=function(direction){
    const typeEl=document.getElementById('water-drink-type');
    const volEl=document.getElementById('water-add-val');
    const before=JSON.parse(localStorage.getItem('fs-water')||'{"amount":0}').amount||0;
    originalAddWaterDrink(direction);
    const after=JSON.parse(localStorage.getItem('fs-water')||'{"amount":0}').amount||0;
    const delta=Math.abs(after-before);
    if(delta>0&&direction>0){
      const drinks=getWaterDrinkJournal();
      const name=typeEl&&typeEl.options[typeEl.selectedIndex]?typeEl.options[typeEl.selectedIndex].text.trim():'Вода';
      const rawAmount=volEl?Number(volEl.value)||delta:delta;
      drinks.push({id:`${Date.now()}-${Math.random().toString(36).slice(2)}`,date:getWaterDateKey(),name,amount:delta,rawAmount});
      saveWaterDrinkJournal(drinks);
    }
    if(delta>0&&direction<0){
      const drinks=getWaterDrinkJournal();
      const today=getWaterDateKey();
      let left=delta;
      for(let i=drinks.length-1;i>=0&&left>0;i--){
        if(drinks[i].date!==today) continue;
        const used=Math.min(Number(drinks[i].amount)||0,left);
        drinks[i].amount-=used;left-=used;
        if(drinks[i].amount<=0) drinks.splice(i,1);
      }
      saveWaterDrinkJournal(drinks);
    }
  };
  wrapped.__fitSimJournalWrapped=true;
  window.addWaterDrink=wrapped;
})();



(function(){
  function placeIngredientHeader(){
    var list=document.getElementById('new-recipe-ingredients');
    if(!list || document.getElementById('new-recipe-ingredient-header')) return;
    var h=document.createElement('div');
    h.id='new-recipe-ingredient-header';
    h.className='new-recipe-ingredient-header';
    h.innerHTML='<span>Ингредиент</span><span>Вес (г)</span><span></span>';
    list.parentNode.insertBefore(h,list);
  }
  var open=window.openAddRecipeSheet;
  if(typeof open==='function') window.openAddRecipeSheet=function(){open.apply(this,arguments);setTimeout(placeIngredientHeader,60);};
})();


/* FITSIM — month selector for the Month period only */
(function(){
'use strict';
var names=['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
function isMonth(){return(window.mealAnalyticsPeriod||'day')==='month'}
function close(){var o=document.getElementById('meal-month-picker-overlay'),s=document.getElementById('meal-month-picker-sheet');if(o)o.classList.remove('show');if(s)s.classList.remove('show');document.body.style.overflow=''}
function choose(m){var now=new Date(),shift=m-now.getMonth();window._mealPeriodShift=shift;close();if(typeof window.renderMealAnalytics==='function')window.renderMealAnalytics()}
function open(){if(!isMonth())return;var now=new Date(),o=document.getElementById('meal-month-picker-overlay'),s=document.getElementById('meal-month-picker-sheet');if(!o){o=document.createElement('div');o.id='meal-month-picker-overlay';o.onclick=close;document.body.appendChild(o)}if(!s){s=document.createElement('div');s.id='meal-month-picker-sheet';document.body.appendChild(s)}var active=(now.getMonth()+(window._mealPeriodShift||0)+12)%12;s.innerHTML='<div class="mp-handle"></div><div class="mp-list">'+names.map(function(n,i){return'<button type="button" class="mp-row'+(i===active?' is-active':'')+'" data-month="'+i+'"><span class="mp-label">'+(i===active?'<span class="mp-dot"></span>':'')+n+'</span></button>'}).join('')+'</div><button type="button" class="mp-close">Отмена</button>';s.querySelectorAll('.mp-row').forEach(function(b){b.onclick=function(){choose(Number(b.dataset.month))}});s.querySelector('.mp-close').onclick=close;o.classList.add('show');s.classList.add('show');document.body.style.overflow='hidden'}
function bind(){var l=document.getElementById('meal-period-label');if(!l)return;l.classList.toggle('is-clickable',isMonth());if(!l._monthPickerBound){l._monthPickerBound=true;l.onclick=function(){if(isMonth())open()}}}
window.openMealMonthPicker=open;window.closeMealMonthPicker=close;setTimeout(bind,0);window.addEventListener('load',bind)
})();


/* FITSIM — authoritative analytics labels */
(function(){
  function fix(){
    var l=document.getElementById('meal-period-label');if(!l)return;
    var p=window.mealAnalyticsPeriod||'day',now=new Date();
    if(p==='year')l.textContent=String(now.getFullYear());
    else if(p==='week')l.textContent='Неделя';
    l.className='meal-period-label' + ((p==='day'||p==='month'||p==='year') ? ' is-clickable' : '');
  }
  var r=window.renderMealAnalytics;if(typeof r==='function'&&!r.__labelFix){var w=function(){r.apply(this,arguments);fix();};w.__labelFix=true;window.renderMealAnalytics=w;}
  var set=window.setMealAnalyticsPeriod;if(typeof set==='function'&&!set.__labelFix){var ws=function(period,btn){set.call(this,period,btn);fix();};ws.__labelFix=true;window.setMealAnalyticsPeriod=ws;}
  setTimeout(fix,0);window.addEventListener('load',fix);
})();


/* FITSIM — year selector: 2026⌄ with available years */
(function(){
  function isYear(){return(window.mealAnalyticsPeriod||'day')==='year'}
  function close(){var o=document.getElementById('meal-year-picker-overlay'),s=document.getElementById('meal-year-picker-sheet');if(o)o.classList.remove('show');if(s)s.classList.remove('show');document.body.style.overflow=''}
  function open(){if(!isYear())return;var o=document.getElementById('meal-year-picker-overlay'),s=document.getElementById('meal-year-picker-sheet');if(!o){o=document.createElement('div');o.id='meal-year-picker-overlay';o.onclick=close;document.body.appendChild(o)}if(!s){s=document.createElement('div');s.id='meal-year-picker-sheet';document.body.appendChild(s)}var now=new Date(),years=[now.getFullYear()];try{JSON.parse(localStorage.getItem('fs-nutrition')||'[]').forEach(function(e){var p=String(e.date||'').split('.'),y=Number(p[2]);if(y&&y<=now.getFullYear()&&years.indexOf(y)<0)years.push(y)})}catch(e){}years.sort(function(a,b){return b-a});var active=now.getFullYear()+(Number(window._mealPeriodShift)||0);s.innerHTML='<div class="mp-handle"></div><div class="mp-title">Выбери год</div><div class="mp-list">'+years.map(function(y){return'<button type="button" class="mp-row'+(y===active?' is-active':'')+'" data-year="'+y+'"><span class="mp-label">'+(y===active?'<span class="mp-dot"></span>':'')+y+'</span></button>'}).join('')+'</div><button type="button" class="mp-close">Отмена</button>';s.querySelectorAll('.mp-row').forEach(function(b){b.onclick=function(){var y=Number(b.dataset.year);window._mealPeriodShift=y-now.getFullYear();close();if(typeof window.renderMealAnalytics==='function')window.renderMealAnalytics()}});s.querySelector('.mp-close').onclick=close;o.classList.add('show');s.classList.add('show');document.body.style.overflow='hidden'}
  function bind(){var l=document.getElementById('meal-period-label');if(!l)return;l.classList.toggle('is-clickable',isYear());if(!l._yearBound){l._yearBound=true;l.addEventListener('click',function(){if(isYear())open()})}}
  var old=window.renderMealAnalytics;if(typeof old==='function'&&!old.__yearPicker){var w=function(){old.apply(this,arguments);bind()};w.__yearPicker=true;window.renderMealAnalytics=w}
  setTimeout(bind,0);window.addEventListener('load',bind);window.openMealYearPicker=open;window.closeMealYearPicker=close
})();

/* FITSIM — final period label state */
(function(){
  var busy=false;
  function sync(){
    if(busy)return;
    var l=document.getElementById('meal-period-label');if(!l)return;
    busy=true;
    try{
      var p=window.mealAnalyticsPeriod||'day';
      var txt=null;
      if(p==='year')txt=String(new Date().getFullYear());
      else if(p==='week')txt='Неделя';
      if(txt!==null&&l.textContent!==txt)l.textContent=txt;
      var want=(p==='day'||p==='month'||p==='year');
      if(l.classList.contains('is-clickable')!==want)l.classList.toggle('is-clickable',want);
    }finally{busy=false;}
  }
  var r=window.renderMealAnalytics;
  if(typeof r==='function'&&!r.__finalLabel){
    var w=function(){var res=r.apply(this,arguments);sync();return res;};
    w.__finalLabel=true;
    ['__labelFix','yearPicker','monthPicker'].forEach(function(k){if(r[k])w[k]=r[k];});
    window.renderMealAnalytics=w;
  }
  var set=window.setMealAnalyticsPeriod;
  if(typeof set==='function'&&!set.__finalLabel){
    var ws=function(){var res=set.apply(this,arguments);sync();return res;};
    ws.__finalLabel=true;
    window.setMealAnalyticsPeriod=ws;
  }
  setTimeout(sync,0);setTimeout(sync,300);
  window.addEventListener('load',sync);
  function watch(){
    var l=document.getElementById('meal-period-label');
    if(!l||l.__labelWatch||typeof MutationObserver==='undefined')return;
    l.__labelWatch=true;
    new MutationObserver(function(){sync();}).observe(l,{attributes:true,attributeFilter:['class']});
  }
  watch();setTimeout(watch,300);window.addEventListener('load',watch);
})();

// ==================== ЭКРАН ВЫБОРА ПРОДУКТА ====================
(function() {
  const baseGoTo = window.goTo;
  window.goTo = function(id, title) {
    baseGoTo(id, title);
    const back = document.getElementById('header-back-btn');
    if (back) back.hidden = id !== 'foodpick';
    if (id !== 'foodpick') closeOwnFoodForm();
    if (id !== 'foodpick' && typeof closeFoodCart === 'function') closeFoodCart();
    if (id === 'foodpick') {
      syncFoodMealHeading();
      const nav = document.getElementById('nav-nutrition');
      if (nav) nav.classList.add('active');
    }
  };
})();

// ==================== КОРЗИНА ВЫБРАННОГО ПРИЁМА ПИЩИ ====================
function foodCartEscape(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function foodCartEntries() {
  const d = new Date();
  d.setDate(d.getDate() + (window._nutrOffset || 0));
  const day = d.toLocaleDateString('ru-RU');
  const mt = window._currentMealType || 'breakfast';
  return nutrEntries.filter(e => e.date === day && (e.mealType || 'breakfast') === mt);
}

function foodCartPlural(n) {
  const a = n % 100, b = n % 10;
  if (a >= 11 && a <= 14) return 'продуктов';
  if (b === 1) return 'продукт';
  if (b >= 2 && b <= 4) return 'продукта';
  return 'продуктов';
}

function refreshFoodCart() {
  const btn = document.getElementById('food-cart-btn');
  const items = foodCartEntries();
  if (btn) {
    btn.classList.toggle('has-items', items.length > 0);
    btn.setAttribute('aria-label', items.length ? 'Корзина: ' + items.length + ' ' + foodCartPlural(items.length) : 'Корзина: пусто');
    const cnt = document.getElementById('food-cart-count');
    if (cnt) cnt.textContent = items.length ? String(items.length) : '';
  }
  const sheet = document.getElementById('food-cart-sheet');
  if (sheet && sheet.classList.contains('show')) renderFoodCart();
}
window.refreshFoodCart = refreshFoodCart;

function renderFoodCart() {
  const list = document.getElementById('food-cart-list');
  const title = document.getElementById('food-cart-title');
  const sum = document.getElementById('food-cart-sum');
  if (!list) return;
  const items = foodCartEntries();
  if (title) title.textContent = FOOD_MEAL_TITLES[window._currentMealType] || 'Корзина';
  const kcal = items.reduce((s, e) => s + (+e.kcal || 0), 0);
  if (sum) {
    sum.textContent = items.length ? items.length + ' ' + foodCartPlural(items.length) + ' · ' + Math.round(kcal) + ' ккал' : '';
    sum.hidden = !items.length;
  }
  if (!items.length) {
    list.innerHTML = '<div class="food-cart-empty">Добавленные продукты появятся здесь.</div>';
    layoutFoodCart();
    return;
  }
  list.innerHTML = items.map(function(e) {
    const meta = foodEntryStatsHTML(e);
    return '<div class="food-cart-row" data-id="' + foodCartEscape(e.id) + '">' +
      '<button class="food-cart-main" type="button"><b>' + foodCartEscape(e.name) + '</b>' + foodCategoryHTML(e.name, e.category) + '<small>' + meta + '</small></button>' +
      '<button class="meal-item-del food-cart-del" type="button" aria-label="Удалить">✕</button>' +
      '</div>';
  }).join('');
  layoutFoodCart();
}

function layoutFoodCart() {
  const sh = document.getElementById('food-cart-sheet');
  if (!sh) return;
  const vv = window.visualViewport;
  const vh = vv ? vv.height : window.innerHeight;
  const top = Math.max(12, Math.round((vh - sh.offsetHeight) / 2 - vh * 0.05));
  sh.style.top = top + 'px';
}

function openFoodCart() {
  let ov = document.getElementById('food-cart-overlay');
  let sh = document.getElementById('food-cart-sheet');
  if (!sh) {
    ov = document.createElement('div');
    ov.id = 'food-cart-overlay';
    ov.className = 'sheet-overlay';
    ov.onclick = closeFoodCart;
    document.body.appendChild(ov);
    sh = document.createElement('div');
    sh.id = 'food-cart-sheet';
    sh.className = 'bottom-sheet';
    sh.innerHTML = '<div class="sheet-handle"></div>' +
      '<div class="food-cart-head"><div class="food-cart-title" id="food-cart-title"></div><div class="food-cart-sum" id="food-cart-sum"></div></div>' +
      '<div id="food-cart-list"></div>';
    document.body.appendChild(sh);
    sh.querySelector('#food-cart-list').addEventListener('click', function(ev) {
      const row = ev.target.closest('.food-cart-row');
      if (!row) return;
      const id = row.getAttribute('data-id');
      if (ev.target.closest('.food-cart-del')) deleteFoodCartEntry(id);
      else if (ev.target.closest('.food-cart-main')) editFoodCartEntry(id);
    });
    if (typeof window.attachSwipeDown === 'function') {
      window.attachSwipeDown(sh, {
        scrollSelector: '#food-cart-list',
        closeFn: function() {
          sh.style.transition = 'none';
          sh.style.opacity = '0';
          closeFoodCart();
        }
      });
    }
  }
  renderFoodCart();
  sh.style.opacity = '';
  requestAnimationFrame(function() {
    ov.classList.add('show');
    sh.classList.add('show');
  });
}
window.openFoodCart = openFoodCart;

function closeFoodCart() {
  const ov = document.getElementById('food-cart-overlay');
  const sh = document.getElementById('food-cart-sheet');
  if (ov) ov.classList.remove('show');
  if (sh) sh.classList.remove('show');
}
window.closeFoodCart = closeFoodCart;

function editFoodCartEntry(id) {
  closeFoodCart();
  window._cartEditReturn = true;
  setTimeout(function() { editNutrEntry(id); }, 120);
}

function deleteFoodCartEntry(id) {
  if (!nutrEntries.some(e => e.id === id)) return;
  nutrEntries = nutrEntries.filter(e => e.id !== id);
  localStorage.setItem('fs-nutrition', JSON.stringify(nutrEntries));
  renderNutrEntries();
  toast('🗑 Запись удалена');
}

(function() {
  const baseRender = window.renderNutrEntries;
  if (typeof baseRender === 'function') {
    window.renderNutrEntries = function() {
      const result = baseRender.apply(this, arguments);
      refreshFoodCart();
      return result;
    };
  }
  const baseClose = window.closeGramsSheet;
  if (typeof baseClose === 'function') {
    window.closeGramsSheet = function() {
      const result = baseClose.apply(this, arguments);
      if (window._cartEditReturn) {
        window._cartEditReturn = false;
        if (currentPage === 'foodpick') setTimeout(openFoodCart, 260);
      }
      return result;
    };
  }
})();

/* Unified private food library. Nutrition values are per 100 g/ml. */
let myFoodView={mode:'list',kind:'product',id:null};
let myFoodEditingPick=false;
function myFoodRead(){
  const a=foodPickerRead('fs-my-food',[]),deleted=new Set(foodPickerNames('fs-my-food-deleted'));
  return (Array.isArray(a)?a:[]).filter(x=>x&&typeof x.n==='string'&&!deleted.has('id:'+String(x.id))&&!(x.legacy&&deleted.has('legacy:'+x.legacy))).map((x,i)=>({...x,id:x.id==null?'mf-recovered-'+i:String(x.id)}));
}
let myFoodKindFilter=foodPickerRead('fs-my-food-filter','product')==='recipe'?'recipe':'product';
function myFoodVisibleRows(){return myFoodRead().filter(x=>(x.kind==='recipe'?'recipe':'product')===myFoodKindFilter);}
function myFoodFilter(kind){
  if(!['product','recipe'].includes(kind))return;
  myFoodKindFilter=kind;foodPickerStore('fs-my-food-filter',kind);resetFoodLibraryControls();myFoodEditingPick=false;renderFoodPicker();
}
window.myFoodFilter=myFoodFilter;
function myFoodRequestDeleteSelected(){
  const ids=Array.from(foodLibrarySelected,String),visible=new Set(myFoodVisibleRows().map(x=>String(x.id)));
  const selected=ids.filter(id=>visible.has(id));
  if(!selected.length){toast('Сначала отметьте записи для удаления');return;}
  confirmDanger({title:'Удалить выбранные записи?',message:'',confirmText:'Удалить',onConfirm:function(){myFoodDeleteMany(selected);}});
}
window.myFoodRequestDeleteSelected=myFoodRequestDeleteSelected;
function myFoodDeleteMany(ids){
  const remove=new Set(ids.map(String)),rows=myFoodRead(),deleted=rows.filter(x=>remove.has(String(x.id)));
  if(!deleted.length){toast('Записи не выбраны');return false;}
  const ledger=foodPickerNames('fs-my-food-deleted'),nextLedger=new Set(ledger);
  deleted.forEach(x=>{nextLedger.add('id:'+String(x.id));if(x.legacy)nextLedger.add('legacy:'+x.legacy);});
  if(!foodPickerStore('fs-my-food-deleted',Array.from(nextLedger)))return false;
  if(!foodPickerStore('fs-my-food',rows.filter(x=>!remove.has(String(x.id))))){foodPickerStore('fs-my-food-deleted',ledger);return false;}
  if(myFoodRead().some(x=>remove.has(String(x.id)))){toast('Не удалось удалить записи');return false;}
  myFoodEditingPick=false;myFoodView={mode:'list',kind:'product',id:null};foodPickerTab='mine';resetFoodLibraryControls();renderFoodPicker();return true;
}
function myFoodNames(){return new Set(myFoodRead().map(x=>x.n).concat(foodPickerNames('fs-my-food-names')));}
function isMyFoodName(name){return myFoodNames().has(name);}
function myFoodMigrate(){
  const raw=foodPickerRead('fs-my-food',[]);
  if(Array.isArray(raw)&&raw.some(x=>x&&(x.id==null||typeof x.id!=='string'))) {if(!foodPickerStore('fs-my-food',myFoodRead()))return;}
  if(foodPickerRead('fs-my-food-migrated',false))return;
  const old=foodPickerRead('fs-own-foods',[]), prep=foodPickerRead('fs-recipe-preparation',{});
  const rows=myFoodRead(), used=new Set(rows.map(x=>x.legacy)), deleted=new Set(foodPickerNames('fs-my-food-deleted'));
  (Array.isArray(old)?old:[]).forEach((f,i)=>{const key='food:'+i;if(!used.has(key)&&!deleted.has('legacy:'+key)&&f&&typeof f.n==='string')rows.push({...f,id:'mf-old-'+i,kind:'product',legacy:key});});
  (typeof RECIPES!=='undefined'?RECIPES:[]).forEach((r,i)=>{const key='recipe:'+r.id;if(!used.has(key)&&!deleted.has('legacy:'+key))rows.push({id:'mr-old-'+i,legacy:key,kind:'recipe',n:r.name,kcal:+r.kcal||0,p:+r.protein||0,f:+r.fat||0,c:+r.carbs||0,unit:'100 г',category:'Рецепт',ingredients:r.ingredients||[],preparation:prep[r.id]||r.preparation||''});});
  if(!foodPickerStore('fs-my-food',rows))return;
  if(!foodPickerStore('fs-my-food-names',Array.from(new Set(rows.map(x=>x.n)))))return;
  foodPickerStore('fs-my-food-migrated',true);
}
function myFoodOpen(mode='list',kind='product',id=null){
  const input=document.getElementById('food-search');if(input){input.value='';input.blur();}
  resetFoodVoicePortion();resetFoodLibraryControls();myFoodEditingPick=false;foodPickerTab=mode==='list'?'mine':'add';myFoodView={mode,kind,id};renderFoodPicker();
}
function myFoodCancelForm(){
  if(myFoodView.id!=null){
    myFoodKindFilter=myFoodView.kind==='recipe'?'recipe':'product';
    foodPickerStore('fs-my-food-filter',myFoodKindFilter);
    myFoodOpen('list',myFoodKindFilter);
  }else myFoodOpen('choose');
}
window.myFoodCancelForm=myFoodCancelForm;
function myFoodRender(host){
  if(!host)return;
  const esc=foodCartEscape, rows=myFoodView.mode==='list'?myFoodVisibleRows():myFoodRead();
  if(myFoodView.mode==='choose'){
    host.innerHTML='<div class="my-food-choices"><button type="button" onclick="myFoodOpen(\'form\',\'product\')">Продукт</button><button type="button" onclick="myFoodOpen(\'form\',\'recipe\')">Рецепт</button></div>';return;
  }
  if(myFoodView.mode==='form'){
    const item=rows.find(x=>x.id===myFoodView.id)||{}, recipe=myFoodView.kind==='recipe';
    const fields=[['kcal','Калории, ккал'],['p','Белки, г'],['f','Жиры, г'],['c','Углеводы, г']].map(([k,label])=>'<label class="food-own-field" title="'+label+'">'+({kcal:'Ккал',p:'Белки',f:'Жиры',c:'Углеводы'}[k])+'<input id="my-food-'+k+'" type="text" inputmode="decimal" value="'+esc(item[k]??'')+'" placeholder="0"></label>').join('');
    host.innerHTML='<div class="my-food-head"><h2>'+(item.id?'Изменить':'Новый')+' '+(recipe?'рецепт':'продукт')+'</h2><button type="button" onclick="myFoodCancelForm()">Отмена</button></div><form id="my-food-form" class="my-food-compact-form" novalidate><div class="my-food-name-line"><label class="food-own-field">Название<input id="my-food-name" type="text" maxlength="160" autocomplete="off" value="'+esc(item.n||'')+'"></label><label class="food-own-field my-food-basis"><span>На</span><select id="my-food-unit" aria-label="КБЖУ на 100 г или 100 мл"><option value="г">100 г</option><option value="мл" '+(/мл/.test(item.unit||'')?'selected':'')+'>100 мл</option></select></label></div><div class="food-own-grid">'+fields+'</div>'+(recipe?'<div id="my-food-ingredients"></div><label class="food-own-field">Способ приготовления<textarea id="my-food-preparation" rows="3">'+esc(item.preparation||'')+'</textarea></label>':'')+'<div id="my-food-error" class="food-own-error" role="alert"></div><button class="food-own-save" type="submit">Сохранить</button></form>';
    host.querySelector('form').onsubmit=e=>{e.preventDefault();myFoodSave();};
    if(recipe){const ingredients=item.ingredients?.length?item.ingredients:[{}];ingredients.forEach(x=>myFoodIngredient(x));}return;
  }
  const mode=getFoodPickerSort();
  if(mode==='az'||mode==='za')rows.sort((a,b)=>(mode==='az'?1:-1)*a.n.localeCompare(b.n,'ru',{numeric:true,sensitivity:'base'}));
  const selecting=foodLibrarySelecting, editing=myFoodEditingPick;
  const tools=selecting?'<div class="food-library-selection-tools"><button type="button" onclick="cancelFoodLibrarySelection()">Отмена</button><button type="button" class="danger" onclick="myFoodRequestDeleteSelected()" '+(foodLibrarySelected.size?'':'disabled')+'>Удалить</button></div>':editing?'<div class="food-library-selection-tools"><button type="button" onclick="myFoodEndEditing()">Отмена</button></div>':'';
  const filterLabels={product:'Продукты',recipe:'Рецепты'};
  const filters='<div class="my-food-filters" role="group" aria-label="Тип моей еды">'+Object.entries(filterLabels).map(([k,label])=>'<button type="button" class="'+(myFoodKindFilter===k?'active':'')+'" aria-pressed="'+(myFoodKindFilter===k)+'" data-kind="'+k+'" onclick="myFoodFilter(this.dataset.kind)">'+label+'</button>').join('')+'</div>';
  host.innerHTML=((selecting||editing)?'<div class="my-food-selection-header">'+filters+tools+'</div>':filters+tools)+(rows.length?rows.map(x=>{
    const checked=foodLibrarySelected.has(x.id);
    return '<div class="my-food-row '+(selecting?'food-library-row food-library-select-row ':'')+(checked&&selecting?'selected':'')+'"><button type="button" class="my-food-main" data-id="'+esc(x.id)+'" onclick="'+(selecting?'toggleFoodLibrarySelection':editing?'myFoodEdit':'myFoodPortion')+'(this.dataset.id)" '+(selecting?'aria-label="'+(checked?'Снять выделение: ':'Выбрать: ')+esc(x.n)+'"':'')+'><span>'+esc(x.n)+'</span><small>'+(x.kind==='recipe'?'Рецепт':'Продукт')+' · '+foodStatsHTML(x.kcal,x.p,x.f,x.c,x.unit||'100 г')+'</small></button>'+(selecting?'<button type="button" class="food-library-add" role="checkbox" aria-checked="'+checked+'" data-id="'+esc(x.id)+'" onclick="toggleFoodLibrarySelection(this.dataset.id)" aria-label="Выбрать: '+esc(x.n)+'"><span class="food-library-checkbox" aria-hidden="true">'+(checked?'✓':'')+'</span></button>':'')+'</div>';
  }).join(''):'<div class="food-library-empty">В этом списке пока нет записей.<br>Создайте их во вкладке «Добавить».</div>');
}
function myFoodIngredient(item={},afterRow=null){
  const host=document.getElementById('my-food-ingredients');if(!host)return;
  const row=document.createElement('div');row.className='my-food-ingredient';
  const unit=item.unit==='мл'?'мл':'г';
  row.innerHTML='<button type="button" class="my-food-ing-add" aria-label="Добавить ингредиент ниже" onclick="myFoodIngredient({},this.parentElement)">+</button><input class="my-food-ing-name" aria-label="Ингредиент" placeholder="Ингредиент" value="'+foodCartEscape(item.name||'')+'"><div class="my-food-amount-unit"><input class="my-food-ing-grams" aria-label="Количество ингредиента" placeholder="0" inputmode="decimal" value="'+foodCartEscape(item.amount??item.grams??'')+'"><select class="my-food-ing-unit" aria-label="Единицы ингредиента"><option value="г">г</option><option value="мл" '+(unit==='мл'?'selected':'')+'>мл</option></select></div><button type="button" class="my-food-ing-remove" aria-label="Убрать ингредиент" onclick="myFoodRemoveIngredient(this.parentElement)">×</button>';
  if(afterRow&&afterRow.parentElement===host)host.insertBefore(row,afterRow.nextSibling);else host.appendChild(row);
}
function myFoodRemoveIngredient(row){
  const host=document.getElementById('my-food-ingredients');if(!host||row.parentElement!==host)return;
  row.remove();if(!host.children.length)myFoodIngredient();
}
window.myFoodRemoveIngredient=myFoodRemoveIngredient;
function myFoodSave(){
  const error=document.getElementById('my-food-error'), get=id=>document.getElementById('my-food-'+id), rows=myFoodRead();
  const n=get('name').value.trim().replace(/\s+/g,' ');
  if(!n){error.textContent='Введите название.';return;}
  if(rows.some(x=>x.id!==myFoodView.id&&foodSearchNorm(x.n)===foodSearchNorm(n))){error.textContent='Такое название уже есть в «Моей еде».';return;}
  const values={};for(const k of ['kcal','p','f','c']){const raw=get(k).value.trim().replace(',','.');const v=Number(raw);if(!raw||!Number.isFinite(v)||v<0||v>(k==='kcal'?1000:100)){error.textContent='Заполните КБЖУ: ккал от 0 до 1000, БЖУ от 0 до 100.';return;}values[k]=v;}
  if(values.p+values.f+values.c>100.5){error.textContent='Сумма БЖУ не должна превышать 100 г.';return;}
  const ingredients=[];if(myFoodView.kind==='recipe'){
    for(const row of document.querySelectorAll('#my-food-ingredients .my-food-ingredient')){const name=row.querySelector('.my-food-ing-name').value.trim(), raw=row.querySelector('.my-food-ing-grams').value.trim().replace(',','.');if(!name&&!raw)continue;const grams=Number(raw);if(!name||!Number.isFinite(grams)||grams<=0){error.textContent='Укажите название и положительное количество каждого ингредиента.';return;}ingredients.push({name,grams,amount:grams,unit:row.querySelector('.my-food-ing-unit').value});}
    if(!ingredients.length){error.textContent='Добавьте хотя бы один ингредиент.';return;}
  }
  const old=rows.find(x=>x.id===myFoodView.id);
  const item={...old,id:old?.id||'my-'+Date.now()+'-'+Math.random().toString(36).slice(2),kind:myFoodView.kind,n,...values,unit:'100 '+get('unit').value,category:myFoodView.kind==='recipe'?'Рецепт':'Свой продукт',ingredients,preparation:get('preparation')?.value.trim()||''};
  const next=old?rows.map(x=>x.id===old.id?item:x):rows.concat(item);
  if(!foodPickerStore('fs-my-food',next))return;
  foodPickerStore('fs-my-food-names',Array.from(new Set(foodPickerNames('fs-my-food-names').concat(n,old?.n||[]))));
  myFoodKindFilter=item.kind==='recipe'?'recipe':'product';
  foodPickerStore('fs-my-food-filter',myFoodKindFilter);
  myFoodOpen();toast('Сохранено в «Моей еде»');
}
function myFoodEdit(id){const item=myFoodRead().find(x=>x.id===id);if(item)myFoodOpen('form',item.kind,id);}
function myFoodDelete(id){
  const item=myFoodRead().find(x=>x.id===String(id));if(!item)return;
  confirmDanger({title:'Удалить «'+foodCartEscape(item.n)+'»?',message:'Записи в дневнике питания останутся.',confirmText:'Удалить',onConfirm:function(){myFoodDeleteMany([item.id]);}});
}
function myFoodPortion(id){const item=myFoodRead().find(x=>x.id===id);if(!item)return;openGramsSheet({name:item.n,kcal100:item.kcal,p100:item.p,c100:item.c,f100:item.f,unit:/мл/.test(item.unit)?'мл':'г',category:item.category,myFoodId:item.id},null);}
myFoodMigrate();
Object.assign(window,{myFoodOpen,myFoodIngredient,myFoodSave,myFoodEdit,myFoodDelete,myFoodPortion});
(function(){
  const originalOwn=window.openOwnFoodForm, originalRecipes=window.openRecipesPanel;
  window.openOwnFoodForm=openOwnFoodForm=function(){myFoodOpen('choose');};
  window.openRecipesPanel=openRecipesPanel=function(){if(currentPage==='foodpick')myFoodOpen();else originalRecipes();};
})();

function myFoodBeginEditing(){
  resetFoodLibraryControls();myFoodEditingPick=true;myFoodView={mode:'list',kind:'product',id:null};renderFoodPicker();
}
function myFoodEndEditing(){myFoodEditingPick=false;renderFoodPicker();}
Object.assign(window,{myFoodBeginEditing,myFoodEndEditing});

/* Private-form dictation uses the existing food microphone session. */
(function(){
  var target=null;
  document.addEventListener('focusin',function(e){if(e.target.closest&&e.target.closest('#my-food-form'))target=e.target;});
  function normalize(text){
    var map={ноль:0,один:1,одна:1,одно:1,два:2,две:2,три:3,четыре:4,пять:5,шесть:6,семь:7,восемь:8,девять:9,десять:10,одиннадцать:11,двенадцать:12,тринадцать:13,четырнадцать:14,пятнадцать:15,шестнадцать:16,семнадцать:17,восемнадцать:18,девятнадцать:19,двадцать:20,тридцать:30,сорок:40,пятьдесят:50,шестьдесят:60,семьдесят:70,восемьдесят:80,девяносто:90,сто:100,двести:200,триста:300,четыреста:400,пятьсот:500,шестьсот:600,семьсот:700,восемьсот:800,девятьсот:900};
    var word='(?:'+Object.keys(map).sort(function(a,b){return b.length-a.length;}).join('|')+')';
    var rx=new RegExp('(^|[^а-яё])('+word+'(?:[ -]+'+word+')*)(?![а-яё])','gi');
    return String(text).toLowerCase().replace(/ё/g,'е').replace(rx,function(_,p,v){return p+v.split(/[ -]+/).reduce(function(sum,w){return sum+map[w];},0);}).replace(/(\d+)\s+(?:запятая|точка|целых)\s+(\d+)/g,'$1.$2').replace(/(\d),(\d)/g,'$1.$2');
  }
  function number(text){var s=normalize(text);if(/минус|-\s*\d/.test(s))return null;var m=s.match(/\d+(?:\.\d+)?/);return m?Number(m[0]):null;}
  function put(id,value,append){var el=document.getElementById('my-food-'+id);if(!el)return false;el.value=append&&el.value?el.value.trim()+'\n'+value:String(value);return true;}
  function ingredientRows(){return Array.from(document.querySelectorAll('#my-food-ingredients .my-food-ingredient'));}
  function ingredients(text){
    if(!document.getElementById('my-food-ingredients')){toast('Сначала откройте форму «Рецепт».');return false;}
    var value=normalize(text);
    var pieces=value.split(/[,;\n]+|\s+и\s+/i).map(function(x){return x.trim();}).filter(Boolean);
    var parsed=[];
    var weight=/([^\d]+?)\s+(\d+(?:\.\d+)?)\s*(миллилитр(?:а|ов|ы)?|мл|килограмм(?:а|ов)?|кг|грамм(?:а|ов|ы)?|гр\.?|г|литр(?:а|ов|ы)?|л)?(?=$|[\s,.])/gi;
    var simple=['лук','морковь','картофель','капуста','свекла','огурец','помидор','чеснок','рис','соль','перец','масло','вода','яйцо','молоко','мука','сахар'];
    pieces.forEach(function(piece){
      var match,found=false;weight.lastIndex=0;var end=0;
      while((match=weight.exec(piece))){
        var amount=Number(match[2]), rawUnit=match[3]||'',unit=/^(мл|миллилитр|л|литр)/i.test(rawUnit)?'мл':'г';
        if(/^(кг|килограмм|л$|литр)/i.test(rawUnit))amount*=1000;
        parsed.push({name:match[1].trim(),amount:amount,unit:unit,explicitUnit:!!rawUnit});found=true;end=weight.lastIndex;
      }
      if(found){var rest=piece.slice(end).trim();if(rest)parsed.push({name:rest,amount:'',unit:'г'});return;}
      var words=piece.split(/\s+/);(words.length>1&&words.every(function(w){return simple.includes(w);})?words:[piece]).forEach(function(name){parsed.push({name:name,amount:'',unit:'г'});});
    });
    parsed.forEach(function(item){
      if(!item.name)return;var rows=ingredientRows();
      var row=rows.find(function(r){return foodSearchNorm(r.querySelector('.my-food-ing-name').value)===foodSearchNorm(item.name);});
      if(row){if(item.amount!==''){row.querySelector('.my-food-ing-grams').value=item.amount;if(item.explicitUnit)row.querySelector('.my-food-ing-unit').value=item.unit;}return;}
      row=rows.find(function(r){return !r.querySelector('.my-food-ing-name').value.trim()&&!r.querySelector('.my-food-ing-grams').value.trim();});
      if(row){row.querySelector('.my-food-ing-name').value=item.name;row.querySelector('.my-food-ing-grams').value=item.amount;row.querySelector('.my-food-ing-unit').value=item.unit;}
      else myFoodIngredient(item);
    });return parsed.length>0;
  }

  function canonicalNutrition(text){
    // Leave ingredient quantities and cooking instructions untouched.
    var stop=String(text).search(/(?:^|[\s,;])(?:ингредиент(?:ы)?|ингридиент(?:ы)?|способ приготовления|как готовить|как приготовить|приготовление)(?=$|[\s:,.])/i);
    var head=stop<0?String(text):String(text).slice(0,stop), tail=stop<0?'':String(text).slice(stop);
    var labels='(?:бел(?:ок|ка|ки|ков|ку|ком|ке|кам|ками|ках)|жир(?:ы|а|ов|у|ом|е|ам|ами|ах)?|углевод(?:ы|а|ов|у|ом|е|ам|ами|ах)?|калори(?:я|и|й|ю|ей|ями|ях|ям)|калорийность|ккал)';
    var words='(?:ноль|нуль|один|одна|одно|два|две|три|четыре|пять|шесть|семь|восемь|девять|десять|одиннадцать|двенадцать|тринадцать|четырнадцать|пятнадцать|шестнадцать|семнадцать|восемнадцать|девятнадцать|двадцать|тридцать|сорок|пятьдесят|шестьдесят|семьдесят|восемьдесят|девяносто|сто|двести|триста|четыреста|пятьсот|шестьсот|семьсот|восемьсот|девятьсот)';
    var basic='(?:\\d+(?:[.,]\\d+)?|'+words+'(?:[ -]+'+words+')*)';
    var num='('+basic+'(?:\\s+(?:запятая|точка|целых)\\s+'+basic+')?)';
    var unit='(?:грамм(?:а|ов)?|граммы|гр\\.?|г)';
    var rx=new RegExp('(^|[^а-яё0-9])(?:('+labels+')\\s*[:—=-]?\\s*'+num+'(?:\\s*'+unit+'(?=$|[^а-яё]))?|'+num+'\\s*(?:'+unit+'\\s*)?('+labels+'))(?=$|[^а-яё0-9])','gi');
    return head.replace(rx,function(all,prefix,before,valueAfter,valueBefore,after){
      var label=(before||after).toLowerCase(), raw=valueAfter||valueBefore;
      var n=number(raw);if(n===null)return all;
      var canonical=/^бел/.test(label)?'белки':/^жир/.test(label)?'жиры':/^углевод/.test(label)?'углеводы':'калории';
      return prefix+canonical+' '+n+' ';
    })+tail;
  }

  window.fsPrivateFoodVoice=function(text){
    if(currentPage!=='foodpick'||foodPickerTab!=='add')return;
    var phrase=String(text||'').trim(), type=phrase.match(/^(?:создать\s+)?(рецепт|продукт)(?=$|[\s,:.])/i);
    if(myFoodView.mode!=='form')myFoodOpen('form',type&&type[1].toLowerCase()==='продукт'?'product':/рецепт|ингр|приготов/i.test(phrase)?'recipe':'product');
    if(type)phrase=phrase.slice(type[0].length).replace(/^[\s,:.]+/,'');
    if(!phrase){toast('Продиктуйте название или нужное поле.');return;}
    phrase=canonicalNutrition(phrase);
    var rx=/(^|[\s,;])(название|калории|калорийность|калорий|ккал|белки|белков|жиры|жиров|углеводы|углеводов|кбжу|ингредиенты|ингридиенты|ингредиент|ингридиент|способ приготовления|как готовить|как приготовить|приготовление|вес|граммовка)(?=$|[\s:,.])/gi;
    var marks=[],m;while((m=rx.exec(phrase))){marks.push({start:m.index,end:rx.lastIndex,key:m[2].toLowerCase()});if(/^(способ|как |приготовление)/i.test(m[2]))break;}
    var changed=false;
    // Text before the first field label is the record name, not a search query.
    if(marks.length&&marks[0].start>0){
      var leading=phrase.slice(0,marks[0].start).trim()
        .replace(/[\s,;:.]+$/g,'')
        .replace(/(?:[\s,;]+)(?:его|ее|её|их)(?:\s+(?:кбжу|к\s*б\s*ж\s*у))?$/i,'')
        .replace(/[\s,;:.]+$/g,'');
      if(leading)changed=put('name',leading)||changed;
    }
    marks.forEach(function(mark,i){
      var v=phrase.slice(mark.end,i+1<marks.length?marks[i+1].start:phrase.length).replace(/^[\s:,.]+|[\s;]+$/g,'');if(!v)return;
      var key=mark.key;
      if(key==='название')changed=put('name',v)||changed;
      else if(/^инг/.test(key))changed=ingredients(v)||changed;
      else if(/^(способ|как |приготовление)/.test(key))changed=put('preparation',v,true)||changed;
      else if(key==='кбжу'){var values=normalize(v).match(/\d+(?:\.\d+)?/g)||[];if(values.length===4)['kcal','p','f','c'].forEach(function(k,j){changed=put(k,values[j])||changed;});else toast('Назовите калории, белки, жиры и углеводы отдельно.');}
      else if(/^(вес|граммовка)/.test(key)){
        var n=number(v),rows=ingredientRows(),row=rows.find(function(r){var name=r.querySelector('.my-food-ing-name').value.trim();return name&&foodSearchNorm(v).includes(foodSearchNorm(name));});
        if(!row&&target&&target.isConnected&&target.closest)row=target.closest('.my-food-ingredient');
        if(!row)row=rows[rows.length-1];
        if(row&&n!==null){var liquid=/мл|миллилитр|(?:^|\s)л(?:$|\s)|литр/i.test(v),large=/кг|килограмм|(?:^|\s)л(?:$|\s)|(?:^|\s)литр/i.test(v);row.querySelector('.my-food-ing-grams').value=n*(large?1000:1);if(/мл|миллилитр|литр|грамм|(?:^|\s)(?:г|гр|кг|л)(?:$|\s)/i.test(v))row.querySelector('.my-food-ing-unit').value=liquid?'мл':'г';changed=true;}else toast('Вес укажите у ингредиента рецепта.');
      }else{var n=number(v);if(n!==null)changed=put(/^(кал|ккал)/.test(key)?'kcal':/^бел/.test(key)?'p':/^жир/.test(key)?'f':'c',n)||changed;}
    });
    if(!marks.length){
      if(target&&target.isConnected&&target.closest&&target.closest('#my-food-form')){
        if(/^my-food-(kcal|p|f|c)$/.test(target.id)||target.classList.contains('my-food-ing-grams')){var n=number(phrase);if(n!==null){target.value=n;changed=true;}}
        else if(target.tagName==='INPUT'||target.tagName==='TEXTAREA'){target.value=target.tagName==='TEXTAREA'&&target.value?target.value+'\n'+phrase:phrase;changed=true;}
      }else changed=put('name',phrase);
    }
    if(!changed)toast('Скажите название поля, например «название», «калории» или «ингредиенты».');
  };
})();


// ===== Голосовой ввод приготовления =====
(function(){
  var IDS=['my-food-preparation','new-recipe-preparation'];
  var COMMANDS=['способ приготовления','как приготовить','как готовить','метод приготовления','технология приготовления','пошаговый рецепт','приготовление','рецепт','шаги'];
  var rec=null,target=null;

  function clean(text){
    var v=String(text||'').trim(),low=v.toLowerCase();
    for(var i=0;i<COMMANDS.length;i++){
      if(low.indexOf(COMMANDS[i])===0){v=v.slice(COMMANDS[i].length);break;}
    }
    return v.replace(/^[\s:—–-]+/,'').trim();
  }
  function panel(){
    var p=document.getElementById('prep-voice-panel');
    if(p)return p;
    p=document.createElement('div');
    p.id='prep-voice-panel';
    p.className='prep-voice-panel';
    p.innerHTML='<div class="prep-voice-head"><strong>Приготовление</strong><button type="button" class="prep-voice-close" aria-label="Закрыть">×</button></div>'+
      '<div class="prep-voice-status" id="prep-voice-status">Нажмите микрофон и скажите способ приготовления</div>'+
      '<textarea id="prep-voice-text" rows="4" placeholder="Распознанный текст появится здесь"></textarea>'+
      '<div class="prep-voice-actions">'+
      '<button type="button" class="prep-voice-mic" id="prep-voice-mic" aria-label="Запись"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="2" width="6" height="12" rx="3"></rect><path d="M5 10a7 7 0 0 0 14 0M12 17v4M8 21h8"></path></svg></button>'+
      '<button type="button" class="prep-voice-clear">Очистить</button>'+
      '<button type="button" class="prep-voice-done">Готово</button></div>';
    document.body.appendChild(p);
    p.querySelector('.prep-voice-close').onclick=closePanel;
    p.querySelector('#prep-voice-mic').onclick=toggle;
    p.querySelector('.prep-voice-clear').onclick=function(){document.getElementById('prep-voice-text').value='';};
    p.querySelector('.prep-voice-done').onclick=apply;
    return p;
  }
  function status(t){var s=document.getElementById('prep-voice-status');if(s)s.textContent=t;}
  function stop(){
    if(rec){try{rec.stop();}catch(e){}rec=null;}
    var m=document.getElementById('prep-voice-mic');if(m)m.classList.remove('listening');
  }
  function toggle(){
    var SR=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!SR){if(typeof toast==='function')toast('Голосовой ввод не поддерживается в этом браузере');return;}
    if(rec){stop();return;}
    var out=document.getElementById('prep-voice-text'),mic=document.getElementById('prep-voice-mic');
    rec=new SR();
    rec.lang='ru-RU';rec.continuous=true;rec.interimResults=true;rec.maxAlternatives=1;
    rec.onstart=function(){if(mic)mic.classList.add('listening');status('Слушаю… Скажите: «способ приготовления — запечь в духовке»');};
    rec.onresult=function(e){
      var fin='',interim='';
      for(var i=e.resultIndex;i<e.results.length;i++){
        if(e.results[i].isFinal)fin+=e.results[i][0].transcript;else interim+=e.results[i][0].transcript;
      }
      if(fin){
        var t=clean(fin);
        if(t)out.value=out.value?out.value.replace(/\s+$/,'')+' '+t:t;
      }
      status(interim.trim()?'Распознаю: '+interim.trim():'Слушаю…');
    };
    rec.onerror=function(e){
      if(e.error!=='aborted'&&e.error!=='no-speech'&&typeof toast==='function')
        toast(e.error==='not-allowed'?'Нет доступа к микрофону':'Ошибка распознавания: '+e.error);
    };
    rec.onend=function(){if(mic)mic.classList.remove('listening');status('Запись остановлена');rec=null;};
    try{rec.start();}catch(e){rec=null;}
  }
  function openPanel(field){
    target=field||null;
    var p=panel();
    var out=document.getElementById('prep-voice-text');
    out.value=target?target.value:'';
    p.classList.add('show');
    document.body.classList.add('prep-voice-open');
  }
  function closePanel(){
    stop();
    var p=document.getElementById('prep-voice-panel');if(p)p.classList.remove('show');
    document.body.classList.remove('prep-voice-open');
  }
  function apply(){
    var out=document.getElementById('prep-voice-text');
    if(target&&target.isConnected&&out){
      target.value=out.value.trim();
      target.dispatchEvent(new Event('input',{bubbles:true}));
    }
    closePanel();
    if(typeof toast==='function')toast('Приготовление добавлено');
  }

  function micIcon(){
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="2" width="6" height="12" rx="3"></rect><path d="M5 10a7 7 0 0 0 14 0M12 17v4M8 21h8"></path></svg>';
  }
  function addMic(){
    IDS.forEach(function(id){
      var field=document.getElementById(id);
      if(!field||field.dataset.prepMic)return;
      field.dataset.prepMic='1';
      var wrap=document.createElement('div');
      wrap.className='prep-voice-wrap';
      field.parentNode.insertBefore(wrap,field);
      wrap.appendChild(field);
      var btn=document.createElement('button');
      btn.type='button';
      btn.className='prep-voice-mic-btn';
      btn.setAttribute('aria-label','Голосовой ввод приготовления');
      btn.title='Голосовой ввод приготовления';
      btn.innerHTML=micIcon();
      btn.addEventListener('click',function(ev){
        ev.preventDefault();ev.stopPropagation();
        openPanel(field);
        toggle();
      });
      wrap.appendChild(btn);
    });
  }
  var timer=null;
  var mo=new MutationObserver(function(){clearTimeout(timer);timer=setTimeout(addMic,30);});
  function start(){addMic();mo.observe(document.body,{childList:true,subtree:true});}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
  window.startPrepVoice=function(field){openPanel(field);toggle();};
  window.closePrepVoicePanel=closePanel;
})();


// ===== Пакетный голосовой ввод приёма пищи =====
(function(){
  const MEALS={завтрак:'breakfast',обед:'lunch',ужин:'dinner',перекус:'snack'};
  const MEAL_TITLES={breakfast:'Завтрак',lunch:'Обед',dinner:'Ужин',snack:'Перекус'};
  let batchItems=[];

  function splitItems(text){
    return String(text||'')
      .replace(/^\s*(завтрак|обед|ужин|перекус)\s*[:,-]?\s*/i,'')
      .split(/[,;]|\s+и\s+/i)
      .map(x=>x.trim())
      .filter(x=>x.length>1);
  }
  function detectMeal(text){
    const low=String(text||'').toLowerCase();
    for(const key in MEALS)if(low.includes(key))return MEALS[key];
    return window.currentMealType||'breakfast';
  }
  function parseAmount(raw){
    const text=String(raw||'').toLowerCase().replace(/,/g,'.');
    const unitWords={'г':'г','гр':'г','грамм':'г','граммов':'г','грамма':'г','мл':'мл','миллилитров':'мл','миллилитра':'мл','шт':'шт','штука':'шт','штуки':'шт','штук':'шт'};
    let m=text.match(/(\d+(?:\.\d+)?)\s*(граммов|грамма|грамм|гр|г|миллилитров|миллилитра|мл|штук|штуки|штука|шт)\b/);
    if(m)return{amount:parseFloat(m[1]),unit:unitWords[m[2]]||'г',name:text.slice(0,m.index).trim()};
    const words={'один':1,'одну':1,'одно':1,'два':2,'две':2,'три':3,'четыре':4,'пять':5,'шесть':6,'семь':7,'восемь':8,'девять':9,'десять':10};
    m=text.match(/(\d+|один|одну|одно|два|две|три|четыре|пять|шесть|семь|восемь|девять|десять)\s*(штук|штуки|штука|шт)\b/);
    if(m){const n=/^\d+$/.test(m[1])?parseInt(m[1]):words[m[1]];return{amount:n,unit:'шт',name:text.slice(0,m.index).trim()}}
    return{amount:null,unit:'г',name:text.trim()};
  }
  function findFood(query){
    const q=String(query||'').trim();
    if(!q)return null;
    if(typeof searchFoodPrefix==='function'){
      const found=searchFoodPrefix(q,1);
      if(found&&found.length)return found[0];
    }
    const all=typeof pickerAllFoods==='function'?pickerAllFoods():[];
    const low=q.toLowerCase();
    return all.find(f=>String(f.n||'').toLowerCase()===low)||all.find(f=>String(f.n||'').toLowerCase().includes(low))||null;
  }
  function handleBatchMealVoice(text){
    const parts=splitItems(text);
    const hasMealWord=Object.keys(MEALS).some(k=>String(text).toLowerCase().includes(k));
    if(parts.length<2&&!hasMealWord)return false;
    if(parts.length<1)return false;
    const meal=detectMeal(text);
    batchItems=parts.map(raw=>{
      const parsed=parseAmount(raw);
      const food=findFood(parsed.name);
      return{
        raw,query:parsed.name,food,
        amount:parsed.amount||100,
        unit:parsed.unit,
        include:!!food&&parsed.unit!=='шт',
        grams:parsed.unit==='шт'?null:(parsed.amount||100)
      };
    });
    openBatchPanel(meal);
    return true;
  }
  function esc(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;')}
  function openBatchPanel(meal){
    document.getElementById('batch-meal-overlay')?.remove();
    document.getElementById('batch-meal-sheet')?.remove();
    const ov=document.createElement('div');
    ov.id='batch-meal-overlay';ov.className='sheet-overlay';ov.onclick=closeBatchPanel;
    const sh=document.createElement('div');
    sh.id='batch-meal-sheet';sh.className='bottom-sheet batch-meal-sheet';
    sh.innerHTML='<div class="sheet-handle"></div><div class="batch-meal-head"><div><div class="batch-meal-eyebrow">Голосовой ввод</div><h2>'+(MEAL_TITLES[meal]||'Приём пищи')+'</h2></div><button type="button" class="batch-meal-close" aria-label="Закрыть">×</button></div><div class="batch-meal-list" id="batch-meal-list"></div><div class="batch-meal-actions"><button type="button" class="batch-meal-cancel" onclick="closeBatchPanel()">Отмена</button><button type="button" class="batch-meal-add" onclick="addBatchMealItems()">Добавить выбранное</button></div>';
    document.body.appendChild(ov);document.body.appendChild(sh);
    sh.querySelector('.batch-meal-close').onclick=closeBatchPanel;
    renderBatchRows();
    setTimeout(()=>{ov.classList.add('show');sh.classList.add('show');},10);
    window.currentMealType=meal;
  }
  function renderBatchRows(){
    const host=document.getElementById('batch-meal-list');if(!host)return;
    host.innerHTML=batchItems.map((item,i)=>{
      const name=item.food?item.food.n:item.query;
      const status=item.food?(item.unit==='шт'?'Укажите вес в граммах':'Найдено'):'Не найдено';
      const gramsValue=item.grams==null?'':item.grams;
      return '<div class="batch-row'+(item.food?'':' not-found')+'">'+
        '<label class="batch-check"><input type="checkbox" data-i="'+i+'" '+(item.include?'checked':'')+' onchange="toggleBatchItem('+i+',this.checked)"></label>'+
        '<div class="batch-main"><b>'+esc(name)+'</b><small>'+esc(item.raw)+' · '+esc(status)+'</small></div>'+
        '<div class="batch-amount"><input type="number" inputmode="decimal" min="0" value="'+esc(gramsValue)+'" placeholder="г" onchange="setBatchGrams('+i+',this.value)" '+(item.unit==='шт'?'':'')+'><span>г</span></div>'+
      '</div>';
    }).join('');
  }
  window.toggleBatchItem=function(i,checked){if(batchItems[i])batchItems[i].include=!!checked;};
  window.setBatchGrams=function(i,value){const n=parseFloat(String(value).replace(',','.'));if(batchItems[i])batchItems[i].grams=Number.isFinite(n)&&n>0?n:null;};
  window.closeBatchPanel=function(){
    document.getElementById('batch-meal-overlay')?.classList.remove('show');
    document.getElementById('batch-meal-sheet')?.classList.remove('show');
    setTimeout(()=>{document.getElementById('batch-meal-overlay')?.remove();document.getElementById('batch-meal-sheet')?.remove();},260);
  };
  window.addBatchMealItems=function(){
    const selected=batchItems.filter(x=>x.include&&x.food&&Number.isFinite(x.grams)&&x.grams>0);
    if(!selected.length){toast('Выберите хотя бы один найденный продукт с весом');return;}
    const today=(()=>{const d=new Date();return d.toLocaleDateString('ru-RU');})();
    let added=0;
    selected.forEach(item=>{
      const food=item.food,k=item.grams/100;
      const entry={
        id:Date.now()+Math.random().toString(36).slice(2,7),
        name:food.n,myFoodId:food.myFoodId||null,
        kcal:Math.round((Number(food.kcal)||0)*k),
        protein:+(((Number(food.p)||0)*k).toFixed(1)),
        carbs:+(((Number(food.c)||0)*k).toFixed(1)),
        fat:+(((Number(food.f)||0)*k).toFixed(1)),
        grams:Math.round(item.grams),unit:'г',
        category:food.category||'',mealType:window.currentMealType||'breakfast',date:today
      };
      (typeof nutrEntries!=='undefined'?nutrEntries:window.nutrEntries=[]).push(entry);
      added++;
    });
    if(typeof nutrEntries!=='undefined')localStorage.setItem('fs-nutrition',JSON.stringify(nutrEntries));
    closeBatchPanel();
    if(typeof renderNutrEntries==='function')renderNutrEntries();
    if(typeof renderFoodPicker==='function')renderFoodPicker();
    toast('Добавлено: '+added);
  };
  window.handleBatchMealVoice=handleBatchMealVoice;
})();

// Sports nutrition reference. Informational content, not individual prescriptions.
const FITSIM_SPORTS_SUPPLEMENTS = [
  {
    "id": "protein",
    "name": "Протеин",
    "summary": "Сывороточный, казеин и растительный белок.",
    "verdict": "Удобный способ добрать белок",
    "sections": [
      [
        "Что это и кому нужен",
        "Белковый продукт в порошке. Может быть удобен, если из обычной еды не получается набрать необходимое количество белка. Сам по себе не заменяет тренировки и полноценный рацион. При достаточном белке в питании дополнительная порция не обязательна."
      ],
      [
        "Виды и отличия",
        "Сывороточный белок быстро переваривается. Казеин переваривается медленнее, но не обязателен перед сном. Растительные варианты делают из сои, гороха и других источников; при выборе важны количество белка и аминокислотный состав. Концентрат обычно содержит больше лактозы и жира, чем изолят. Изолят не гарантирует полного отсутствия лактозы: проверяйте этикетку."
      ],
      [
        "Как учитывать в рационе",
        "Считайте массу порошка, а не только граммы белка. Например, при 75 г белка на 100 г порошка порция 30 г даст 22,5 г белка. Калории и остальные БЖУ берите с этикетки. Молоко, фрукты и другие добавки учитывайте отдельно. Суточный белок включает и еду, и коктейль."
      ],
      [
        "Ограничения и выбор",
        "Учитывайте аллергию на молочный белок и переносимость лактозы. При заболеваниях почек количество белка согласуют с врачом. Сравнивайте стоимость одинакового количества белка, а не только банки; избегайте обещаний быстрого роста мышц."
      ]
    ],
    "url": "https://ods.od.nih.gov/factsheets/ExerciseAndAthleticPerformance-HealthProfessional/"
  },
  {
    "id": "creatine",
    "name": "Креатин",
    "summary": "Моногидрат, регулярный приём и изменение веса.",
    "verdict": "Хорошо изучен для силовой работы",
    "sections": [
      [
        "Для чего используют",
        "Повышает доступность энергии при повторных коротких высокоинтенсивных усилиях. Может улучшать силу и объём выполняемой работы, помогая адаптации к тренировкам. Для длительной равномерной выносливости польза менее убедительна. Моногидрат — наиболее изученная форма."
      ],
      [
        "Приём и загрузка",
        "Для здоровых взрослых часто изучают 3–5 г моногидрата ежедневно, в том числе в дни отдыха. Загрузка необязательна: без неё насыщение происходит постепенно. В исследованиях также используют около 20 г в сутки, разделённых на 4 порции, 5–7 дней, затем 3–5 г в сутки. Большие разовые порции чаще вызывают дискомфорт ЖКТ. Это справочные схемы, не персональное назначение."
      ],
      [
        "Почему растёт вес",
        "В начале приёма вес может увеличиться из-за удержания воды, в том числе в мышцах. Это не означает автоматического набора жира. Изменение веса оценивайте вместе с динамикой питания и тренировок."
      ],
      [
        "Ограничения",
        "При заболеваниях почек, беременности, грудном вскармливании, возрасте до 18 лет или приёме лекарств решение обсуждают с врачом. Сообщайте о приёме перед анализами: интерпретация креатинина может потребовать учёта добавки."
      ]
    ],
    "url": "https://ods.od.nih.gov/factsheets/ExerciseAndAthleticPerformance-HealthProfessional/"
  },
  {
    "id": "gainer",
    "name": "Гейнер",
    "summary": "Белково-углеводная смесь для увеличения калорийности.",
    "verdict": "Удобство питания, а не особый рост мышц",
    "sections": [
      [
        "Что входит в состав",
        "Обычно смесь углеводов и белка; доля жиров, сахаров и дополнительных ингредиентов зависит от продукта. Не путайте размер мерной ложки с порцией: производитель может указывать несколько ложек."
      ],
      [
        "Когда может пригодиться",
        "Когда трудно получать достаточно энергии обычной едой, например при высоком расходе и плохом аппетите. Не обязателен для набора массы и может давать лишние калории, если рацион уже покрывает потребности."
      ],
      [
        "Отличие от протеина и еды",
        "Протеин прежде всего помогает добрать белок, гейнер — общую энергию и углеводы. Смесь из обычных продуктов тоже может решать эту задачу; гейнер не имеет уникального преимущества перед сопоставимым по составу рационом."
      ],
      [
        "Учёт и ограничения",
        "Вносите фактическую массу порошка и данные с упаковки, а жидкость для разведения — отдельно. Учитывайте аллергию, переносимость и необходимость контроля углеводов при диабете. Не назначайте себе большой профицит только из-за рекомендаций на банке."
      ]
    ],
    "url": "https://www.ausport.gov.au/ais/nutrition/supplements/group_a"
  },
  {
    "id": "caffeine",
    "name": "Кофеин и предтренировочные комплексы",
    "summary": "Стимуляция, состав, суммарный кофеин и сон.",
    "verdict": "Эффект возможен, переносимость индивидуальна",
    "sections": [
      [
        "Что даёт кофеин",
        "Может уменьшать ощущение усилия и повышать работоспособность при некоторых нагрузках. Ответ индивидуален: больше стимуляции не обязательно означает лучший результат. Недосып нельзя компенсировать предтреником."
      ],
      [
        "Как читать состав",
        "Ищите количество кофеина на фактическую порцию и число порций в мерной ложке. Учитывайте кофе, чай, энергетики, гели и лекарства с кофеином. Гуарана тоже может быть его источником. Смеси без указания доз отдельных компонентов затрудняют оценку."
      ],
      [
        "Приём и сон",
        "Начинать с высоких доз не стоит. Не сочетайте несколько стимуляторов. Если страдает засыпание или качество сна, уменьшайте потребление и переносите его на более раннее время; чувствительность и длительность эффекта различаются. Не используйте чистый концентрированный порошок кофеина."
      ],
      [
        "Риски",
        "Возможны тревога, дрожь, учащённое сердцебиение, тошнота и бессонница. При нарушениях ритма, неконтролируемом давлении, беременности, возрасте до 18 лет и приёме лекарств нужна отдельная медицинская оценка. Сильная боль в груди или обморок требуют срочной помощи, а не уменьшения дозы."
      ]
    ],
    "url": "https://ods.od.nih.gov/factsheets/ExerciseAndAthleticPerformance-HealthProfessional/"
  },
  {
    "id": "beta",
    "name": "Бета-аланин",
    "summary": "Накопительный эффект и покалывание.",
    "verdict": "Для отдельных высокоинтенсивных нагрузок",
    "sections": [
      [
        "Механизм и доказательность",
        "Повышает содержание карнозина в мышцах, участвующего в буферизации кислотности. Потенциально полезен при интенсивных усилиях примерно 1–4 минуты и некоторых повторных нагрузках. Результаты исследований неоднородны; это не универсальная добавка для силы, роста мышц или длительного кардио."
      ],
      [
        "Почему нужен регулярный приём",
        "Работает через постепенное увеличение карнозина, а не как разовый стимулятор. В исследованиях используют 4–6 г в сутки дробными порциями не менее 2–4 недель. Это ориентир из исследований у взрослых, а не обязательная схема для каждого."
      ],
      [
        "Покалывание",
        "Парестезия — покалывание кожи после приёма — известный побочный эффект и не показатель эффективности. Дробление доз и формы с замедленным высвобождением могут его уменьшать. Сыпь, отёк или затруднённое дыхание нельзя списывать на обычное покалывание."
      ],
      [
        "Ограничения",
        "Данных о длительном многолетнем применении меньше, чем о коротких курсах. При заболеваниях, беременности и приёме лекарств нужна консультация; детям не предлагать схемы для взрослых."
      ]
    ],
    "url": "https://ods.od.nih.gov/factsheets/ExerciseAndAthleticPerformance-HealthProfessional/"
  },
  {
    "id": "fuel",
    "name": "Углеводные напитки, гели и электролиты",
    "summary": "Энергия, жидкость и соли во время нагрузки.",
    "verdict": "Полезность зависит от длительности и условий",
    "sections": [
      [
        "Когда рассматривают",
        "При длительных нагрузках, особенно более часа, дополнительное поступление углеводов, жидкости и электролитов может быть полезно. Потребность зависит от интенсивности, жары, потоотделения, питания и переносимости. Для обычной короткой тренировки часто достаточно воды и обычного рациона."
      ],
      [
        "Напитки и гели",
        "Спортивный напиток сочетает жидкость с углеводами, иногда с электролитами. Гель — концентрированный источник углеводов; большинство гелей следует запивать водой согласно инструкции. Проверяйте наличие кофеина. Новые продукты сначала испытывают на тренировке, а не на соревновании."
      ],
      [
        "Электролиты",
        "Важен в том числе натрий, теряемый с потом. Не любой электролитный напиток содержит углеводы. Подбирать количество солей и жидкости нужно по условиям, а не по правилу «чем больше, тем лучше». Избыточное питьё тоже опасно."
      ],
      [
        "Отличие от энергетиков и учёт",
        "Энергетик обычно позиционируется как стимулирующий напиток с кофеином; он не равнозначен спортивному напитку для питания и гидратации. Углеводы и калории гелей/напитков учитывайте в дневнике. При болезнях почек, сердца и ограничении натрия состав обсуждают с врачом."
      ]
    ],
    "url": "https://www.ausport.gov.au/ais/nutrition/supplements/group_a"
  },
  {
    "id": "amino",
    "name": "BCAA и EAA",
    "summary": "Три аминокислоты или полный набор незаменимых.",
    "verdict": "Оценивать на фоне всего рациона",
    "sections": [
      [
        "В чём разница",
        "BCAA — лейцин, изолейцин и валин. EAA — все девять незаменимых аминокислот, включая BCAA. Для построения мышечного белка нужен полный набор аминокислот, а не только три."
      ],
      [
        "Что уже есть в еде",
        "Мясо, рыба, яйца, молочные и другие белковые продукты дают аминокислоты; полноценные протеиновые продукты также содержат EAA и BCAA. Покупать несколько добавок с перекрывающимся составом не обязательно."
      ],
      [
        "Насколько оправдан приём",
        "Для BCAA нет убедительных последовательных доказательств дополнительного преимущества для роста мышц при достаточном полноценном белке. EAA могут стимулировать синтез мышечного белка, но это не доказывает, что отдельная банка даст больше долгосрочного результата, чем подходящий рацион."
      ],
      [
        "Практический вывод",
        "Сначала оцените калорийность и суточное поступление белка. Аминокислоты не заменяют полноценное питание. Учитывайте состав, переносимость и ограничения при заболеваниях, а не только надпись «восстановление»."
      ]
    ],
    "url": "https://ods.od.nih.gov/factsheets/ExerciseAndAthleticPerformance-HealthProfessional/"
  },
  {
    "id": "citrulline",
    "name": "Цитруллин",
    "summary": "Популярный компонент комплексов для «пампа».",
    "verdict": "Данные ограничены и неоднородны",
    "sections": [
      [
        "Обещания и механизм",
        "Предшественник аргинина, участвующий в обмене оксида азота. Производители обещают усиление кровотока и работоспособности. Ощущение наполненности мышц само по себе не доказывает их рост."
      ],
      [
        "Что показывают исследования",
        "В отдельных исследованиях отмечали улучшение некоторых показателей работы, но результаты неоднородны. Надёжно обещать рост силы, мышц или выносливости каждому пользователю нельзя."
      ],
      [
        "Выбор и ограничения",
        "L-цитруллин и цитруллин-малат не равны по массе действующего цитруллина; важны состав и соотношение компонентов. Возможен дискомфорт ЖКТ. При приёме препаратов, влияющих на давление, согласуйте сочетание с врачом."
      ]
    ],
    "url": "https://ods.od.nih.gov/factsheets/ExerciseAndAthleticPerformance-HealthProfessional/"
  },
  {
    "id": "arginine",
    "name": "Аргинин",
    "summary": "Аминокислота, которую рекламируют для кровотока.",
    "verdict": "Слабая поддержка спортивных обещаний",
    "sections": [
      [
        "Что это",
        "Аминокислота из пищи, также синтезируемая организмом; участвует в образовании оксида азота. Участие вещества в физиологическом процессе не означает, что его дополнительный приём улучшит результат."
      ],
      [
        "Доказательность",
        "Исследования не дают убедительных оснований ожидать заметного улучшения силы, выносливости или восстановления у здоровых тренирующихся. Обещания «поднять гормон роста и нарастить мышцы» не следует принимать за доказанный эффект."
      ],
      [
        "Риски",
        "Возможны тошнота, диарея и снижение давления. Не подбирайте большие дозы самостоятельно; при сердечно-сосудистых заболеваниях и приёме лекарств нужна консультация."
      ]
    ],
    "url": "https://ods.od.nih.gov/factsheets/ExerciseAndAthleticPerformance-HealthProfessional/"
  },
  {
    "id": "glutamine",
    "name": "Глутамин",
    "summary": "Добавка, которую часто продают для восстановления.",
    "verdict": "Нет убедительной пользы для роста мышц",
    "sections": [
      [
        "Что это",
        "Аминокислота, участвующая во многих обменных процессах. Организм обычно способен её синтезировать. Медицинское применение в отдельных тяжёлых состояниях нельзя переносить на здоровых посетителей зала."
      ],
      [
        "Что известно",
        "В исследованиях силовых тренировок не показано убедительного улучшения мышечной работоспособности или состава тела. Есть отдельные данные о восстановлении, но они не обосновывают обязательный приём всем спортсменам."
      ],
      [
        "Практический вывод",
        "Для здорового человека это не первоочередная покупка ради мышечной массы. Сначала важны программа, сон, достаточная энергия и белок. При заболеваниях не используйте спортивные рекомендации вместо лечения."
      ]
    ],
    "url": "https://ods.od.nih.gov/factsheets/ExerciseAndAthleticPerformance-HealthProfessional/"
  },
  {
    "id": "carnitine",
    "name": "L-карнитин",
    "summary": "Перенос жирных кислот и обещания «жиросжигания».",
    "verdict": "Результаты исследований смешанные",
    "sections": [
      [
        "Что делает в организме",
        "Участвует в транспорте жирных кислот в митохондрии. Из этой функции не следует, что дополнительный приём автоматически ускорит потерю жира."
      ],
      [
        "Работоспособность и снижение веса",
        "Исследования спортивных результатов неоднородны. В обзорах по снижению массы встречается небольшой средний эффект, но он не гарантирован и не означает выраженного жиросжигания у здорового тренирующегося. Добавка не заменяет управление рационом и активностью."
      ],
      [
        "Ограничения",
        "Возможны тошнота, спазмы живота, диарея и специфический запах тела. При судорожных расстройствах и заболеваниях почек требуется медицинская оценка. Медицинские показания при дефиците карнитина — отдельная тема, не схема для фитнеса."
      ]
    ],
    "url": "https://ods.od.nih.gov/factsheets/Carnitine-HealthProfessional/"
  }
];
function renderSportsSupplements(){
 const host=document.getElementById('supp-list');if(!host)return;
 const input=document.getElementById('supp-search'),q=(input?.value||'').trim().toLocaleLowerCase('ru');
 const clear=document.getElementById('supp-search-clear');if(clear)clear.hidden=!(input?.value||'').length;
 const rows=FITSIM_SPORTS_SUPPLEMENTS.filter(item=>!q||[item.name,item.summary,...item.sections.flat()].join(' ').toLocaleLowerCase('ru').includes(q));
 const count=document.getElementById('supp-count');if(count)count.textContent='Найдено тем: '+rows.length;
 host.replaceChildren();
 for(const item of rows){
  const card=document.createElement('details');card.className='supp-card';
  const summary=document.createElement('summary'),name=document.createElement('span'),sub=document.createElement('small');
  name.textContent=item.name;sub.textContent=item.summary;summary.append(name,sub);card.appendChild(summary);
  const body=document.createElement('div');body.className='supp-card-body';
  const verdict=document.createElement('p');verdict.className='supp-verdict';verdict.textContent=item.verdict;body.appendChild(verdict);
  for(const [title,text] of item.sections){const section=document.createElement('section'),heading=document.createElement('h3'),paragraph=document.createElement('p');heading.textContent=title;paragraph.textContent=text;section.append(heading,paragraph);body.appendChild(section);}
  const source=document.createElement('a');source.href=item.url;source.target='_blank';source.rel='noopener noreferrer';source.textContent=item.url.includes('ausport')?'Источник: Australian Institute of Sport ↗':'Источник: NIH Office of Dietary Supplements ↗';body.appendChild(source);card.appendChild(body);host.appendChild(card);
 }
 if(!rows.length){const empty=document.createElement('p');empty.className='supp-count';empty.textContent='Ничего не найдено. Попробуйте другое название.';host.appendChild(empty);}
}
function clearSportsSupplementSearch(){const input=document.getElementById('supp-search');if(input){input.value='';renderSportsSupplements();input.focus();}}
window.renderSportsSupplements=renderSportsSupplements;
window.clearSportsSupplementSearch=clearSportsSupplementSearch;

// Sports nutrition notice uses the same information dialog as nutrition cards.
function showSportsSupplementInfo(){
  NUTRIENT_INFO.sportsSupplements={title:'Спортивное питание',body:"Добавки не заменяют рацион, тренировки и сон. Информация предназначена для взрослых и не является индивидуальным назначением. При заболеваниях, приёме лекарств, беременности и грудном вскармливании обсудите добавки с врачом.\n\nМатериалы проверены: 29 октября 2026. Эффект зависит от задачи и условий; наличие карточки не означает рекомендацию покупать добавку."};
  showNutrientInfo('sportsSupplements');
}
window.showSportsSupplementInfo=showSportsSupplementInfo;

/* FitSim: крестик очистки поиска виден только когда в поле есть хотя бы один символ (в т.ч. смайлик или пробел) */
(function(){
  const PAIRS=[['food-search','food-search-clear'],['builder-ex-search','builder-ex-clear'],['enc-search','enc-search-clear'],['kb-food-search','kb-food-search-clear'],['add-ex-search','add-ex-clear'],['supp-search','supp-search-clear']];
  function syncSearchClearButtons(){
    PAIRS.forEach(function(p){
      const input=document.getElementById(p[0]),btn=document.getElementById(p[1]);
      if(!input||!btn)return;
      const empty=input.value.length===0;
      if(btn.hidden!==empty)btn.hidden=empty;
    });
  }
  function clearAddExSearch(){
    const input=document.getElementById('add-ex-search');
    if(input){input.value='';input.dispatchEvent(new Event('input',{bubbles:true}));input.focus();}
    syncSearchClearButtons();
  }
  window.syncSearchClearButtons=syncSearchClearButtons;
  window.clearAddExSearch=clearAddExSearch;
  ['input','change','focusin','focusout','keyup','compositionend'].forEach(function(ev){document.addEventListener(ev,syncSearchClearButtons,true);});
  document.addEventListener('click',function(){setTimeout(syncSearchClearButtons,0);setTimeout(syncSearchClearButtons,150);},true);
  window.addEventListener('pageshow',syncSearchClearButtons);
  setInterval(syncSearchClearButtons,300);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',syncSearchClearButtons);else syncSearchClearButtons();
})();


/* Nutrition analytics: calendar grid for day selection. */
(function(){
  let overlay=null,panel=null,previousOverflow='',trigger=null,year=0,month=0,selectedDate=null;
  const isDay=()=>(window.mealAnalyticsPeriod||'day')==='day';
  const dayKey=d=>Date.UTC(d.getFullYear(),d.getMonth(),d.getDate());
  function base(){const d=new Date();d.setHours(0,0,0,0);d.setDate(d.getDate()+(Number(window._nutrOffset)||0));return d;}
  function current(){const d=base();d.setDate(d.getDate()+(Number(window._mealPeriodShift)||0));return d;}
  function close(){
    if(!overlay)return;overlay.remove();overlay=null;panel=null;document.body.style.overflow=previousOverflow;
    if(trigger?.isConnected)trigger.focus({preventScroll:true});
  }
  function choose(d){window._mealPeriodShift=Math.round((dayKey(d)-dayKey(base()))/86400000);close();window.renderMealAnalytics?.();}
  function render(){
    if(!panel)return;
    panel.querySelector('.meal-day-calendar-title').textContent=new Date(year,month,1).toLocaleDateString('ru-RU',{month:'long',year:'numeric'});
    const grid=panel.querySelector('.meal-day-calendar-grid');grid.replaceChildren();
    const today=new Date(),offset=(new Date(year,month,1).getDay()+6)%7;
    let entries=[];try{const a=JSON.parse(localStorage.getItem('fs-nutrition')||'[]');if(Array.isArray(a))entries=a;}catch(e){}
    if(typeof nutrEntries!=='undefined'&&Array.isArray(nutrEntries))entries=entries.concat(nutrEntries);
    const logged=new Set(entries.map(e=>String(e.date||'').trim()));
    for(let i=0;i<offset;i++){const blank=document.createElement('span');blank.setAttribute('aria-hidden','true');grid.appendChild(blank);}
    const count=new Date(year,month+1,0).getDate();
    for(let n=1;n<=count;n++){
      const d=new Date(year,month,n),b=document.createElement('button');b.type='button';b.className='meal-day-calendar-date';b.textContent=n;
      const chosen=dayKey(d)===dayKey(selectedDate),now=dayKey(d)===dayKey(today);
      b.classList.toggle('is-selected',chosen);b.classList.toggle('is-today',now);b.setAttribute('aria-pressed',String(chosen));
      if(now)b.setAttribute('aria-current','date');
      const has=logged.has(d.toLocaleDateString('ru-RU'));b.classList.toggle('has-entries',has);
      b.setAttribute('aria-label',d.toLocaleDateString('ru-RU',{day:'numeric',month:'long',year:'numeric'})+(has?', есть записи питания':''));
      b.onclick=()=>choose(d);grid.appendChild(b);
    }
  }
  function open(){
    if(!isDay()||overlay)return;
    trigger=document.activeElement;previousOverflow=document.body.style.overflow;
    selectedDate=current();year=selectedDate.getFullYear();month=selectedDate.getMonth();
    overlay=document.createElement('div');overlay.id='meal-day-calendar-overlay';
    panel=document.createElement('section');panel.className='meal-day-calendar-panel';panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-label','Выбрать день питания');
    panel.innerHTML='<div class="meal-day-calendar-heading">Выбери день</div><div class="meal-day-calendar-nav"><button type="button" class="prev" aria-label="Предыдущий месяц">‹</button><span class="meal-day-calendar-title" aria-live="polite"></span><button type="button" class="next" aria-label="Следующий месяц">›</button></div><div class="meal-day-calendar-week"><span>Пн</span><span>Вт</span><span>Ср</span><span>Чт</span><span>Пт</span><span>Сб</span><span>Вс</span></div><div class="meal-day-calendar-grid"></div><div class="meal-day-calendar-footer"><button type="button" class="today">Сегодня</button><button type="button" class="cancel">Отмена</button></div>';
    const change=delta=>{const d=new Date(year,month+delta,1);year=d.getFullYear();month=d.getMonth();render();};
    panel.querySelector('.prev').onclick=()=>change(-1);panel.querySelector('.next').onclick=()=>change(1);
    panel.querySelector('.today').onclick=()=>choose(new Date());panel.querySelector('.cancel').onclick=close;
    overlay.onclick=e=>{if(e.target===overlay)close();};overlay.appendChild(panel);document.body.appendChild(overlay);document.body.style.overflow='hidden';
    render();(panel.querySelector('.is-selected')||panel.querySelector('.prev')).focus({preventScroll:true});
  }
  function sync(){
    const l=document.getElementById('meal-period-label');if(!l)return;
    if(isDay()){
      l.classList.add('is-clickable');l.setAttribute('role','button');l.setAttribute('tabindex','0');l.setAttribute('aria-haspopup','dialog');
      const d=current(),today=new Date(),yesterday=new Date(today);yesterday.setDate(yesterday.getDate()-1);
      l.textContent=dayKey(d)===dayKey(today)?'Сегодня':dayKey(d)===dayKey(yesterday)?'Вчера':d.toLocaleDateString('ru-RU',{day:'numeric',month:'short',year:'numeric'});
    }
  }
  document.addEventListener('click',e=>{if(isDay()&&e.target.closest?.('#meal-period-label')){e.preventDefault();e.stopImmediatePropagation();open();}},true);
  document.addEventListener('keydown',e=>{
    if(overlay&&e.key==='Escape'){e.preventDefault();close();return;}
    if(isDay()&&e.target.id==='meal-period-label'&&(e.key==='Enter'||e.key===' ')){e.preventDefault();open();return;}
    if(overlay&&e.key==='Tab'){
      const items=Array.from(panel.querySelectorAll('button')),first=items[0],last=items.at(-1);
      if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
    }
  },true);
  const r=window.renderMealAnalytics;if(typeof r==='function')window.renderMealAnalytics=function(){const result=r.apply(this,arguments);sync();return result;};
  const s=window.setMealAnalyticsPeriod;if(typeof s==='function')window.setMealAnalyticsPeriod=function(){close();const result=s.apply(this,arguments);sync();return result;};
  window.openMealDayPicker=open;window.closeMealDayPicker=close;
  setTimeout(sync,0);window.addEventListener('load',sync);
})();


/* Unified downward-dismiss gesture for FitSim-owned dialogs and sheets. */
(function(){
 const routes=[['#meal-month-picker-sheet','closeMealMonthPicker'],['#meal-year-picker-sheet','closeMealYearPicker'],['.meal-day-calendar-panel','closeMealDayPicker'],['#food-cart-sheet','closeFoodCart'],['#grams-sheet','closeGramsSheet'],['#calendar-note-sheet','closeCalendarNoteSheet'],['#recipe-sheet','closeRecipeSheet'],['#add-recipe-sheet','closeAddRecipeSheet'],['#recipes-panel-sheet','closeRecipesPanel'],['#plans-panel-sheet','closePlansPanel'],['#meal-picker-sheet','closeMealPickerSheet'],['#batch-meal-sheet','closeBatchPanel'],['#prep-voice-panel','closePrepVoicePanel'],['#body-sheet','closeAllSheets'],['#edit-ex-sheet','closeAllSheets'],['#add-ex-sheet','closeAllSheets'],['#food-picker-sheet','closeAllSheets'],['#exercise-info-overlay .nutrient-info-panel','closeWorkoutExerciseInfo'],['#scheduled-workout-dialog .nutrient-info-panel',null],['.scheduled-calendar-panel',null],['#stats-tip-overlay .nutrient-info-panel',null],['#nutrient-info-overlay .nutrient-info-panel',null],['#danger-confirm-overlay .confirm-dialog',null],['#cal-edit-overlay>.ui-inline-172','closeCalEdit']];
 let g=null,blockedPanel=null,until=0;
 function reset(s){if(s?.panel.isConnected)s.panel.style.translate=s.previous;}
 function dismiss(s){
  if(s.name&&typeof window[s.name]==='function'){window[s.name]();return;}
  const cancel=s.panel.querySelector('.confirm-btn-cancel,.nutrient-info-close,.cancel,.calendar-note-close,.prep-voice-close');
  if(cancel){cancel.click();return;}s.panel.closest('#scheduled-date-calendar')?._close?.();
 }
 document.addEventListener('touchstart',function(e){
  reset(g);g=null;if(e.touches.length!==1||!e.target.closest||e.target.closest('input,textarea,select,[contenteditable="true"],.exe-drag-handle'))return;
  for(const [selector,name] of routes){const panel=e.target.closest(selector);if(!panel||panel.getBoundingClientRect().height<=0)continue;
   let atTop=true;for(let n=e.target;n&&panel.contains(n);n=n.parentElement){if(n.scrollHeight>n.clientHeight+1&&n.scrollTop>1)atTop=false;if(n===panel)break;}
   const p=e.touches[0];g={panel,name,x:p.clientX,y:p.clientY,dy:0,decided:false,dragging:false,atTop,previous:panel.style.translate};e.stopImmediatePropagation();break;
  }
 },{capture:true,passive:true});
 document.addEventListener('touchmove',function(e){
  if(!g)return;e.stopImmediatePropagation();if(e.touches.length!==1){reset(g);g=null;return;}
  const p=e.touches[0],dx=p.clientX-g.x,dy=p.clientY-g.y;
  if(!g.decided){if(Math.max(Math.abs(dx),Math.abs(dy))<9)return;g.decided=true;g.dragging=g.atTop&&dy>0&&dy>Math.abs(dx)*1.2;}
  if(!g.dragging)return;g.dy=Math.max(0,dy);if(e.cancelable)e.preventDefault();g.panel.style.translate='0 '+Math.min(g.dy,window.innerHeight)+'px';
 },{capture:true,passive:false});
 document.addEventListener('touchend',function(e){
  if(!g)return;const s=g;g=null;e.stopImmediatePropagation();reset(s);
  if(s.dragging&&s.dy>12){blockedPanel=s.panel;until=Date.now()+450;if(e.cancelable)e.preventDefault();if(s.dy>=72)dismiss(s);}
 },{capture:true,passive:false});
 document.addEventListener('touchcancel',function(e){if(g){reset(g);g=null;e.stopImmediatePropagation();}},{capture:true,passive:true});
 document.addEventListener('click',function(e){if(Date.now()<until&&blockedPanel?.contains(e.target)&&e.isTrusted){e.preventDefault();e.stopImmediatePropagation();}},true);
})();


let bodyVoiceSession=null;

const BODY_MUSCLE_PATHS={"neck": "M509 161 C518 168 529 171 540 171 C551 171 562 168 571 161 C570 177 576 191 582 202 C555 207 522 207 495 202 C502 190 510 177 509 161 Z", "shoulders": "M470 214 Q461 203 443 204 Q418 198 401 219 Q385 239 390 267 Q391 282 406 291 Q422 286 434 276 L442 258 Q443 240 470 214 Z M610 214 Q619 203 637 204 Q662 198 679 219 Q695 239 690 267 Q689 282 674 291 Q658 286 646 276 L638 258 Q637 240 610 214 Z", "chest": "M 477 214 C 493 209 518 210 540 211 C 562 210 587 209 603 214 C 619 219 633 238 635 255 C 637 272 626 290 612 298 C 598 306 576 302 560 295 C 549 290 540 289 529 293 C 511 301 488 307 472 301 C 454 295 443 279 443 263 C 443 245 458 221 477 214 Z", "bicepRight": "M435 280 C445 279 451 284 451 296 C452 317 446 338 435 356 C429 366 424 372 416 370 C406 369 400 360 401 348 C402 328 407 307 416 292 C421 284 428 280 435 280 Z", "forearmRight": "M 383 353 C 390 353 395 360 400 370 C 405 380 415 383 426 378 C 430 392 428 409 423 423 C 419 435 415 445 410 450 C 402 453 389 441 381 430 C 371 416 366 403 367 389 C 368 375 373 353 383 353 Z", "waist": "M468 359 Q497 372 539 374 Q580 372 612 359 L616 410 Q580 425 540 424 Q500 425 468 410 Z", "glutes": "M468 411 Q465 442 454 470 L441 506 M616 411 Q619 442 630 470 L644 506", "thighRight": "M442 508 Q478 506 526 528 Q540 562 531 604 Q524 633 509 654 Q499 671 483 675 Q467 679 455 662 Q437 638 432 610 Q426 581 430 552 Q434 526 442 508 Z", "calfRight": "M449 703 Q438 723 438 747 Q433 772 444 791 Q451 806 473 811 Q491 814 502 802 Q519 779 517 750 Q515 727 506 708 Q492 718 476 716 Q460 716 449 703 Z", "bicepLeft": "M435 280 C445 279 451 284 451 296 C452 317 446 338 435 356 C429 366 424 372 416 370 C406 369 400 360 401 348 C402 328 407 307 416 292 C421 284 428 280 435 280 Z", "forearmLeft": "M 383 351 C 391 351 397 359 402 369 C 407 379 417 380 428 376 C 433 391 431 410 426 425 C 422 439 417 449 411 454 C 402 458 387 444 378 432 C 368 418 363 403 364 388 C 365 372 372 351 383 351 Z", "thighLeft": "M442 508 Q478 506 526 528 Q540 562 531 604 Q524 633 509 654 Q499 671 483 675 Q467 679 455 662 Q437 638 432 610 Q426 581 430 552 Q434 526 442 508 Z", "calfLeft": "M 444.0 703.0 Q 433.0 723.0 433.0 747.0 Q 428.0 772.0 439.0 791.0 Q 446.0 806.0 468.0 811.0 Q 486.0 814.0 497.0 802.0 Q 514.0 779.0 512.0 750.0 Q 510.0 727.0 501.0 708.0 Q 487.0 718.0 471.0 716.0 Q 455.0 716.0 444.0 703.0 Z"};
const BODY_FIGURE_POSITIONS=[["neck", "left", 14, 50.0, 19.2], ["weight", "right", 14, 0, 0], ["shoulders", "right", 28, 67.55, 24.6], ["chest", "left", 28, 50.0, 31.35], ["bicepRight", "left", 41, 31.1, 35.4], ["bicepLeft", "right", 41, 68.9, 35.4], ["forearmRight", "left", 54, 29.75, 48.9], ["forearmLeft", "right", 54, 70.25, 48.9], ["waist", "right", 67, 50.0, 46.2], ["glutes", "left", 67, 40.55, 57.0], ["thighRight", "left", 80, 41.9, 70.5], ["thighLeft", "right", 80, 58.1, 70.5], ["calfRight", "left", 93, 41.9, 93.45], ["calfLeft", "right", 93, 58.1, 93.45]];
const BODY_SILHOUETTE_PATH="M635.0 829.5 L632.5 829.0 L632.5 823.0 L633.5 822.0 L633.5 817.0 L634.5 816.0 L634.5 811.0 L635.5 810.0 L635.5 807.0 L636.5 806.0 L636.5 803.0 L637.5 802.0 L637.5 797.0 L638.5 796.0 L638.5 793.0 L639.5 792.0 L639.5 787.0 L640.5 786.0 L640.5 779.0 L641.5 778.0 L641.5 775.0 L642.5 774.0 L642.5 768.0 L643.5 767.0 L643.5 740.0 L642.5 739.0 L642.5 734.0 L640.5 730.0 L640.5 726.0 L639.5 725.0 L639.5 722.0 L637.5 719.0 L637.5 716.0 L634.5 711.0 L634.5 708.0 L633.5 707.0 L633.5 705.0 L631.5 701.0 L631.5 692.0 L630.5 691.0 L630.5 669.0 L631.5 668.0 L631.5 655.0 L632.5 654.0 L633.5 649.0 L634.5 648.0 L634.5 644.0 L636.5 642.0 L637.5 640.0 L637.5 638.0 L639.5 636.0 L639.5 634.0 L643.5 627.0 L643.5 623.0 L645.5 621.0 L645.5 618.0 L646.5 617.0 L647.5 612.0 L648.5 611.0 L648.5 606.0 L649.5 605.0 L649.5 600.0 L651.5 597.0 L651.5 586.0 L652.5 585.0 L652.5 563.0 L651.5 562.0 L651.5 550.0 L649.5 546.0 L649.5 542.0 L648.5 541.0 L648.5 535.0 L647.5 534.0 L646.5 529.0 L645.5 528.0 L645.5 523.0 L643.5 520.0 L643.5 517.0 L642.5 516.0 L642.5 510.0 L640.5 507.0 L640.5 505.0 L639.5 504.0 L639.5 500.0 L637.5 497.0 L637.5 495.0 L636.5 494.0 L636.5 490.0 L634.5 487.0 L634.5 481.0 L631.5 477.0 L631.5 473.0 L625.5 461.0 L625.5 458.0 L624.5 457.0 L624.5 455.0 L622.5 453.0 L622.5 450.0 L619.5 444.0 L619.5 440.0 L618.5 439.0 L617.5 434.0 L616.5 433.0 L616.5 427.0 L613.5 421.0 L613.5 411.0 L611.5 408.0 L611.5 406.0 L612.5 405.0 L612.5 402.0 L613.5 401.0 L613.5 380.0 L612.5 379.0 L612.5 376.0 L611.5 375.0 L611.5 363.0 L612.5 362.0 L613.5 357.0 L616.5 351.0 L624.5 342.0 L625.5 339.0 L630.5 334.0 L631.5 331.0 L634.0 328.5 L635.0 328.5 L635.5 332.0 L638.5 338.0 L638.5 341.0 L641.5 346.0 L641.5 348.0 L644.5 352.0 L644.5 354.0 L646.5 356.0 L646.5 358.0 L648.5 360.0 L649.5 363.0 L651.5 365.0 L652.5 367.0 L652.5 369.0 L654.5 372.0 L654.5 376.0 L655.5 377.0 L655.5 399.0 L656.5 400.0 L656.5 407.0 L657.5 408.0 L657.5 411.0 L658.5 412.0 L658.5 417.0 L660.5 419.0 L660.5 421.0 L664.5 429.0 L664.5 431.0 L666.5 433.0 L673.5 447.0 L675.5 449.0 L675.5 451.0 L681.5 463.0 L682.5 470.0 L684.5 472.0 L685.5 479.0 L687.5 483.0 L687.5 498.0 L686.5 500.0 L678.5 508.0 L675.5 514.0 L675.5 516.0 L673.5 519.0 L673.5 522.0 L670.5 527.0 L670.5 539.0 L669.5 540.0 L669.5 543.0 L667.5 544.0 L667.5 559.0 L672.0 559.5 L675.5 556.0 L677.5 552.0 L677.5 546.0 L679.5 542.0 L679.5 539.0 L682.0 536.5 L684.0 536.5 L685.0 538.5 L687.0 538.5 L688.5 540.0 L688.5 542.0 L689.5 543.0 L689.5 546.0 L690.5 547.0 L690.5 552.0 L689.5 553.0 L689.5 556.0 L688.5 557.0 L688.5 561.0 L687.5 562.0 L687.5 564.0 L684.5 567.0 L684.5 569.0 L682.5 571.0 L682.5 572.0 L676.5 577.0 L675.5 580.0 L673.5 582.0 L676.0 585.5 L681.0 582.5 L684.0 582.5 L686.0 581.5 L688.0 579.5 L694.0 576.5 L697.0 573.5 L700.0 572.5 L702.0 570.5 L703.5 570.0 L703.5 567.0 L706.5 564.0 L707.5 562.0 L707.5 560.0 L708.5 559.0 L708.5 556.0 L712.5 548.0 L714.5 546.0 L714.5 543.0 L713.5 542.0 L713.5 518.0 L712.5 517.0 L712.5 508.0 L713.5 507.0 L713.5 502.0 L714.5 501.0 L714.5 489.0 L713.5 488.0 L713.5 455.0 L714.5 454.0 L714.5 447.0 L715.5 446.0 L715.5 442.0 L716.5 441.0 L716.5 436.0 L717.5 435.0 L717.5 425.0 L718.5 424.0 L718.5 419.0 L719.5 418.0 L719.5 396.0 L718.5 395.0 L718.5 390.0 L717.5 389.0 L717.5 383.0 L716.5 382.0 L716.5 377.0 L714.5 374.0 L714.5 370.0 L710.5 362.0 L710.5 360.0 L708.5 358.0 L708.5 356.0 L705.5 352.0 L705.5 350.0 L704.5 349.0 L704.5 342.0 L702.5 338.0 L702.5 299.0 L701.5 298.0 L701.5 296.0 L699.5 294.0 L699.5 291.0 L693.5 279.0 L691.5 277.0 L691.5 275.0 L689.5 273.0 L689.5 264.0 L690.5 263.0 L690.5 248.0 L689.5 247.0 L688.5 240.0 L685.5 235.0 L685.5 233.0 L682.5 227.0 L676.5 220.0 L676.5 219.0 L675.0 218.5 L674.5 217.0 L673.0 215.5 L672.0 215.5 L670.5 214.0 L670.5 213.0 L669.0 212.5 L667.0 210.5 L664.0 209.5 L660.0 206.5 L658.0 206.5 L655.0 204.5 L652.0 204.5 L651.0 203.5 L639.0 203.5 L635.0 200.5 L634.0 200.5 L633.5 199.0 L632.0 198.5 L629.0 195.5 L626.0 194.5 L624.0 192.5 L620.0 190.5 L618.0 190.5 L616.0 188.5 L614.0 188.5 L610.0 185.5 L608.0 185.5 L601.0 181.5 L599.0 181.5 L594.0 178.5 L592.0 178.5 L588.0 175.5 L586.0 175.5 L581.0 171.5 L577.0 169.5 L576.5 168.0 L573.5 165.0 L572.5 163.0 L572.5 153.0 L571.5 152.0 L571.5 137.0 L572.5 136.0 L573.5 127.0 L575.5 124.0 L575.5 118.0 L576.5 117.0 L577.5 110.0 L578.5 109.0 L578.5 85.0 L576.5 82.0 L576.5 78.0 L575.5 77.0 L575.5 74.0 L573.5 72.0 L572.5 70.0 L572.5 68.0 L569.5 65.0 L569.5 64.0 L567.5 63.0 L566.5 61.0 L564.5 60.0 L564.5 59.0 L563.0 57.5 L557.0 54.5 L555.0 52.5 L552.0 52.5 L549.0 50.5 L545.0 50.5 L544.0 49.5 L536.0 49.5 L535.0 50.5 L531.0 50.5 L528.0 52.5 L523.0 53.5 L521.0 54.5 L517.0 58.5 L516.0 58.5 L510.5 64.0 L510.5 65.0 L508.5 67.0 L505.5 73.0 L505.5 75.0 L504.5 76.0 L504.5 78.0 L502.5 82.0 L502.5 91.0 L501.5 92.0 L501.5 96.0 L502.5 97.0 L502.5 111.0 L504.5 115.0 L504.5 120.0 L505.5 121.0 L505.5 126.0 L507.5 129.0 L507.5 133.0 L508.5 134.0 L508.5 139.0 L509.5 140.0 L509.5 154.0 L508.5 155.0 L508.5 164.0 L507.5 166.0 L503.0 170.5 L497.0 173.5 L496.0 175.5 L494.0 175.5 L489.0 178.5 L486.0 178.5 L484.0 180.5 L482.0 180.5 L478.0 182.5 L476.0 184.5 L473.0 184.5 L469.0 187.5 L467.0 187.5 L463.0 190.5 L461.0 190.5 L458.0 193.5 L455.0 194.5 L449.0 199.5 L448.0 199.5 L446.0 201.5 L442.0 203.5 L430.0 203.5 L429.0 204.5 L425.0 204.5 L420.0 207.5 L418.0 207.5 L415.0 210.5 L414.0 210.5 L407.0 216.5 L406.0 216.5 L404.5 218.0 L404.5 219.0 L400.5 223.0 L399.5 226.0 L396.5 229.0 L396.5 231.0 L393.5 236.0 L393.5 238.0 L391.5 241.0 L391.5 244.0 L390.5 245.0 L390.5 264.0 L391.5 265.0 L391.5 273.0 L390.5 274.0 L390.5 276.0 L388.5 278.0 L388.5 280.0 L387.5 282.0 L385.5 283.0 L384.5 288.0 L382.5 290.0 L381.5 295.0 L379.5 298.0 L379.5 304.0 L378.5 305.0 L378.5 312.0 L379.5 313.0 L379.5 320.0 L380.5 321.0 L380.5 324.0 L381.5 325.0 L381.5 327.0 L379.5 330.0 L379.5 339.0 L378.5 340.0 L378.5 345.0 L377.5 346.0 L377.5 350.0 L376.5 351.0 L376.5 354.0 L373.5 358.0 L372.5 363.0 L370.5 365.0 L370.5 368.0 L368.5 372.0 L368.5 376.0 L366.5 379.0 L366.5 382.0 L365.5 383.0 L365.5 394.0 L364.5 395.0 L364.5 419.0 L365.5 420.0 L365.5 430.0 L366.5 431.0 L366.5 435.0 L368.5 438.0 L368.5 445.0 L369.5 446.0 L369.5 452.0 L370.5 453.0 L370.5 457.0 L371.5 458.0 L371.5 489.0 L370.5 490.0 L370.5 500.0 L371.5 501.0 L371.5 505.0 L372.5 506.0 L372.5 544.0 L373.5 545.0 L373.5 548.0 L376.5 552.0 L377.5 554.0 L377.5 556.0 L380.5 560.0 L380.5 562.0 L382.5 565.0 L382.5 567.0 L387.0 571.5 L389.0 571.5 L391.0 572.5 L392.0 574.5 L394.0 574.5 L396.0 576.5 L399.0 577.5 L402.0 580.5 L406.0 582.5 L410.0 582.5 L412.0 584.5 L415.0 585.5 L415.5 583.0 L416.5 582.0 L415.5 580.0 L415.5 578.0 L409.5 572.0 L407.5 568.0 L405.5 567.0 L403.5 563.0 L403.5 561.0 L402.5 560.0 L402.5 557.0 L401.5 556.0 L401.5 542.0 L402.5 540.0 L404.0 539.5 L407.0 536.5 L409.5 537.0 L411.5 539.0 L411.5 542.0 L412.5 543.0 L412.5 548.0 L413.5 549.0 L413.5 552.0 L414.5 553.0 L414.5 555.0 L419.0 559.5 L422.0 559.5 L424.5 557.0 L424.5 550.0 L423.5 549.0 L423.5 546.0 L422.5 545.0 L422.5 543.0 L421.5 542.0 L421.5 539.0 L419.5 536.0 L419.5 532.0 L418.5 531.0 L418.5 525.0 L416.5 523.0 L415.5 521.0 L415.5 519.0 L413.5 517.0 L412.5 512.0 L411.5 510.0 L399.5 498.0 L398.5 496.0 L398.5 480.0 L400.5 477.0 L400.5 474.0 L401.5 473.0 L401.5 469.0 L403.5 466.0 L403.5 463.0 L404.5 462.0 L404.5 460.0 L406.5 458.0 L406.5 456.0 L409.5 451.0 L409.5 449.0 L411.5 447.0 L413.5 442.0 L415.5 440.0 L415.5 438.0 L418.5 434.0 L418.5 432.0 L421.5 428.0 L421.5 426.0 L422.5 425.0 L422.5 422.0 L423.5 421.0 L423.5 418.0 L425.5 414.0 L425.5 410.0 L426.5 409.0 L426.5 374.0 L427.5 373.0 L427.5 371.0 L428.5 370.0 L428.5 368.0 L429.5 366.0 L435.5 359.0 L436.5 356.0 L438.5 354.0 L438.5 352.0 L439.5 350.0 L441.5 348.0 L441.5 345.0 L443.5 342.0 L443.5 339.0 L444.5 338.0 L444.5 336.0 L446.5 333.0 L446.5 329.0 L448.0 327.5 L451.5 331.0 L452.5 334.0 L454.5 336.0 L454.5 338.0 L456.5 339.0 L456.5 340.0 L461.5 346.0 L461.5 347.0 L467.5 353.0 L468.5 355.0 L468.5 359.0 L470.5 362.0 L470.5 376.0 L468.5 380.0 L468.5 388.0 L467.5 389.0 L467.5 397.0 L468.5 398.0 L468.5 404.0 L470.5 408.0 L468.5 411.0 L468.5 418.0 L467.5 419.0 L467.5 424.0 L465.5 427.0 L465.5 433.0 L464.5 434.0 L463.5 441.0 L462.5 442.0 L462.5 444.0 L460.5 448.0 L460.5 451.0 L458.5 454.0 L458.5 456.0 L457.5 457.0 L457.5 460.0 L455.5 463.0 L455.5 465.0 L453.5 469.0 L453.5 471.0 L451.5 474.0 L451.5 477.0 L449.5 480.0 L449.5 483.0 L448.5 484.0 L448.5 488.0 L446.5 491.0 L446.5 495.0 L445.5 496.0 L445.5 498.0 L443.5 502.0 L443.5 506.0 L442.5 507.0 L442.5 512.0 L440.5 515.0 L440.5 519.0 L439.5 520.0 L439.5 523.0 L437.5 527.0 L437.5 532.0 L436.5 533.0 L436.5 537.0 L434.5 541.0 L434.5 548.0 L433.5 549.0 L433.5 555.0 L432.5 556.0 L432.5 560.0 L431.5 561.0 L431.5 592.0 L432.5 593.0 L432.5 596.0 L433.5 597.0 L433.5 603.0 L434.5 604.0 L434.5 608.0 L436.5 612.0 L437.5 619.0 L440.5 625.0 L440.5 628.0 L442.5 630.0 L442.5 632.0 L449.5 646.0 L449.5 651.0 L450.5 652.0 L450.5 655.0 L451.5 656.0 L451.5 699.0 L450.5 700.0 L449.5 705.0 L446.5 710.0 L446.5 713.0 L445.5 714.0 L445.5 716.0 L443.5 719.0 L442.5 726.0 L440.5 729.0 L440.5 735.0 L439.5 736.0 L439.5 741.0 L438.5 742.0 L438.5 768.0 L439.5 769.0 L439.5 775.0 L440.5 776.0 L440.5 783.0 L441.5 784.0 L441.5 786.0 L442.5 787.0 L442.5 790.0 L443.5 791.0 L443.5 797.0 L445.5 801.0 L445.5 804.0 L446.5 805.0 L446.5 812.0 L447.5 813.0 L447.5 815.0 L448.5 816.0 L448.5 820.0 L449.5 821.0 L449.5 829.0 L449.0 829.5 L446.5 829.0 L446.5 826.0 L445.5 825.0 L445.5 818.0 L443.5 814.0 L443.5 810.0 L442.5 809.0 L442.5 802.0 L440.5 798.0 L440.5 794.0 L439.5 793.0 L439.5 788.0 L438.5 787.0 L438.5 785.0 L437.5 784.0 L437.5 780.0 L436.5 779.0 L436.5 769.0 L435.5 768.0 L435.5 763.0 L434.5 762.0 L434.5 748.0 L435.5 747.0 L435.5 741.0 L436.5 740.0 L436.5 733.0 L437.5 732.0 L437.5 728.0 L439.5 725.0 L439.5 721.0 L441.5 717.0 L441.5 714.0 L444.5 709.0 L444.5 706.0 L447.5 700.0 L447.5 652.0 L444.5 646.0 L444.5 643.0 L442.5 641.0 L441.5 639.0 L441.5 637.0 L438.5 632.0 L438.5 630.0 L435.5 625.0 L435.5 622.0 L433.5 618.0 L433.5 614.0 L431.5 610.0 L431.5 606.0 L430.5 605.0 L430.5 597.0 L429.5 596.0 L429.5 593.0 L428.5 592.0 L428.5 560.0 L429.5 559.0 L429.5 555.0 L430.5 554.0 L430.5 545.0 L431.5 544.0 L431.5 540.0 L432.5 539.0 L432.5 532.0 L434.5 528.0 L434.5 526.0 L435.5 525.0 L435.5 519.0 L437.5 516.0 L437.5 513.0 L438.5 512.0 L438.5 507.0 L440.5 505.0 L440.5 502.0 L441.5 501.0 L441.5 496.0 L444.5 490.0 L444.5 486.0 L446.5 482.0 L446.5 479.0 L447.5 478.0 L447.5 476.0 L449.5 473.0 L449.5 470.0 L452.5 464.0 L452.5 461.0 L453.5 460.0 L453.5 458.0 L455.5 456.0 L455.5 452.0 L458.5 447.0 L458.5 443.0 L459.5 442.0 L459.5 440.0 L461.5 436.0 L461.5 432.0 L462.5 431.0 L462.5 428.0 L464.5 424.0 L464.5 417.0 L465.5 416.0 L465.5 410.0 L467.5 407.0 L465.5 405.0 L465.5 402.0 L464.5 401.0 L464.5 383.0 L465.5 382.0 L465.5 377.0 L466.5 376.0 L466.5 361.0 L465.5 360.0 L464.5 355.0 L462.5 354.0 L462.5 353.0 L454.5 344.0 L454.5 343.0 L450.5 338.0 L450.0 335.5 L448.5 336.0 L448.5 338.0 L445.5 344.0 L445.5 347.0 L443.5 349.0 L443.5 351.0 L440.5 355.0 L440.5 357.0 L439.5 359.0 L436.5 362.0 L434.5 366.0 L431.5 369.0 L431.5 372.0 L430.5 373.0 L430.5 378.0 L429.5 379.0 L429.5 407.0 L428.5 408.0 L428.5 415.0 L427.5 416.0 L427.5 419.0 L425.5 422.0 L425.5 425.0 L424.5 426.0 L424.5 428.0 L422.5 430.0 L422.5 433.0 L419.5 437.0 L419.5 439.0 L417.5 441.0 L417.5 443.0 L415.5 445.0 L411.5 453.0 L411.5 455.0 L408.5 459.0 L408.5 462.0 L406.5 465.0 L406.5 467.0 L405.5 468.0 L405.5 471.0 L403.5 475.0 L403.5 478.0 L402.5 479.0 L402.5 486.0 L401.5 487.0 L402.5 496.0 L414.5 508.0 L414.5 510.0 L417.5 514.0 L417.5 517.0 L419.5 521.0 L421.5 523.0 L421.5 526.0 L422.5 527.0 L422.5 532.0 L423.5 533.0 L423.5 538.0 L426.5 543.0 L426.5 551.0 L427.5 552.0 L427.5 559.0 L424.0 562.5 L419.0 562.5 L418.0 561.5 L416.0 561.5 L415.5 560.0 L413.5 559.0 L412.5 556.0 L410.5 554.0 L410.5 551.0 L409.5 550.0 L409.5 544.0 L408.0 541.5 L405.5 542.0 L405.5 548.0 L404.5 549.0 L404.5 553.0 L405.5 554.0 L405.5 559.0 L408.5 565.0 L414.5 570.0 L414.5 572.0 L415.5 574.0 L418.5 577.0 L419.5 579.0 L419.5 584.0 L418.5 586.0 L417.0 587.5 L415.0 587.5 L414.0 588.5 L410.0 586.5 L408.0 586.5 L405.0 584.5 L402.0 584.5 L400.0 583.5 L397.0 580.5 L396.0 580.5 L395.5 579.0 L394.0 578.5 L392.0 576.5 L389.0 575.5 L387.0 573.5 L384.0 573.5 L380.5 570.0 L375.5 560.0 L375.5 558.0 L372.5 554.0 L372.5 552.0 L369.5 548.0 L369.5 507.0 L367.5 504.0 L367.5 501.0 L366.5 500.0 L366.5 490.0 L367.5 489.0 L367.5 458.0 L366.5 457.0 L366.5 448.0 L364.5 444.0 L364.5 440.0 L363.5 439.0 L363.5 433.0 L362.5 432.0 L362.5 428.0 L361.5 427.0 L361.5 419.0 L360.5 418.0 L360.5 395.0 L361.5 394.0 L361.5 385.0 L363.5 381.0 L363.5 377.0 L364.5 376.0 L364.5 374.0 L366.5 370.0 L366.5 367.0 L370.5 359.0 L370.5 357.0 L372.5 355.0 L372.5 352.0 L374.5 350.0 L374.5 339.0 L375.5 338.0 L375.5 334.0 L376.5 333.0 L376.5 329.0 L377.5 328.0 L377.5 324.0 L376.5 323.0 L376.5 320.0 L375.5 319.0 L375.5 316.0 L374.5 315.0 L374.5 305.0 L375.5 304.0 L375.5 300.0 L376.5 299.0 L376.5 297.0 L377.5 296.0 L377.5 292.0 L380.5 287.0 L380.5 285.0 L382.5 283.0 L383.5 280.0 L386.5 276.0 L386.5 274.0 L389.5 270.0 L388.5 269.0 L387.5 262.0 L386.5 261.0 L386.5 248.0 L387.5 247.0 L387.5 244.0 L388.5 243.0 L388.5 241.0 L389.5 240.0 L389.5 236.0 L391.5 233.0 L391.5 231.0 L393.5 229.0 L395.5 224.0 L398.5 221.0 L398.5 220.0 L409.0 209.5 L410.0 209.5 L413.0 206.5 L415.0 206.5 L417.0 204.5 L419.0 203.5 L421.0 203.5 L427.0 200.5 L441.0 200.5 L445.0 197.5 L446.0 197.5 L447.0 195.5 L453.0 192.5 L456.0 189.5 L459.0 188.5 L461.0 186.5 L463.0 185.5 L465.0 185.5 L467.0 183.5 L469.0 182.5 L471.0 182.5 L473.0 180.5 L478.0 179.5 L480.0 177.5 L482.0 177.5 L487.0 174.5 L492.0 173.5 L494.0 171.5 L500.0 168.5 L504.5 164.0 L504.5 159.0 L505.5 158.0 L505.5 136.0 L503.5 133.0 L503.5 128.0 L502.5 127.0 L502.5 123.0 L500.5 119.0 L500.5 112.0 L499.5 111.0 L499.5 105.0 L498.5 104.0 L498.5 86.0 L499.5 85.0 L500.5 76.0 L502.5 73.0 L502.5 71.0 L505.5 65.0 L513.0 56.5 L514.0 56.5 L518.0 52.5 L526.0 48.5 L528.0 47.5 L532.0 47.5 L533.0 46.5 L545.0 46.5 L546.0 47.5 L551.0 47.5 L565.0 54.5 L571.5 61.0 L571.5 62.0 L574.5 65.0 L574.5 67.0 L576.5 69.0 L577.5 71.0 L577.5 73.0 L579.5 76.0 L579.5 78.0 L580.5 79.0 L580.5 85.0 L581.5 86.0 L581.5 107.0 L580.5 108.0 L580.5 117.0 L578.5 121.0 L578.5 124.0 L577.5 125.0 L577.5 130.0 L575.5 133.0 L575.5 137.0 L574.5 138.0 L574.5 152.0 L575.5 153.0 L575.5 161.0 L577.5 165.0 L579.0 165.5 L580.5 167.0 L580.5 168.0 L582.0 168.5 L584.0 170.5 L586.0 171.5 L588.0 171.5 L589.0 173.5 L594.0 174.5 L596.0 176.5 L598.0 176.5 L603.0 179.5 L608.0 180.5 L610.0 182.5 L612.0 182.5 L616.0 185.5 L618.0 185.5 L620.0 186.5 L622.0 188.5 L624.0 188.5 L626.0 189.5 L627.0 191.5 L630.0 192.5 L636.0 197.5 L637.0 197.5 L638.0 199.5 L650.0 199.5 L654.0 201.5 L657.0 201.5 L658.0 202.5 L660.0 202.5 L662.0 204.5 L669.0 207.5 L673.0 211.5 L674.0 211.5 L676.0 214.5 L677.0 214.5 L678.5 216.0 L678.5 217.0 L681.5 220.0 L683.5 224.0 L686.5 227.0 L686.5 229.0 L689.5 233.0 L689.5 236.0 L692.5 241.0 L692.5 248.0 L693.5 249.0 L693.5 264.0 L692.5 265.0 L692.5 272.0 L694.5 274.0 L695.5 277.0 L697.5 279.0 L700.5 285.0 L700.5 287.0 L704.5 294.0 L704.5 298.0 L706.5 301.0 L706.5 317.0 L705.5 318.0 L705.5 321.0 L704.5 322.0 L704.5 330.0 L706.5 334.0 L706.5 339.0 L707.5 340.0 L707.5 347.0 L710.5 352.0 L710.5 354.0 L713.5 358.0 L713.5 360.0 L716.5 366.0 L716.5 368.0 L718.5 370.0 L718.5 375.0 L719.5 376.0 L719.5 380.0 L720.5 381.0 L720.5 384.0 L721.5 385.0 L721.5 395.0 L722.5 396.0 L722.5 419.0 L721.5 420.0 L721.5 433.0 L720.5 434.0 L720.5 437.0 L719.5 438.0 L719.5 445.0 L718.5 446.0 L718.5 451.0 L717.5 452.0 L717.5 456.0 L716.5 457.0 L716.5 487.0 L717.5 488.0 L717.5 491.0 L718.5 492.0 L718.5 499.0 L716.5 503.0 L716.5 510.0 L715.5 511.0 L716.5 512.0 L716.5 543.0 L717.5 544.0 L716.5 545.0 L716.5 548.0 L710.5 560.0 L710.5 563.0 L707.5 567.0 L705.5 572.0 L704.0 572.5 L702.0 574.5 L701.0 574.5 L697.0 578.5 L692.0 580.5 L689.0 583.5 L687.0 583.5 L682.0 586.5 L680.0 586.5 L676.0 588.5 L671.5 586.0 L671.5 578.0 L677.0 571.5 L680.5 569.0 L680.5 567.0 L683.5 564.0 L685.5 560.0 L685.5 553.0 L686.5 552.0 L686.5 548.0 L685.5 547.0 L685.5 542.0 L683.0 540.5 L681.5 542.0 L681.5 550.0 L679.5 553.0 L679.5 555.0 L676.5 559.0 L676.5 560.0 L675.0 560.5 L673.0 562.5 L668.0 562.5 L666.0 561.5 L662.5 557.0 L662.5 554.0 L663.5 553.0 L663.5 549.0 L664.5 548.0 L664.5 544.0 L665.5 543.0 L665.5 539.0 L666.5 538.0 L666.5 535.0 L667.5 534.0 L667.5 525.0 L670.5 519.0 L670.5 517.0 L671.5 516.0 L671.5 513.0 L673.5 511.0 L675.5 506.0 L682.5 499.0 L683.5 497.0 L683.5 494.0 L684.5 493.0 L684.5 489.0 L683.5 488.0 L683.5 484.0 L682.5 483.0 L682.5 478.0 L680.5 475.0 L680.5 471.0 L677.5 465.0 L677.5 462.0 L674.5 457.0 L674.5 455.0 L671.5 451.0 L671.5 449.0 L669.5 447.0 L667.5 442.0 L665.5 440.0 L665.5 438.0 L662.5 435.0 L662.5 432.0 L660.5 430.0 L659.5 428.0 L659.5 426.0 L656.5 421.0 L656.5 418.0 L653.5 412.0 L653.5 404.0 L652.5 403.0 L652.5 388.0 L651.5 387.0 L651.5 373.0 L649.5 371.0 L649.5 369.0 L648.5 368.0 L648.5 366.0 L647.5 364.0 L645.5 362.0 L641.5 354.0 L639.5 352.0 L639.5 350.0 L634.5 340.0 L634.5 337.0 L633.0 335.5 L629.5 340.0 L629.5 341.0 L626.5 344.0 L626.5 345.0 L623.5 348.0 L623.5 349.0 L620.5 352.0 L620.5 353.0 L618.5 354.0 L617.5 359.0 L615.5 361.0 L615.5 377.0 L616.5 378.0 L616.5 381.0 L617.5 382.0 L617.5 399.0 L615.5 403.0 L615.5 413.0 L616.5 414.0 L616.5 418.0 L617.5 419.0 L618.5 426.0 L620.5 430.0 L621.5 439.0 L623.5 442.0 L624.5 449.0 L626.5 451.0 L626.5 453.0 L627.5 454.0 L627.5 457.0 L632.5 467.0 L633.5 472.0 L635.5 474.0 L635.5 478.0 L638.5 484.0 L638.5 490.0 L641.5 496.0 L642.5 503.0 L645.5 508.0 L645.5 513.0 L647.5 516.0 L647.5 522.0 L649.5 526.0 L649.5 529.0 L650.5 530.0 L650.5 533.0 L651.5 534.0 L651.5 537.0 L653.5 541.0 L653.5 550.0 L654.5 551.0 L654.5 556.0 L655.5 557.0 L655.5 563.0 L656.5 564.0 L656.5 585.0 L655.5 586.0 L655.5 591.0 L654.5 592.0 L654.5 598.0 L653.5 599.0 L653.5 605.0 L651.5 609.0 L651.5 612.0 L650.5 613.0 L650.5 617.0 L648.5 620.0 L648.5 622.0 L647.5 623.0 L647.5 626.0 L645.5 628.0 L644.5 633.0 L636.5 649.0 L636.5 653.0 L635.5 654.0 L635.5 660.0 L634.5 661.0 L634.5 664.0 L633.5 665.0 L634.5 666.0 L634.5 673.0 L633.5 674.0 L633.5 692.0 L634.5 693.0 L634.5 697.0 L635.5 698.0 L635.5 702.0 L636.5 703.0 L636.5 706.0 L639.5 711.0 L639.5 714.0 L642.5 720.0 L642.5 724.0 L644.5 727.0 L644.5 732.0 L645.5 733.0 L645.5 740.0 L646.5 741.0 L646.5 746.0 L647.5 747.0 L647.5 763.0 L646.5 764.0 L646.5 767.0 L645.5 768.0 L645.5 777.0 L644.5 778.0 L644.5 784.0 L642.5 788.0 L642.5 795.0 L641.5 796.0 L641.5 799.0 L639.5 803.0 L639.5 810.0 L638.5 811.0 L638.5 814.0 L636.5 817.0 L636.5 824.0 L635.5 825.0 L635.0 829.5 Z M589.0 829.5 L585.5 829.0 L585.5 826.0 L584.5 825.0 L584.5 820.0 L583.5 819.0 L583.5 812.0 L581.5 808.0 L580.5 803.0 L578.5 801.0 L577.5 799.0 L577.5 797.0 L575.5 795.0 L574.5 793.0 L574.5 791.0 L571.5 786.0 L571.5 783.0 L568.5 777.0 L568.5 772.0 L567.5 771.0 L567.5 768.0 L566.5 767.0 L566.5 750.0 L567.5 749.0 L567.5 744.0 L568.5 743.0 L568.5 736.0 L569.5 735.0 L569.5 731.0 L571.5 727.0 L571.5 721.0 L572.5 720.0 L572.5 715.0 L574.5 712.0 L574.5 707.0 L575.5 706.0 L575.5 702.0 L571.5 694.0 L571.5 691.0 L569.5 689.0 L568.5 684.0 L565.5 678.0 L565.5 674.0 L564.5 673.0 L564.5 671.0 L563.5 670.0 L563.5 667.0 L562.5 666.0 L562.5 659.0 L560.5 655.0 L560.5 645.0 L559.5 644.0 L559.5 634.0 L558.5 633.0 L558.5 631.0 L556.5 627.0 L556.5 623.0 L554.5 620.0 L553.5 613.0 L551.5 610.0 L550.5 605.0 L548.5 602.0 L547.5 597.0 L545.5 594.0 L544.5 587.0 L542.5 584.0 L542.5 579.0 L541.0 576.5 L540.5 580.0 L538.5 584.0 L538.5 588.0 L537.5 589.0 L537.5 592.0 L535.5 595.0 L535.5 597.0 L534.5 598.0 L534.5 601.0 L532.5 603.0 L532.5 606.0 L531.5 607.0 L531.5 609.0 L529.5 611.0 L529.5 614.0 L526.5 620.0 L525.5 627.0 L523.5 630.0 L523.5 635.0 L522.5 636.0 L522.5 642.0 L521.5 643.0 L521.5 658.0 L520.5 659.0 L520.5 662.0 L519.5 663.0 L519.5 667.0 L518.5 668.0 L518.5 675.0 L516.5 677.0 L516.5 679.0 L515.5 680.0 L515.5 684.0 L512.5 689.0 L512.5 692.0 L510.5 694.0 L509.5 696.0 L509.5 698.0 L506.5 703.0 L506.5 713.0 L507.5 714.0 L507.5 717.0 L509.5 719.0 L509.5 725.0 L510.5 726.0 L510.5 729.0 L511.5 730.0 L511.5 732.0 L512.5 733.0 L512.5 740.0 L513.5 741.0 L513.5 746.0 L514.5 747.0 L514.5 750.0 L515.5 751.0 L515.5 764.0 L514.5 765.0 L514.5 771.0 L513.5 772.0 L512.5 781.0 L510.5 783.0 L509.5 788.0 L503.5 799.0 L503.5 801.0 L501.5 803.0 L500.5 808.0 L498.5 810.0 L498.5 816.0 L497.5 817.0 L497.5 822.0 L496.5 823.0 L496.5 826.0 L495.5 827.0 L495.5 829.0 L495.0 829.5 L492.5 829.0 L492.5 827.0 L493.5 826.0 L493.5 818.0 L495.5 814.0 L495.5 810.0 L496.5 809.0 L496.5 806.0 L505.5 789.0 L505.5 787.0 L506.5 785.0 L508.5 783.0 L508.5 779.0 L509.5 778.0 L509.5 776.0 L510.5 775.0 L510.5 771.0 L511.5 770.0 L511.5 749.0 L510.5 748.0 L510.5 741.0 L508.5 737.0 L508.5 731.0 L507.5 730.0 L507.5 727.0 L505.5 724.0 L505.5 718.0 L504.5 717.0 L504.5 714.0 L503.5 713.0 L503.5 711.0 L502.5 710.0 L502.5 705.0 L505.5 700.0 L505.5 697.0 L508.5 693.0 L508.5 690.0 L510.5 688.0 L510.5 686.0 L511.5 685.0 L511.5 682.0 L513.5 680.0 L514.5 671.0 L516.5 667.0 L516.5 660.0 L517.5 659.0 L517.5 653.0 L518.5 652.0 L518.5 647.0 L519.5 646.0 L519.5 633.0 L520.5 632.0 L520.5 629.0 L522.5 627.0 L522.5 623.0 L523.5 622.0 L523.5 619.0 L525.5 616.0 L525.5 613.0 L527.5 610.0 L527.5 607.0 L530.5 602.0 L530.5 599.0 L533.5 594.0 L533.5 590.0 L534.5 589.0 L534.5 587.0 L536.5 583.0 L536.5 578.0 L537.5 577.0 L537.5 575.0 L538.5 574.0 L538.5 570.0 L539.5 569.0 L539.5 561.0 L541.0 559.5 L541.5 563.0 L542.5 564.0 L542.5 567.0 L543.5 568.0 L543.5 575.0 L544.5 576.0 L544.5 579.0 L546.5 582.0 L546.5 587.0 L547.5 588.0 L547.5 590.0 L549.5 592.0 L549.5 595.0 L552.5 601.0 L552.5 604.0 L554.5 606.0 L554.5 608.0 L555.5 609.0 L555.5 612.0 L558.5 618.0 L558.5 621.0 L561.5 627.0 L562.5 636.0 L563.5 637.0 L563.5 643.0 L564.5 644.0 L564.5 656.0 L565.5 657.0 L565.5 663.0 L567.5 667.0 L568.5 676.0 L570.5 679.0 L570.5 682.0 L574.5 690.0 L575.5 695.0 L578.5 700.0 L578.5 711.0 L577.5 712.0 L577.5 715.0 L575.5 718.0 L575.5 724.0 L574.5 725.0 L573.5 734.0 L572.5 735.0 L572.5 738.0 L571.5 739.0 L571.5 745.0 L570.5 746.0 L570.5 769.0 L571.5 770.0 L571.5 774.0 L573.5 777.0 L573.5 781.0 L574.5 782.0 L574.5 784.0 L576.5 786.0 L576.5 789.0 L579.5 793.0 L579.5 795.0 L581.5 798.0 L581.5 800.0 L584.5 804.0 L584.5 809.0 L586.5 812.0 L586.5 815.0 L587.5 816.0 L587.5 823.0 L588.5 824.0 L588.5 827.0 L589.5 828.0 L589.0 829.5 Z";
const BODY_FIGURE_IMAGE="data:image/jpeg;base64,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";
let bodyFigureSelected=null;
function setupBodySidesForm(){
 const sheet=document.getElementById('body-sheet');if(!sheet||sheet.dataset.figureForm==='1')return;
 const fieldOrder=['neck','weight','chest','shoulders','bicepRight','bicepLeft','forearmRight','forearmLeft','glutes','waist','thighRight','thighLeft','calfRight','calfLeft'];
 const fields=fieldOrder.map(key=>`<div class="sheet-field"><label for="sb-${key}">${BODY_SIDE_METRICS[key]}, ${key==='weight'?'кг':'см'}</label><input id="sb-${key}" type="number" inputmode="decimal" step="0.1" min="0.1" max="999"></div>`).join('');
 sheet.classList.add('body-figure-sheet');
 sheet.innerHTML=`<div class="sheet-handle"></div><div class="bf-content" style="padding-top:12px"><div class="sheet-field"><input id="sb-date" type="date" aria-label="Дата замера"></div><section class="bf-card"><div class="bf-stage"><img class="bf-image" alt="Манекен для выбора показателя" src="${BODY_FIGURE_IMAGE}"><div class="bf-wash"></div><style>
#body-sheet .bf-muscles{position:absolute;inset:0;width:100%;height:100%;z-index:2;pointer-events:none}
#body-sheet .bf-muscle{fill:transparent;stroke:transparent;stroke-width:1.6;vector-effect:non-scaling-stroke;pointer-events:all;cursor:pointer;stroke-linejoin:round;stroke-linecap:round;outline:none}
#body-sheet .bf-muscle.active{fill:rgba(255,30,40,.32);stroke:#ff303b;stroke-width:2}
#body-sheet .bf-muscle.shorts{pointer-events:stroke;stroke-width:14}
#body-sheet .bf-muscle.shorts.active{fill:none;stroke:#ff303b;stroke-width:2.4}
#body-sheet .bf-muscle:focus-visible{stroke:#fff}
#body-sheet .bf-label.active{border-color:#ff303b;box-shadow:0 0 0 1px #ff303b;color:#ff555e}
#body-sheet .bf-shorts-hit{fill:transparent;stroke:none;pointer-events:all;cursor:pointer}
</style><svg class="bf-muscles" viewBox="140 30 800 800" preserveAspectRatio="xMidYMid meet" role="group" aria-label="Выбор области тела"></svg><div class="bf-labels"></div></div><div class="bf-control-row"><div class="bf-editor"><div class="bf-editor-info"><label id="bf-selected-label" for="body-figure-value">Л · Бицепс</label><div><input id="body-figure-value" type="number" inputmode="decimal" step="0.1" min="0.1" max="999"><small id="bf-unit">см</small></div></div><button class="bf-step" type="button" onclick="stepBodyFigure(-0.1)" aria-label="Уменьшить на 0,1 см">−</button><button class="bf-step" type="button" onclick="stepBodyFigure(0.1)" aria-label="Увеличить на 0,1 см">+</button></div><button type="button" id="body-voice-button" class="bm-voice-button" aria-pressed="false" aria-label="Заполнить голосом" title="Заполнить голосом" onclick="startBodyVoice()"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0M12 17v4M8 21h8"/></svg><span class="bf-mic-label">Заполнить голосом</span></button></div><button type="button" class="bf-clear" onclick="clearBodyFigure()">Очистить выбранный замер</button></section><div id="body-voice-panel"><p id="body-voice-status" role="status" aria-live="polite"></p></div><details class="bf-all-fields"><summary>Все поля списком</summary><div class="body-measurements-fields">${fields}</div></details></div><footer class="bf-footer"><button type="button" class="sheet-add-btn" onclick="addBody()">Сохранить замер</button></footer>`;
 sheet.dataset.figureForm='1';
 sheet.addEventListener('input',event=>{
  const input=event.target;
  if(input&&input.type==='number'&&Number(input.value)>999)input.value='999';
  if(input.id==='body-figure-value'){
   const target=bodyFigureSelected?document.getElementById('sb-'+bodyFigureSelected):null;if(target){target.value=input.value;renderBodyFigure(false);}
  }else if(input.id&&input.id.startsWith('sb-'))renderBodyFigure(true);
 });
 new MutationObserver(()=>{if(!sheet.classList.contains('show'))stopBodyVoice();}).observe(sheet,{attributes:true,attributeFilter:['class']});
 renderBodyFigure();
}
function renderBodyFigure(syncEditor=true){
 const sheet=document.getElementById('body-sheet');if(!sheet||sheet.dataset.figureForm!=='1')return;
 const getValue=key=>{const raw=document.getElementById('sb-'+key)?.value;return raw!==''&&raw!==undefined&&Number.isFinite(Number(raw))?Number(raw).toLocaleString('ru-RU'):'—';};
 sheet.querySelector('.bf-labels').innerHTML=BODY_FIGURE_POSITIONS.map(([key,side,y])=>`<button type="button" class="bf-label ${side} ${key===bodyFigureSelected?'active':''}" style="top:${y}%" data-key="${key}" aria-pressed="${key===bodyFigureSelected}" onclick="selectBodyFigure(this.dataset.key)"><span>${BODY_SIDE_METRICS[key]}</span><strong>${getValue(key)}</strong></button>`).join('');
 sheet.querySelector('.bf-muscles').innerHTML='<path class="bf-shorts-hit" d="M468 417 Q540 435 612 417 L644 507 L540 534 L441 507 Z" onclick="selectBodyFigure(&quot;glutes&quot;)" aria-hidden="true"/>'+`<path class="bf-silhouette ${bodyFigureSelected==='weight'?'active':''}" d="${BODY_SILHOUETTE_PATH}" fill-rule="evenodd" aria-hidden="true"/><ellipse class="bf-head-hit" cx="540" cy="102" rx="38" ry="54" role="button" tabindex="0" aria-label="Вес" aria-pressed="${bodyFigureSelected==='weight'}" onclick="selectBodyFigure(&quot;weight&quot;)" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();selectBodyFigure('weight')}"/>`+BODY_FIGURE_POSITIONS.filter(([key])=>key!=='weight').map(([key])=>`<path class="bf-muscle ${key==='glutes'?'shorts':''} ${key===bodyFigureSelected?'active':''}" d="${BODY_MUSCLE_PATHS[key]}" ${['bicepLeft','forearmLeft','thighLeft','calfLeft'].includes(key)?'transform="translate(1080 0) scale(-1 1)"':''} data-key="${key}" role="button" tabindex="0" aria-label="${BODY_SIDE_METRICS[key]}" aria-pressed="${key===bodyFigureSelected}" onclick="selectBodyFigure(this.dataset.key)" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();selectBodyFigure(this.dataset.key)}"><title>${BODY_SIDE_METRICS[key]}</title></path>`).join('');
 const label=document.getElementById('bf-selected-label');if(label)label.textContent=bodyFigureSelected?BODY_SIDE_METRICS[bodyFigureSelected]:'Выберите замер';
 const unitEl=document.getElementById('bf-unit');if(unitEl)unitEl.textContent=bodyFigureSelected==='weight'?'кг':'см';
 const editorEl=document.getElementById('body-figure-value');if(editorEl){editorEl.disabled=!bodyFigureSelected;}
 if(syncEditor){const editor=document.getElementById('body-figure-value');if(editor)editor.value=bodyFigureSelected?(document.getElementById('sb-'+bodyFigureSelected)?.value||''):'';}
}
function selectBodyFigure(key){
 if(!BODY_FIGURE_POSITIONS.some(row=>row[0]===key))return;
 bodyFigureSelected=bodyFigureSelected===key?null:key;renderBodyFigure();
}
function stepBodyFigure(delta){
 if(!bodyFigureSelected)return;
 const input=document.getElementById('sb-'+bodyFigureSelected);if(!input)return;
 const previous=input.value===''?0:Number(input.value);if(!Number.isFinite(previous))return;
 input.value=String(Math.round(Math.min(999,Math.max(.1,previous+delta))*10)/10);input.dispatchEvent(new Event('input',{bubbles:true}));
}
function clearBodyFigure(){
 if(!bodyFigureSelected)return;
 const input=document.getElementById('sb-'+bodyFigureSelected);if(!input)return;
 input.value='';input.dispatchEvent(new Event('input',{bubbles:true}));
}
window.selectBodyFigure=selectBodyFigure;window.stepBodyFigure=stepBodyFigure;window.clearBodyFigure=clearBodyFigure;
function parseBodyDictation(text,selectedKey){
 const numbers={ноль:0,один:1,одна:1,два:2,две:2,три:3,четыре:4,пять:5,шесть:6,семь:7,восемь:8,девять:9,десять:10,одиннадцать:11,двенадцать:12,тринадцать:13,четырнадцать:14,пятнадцать:15,шестнадцать:16,семнадцать:17,восемнадцать:18,девятнадцать:19,двадцать:20,тридцать:30,сорок:40,пятьдесят:50,шестьдесят:60,семьдесят:70,восемьдесят:80,девяносто:90,сто:100,двести:200,триста:300};
 const words=Object.keys(numbers).sort((a,b)=>b.length-a.length).join('|');
 let normalized=String(text).toLowerCase().replace(/ё/g,'е');
 normalized=normalized.replace(new RegExp('(^|[^а-я])((?:'+words+')(?![а-я])'+String.raw`(?:\s+(?:`+words+')(?![а-я]))*)','g'),(m,pre,seq)=>pre+String(seq.split(/\s+/).reduce((n,w)=>n+numbers[w],0)));
 normalized=normalized.replace(/(\d+)\s*(?:запятая|точка|целых|целая)\s*(\d+)/g,'$1.$2');
 const aliases={weight:'вес',neck:'ше(?:я|ю|и|е|йные|йный|йная)',shoulders:'плечи|плеч|плечевой пояс|плечо|плечах|дельты',chest:'груд(?:ь|и|ью|ные|ных|ная|ной|ному)(?: клетк(?:а|и|е|у))?',waist:'тали(?:я|ю|и|е)|живот',glutes:'ягодиц(?:ы|а|ах)?|попа|попу'};
 const values={};
 Object.entries(aliases).forEach(([key,names])=>{const m=normalized.match(new RegExp('(?:'+names+')'+String.raw`\s*(?:[:=]|составляет)?\s*(\d+(?:[.,]\d+)?)`));if(m){const n=Number(m[1].replace(',','.'));if(n>0&&n<=(key==='weight'?500:300))values[key]=n;}});
 const paired={bicep:'бицепс(?:а|е|ом|ы)?|бицуха|бицухи',forearm:'предплечь(?:е|я|ю|и|ем)',thigh:'бедр(?:о|а|у|е|ом)|бедер|ляжк(?:а|и|у)',calf:'голен(?:ь|и|ью)|икр(?:а|ы|у)|икроножн(?:ая|ой|ую)'};
 Object.entries(paired).forEach(([key,part])=>{
  {
   const both='(?:об(?:а|е|оих|еих)|лев[а-я]*\\s+(?:и\\s+)?прав[а-я]*|прав[а-я]*\\s+(?:и\\s+)?лев[а-я]*|с\\s+обеих\\s+сторон|слева\\s+и\\s+справа|справа\\s+и\\s+слева)';
   const numRe=String.raw`\s*(?:[:=]|составляет)?\s*(\d+(?:[.,]\d+)?)`;
   const bm=normalized.match(new RegExp(both+String.raw`\s+(?:`+part+')'+numRe))||normalized.match(new RegExp('(?:'+part+')'+String.raw`\s+`+both+numRe));
   if(bm){const n=Number(bm[1].replace(',','.'));if(n>0&&n<=300){values[key+'Left']=n;values[key+'Right']=n;}}
  }
  [['Left','лев(?:ый|ая|ое|ую|ого|ой|ом|ым|ые)|слева'],['Right','прав(?:ый|ая|ое|ую|ого|ой|ом|ым|ые)|справа']].forEach(([suffix,side])=>{
   const prefix=new RegExp('(?:'+side+')'+String.raw`\s+(?:`+part+')'+String.raw`\s*(?:[:=]|составляет)?\s*(\d+(?:[.,]\d+)?)`);
   const postfix=new RegExp('(?:'+part+')'+String.raw`\s+(?:`+side+')'+String.raw`\s*(?:[:=]|составляет)?\s*(\d+(?:[.,]\d+)?)`);
   const m=normalized.match(prefix)||normalized.match(postfix);if(m){const n=Number(m[1].replace(',','.'));if(n>0&&n<=300)values[key+suffix]=n;}
  });

 });
 if(selectedKey){
  const base=selectedKey.replace(/(Left|Right)$/,''),sideless=paired[base];
  if(sideless&&selectedKey!==base&&values[selectedKey]===undefined){
   const m=normalized.match(new RegExp('(?:'+sideless+')'+String.raw`\s*(?:[:=]|составляет)?\s*(\d+(?:[.,]\d+)?)`));
   if(m){const n=Number(m[1].replace(',','.'));if(n>0&&n<=300)values[selectedKey]=n;}
  }
  if(!Object.keys(values).some(k=>k!=='weight')&&values[selectedKey]===undefined){
   const m=normalized.match(/\d+(?:[.,]\d+)?/);
   if(m){const n=Number(m[0].replace(',','.'));if(n>0&&n<=(selectedKey==='weight'?500:300))values[selectedKey]=n;}
  }
 }
 return values;
}
function stopBodyVoice(){
 const s=bodyVoiceSession;bodyVoiceSession=null;if(s){clearTimeout(s.timer);try{s.rec.abort();}catch(e){}}
 const b=document.getElementById('body-voice-button');if(b){b.classList.remove('is-listening','listening');b.setAttribute('aria-pressed','false');b.querySelector('span').textContent='Заполнить голосом';b.setAttribute('aria-label','Заполнить голосом');}
}
function startBodyVoice(){
 if(bodyVoiceSession){stopBodyVoice();return;}
 const status={},button=document.getElementById('body-voice-button'),SR=window.SpeechRecognition||window.webkitSpeechRecognition;
 if(!SR){toast('Распознавание речи недоступно. Введите значения вручную');return;}
 const rec=new SR(),s={rec,timer:null};bodyVoiceSession=s;rec.lang='ru-RU';rec.interimResults=false;rec.continuous=false;
 button.setAttribute('aria-pressed','true');button.classList.add('is-listening','listening');button.querySelector('span').textContent='Остановить запись';button.setAttribute('aria-label','Остановить запись');status.textContent=(bodyFigureSelected?'Слушаю… Назови число для выбранного замера.':'Слушаю… Назови замер и число, для парных — сторону.');
 rec.onresult=event=>{
  if(bodyVoiceSession!==s||!document.getElementById('body-sheet')?.classList.contains('show'))return;
  const text=Array.from(event.results).filter(r=>r.isFinal).map(r=>r[0].transcript).join(' '),values=parseBodyDictation(text,bodyFigureSelected);
  Object.entries(values).forEach(([key,value])=>{const input=document.getElementById('sb-'+key);if(input){input.value=value;input.dispatchEvent(new Event('input',{bubbles:true}));}});
  status.textContent=Object.keys(values).length?'Распознано: «'+text+'». Проверь поля и сохрани замер кнопкой ниже.':(bodyFigureSelected?'Не расслышал число. Скажи, например: «38,5».':'Выбери замер на фигуре и скажи число или назови замер: «Левый бицепс 38, правый бицепс 39».');
 };
 rec.onerror=e=>{if(bodyVoiceSession===s&&e.error==='not-allowed')toast('Нет доступа к микрофону');if(bodyVoiceSession===s)status.textContent=e.error==='not-allowed'?'Нет доступа к микрофону. Разреши доступ или заполни вручную.':'Не удалось распознать речь. Повтори или введи значения вручную.';};
 rec.onend=()=>{if(bodyVoiceSession===s)stopBodyVoice();};s.timer=setTimeout(()=>{if(bodyVoiceSession===s)stopBodyVoice();},25000);
 try{rec.start();}catch(e){stopBodyVoice();toast('Не удалось включить микрофон');}
}
window.startBodyVoice=startBodyVoice;
