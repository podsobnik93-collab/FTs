// pages.js — Отрисовка страниц: Home, Stats, Diary, Календарь, Энциклопедия, Питание, Замеры
// Версия с базой продуктов

// ==================== НАВИГАЦИЯ ====================
const PAGE_IDS = ['home','nutrition','stats','diary','profile','simulation','workout','calendar'];
const NAV_IDS  = ['nav-home','nav-nutrition','nav-calendar'];
const CTA_LABELS = {
  home:'Начать тренировку',
  calendar:'+ Добавить тренировку',
  nutrition:'+ Добавить приём пищи',
  workout:'Сохранить тренировку',
  stats:'Обновить данные',
  diary:'+ Замеры тела',
  profile:'Сохранить профиль',
  encyclopedia:'📚 Поиск',
  simulation:'Рассчитать'
};
let currentPage = 'home';

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

function goTo(id, title) {
  if (currentPage === 'workout') saveWorkoutFlowState();
  currentPage = id;
  
  PAGE_IDS.forEach(p => {
    const el = document.getElementById('page-'+p);
    if (el) el.classList.toggle('active', p === id);
  });
  
  const NAV_MAP = {
    home: 'nav-home',
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
  
  const cta = document.querySelector('.bottom-cta');
  if (cta) {
    cta.style.display = 'block';
  }

  if (id === 'stats') renderStats();
  if (id === 'home') renderHome();
  if (id === 'diary') { renderDiary(); renderProgress(); }
  if (id === 'nutrition') { renderNutrEntries(); renderDietPrefs(); }
  if (id === 'profile') loadProfileToForm();
  if (id === 'calendar') renderCalendar();
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
  (actions[currentPage] || (() => {}))();
}
window.ctaAction = ctaAction;

// ==================== HOME ====================
function renderHome() {
  profile = JSON.parse(localStorage.getItem('fs-profile') || 'null');
  if (!profile) return;
  
  document.getElementById('home-empty').style.display = 'none';
  document.getElementById('home-content').style.display = 'block';
  
  const tdee = Math.round(calcBMR(profile) * profile.activity);
  const goals = {
    loss: '🔥 Похудение',
    maintain: '⚖️ Поддержание',
    gain: '💪 Набор массы'
  };
  document.getElementById('h-name').textContent = profile.name;
  document.getElementById('h-goal').textContent = 'Цель: ' + goals[profile.goal];
  document.getElementById('h-weight').textContent = profile.weight;
  document.getElementById('h-tdee').textContent = tdee;
  
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
  
  if (diary.length) {
    document.getElementById('home-recent').style.display = 'block';
    document.getElementById('home-recent-body').innerHTML = [...diary]
      .slice(-2)
      .reverse()
      .map(e => `
        <div class="diary-entry">
          <div class="diary-date">${e.date}</div>
          <div class="diary-title">${e.type || 'Тренировка'}</div>
          <span class="badge green">🔥 ${e.kcal} ккал</span>
        </div>
      `).join('');
  }
  
  const scrollArea = document.querySelector('.scroll-area');
  if (scrollArea) scrollArea.scrollTop = 0;
}
window.renderHome = renderHome;

// ==================== STATS ====================
function renderStats() {
  if (!profile) {
    document.getElementById('stats-empty').style.display = 'block';
    document.getElementById('stats-content').style.display = 'none';
    return;
  }
  document.getElementById('stats-empty').style.display = 'none';
  document.getElementById('stats-content').style.display = 'block';
  
  const bmr = Math.round(calcBMR(profile));
  const tdee = Math.round(bmr * profile.activity);
  let rec = tdee;
  if (profile.goal === 'loss') rec -= 400;
  if (profile.goal === 'gain') rec += 300;
  
  const ideal = profile.target ? profile.target + ' кг' : '—';
  const prot = Math.round(profile.weight * (profile.goal === 'gain' ? 2.2 : 1.8));
  const fat = Math.round(rec * 0.25 / 9);
  const carbs = Math.max(0, Math.round((rec - prot * 4 - fat * 9) / 4));
  
  document.getElementById('s-ideal').textContent = ideal;
  document.getElementById('s-bmr').textContent = bmr + ' ккал';
  document.getElementById('s-tdee').textContent = tdee + ' ккал';
  document.getElementById('s-kcal').textContent = rec + ' ккал';
  
  const goalLabels = {
    loss: '🔥 Цель: Похудение  •  −400 ккал от TDEE',
    maintain: '⚖️ Цель: Поддержание  •  0 ккал',
    gain: '💪 Цель: Набор массы  •  +300 ккал к TDEE'
  };
  document.getElementById('stats-goal-banner').textContent = goalLabels[profile.goal] || '';
  document.getElementById('s-protein').textContent = prot;
  document.getElementById('s-carbs').textContent = carbs;
  document.getElementById('s-fat').textContent = fat;
}
window.renderStats = renderStats;

// ==================== DIARY & BODY LOG ====================
function renderDiary() {
  const dl = document.getElementById('diary-list');
  dl.innerHTML = diary.length
    ? diary.map((e, i) => `
      <div class="diary-entry" style="cursor:pointer;" onclick="
        const d = document.getElementById('dd-${i}');
        const arr = document.getElementById('di-${i}');
        if (d.style.display === 'none') {
          d.style.display = 'block';
          arr.style.transform = 'rotate(180deg)';
        } else {
          d.style.display = 'none';
          arr.style.transform = 'rotate(0deg)';
        }
      ">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div style="display:flex; align-items:center; gap:12px;">
            <div class="diary-title" style="margin:0; font-size:15px;">${e.type || 'Тренировка'}</div>
            <div class="diary-date" style="margin:0; font-size:12px; margin-top:2px;">${e.date.split(',')[0]}</div>
          </div>
          <div style="display:flex; align-items:center; gap:16px;">
            <span id="di-${i}" style="font-size:10px; color:var(--text-muted); transition: transform 0.2s; display:inline-block;">▼</span>
            <button class="diary-del" onclick="event.stopPropagation(); delDiary(${i})" style="margin:0;">✕</button>
          </div>
        </div>
        <div id="dd-${i}" style="display:none; margin-top:12px; padding-top:12px; border-top:1px dashed var(--border);">
          <div class="diary-date" style="margin-bottom:8px;">Полная дата: ${e.date}</div>
          <div class="diary-exs" style="margin-bottom:8px; line-height:1.4;">${e.exercises.split(', ').join('<br>')}</div>
          <span class="badge green">🔥 ${e.kcal} ккал</span>
        </div>
      </div>
    `).join('')
    : '<div class="empty-state">У вас пока нет тренировок</div>';
  
  renderWlog();
  renderBodyLog();
}
window.renderDiary = renderDiary;

function delDiary(i) {
  if (!confirm('Удалить эту тренировку?')) return;
  diary.splice(i, 1);
  localStorage.setItem('fs-diary', JSON.stringify(diary));
  renderDiary();
  toast('🗑 Удалено');
}
window.delDiary = delDiary;

function renderWlog() {
  const c = document.getElementById('weight-log');
  const cnt = document.getElementById('wlog-count');
  if (!wlog.length) {
    c.innerHTML = '<div class="empty-state" style="color:var(--text-light);font-size:0.85rem;padding:4px 0 8px">Нет замеров. Нажми «+ Замеры тела»</div>';
    cnt.textContent = '';
    return;
  }
  cnt.textContent = wlog.length + ' замер' + (wlog.length === 1 ? '' : wlog.length < 5 ? 'а' : 'ов');
  const sorted = [...wlog].sort((a, b) => b.date.localeCompare(a.date));
  c.innerHTML = '<div class="wlog-list">' + sorted.map((e, i) => {
    const prev = sorted[i + 1];
    let diff = null, trendCls = 'same', trendIcon = '•';
    if (prev) {
      diff = +(e.weight - prev.weight).toFixed(1);
      if (diff < 0) { trendCls = 'down'; trendIcon = '↓'; }
      else if (diff > 0) { trendCls = 'up'; trendIcon = '↑'; }
      else { trendCls = 'same'; trendIcon = '→'; }
    }
    const diffText = diff !== null
      ? `<div class="wlog-diff ${diff < 0 ? 'neg' : diff > 0 ? 'pos' : 'zero'}">${diff > 0 ? '+' : ''}${diff} кг к пред.</div>`
      : '';
    const dateObj = new Date(e.date + 'T00:00:00');
    const dateStr = dateObj.toLocaleDateString('ru', { day: 'numeric', month: 'long', year: 'numeric' });
    return `
      <div class="wlog-item">
        <div class="wlog-trend ${trendCls}">${trendIcon}</div>
        <div class="wlog-info">
          <div class="wlog-date-text">${dateStr}</div>
          <div class="wlog-weight-text">${e.weight} кг</div>
          ${diffText}
        </div>
        <button class="wlog-delete" onclick="delWeight(${e.id})">✕</button>
      </div>
    `;
  }).join('') + '</div>';
}

function delWeight(id) {
  if (!confirm('Удалить запись о весе?')) return;
  wlog = wlog.filter(e => e.id !== id);
  localStorage.setItem('fs-wlog', JSON.stringify(wlog));
  renderWlog();
  toast('🗑 Замер удалён');
}
window.delWeight = delWeight;

function renderBodyLog() {
  const c = document.getElementById('body-log');
  if (!bodyLog.length) {
    c.innerHTML = '<div class="empty-state" style="color:var(--text-light);font-size:0.85rem;padding:4px 0 8px">Нет замеров. Нажми «+ Замеры тела»</div>';
    return;
  }
  const sorted = [...bodyLog].sort((a, b) => b.date.localeCompare(a.date));
  const labels = {
    neck: 'Шея', chest: 'Грудь', bicep: 'Бицепс', forearm: 'Предпл.',
    waist: 'Талия', glutes: 'Ягодицы', thigh: 'Бедро', calf: 'Голень'
  };
  c.innerHTML = sorted.map((e, i) => {
    let gridHtml = '';
    for (let k in labels) {
      if (e[k]) {
        const prev = sorted[i + 1];
        let diffHtml = '';
        if (prev && prev[k]) {
          const diff = +(e[k] - prev[k]).toFixed(1);
          if (diff !== 0) {
            diffHtml = `<div style="font-size:0.6rem; font-weight:700; color:${diff > 0 ? '#27ae60' : '#e74c3c'}">${diff > 0 ? '+' : ''}${diff}</div>`;
          }
        }
        gridHtml += `
          <div class="bg-item">
            <div class="bg-val">${e[k]}</div>
            <div class="bg-lbl">${labels[k]}</div>
            ${diffHtml}
          </div>
        `;
      }
    }
    return `
      <div class="body-entry">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div class="wlog-date-text" style="font-weight:700; color:var(--text)">
            ${new Date(e.date + 'T00:00:00').toLocaleDateString('ru', { day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
          <button class="wlog-delete" style="width:26px;height:26px;font-size:0.8rem;" onclick="delBody('${e.date}')">✕</button>
        </div>
        <div class="body-grid">${gridHtml}</div>
      </div>
    `;
  }).join('');
  renderBodyChart();
}

function delBody(date) {
  if (!confirm('Удалить замеры за эту дату?')) return;
  bodyLog = bodyLog.filter(e => e.date !== date);
  localStorage.setItem('fs-bodylog', JSON.stringify(bodyLog));
  renderBodyLog();
  toast('🗑 Удалено');
}
window.delBody = delBody;

function openBodySheet() {
  document.getElementById('sheet-overlay').classList.add('show');
  document.getElementById('body-sheet').classList.add('show');
  document.getElementById('sb-date').valueAsDate = new Date();
  ['neck','chest','bicep','forearm','waist','glutes','thigh','calf'].forEach(k => {
    document.getElementById('sb-' + k).value = '';
  });
  document.getElementById('sb-weight').value = '';
}
window.openBodySheet = openBodySheet;

function addBody() {
  const d = document.getElementById('sb-date').value || new Date().toISOString().split('T')[0];
  const entry = { date: d };
  const keys = ['neck','chest','bicep','forearm','waist','glutes','thigh','calf'];
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
  if (weightVal && weightVal > 0) {
    const wExists = wlog.findIndex(e => e.date === d);
    if (wExists !== -1) {
      wlog[wExists].weight = weightVal;
    } else {
      wlog.push({ date: d, weight: weightVal, id: Date.now() });
    }
    localStorage.setItem('fs-wlog', JSON.stringify(wlog));
    renderWlog();
    hasData = true;
  }
  
  if (!hasData) {
    toast('❗ Заполни хотя бы одно поле');
    return;
  }
  
  const hasBodyData = keys.some(k => entry[k] !== undefined);
  if (hasBodyData) {
    const exists = bodyLog.findIndex(e => e.date === d);
    if (exists !== -1) bodyLog[exists] = entry;
    else bodyLog.push(entry);
    localStorage.setItem('fs-bodylog', JSON.stringify(bodyLog));
    renderBodyLog();
  }
  closeAllSheets();
  toast('✅ Замеры сохранены');
}
window.addBody = addBody;

function renderBodyChart() {
  const metric = document.getElementById('body-chart-metric')?.value || 'waist';
  const el = document.getElementById('body-chart-canvas');
  if (!el) return;
  
  const sorted = [...bodyLog]
    .filter(e => e[metric] !== undefined && e[metric] !== null && e[metric] !== '')
    .sort((a, b) => a.date.localeCompare(b.date));
  
  if (sorted.length < 2) {
    el.innerHTML = '<div style="text-align:center;color:var(--text-light);font-size:13px;padding:16px 0;">Нужно минимум 2 записи для графика</div>';
    return;
  }
  
  const vals = sorted.map(e => parseFloat(e[metric]));
  const dates = sorted.map(e => e.date);
  const minV = Math.min(...vals);
  const maxV = Math.max(...vals);
  const range = maxV - minV || 1;
  const W = 280, H = 90, padX = 10, padY = 14;
  const xs = vals.map((_, i) => padX + (i / (vals.length - 1)) * (W - 2 * padX));
  const ys = vals.map(v => H - padY - ((v - minV) / range) * (H - 2 * padY));
  const polyPts = xs.map((x, i) => `${x},${ys[i]}`).join(' ');
  const areaBot = H - padY;
  const areaPts = `${xs[0]},${areaBot} ${polyPts} ${xs[xs.length - 1]},${areaBot}`;
  
  const circles = vals.map((v, i) => `
    <circle cx="${xs[i]}" cy="${ys[i]}" r="3.5" fill="var(--accent)"/>
    <text x="${xs[i]}" y="${ys[i] - 7}" text-anchor="middle" font-size="8" fill="var(--text-light)">${v}</text>
  `).join('');
  
  const xLabels = `
    <text x="${xs[0]}" y="${H + 8}" text-anchor="middle" font-size="8" fill="var(--text-light)">${dates[0].split('.').slice(0,2).join('.')}</text>
    <text x="${xs[xs.length - 1]}" y="${H + 8}" text-anchor="end" font-size="8" fill="var(--text-light)">${dates[dates.length - 1].split('.').slice(0,2).join('.')}</text>
  `;
  
  const metricLabels = {
    waist: 'Талия', chest: 'Грудь', bicep: 'Бицепс', thigh: 'Бедро',
    neck: 'Шея', forearm: 'Предплечье', glutes: 'Ягодицы', calf: 'Голень'
  };
  const metricLabel = metricLabels[metric] || metric;
  
  el.innerHTML = `
    <div style="font-size:11px;color:var(--text-light);font-weight:600;margin-bottom:6px;">
      ${metricLabel}: ${vals[0]} → ${vals[vals.length - 1]} см
    </div>
    <svg viewBox="0 0 ${W} ${H + 12}" style="width:100%;overflow:visible;">
      <defs>
        <linearGradient id="bcg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="var(--accent)" stop-opacity="0.25"/>
          <stop offset="100%" stop-color="var(--accent)" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <polygon points="${areaPts}" fill="url(#bcg)"/>
      <polyline points="${polyPts}" fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
      ${circles}
      ${xLabels}
    </svg>
  `;
}
window.renderBodyChart = renderBodyChart;

// ==================== ПРОГРЕСС УПРАЖНЕНИЙ ====================
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

function renderCalendar() {
  const grid = document.getElementById('calendar-grid');
  const detail = document.getElementById('calendar-day-detail');
  const empty = document.getElementById('calendar-empty');
  const monthLabel = document.getElementById('cal-month-label');
  if (!grid) return;
  
  if (calCurrentYear === null) initCalendarDefaults();
  const year = calCurrentYear;
  const month = calCurrentMonth;
  
  const first = new Date(year, month, 1);
  let firstDay = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthNames = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
  if (monthLabel) monthLabel.textContent = monthNames[month] + ' ' + year;
  
  const workoutDays = {};
  if (Array.isArray(diary)) {
    diary.forEach(d => {
      const key = d.date ? d.date.split(',')[0].trim() : '';
      if (key) workoutDays[key] = (workoutDays[key] || 0) + 1;
    });
  }
  const plannedDays = getPlannedWorkoutsForMonth(year, month);
  
  const dayNames = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];
  let html = dayNames.map(d => `<div style="text-align:center;font-size:10px;font-weight:700;color:var(--text-light);padding:4px 0;">${d}</div>`).join('');
  
  html += `
    <div style="grid-column:1/-1;" class="cal-legend">
      <span class="cal-legend-item"><span class="cal-legend-dot" style="background:var(--accent);"></span>Выполнено</span>
      <span class="cal-legend-item"><span class="cal-legend-dot" style="background:#38bdf8;"></span>По программе</span>
      <span class="cal-legend-item"><span class="cal-legend-dot" style="background:#94a3b8;"></span>День отдыха</span>
      <span class="cal-legend-item"><span class="cal-legend-dot" style="background:var(--accent);opacity:.5;border:1px solid var(--accent);"></span>Сегодня</span>
    </div>
  `;
  
  let offset = (firstDay + 6) % 7;
  for (let i = 0; i < offset; i++) html += '<div></div>';
  
  for (let d = 1; d <= daysInMonth; d++) {
    const dd = d.toString().padStart(2, '0');
    const mm = (month + 1).toString().padStart(2, '0');
    const dateStr = `${dd}.${mm}.${year}`;
    const isToday = d === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear();
    const hasWorkout = workoutDays[dateStr];
    const planned = plannedDays[dateStr];
    const isRest = planned && planned.rest;
    const isPlanned = planned && !planned.rest;
    
    let cellClass = 'cal-cell';
    if (isToday) cellClass += ' cal-cell-today';
    else if (hasWorkout) cellClass += ' cal-cell-workout';
    else if (isPlanned) cellClass += ' cal-cell-planned';
    else if (isRest) cellClass += ' cal-cell-rest';
    
    const textColor = isToday ? '#fff' : 'var(--text)';
    const marker = hasWorkout
      ? '<div style="width:5px;height:5px;border-radius:50%;background:var(--accent);margin:2px auto 0;"></div>'
      : isPlanned
        ? '<div style="width:5px;height:5px;border-radius:50%;background:#38bdf8;margin:2px auto 0;"></div>'
        : isRest
          ? '<div style="width:5px;height:5px;border-radius:50%;background:#94a3b8;margin:2px auto 0;"></div>'
          : '';
    
    html += `
      <div onclick="showCalDay('${dateStr}')" class="${cellClass}" style="text-align:center;border-radius:10px;padding:6px 2px;cursor:pointer;font-size:12px;font-weight:600;color:${textColor};border:1.5px solid ${isToday || hasWorkout ? 'var(--accent)' : isPlanned ? '#38bdf8' : isRest ? '#94a3b8' : 'var(--border)'};">
        ${d}${marker}
      </div>
    `;
  }
  grid.innerHTML = html;
  if (detail) detail.style.display = 'none';
  const anyData = Object.keys(workoutDays).length || Object.keys(plannedDays).length;
  if (empty) empty.style.display = anyData ? 'none' : 'block';
  
}
window.renderCalendar = renderCalendar;

function showCalDay(dateStr) {
  const detail = document.getElementById('calendar-day-detail');
  const title = document.getElementById('cal-day-title');
  const entries = document.getElementById('cal-day-entries');
  const empty = document.getElementById('calendar-empty');
  if (!entries || !title) return;
  
  const dayDiary = Array.isArray(diary) ? diary.filter(d => d.date && d.date.startsWith(dateStr)) : [];
  const parts = dateStr.split('.');
  const plannedDays = getPlannedWorkoutsForMonth(Number(parts[2]), Number(parts[1]) - 1);
  const planned = plannedDays[dateStr];
  
  title.textContent = '📅 ' + dateStr;
  let blocks = [];
  
  if (dayDiary.length) {
    blocks.push(dayDiary.map(d => {
      const dIdx = diary.indexOf(d);
      return `
        <div class="diary-entry" style="position:relative;">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">
            <div class="diary-title">✅ ${d.type || 'Тренировка'}</div>
            <div style="display:flex;gap:4px;flex-shrink:0;">
              <button onclick="editDiaryFromCal(${dIdx},'${dateStr}')" style="background:none;border:none;color:var(--accent);font-size:1rem;cursor:pointer;padding:2px 6px;border-radius:6px;line-height:1;" title="Редактировать">✏️</button>
              <button onclick="delDiaryFromCal(${dIdx},'${dateStr}')" style="background:none;border:none;color:#ef4444;font-size:1rem;cursor:pointer;padding:2px 6px;border-radius:6px;line-height:1;" title="Удалить">🗑️</button>
            </div>
          </div>
          <div class="diary-exs">${(d.exercises || '').split('\n').join('<br>')}</div>
          ${d.kcal ? `<span class="badge green">${d.kcal} ккал</span>` : ''}
        </div>
      `;
    }).join(''));
  }
  
  if (planned && !planned.rest) {
    blocks.push(`
      <div class="diary-entry" style="border-color:#38bdf8;">
        <div class="diary-title" style="color:#38bdf8;">📋 По программе: ${planned.name}</div>
        <div class="diary-exs">${(planned.exs || []).join('<br>')}</div>
        <button onclick="startPlannedWorkoutByDate('${dateStr}')" style="margin-top:10px;width:100%;padding:10px;border-radius:12px;background:#38bdf8;color:#fff;font-weight:700;border:none;cursor:pointer;">➕ Добавить тренировку</button>
      </div>
    `);
  }
  
  if (planned && planned.rest && !dayDiary.length) {
    blocks.push('<div style="color:var(--text-light);font-size:0.85rem;padding:6px 0;">⚪ По программе — день отдыха</div>');
  }
  
  if (!blocks.length) {
    blocks.push('<div style="color:var(--text-light);font-size:0.85rem;padding:6px 0;">Тренировок нет</div>');
  }
  
  blocks.push(`
    <button onclick="openCalAddSheet('${dateStr}')" style="margin-top:8px;width:100%;padding:11px;border-radius:12px;background:var(--card-inner);color:var(--accent);font-weight:700;font-size:14px;border:1.5px dashed var(--accent);cursor:pointer;">
      ➕ Добавить тренировку на этот день
    </button>
  `);
  
  entries.innerHTML = blocks.join('');
  if (detail) detail.style.display = 'block';
  if (empty) empty.style.display = 'none';
}
window.showCalDay = showCalDay;

function openCalAddSheet(dateStr) {
  const parts = dateStr.split('.');
  const d = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
  const dateForDiary = d.toLocaleDateString('ru');
  const exists = diary.some(e => e.date && (e.date.startsWith(dateStr) || e.date === dateForDiary));
  if (exists) {
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
window.openCalAddSheet = openCalAddSheet;

function delDiaryFromCal(i, dateStr) {
  if (!confirm('Удалить эту тренировку?')) return;
  diary.splice(i, 1);
  localStorage.setItem('fs-diary', JSON.stringify(diary));
  renderCalendar();
  setTimeout(() => showCalDay(dateStr), 50);
  toast('🗑 Тренировка удалена');
}
window.delDiaryFromCal = delDiaryFromCal;

function editDiaryFromCal(i, dateStr) {
  const d = diary[i];
  if (!d) return;
  window._editCalIdx = i;
  window._editCalDateStr = dateStr;
  document.getElementById('cal-edit-type').value = d.type || '';
  document.getElementById('cal-edit-exercises').value = (d.exercises || '').replace(/<br>/g, '\n');
  document.getElementById('cal-edit-overlay').style.display = 'flex';
}
window.editDiaryFromCal = editDiaryFromCal;

function saveCalEdit() {
  const i = window._editCalIdx;
  const dateStr = window._editCalDateStr;
  const d = diary[i];
  if (!d) return;
  d.type = document.getElementById('cal-edit-type').value.trim() || d.type;
  d.exercises = document.getElementById('cal-edit-exercises').value.trim();
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
      
      const label = {
        chest: 'Грудные', back: 'Спина', legs: 'Ноги', shoulders: 'Плечи',
        biceps: 'Бицепс', triceps: 'Трицепс', glutes: 'Ягодицы',
        abs: 'Пресс', forearms: 'Предплечья', cardio: 'Кардио'
      }[cat] || cat;
      const isFav = favExs.has(favKey);
      
      out += `
        <div class="enc-item" style="display:flex; align-items:center; padding:12px 0; border-bottom:1px solid var(--border);">
          <div style="flex:1; font-weight:600; font-size:16px;">${e.n}</div>
          <span style="color:var(--text-muted); margin-right:12px; font-size:14px;">[${label}]</span>
          <button onclick="toggleFav('${favKey}')" style="background:none;border:none;cursor:pointer;font-size:1.4rem;padding:0 4px;line-height:1;color:${isFav ? '#ef4444' : 'var(--text-muted)'};">${isFav ? '❤️' : '🤍'}</button>
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
      <div style="font-weight:700; margin-bottom:8px; font-size:16px; color:var(--text);">Тексты</div>
      <button class="enc-filter-btn enc-filter-active" onclick="filterEnc('all',this)">Все</button>
      ${cats.map(cat => `<button class="enc-filter-btn" onclick="filterEnc('${cat}',this)">${categoryLabels[cat] || cat}</button>`).join('')}
      <button class="enc-filter-btn" onclick="filterEnc('favs',this)">❤️ Избранное</button>
    `;
  }
  
  const searchInput = document.getElementById('enc-search');
  if (searchInput) searchInput.blur();
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
  toast(favExs.has(favKey) ? '❤️ Добавлено в избранное' : '🤍 Убрано из избранного');
}
window.toggleFav = toggleFav;

// ==================== ПИТАНИЕ ====================
let nutrEntries = JSON.parse(localStorage.getItem('fs-nutrition') || '[]');

function renderNutrEntries() {
  const today = new Date().toLocaleDateString('ru-RU');
  const todayEntries = nutrEntries.filter(e => e.date === today);
  const list = document.getElementById('nutr-entries-list');
  if (!list) return;
  
  list.innerHTML = todayEntries.length
    ? todayEntries.map((e, i) => `
        <div style="background:var(--card-inner);border-radius:10px;padding:10px 12px;display:flex;justify-content:space-between;align-items:center">
          <div>
            <div style="font-weight:600;font-size:14px">${e.name}</div>
            <div style="font-size:12px;color:var(--text-lig)">${Math.round(e.kcal)} ккал · Б:${+parseFloat(e.protein).toFixed(1)}г · У:${+parseFloat(e.carbs).toFixed(1)}г · Ж:${+parseFloat(e.fat).toFixed(1)}г</div>
          </div>
          <button onclick="removeNutrEntry(${i})" style="background:none;border:none;color:#f87171;font-size:18px;cursor:pointer">✕</button>
        </div>
      `).join('')
    : '<div style="text-align:center;color:var(--text-lig);font-size:14px;padding:20px">Ничего не добавлено</div>';
  
  const totals = todayEntries.reduce((a, e) => ({
    kcal: a.kcal + (+e.kcal || 0),
    protein: a.protein + (+e.protein || 0),
    carbs: a.carbs + (+e.carbs || 0),
    fat: a.fat + (+e.fat || 0)
  }), { kcal: 0, protein: 0, carbs: 0, fat: 0 });
  
  ['kcal', 'protein', 'carbs', 'fat'].forEach(k => {
    const el = document.getElementById('nutr-total-' + k);
    if (el) el.textContent = k === 'kcal' ? Math.round(totals[k]) : +parseFloat(totals[k]).toFixed(1);
  });
}

function addNutrEntry() {
  const name = document.getElementById('nutr-meal-name').value.trim() || 'Блюдо';
  const kcal = document.getElementById('nutr-kcal').value || 0;
  const protein = document.getElementById('nutr-protein').value || 0;
  const carbs = document.getElementById('nutr-carbs').value || 0;
  const fat = document.getElementById('nutr-fat').value || 0;
  nutrEntries.push({
    id: Date.now() + '_' + Math.random().toString(36).slice(2),
    name, kcal, protein, carbs, fat,
    date: new Date().toLocaleDateString('ru-RU')
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
  if (!confirm('Удалить этот приём пищи?')) return;
  const today = new Date().toLocaleDateString('ru-RU');
  let todayEntries = nutrEntries.filter(e => e.date === today);
  const removed = todayEntries[idx];
  if (!removed) return;
  if (!confirm('Удалить запись «' + removed.name + '»?')) return;
  if (removed.id) {
    nutrEntries = nutrEntries.filter(e => e.id !== removed.id);
  } else {
    let once = false;
    nutrEntries = nutrEntries.filter(e => {
      if (!once && e.name === removed.name && e.kcal === removed.kcal && e.date === removed.date) {
        once = true;
        return false;
      }
      return true;
    });
  }
  localStorage.setItem('fs-nutrition', JSON.stringify(nutrEntries));
  renderNutrEntries();
  toast('🗑 Запись удалена');
}
window.removeNutrEntry = removeNutrEntry;


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
function openFoodPicker() {
  document.getElementById('food-picker-sheet').classList.add('show');
  document.getElementById('sheet-overlay').classList.add('show');
  document.getElementById('food-search').value = '';
  renderFoodPicker();
}
window.openFoodPicker = openFoodPicker;

function renderFoodPicker() {
  const q = document.getElementById('food-search')?.value || '';
  const results = q.length >= 2 ? searchFoodDB(q) : [];
  const container = document.getElementById('food-picker-list');
  if (!container) return;
  if (!results.length) {
    container.innerHTML = '<div style="text-align:center;color:var(--text-light);padding:20px;">' +
      (q.length>=2 ? 'Ничего не найдено' : 'Введите хотя бы 2 символа') +
      '</div>';
    return;
  }
  container.innerHTML = results.map(f => `
    <div class="food-pick-item" onclick="applyFoodItem('${f.n}')" style="cursor:pointer; padding:12px 0; border-bottom:1px solid var(--border); display:flex; justify-content:space-between; align-items:center;">
      <div>
        <div style="font-weight:600; font-size:14px;">${f.n}</div>
        <div style="font-size:11px; color:var(--text-light);">${f.kcal} ккал · Б:${f.p} · У:${f.c} · Ж:${f.f} (на ${f.unit})</div>
      </div>
      <span style="color:var(--accent); font-weight:600;">+</span>
    </div>
  `).join('');
}
window.renderFoodPicker = renderFoodPicker;

function applyFoodItem(name) {
  const item = FOOD_DB.find(f => f.n === name);
  if (!item) return;
  document.getElementById('nutr-meal-name').value = item.n;
  document.getElementById('nutr-kcal').value = item.kcal;
  document.getElementById('nutr-protein').value = item.p;
  document.getElementById('nutr-carbs').value = item.c;
  document.getElementById('nutr-fat').value = item.f;
  closeAllSheets();
  toast('✅ Продукт добавлен. Укажите вес порции!');
}
window.applyFoodItem = applyFoodItem;

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

function showVoiceResult(text) {
  const el = document.getElementById('voice-result');
  if (el) {
    el.textContent = text;
    el.classList.add('show');
  }
}

function hideVoiceResult() {
  const el = document.getElementById('voice-result');
  if (el) el.classList.remove('show');
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

// Улучшенная версия с поиском по FOOD_DB
function handleVoiceForNutrition(text) {
  const lower = text.toLowerCase();
  const weightMatch = lower.match(/(\d+(?:[.,]\d+)?)\s*(?:грамм|гр|г)\b/);
  let grams = weightMatch ? parseFloat(weightMatch[1].replace(',', '.')) : 100;
  let namePart = lower.replace(/на завтрак|на обед|на ужин|перекус/gi, '').trim();
  if (weightMatch) namePart = namePart.slice(0, weightMatch.index).trim();
  let mealName = namePart.replace(/[^a-zа-яё0-9\s]/gi, ' ').replace(/\s+/g, ' ').trim();
  
  // Ищем в базе продуктов
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
    // Если не нашли — просто вставляем название
    if (document.getElementById('nutr-meal-name')) document.getElementById('nutr-meal-name').value = mealName;
    showVoiceResult('🔍 "' + text + '"');
  }
}
// ===== CALENDAR =====
let calYear  = new Date().getFullYear();
let calMonth = new Date().getMonth(); // 0-based
let calSelectedDay = null;

function renderCalendar() {
  const label = document.getElementById('cal-month-label');
  const grid  = document.getElementById('calendar-grid');
  const detail = document.getElementById('cal-day-detail');
  const empty  = document.getElementById('calendar-empty');
  const listEl = document.getElementById('cal-wt-list');
  const countEl= document.getElementById('cal-wt-count');
  if (!label || !grid) return;

  const monthNames = ['Январь','Февраль','Март','Апрель','Май','Июнь',
                      'Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
  label.textContent = monthNames[calMonth] + ' ' + calYear;

  // Получаем тренировки из истории
  const history = JSON.parse(localStorage.getItem('wt_history') || '[]');
  const workoutDates = {}; // 'YYYY-MM-DD' -> [workouts]
  history.forEach(w => {
    if (!w.date) return;
    const d = w.date.slice(0, 10);
    if (!workoutDates[d]) workoutDates[d] = [];
    workoutDates[d].push(w);
  });

  const today = new Date();
  const firstDay = new Date(calYear, calMonth, 1);
  const lastDay  = new Date(calYear, calMonth + 1, 0);
  // Пн=0 ... Вс=6
  let startDow = firstDay.getDay(); // 0=вс
  startDow = startDow === 0 ? 6 : startDow - 1;

  grid.innerHTML = '';

  // Дни предыдущего месяца
  const prevLast = new Date(calYear, calMonth, 0).getDate();
  for (let i = startDow - 1; i >= 0; i--) {
    const day = prevLast - i;
    const cell = document.createElement('div');
    cell.className = 'cal-day other-month';
    cell.textContent = day;
    grid.appendChild(cell);
  }

  // Дни текущего месяца
  for (let d = 1; d <= lastDay.getDate(); d++) {
    const dateStr = calYear + '-' +
      String(calMonth + 1).padStart(2,'0') + '-' +
      String(d).padStart(2,'0');
    const cell = document.createElement('div');
    cell.className = 'cal-day';
    cell.textContent = d;
    if (today.getFullYear() === calYear && today.getMonth() === calMonth && today.getDate() === d)
      cell.classList.add('today');
    if (workoutDates[dateStr])
      cell.classList.add('has-workout');
    if (calSelectedDay === dateStr)
      cell.classList.add('selected');
    cell.addEventListener('click', () => showCalDay(dateStr, workoutDates[dateStr] || null));
    grid.appendChild(cell);
  }

  // Дни следующего месяца
  const totalCells = startDow + lastDay.getDate();
  const remainder  = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
  for (let i = 1; i <= remainder; i++) {
    const cell = document.createElement('div');
    cell.className = 'cal-day other-month';
    cell.textContent = i;
    grid.appendChild(cell);
  }

  // Скрываем detail если нет выбранного
  if (!calSelectedDay || !calSelectedDay.startsWith(calYear + '-' + String(calMonth+1).padStart(2,'0'))) {
    if (detail) detail.style.display = 'none';
    calSelectedDay = null;
  }

  // Список тренировок месяца
  const monthPrefix = calYear + '-' + String(calMonth + 1).padStart(2,'0');
  const monthWts = history.filter(w => w.date && w.date.startsWith(monthPrefix))
                          .sort((a,b) => new Date(b.date) - new Date(a.date));
  if (countEl) countEl.textContent = monthWts.length ? monthWts.length + ' тренировок' : '';
  if (listEl) {
    if (monthWts.length === 0) {
      listEl.innerHTML = '<div style="text-align:center;padding:16px 0;color:var(--text-light);font-size:13px;">В этом месяце тренировок нет</div>';
    } else {
      listEl.innerHTML = monthWts.map(w => {
        const date = new Date(w.date);
        const day  = String(date.getDate()).padStart(2,'0');
        const mon  = ['янв','фев','мар','апр','май','июн','июл','авг','сен','окт','ноя','дек'][date.getMonth()];
        const exCount = (w.exercises || []).length;
        const vol = (w.exercises || []).reduce((s,e) => s + (e.sets||[]).reduce((ss,st) => ss + (parseFloat(st.kg)||0)*(parseInt(st.reps)||0),0),0);
        return `<div class="cal-wt-item">
          <div class="cal-wt-date"><div style="font-size:15px;">\${day}</div><div>\${mon}</div></div>
          <div class="cal-wt-info">
            <div class="cal-wt-name">\${w.name || 'Тренировка'}</div>
            <div class="cal-wt-meta">\${exCount} упр · \${vol > 0 ? Math.round(vol) + ' кг объём' : 'без весов'}</div>
          </div>
        </div>`;
      }).join('');
    }
  }

  // Пустое состояние
  if (empty) empty.style.display = monthWts.length === 0 ? 'flex' : 'none';
}

function showCalDay(dateStr, workouts) {
  calSelectedDay = dateStr;
  const detail   = document.getElementById('cal-day-detail');
  const titleEl  = document.getElementById('cal-day-title');
  const entriesEl= document.getElementById('cal-day-entries');
  if (!detail) return;

  const date = new Date(dateStr);
  const days = ['вс','пн','вт','ср','чт','пт','сб'];
  titleEl.textContent = days[date.getDay()] + ', ' + date.getDate() + ' ' +
    ['января','февраля','марта','апреля','мая','июня',
     'июля','августа','сентября','октября','ноября','декабря'][date.getMonth()];

  if (!workouts || workouts.length === 0) {
    entriesEl.innerHTML = '<div style="font-size:13px;color:var(--text-light);padding:4px 0 8px;">Нет тренировок</div>';
  } else {
    entriesEl.innerHTML = workouts.map(w => {
      const exCount = (w.exercises || []).length;
      return `<div style="padding:6px 0;border-bottom:1px solid var(--border);">
        <div style="font-size:14px;font-weight:600;">\${w.name || 'Тренировка'}</div>
        <div style="font-size:12px;color:var(--text-light);">\${exCount} упражнений</div>
      </div>`;
    }).join('');
  }
  detail.style.display = 'block';

  // Перерисовываем сетку чтобы показать selected
  const grid = document.getElementById('calendar-grid');
  if (grid) {
    grid.querySelectorAll('.cal-day').forEach(cell => {
      cell.classList.remove('selected');
      if (parseInt(cell.textContent) === date.getDate() && !cell.classList.contains('other-month'))
        cell.classList.add('selected');
    });
  }
}

function changeCalMonth(dir) {
  calMonth += dir;
  if (calMonth > 11) { calMonth = 0; calYear++; }
  if (calMonth < 0)  { calMonth = 11; calYear--; }
  calSelectedDay = null;
  renderCalendar();
}
window.changeCalMonth = changeCalMonth;
window.renderCalendar = renderCalendar;
