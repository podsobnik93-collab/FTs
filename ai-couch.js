/**
 * ai-couch.js — объединённый AI модуль для FitSim
 * (с поддержкой профиля и питания в основном чате)
 */

'use strict';

/* ══════════════════════════════════════════════════════════════
   AI-COACH CORE
   ══════════════════════════════════════════════════════════════ */

var aiGoal = 'loss';
var aiLevel = '';
var aiEquip = [];
var aiChatHistory = [];
var chatReady = false;
var lastTopic = null;
var generating = false;
var lastPlanParams = null;
var aiStyle = 'fullbody';
var aiIntensity = 'medium';

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function extractJSON(str) {
  if (!str) return null;
  var clean = String(str).replace(/```json|```/g, '');
  var start = clean.indexOf('{');
  if (start === -1) return null;
  var depth = 0, inString = false, escaped = false;
  for (var i = start; i < clean.length; i++) {
    var ch = clean[i];
    if (escaped) { escaped = false; continue; }
    if (ch === '\\') { escaped = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '{') depth++;
    if (ch === '}') {
      depth--;
      if (depth === 0) {
        try { return JSON.parse(clean.slice(start, i + 1)); }
        catch (e) { return null; }
      }
    }
  }
  return null;
}

async function callGroq(key, sys, msgs, max) {
  var r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + key
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'system', content: sys }].concat(msgs || []),
      max_tokens: max || 1200,
      temperature: 0.55
    }),
    signal: AbortSignal.timeout(35000)
  });
  if (!r.ok) throw new Error('Groq ' + r.status);
  var d = await r.json();
  return d && d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content || '';
}

function persistChatHistory() {
  try { localStorage.setItem('fs-ai-chat-history', JSON.stringify(aiChatHistory.slice(-40))); }
  catch (e) {}
}

function restoreChatHistory() {
  try {
    aiChatHistory = JSON.parse(localStorage.getItem('fs-ai-chat-history') || '[]');
  } catch (e) {
    aiChatHistory = [];
  }
}

function appendMsg(role, text) {
  var msgs = document.getElementById('ai-chat-msgs');
  if (!msgs) return;
  var wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex;' + (role === 'user' ? 'justify-content:flex-end' : '');
  var bubble = document.createElement('div');
  bubble.className = 'ai-bubble ai-bubble-' + role;
  bubble.innerHTML = escapeHtml(String(text || ''))
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>');
  wrap.appendChild(bubble);
  msgs.appendChild(wrap);
  msgs.scrollTop = msgs.scrollHeight;
}

function appendTyping(id) {
  var msgs = document.getElementById('ai-chat-msgs');
  if (!msgs) return;
  var w = document.createElement('div');
  w.id = id;
  w.innerHTML = '<div class="ai-bubble ai-bubble-ai">⏳ Печатает...</div>';
  msgs.appendChild(w);
  msgs.scrollTop = msgs.scrollHeight;
}

function removeTyping(id) {
  var e = document.getElementById(id);
  if (e) e.remove();
}

function makeFallback(goal, level, days, dur, style, intensity, months) {
  var isBeginner = (level === 'новичок' || months < 3);
  var prepMode = (style === 'prep' || (isBeginner && !style));
  var isLight = intensity === 'light' || isBeginner;
  var sets = prepMode ? 2 : style === 'split' ? 2 : 3;
  var reps = prepMode ? '15-20' : isLight ? '12-15' : '8-12';
  var rest = prepMode ? 60 : isLight ? 60 : 90;

  var title = '4-нед. план: ' + goal + ' (' + (level || 'базовый') + ') — ' + (prepMode ? 'подготовительный' : style || 'fullbody');
  var themes = ['Адаптация и техника', 'Рост объёма', 'Укрепление', 'Deload'];
  var weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
  var weeks = [];

  function ex(name, kg, notes, rpe) {
    return { name: name, sets: sets, reps: reps, rest: rest, kg: kg || 0, rpe: rpe || (prepMode ? 5 : 7), notes: notes || '' };
  }

  var pools = {
    loss: prepMode ? [
      ex('Приседания с опорой', 0, 'Контроль техники', 5),
      ex('Отжимания с колен', 0, '', 5),
      ex('Тяга резинки к поясу', 0, '', 5),
      { name: 'Планка на коленях', sets: 2, reps: '20сек', rest: 30, kg: 0, rpe: 5, notes: 'Статика' },
      ex('Ягодичный мостик', 0, '', 5)
    ] : [
      ex('Приседания с гантелями', 10, '', isLight ? 6 : 7),
      ex('Жим гантелей лёжа', 10, '', isLight ? 6 : 7),
      ex('Тяга гантели в наклоне', 10, '', isLight ? 6 : 7),
      { name: 'Планка', sets: 3, reps: '30-40сек', rest: 30, kg: 0, rpe: 6, notes: '' },
      ex('Ягодичный мостик', 0, '', 6)
    ],
    gain: prepMode ? [
      ex('Приседания с гантелями лёгкие', 8, '', 5),
      ex('Жим гантелей лёжа', 8, '', 5),
      ex('Тяга гантели в наклоне', 8, '', 5),
      { name: 'Планка', sets: 2, reps: '30сек', rest: 30, kg: 0, rpe: 5, notes: '' },
      ex('Ягодичный мостик', 0, '', 5)
    ] : [
      ex('Приседания со штангой', 30, 'Осваивай технику', 7),
      ex('Жим штанги лёжа', 30, '', 7),
      ex('Тяга штанги в наклоне', 25, '', 7),
      ex('Армейский жим гантелей', 10, '', 7),
      ex('Подтягивания / тяга блока', 0, '', 7)
    ],
    tone: prepMode ? [
      ex('Приседания с опорой', 0, '', 5),
      ex('Отжимания с колен', 0, '', 5),
      ex('Тяга резинки', 0, '', 5),
      { name: 'Планка на коленях', sets: 2, reps: '20сек', rest: 30, kg: 0, rpe: 5, notes: '' },
      ex('Ягодичный мостик', 0, '', 5)
    ] : [
      ex('Приседания с гантелями', 10, '', 7),
      ex('Жим гантелей лёжа', 10, '', 7),
      ex('Тяга гантели в наклоне', 10, '', 7),
      ex('Боковые подъёмы гантелей', 4, '', 7),
      { name: 'Планка', sets: 3, reps: '40сек', rest: 30, kg: 0, rpe: 6, notes: '' }
    ]
  };

  var exercises = pools[goal] || pools.tone;
  for (var w = 0; w < 4; w++) {
    var arr = [];
    for (var d = 0; d < 7; d++) {
      var isTrain = d < Math.max(2, Math.min(6, days || 3));
      if (isTrain) {
        var exs = exercises.map(function(item) {
          var copy = JSON.parse(JSON.stringify(item));
          if (w === 3) {
            if (copy.sets) copy.sets = Math.max(1, Math.floor(copy.sets * 0.6));
            if (copy.rpe) copy.rpe = Math.max(4, copy.rpe - 1);
            copy.notes = (copy.notes ? copy.notes + ' ' : '') + '[Deload]';
          }
          return copy;
        });
        arr.push({
          dayNumber: d + 1,
          name: weekDays[d] + ' Тренировка',
          type: 'тренировка',
          duration: w === 3 ? Math.round((dur || 45) * 0.6) : (dur || 45),
          caloriesBurned: goal === 'gain' ? 420 : goal === 'loss' ? 300 : 330,
          exercises: exs
        });
      } else {
        arr.push({ dayNumber: d + 1, name: weekDays[d] + ' Отдых', type: 'отдых', duration: 0, caloriesBurned: 0, exercises: [] });
      }
    }
    weeks.push({
      weekNumber: w + 1,
      theme: themes[w],
      progressionNote: w === 3 ? 'Снижение объёма на 40% для восстановления' : 'Постепенно увеличивай нагрузку при хорошем самочувствии',
      days: arr
    });
  }

  return {
    title: title,
    goal: goal,
    nutrition: {
      dailyCalories: goal === 'gain' ? 2800 : goal === 'loss' ? 1800 : 2200,
      protein: goal === 'gain' ? 160 : 140,
      carbs: goal === 'gain' ? 320 : 180,
      fat: 65,
      tip: 'Ешь каждые 3–4 часа, делай упор на цельные продукты.'
    },
    weeks: weeks
  };
}

function renderPlan(plan) {
  var container = document.getElementById('ai-plan-result');
  if (!container || !plan) return;
  var html = '';
  html += '<div style="font-weight:800;font-size:1.05rem;margin-bottom:12px">' + escapeHtml(plan.title || '') + '</div>';
  if (plan.nutrition) {
    html += '<div style="padding:12px;border-radius:14px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);margin-bottom:12px">';
    html += '<div style="font-weight:700;margin-bottom:4px">🥗 Питание</div>';
    html += '<div>' + plan.nutrition.dailyCalories + ' ккал | Б:' + plan.nutrition.protein + 'г У:' + plan.nutrition.carbs + 'г Ж:' + plan.nutrition.fat + 'г</div>';
    if (plan.nutrition.tip) html += '<div style="margin-top:6px;color:var(--text-light,#aaa)">💡 ' + escapeHtml(plan.nutrition.tip) + '</div>';
    html += '</div>';
  }
  for (var w = 0; w < (plan.weeks || []).length; w++) {
    var week = plan.weeks[w];
    html += '<div style="margin:14px 0 10px;font-weight:800">Неделя ' + week.weekNumber + (week.theme ? ' — ' + escapeHtml(week.theme) : '') + '</div>';
    if (week.progressionNote) html += '<div style="font-size:.9rem;color:var(--text-light,#aaa);margin-bottom:8px">📈 ' + escapeHtml(week.progressionNote) + '</div>';
    for (var d = 0; d < (week.days || []).length; d++) {
      var day = week.days[d];
      var isRest = day.type === 'отдых';
      html += '<div style="padding:12px;border-radius:14px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.06);margin-bottom:8px">';
      html += '<div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap">';
      html += '<div style="font-weight:700">' + escapeHtml(day.name || '') + '</div>';
      html += '<div style="color:var(--text-light,#aaa)">' + (day.duration ? day.duration + ' мин' : '') + (day.caloriesBurned ? ' · ~' + day.caloriesBurned + ' ккал' : '') + '</div>';
      html += '</div>';
      if (!isRest && day.exercises && day.exercises.length) {
        html += '<ol style="margin:10px 0 0 18px;padding:0">';
        for (var e = 0; e < day.exercises.length; e++) {
          var ex = day.exercises[e];
          html += '<li style="margin-bottom:8px">';
          html += '<div><strong>' + escapeHtml(ex.name || '') + '</strong> — ' + ex.sets + '×' + escapeHtml(ex.reps || '') + (ex.kg ? ' · ' + ex.kg + ' кг' : '') + (ex.rest ? ' · ' + ex.rest + 'с' : '') + (ex.rpe ? ' · RPE ' + ex.rpe : '') + '</div>';
          if (ex.notes) html += '<div style="font-size:.9rem;color:var(--text-light,#aaa)">' + escapeHtml(ex.notes) + '</div>';
          html += '</li>';
        }
        html += '</ol>';
      } else {
        html += '<div style="margin-top:8px;color:var(--text-light,#aaa)">🛌 День отдыха — прогулка, лёгкая мобильность, восстановление.</div>';
      }
      html += '</div>';
    }
  }
  container.innerHTML = html;
}

window.aiSetGoal = function(v, b) {
  aiGoal = v;
  ['loss','gain','tone'].forEach(function(id) {
    var e = document.getElementById('ai-goal-' + id);
    if (e) e.className = 'ai-chip' + (e === b ? ' ai-chip-active' : '');
  });
};

window.aiSetLevel = function(v, b) {
  aiLevel = v;
  ['beg','mid','adv'].forEach(function(id) {
    var e = document.getElementById('ai-lvl-' + id);
    if (e) e.className = 'ai-chip' + (e === b ? ' ai-chip-active' : '');
  });
};

window.aiToggleEquip = function(v, b) {
  var i = aiEquip.indexOf(v);
  if (i >= 0) { aiEquip.splice(i, 1); if (b) b.className = 'ai-chip'; }
  else { aiEquip.push(v); if (b) b.className = 'ai-chip ai-chip-active'; }
};

window.aiSetStyle = function(v, b) {
  aiStyle = v;
  ['ai-style-fullbody', 'ai-style-split', 'ai-style-prep'].forEach(function(id) {
    var e = document.getElementById(id);
    if (e) e.className = 'ai-chip' + (e === b ? ' ai-chip-active ai-style-active' : '');
  });
};

window.aiSetIntensity = function(v, b) {
  aiIntensity = v;
  ['ai-int-light', 'ai-int-medium'].forEach(function(id) {
    var e = document.getElementById(id);
    if (e) e.className = 'ai-chip' + (e === b ? ' ai-chip-active ai-int-active' : '');
  });
};

window.aiSaveKey = function() {
  var inp = document.getElementById('ai-key-input');
  var k = inp ? inp.value.trim() : '';
  var s = document.getElementById('ai-key-status');
  if (k) {
    localStorage.setItem('fs-groq-key', k);
    if (inp) { inp.value = ''; inp.placeholder = 'gsk_...сохранён'; }
    if (s) s.textContent = '✓ Ключ сохранён — модель llama-3.3-70b-versatile';
    if (typeof toast === 'function') toast('✓ Groq API-ключ сохранён');
  } else {
    localStorage.removeItem('fs-groq-key');
    if (s) s.textContent = 'Ключ удалён — работает офлайн-режим';
  }
};

window.aiGeneratePlan = async function() {
  if (generating) {
    if (typeof toast === 'function') toast('⏳ Уже генерирую...');
    return;
  }
  generating = true;

  var days = parseInt((document.getElementById('ai-days-slider') || { value: '3' }).value, 10) || 3;
  var dur = parseInt((document.getElementById('ai-dur-slider') || { value: '45' }).value, 10) || 45;
  var restr = ((document.getElementById('ai-restrictions') || {}).value || '').trim();
  var styleEl = document.querySelector('.ai-style-active');
  if (styleEl) {
    var styleVal = styleEl.dataset.style || styleEl.id.replace('ai-style-', '');
    if (['fullbody', 'split', 'prep'].indexOf(styleVal) !== -1) aiStyle = styleVal;
  }
  var intEl = document.querySelector('.ai-int-active');
  if (intEl) {
    var intVal = intEl.dataset.intensity || intEl.id.replace('ai-int-', '');
    if (['light', 'medium'].indexOf(intVal) !== -1) aiIntensity = intVal;
  }

  var gl = { loss: 'похудение', gain: 'набор массы', tone: 'тонус и рельеф' }[aiGoal] || aiGoal;
  var gb = document.getElementById('ai-gen-btn');
  var ld = document.getElementById('ai-plan-loading');
  var res = document.getElementById('ai-plan-result');
  if (gb) gb.style.display = 'none';
  if (ld) ld.style.display = '';
  if (res) res.innerHTML = '';

  var profile = {};
  try { profile = JSON.parse(localStorage.getItem('fs-profile') || '{}'); } catch (e) {}

  var userAge = profile.age || 28;
  var userWeight = profile.weight || 75;
  var userHeight = profile.height || 175;
  var userGender = profile.gender === 'female' ? 'женщина' : 'мужчина';
  var userGoalW = profile.target ? ('цель: ' + profile.target + ' кг за ' + (profile.weeks || 12) + ' нед.') : '';
  var trainingMonths = parseInt(profile.trainingMonths, 10) || 0;
  if (!aiLevel) {
    aiLevel = trainingMonths <= 3 ? 'новичок' : trainingMonths <= 12 ? 'начинающий' : trainingMonths <= 36 ? 'средний' : 'продвинутый';
  }
  var expLabel = trainingMonths === 0 ? 'новичок (стаж не указан)' :
    trainingMonths <= 3 ? 'новичок (' + trainingMonths + ' мес.)' :
    trainingMonths <= 12 ? 'начинающий (' + trainingMonths + ' мес.)' :
    trainingMonths <= 36 ? 'средний (' + trainingMonths + ' мес.)' :
    'продвинутый (' + trainingMonths + ' мес.)';
  var hint = document.getElementById('ai-lvl-hint');
  if (hint) hint.textContent = '🔹 Уровень: ' + aiLevel + (trainingMonths > 0 ? ' (стаж ' + trainingMonths + ' мес.)' : '');
  if (trainingMonths < 3 && aiLevel === 'новичок' && aiStyle === 'fullbody') aiStyle = 'prep';

  lastPlanParams = { days: days, dur: dur, restr: restr, gl: gl, aiGoal: aiGoal, aiLevel: aiLevel, aiEquip: aiEquip.slice(), userAge: userAge, userWeight: userWeight, userHeight: userHeight, userGender: userGender, userGoalW: userGoalW, trainingMonths: trainingMonths, expLabel: expLabel, aiStyle: aiStyle, aiIntensity: aiIntensity };

  var plan = null;
  try {
    var key = localStorage.getItem('fs-groq-key');
    if (key) {
      var styleDesc = {
        fullbody: 'Full Body — проработка всего тела за тренировку',
        split: 'Сплит — разделение по мышечным группам',
        prep: 'Подготовительный — лёгкий адаптационный режим'
      }[aiStyle] || 'Full Body';
      var intensityDesc = aiIntensity === 'light' ? 'лёгкая' : 'средняя';
      var sys = 'Ты — элитный персональный тренер и нутрициолог. Составляй безопасные и реалистичные программы. Стиль: ' + styleDesc + '. Интенсивность: ' + intensityDesc + '. Ответ ТОЛЬКО в JSON формате с полями title, goal, nutrition, weeks.';
      var usr = 'Составь 4-недельную программу. Цель: ' + gl + ', уровень: ' + aiLevel + ', стаж: ' + expLabel + ', дней в неделю: ' + days + ', время: ' + dur + ' мин. Оборудование: ' + (aiEquip.join(', ') || 'зал') + '.' + (restr ? ' Ограничения: ' + restr : '') + ' Клиент: ' + userGender + ', ' + userAge + ' лет, вес ' + userWeight + ' кг, рост ' + userHeight + ' см. ' + userGoalW;
      var reply = await callGroq(key, sys, [{ role: 'user', content: usr }], 3000);
      plan = extractJSON(reply);
    }
  } catch (e) {
    console.warn('Groq error:', e.message);
  }

  if (!plan) plan = makeFallback(aiGoal, aiLevel, days, dur, aiStyle, aiIntensity, trainingMonths);
  if (gb) gb.style.display = '';
  if (ld) ld.style.display = 'none';
  renderPlan(plan);
  generating = false;
};

window.clearChatHistory = function() {
  aiChatHistory = [];
  try { localStorage.removeItem('fs-ai-chat-history'); } catch (e) {}
  var msgs = document.getElementById('ai-chat-msgs');
  if (msgs) msgs.innerHTML = '';
  appendMsg('ai', '💬 История очищена. Можем начать заново — о чём поговорим?');
};

// ===== ОСНОВНОЙ ЧАТ — ТЕПЕРЬ С ПРОФИЛЕМ =====
window.aiAsk = async function(prefill) {
  var input = document.getElementById('ai-chat-input');
  var text = prefill || (input ? input.value.trim() : '');
  if (!text) return;
  if (input && !prefill) input.value = '';

  appendMsg('user', text);
  aiChatHistory.push({ role: 'user', content: text });
  persistChatHistory();

  var tId = 'typing-' + Date.now();
  appendTyping(tId);
  var reply = '';

  // Собираем данные профиля
  var profile = {};
  try { profile = JSON.parse(localStorage.getItem('fs-profile') || '{}'); } catch (e) {}
  var profileInfo = '';
  if (profile.weight) {
    var goalLabel = { loss: 'похудение', gain: 'набор массы', maintain: 'поддержание', tone: 'тонус' };
    profileInfo = 'Пользователь: ' + (profile.gender === 'female' ? 'женщина' : 'мужчина') +
      ', ' + (profile.age || 25) + ' лет, вес ' + profile.weight + ' кг, рост ' + (profile.height || 175) +
      ' см, цель: ' + (goalLabel[profile.goal] || profile.goal || 'не указана') +
      ', активность: ' + (profile.activity || 'средняя') + '.';
  }

  // Собираем данные питания за сегодня
  var nutrInfo = '';
  try {
    var entries = JSON.parse(localStorage.getItem('fs-nutrition') || '[]');
    var today = new Date().toLocaleDateString('ru-RU');
    var todayE = entries.filter(e => e.date === today);
    if (todayE.length) {
      var totals = todayE.reduce((a, e) => ({
        kcal: a.kcal + (e.kcal || 0),
        protein: a.protein + (e.protein || 0),
        carbs: a.carbs + (e.carbs || 0),
        fat: a.fat + (e.fat || 0)
      }), { kcal: 0, protein: 0, carbs: 0, fat: 0 });
      nutrInfo = ' Сегодня съедено: ' + Math.round(totals.kcal) + ' ккал, белок ' + Math.round(totals.protein) +
        'г, жиры ' + Math.round(totals.fat) + 'г, углеводы ' + Math.round(totals.carbs) + 'г.';
    }
  } catch (e) {}

  try {
    var key = localStorage.getItem('fs-groq-key');
    if (key) {
      var sys = 'Ты дружелюбный AI-фитнес-коуч FitSim. Отвечай кратко, полезно и по делу на русском языке. ' +
        'Учитывай тренировки, питание, восстановление, технику, дефицит, набор массы. ' +
        'Вот данные пользователя: ' + profileInfo + nutrInfo +
        ' Используй их для персонализированных ответов. Если вопрос не касается конкретных цифр, просто дай общий совет.';
      reply = await callGroq(key, sys, aiChatHistory.slice(-12), 900);
    } else {
      // Без ключа — используем профиль для базовых ответов
      var tl = text.toLowerCase();
      var weight = profile.weight || 75;
      if (tl.includes('белок') || tl.includes('протеин')) {
        var proteinGoal = profile.goal === 'gain' ? weight * 2.2 : weight * 1.8;
        reply = '**Белок:** ориентир ' + proteinGoal.toFixed(1) + ' г/день (1.8–2.2 г/кг массы тела). При похудении держи верхнюю границу.';
      } else if (tl.includes('дефицит') || tl.includes('калори')) {
        var bmr = 10 * weight + 6.25 * (profile.height || 175) - 5 * (profile.age || 25) + (profile.gender === 'female' ? -161 : 5);
        var tdee = Math.round(bmr * (profile.activity || 1.55));
        var deficit = profile.goal === 'loss' ? 400 : (profile.goal === 'gain' ? -300 : 0);
        var rec = Math.round(tdee + deficit);
        reply = '**Калорийность:** твой TDEE ~ ' + tdee + ' ккал. Для цели "' + (profile.goal || 'поддержание') + '" рекомендую ~ ' + rec + ' ккал/день.';
      } else if (tl.includes('сон')) {
        reply = '**Сон:** 7–9 часов напрямую влияет на восстановление, аппетит и силовые показатели.';
      } else if (tl.includes('кардио')) {
        reply = '**Кардио:** для жиросжигания подойдут 2–3 сессии LISS по 30–60 минут плюс шаги в течение дня.';
      } else if (tl.includes('креатин') || tl.includes('добавк')) {
        reply = '**Добавки:** базово работают креатин, кофеин, витамин D при дефиците и сывороточный протеин как удобный источник белка.';
      } else if (tl.includes('рацион') || tl.includes('план питания')) {
        if (profile.weight) {
          reply = 'На основе твоих данных (вес ' + weight + ' кг, цель ' + (profile.goal || 'поддержание') +
            ') могу предложить примерный рацион. Для точного расчёта лучше добавить Groq API-ключ, но базово: ' +
            'белок ~ ' + (profile.goal === 'gain' ? weight * 2.2 : weight * 1.8).toFixed(1) + ' г, жиры ~ ' +
            Math.round(weight * 0.8) + ' г, углеводы ~ ' + Math.round(weight * 3) + ' г. Распредели на 4-5 приёмов.';
        } else {
          reply = 'Для составления рациона укажи свои параметры в профиле (вес, рост, цель).';
        }
      } else {
        reply = 'Для точного ответа лучше добавить Groq API-ключ в разделе AI → ключ 🔑. ' +
          'Без ключа я могу отвечать только базово, но я вижу твой профиль: ' + profileInfo +
          ' Можешь спросить про белок, калории, сон или кардио.';
      }
    }
  } catch (e) {
    reply = '⚠️ Ошибка соединения. Проверь API-ключ или попробуй позже.';
  }
  removeTyping(tId);
  appendMsg('ai', reply);
  aiChatHistory.push({ role: 'assistant', content: reply });
  persistChatHistory();
};

window.aiSwitchTab = function(tab) {
  document.querySelectorAll('.ai-pane').forEach(function(el) {
    el.style.display = 'none';
  });
  var pane = document.getElementById('ai-pane-' + tab);
  if (pane) pane.style.display = 'block';
  document.querySelectorAll('.ai-tab').forEach(function(el) {
    el.classList.remove('ai-tab-active');
  });
  var tabBtn = document.getElementById('ai-tab-' + tab);
  if (tabBtn) tabBtn.classList.add('ai-tab-active');
  // Обновляем отображение ключа при переходе на вкладку API
  if (tab === 'key') {
    var savedKey = localStorage.getItem('fs-groq-key');
    var keyInp = document.getElementById('ai-key-input');
    var keyStatus = document.getElementById('ai-key-status');
    if (savedKey) {
      if (keyInp) { keyInp.value = ''; keyInp.placeholder = '✓ Ключ сохранён (gsk_...)'; }
      if (keyStatus) keyStatus.textContent = '✓ Ключ активен — модель llama-3.3-70b-versatile';
    } else {
      if (keyInp) { keyInp.value = ''; keyInp.placeholder = 'Groq API key (gsk_...)'; }
      if (keyStatus) keyStatus.textContent = 'Ключ не сохранён — работает офлайн-режим';
    }
  }
};

window.aiSendMessage = function() {
  var input = document.getElementById('ai-chat-input');
  if (input) window.aiAsk(input.value);
};

window.aiSendQuick = function(text) {
  window.aiAsk(text);
};

function initAiCoachBindings() {
  restoreChatHistory();
  var msgs = document.getElementById('ai-chat-msgs');
  if (msgs) {
    msgs.innerHTML = '';
    if (aiChatHistory.length) {
      aiChatHistory.forEach(function(m) { appendMsg(m.role === 'assistant' ? 'ai' : 'user', m.content); });
    } else {
      appendMsg('ai', '💬 Привет! Я твой AI-фитнес-коуч. Я вижу твой профиль (если он заполнен) и могу давать персонализированные советы. Спрашивай про тренировки, питание, восстановление!');
    }
  }
  var input = document.getElementById('ai-chat-input');
  if (input && !input.dataset.aiBound) {
    input.dataset.aiBound = '1';
    input.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        window.aiSendMessage();
      }
    });
  }
  // Восстанавливаем статус сохранённого ключа
  var savedKey = localStorage.getItem('fs-groq-key');
  var keyInp = document.getElementById('ai-key-input');
  var keyStatus = document.getElementById('ai-key-status');
  if (savedKey) {
    if (keyInp) { keyInp.value = ''; keyInp.placeholder = '✓ Ключ сохранён (gsk_...)'; }
    if (keyStatus) keyStatus.textContent = '✓ Ключ активен — модель llama-3.3-70b-versatile';
  }
}

/* ══════════════════════════════════════════════════════════════
   КОНТЕКСТНЫЙ АССИСТЕНТ (плавающая кнопка)
   ══════════════════════════════════════════════════════════════ */

const AI_CTX = {
  workout: {
    icon: '🏋️', label: 'AI-тренер', color: 'var(--accent, #a78bfa)', pages: ['workout'],
    getContext() {
      const profile = _getProfile();
      let workoutInfo = '';
      try {
        const exercises = window.customWt || [];
        if (exercises.length) workoutInfo = 'Текущие упражнения: ' + exercises.map(e => e.n || e.name).join(', ') + '. ';
      } catch (e) {}
      return 'Ты фитнес-коуч приложения FitSim. ' + profile + workoutInfo + 'Отвечай коротко и конкретно на вопросы по тренировке. Максимум 150 слов.';
    },
    quickMessages: ['💡 Подсказка по технике?', '🔄 Как заменить упражнение?', '⚡ Сколько отдыхать между подходами?']
  },
  nutrition: {
    icon: '🥗', label: 'AI-нутрициолог', color: '#22c55e', pages: ['nutrition'],
    getContext() {
      const profile = _getProfile();
      let nutrInfo = '';
      try {
        const entries = JSON.parse(localStorage.getItem('fs-nutrition') || '[]');
        const today = new Date().toLocaleDateString('ru-RU');
        const todayE = entries.filter(e => e.date === today);
        if (todayE.length) {
          const totals = todayE.reduce((a, e) => ({ kcal: a.kcal + (e.kcal || 0), protein: a.protein + (e.protein || 0), carbs: a.carbs + (e.carbs || 0), fat: a.fat + (e.fat || 0) }), { kcal: 0, protein: 0, carbs: 0, fat: 0 });
          nutrInfo = 'Сегодня съедено: ' + Math.round(totals.kcal) + ' ккал, белок ' + Math.round(totals.protein) + 'г, жиры ' + Math.round(totals.fat) + 'г, углеводы ' + Math.round(totals.carbs) + 'г. ';
        }
      } catch (e) {}
      return 'Ты нутрициолог-диетолог в FitSim. ' + profile + nutrInfo + 'Давай конкретные советы по питанию. Максимум 150 слов.';
    },
    quickMessages: ['🍽️ Что съесть после тренировки?', '📊 Как закрыть норму белка?', '🛒 Продукты для набора массы?']
  },
  diary: {
    icon: '📓', label: 'AI-анализ', color: '#f59e0b', pages: ['diary'],
    getContext() {
      return 'Ты персональный тренер-аналитик в FitSim. ' + _getProfile() + ' Анализируй прогресс и давай рекомендации. Максимум 150 слов.';
    },
    quickMessages: ['📈 Анализ моего прогресса', '🔥 Как улучшить результаты?', '😴 Достаточно ли я восстанавливаюсь?']
  },
  stats: {
    icon: '📊', label: 'AI-статистик', color: '#6366f1', pages: ['stats'],
    getContext() {
      return 'Ты спортивный аналитик в FitSim. ' + _getProfile() + ' Объясняй метрики, помогай интерпретировать статистику. Максимум 150 слов.';
    },
    quickMessages: ['📉 Что такое TDEE и BMR?', '💪 Как читать мой прогресс?', '🎯 Реалистичны ли мои цели?']
  },
  simulation: {
    icon: '🧮', label: 'AI-калькулятор', color: '#ec4899', pages: ['simulation'],
    getContext() {
      return 'Ты фитнес-калькулятор в FitSim. ' + _getProfile() + ' Помогай рассчитывать калорийность, дефицит и сроки достижения целей. Максимум 150 слов.';
    },
    quickMessages: ['⚡ Каким должен быть дефицит?', '📅 Сколько недель до цели?', '🏃 Кардио vs дефицит питания?']
  },
  calendar: {
    icon: '📅', label: 'AI-планировщик', color: '#14b8a6', pages: ['calendar'],
    getContext() {
      return 'Ты планировщик тренировок в FitSim. ' + _getProfile() + ' Помогай планировать цикл, нагрузку и отдых. Максимум 150 слов.';
    },
    quickMessages: ['📆 Как распределить тренировки?', '💤 Сколько дней отдыха нужно?', '🔄 Советы по периодизации?']
  }
};

function _getProfile() {
  try {
    const pr = JSON.parse(localStorage.getItem('fs-profile') || '{}');
    if (!pr.weight) return '';
    const goalLabel = { loss: 'похудение', gain: 'набор массы', maintain: 'поддержание', tone: 'тонус' };
    return 'Пользователь: ' + (pr.gender === 'female' ? 'женщина' : 'мужчина') + ', ' + (pr.age || 25) + ' лет, вес ' + pr.weight + ' кг, рост ' + (pr.height || 175) + ' см, цель: ' + (goalLabel[pr.goal] || pr.goal || 'не указана') + '. ';
  } catch (e) {
    return '';
  }
}

function _injectCtxStyles() {
  if (document.getElementById('ai-ctx-styles')) return;
  const style = document.createElement('style');
  style.id = 'ai-ctx-styles';
  style.textContent = `
    .ai-ctx-fab{position:fixed;right:16px;bottom:80px;width:50px;height:50px;border-radius:50%;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:22px;z-index:300;box-shadow:0 4px 18px rgba(0,0,0,.4);transition:transform .22s cubic-bezier(.16,1,.3,1),opacity .22s,bottom .2s;opacity:0;pointer-events:none;transform:scale(.65);line-height:1}
    .ai-ctx-fab.visible{opacity:1;pointer-events:auto;transform:scale(1)}
    .ai-ctx-fab:active{transform:scale(.9)}
    .ai-ctx-panel{position:fixed;right:12px;bottom:140px;width:min(340px,calc(100vw - 24px));background:var(--card,#1c1b19);border:1px solid var(--border,rgba(255,255,255,.12));border-radius:20px;box-shadow:0 16px 48px rgba(0,0,0,.55);z-index:299;display:flex;flex-direction:column;max-height:min(480px,62vh);overflow:hidden;opacity:0;transform:translateY(14px) scale(.96);pointer-events:none;transition:opacity .22s cubic-bezier(.16,1,.3,1),transform .22s cubic-bezier(.16,1,.3,1)}
    .ai-ctx-panel.open{opacity:1;transform:translateY(0) scale(1);pointer-events:auto}
    .ai-ctx-header{display:flex;align-items:center;gap:10px;padding:13px 14px 11px;border-bottom:1px solid var(--border,rgba(255,255,255,.08));flex-shrink:0}
    .ai-ctx-header-title{flex:1;font-size:13px;font-weight:700;color:var(--text,#cdccca)}
    .ai-ctx-header-close{background:none;border:none;cursor:pointer;color:var(--text-light,#797876);font-size:17px;padding:3px;line-height:1;border-radius:6px}
    .ai-ctx-quick{display:flex;gap:6px;padding:8px 12px 6px;overflow-x:auto;flex-shrink:0;scrollbar-width:none}.ai-ctx-quick::-webkit-scrollbar{display:none}
    .ai-ctx-quick-btn{background:var(--input-bg,rgba(255,255,255,.06));border:1px solid var(--border,rgba(255,255,255,.1));border-radius:20px;padding:5px 11px;font-size:11px;font-weight:600;color:var(--text-light,#aaa);cursor:pointer;white-space:nowrap;flex-shrink:0;font-family:inherit}
    .ai-ctx-msgs{flex:1;overflow-y:auto;padding:8px 12px;display:flex;flex-direction:column;gap:8px}
    .ai-ctx-msg{max-width:88%;padding:9px 13px;border-radius:14px;font-size:13px;line-height:1.5;word-break:break-word}
    .ai-ctx-msg-user{margin-left:auto;background:var(--accent,#a78bfa);color:#fff;border-bottom-right-radius:4px}
    .ai-ctx-msg-ai{background:var(--input-bg,rgba(255,255,255,.05));color:var(--text,#cdccca);border:1px solid var(--border,rgba(255,255,255,.08));border-bottom-left-radius:4px}
    .ai-ctx-typing{display:inline-flex;gap:4px;padding:10px 14px;background:var(--input-bg,rgba(255,255,255,.05));border-radius:14px;border-bottom-left-radius:4px;border:1px solid var(--border,rgba(255,255,255,.08));align-self:flex-start}
    .ai-ctx-typing span{width:6px;height:6px;border-radius:50%;background:var(--text-light,#797876);display:block;animation:aiCtxDot 1s infinite ease-in-out}.ai-ctx-typing span:nth-child(2){animation-delay:.15s}.ai-ctx-typing span:nth-child(3){animation-delay:.3s}
    @keyframes aiCtxDot{0%,80%,100%{transform:scale(.7);opacity:.45}40%{transform:scale(1);opacity:1}}
    .ai-ctx-input-row{display:flex;gap:8px;padding:8px 12px 13px;border-top:1px solid var(--border,rgba(255,255,255,.08));flex-shrink:0;align-items:center}
    .ai-ctx-input{flex:1;background:var(--input-bg,rgba(255,255,255,.06));border:1px solid var(--border,rgba(255,255,255,.1));border-radius:12px;padding:9px 13px;font-size:13px;color:var(--text,#cdccca);outline:none;font-family:inherit}
    .ai-ctx-send{background:var(--accent,#a78bfa);border:none;border-radius:12px;width:38px;height:38px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;color:#fff}
    .ai-ctx-send svg{width:16px;height:16px}.ai-ctx-no-key{font-size:12px;color:var(--text-light,#797876);text-align:center;padding:14px 12px;line-height:1.6}
    .ai-ctx-no-key a{color:var(--accent,#a78bfa);text-decoration:none;font-weight:600}
  `;
  document.head.appendChild(style);
}

const AICtxIntegration = (() => {
  let _fab = null, _panel = null, _currentCtx = null, _ctxHistory = [], _isGenerating = false;

  function _createFab() {
    const btn = document.createElement('button');
    btn.id = 'ai-ctx-fab';
    btn.className = 'ai-ctx-fab';
    btn.setAttribute('aria-label', 'Открыть AI-ассистента');
    btn.innerHTML = '🤖';
    btn.addEventListener('click', () => _toggle());
    document.body.appendChild(btn);
    return btn;
  }

  function _createPanel() {
    const el = document.createElement('div');
    el.id = 'ai-ctx-panel';
    el.className = 'ai-ctx-panel';
    document.body.appendChild(el);
    return el;
  }

  function _appendMsg(role, text) {
    const msgs = document.getElementById('ai-ctx-msgs');
    if (!msgs) return;
    const w = document.createElement('div');
    w.className = 'ai-ctx-msg ai-ctx-msg-' + (role === 'user' ? 'user' : 'ai');
    w.innerHTML = escapeHtml(String(text || '')).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
    msgs.appendChild(w);
    msgs.scrollTop = msgs.scrollHeight;
  }

  function _appendTyping() {
    const msgs = document.getElementById('ai-ctx-msgs');
    if (!msgs) return;
    const w = document.createElement('div');
    w.id = 'ai-ctx-typing';
    w.className = 'ai-ctx-typing';
    w.innerHTML = '<span></span><span></span><span></span>';
    msgs.appendChild(w);
    msgs.scrollTop = msgs.scrollHeight;
  }

  function _removeTyping() {
    const el = document.getElementById('ai-ctx-typing');
    if (el) el.remove();
  }

  function _getFallback(text) {
    const tl = String(text || '').toLowerCase();
    if (tl.includes('белок') || tl.includes('протеин')) return '💪 Норма белка: 1.6–2.2 г/кг веса. При похудении держи верхнюю границу диапазона.';
    if (tl.includes('калори') || tl.includes('дефицит')) return '🔥 Дефицит 300–500 ккал/день обычно даёт устойчивое снижение веса без сильной просадки по энергии.';
    if (tl.includes('восстанов') || tl.includes('отдых')) return '😴 Дай мышечной группе 48 часов отдыха, а сну — 7–9 часов. Это база восстановления.';
    if (tl.includes('кардио')) return '🏃 Для жиросжигания подойдёт LISS 30–60 минут 2–3 раза в неделю плюс больше шагов в течение дня.';
    if (tl.includes('tdee') || tl.includes('bmr')) return '📊 BMR — базовый обмен, TDEE — общий расход за день с учётом активности.';
    return '🤖 Для более умных ответов добавь Groq API-ключ в разделе AI → ключ 🔑.';
  }

  async function _sendMessage(prefill) {
    if (_isGenerating) return;
    const input = document.getElementById('ai-ctx-input');
    const text = prefill || (input ? input.value.trim() : '');
    if (!text) return;
    if (input && !prefill) input.value = '';
    _appendMsg('user', text);
    _ctxHistory.push({ role: 'user', content: text });
    _isGenerating = true;
    _appendTyping();
    let reply = '';
    try {
      const key = localStorage.getItem('fs-groq-key');
      if (key && _currentCtx) reply = await callGroq(key, _currentCtx.getContext(), _ctxHistory.slice(-14), 700);
      else reply = _getFallback(text);
    } catch (e) {
      reply = '⚠️ Ошибка соединения. Проверь API-ключ в разделе AI → ключ.';
    }
    _removeTyping();
    _appendMsg('assistant', reply);
    _ctxHistory.push({ role: 'assistant', content: reply });
    if (_ctxHistory.length > 40) _ctxHistory = _ctxHistory.slice(-40);
    _isGenerating = false;
  }

  function _renderPanel(ctx) {
    if (!_panel) return;
    const hasKey = !!localStorage.getItem('fs-groq-key');
    _panel.innerHTML = `
      <div class="ai-ctx-header">
        <span>${ctx.icon}</span>
        <span class="ai-ctx-header-title">${ctx.label}</span>
        <button class="ai-ctx-header-close" id="ai-ctx-close" aria-label="Закрыть">✕</button>
      </div>
      <div class="ai-ctx-quick" id="ai-ctx-quick">
        ${(ctx.quickMessages || []).map(m => `<button class="ai-ctx-quick-btn" data-msg="${escapeHtml(m)}">${escapeHtml(m)}</button>`).join('')}
      </div>
      <div class="ai-ctx-msgs" id="ai-ctx-msgs">
        ${!hasKey ? `<div class="ai-ctx-no-key">Для AI-ответов нужен <strong>Groq API ключ</strong>.<br>Получи бесплатно на <a href="https://console.groq.com" target="_blank" rel="noopener noreferrer">console.groq.com</a><br>и добавь в разделе <strong>AI → ключ 🔑</strong>.</div>` : `<div class="ai-ctx-msg ai-ctx-msg-ai">${ctx.icon} Привет! Я ${ctx.label} FitSim. Чем могу помочь?</div>`}
      </div>
      <div class="ai-ctx-input-row">
        <input type="text" class="ai-ctx-input" id="ai-ctx-input" placeholder="Спроси что-нибудь..." autocomplete="off" autocorrect="off" spellcheck="false" />
        <button class="ai-ctx-send" id="ai-ctx-send" aria-label="Отправить"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z"/></svg></button>
      </div>
    `;
    const closeBtn = document.getElementById('ai-ctx-close');
    if (closeBtn) closeBtn.addEventListener('click', () => _close());
    document.querySelectorAll('.ai-ctx-quick-btn').forEach(btn => btn.addEventListener('click', () => _sendMessage(btn.dataset.msg)));
    const input = document.getElementById('ai-ctx-input');
    if (input) input.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); _sendMessage(); } });
    const sendBtn = document.getElementById('ai-ctx-send');
    if (sendBtn) sendBtn.addEventListener('click', () => _sendMessage());
  }

  function _toggle() { _panel && _panel.classList.contains('open') ? _close() : _open(); }
  function _open() {
    if (!_panel || !_currentCtx) return;
    _renderPanel(_currentCtx);
    _panel.classList.add('open');
    setTimeout(() => { const i = document.getElementById('ai-ctx-input'); if (i) i.focus(); }, 240);
  }
  function _close() { if (_panel) _panel.classList.remove('open'); }

  function _onPageChange(pageId) {
    if (!_fab) return;
    _currentCtx = null;
    for (const key in AI_CTX) {
      if (AI_CTX[key].pages.includes(pageId)) { _currentCtx = AI_CTX[key]; break; }
    }
    _close();
    _ctxHistory = [];
    if (_currentCtx) {
      _fab.style.background = _currentCtx.color.startsWith('var') ? 'var(--accent, #a78bfa)' : _currentCtx.color;
      _fab.style.color = '#fff';
      _fab.innerHTML = _currentCtx.icon;
      _fab.title = _currentCtx.label;
      _fab.setAttribute('aria-label', _currentCtx.label);
      _fab.classList.add('visible');
    } else {
      _fab.classList.remove('visible');
    }
  }

  function init() {
    _injectCtxStyles();
    _fab = _createFab();
    _panel = _createPanel();
    const _origGoTo = window.goTo;
    window.goTo = function(id, title) {
      if (typeof _origGoTo === 'function') _origGoTo.call(this, id, title);
      setTimeout(() => _onPageChange(id), 60);
    };
    document.addEventListener('click', e => {
      if (_panel && _panel.classList.contains('open')) {
        if (!_panel.contains(e.target) && e.target !== _fab && !_fab.contains(e.target)) _close();
      }
    });
    const activePage = document.querySelector('.page.active');
    if (activePage) {
      const pageId = activePage.id ? activePage.id.replace('page-', '') : '';
      if (pageId) _onPageChange(pageId);
    }
  }

  return { init, onPageChange: _onPageChange };
})();

function initCombinedAI() {
  initAiCoachBindings();
  AICtxIntegration.init();
  console.log('[FitSim] AI-коуч загружен ✓');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCombinedAI);
} else {
  initCombinedAI();
}

window.AICtxIntegration = AICtxIntegration;