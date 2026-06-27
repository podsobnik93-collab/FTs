// pages.js — Исправленная версия (календарь объединён, дубликат удалён)
// FIX: добавлены уникальные id тренировкам, обновление календаря после удаления,
//      редактирование и удаление по id
// FIX: убраны кнопки добавления тренировки из календаря, скрыта CTA-кнопка на календаре

// ==================== НАВИГАЦИЯ ====================
const PAGE_IDS = ['home','nutrition','stats','diary','profile','simulation','workout','calendar','ai'];
const NAV_IDS  = ['nav-home','nav-workout','nav-ai-btn','nav-nutrition','nav-calendar'];
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
  const cta = document.querySelector('.bottom-cta');
  // Скрываем на страницах, где кнопка не нужна
  if(currentPage === 'nutrition' || currentPage === 'home' || currentPage === 'calendar' || currentPage === 'ai'){
    if(cta) cta.style.display = 'none';
    return;
  }
  if(cta) cta.style.display = 'block';
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
  if (id === 'diary') { renderDiary(); renderProgress(); }
  if (id === 'nutrition') { renderNutrEntries(); renderDietPrefs(); renderNutrQuickCard(); }
  if (id === 'profile') { loadProfileToForm(); renderStats(); }
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
    simulation: runSimulation,
    nutrition: openMealPickerSheet
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

  const lastWorkoutDiv = document.getElementById('last-workout-info');
  if (lastWorkoutDiv) {
    if (diary.length > 0) {
      const last = diary[0];
      let dateDisplay = last.date;
      if (dateDisplay.includes(',')) dateDisplay = dateDisplay.split(',')[0];
      lastWorkoutDiv.innerHTML = `${last.type || 'Тренировка'} (${dateDisplay})`;
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

  // Поправка стажа под строкой TDEE
  var tdeeEl = document.getElementById('s-tdee');
  var expNoteEl = document.getElementById('s-exp-note');
  if (!expNoteEl && tdeeEl) {
    expNoteEl = document.createElement('div');
    expNoteEl.id = 's-exp-note';
    expNoteEl.style.cssText = 'font-size:10px;margin-top:3px;text-align:right;';
    tdeeEl.parentNode.appendChild(expNoteEl);
  }
  if (expNoteEl) {
    if (expFactor === 1.00) {
      expNoteEl.textContent = '';
    } else {
      var sign = expDelta > 0 ? '+' : '';
      var expLabels = {'0':'новичок','0.5':'до 6 мес','1':'6–12 мес','2':'1–2 года','3':'2–5 лет','5':'5+ лет'};
      var coachNote = (coachVal === 'now' ? ', с тренером' : coachVal === 'past' ? ', опыт с тренером' : '');
      expNoteEl.style.color = expDelta > 0 ? '#22c55e' : '#94a3b8';
      expNoteEl.textContent = 'Поправка стажа (' + (expLabels[String(expVal)] || '') + coachNote + '): ' + sign + expDelta + ' ккал';
    }
  }

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
window.renderStats = renderStats;

// ==================== DIARY & BODY LOG ====================
// FIX: добавлен уникальный id для каждой тренировки
function generateWorkoutId() {
  return Date.now() + '_' + Math.random().toString(36).slice(2);
}

function renderDiary() {
  const dl = document.getElementById('diary-list');
  dl.innerHTML = diary.length
    ? diary.map((e, i) => `
      <div class="diary-entry" style="cursor:pointer;" onclick="
        const d = document.getElementById('dd-${e.id || i}');
        const arr = document.getElementById('di-${e.id || i}');
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
            <span id="di-${e.id || i}" style="font-size:10px; color:var(--text-muted); transition: transform 0.2s; display:inline-block;">▼</span>
            <button class="diary-del" onclick="event.stopPropagation(); delDiary('${e.id}')" style="margin:0;">✕</button>
          </div>
        </div>
        <div id="dd-${e.id || i}" style="display:none; margin-top:12px; padding-top:12px; border-top:1px dashed var(--border);">
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

function delDiary(id) {
  if (!confirm('Удалить эту тренировку?')) return;
  diary = diary.filter(e => e.id !== id);
  localStorage.setItem('fs-diary', JSON.stringify(diary));
  renderDiary();
  renderCalendar(); // FIX: обновляем календарь после удаления
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
  const detail = document.getElementById('cal-day-detail');
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

  let html = '';

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
    else if (isPlanned) cellClass += ' cal-cell-workout';
    

    const textColor = isToday ? '#fff' : 'var(--text)';
    const marker = '';

    html += `
      <div onclick="showCalDay('${dateStr}')" class="${cellClass}" style="text-align:center;border-radius:10px;padding:6px 2px;cursor:pointer;font-size:12px;font-weight:600;color:${textColor};border:1.5px solid ${isToday || hasWorkout ? 'var(--accent)' : isPlanned ? 'var(--accent)' : 'var(--border)'};">
        ${d}${marker}
      </div>
    `;
  }
  grid.innerHTML = html;
  if (detail) detail.style.display = 'none';
  const anyData = Object.keys(workoutDays).length || Object.keys(plannedDays).length;
  if (empty) empty.style.display = anyData ? 'none' : 'block';

  // Список тренировок за месяц
  const listEl = document.getElementById('cal-wt-list');
  const countEl = document.getElementById('cal-wt-count');
  if (listEl) {
    const monthPrefix = `${String(month + 1).padStart(2, '0')}.${year}`;
    const monthWts = (Array.isArray(diary) ? diary : [])
      .filter(d => d.date && d.date.includes(monthPrefix))
      .sort((a, b) => {
        const dateA = a.date.split(',')[0].trim().split('.').reverse().join('-');
        const dateB = b.date.split(',')[0].trim().split('.').reverse().join('-');
        return new Date(dateB) - new Date(dateA);
      });

    if (countEl) countEl.textContent = monthWts.length ? monthWts.length + ' тренировок' : '';
    if (monthWts.length === 0) {
      listEl.innerHTML = '<div style="text-align:center;padding:16px 0;color:var(--text-light);font-size:13px;">В этом месяце тренировок нет</div>';
    } else {
      listEl.innerHTML = monthWts.map(w => {
        const dateParts = w.date.split(',')[0].trim().split('.');
        const day = dateParts[0];
        const mon = dateParts[1] ? ['янв','фев','мар','апр','май','июн','июл','авг','сен','окт','ноя','дек'][parseInt(dateParts[1]) - 1] || '' : '';
        const exCount = (w.exercises || '').split('\n').filter(e => e.trim()).length;
        const exLines = (w.exercises || '').split('\n').filter(e => e.trim());
        const exListHtml = exLines.length
          ? exLines.map(e => `<div class="cal-wt-ex-line">• ${e.trim()}</div>`).join('')
          : '<div class="cal-wt-ex-line" style="color:var(--text-light)">Упражнения не указаны</div>';
        const uid = 'cwt-' + (w.id || Math.random().toString(36).slice(2));
        return `<div class="cal-wt-item" onclick="(function(el){
          var d=document.getElementById('${uid}');
          var a=el.querySelector('.cal-wt-arrow');
          if(d.style.display==='none'){d.style.display='block';if(a)a.style.transform='rotate(180deg)';}
          else{d.style.display='none';if(a)a.style.transform='rotate(0deg)';}
        })(this)" style="cursor:pointer;">
          <div class="cal-wt-date"><div style="font-size:15px;">${day}</div><div>${mon}</div></div>
          <div class="cal-wt-info">
            <div class="cal-wt-name">${w.type || 'Тренировка'}</div>
            <div class="cal-wt-meta">${exCount} упр${w.kcal ? ' · ' + w.kcal + ' ккал' : ''}</div>
          </div>
          <div class="cal-wt-arrow" style="font-size:12px;color:var(--text-light);transition:transform 0.2s;margin-left:auto;padding-left:8px;flex-shrink:0;">▼</div>
        </div>
        <div id="${uid}" style="display:none;padding:8px 12px 12px 12px;background:var(--card-inner,rgba(255,255,255,0.04));border-radius:0 0 12px 12px;margin-top:-4px;margin-bottom:8px;">
          ${exListHtml}
        </div>`;
      }).join('');
    }
  }
}
window.renderCalendar = renderCalendar;

function showCalDay(dateStr) {
  const detail = document.getElementById('cal-day-detail');
  const title = document.getElementById('cal-day-title');
  const entries = document.getElementById('cal-day-entries');
  if (!entries || !title) return;

  const parts = dateStr.split('.');
  // dateStr = "DD.MM.YYYY", ISO = "YYYY-MM-DD"
  const isoDate = `${parts[2]}-${parts[1]}-${parts[0]}`;

  // --- Тренировки ---
  const dayDiary = Array.isArray(diary) ? diary.filter(d => d.date && d.date.startsWith(dateStr)) : [];

  // --- Питание ---
  const _nutrAll = JSON.parse(localStorage.getItem('fs-nutrition') || '[]');
  const dayNutr = _nutrAll.filter(e => e.date === dateStr);
  const totalKcal  = dayNutr.reduce((s,e) => s + (+e.kcal||0), 0);
  const totalProt  = dayNutr.reduce((s,e) => s + (+e.protein||0), 0);
  const totalCarbs = dayNutr.reduce((s,e) => s + (+e.carbs||0), 0);
  const totalFat   = dayNutr.reduce((s,e) => s + (+e.fat||0), 0);

  // --- Вода ---
  const _waterHist = JSON.parse(localStorage.getItem('fs-water-hist') || '[]');
  const _waterToday = JSON.parse(localStorage.getItem('fs-water') || '{"date":"","amount":0}');
  let waterAmount = 0;
  if (_waterToday.date === isoDate) {
    waterAmount = _waterToday.amount || 0;
  } else {
    const wEntry = _waterHist.find(h => h.date === isoDate);
    if (wEntry) waterAmount = wEntry.amount || 0;
  }
  const waterGoal = (typeof calcWaterGoal === "function") ? calcWaterGoal(profile) : ((profile && profile.weight) ? Math.round(profile.weight * 30) : 2000);
  const waterPct = Math.min(100, Math.round(waterAmount / waterGoal * 100));

  // --- Заголовок ---
  const [dd, mm, yyyy] = parts;
  const monthNames = ['янв','фев','мар','апр','май','июн','июл','авг','сен','окт','ноя','дек'];
  title.textContent = `📅 ${+dd} ${monthNames[+mm-1]} ${yyyy}`;

  let html = '';

  // === БЛОК: Тренировка ===
  if (dayDiary.length) {
    const wtKcal = dayDiary.reduce((s,d) => s + (+d.kcal||0), 0);
    html += `<div style="background:var(--card-inner);border-radius:12px;padding:12px 14px;margin-bottom:10px;">
      <div style="font-size:12px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px;">🏋️ Тренировка</div>`;
    dayDiary.forEach(d => {
      html += `<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:6px;">
        <div>
          <div style="font-weight:600;font-size:14px;">${d.type || 'Тренировка'}</div>
          ${d.exercises ? `<div style="font-size:12px;color:var(--text-muted);margin-top:2px;">${d.exercises.split('\n').slice(0,3).join(' · ')}${d.exercises.split('\n').length>3?'…':''}</div>` : ''}
        </div>
        <div style="display:flex;gap:4px;align-items:center;flex-shrink:0;">
          ${d.kcal ? `<span style="font-size:12px;color:var(--accent);font-weight:700;">${d.kcal} ккал</span>` : ''}
          <button onclick="editDiaryFromCal('${d.id}','${dateStr}')" style="background:none;border:none;color:var(--accent);font-size:14px;cursor:pointer;padding:2px 4px;">✏️</button>
          <button onclick="delDiaryFromCal('${d.id}','${dateStr}')" style="background:none;border:none;color:#ef4444;font-size:14px;cursor:pointer;padding:2px 4px;">🗑️</button>
        </div>
      </div>`;
    });
    html += `</div>`;
  } else {
    html += `<div style="background:var(--card-inner);border-radius:12px;padding:12px 14px;margin-bottom:10px;display:flex;justify-content:space-between;align-items:center;">
      <span style="font-size:13px;color:var(--text-muted);">🏋️ Тренировок нет</span>
    </div>`;
  }

  // === БЛОК: Питание ===
  html += `<div style="background:var(--card-inner);border-radius:12px;padding:12px 14px;margin-bottom:10px;">
    <div style="font-size:12px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px;">🍽 Питание</div>`;
  if (dayNutr.length) {
    html += `<div style="font-size:22px;font-weight:800;color:var(--text);margin-bottom:4px;">${totalKcal} <span style="font-size:13px;font-weight:400;color:var(--text-muted);">ккал</span></div>
    <div style="display:flex;gap:12px;font-size:12px;color:var(--text-muted);margin-bottom:8px;">
      <span>Б: <b style="color:var(--text);">${Math.round(totalProt)}г</b></span>
      <span>Ж: <b style="color:var(--text);">${Math.round(totalFat)}г</b></span>
      <span>У: <b style="color:var(--text);">${Math.round(totalCarbs)}г</b></span>
    </div>`;
    // Группируем по типу приёма
    const mealLabels = {breakfast:'🌅 Завтрак', lunch:'☀️ Обед', dinner:'🌙 Ужин', snack:'🍎 Перекус'};
    const grouped = {};
    dayNutr.forEach(e => { const t = e.mealType||'snack'; if(!grouped[t]) grouped[t]=[]; grouped[t].push(e); });
    Object.entries(grouped).forEach(([type, items]) => {
      html += `<div style="font-size:12px;color:var(--text-muted);margin-bottom:2px;">${mealLabels[type]||type}</div>`;
      items.forEach(e => {
        html += `<div style="display:flex;justify-content:space-between;font-size:13px;padding:2px 0;">
          <span>${e.name}</span><span style="color:var(--text-muted);">${e.kcal} ккал</span>
        </div>`;
      });
    });
  } else {
    html += `<div style="font-size:13px;color:var(--text-muted);">Приёмов пищи нет</div>`;
  }
  html += `</div>`;

  // === БЛОК: Вода ===
  html += `<div style="background:var(--card-inner);border-radius:12px;padding:12px 14px;margin-bottom:10px;">
    <div style="font-size:12px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px;">💧 Вода</div>
    <div style="display:flex;align-items:baseline;gap:6px;margin-bottom:6px;">
      <span style="font-size:22px;font-weight:800;color:var(--text);">${waterAmount}</span>
      <span style="font-size:13px;color:var(--text-muted);">/ ${waterGoal} мл</span>
      <span style="font-size:12px;color:var(--accent);font-weight:700;margin-left:4px;">${waterPct}%</span>
    </div>
    <div style="height:6px;background:var(--border);border-radius:3px;overflow:hidden;">
      <div style="height:100%;width:${waterPct}%;background:var(--accent);border-radius:3px;transition:width .3s;"></div>
    </div>
  </div>`;

  // === БЛОК: Баланс (только если есть и питание и тренировка) ===
  if (dayNutr.length && dayDiary.length) {
    const wtKcal = dayDiary.reduce((s,d) => s + (+d.kcal||0), 0);
    const balance = totalKcal - wtKcal;
    html += `<div style="background:var(--card-inner);border-radius:12px;padding:12px 14px;margin-bottom:10px;">
      <div style="font-size:12px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px;">⚖️ Баланс дня</div>
      <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px;">
        <span>Потреблено</span><span style="color:var(--text);font-weight:600;">${totalKcal} ккал</span>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:6px;">
        <span>Потрачено</span><span style="color:var(--accent);font-weight:600;">− ${wtKcal} ккал</span>
      </div>
      <div style="height:1px;background:var(--border);margin-bottom:6px;"></div>
      <div style="display:flex;justify-content:space-between;font-size:14px;font-weight:700;">
        <span>Итого</span>
        <span style="color:${balance > 0 ? '#f97316' : '#22c55e'};">${balance > 0 ? '+' : ''}${balance} ккал</span>
      </div>
    </div>`;
  }

  entries.innerHTML = html;
  if (detail) detail.style.display = 'block';
}
window.showCalDay = showCalDay;

// Функция openCalAddSheet больше не используется, но оставлена для совместимости (может вызываться из других мест, хотя мы убрали кнопки)
function openCalAddSheet(dateStr) {
  // Этот вызов теперь ниоткуда не происходит, но оставляем заглушку
  toast('Добавление тренировки через календарь отключено');
}
window.openCalAddSheet = openCalAddSheet;

function delDiaryFromCal(id, dateStr) {
  if (!confirm('Удалить эту тренировку?')) return;
  diary = diary.filter(e => e.id !== id);
  localStorage.setItem('fs-diary', JSON.stringify(diary));
  renderCalendar();
  setTimeout(() => showCalDay(dateStr), 50);
  toast('🗑 Тренировка удалена');
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
  const _baseDate = new Date();
  _baseDate.setDate(_baseDate.getDate() + (window._nutrOffset || 0));
  const today = _baseDate.toLocaleDateString('ru-RU');
  const todayEntries = nutrEntries.filter(e => e.date === today);

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
          '<div class="meal-item-meta">' + Math.round(e.kcal) + ' ккал' + (e.grams ? ' · ' + e.grams + ' г' : '') + ' · Б:' + (+parseFloat(e.protein).toFixed(1)) + ' · У:' + (+parseFloat(e.carbs).toFixed(1)) + ' · Ж:' + (+parseFloat(e.fat).toFixed(1)) + '</div>' +
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

  /* ---- new card update ---- */
  const _pr = JSON.parse(localStorage.getItem('fs-profile') || '{}');
  let _kGoal = 2000;
  if (_pr.weight) {
    // Используем единую функцию calcBMR (Миффлин-Сан Жеор, с поправкой на возраст >60)
    const _bmr = (typeof calcBMR === 'function')
      ? calcBMR(_pr)
      : (() => {
          const _w = Number(_pr.weight) || 75;
          const _h = Number(_pr.height) || 175;
          const _a = Number(_pr.age)    || 25;
          const _base = 10 * _w + 6.25 * _h - 5 * _a;
          let _res = (_pr.gender === 'male') ? _base + 5 : _base - 161;
          if (_a > 60) _res = Math.round(_res * (1 - (Math.min(_a - 60, 30) / 300)));
          return _res;
        })();
    _kGoal = Math.round(_bmr * (+(_pr.activity||1.55)));
    // Коррекция по цели с учётом возраста
    const _ageV = Number(_pr.age) || 25;
    if (_pr.goal === 'loss')    _kGoal -= (_ageV > 55 ? 300 : 400);  // пожилым — меньший дефицит
    if (_pr.goal === 'gain')    _kGoal += (_ageV > 55 ? 200 : 300);  // пожилым — меньший профицит
    _kGoal = Math.max(1200, _kGoal); // не ниже 1200 ккал в любом случае
  }
  // Норма белка с учётом возраста (пожилым нужно больше)
  const _ageNorm = Number(_pr.age) || 25;
  const _protPerKg = _ageNorm > 55
    ? (_pr.goal === 'gain' ? 2.4 : 2.0)
    : (_pr.goal === 'gain' ? 2.2 : 1.8);
  const _pGoal = Math.round((+(_pr.weight||70)) * _protPerKg);
  const _fGoal = Math.round(_kGoal * 0.25 / 9);
  const _cGoal = Math.max(0, Math.round((_kGoal - _pGoal*4 - _fGoal*9) / 4));
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
    const extras = ['nutr-fiber','nutr-sugar','nutr-sodium','nutr-chol','nutr-pot'];
    const idx = extras.indexOf(id);
    if (idx >= 0 && fills[idx]) {
      const pct = maxVal > 0 ? Math.min(100, val / maxVal * 100) : 0;
      fills[idx].dataset.pct = pct.toFixed(1);
      if (window.nutrSlide === 1) fills[idx].style.width = pct.toFixed(1) + '%';
    }
  };
  _fillExtra('nutr-fiber',  totals.carbs * 0.15,       37);
  _fillExtra('nutr-sugar',  totals.carbs * 0.40,       65);
  _fillExtra('nutr-sodium', totals.kcal  * 1.0,      2300);
  _fillExtra('nutr-chol',   totals.fat   * 1.5,       300);
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
  closeAllSheets();
  openGramsSheet({ name: item.n, kcal100: item.kcal, p100: item.p, c100: item.c, f100: item.f }, null);
}
window.applyFoodItem = applyFoodItem;

// Открыть шторку редактирования граммов
function openGramsSheet(item100, entryId) {
  window._gramsItem    = item100;
  window._gramsEntryId = entryId;

  const existing = entryId ? nutrEntries.find(e => e.id === entryId) : null;
  const grams = existing ? (existing.grams || 100) : 100;

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
  recalcGrams(grams);

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

function buildGramsSheetHTML(item, grams) {
  return '<div class="sheet-handle"></div>' +
    '<div class="grams-sheet-name">' + item.name + '</div>' +
    '<div class="grams-sheet-sub">на 100 г: ' + item.kcal100 + ' ккал · Б:' + item.p100 + ' · У:' + item.c100 + ' · Ж:' + item.f100 + '</div>' +

    '<div class="grams-donut-wrap">' +
      '<svg class="grams-donut-svg" viewBox="0 0 120 120">' +
        '<circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="10"/>' +
        '<circle id="grams-arc" cx="60" cy="60" r="50" fill="none" stroke="var(--accent)" stroke-width="10"' +
          ' stroke-linecap="round" stroke-dasharray="0 314" style="transition:stroke-dasharray 0.3s;transform:rotate(-90deg);transform-origin:center"/>' +
      '</svg>' +
      '<div class="grams-donut-inner">' +
        '<div class="grams-kcal-val" id="grams-kcal">0</div>' +
        '<div class="grams-kcal-lbl">ккал</div>' +
      '</div>' +
    '</div>' +

    '<div class="grams-macros">' +
      '<div class="grams-macro p"><div class="grams-macro-val" id="grams-prot">0</div><div class="grams-macro-lbl">Белки, г</div></div>' +
      '<div class="grams-macro f"><div class="grams-macro-val" id="grams-fat">0</div><div class="grams-macro-lbl">Жиры, г</div></div>' +
      '<div class="grams-macro c"><div class="grams-macro-val" id="grams-carb">0</div><div class="grams-macro-lbl">Углеводы, г</div></div>' +
    '</div>' +

    '<div class="grams-ctrl" style="justify-content:center;">' +
      '<div class="grams-input-wrap">' +
        '<input id="grams-input" type="number" inputmode="decimal" value="' + grams + '" min="1" max="9999"' +
          ' oninput="recalcGrams(+this.value||0)">' +
        '<span class="grams-unit">г</span>' +
      '</div>' +
    '</div>' +

    '<button class="grams-save-btn" onclick="saveGramsEntry()">Сохранить</button>';
}

function recalcGrams(g) {
  const item = window._gramsItem;
  if (!item) return;
  const k = g / 100;
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
  const k = g / 100;
  const kcal    = Math.round(item.kcal100 * k);
  const protein = +((+item.p100 * k).toFixed(1));
  const carbs   = +((+item.c100 * k).toFixed(1));
  const fat     = +((+item.f100 * k).toFixed(1));

  if (window._gramsEntryId) {
    const idx = nutrEntries.findIndex(e => e.id === window._gramsEntryId);
    if (idx !== -1) {
      nutrEntries[idx] = Object.assign({}, nutrEntries[idx], { grams: g, kcal, protein, carbs, fat });
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
      kcal, protein, carbs, fat,
      grams: g,
      mealType: window._currentMealType || 'breakfast',
      date: (function(){ var d=new Date(); d.setDate(d.getDate()+(window._nutrOffset||0)); return d.toLocaleDateString('ru-RU'); })()
    };
    nutrEntries.push(entry);
    localStorage.setItem('fs-nutrition', JSON.stringify(nutrEntries));
  }

  closeGramsSheet();
  renderNutrEntries();
  toast('✅ ' + item.name + ' — ' + g + ' г');
}
window.saveGramsEntry = saveGramsEntry;

function closeGramsSheet() {
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
  const dbItem = FOOD_DB.find(f => f.n === entry.name);
  let item100;
  if (dbItem) {
    item100 = { name: dbItem.n, kcal100: dbItem.kcal, p100: dbItem.p, c100: dbItem.c, f100: dbItem.f };
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
  const kcalNeeded = deficit < 0
    ? Math.round((profile?.tdee || 2000) + deficit)
    : Math.round((profile?.tdee || 2000) + deficit);
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

window.startSheetVoice = function(inputId, callbackName) {
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    toast('❌ Голосовой ввод не поддерживается');
    return;
  }
  const input = document.getElementById(inputId);
  const btn = input ? input.parentElement.querySelector('button[aria-label="Голосовой ввод"]') : null;

  if (_sheetMicActive) {
    _sheetMicActive = false;
    if (_sheetRec) { try { _sheetRec.stop(); } catch(e){} _sheetRec = null; }
    if (btn) { btn.style.background = 'var(--accent)'; btn.style.animation = ''; }
    return;
  }

  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  _sheetRec = new SR();
  _sheetRec.lang = 'ru-RU';
  _sheetRec.interimResults = false;
  _sheetRec.maxAlternatives = 1;
  _sheetMicActive = true;
  if (btn) { btn.style.background = '#ef4444'; btn.style.animation = 'pulse 0.8s infinite'; }

  _sheetRec.onresult = (e) => {
    const text = e.results[0][0].transcript;
    if (input) { input.value = text; input.dispatchEvent(new Event('input')); }
    if (callbackName && window[callbackName]) window[callbackName]();
    _sheetMicActive = false;
    if (btn) { btn.style.background = 'var(--accent)'; btn.style.animation = ''; }
  };
  _sheetRec.onerror = () => {
    _sheetMicActive = false;
    if (btn) { btn.style.background = 'var(--accent)'; btn.style.animation = ''; }
    toast('❌ Ошибка микрофона');
  };
  _sheetRec.onend = () => {
    _sheetMicActive = false;
    if (btn) { btn.style.background = 'var(--accent)'; btn.style.animation = ''; }
  };
  _sheetRec.start();
};
