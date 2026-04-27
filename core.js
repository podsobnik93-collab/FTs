// core.js — Ядро FitSim: переменные, утилиты, профиль, вода, инициализация
// FIX applied: #2 (формула симуляции), #10 (calcBMR), #1 (двойной запуск напоминаний)

// ==================== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ====================
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

// Единая база упражнений (заполняется в workout.js, но объявляем здесь)
let ALL_EXERCISES = {};

// ==================== УТИЛИТЫ ====================
function toast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg; t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 1800);
}
window.toast = toast;

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
window.closeAllSheets = closeAllSheets;

// ==================== ТЕМА ====================
let isDark = localStorage.getItem('fs-theme') !== 'light';
function applyTheme() {
  document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  const btn = document.getElementById('theme-btn');
  if (btn) btn.textContent = isDark ? '☀️' : '🌙';
  localStorage.setItem('fs-theme', isDark ? 'dark' : 'light');
}
function toggleTheme() {
  isDark = !isDark;
  applyTheme();
  toast(isDark ? '🌙 Тёмная тема' : '☀️ Светлая тема');
}
window.toggleTheme = toggleTheme;
applyTheme();

// ==================== ПРОФИЛЬ ====================
function loadProfileToForm() {
  if (!profile) return;
  document.getElementById('p-name').value     = profile.name     || 'Атлет';
  document.getElementById('p-age').value      = profile.age      || 25;
  document.getElementById('p-weight').value   = profile.weight   || 75;
  document.getElementById('p-height').value   = profile.height   || 175;
  document.getElementById('p-gender').value   = profile.gender   || 'male';
  document.getElementById('p-activity').value = profile.activity || 1.55;
  document.getElementById('p-goal').value     = profile.goal     || 'maintain';
  document.getElementById('p-target').value   = profile.target   || 70;
  document.getElementById('p-weeks').value    = profile.weeks    || 12;
  renderDietPrefs();
}
window.loadProfileToForm = loadProfileToForm;

function validateProfileInput(age, weight, height) {
  if (age < 10 || age > 120) {
    toast('❗ Возраст должен быть от 10 до 120 лет');
    return false;
  }
  if (weight < 20 || weight > 300) {
    toast('❗ Вес должен быть от 20 до 300 кг');
    return false;
  }
  if (height < 100 || height > 250) {
    toast('❗ Рост должен быть от 100 до 250 см');
    return false;
  }
  return true;
}

function saveProfile() {
  const _age    = +document.getElementById('p-age').value;
  const _weight = +document.getElementById('p-weight').value;
  const _height = +document.getElementById('p-height').value;
  if (!validateProfileInput(_age, _weight, _height)) return;

  const oldProfile = profile || {};
  profile = {
    name:      document.getElementById('p-name').value.trim() || oldProfile.name || 'Атлет',
    age:       +document.getElementById('p-age').value      || oldProfile.age      || 25,
    weight:    +document.getElementById('p-weight').value   || oldProfile.weight   || 75,
    height:    +document.getElementById('p-height').value   || oldProfile.height   || 175,
    gender:    document.getElementById('p-gender').value,
    activity:  +document.getElementById('p-activity').value,
    goal:      document.getElementById('p-goal').value,
    target:    +document.getElementById('p-target').value   || oldProfile.target   || 70,
    weeks:     +document.getElementById('p-weeks').value    || oldProfile.weeks    || 12,
    dietPrefs: oldProfile.dietPrefs || [],
  };
  localStorage.setItem('fs-profile', JSON.stringify(profile));
  prefillSim();
  toast('✅ Профиль сохранён');
  setTimeout(() => goTo('stats', '📊 Статистика'), 500);
}
window.saveProfile = saveProfile;

// FIX #10 — calcBMR: заменён ненадёжный паттерн +(p.weight)||75
// на явную проверку Number(p.weight) > 0, чтобы корректно
// обрабатывать граничные случаи. Добавлен комментарий о формуле.
function calcBMR(p) {
  // Формула Миффлина-Сан Жеора
  const w = Number(p.weight) > 0 ? Number(p.weight) : 75;
  const h = Number(p.height) > 0 ? Number(p.height) : 175;
  const a = Number(p.age)    > 0 ? Number(p.age)    : 25;
  const base = 10 * w + 6.25 * h - 5 * a;
  return p.gender === 'male' ? base + 5 : base - 161;
}

// ==================== ВОДА ====================
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
  document.getElementById('water-goal').textContent    = '/ ' + goal + ' мл';
  const pct = Math.min(100, (waterData.amount / goal) * 100);
  document.getElementById('water-bar-fill').style.width = pct + '%';
  renderWaterWeek();
}
window.renderWater = renderWater;

function addWater(amount) {
  if (!amount || isNaN(amount)) return;
  waterData.amount += amount;
  if (waterData.amount < 0) waterData.amount = 0;
  localStorage.setItem('fs-water', JSON.stringify(waterData));
  renderWater();
  toast(amount > 0
    ? '💧 +' + amount + ' мл'
    : '🔙 Убрано ' + Math.abs(amount) + ' мл'
  );
}
window.addWater = addWater;

function renderWaterWeek() {
  const el = document.getElementById('water-week-chart');
  if (!el || !profile) return;
  const today = new Date();
  const days  = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateStrISO = d.toISOString().split('T')[0];
    const inHistory  = waterHistory.find(h => h.date === dateStrISO);
    const isToday    = (i === 0);
    const amount     = isToday ? waterData.amount : (inHistory ? inHistory.amount : 0);
    const weekDay    = d.toLocaleDateString('ru-RU', { weekday: 'short' });
    days.push({ label: weekDay, amount, isToday });
  }
  const goal = profile.weight ? Math.round(profile.weight * 30) : 2000;
  const maxA = Math.max(...days.map(d => d.amount), goal, 1);
  const bars = days.map(d => {
    const pct     = Math.min(100, Math.round(d.amount / maxA * 100));
    const reached = d.amount >= goal;
    const color   = d.isToday
      ? 'var(--accent)'
      : (reached ? '#29b6f6' : 'var(--border)');
    const amtLabel = d.amount > 0
      ? (d.amount >= 1000
          ? (d.amount / 1000).toFixed(1) + 'л'
          : d.amount + 'мл')
      : '';
    return `
      <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:2px;">
        <div style="font-size:9px;color:var(--text-light);font-weight:600;
                    height:14px;line-height:14px;">${amtLabel}</div>
        <div style="flex:1;width:100%;background:var(--input-bg);border-radius:4px;
                    overflow:hidden;min-height:44px;display:flex;align-items:flex-end;">
          <div style="width:100%;height:${pct}%;background:${color};border-radius:4px;
                      min-height:${d.amount > 0 ? 3 : 0}px;transition:height .4s;"></div>
        </div>
        <div style="font-size:9px;
                    font-weight:${d.isToday ? 700 : 400};
                    color:${d.isToday ? 'var(--accent)' : 'var(--text-light)'};">
          ${d.label}
        </div>
      </div>`;
  }).join('');
  el.innerHTML = `
    <div style="font-size:11px;color:var(--text-light);
                font-weight:600;margin-bottom:6px;">💧 За 7 дней</div>
    <div style="display:flex;gap:4px;height:80px;">${bars}</div>`;
}

// ==================== НАПОМИНАНИЯ О ВОДЕ ====================
function requestNotificationPermission() {
  if (!('Notification' in window)) {
    toast('Ваш браузер не поддерживает уведомления');
    return false;
  }
  if (Notification.permission === 'granted') return true;
  if (Notification.permission !== 'denied') {
    // FIX #1 — убран прямой вызов startWaterReminders() здесь.
    // startWaterReminders() вызывается только внутри .then()
    // после подтверждения разрешения, чтобы избежать двойного
    // запуска интервала при инициализации.
    Notification.requestPermission().then(perm => {
      if (perm === 'granted') {
        toast('Уведомления разрешены');
        startWaterReminders();
      } else {
        toast('Уведомления отклонены');
        updateReminderUI();
      }
    });
    return false;
  }
  toast('Уведомления заблокированы');
  return false;
}

function startWaterReminders() {
  if (!('Notification' in window)) return;
  // FIX #1 — убрана рекурсия: startWaterReminders() больше не вызывает
  // requestNotificationPermission(), которая в свою очередь вызывала
  // startWaterReminders(). Теперь если разрешения нет — просто выходим.
  if (Notification.permission !== 'granted') return;
  if (reminderInterval) clearInterval(reminderInterval);
  reminderInterval = setInterval(() => {
    showWaterReminder();
  }, 2 * 60 * 60 * 1000);
  localStorage.setItem('waterReminderEnabled', 'true');
  reminderEnabled = true;
  toast('Напоминания о воде включены');
  updateReminderUI();
}

function stopWaterReminders() {
  if (reminderInterval) {
    clearInterval(reminderInterval);
    reminderInterval = null;
  }
  localStorage.setItem('waterReminderEnabled', 'false');
  reminderEnabled = false;
  toast('Напоминания о воде отключены');
  updateReminderUI();
}

function showWaterReminder() {
  if (Notification.permission !== 'granted') return;
  new Notification('💧 Пора выпить воду!', {
    body: 'Не забывайте пить воду для поддержания гидратации.',
    icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' " +
          "viewBox='0 0 24 24' fill='%234fc3f7'%3E%3Cpath d='M12 2c-1.1 0-2 " +
          ".9-2 2v2.5c0 .8.7 1.5 1.5 1.5s1.5-.7 1.5-1.5V4c0-1.1-.9-2-2-2zm0 " +
          "8c-2.2 0-4 1.8-4 4s1.8 4 4 4 4-1.8 4-4-1.8-4-4-4z'/%3E%3C/svg%3E"
  });
}

function toggleWaterReminders() {
  if (reminderEnabled) stopWaterReminders();
  else startWaterReminders();
}
window.toggleWaterReminders = toggleWaterReminders;

function updateReminderUI() {
  const btn = document.getElementById('reminder-toggle');
  if (!btn) return;
  if (reminderEnabled && Notification.permission === 'granted') {
    btn.textContent        = '🔔 Напоминания вкл';
    btn.style.background   = 'var(--accent)';
    btn.style.color        = '#fff';
  } else {
    btn.textContent        = '🔕 Включить напоминания';
    btn.style.background   = 'var(--input-bg)';
    btn.style.color        = 'var(--text)';
  }
}

// ==================== СИМУЛЯЦИЯ ====================
function prefillSim() {
  if (!profile) return;
  document.getElementById('sim-start').value  = profile.weight;
  document.getElementById('sim-target').value = profile.target;
  document.getElementById('sim-weeks').value  = profile.weeks;
}

// FIX #2 — Исправлена формула симуляции:
// 1. deficit/7700 давало изменение веса за ДЕНЬ, а цикл шёл по НЕДЕЛЯМ
//    → добавлено умножение на 7 (weeklyKcal = deficit * 7)
// 2. Логика поправки на тренировки сохранена, но вынесена в читаемый вид
// 3. Переменная deficit переименована в dailyDelta для ясности:
//    отрицательное значение = дефицит (похудение),
//    положительное значение = профицит (набор массы)
function runSimulation() {
  const start      = +document.getElementById('sim-start').value   || 80;
  const target     = +document.getElementById('sim-target').value  || 72;
  const weeks      = +document.getElementById('sim-weeks').value   || 12;
  const freq       = +document.getElementById('sim-freq').value;
  const dailyDelta = +document.getElementById('sim-deficit').value;

  // Изменение веса за неделю (кг):
  // weeklyKcal / 7700 — жировой компонент (7700 ккал ≈ 1 кг жира)
  // поправка на тренировки: дефицит ускоряет похудение, профицит — набор
  const weeklyKcal = dailyDelta * 7;
  const trainingAdj = dailyDelta !== 0
    ? (dailyDelta < 0 ? -freq * 0.02 : freq * 0.01)
    : 0;
  const wch = (weeklyKcal / 7700) + trainingAdj;

  let w    = start;
  const lim  = Math.min(weeks, 20);
  const maxA = Math.abs(wch * lim) || 1;
  let html   = '';

  for (let i = 1; i <= lim; i++) {
    w = Math.round((w + wch) * 10) / 10;
    const d   = +(w - start).toFixed(1);
    const pct = Math.min(95, Math.abs(d) / maxA * 88 + 7);
    const cls = d < 0 ? 'loss' : d > 0 ? 'gain' : 'same';
    html += `
      <div class="sim-bar-row">
        <span class="wlbl">Нед. ${i}</span>
        <div class="sim-bar-bg">
          <div class="sim-bar-fill ${cls}" style="width:${pct}%">
            ${w} кг ${d >= 0 ? '+' : ''}${d}
          </div>
        </div>
      </div>`;
  }

  const final = Math.round((start + wch * weeks) * 10) / 10;
  const hit   = dailyDelta < 0 ? final <= target : final >= target;

  document.getElementById('sim-bars').innerHTML = html;
  document.getElementById('sim-conclusion').innerHTML = hit
    ? `<strong>🎉 Цель достигнута!</strong> За ${weeks} нед. вы достигнете <strong>${final} кг</strong>.`
    : `<strong>📌 За ${weeks} нед. будет ${final} кг.</strong>

       <span style="color:var(--text-light)">
         До цели (${target} кг) ещё ${Math.abs(+(final - target).toFixed(1))} кг.
       </span>`;
  document.getElementById('sim-output').style.display = 'block';
}
window.runSimulation = runSimulation;

// ==================== ДИЕТИЧЕСКИЕ ПРЕДПОЧТЕНИЯ ====================
const DIET_PREFS_OPTIONS = [
  { id: 'vegetarian', label: '🥗 Вегетарианец' },
  { id: 'vegan',      label: '🌿 Веган'         },
  { id: 'no_lactose', label: '🥛 Без лактозы'   },
  { id: 'no_gluten',  label: '🌾 Без глютена'   },
  { id: 'no_sugar',   label: '🍬 Без сахара'    },
  { id: 'halal',      label: '☪️ Халяль'        },
  { id: 'keto',       label: '🥩 Кето'          },
  { id: 'counting',   label: '📊 Считаю ккал'   },
];

function renderDietPrefs() {
  const grid = document.getElementById('diet-prefs-grid');
  if (!grid) return;
  const prefs = (profile && profile.dietPrefs) ? profile.dietPrefs : [];
  grid.innerHTML = DIET_PREFS_OPTIONS.map(o => {
    const active = prefs.includes(o.id);
    return `
      <button onclick="toggleDietPref('${o.id}')"
        style="padding:8px 14px;border-radius:20px;font-size:13px;font-weight:600;
               cursor:pointer;
               border:1.5px solid ${active ? 'var(--accent)' : 'var(--border)'};
               background:${active ? 'var(--accent)' : 'var(--input-bg)'};
               color:${active ? '#fff' : 'var(--text)'};
               transition:all .2s;">
        ${o.label}
      </button>`;
  }).join('');
}

function toggleDietPref(id) {
  if (!profile) return;
  if (!profile.dietPrefs) profile.dietPrefs = [];
  const i = profile.dietPrefs.indexOf(id);
  if (i === -1) profile.dietPrefs.push(id);
  else          profile.dietPrefs.splice(i, 1);
  localStorage.setItem('fs-profile', JSON.stringify(profile));
  renderDietPrefs();
  toast(profile.dietPrefs.includes(id)
    ? '✅ Предпочтение добавлено'
    : '🗑 Предпочтение убрано'
  );
}
window.toggleDietPref = toggleDietPref;

// ==================== ИНИЦИАЛИЗАЦИЯ ====================
window.onload = function () {
  if (profile) { renderHome(); }
  initPrograms();
  renderEncyclopedia();
  renderNutrEntries();

  // FIX #1 — убран двойной запуск startWaterReminders():
  // Раньше при permission === "granted" startWaterReminders() вызывалась
  // напрямую, И внутри requestNotificationPermission() — двойной интервал.
  // Теперь:
  // • "granted"     → только startWaterReminders() (один раз)
  // • "not denied"  → только requestNotificationPermission(),
  //                   которая сама вызовет startWaterReminders() после ответа
  // • "denied"      → показываем подсказку, ничего не запускаем
  if (reminderEnabled) {
    if (Notification.permission === 'granted') {
      startWaterReminders();
    } else if (Notification.permission !== 'denied') {
      requestNotificationPermission();
    } else {
      toast('🔕 Уведомления заблокированы. Включите их в настройках браузера.');
    }
  }
  updateReminderUI();

  document.getElementById('save-ex-params-btn').addEventListener('click', saveExerciseParams);
  document.getElementById('confirm-add-ex-btn').addEventListener('click', confirmAddExercise);
};