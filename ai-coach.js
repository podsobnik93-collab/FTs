// AI Coach — FitSim
(function() {

let aiGoal = 'loss';
let aiLevel = 'новичок';
let aiEquip = ['зал'];
let aiChatHistory = [];
let chatInitialized = false;

// ─── API KEY (saved in localStorage) ──────────────────────
function getApiKey() {
  return localStorage.getItem('fs-ai-key') || '';
}

// ─── TABS ──────────────────────────────────────────────────
window.aiSwitchTab = function(tab) {
  document.getElementById('ai-pane-plan').style.display = tab === 'plan' ? '' : 'none';
  document.getElementById('ai-pane-chat').style.display = tab === 'chat' ? '' : 'none';
  document.getElementById('ai-tab-plan').className = 'ai-tab' + (tab === 'plan' ? ' ai-tab-active' : '');
  document.getElementById('ai-tab-chat').className = 'ai-tab' + (tab === 'chat' ? ' ai-tab-active' : '');
  if (tab === 'chat' && !chatInitialized) {
    chatInitialized = true;
    appendMsg('ai', 'Привет! 👋 Я твой ИИ-тренер. Задавай вопросы о тренировках, питании и восстановлении!');
  }
};

// ─── GOAL ──────────────────────────────────────────────────
window.aiSetGoal = function(val, btn) {
  aiGoal = val;
  ['ai-goal-loss','ai-goal-gain','ai-goal-tone'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.className = 'ai-chip' + (el === btn ? ' ai-chip-active' : '');
  });
};

// ─── LEVEL ─────────────────────────────────────────────────
window.aiSetLevel = function(val, btn) {
  aiLevel = val;
  ['ai-lvl-beg','ai-lvl-mid','ai-lvl-adv'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.className = 'ai-chip' + (el === btn ? ' ai-chip-active' : '');
  });
};

// ─── EQUIP ─────────────────────────────────────────────────
window.aiToggleEquip = function(val, btn) {
  if (aiEquip.indexOf(val) >= 0) {
    aiEquip = aiEquip.filter(function(e) { return e !== val; });
    btn.className = 'ai-chip';
  } else {
    aiEquip.push(val);
    btn.className = 'ai-chip ai-chip-active';
  }
};

// ─── SAVE API KEY ──────────────────────────────────────────
window.aiSaveKey = function() {
  var inp = document.getElementById('ai-key-input');
  if (!inp) return;
  var key = inp.value.trim();
  if (key) {
    localStorage.setItem('fs-ai-key', key);
    inp.value = '';
    inp.placeholder = '✅ Ключ сохранён';
    if (typeof toast === 'function') toast('🔑 API ключ сохранён!');
  } else {
    localStorage.removeItem('fs-ai-key');
    if (typeof toast === 'function') toast('Ключ удалён');
  }
};

// ─── GENERATE PLAN ─────────────────────────────────────────
window.aiGeneratePlan = async function() {
  var days = document.getElementById('ai-days-slider').value;
  var duration = document.getElementById('ai-dur-slider').value;
  var restrictions = document.getElementById('ai-restrictions').value.trim();
  var goalMap = { loss: 'похудение', gain: 'набор массы', tone: 'тонус' };
  var goalLabel = goalMap[aiGoal] || aiGoal;

  document.getElementById('ai-gen-btn').style.display = 'none';
  document.getElementById('ai-plan-loading').style.display = '';
  document.getElementById('ai-plan-result').innerHTML = '';

  var systemPrompt = 'Ты опытный персональный фитнес-тренер. Отвечаешь ТОЛЬКО на русском языке, обращаешься на "ты". Занимаешься ТОЛЬКО темами фитнеса, тренировок, питания и восстановления. При составлении плана возвращаешь ТОЛЬКО валидный JSON без лишнего текста. Структура: {"title":"...","goal":"...","weeks":[{"weekNumber":1,"theme":"...","days":[{"dayNumber":1,"name":"...","type":"силовая|кардио|отдых","duration":45,"caloriesBurned":300,"exercises":[{"name":"...","sets":3,"reps":"12","rest":"60 сек","notes":"..."}]}]}]}. Для дней отдыха exercises=[].';

  var userPrompt = 'Составь 4-недельный план тренировок:\n- Цель: ' + goalLabel + '\n- Уровень: ' + aiLevel + '\n- Дней в неделю: ' + days + '\n- Оборудование: ' + (aiEquip.join(', ') || 'только вес тела') + '\n- Длительность: ' + duration + ' мин' + (restrictions ? '\n- Ограничения: ' + restrictions : '') + '\n\nВерни ТОЛЬКО JSON.';

  var plan = null;
  try {
    var key = getApiKey();
    if (key) {
      var reply = await callPerplexity(key, systemPrompt, [{ role: 'user', content: userPrompt }], 3000);
      var jsonMatch = reply.match(/\{[\s\S]*\}/);
      if (jsonMatch) plan = JSON.parse(jsonMatch[0]);
    }
  } catch(e) {
    console.warn('LLM error, using fallback:', e.message);
  }

  if (!plan) plan = makeFallbackPlan(goalLabel, aiLevel, parseInt(days), parseInt(duration));

  document.getElementById('ai-gen-btn').style.display = '';
  document.getElementById('ai-plan-loading').style.display = 'none';
  renderPlan(plan);
};

// ─── FALLBACK PLAN ─────────────────────────────────────────
function makeFallbackPlan(goal, level, days, duration) {
  var exDB = {
    'похудение': [
      {name:'Приседания',sets:3,reps:'15',rest:'45 сек',notes:''},
      {name:'Отжимания',sets:3,reps:'12',rest:'45 сек',notes:''},
      {name:'Планка',sets:3,reps:'45 сек',rest:'30 сек',notes:''},
      {name:'Берпи',sets:3,reps:'10',rest:'60 сек',notes:''},
      {name:'Выпады',sets:3,reps:'12',rest:'45 сек',notes:''},
      {name:'Скалолаз',sets:3,reps:'30 сек',rest:'30 сек',notes:''},
    ],
    'набор массы': [
      {name:'Жим штанги лёжа',sets:4,reps:'8',rest:'90 сек',notes:''},
      {name:'Приседания со штангой',sets:4,reps:'6',rest:'120 сек',notes:''},
      {name:'Тяга штанги в наклоне',sets:4,reps:'8',rest:'90 сек',notes:''},
      {name:'Жим гантелей стоя',sets:3,reps:'10',rest:'75 сек',notes:''},
      {name:'Подтягивания',sets:3,reps:'8',rest:'90 сек',notes:''},
      {name:'Становая тяга',sets:3,reps:'6',rest:'120 сек',notes:''},
    ],
    'тонус': [
      {name:'Приседания с гантелями',sets:3,reps:'12',rest:'60 сек',notes:''},
      {name:'Жим гантелей лёжа',sets:3,reps:'12',rest:'60 сек',notes:''},
      {name:'Тяга гантелей в наклоне',sets:3,reps:'12',rest:'60 сек',notes:''},
      {name:'Жим гантелей стоя',sets:3,reps:'12',rest:'60 сек',notes:''},
      {name:'Румынская тяга',sets:3,reps:'12',rest:'60 сек',notes:''},
      {name:'Планка',sets:3,reps:'40 сек',rest:'30 сек',notes:''},
    ]
  };
  var exList = exDB[goal] || exDB['тонус'];
  var themes = ['Базовая нагрузка','Прогрессия','Интенсификация','Закрепление'];
  var kcal = goal === 'набор массы' ? 350 : 280;
  var dayNames = ['Верх тела','Низ тела','Full body','Кардио','Верх тела','Функциональный','Full body'];
  var weeks = [];
  for (var w = 0; w < 4; w++) {
    var daysList = [];
    for (var d = 0; d < 7; d++) {
      if (d < days) {
        var exStart = (d * 2) % exList.length;
        var exSlice = [];
        for (var i = 0; i < 4; i++) exSlice.push(exList[(exStart + i) % exList.length]);
        daysList.push({
          dayNumber: d+1, name: 'День '+(d+1)+' — '+(dayNames[d]||'Тренировка'),
          type: d === 3 ? 'кардио' : 'силовая', duration: duration,
          caloriesBurned: kcal, exercises: exSlice
        });
      } else {
        daysList.push({
          dayNumber: d+1, name: 'День '+(d+1)+' — Отдых',
          type: 'отдых', duration: 0, caloriesBurned: 0, exercises: []
        });
      }
    }
    weeks.push({ weekNumber: w+1, theme: themes[w], days: daysList });
  }
  return { title: '4-недельный план: ' + goal, goal: goal, weeks: weeks };
}

// ─── RENDER PLAN ───────────────────────────────────────────
function renderPlan(plan) {
  if (!plan || !plan.weeks) {
    document.getElementById('ai-plan-result').innerHTML = '<div style="color:#ef4444;text-align:center;padding:12px;">Не удалось создать план. Попробуй ещё раз.</div>';
    return;
  }
  window._aiLastPlan = plan;
  var html = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">'
    + '<div style="font-weight:800;font-size:1rem;">' + (plan.title||'4-недельный план') + '</div>'
    + '<button onclick="aiSavePlan()" style="padding:7px 14px;background:rgba(255,255,255,0.1);border:1px solid var(--border);border-radius:10px;color:var(--text);font-size:0.78rem;font-weight:700;cursor:pointer;">💾 Сохранить</button>'
    + '</div>';
  plan.weeks.forEach(function(week) {
    html += '<div class="ai-week-card"><div class="ai-week-title">📅 Неделя ' + week.weekNumber + ' — ' + week.theme + '</div>';
    (week.days||[]).forEach(function(day) {
      var isRest = day.type === 'отдых';
      html += '<div class="ai-day-card"><div class="ai-day-header"><span>' + (isRest?'😴':'💪') + ' ' + day.name + '</span>'
        + (!isRest ? '<span style="color:var(--text-light);font-size:0.75rem;">' + day.duration + 'мин · ' + day.caloriesBurned + 'ккал</span>' : '')
        + '</div>';
      if (!isRest && day.exercises && day.exercises.length) {
        day.exercises.forEach(function(ex) {
          html += '<div class="ai-ex-row"><span style="font-weight:600;">' + ex.name + '</span><span style="color:var(--text-light);">' + ex.sets + '×' + ex.reps + ' · ' + ex.rest + '</span></div>';
        });
      } else if (isRest) {
        html += '<div style="font-size:0.78rem;color:var(--text-light);">Активное восстановление или полный отдых</div>';
      }
      html += '</div>';
    });
    html += '</div>';
  });
  document.getElementById('ai-plan-result').innerHTML = html;
}

window.aiSavePlan = function() {
  if (!window._aiLastPlan) return;
  try {
    var saved = JSON.parse(localStorage.getItem('fs-ai-plans') || '[]');
    saved.unshift({ id: Date.now(), name: window._aiLastPlan.title||'ИИ-план', date: new Date().toLocaleDateString('ru-RU'), plan: window._aiLastPlan });
    localStorage.setItem('fs-ai-plans', JSON.stringify(saved.slice(0,10)));
    if (typeof toast === 'function') toast('💾 План сохранён!');
  } catch(e) {}
};

// ─── CHAT ──────────────────────────────────────────────────
window.aiSendQuick = function(text) {
  var inp = document.getElementById('ai-chat-input');
  if (inp) inp.value = text;
  aiSendMessage();
};

window.aiSendMessage = async function() {
  var inp = document.getElementById('ai-chat-input');
  var text = inp ? inp.value.trim() : '';
  if (!text) return;
  if (inp) inp.value = '';

  appendMsg('user', text);
  aiChatHistory.push({ role: 'user', content: text });

  var typingId = 'typing-' + Date.now();
  appendTyping(typingId);

  var systemPrompt = 'Ты опытный персональный фитнес-тренер. Отвечаешь ТОЛЬКО на русском языке, обращаешься на "ты". Отвечаешь ТОЛЬКО на вопросы о фитнесе, тренировках, питании, восстановлении и ЗОЖ. На другие темы вежливо отказываешь. Ответы короткие и по делу.';

  var reply = '';
  try {
    var key = getApiKey();
    if (key) {
      reply = await callPerplexity(key, systemPrompt, aiChatHistory.slice(-8), 600);
    } else {
      reply = getFallback(text);
    }
  } catch(e) {
    reply = getFallback(text);
  }

  removeTyping(typingId);
  appendMsg('ai', reply);
  aiChatHistory.push({ role: 'assistant', content: reply });
};

function getFallback(text) {
  var t = text.toLowerCase();
  if (t.indexOf('совет') >= 0 || t.indexOf('сегодня') >= 0)
    return '💪 Совет: не пропускай разминку! 5–10 минут лёгкого кардио и динамической растяжки снизят риск травм и улучшат качество тренировки.';
  if (t.indexOf('восстановл') >= 0)
    return '⚡ Для восстановления: спи 7–9 часов, пей воду (30 мл/кг), ешь белок в течение 30 минут после тренировки. Лёгкая растяжка тоже помогает.';
  if (t.indexOf('до тренировки') >= 0 || t.indexOf('съесть') >= 0 || t.indexOf('есть') >= 0)
    return '🥗 За 1.5–2 часа до тренировки: сложные углеводы + белок. Например, гречка с курицей или овсянка с яйцами. За 30 минут — банан.';
  if (t.indexOf('похудет') >= 0 || t.indexOf('похудени') >= 0)
    return '🔥 Для похудения: дефицит калорий 300–500 ккал/день + силовые 3 раза в неделю + кардио 2–3 раза. Без жёстких диет — только умеренный дефицит.';
  if (t.indexOf('белок') >= 0 || t.indexOf('протеин') >= 0)
    return '🥩 Норма белка: 1.6–2.2 г на кг веса тела в день. Источники: курица, яйца, творог, рыба, бобовые. Можно добавить протеиновый коктейль.';
  return '🤔 Хороший вопрос! Чтобы я дал точный ответ — добавь API-ключ в настройках ИИ-тренера, и я отвечу развёрнуто. Без ключа работаю в базовом режиме.';
}

// ─── CHAT UI ───────────────────────────────────────────────
function appendMsg(role, text) {
  var msgs = document.getElementById('ai-chat-msgs');
  if (!msgs) return;
  var wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex;' + (role === 'user' ? 'justify-content:flex-end;' : 'justify-content:flex-start;');
  var bubble = document.createElement('div');
  bubble.className = 'ai-bubble ai-bubble-' + role;
  bubble.innerHTML = esc(text).replace(/\n/g,'<br>');
  wrap.appendChild(bubble);
  msgs.appendChild(wrap);
  msgs.scrollTop = msgs.scrollHeight;
}

function appendTyping(id) {
  var msgs = document.getElementById('ai-chat-msgs');
  if (!msgs) return;
  var wrap = document.createElement('div');
  wrap.id = id;
  wrap.style.cssText = 'display:flex;justify-content:flex-start;';
  wrap.innerHTML = '<div class="ai-typing"><span></span><span></span><span></span></div>';
  msgs.appendChild(wrap);
  msgs.scrollTop = msgs.scrollHeight;
}

function removeTyping(id) {
  var el = document.getElementById(id);
  if (el) el.remove();
}

function esc(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ─── PERPLEXITY API CALL ───────────────────────────────────
async function callPerplexity(apiKey, systemPrompt, messages, maxTokens) {
  var body = {
    model: 'llama-3.1-sonar-small-128k-online',
    messages: [{ role: 'system', content: systemPrompt }].concat(messages),
    max_tokens: maxTokens
  };
  var resp = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30000)
  });
  if (!resp.ok) throw new Error('API error ' + resp.status);
  var data = await resp.json();
  return (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '';
}

})();
