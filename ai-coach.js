// AI Coach — FitSim
(function() {
'use strict';

var aiGoal = 'loss';
var aiLevel = 'новичок';
var aiEquip = ['зал'];
var aiChatHistory = [];
var chatReady = false;

// TABS
window.aiSwitchTab = function(tab) {
  ['plan','chat','key'].forEach(function(t) {
    var pane = document.getElementById('ai-pane-' + t);
    var btn  = document.getElementById('ai-tab-' + t);
    if (pane) pane.style.display = (t === tab) ? '' : 'none';
    if (btn)  btn.className = 'ai-tab' + (t === tab ? ' ai-tab-active' : '');
  });
  if (tab === 'chat' && !chatReady) {
    chatReady = true;
    appendMsg('ai', 'Привет! 👋 Я ИИ-тренер. Спрашивай о тренировках, питании и восстановлении.');
  }
  if (tab === 'key') {
    var key = localStorage.getItem('fs-ai-key') || '';
    var status = document.getElementById('ai-key-status');
    if (status) status.textContent = key ? '✅ Ключ установлен' : '⚠️ Ключ не установлен — работает офлайн-режим';
  }
};

// GOAL
window.aiSetGoal = function(val, btn) {
  aiGoal = val;
  ['ai-goal-loss','ai-goal-gain','ai-goal-tone'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.className = 'ai-chip' + (el === btn ? ' ai-chip-active' : '');
  });
};

// LEVEL
window.aiSetLevel = function(val, btn) {
  aiLevel = val;
  ['ai-lvl-beg','ai-lvl-mid','ai-lvl-adv'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.className = 'ai-chip' + (el === btn ? ' ai-chip-active' : '');
  });
};

// EQUIP
window.aiToggleEquip = function(val, btn) {
  var idx = aiEquip.indexOf(val);
  if (idx >= 0) { aiEquip.splice(idx, 1); btn.className = 'ai-chip'; }
  else          { aiEquip.push(val);       btn.className = 'ai-chip ai-chip-active'; }
};

// SAVE KEY
window.aiSaveKey = function() {
  var inp = document.getElementById('ai-key-input');
  var key = inp ? inp.value.trim() : '';
  var status = document.getElementById('ai-key-status');
  if (key) {
    localStorage.setItem('fs-ai-key', key);
    if (inp) { inp.value = ''; inp.placeholder = 'pplx-***** (сохранён)'; }
    if (status) status.textContent = '✅ Ключ сохранён!';
    if (typeof window.toast === 'function') window.toast('✅ API ключ сохранён');
  } else {
    localStorage.removeItem('fs-ai-key');
    if (status) status.textContent = '⚠️ Ключ удалён — работает офлайн-режим';
  }
};

// GENERATE PLAN
window.aiGeneratePlan = async function() {
  var days     = parseInt((document.getElementById('ai-days-slider') || {value:3}).value);
  var duration = parseInt((document.getElementById('ai-dur-slider')  || {value:45}).value);
  var restEl   = document.getElementById('ai-restrictions');
  var restrictions = restEl ? restEl.value.trim() : '';
  var goalMap  = { loss:'похудение', gain:'набор массы', tone:'тонус' };
  var goalLabel = goalMap[aiGoal] || 'тонус';

  var genBtn  = document.getElementById('ai-gen-btn');
  var loading = document.getElementById('ai-plan-loading');
  var result  = document.getElementById('ai-plan-result');
  if (genBtn)  genBtn.style.display = 'none';
  if (loading) loading.style.display = '';
  if (result)  result.innerHTML = '';

  var plan = null;
  try {
    var key = localStorage.getItem('fs-ai-key') || '';
    if (key) {
      var sys = 'Ты опытный персональный фитнес-тренер. Говоришь ТОЛЬКО на русском, обращаешься на "ты". Отвечаешь СТРОГО на темы фитнеса. Возвращаешь ТОЛЬКО валидный JSON: {"title":"...","goal":"...","weeks":[{"weekNumber":1,"theme":"...","days":[{"dayNumber":1,"name":"...","type":"силовая","duration":45,"caloriesBurned":300,"exercises":[{"name":"...","sets":3,"reps":"12","rest":"60 сек","notes":""}]}]}]}';
      var usr = 'Составь 4-недельный план:\n- Цель: '+goalLabel+'\n- Уровень: '+aiLevel+'\n- Дней: '+days+'\n- Оборудование: '+(aiEquip.join(', ')||'вес тела')+'\n- Длительность: '+duration+' мин'+(restrictions?'\n- Ограничения: '+restrictions:'')+'\nВерни ТОЛЬКО JSON.';
      var reply = await callAPI(key, sys, [{role:'user', content:usr}], 3000);
      var m = reply.match(/\{[\s\S]*\}/);
      if (m) plan = JSON.parse(m[0]);
    }
  } catch(e) { console.warn('AI error:', e.message); }

  if (!plan) plan = makeFallbackPlan(goalLabel, aiLevel, days, duration);
  if (genBtn)  genBtn.style.display = '';
  if (loading) loading.style.display = 'none';
  renderPlan(plan);
};

// FALLBACK PLAN
function makeFallbackPlan(goal, level, days, duration) {
  var exDB = {
    'похудение': [
      {name:'Приседания',sets:3,reps:'15',rest:'45 сек',notes:''},
      {name:'Отжимания',sets:3,reps:'12',rest:'45 сек',notes:''},
      {name:'Берпи',sets:3,reps:'10',rest:'60 сек',notes:''},
      {name:'Планка',sets:3,reps:'40 сек',rest:'30 сек',notes:''},
      {name:'Выпады',sets:3,reps:'12',rest:'45 сек',notes:''},
      {name:'Скалолаз',sets:3,reps:'30 сек',rest:'30 сек',notes:''}
    ],
    'набор массы': [
      {name:'Жим лёжа',sets:4,reps:'8',rest:'90 сек',notes:''},
      {name:'Приседания',sets:4,reps:'6',rest:'120 сек',notes:''},
      {name:'Тяга в наклоне',sets:4,reps:'8',rest:'90 сек',notes:''},
      {name:'Жим стоя',sets:3,reps:'10',rest:'75 сек',notes:''},
      {name:'Подтягивания',sets:3,reps:'8',rest:'90 сек',notes:''},
      {name:'Становая тяга',sets:3,reps:'6',rest:'120 сек',notes:''}
    ],
    'тонус': [
      {name:'Приседания с гантелями',sets:3,reps:'12',rest:'60 сек',notes:''},
      {name:'Жим гантелей лёжа',sets:3,reps:'12',rest:'60 сек',notes:''},
      {name:'Тяга гантелей',sets:3,reps:'12',rest:'60 сек',notes:''},
      {name:'Жим гантелей стоя',sets:3,reps:'12',rest:'60 сек',notes:''},
      {name:'Румынская тяга',sets:3,reps:'12',rest:'60 сек',notes:''},
      {name:'Планка',sets:3,reps:'40 сек',rest:'30 сек',notes:''}
    ]
  };
  var exList = exDB[goal] || exDB['тонус'];
  var themes = ['Базовая нагрузка','Прогрессия','Интенсификация','Закрепление'];
  var kcal = goal === 'набор массы' ? 350 : 280;
  var dNames = ['Верх тела','Низ тела','Full body','Кардио','Верх+кор','Функционал','Full body'];
  var weeks = [];
  for (var w = 0; w < 4; w++) {
    var daysList = [];
    for (var d = 0; d < 7; d++) {
      if (d < days) {
        var start = (d * 2) % exList.length;
        var exs = [];
        for (var i = 0; i < 4; i++) exs.push(exList[(start + i) % exList.length]);
        daysList.push({dayNumber:d+1, name:'День '+(d+1)+' — '+(dNames[d]||'Тренировка'), type:'силовая', duration:duration, caloriesBurned:kcal+(w*15), exercises:exs});
      } else {
        daysList.push({dayNumber:d+1, name:'День '+(d+1)+' — Отдых', type:'отдых', duration:0, caloriesBurned:0, exercises:[]});
      }
    }
    weeks.push({weekNumber:w+1, theme:themes[w], days:daysList});
  }
  return {title:'4-недельный план: '+goal, goal:goal, weeks:weeks};
}

// RENDER PLAN
function renderPlan(plan) {
  var el = document.getElementById('ai-plan-result');
  if (!el) return;
  if (!plan || !plan.weeks) {
    el.innerHTML = '<div style="color:#ef4444;text-align:center;padding:12px;">Ошибка генерации. Попробуй снова.</div>';
    return;
  }
  window._aiLastPlan = plan;
  var h = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">'
    + '<b style="font-size:0.95rem;">' + (plan.title || '4-недельный план') + '</b>'
    + '<button onclick="aiSavePlan()" style="padding:6px 12px;background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);border-radius:10px;color:var(--text);font-size:0.75rem;font-weight:700;cursor:pointer;">💾 Сохранить</button>'
    + '</div>';
  plan.weeks.forEach(function(wk) {
    h += '<div class="ai-week-card"><div class="ai-week-title">📅 Неделя ' + wk.weekNumber + ' — ' + wk.theme + '</div>';
    (wk.days || []).forEach(function(day) {
      var isRest = day.type === 'отдых';
      h += '<div class="ai-day-card"><div class="ai-day-header">'
        + '<span>' + (isRest ? '😴' : '💪') + ' ' + day.name + '</span>'
        + (!isRest ? '<span style="color:var(--text-light);font-size:0.72rem;">' + day.duration + 'мин · ' + day.caloriesBurned + 'ккал</span>' : '')
        + '</div>';
      if (!isRest && day.exercises && day.exercises.length) {
        day.exercises.forEach(function(ex) {
          h += '<div class="ai-ex-row"><span style="font-weight:600;flex:1;">' + ex.name + '</span>'
            + '<span style="color:var(--text-light);white-space:nowrap;">' + ex.sets + '×' + ex.reps + ' · ' + ex.rest + '</span></div>';
        });
      } else if (isRest) {
        h += '<div style="font-size:0.78rem;color:var(--text-light);">Отдых или лёгкая прогулка</div>';
      }
      h += '</div>';
    });
    h += '</div>';
  });
  el.innerHTML = h;
}

window.aiSavePlan = function() {
  if (!window._aiLastPlan) return;
  try {
    var saved = JSON.parse(localStorage.getItem('fs-ai-plans') || '[]');
    saved.unshift({id:Date.now(), name:window._aiLastPlan.title||'ИИ-план', date:new Date().toLocaleDateString('ru-RU'), plan:window._aiLastPlan});
    localStorage.setItem('fs-ai-plans', JSON.stringify(saved.slice(0, 10)));
    if (typeof window.toast === 'function') window.toast('💾 План сохранён!');
  } catch(e) {}
};

// CHAT
window.aiSendQuick = function(text) {
  var inp = document.getElementById('ai-chat-input');
  if (inp) inp.value = text;
  window.aiSendMessage();
};

window.aiSendMessage = async function() {
  var inp = document.getElementById('ai-chat-input');
  var text = inp ? inp.value.trim() : '';
  if (!text) return;
  if (inp) inp.value = '';
  appendMsg('user', text);
  aiChatHistory.push({role:'user', content:text});
  var tid = 'ty-' + Date.now();
  appendTyping(tid);
  var reply = '';
  try {
    var key = localStorage.getItem('fs-ai-key') || '';
    if (key) {
      var sys = 'Ты опытный фитнес-тренер. Говоришь ТОЛЬКО на русском, обращаешься на "ты". Отвечаешь ТОЛЬКО на вопросы о фитнесе, тренировках, питании, восстановлении. Ответы краткие и по делу.';
      reply = await callAPI(key, sys, aiChatHistory.slice(-8), 600);
    } else {
      reply = getFallback(text);
    }
  } catch(e) {
    reply = getFallback(text);
  }
  removeTyping(tid);
  appendMsg('ai', reply);
  aiChatHistory.push({role:'assistant', content:reply});
};

function getFallback(t) {
  t = t.toLowerCase();
  if (t.indexOf('совет') >= 0 || t.indexOf('сегодня') >= 0)
    return 'Совет дня: не пропускай разминку! 5-10 мин лёгкого кардио + динамическая растяжка снизят риск травм.';
  if (t.indexOf('восстановл') >= 0)
    return 'Для восстановления: сон 7-9 часов, вода 30мл/кг, белок в течение 30 мин после тренировки.';
  if (t.indexOf('до тренировки') >= 0 || t.indexOf('съесть') >= 0 || t.indexOf('питание') >= 0)
    return 'За 1.5-2 часа: сложные углеводы + белок (гречка с курицей, овсянка с яйцами). За 30 мин — банан.';
  if (t.indexOf('похудет') >= 0 || t.indexOf('похудени') >= 0)
    return 'Для похудения: дефицит 300-500 ккал/день + силовые 3x/нед + кардио 2-3x. Без жёстких диет!';
  if (t.indexOf('белок') >= 0 || t.indexOf('протеин') >= 0)
    return 'Норма белка: 1.6-2.2 г/кг веса. Источники: курица, яйца, творог, рыба, бобовые.';
  if (t.indexOf('сон') >= 0)
    return 'Сон — важнейший элемент прогресса. Мышцы растут во сне. Цель: 7-9 часов, ложись до 23:00.';
  return 'Добавь API-ключ на вкладке "Ключ" — и я отвечу развёрнуто. Сейчас работаю в базовом режиме.';
}

function appendMsg(role, text) {
  var msgs = document.getElementById('ai-chat-msgs');
  if (!msgs) return;
  var w = document.createElement('div');
  w.style.cssText = 'display:flex;' + (role === 'user' ? 'justify-content:flex-end;' : 'justify-content:flex-start;');
  var b = document.createElement('div');
  b.className = 'ai-bubble ai-bubble-' + role;
  b.innerHTML = esc(text).replace(/\n/g, '<br>');
  w.appendChild(b);
  msgs.appendChild(w);
  msgs.scrollTop = msgs.scrollHeight;
}

function appendTyping(id) {
  var msgs = document.getElementById('ai-chat-msgs');
  if (!msgs) return;
  var w = document.createElement('div');
  w.id = id;
  w.style.cssText = 'display:flex;justify-content:flex-start;';
  w.innerHTML = '<div class="ai-typing"><span></span><span></span><span></span></div>';
  msgs.appendChild(w);
  msgs.scrollTop = msgs.scrollHeight;
}

function removeTyping(id) { var e = document.getElementById(id); if (e) e.remove(); }
function esc(s) { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

async function callAPI(key, sys, msgs, maxTok) {
  var r = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {'Content-Type':'application/json', 'Authorization':'Bearer '+key},
    body: JSON.stringify({
      model: 'llama-3.1-sonar-small-128k-online',
      messages: [{role:'system', content:sys}].concat(msgs),
      max_tokens: maxTok
    }),
    signal: AbortSignal.timeout(30000)
  });
  if (!r.ok) throw new Error('API ' + r.status);
  var d = await r.json();
  return (d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content) || '';
}

})();
