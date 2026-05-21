(function(){
'use strict';

// ==================== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ====================
var aiGoal = 'loss';
var aiLevel = 'новичок';
var aiEquip = ['зал'];
var aiChatHistory = [];
var chatReady = false;
var lastTopic = null;
var _generating = false;

// ==================== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ====================
function escapeHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function extractJSON(str) {
  var clean = str.replace(/```json\s*|\s*```/g, '');
  var start = clean.indexOf('{');
  if (start === -1) return null;
  var depth = 0;
  var inString = false;
  var escape = false;
  for (var i = start; i < clean.length; i++) {
    var ch = clean[i];
    if (escape) { escape = false; continue; }
    if (ch === '\\') { escape = true; continue; }
    if (ch === '"') inString = !inString;
    if (!inString) {
      if (ch === '{') depth++;
      else if (ch === '}') depth--;
      if (depth === 0) {
        var raw = clean.slice(start, i + 1);
        try {
          return JSON.parse(raw);
        } catch(e) {
          console.warn('JSON parse error', e);
          return null;
        }
      }
    }
  }
  return null;
}

function persistChatHistory() {
  localStorage.setItem('fs-ai-chat-history', JSON.stringify(aiChatHistory.slice(-50)));
}

function restoreChatHistory() {
  var saved = localStorage.getItem('fs-ai-chat-history');
  if (saved) {
    try {
      aiChatHistory = JSON.parse(saved);
      for (var i = 0; i < aiChatHistory.length; i++) {
        appendMsg(aiChatHistory[i].role, aiChatHistory[i].content);
      }
    } catch(e) {}
  }
}

// ==================== ТАБЫ ====================
window.aiSwitchTab = function(t) {
  ['plan','chat','key'].forEach(function(x){
    var p = document.getElementById('ai-pane-'+x);
    var b = document.getElementById('ai-tab-'+x);
    if(p) p.style.display = (x===t) ? '' : 'none';
    if(b) b.className = 'ai-tab' + (x===t ? ' ai-tab-active' : '');
  });
  if(t==='chat' && !chatReady) {
    chatReady = true;
    appendMsg('ai','Привет! 👋 Я ИИ-тренер Алекс. Добавь Groq ключ на вкладке 🔑, или спрашивай — работаю и без него!');
  }
  if(t==='key') {
    var k = localStorage.getItem('fs-groq-key') || '';
    var s = document.getElementById('ai-key-status');
    if(s) s.textContent = k ? '✅ Ключ установлен — ИИ активен' : '⚠️ Ключ не установлен — офлайн-режим';
  }
};

window.aiSetGoal = function(v,b) {
  aiGoal = v;
  ['ai-goal-loss','ai-goal-gain','ai-goal-tone'].forEach(function(id){
    var e = document.getElementById(id);
    if(e) e.className = 'ai-chip' + (e===b ? ' ai-chip-active' : '');
  });
};

window.aiSetLevel = function(v,b) {
  aiLevel = v;
  ['ai-lvl-beg','ai-lvl-mid','ai-lvl-adv'].forEach(function(id){
    var e = document.getElementById(id);
    if(e) e.className = 'ai-chip' + (e===b ? ' ai-chip-active' : '');
  });
};

window.aiToggleEquip = function(v,b) {
  var i = aiEquip.indexOf(v);
  if(i>=0) {
    aiEquip.splice(i,1);
    b.className = 'ai-chip';
  } else {
    aiEquip.push(v);
    b.className = 'ai-chip ai-chip-active';
  }
};

window.aiSaveKey = function() {
  var inp = document.getElementById('ai-key-input'), k = inp ? inp.value.trim() : '';
  var s = document.getElementById('ai-key-status');
  if(k) {
    localStorage.setItem('fs-groq-key', k);
    if(inp) { inp.value = ''; inp.placeholder = 'gsk_***** (сохранён)'; }
    if(s) s.textContent = '✅ Ключ сохранён!';
    if(typeof toast === 'function') toast('✅ Groq ключ сохранён');
  } else {
    localStorage.removeItem('fs-groq-key');
    if(s) s.textContent = '⚠️ Ключ удалён — офлайн-режим';
  }
};

// ==================== ГЕНЕРАЦИЯ ПЛАНА ====================
window.aiGeneratePlan = async function() {
  if (_generating) {
    if(typeof toast === 'function') toast('⏳ Подождите, план уже генерируется...');
    return;
  }
  _generating = true;

  var days = parseInt((document.getElementById('ai-days-slider')||{value:3}).value);
  var dur  = parseInt((document.getElementById('ai-dur-slider')||{value:45}).value);
  var restr = (document.getElementById('ai-restrictions')||{value:''}).value.trim();
  var gl = { loss:'похудение', gain:'набор массы', tone:'тонус' }[aiGoal] || 'тонус';
  var gb = document.getElementById('ai-gen-btn');
  var ld = document.getElementById('ai-plan-loading');
  var res = document.getElementById('ai-plan-result');
  if(gb) gb.style.display = 'none';
  if(ld) ld.style.display = '';
  if(res) res.innerHTML = '';

  // Данные профиля
  var profile = {};
  try {
    profile = JSON.parse(localStorage.getItem('fs-profile') || '{}');
  } catch(e) {}
  var userAge = profile.age || 30;
  var userWeight = profile.weight || 75;
  var userHeight = profile.height || 175;

  var plan = null;
  try {
    var key = localStorage.getItem('fs-groq-key') || '';
    if(key) {
      var sys = 'Ты — Алекс, элитный тренер (NSCA-CSCS) и нутрициолог (Precision Nutrition L2) с 20+ лет опыта. '+
        'ПРАВИЛА РАСПИСАНИЯ (СТРОГО): чередуй тренировки с отдыхом! '+
        '2 дня: Пн+Чт. 3 дня: Пн+Ср+Пт. 4 дня: Пн+Вт+Чт+Пт. 5 дней: Пн+Вт+Ср+Пт+Сб. '+
        'НИКОГДА не ставь 3 тренировки подряд. Используй сплит: Верх/Низ/Full body или Push/Pull/Legs. '+
        'В поле notes добавляй технические советы и нутрициологические рекомендации для этого дня. '+
        'Говоришь ТОЛЬКО на русском. '+
        'Верни ТОЛЬКО валидный JSON без markdown: '+
        '{"title":"...","goal":"...","nutrition":{"dailyCalories":2000,"protein":150,"carbs":200,"fat":60,"tip":"..."},'+
        ' "weeks":[{"weekNumber":1,"theme":"...","days":[{"dayNumber":1,"name":"...","type":"силовая","duration":45,"caloriesBurned":300,'+
        ' "exercises":[{"name":"...","sets":3,"reps":"12","rest":"60 сек","notes":"техника+питание"}]}]}]}';
      var usr = 'Составь 4-недельный план:\n- Цель: '+gl+'\n- Уровень: '+aiLevel+'\n- Дней: '+days+'\n- Оборудование: '+(aiEquip.join(', ')||'вес тела')+'\n- Длительность: '+dur+' мин'+
        (restr ? '\n- Ограничения: '+restr : '') +
        '\n- Возраст: '+userAge+' лет\n- Вес: '+userWeight+' кг\n- Рост: '+userHeight+' см\nВерни ТОЛЬКО JSON.';
      var reply = await callGroq(key, sys, [{role:'user', content:usr}], 3000);
      plan = extractJSON(reply);
      if (!plan) throw new Error('Invalid JSON from Groq');
    }
  } catch(e) {
    console.warn('Groq error:', e.message);
  }
  if (!plan) plan = makeFallback(gl, aiLevel, days, dur);

  if(gb) gb.style.display = '';
  if(ld) ld.style.display = 'none';
  renderPlan(plan);

  // Кнопка сохранения плана как активной программы
  var container = document.getElementById('ai-plan-result');
  if(container && plan && plan.weeks) {
    var btnSave = document.createElement('button');
    btnSave.textContent = '📌 Сохранить как активную программу';
    btnSave.style.cssText = 'width:100%; margin-top:12px; padding:12px; background:#22c55e; color:#fff; border:none; border-radius:12px; font-weight:800; cursor:pointer;';
    btnSave.onclick = function() { savePlanToPrograms(plan); };
    container.appendChild(btnSave);

    var btnToday = document.createElement('button');
    btnToday.textContent = '🏋️ Выполнить сегодняшнюю тренировку';
    btnToday.style.cssText = 'width:100%; margin-top:8px; padding:12px; background:var(--accent,#a78bfa); color:#fff; border:none; border-radius:12px; font-weight:800; cursor:pointer;';
    btnToday.onclick = function() { startTodayFromPlan(plan); };
    container.appendChild(btnToday);
  }

  _generating = false;
  setTimeout(function(){ _generating = false; }, 2000);
};

window.savePlanToPrograms = function(plan) {
  if (!plan || !plan.weeks) {
    if(typeof toast === 'function') toast('❌ Нет данных для сохранения');
    return;
  }
  var daysOfWeek = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];
  var schedule = [];
  for (var w = 0; w < plan.weeks.length; w++) {
    var week = plan.weeks[w];
    for (var d = 0; d < week.days.length; d++) {
      var day = week.days[d];
      var weekdayIndex = (day.dayNumber - 1) % 7;
      var rest = (day.type === 'отдых');
      schedule.push({
        label: daysOfWeek[weekdayIndex],
        name: day.name,
        rest: rest,
        exs: rest ? [] : day.exercises.map(function(e) { return e.name; })
      });
    }
  }
  var weekSchedule = schedule.slice(0,7);
  var newProgram = {
    id: 'ai_' + Date.now(),
    name: plan.title || 'AI-план',
    level: aiLevel || 'средний',
    days_week: weekSchedule.filter(function(d) { return !d.rest; }).length + ' дн/нед',
    goal: plan.goal || aiGoal,
    desc: 'Сгенерировано ИИ-тренером Алексом',
    schedule: weekSchedule
  };
  // Добавляем в глобальный массив PROGRAMS (если доступен)
  if (typeof window.PROGRAMS !== 'undefined' && Array.isArray(window.PROGRAMS)) {
    window.PROGRAMS.push(newProgram);
    var existing = JSON.parse(localStorage.getItem('fs-programs') || '[]');
    existing.push(newProgram);
    localStorage.setItem('fs-programs', JSON.stringify(existing));
    if(typeof toast === 'function') toast('✅ Программа сохранена! Обновите страницу вкладки "Тренировка".');
  } else {
    var existing2 = JSON.parse(localStorage.getItem('fs-programs') || '[]');
    existing2.push(newProgram);
    localStorage.setItem('fs-programs', JSON.stringify(existing2));
    if(typeof toast === 'function') toast('⚠️ Программа сохранена, но для доступа перезагрузите страницу.');
  }
};

window.startTodayFromPlan = function(plan) {
  if (!plan || !plan.weeks || !plan.weeks[0]) {
    if(typeof toast === 'function') toast('❌ Нет активного плана');
    return;
  }
  var todayIndex = new Date().getDay();
  var targetDayNumber = (todayIndex === 0) ? 7 : todayIndex;
  var weekPlan = plan.weeks[0];
  var todayTraining = null;
  for (var i = 0; i < weekPlan.days.length; i++) {
    if (weekPlan.days[i].dayNumber === targetDayNumber) {
      todayTraining = weekPlan.days[i];
      break;
    }
  }
  if (!todayTraining || todayTraining.type === 'отдых') {
    if(typeof toast === 'function') toast('🛌 Сегодня по плану — отдых');
    return;
  }
  var exercises = todayTraining.exercises.map(function(ex) {
    var sets = ex.sets || 3;
    var reps = parseInt(ex.reps) || 10;
    return {
      n: ex.name,
      s: sets,
      r: reps,
      kg: 0,
      sets_data: Array(sets).fill().map(function() { return { r: reps, kg: 0, done: false }; }),
      done: false
    };
  });
  if (typeof window.customWt !== 'undefined') window.customWt = exercises;
  if (typeof window.showWtScreen === 'function') window.showWtScreen('execute');
  if (typeof window.goTo === 'function') window.goTo('workout', '🏋️ Тренировка');
};

// ==================== ЧАТ ====================
window.aiSendQuick = function(t) {
  var inp = document.getElementById('ai-chat-input');
  if(inp) inp.value = t;
  window.aiSendMessage();
};

window.aiSendMessage = async function() {
  var inp = document.getElementById('ai-chat-input');
  var text = inp ? inp.value.trim() : '';
  if(!text) return;
  if(inp) inp.value = '';
  appendMsg('user', text);
  aiChatHistory.push({role:'user', content:text});
  persistChatHistory();

  var tid = 'ty-'+Date.now();
  appendTyping(tid);
  var reply = '';
  try {
    var key = localStorage.getItem('fs-groq-key') || '';
    if(key) {
      reply = await callGroq(key,
        'Ты — Алекс, элитный персональный тренер и нутрициолог с 20+ годами практики. '+
        'Регалии: NSCA-CSCS, Precision Nutrition Level 2, работал с профи-спортсменами и обычными людьми. '+
        'Глубоко знаешь: периодизацию, биомеханику, физиологию, макро/микронутриенты, восстановление, добавки, гормональный фон. '+
        'Говоришь ТОЛЬКО на русском, на "ты", как строгий но уважающий тебя наставник. '+
        'Отвечаешь ТОЛЬКО на темы: тренировки, питание, восстановление, здоровье, добавки. '+
        'Стиль: конкретно, с цифрами и механизмами ("потому что..."), без воды. '+
        'Даёшь практические советы которые можно применить сегодня. '+
        'Используй эмодзи умеренно. Никогда не говоришь "я не знаю" — всегда есть профессиональное мнение.',
        aiChatHistory.slice(-8), 700);
    } else {
      reply = getFallback(text);
    }
  } catch(e) {
    reply = getFallback(text);
  }
  removeTyping(tid);
  appendMsg('ai', reply);
  aiChatHistory.push({role:'assistant', content:reply});
  persistChatHistory();
};

function getFallback(t) {
  var tl = t.toLowerCase();
  if (tl.includes('совет')) lastTopic = 'совет';
  else if (tl.includes('восстановл')) lastTopic = 'восстановление';
  else if (tl.includes('добавк')) lastTopic = 'добавки';
  else if (tl.includes('белок') || tl.includes('протеин')) lastTopic = 'белок';
  else if (tl.includes('жиросжиг') || tl.includes('похуден')) lastTopic = 'жиросжигание';
  else if (tl.includes('масс') || tl.includes('набор')) lastTopic = 'набор массы';
  else if (tl.includes('сон')) lastTopic = 'сон';
  else if (tl.includes('питани')) lastTopic = 'питание';

  if (lastTopic === 'белок' && (tl.includes('сколько') || tl.includes('норм'))) {
    return '🥩 Норма белка:\n- Поддержание: 1.4–1.6 г/кг\n- Набор массы: 1.8–2.2 г/кг\n- Похудение: 2.0–2.5 г/кг\n\nЗа один приём организм усваивает 30–40 г белка (окно ~3-4 часа). Распределяйте равномерно.';
  }
  if (lastTopic === 'добавки' && (tl.includes('креатин'))) {
    return '💊 Креатин моногидрат: 3–5 г в день постоянно (без загрузки). Лучшее время — после тренировки или утром в дни отдыха. Повышает силу на 5–15%, объём работы на ~20%.';
  }

  if(tl.includes('совет')||tl.includes('сегодня')) return '💡 Совет дня от Алекса:\n\n🔥 Разминка — не опция. 5-7 мин кардио поднимает температуру мышц на 1-2°C и увеличивает силу на 10-15%. Затем динамическая растяжка по плоскости движения твоих основных упражнений дня.\n\n📊 Питание: убедись что за 1.5-2 часа поел сложные углеводы + белок. Без топлива — без роста.';
  if(tl.includes('восстановл')) return '⚡ Восстановление — это активный процесс:\n\n🛏 Сон 7-9 часов. В фазе глубокого сна пик выброса гормона роста. Ляжешь после 01:00 — потеряешь половину этого окна.\n\n💧 Вода: 30-35 мл/кг + 500-750 мл при тренировках. Обезвоживание на 2% снижает силу на 10-15%.\n\n🍗 Белок 30-40г в течение 30-60 мин после тренировки.\n\n🧘 МФР роликом + лёгкая растяжка ускоряют вывод лактата в 1.5-2 раза.';
  if(tl.includes('до тренировки')||tl.includes('съесть')||tl.includes('питани')) return '🥗 Питание до и после тренировки:\n\n⏰ За 2-3 часа: 30-40г белка + сложные углеводы (150г гречки + 150г курицы).\n⏰ За 30-60 мин: банан или горсть фиников если нужен быстрый заряд.\n⏰ После тренировки: 30-40г белка + быстрые углеводы (в соотношении 1:2-3 для восполнения гликогена).\n\n💊 Кофеин 3-6 мг/кг за 45 мин до — доказанно +5-8% к силе и выносливости.';
  if(tl.includes('похудет')||tl.includes('похудени')||tl.includes('жир')||tl.includes('сжечь')) return '📊 Жиросжигание — механика:\n\n⚡ Дефицит 300-500 ккал/день. Больше — теряешь мышцы. Меньше — медленно, но надёжно.\n\n💪 Силовые 3-4x/нед ОБЯЗАТЕЛЬНЫ — без них при дефиците теряешь мышцы вместе с жиром.\n\n🏃 Кардио зона 2 (60-70% ЧСС макс) 30-40 мин, 2-3x/нед. Или HIIT 2x по 20 мин.\n\n🍗 Белок 2-2.5г/кг — критично для сохранения мышц при похудении.\n\n⏱ Реалистичный темп: 0.5-1 кг жира в неделю.';
  if(tl.includes('белок')||tl.includes('протеин')) return '🥩 Белок — фундамент:\n\n📊 Нормы: рост мышц: 1.8-2.2г/кг. Похудение: 2-2.5г/кг. Поддержание: 1.4-1.6г/кг.\n\n🏆 Биодоступность: яичный белок = 100% (эталон). Сыворотка = 104%. Казеин = 77%. Курица/рыба = 75-80%.\n\n⏰ Распределяй на 4-5 приёмов по 30-40г — организм усваивает оптимально именно столько за раз.\n\n😴 Казеин (творог) перед сном — медленное переваривание всю ночь, идеально для ночного синтеза белка.';
  if(tl.includes('добавк')||tl.includes('протеин порошок')||tl.includes('креатин')||tl.includes('спортпит')) return '💊 Добавки с реальной доказательной базой (Класс A по ISSN):\n\n✅ Креатин моногидрат 3-5г/день — самая изученная добавка в истории спорта. +5-15% к силе, +10% к объёму. Загрузка не нужна.\n✅ Кофеин 3-6 мг/кг — сила, выносливость, жиросжигание. Не злоупотребляй.\n✅ Бета-аланин 3.2г/день — буферизует молочную кислоту, +12-16% выносливости.\n✅ Сывороточный протеин — удобство, не магия.\n\n⚠️ BCAA, жиросжигатели, предтрены (кроме кофеина+бета-аланина) — слабая база. Лучше в еду.';
  if(tl.includes('сон')) return '😴 Сон — лучший анаболик (и бесплатный):\n\n🏆 23:00-02:00 — пик выброса гормона роста. Ляжешь позже — теряешь это окно.\n\n📊 Хронический недосып (< 7 часов): -10-15% тестостерона, +15% кортизола, -18% синтеза белка. Это сильнее любой добавки.\n\n✅ Оптимум: 7-9 часов, тёмная прохладная комната (18-20°C). Магний глицинат 300-400мг за час до сна улучшает качество сна.';
  if(tl.includes('масс')||tl.includes('набор')||tl.includes('объём')) return '💪 Набор мышечной массы — принципы:\n\n📈 Профицит калорий: +200-350 ккал/день. Больше — наберёшь жир.\n\n🏋️ Прогрессивная перегрузка — главный стимул роста. Каждую неделю чуть больше: вес, повторения или подходы.\n\n📊 Объём работы: 10-20 рабочих подходов на группу мышц в неделю. Начинай с 10, прогрессируй.\n\n🔄 Частота: каждую мышцу 2x в неделю — оптимально по исследованиям.\n\n🍗 Белок 1.8-2.2г/кг + углеводы для восполнения гликогена + достаточно калорий.';
  return '💡 Добавь Groq ключ на вкладке 🔑 — console.groq.com, бесплатно, из России, без карты. Тогда я отвечу на любой вопрос с полным разбором как настоящий тренер с 20-летним опытом!';
}

// ==================== ОТОБРАЖЕНИЕ ====================
function appendMsg(role, text) {
  var msgs = document.getElementById('ai-chat-msgs');
  if(!msgs) return;
  var w = document.createElement('div');
  w.style.cssText = 'display:flex;' + (role==='user' ? 'justify-content:flex-end;' : '');
  var b = document.createElement('div');
  b.className = 'ai-bubble ai-bubble-'+role;
  b.innerHTML = escapeHtml(text).replace(/\n/g,'<br>');
  w.appendChild(b);
  msgs.appendChild(w);
  msgs.scrollTop = msgs.scrollHeight;
}

function appendTyping(id) {
  var msgs = document.getElementById('ai-chat-msgs');
  if(!msgs) return;
  var w = document.createElement('div');
  w.id = id;
  w.innerHTML = '<div class="ai-typing"><span></span><span></span><span></span></div>';
  msgs.appendChild(w);
  msgs.scrollTop = msgs.scrollHeight;
}

function removeTyping(id) {
  var e = document.getElementById(id);
  if(e) e.remove();
}

// ==================== API ВЫЗОВ ====================
async function callGroq(key, sys, msgs, max) {
  var r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer '+key },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant',
      messages: [{role:'system', content:sys}].concat(msgs),
      max_tokens: max,
      temperature: 0.7
    }),
    signal: AbortSignal.timeout(30000)
  });
  if(!r.ok) throw new Error('Groq '+r.status);
  var d = await r.json();
  return (d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content) || '';
}

// ==================== FALLBACK ГЕНЕРАТОР ПЛАНА ====================
function makeFallback(goal, level, days, dur) {
  // Exercise pools by split — larger variety for weekly rotation
  var POOLS = {
    'похудение':{
      'Верх тела':[
        [{name:'Отжимания',sets:3,reps:'15',rest:'45 сек',notes:'Локти под 45°, корпус прямой'},{name:'Тяга гантели в наклоне',sets:3,reps:'15',rest:'45 сек',notes:'Спина параллельна полу'},{name:'Жим гантелей стоя',sets:3,reps:'15',rest:'45 сек',notes:'Не отклоняй корпус'},{name:'Скалолаз',sets:3,reps:'30 сек',rest:'30 сек',notes:'Бёдра не задирай'},{name:'Планка',sets:3,reps:'40 сек',rest:'30 сек',notes:'Напрягай пресс и ягодицы'}],
        [{name:'Отжимания широко',sets:3,reps:'15',rest:'45 сек',notes:'Акцент на грудь'},{name:'Тяга верхнего блока',sets:3,reps:'15',rest:'45 сек',notes:'Тяни локтями вниз'},{name:'Разведение гантелей стоя',sets:3,reps:'15',rest:'45 сек',notes:'Лёгкий вес, контроль'},{name:'Берпи',sets:3,reps:'10',rest:'45 сек',notes:'Взрывной прыжок вверх'},{name:'Обратные скручивания',sets:3,reps:'15',rest:'30 сек',notes:'Поясница прижата'}],
        [{name:'Отжимания узко',sets:3,reps:'12',rest:'45 сек',notes:'Акцент на трицепс'},{name:'Тяга штанги в наклоне',sets:3,reps:'15',rest:'45 сек',notes:'Локти тянутся к поясу'},{name:'Подъём гантелей на бицепс',sets:3,reps:'15',rest:'45 сек',notes:'Локти зафиксированы'},{name:'Горизонтальные ножницы',sets:3,reps:'20',rest:'30 сек',notes:'Поясница прижата к полу'},{name:'Боковая планка',sets:3,reps:'30 сек',rest:'30 сек',notes:'Бёдра не опускай'}],
        [{name:'Отжимания с паузой',sets:3,reps:'12',rest:'45 сек',notes:'1 сек пауза внизу'},{name:'Подтягивания (или тяга блока)',sets:3,reps:'10',rest:'60 сек',notes:'Полная амплитуда'},{name:'Жим гантелей на наклонной',sets:3,reps:'15',rest:'45 сек',notes:'30° наклон скамьи'},{name:'Велосипед',sets:3,reps:'20',rest:'30 сек',notes:'Медленно, с поворотом'},{name:'Разгибание трицепса',sets:3,reps:'15',rest:'30 сек',notes:'Локоть над головой'}]
      ],
      'Низ тела':[
        [{name:'Приседания',sets:3,reps:'20',rest:'45 сек',notes:'Колени за носки не выходят'},{name:'Выпады',sets:3,reps:'12',rest:'45 сек',notes:'Переднее колено над лодыжкой'},{name:'Ягодичный мост',sets:3,reps:'20',rest:'30 сек',notes:'Пик сокращения 1 сек'},{name:'Подъём на носки',sets:3,reps:'25',rest:'30 сек',notes:'Полная амплитуда'},{name:'Планка (кор)',sets:3,reps:'40 сек',rest:'30 сек',notes:'Стабилизация корпуса'}],
        [{name:'Приседания с прыжком',sets:3,reps:'15',rest:'45 сек',notes:'Мягкое приземление'},{name:'Обратные выпады',sets:3,reps:'12',rest:'45 сек',notes:'Шаг назад, не вперёд'},{name:'Ягодичный мост на одной ноге',sets:3,reps:'12',rest:'45 сек',notes:'Держи таз ровно'},{name:'Сумо-приседания',sets:3,reps:'15',rest:'45 сек',notes:'Ноги широко, носки наружу'},{name:'Скручивания',sets:3,reps:'20',rest:'30 сек',notes:'Поясница прижата'}],
        [{name:'Болгарские выпады',sets:3,reps:'10',rest:'60 сек',notes:'Задняя нога на скамье'},{name:'Доброе утро',sets:3,reps:'15',rest:'45 сек',notes:'Спина прямая, таз назад'},{name:'Приседания с паузой',sets:3,reps:'12',rest:'45 сек',notes:'2 сек внизу'},{name:'Отведение ноги назад',sets:3,reps:'15',rest:'30 сек',notes:'Ягодица в пике'},{name:'Велосипед',sets:3,reps:'25',rest:'30 сек',notes:'Медленно'}],
        [{name:'Зашагивания на скамью',sets:3,reps:'12',rest:'60 сек',notes:'Полное выпрямление ноги'},{name:'Румынская тяга с гантелями',sets:3,reps:'15',rest:'45 сек',notes:'Лёгкий вес, растяжение'},{name:'Приседания суперсет+выпады',sets:3,reps:'10+10',rest:'60 сек',notes:'Без паузы между'},{name:'Ягодичный мост широко',sets:3,reps:'20',rest:'30 сек',notes:'Стопы широко'},{name:'Планка с подъёмом ноги',sets:3,reps:'10',rest:'30 сек',notes:'Таз не вращай'}]
      ],
      'Full body':[
        [{name:'Берпи',sets:3,reps:'10',rest:'45 сек',notes:'Взрывной прыжок'},{name:'Отжимания',sets:3,reps:'12',rest:'45 сек',notes:'Корпус прямой'},{name:'Приседания с прыжком',sets:3,reps:'12',rest:'45 сек',notes:'Мягкое приземление'},{name:'Тяга гантели',sets:3,reps:'12',rest:'45 сек',notes:'Каждой рукой'},{name:'Планка',sets:3,reps:'45 сек',rest:'30 сек',notes:'Держи напряжение'}],
        [{name:'Прыжки на месте',sets:3,reps:'40 сек',rest:'30 сек',notes:'Активные руки'},{name:'Приседания+жим',sets:3,reps:'12',rest:'45 сек',notes:'Вставай — жми'},{name:'Тяга в наклоне+шраги',sets:3,reps:'12',rest:'45 сек',notes:'Суперсет'},{name:'Скалолаз',sets:3,reps:'30 сек',rest:'30 сек',notes:'Быстро'},{name:'Обратные скручивания',sets:3,reps:'15',rest:'30 сек',notes:'Медленно'}],
        [{name:'Берпи с отжиманием',sets:3,reps:'8',rest:'60 сек',notes:'Полный берпи'},{name:'Болгарские выпады',sets:3,reps:'10',rest:'60 сек',notes:'Каждой ногой'},{name:'Подтягивания/тяга блока',sets:3,reps:'10',rest:'60 сек',notes:'Полная амплитуда'},{name:'Плиометрические отжимания',sets:3,reps:'8',rest:'60 сек',notes:'Взрывной жим'},{name:'Планка+тяга гантели',sets:3,reps:'10',rest:'45 сек',notes:'Каждой рукой'}],
        [{name:'Круговая тренировка 5 упр',sets:4,reps:'40 сек',rest:'20 сек',notes:'Берпи→отжим→присед→тяга→планка'},{name:'Активная растяжка',sets:1,reps:'5 мин',rest:'0',notes:'Финальный блок'}]
      ]
    },
    'набор массы':{
      'Верх тела':[
        [{name:'Жим штанги лёжа',sets:4,reps:'8',rest:'90 сек',notes:'Лопатки сведены, дуга в спине'},{name:'Тяга штанги в наклоне',sets:4,reps:'8',rest:'90 сек',notes:'Локти к поясу'},{name:'Жим штанги стоя',sets:3,reps:'10',rest:'75 сек',notes:'Не отклоняй корпус'},{name:'Подтягивания с весом',sets:3,reps:'8',rest:'90 сек',notes:'Полная амплитуда'},{name:'Подъём штанги на бицепс',sets:3,reps:'10',rest:'60 сек',notes:'Локти зафиксированы'}],
        [{name:'Жим гантелей лёжа',sets:4,reps:'10',rest:'75 сек',notes:'Больший диапазон чем штанга'},{name:'Тяга гантелей в наклоне',sets:4,reps:'10',rest:'75 сек',notes:'Максимальное растяжение'},{name:'Разводка гантелей лёжа',sets:3,reps:'12',rest:'60 сек',notes:'Лёгкий изгиб в локтях'},{name:'Тяга верхнего блока',sets:3,reps:'10',rest:'75 сек',notes:'Широкий хват'},{name:'Французский жим',sets:3,reps:'12',rest:'60 сек',notes:'Локти смотрят в потолок'}],
        [{name:'Жим на наклонной скамье',sets:4,reps:'8',rest:'90 сек',notes:'30° — акцент верх груди'},{name:'Горизонтальная тяга блока',sets:4,reps:'10',rest:'75 сек',notes:'Узкий хват'},{name:'Жим гантелей стоя',sets:3,reps:'12',rest:'60 сек',notes:'Поочерёдно'},{name:'Тяга штанги к подбородку',sets:3,reps:'12',rest:'60 сек',notes:'Локти выше плеч'},{name:'Молотковые сгибания',sets:3,reps:'12',rest:'60 сек',notes:'Нейтральный хват'}],
        [{name:'Жим штанги лёжа (тест)',sets:5,reps:'5',rest:'120 сек',notes:'Рабочий вес недели 1+10%'},{name:'Суперсет: тяга+разводка',sets:3,reps:'10+12',rest:'75 сек',notes:'Без паузы'},{name:'Жим Arnold',sets:3,reps:'12',rest:'60 сек',notes:'Поворот в верхней точке'},{name:'Тяга к лицу',sets:3,reps:'15',rest:'45 сек',notes:'Задние дельты+ротаторы'},{name:'Суперсет бицепс+трицепс',sets:3,reps:'12+12',rest:'60 сек',notes:'Без паузы'}]
      ],
      'Низ тела':[
        [{name:'Приседания со штангой',sets:4,reps:'8',rest:'120 сек',notes:'Бёдра параллельно полу'},{name:'Становая тяга',sets:3,reps:'6',rest:'150 сек',notes:'Спина нейтральна, гриф к ногам'},{name:'Жим ногами',sets:3,reps:'12',rest:'90 сек',notes:'Ноги на ширине плеч'},{name:'Румынская тяга',sets:3,reps:'10',rest:'90 сек',notes:'Растяжение бицепса бедра'},{name:'Подъём на носки со штангой',sets:4,reps:'15',rest:'45 сек',notes:'Пауза внизу'}],
        [{name:'Фронтальные приседания',sets:4,reps:'8',rest:'120 сек',notes:'Локти высоко, спина вертикально'},{name:'Становая тяга сумо',sets:3,reps:'8',rest:'120 сек',notes:'Широкая стойка'},{name:'Гакк-приседания',sets:3,reps:'12',rest:'90 сек',notes:'Акцент на квадрицепс'},{name:'Сгибание ног в тренажёре',sets:3,reps:'12',rest:'75 сек',notes:'Медленное опускание'},{name:'Ослиные подъёмы на носки',sets:4,reps:'20',rest:'45 сек',notes:'Наклон вперёд'}],
        [{name:'Приседания паузные',sets:4,reps:'6',rest:'120 сек',notes:'3 сек внизу — взрывной подъём'},{name:'Становая тяга (румынская)',sets:4,reps:'8',rest:'120 сек',notes:'С пола не отрывай'},{name:'Выпады со штангой',sets:3,reps:'10',rest:'90 сек',notes:'Шагающие по залу'},{name:'Разгибание ног',sets:3,reps:'15',rest:'60 сек',notes:'Пауза в верхней точке'},{name:'Икры сидя',sets:4,reps:'20',rest:'45 сек',notes:'Медленно'}],
        [{name:'Приседания (тест макс)',sets:5,reps:'5',rest:'150 сек',notes:'Вес недели 1+10-15%'},{name:'Становая тяга (тест)',sets:3,reps:'5',rest:'150 сек',notes:'Финальный тест прогресса'},{name:'Болгарские выпады с гантелями',sets:3,reps:'10',rest:'90 сек',notes:'Каждой ногой'},{name:'Жим ногами широко',sets:3,reps:'15',rest:'75 сек',notes:'Акцент на ягодицы'},{name:'Икры суперсет',sets:3,reps:'20+20',rest:'45 сек',notes:'Стоя+сидя'}]
      ],
      'Full body':[
        [{name:'Жим лёжа',sets:3,reps:'10',rest:'90 сек',notes:'Чуть легче рабочего'},{name:'Приседания',sets:3,reps:'10',rest:'90 сек',notes:'Средний вес'},{name:'Тяга в наклоне',sets:3,reps:'10',rest:'90 сек',notes:'Контроль'},{name:'Жим стоя',sets:3,reps:'12',rest:'75 сек',notes:'Активный кор'},{name:'Становая тяга лёгкая',sets:3,reps:'8',rest:'90 сек',notes:'60% от рабочего'}],
        [{name:'Толчок гантелей',sets:4,reps:'8',rest:'90 сек',notes:'Взрывная фаза'},{name:'Тяга штанги с пола',sets:4,reps:'6',rest:'120 сек',notes:'Комплексное движение'},{name:'Приседания+жим',sets:3,reps:'10',rest:'75 сек',notes:'Суперсет'},{name:'Подтягивания',sets:3,reps:'8',rest:'90 сек',notes:'Собственный вес'},{name:'Планка',sets:3,reps:'60 сек',rest:'30 сек',notes:'Стабилизация'}],
        [{name:'Становая тяга',sets:3,reps:'8',rest:'120 сек',notes:'Рабочий вес'},{name:'Жим гантелей лёжа',sets:3,reps:'10',rest:'90 сек',notes:'Полный диапазон'},{name:'Фронтальные приседания',sets:3,reps:'8',rest:'90 сек',notes:'Техника важнее веса'},{name:'Тяга к поясу',sets:3,reps:'10',rest:'90 сек',notes:'Широкий хват'},{name:'Жим стоя',sets:3,reps:'10',rest:'75 сек',notes:'Активный корпус'}],
        [{name:'Комплекс: рывок+толчок+присед',sets:5,reps:'5',rest:'120 сек',notes:'Заключительный комплекс'},{name:'Суперсет: жим+тяга',sets:3,reps:'10+10',rest:'75 сек',notes:'Без паузы'},{name:'Финальный AMRAP 10 мин',sets:1,reps:'макс',rest:'0',notes:'Присед+отжим+тяга поочерёдно'}]
      ]
    },
    'тонус':{
      'Верх тела':[
        [{name:'Жим гантелей лёжа',sets:3,reps:'12',rest:'60 сек',notes:'Лопатки сведены'},{name:'Тяга гантели в наклоне',sets:3,reps:'12',rest:'60 сек',notes:'Спина параллельна полу'},{name:'Жим гантелей стоя',sets:3,reps:'12',rest:'60 сек',notes:'Не прогибай поясницу'},{name:'Тяга верхнего блока',sets:3,reps:'12',rest:'60 сек',notes:'Тяни локтями вниз'},{name:'Планка',sets:3,reps:'45 сек',rest:'30 сек',notes:'Тело — прямая линия'}],
        [{name:'Жим на наклонной скамье',sets:3,reps:'12',rest:'60 сек',notes:'30° — верх груди'},{name:'Тяга горизонтального блока',sets:3,reps:'12',rest:'60 сек',notes:'Узкий хват, локти к телу'},{name:'Разводка гантелей',sets:3,reps:'12',rest:'60 сек',notes:'Лёгкий изгиб в локтях'},{name:'Тяга к лицу',sets:3,reps:'15',rest:'45 сек',notes:'Задние дельты'},{name:'Скручивания с поворотом',sets:3,reps:'15',rest:'30 сек',notes:'Медленно'}],
        [{name:'Отжимания с весом',sets:3,reps:'12',rest:'60 сек',notes:'Блин на спину'},{name:'Подтягивания (или тяга блока)',sets:3,reps:'10',rest:'60 сек',notes:'Полная амплитуда'},{name:'Суперсет: бицепс+трицепс',sets:3,reps:'12+12',rest:'60 сек',notes:'Без паузы между'},{name:'Подъём гантелей через стороны',sets:3,reps:'15',rest:'45 сек',notes:'Контроль, не качай'},{name:'Обратные скручивания',sets:3,reps:'15',rest:'30 сек',notes:'Поясница прижата'}],
        [{name:'Жим лёжа (рабочий вес)',sets:4,reps:'10',rest:'60 сек',notes:'Вес чуть выше нед.1'},{name:'Тяга штанги в наклоне',sets:4,reps:'10',rest:'60 сек',notes:'Финальная прогрессия'},{name:'Жим Арнольда',sets:3,reps:'12',rest:'60 сек',notes:'Поворот запястий'},{name:'Суперсет: тяга к лицу+разводка',sets:3,reps:'12+12',rest:'60 сек',notes:'Без паузы'},{name:'Планка боковая',sets:3,reps:'40 сек',rest:'30 сек',notes:'Каждая сторона'}]
      ],
      'Низ тела':[
        [{name:'Приседания с гантелями',sets:3,reps:'15',rest:'60 сек',notes:'Колени за носки не выходят'},{name:'Выпады с гантелями',sets:3,reps:'12',rest:'60 сек',notes:'Переднее колено над лодыжкой'},{name:'Румынская тяга с гантелями',sets:3,reps:'12',rest:'60 сек',notes:'Растяжение бицепса бедра'},{name:'Ягодичный мост',sets:3,reps:'15',rest:'45 сек',notes:'Пик сокращения 1 сек'},{name:'Подъём на носки',sets:3,reps:'20',rest:'30 сек',notes:'Полная амплитуда'}],
        [{name:'Фронтальные приседания',sets:3,reps:'12',rest:'60 сек',notes:'Акцент на квадрицепс'},{name:'Болгарские выпады',sets:3,reps:'10',rest:'75 сек',notes:'Задняя нога на скамье'},{name:'Доброе утро с гантелями',sets:3,reps:'12',rest:'60 сек',notes:'Спина прямая'},{name:'Ягодичный мост на одной ноге',sets:3,reps:'12',rest:'45 сек',notes:'Каждой ногой'},{name:'Сумо-приседания',sets:3,reps:'15',rest:'45 сек',notes:'Ноги широко'}],
        [{name:'Приседания паузные',sets:3,reps:'10',rest:'75 сек',notes:'2 сек внизу — взрывной подъём'},{name:'Шагающие выпады',sets:3,reps:'12',rest:'60 сек',notes:'10м туда-обратно'},{name:'Становая тяга на прямых ногах',sets:3,reps:'12',rest:'60 сек',notes:'Максимальное растяжение'},{name:'Зашагивания на скамью',sets:3,reps:'12',rest:'60 сек',notes:'Полное выпрямление'},{name:'Ягодичный мост с паузой',sets:3,reps:'15',rest:'45 сек',notes:'3 сек вверху'}],
        [{name:'Суперсет: присед+выпады',sets:4,reps:'10+10',rest:'75 сек',notes:'Без паузы — финальный вызов'},{name:'Румынская тяга (тест веса)',sets:3,reps:'12',rest:'60 сек',notes:'На 10% больше нед.1'},{name:'Сгибание ног в тренажёре',sets:3,reps:'15',rest:'45 сек',notes:'Медленное опускание'},{name:'Икры суперсет',sets:3,reps:'20+20',rest:'30 сек',notes:'Стоя+сидя'},{name:'Растяжка ног',sets:1,reps:'5 мин',rest:'0',notes:'Финальный блок'}]
      ],
      'Full body':[
        [{name:'Приседания с гантелями',sets:3,reps:'15',rest:'60 сек',notes:'Глубокий присед'},{name:'Жим гантелей лёжа',sets:3,reps:'12',rest:'60 сек',notes:'Полный диапазон'},{name:'Тяга гантели в наклоне',sets:3,reps:'12',rest:'60 сек',notes:'Каждой рукой'},{name:'Выпады',sets:3,reps:'12',rest:'60 сек',notes:'Чередуй ноги'},{name:'Планка',sets:3,reps:'45 сек',rest:'30 сек',notes:'Стабилизация'}],
        [{name:'Берпи',sets:3,reps:'10',rest:'60 сек',notes:'Взрывной прыжок'},{name:'Жим гантелей стоя+присед',sets:3,reps:'12',rest:'60 сек',notes:'Суперсет снизу-вверх'},{name:'Тяга блока+разводка',sets:3,reps:'12+12',rest:'60 сек',notes:'Спина+плечи'},{name:'Обратные выпады+жим',sets:3,reps:'10',rest:'60 сек',notes:'Функциональное движение'},{name:'Скручивания+подъём ног',sets:3,reps:'12+12',rest:'45 сек',notes:'Пресс суперсет'}],
        [{name:'Круговая: 6 упр × 40 сек',sets:3,reps:'40 сек',rest:'20 сек',notes:'Присед→жим→тяга→выпад→бёрпи→планка'},{name:'Суперсет: верх+низ',sets:3,reps:'12+12',rest:'60 сек',notes:'Жим стоя+румынская тяга'},{name:'Функциональная тяга',sets:3,reps:'12',rest:'60 сек',notes:'Тяга с нижнего блока стоя'},{name:'Кор-финиш',sets:1,reps:'5 мин',rest:'0',notes:'Планка+скручивания+велосипед'}],
        [{name:'ФИНАЛ: лучшее за 4 недели',sets:4,reps:'12',rest:'60 сек',notes:'Твои любимые упражнения из плана'},{name:'Замер времени планки',sets:1,reps:'максимум',rest:'0',notes:'Сравни с неделей 1'},{name:'Максимум отжиманий',sets:1,reps:'до отказа',rest:'0',notes:'Тест прогресса'},{name:'Растяжка всего тела',sets:1,reps:'7 мин',rest:'0',notes:'Заслуженный финал!'}]
      ]
    }
  };

  var SMART = {2:[true,false,false,true,false,false,false],3:[true,false,true,false,true,false,false],4:[true,true,false,true,true,false,false],5:[true,true,false,true,true,true,false],6:[true,true,true,false,true,true,true]};
  var schedule = SMART[Math.min(6,Math.max(2,days))] || SMART[3];
  var DAY_NAMES = ['Понедельник','Вторник','Среда','Четверг','Пятница','Суббота','Воскресенье'];
  var SPLITS = {2:['Верх тела','Низ тела'],3:['Верх тела','Низ тела','Full body'],4:['Верх тела','Низ тела','Верх тела','Низ тела'],5:['Верх тела','Низ тела','Full body','Верх тела','Низ тела'],6:['Верх тела','Низ тела','Full body','Верх тела','Низ тела','Full body']};
  var splits = SPLITS[Math.min(6,Math.max(2,days))] || SPLITS[3];
  var themes = ['Базовая нагрузка','Прогрессия','Интенсификация','Закрепление'];
  var kcalMap = {'похудение':290,'набор массы':400,'тонус':320};
  var kcal = kcalMap[goal] || 320;
  var pool = POOLS[goal] || POOLS['тонус'];
  var weeks = [], trainIdx = 0;
  for(var w=0; w<4; w++) {
    var dl = [];
    var localTrain = 0;
    for(var d=0; d<7; d++) {
      if(schedule[d]) {
        var splitName = splits[localTrain % splits.length];
        var splitPool = pool[splitName] || pool['Full body'];
        var variant = splitPool[Math.min(w, splitPool.length-1)];
        dl.push({
          dayNumber: d+1,
          name: DAY_NAMES[d] + ' — ' + splitName,
          type: 'силовая',
          duration: dur,
          caloriesBurned: kcal + (w*15),
          exercises: variant
        });
        localTrain++;
      } else {
        dl.push({
          dayNumber: d+1,
          name: DAY_NAMES[d] + ' — Отдых',
          type: 'отдых',
          duration: 0,
          caloriesBurned: 0,
          exercises: []
        });
      }
    }
    weeks.push({weekNumber: w+1, theme: themes[w], days: dl});
  }
  return {title:'4-недельный план: '+goal+' ('+level+')', goal:goal, weeks:weeks};
}

// ==================== РЕНДЕР ПЛАНА ====================
function renderPlan(plan) {
  var container = document.getElementById('ai-plan-result');
  if (!container) return;
  var html = '<div style="display:flex;flex-direction:column;gap:12px;">';
  html += '<div style="font-size:1.1rem;font-weight:800;color:var(--accent);margin-bottom:4px;">📋 ' + (plan.title || 'Персональный план') + '</div>';
  if (plan.nutrition) {
    html += '<div style="background:rgba(255,255,255,0.05);border-radius:14px;padding:12px;">' +
      '<div style="font-weight:700;margin-bottom:8px;">🍽 Рекомендации по питанию</div>' +
      '<div style="font-size:0.85rem;">🔥 ' + plan.nutrition.dailyCalories + ' ккал · Б: ' + plan.nutrition.protein + ' г · У: ' + plan.nutrition.carbs + ' г · Ж: ' + plan.nutrition.fat + ' г</div>' +
      '<div style="font-size:0.78rem;color:var(--text-light);margin-top:6px;">💡 ' + plan.nutrition.tip + '</div>' +
      '</div>';
  }
  for (var w = 0; w < plan.weeks.length; w++) {
    var week = plan.weeks[w];
    html += '<div class="ai-week-card"><div class="ai-week-title">🔹 НЕДЕЛЯ ' + week.weekNumber + ' · ' + (week.theme || 'Прогресс') + '</div>';
    for (var d = 0; d < week.days.length; d++) {
      var day = week.days[d];
      html += '<div class="ai-day-card"><div class="ai-day-header"><span>' + day.name + '</span><span style="font-size:0.7rem;color:var(--text-light);">' + day.duration + ' мин · 🔥 ' + day.caloriesBurned + ' ккал</span></div>';
      if (day.exercises && day.exercises.length) {
        html += '<div style="margin-top:6px;">';
        for (var e = 0; e < day.exercises.length; e++) {
          var ex = day.exercises[e];
          html += '<div class="ai-ex-row"><div class="ai-ex-main"><span style="font-weight:600;">' + (e+1) + '. ' + ex.name + '</span><span style="color:var(--text-light);">' + ex.sets + '×' + ex.reps + ' · ' + ex.rest + '</span></div><div class="ai-ex-note">' + (ex.notes || '') + '</div></div>';
        }
        html += '</div>';
      } else if (day.type === 'отдых') {
        html += '<div style="font-size:0.78rem;color:var(--text-light);padding:6px 0;">🛌 День отдыха — восстановление</div>';
      }
      html += '</div>';
    }
    html += '</div>';
  }
  html += '</div>';
  container.innerHTML = html;
}

// ==================== ИНИЦИАЛИЗАЦИЯ ====================
restoreChatHistory();

window.clearChatHistory = function() {
  aiChatHistory = [];
  localStorage.removeItem('fs-ai-chat-history');
  var msgs = document.getElementById('ai-chat-msgs');
  if(msgs) msgs.innerHTML = '';
  appendMsg('ai', 'История чата очищена. Чем могу помочь?');
};

})();