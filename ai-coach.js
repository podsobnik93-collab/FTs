'use strict';

/* ══════════════════════════════════════════════════════════════
   AI-COACH  —  FitSim
   Улучшения: добавлен стаж, авто-уровень, прогрессивная перегрузка
   ══════════════════════════════════════════════════════════════ */

var aiGoal = 'loss';
var aiLevel = '';
var aiEquip = [];
var aiChatHistory = [];
var chatReady = false;
var lastTopic = null;
var generating = false;
var lastPlanParams = null;

// ── утилиты ──────────────────────────────────────────────────
function escapeHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function extractJSON(str) {
  var clean = str.replace(/```json|```/g,'');
  var start = clean.indexOf('{');
  if (start === -1) return null;
  var depth=0, inString=false, escape=false;
  for (var i=start; i<clean.length; i++) {
    var ch = clean[i];
    if (escape) { escape=false; continue; }
    if (ch==='\\') { escape=true; continue; }
    if (ch==='"') { inString=!inString; }
    if (!inString) {
      if (ch==='{') depth++;
      else if (ch==='}') {
        depth--;
        if (depth===0) {
          var raw = clean.slice(start, i+1);
          try { return JSON.parse(raw); } catch(e) { console.warn('JSON parse error', e); return null; }
        }
      }
    }
  }
  return null;
}

function persistChatHistory() {
  try { localStorage.setItem('fs-ai-chat-history', JSON.stringify(aiChatHistory.slice(-60))); } catch(e){}
}

function restoreChatHistory() {
  try {
    var saved = localStorage.getItem('fs-ai-chat-history');
    if (saved) {
      aiChatHistory = JSON.parse(saved);
      for (var i=0; i<aiChatHistory.length; i++) appendMsg(aiChatHistory[i].role, aiChatHistory[i].content);
    }
  } catch(e) {}
}

// ── переключение вкладок ─────────────────────────────────────
window.aiSwitchTab = function(t) {
  ['plan','chat','key'].forEach(function(x) {
    var p = document.getElementById('ai-pane-'+x);
    var b = document.getElementById('ai-tab-'+x);
    if(p) p.style.display = (x===t?'':'none');
    if(b) b.className = 'ai-tab' + (x===t?' ai-tab-active':'');
  });
  if(t==='chat' && !chatReady) {
    chatReady = true;
    appendMsg('ai','👋 Привет! Я твой AI-тренер — спрашивай про тренировки, питание, восстановление или технику упражнений. Groq-ключ не нужен для базовых ответов!');
  }
  if(t==='key') {
    var k = localStorage.getItem('fs-groq-key');
    var s = document.getElementById('ai-key-status');
    if(s) s.textContent = k ? '✓ Ключ сохранён — модель llama-3.3-70b-versatile' : 'Ключ не задан — работает офлайн-режим';
  }
};

// ── настройки плана ──────────────────────────────────────────
window.aiSetGoal = function(v,b) {
  aiGoal = v;
  ['ai-goal-loss','ai-goal-gain','ai-goal-tone'].forEach(function(id) {
    var e = document.getElementById(id);
    if(e) e.className = 'ai-chip' + (e===b?' ai-chip-active':'');
  });
};

window.aiSetLevel = function(v,b) {
  aiLevel = v;
  ['ai-lvl-beg','ai-lvl-mid','ai-lvl-adv'].forEach(function(id) {
    var e = document.getElementById(id);
    if(e) e.className = 'ai-chip' + (e===b?' ai-chip-active':'');
  });
};

window.aiToggleEquip = function(v,b) {
  var i = aiEquip.indexOf(v);
  if(i>=0) { aiEquip.splice(i,1); b.className='ai-chip'; }
  else { aiEquip.push(v); b.className='ai-chip ai-chip-active'; }
};

window.aiSaveKey = function() {
  var inp = document.getElementById('ai-key-input'), k = inp ? inp.value.trim() : '';
  var s = document.getElementById('ai-key-status');
  if(k) {
    localStorage.setItem('fs-groq-key', k);
    if(inp) { inp.value=''; inp.placeholder='gsk_...сохранён'; }
    if(s) s.textContent = '✓ Ключ сохранён — модель llama-3.3-70b-versatile';
    if(typeof toast==='function') toast('✓ Groq API-ключ сохранён');
  } else {
    localStorage.removeItem('fs-groq-key');
    if(s) s.textContent = 'Ключ удалён — работает офлайн-режим';
  }
};

// ── генерация плана ──────────────────────────────────────────
window.aiGeneratePlan = async function() {
  if(generating) { if(typeof toast==='function') toast('⏳ Уже генерирую...'); return; }
  generating = true;

  var days = parseInt((document.getElementById('ai-days-slider')||{value:'3'}).value, 10) || 3;
  var dur  = parseInt((document.getElementById('ai-dur-slider') ||{value:'45'}).value, 10) || 45;
  var restr = ((document.getElementById('ai-restrictions')||{}).value||'').trim();

  var gl = {loss:'похудение', gain:'набор массы', tone:'тонус и рельеф'}[aiGoal] || aiGoal;
  var gb = document.getElementById('ai-gen-btn');
  var ld = document.getElementById('ai-plan-loading');
  var res = document.getElementById('ai-plan-result');
  if(gb) gb.style.display='none';
  if(ld) ld.style.display='';
  if(res) res.innerHTML='';

  var profile = {};
  try { profile = JSON.parse(localStorage.getItem('fs-profile')) || {}; } catch(e) {}

  var userAge    = profile.age    || 28;
  var userWeight = profile.weight || 75;
  var userHeight = profile.height || 175;
  var userGender = profile.gender === 'female' ? 'женщина' : 'мужчина';
  var userGoalW  = profile.target ? ('цель: ' + profile.target + 'кг за ' + (profile.weeks||12) + ' нед.') : '';
  var trainingMonths = parseInt(profile.trainingMonths) || 0;

  // Авто-уровень, если не выбран вручную
  if (!aiLevel) {
    aiLevel = trainingMonths <= 3 ? 'новичок' : trainingMonths <= 12 ? 'начинающий' :
              trainingMonths <= 36 ? 'средний' : 'продвинутый';
  }
  var expLabel = trainingMonths === 0 ? 'новичок (стаж не указан)' :
                 trainingMonths <= 3 ? 'новичок (' + trainingMonths + ' мес.)' :
                 trainingMonths <= 12 ? 'начинающий (' + trainingMonths + ' мес.)' :
                 trainingMonths <= 36 ? 'средний (' + trainingMonths + ' мес.)' :
                 trainingMonths <= 72 ? 'продвинутый (' + trainingMonths + ' мес.)' :
                                        'эксперт (' + trainingMonths + ' мес.)';

  // Подсказка в UI
  var hint = document.getElementById('ai-lvl-hint');
  if (hint) hint.textContent = aiLevel ? '🔹 Уровень: ' + aiLevel + (trainingMonths > 0 ? ' (стаж ' + trainingMonths + ' мес.)' : '') : '🔸 Уровень определён по стажу: ' + expLabel;

  // Сохраним параметры для регенерации
  lastPlanParams = { days, dur, restr, gl, aiGoal, aiLevel, aiEquip: [...aiEquip], userAge, userWeight, userHeight, userGender, userGoalW, trainingMonths, expLabel };

  var plan = null;
  try {
    var key = localStorage.getItem('fs-groq-key');
    if(key) {
      var sys = `Ты — элитный персональный тренер (NSCA-CSCS, FMS Level 2) и нутрициолог (Precision Nutrition L2).
Составляй научно обоснованные программы. Правила:
1. ПРОГРЕССИВНАЯ ПЕРЕГРУЗКА: каждую неделю увеличивай нагрузку (вес +2.5-5кг или повторения +1-2).
2. ДЕLOAD: неделя 4 = снижение объёма на 40% (меньше подходов/веса) для суперкомпенсации.
3. ВАРИАТИВНОСТЬ: не повторяй одинаковые упражнения в одну мышечную группу подряд без ротации.
4. RPE: указывай субъективную нагрузку (rpe: 6-10) для каждого упражнения.
5. ТЕМП: для базовых упражнений указывай tempo (напр. "3-1-2" = 3 сек вниз, 1 пауза, 2 вверх).
6. ФОРМАТЫ подходов: обычные, суперсеты (ss:true), дроп-сеты (drop:true), AMRAP (amrap:true).
7. СПЛИТЫ: для 2-3 дней — Full Body, для 4 дней — Upper/Lower, для 5-6 — PPL или специализация.
8. ПИТАНИЕ: реалистичные КБЖУ исходя из веса/цели, с конкретным советом на день.
ФОРМАТ — строго JSON без markdown:
{
  "title":"...", "goal":"...",
  "nutrition":{"dailyCalories":2000,"protein":150,"carbs":200,"fat":60,"tip":"..."},
  "weeks":[{
    "weekNumber":1, "theme":"...", "progressionNote":"...",
    "days":[{
      "dayNumber":1, "name":"...", "type":"тренировка",
      "duration":45, "caloriesBurned":300,
      "exercises":[{
        "name":"...", "sets":3, "reps":"8-12", "rest":90,
        "kg":60, "rpe":8, "tempo":"3-1-2",
        "ss":false, "drop":false, "amrap":false,
        "notes":"..."
      }]
    }]
  }]
}`;

      var usr = `Составь 4-недельную программу.
Цель: ${gl}, уровень: ${aiLevel}, стаж: ${expLabel}, дней в неделю: ${days}, время тренировки: ${dur} мин.
Оборудование: ${aiEquip.join(', ')||'зал'}.${restr ? '\nОграничения/пожелания: '+restr : ''}
Клиент: ${userGender}, ${userAge} лет, вес ${userWeight}кг, рост ${userHeight}см. ${userGoalW}
Учти стаж при подборе упражнений. Ответь ТОЛЬКО JSON.`;

      var reply = await callGroq(key, sys, [{role:'user', content:usr}], 4000);
      plan = extractJSON(reply);
      if(!plan) throw new Error('Invalid JSON from Groq');
    }
  } catch(e) { console.warn('Groq error:', e.message); }

  if(!plan) plan = makeFallback(aiGoal, aiLevel, days, dur);

  if(gb) gb.style.display='';
  if(ld) ld.style.display='none';
  renderPlan(plan);

  // кнопки
  var container = document.getElementById('ai-plan-result');
  if(container && plan && plan.weeks) {
    var btnSave = document.createElement('button');
    btnSave.textContent = '💾 Сохранить как программу';
    btnSave.style.cssText = 'width:100%;margin-top:12px;padding:12px;background:#22c55e;color:#fff;border:none;border-radius:12px;font-weight:800;cursor:pointer;';
    btnSave.onclick = function() { savePlanToPrograms(plan); };
    container.appendChild(btnSave);

    var btnToday = document.createElement('button');
    btnToday.textContent = '▶ Начать сегодняшнюю тренировку';
    btnToday.style.cssText = 'width:100%;margin-top:8px;padding:12px;background:var(--accent, #a78bfa);color:#fff;border:none;border-radius:12px;font-weight:800;cursor:pointer;';
    btnToday.onclick = function() { startTodayFromPlan(plan); };
    container.appendChild(btnToday);

    var btnRegen = document.createElement('button');
    btnRegen.textContent = '🔄 Регенерировать план';
    btnRegen.style.cssText = 'width:100%;margin-top:8px;padding:10px;background:rgba(255,255,255,0.06);color:var(--text-light,#aaa);border:1px solid rgba(255,255,255,0.15);border-radius:12px;font-weight:600;cursor:pointer;font-size:0.9rem;';
    btnRegen.onclick = function() { window.aiGeneratePlan(); };
    container.appendChild(btnRegen);
  }

  generating = false;
  setTimeout(function() { generating = false; }, 2000);
};

// ── сохранить план как программу ─────────────────────────────
window.savePlanToPrograms = function(plan) {
  if(!plan || !plan.weeks) { if(typeof toast==='function') toast('Нет плана'); return; }
  var daysOfWeek = ['Вс','Пн','Вт','Ср','Чт','Пт','Сб'];
  var schedule = [];
  for(var w=0; w<plan.weeks.length && w<1; w++) {
    var week = plan.weeks[w];
    for(var d=0; d<week.days.length; d++) {
      var day = week.days[d];
      var weekdayIndex = (day.dayNumber - 1) % 7;
      var rest = day.type && day.type.includes('отдых');
      schedule.push({
        label: daysOfWeek[weekdayIndex],
        name: day.name,
        rest: rest,
        exs: rest ? [] : (day.exercises||[]).map(function(e) { return e.name; })
      });
    }
  }
  var weekSchedule = schedule.slice(0,7);
  var newProgram = {
    id: 'ai_' + Date.now(),
    name: plan.title,
    label: 'AI-план',
    level: aiLevel || 'средний',
    daysweek: weekSchedule.filter(function(d){ return !d.rest; }).length,
    goal: plan.goal || aiGoal,
    desc: 'Сгенерировано AI-тренером',
    schedule: weekSchedule
  };
  try {
    if(typeof window.PROGRAMS !== 'undefined' && Array.isArray(window.PROGRAMS)) window.PROGRAMS.push(newProgram);
    var existing = JSON.parse(localStorage.getItem('fs-programs') || '[]');
    existing.push(newProgram);
    localStorage.setItem('fs-programs', JSON.stringify(existing));
    if(typeof toast==='function') toast('✓ Программа сохранена!');
  } catch(e) {
    if(typeof toast==='function') toast('Ошибка сохранения');
  }
};

// ── начать сегодняшнюю тренировку из плана ───────────────────
window.startTodayFromPlan = function(plan) {
  if(!plan || !plan.weeks || !plan.weeks[0]) { if(typeof toast==='function') toast('Нет плана'); return; }
  var todayIndex = new Date().getDay();
  var targetDayNumber = todayIndex === 0 ? 7 : todayIndex;
  var weekPlan = plan.weeks[0];
  var todayTraining = null;
  for(var i=0; i<weekPlan.days.length; i++) {
    if(weekPlan.days[i].dayNumber === targetDayNumber) { todayTraining = weekPlan.days[i]; break; }
  }
  if(!todayTraining) todayTraining = weekPlan.days.find(function(d){ return d.type && !d.type.includes('отдых'); });
  if(!todayTraining || (todayTraining.type && todayTraining.type.includes('отдых'))) {
    if(typeof toast==='function') toast('Сегодня — день отдыха 🛌');
    return;
  }
  var exercises = (todayTraining.exercises||[]).map(function(ex) {
    var sets = ex.sets || 3;
    var reps = parseInt(ex.reps) || 10;
    var kg   = ex.kg || 0;
    return { n: ex.name, s: sets, r: reps, kg: kg,
      setsdata: Array(sets).fill(null).map(function(){ return {r: reps, kg: kg, done: false}; }),
      done: false };
  });
  if(typeof window.customWt !== 'undefined') window.customWt = exercises;
  if(typeof window.showWtScreen==='function') window.showWtScreen('execute');
  if(typeof window.goTo==='function') window.goTo('workout','');
};

// ── быстрые вопросы ──────────────────────────────────────────
window.aiSendQuick = function(t) {
  var inp = document.getElementById('ai-chat-input');
  if(inp) inp.value = t;
  window.aiSendMessage();
};

// ── отправка сообщения в чат ─────────────────────────────────
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

  var reply;
  try {
    var key = localStorage.getItem('fs-groq-key');
    if(key) {
      var sys = `Ты — опытный персональный тренер (NSCA-CSCS) и нутрициолог (Precision Nutrition L2) с 15 годами практики.
Говоришь по-русски, дружелюбно и конкретно. Не повторяешь вопрос.
Даёшь персонализированные ответы: используй данные пользователя если они известны.
Структурируй длинные ответы: используй • для списков, **жирный** для ключевых слов.
Отвечай кратко (до 200 слов) если не просят детали.
Тематика: тренировки, питание, восстановление, техника, психология спорта, добавки, периодизация.`;

      reply = await callGroq(key, sys, aiChatHistory.slice(-16), 900);
    } else {
      reply = getFallback(text);
    }
  } catch(e) { reply = getFallback(text); }

  removeTyping(tid);
  appendMsg('ai', reply);
  aiChatHistory.push({role:'assistant', content:reply});
  persistChatHistory();
};

// ── офлайн-фолбэк для чата ───────────────────────────────────
function getFallback(t) {
  var tl = t.toLowerCase();

  if(tl.includes('протеин')||tl.includes('белок')) lastTopic='protein';
  else if(tl.includes('жир')||tl.includes('похуд')||tl.includes('дефицит')) lastTopic='fat_loss';
  else if(tl.includes('масса')||tl.includes('набор')) lastTopic='muscle_gain';
  else if(tl.includes('восстановлен')||tl.includes('боль')||tl.includes('крепатур')) lastTopic='recovery';
  else if(tl.includes('сон')) lastTopic='sleep';
  else if(tl.includes('кардио')||tl.includes('бег')) lastTopic='cardio';
  else if(tl.includes('присед')||tl.includes('squat')) lastTopic='squat';
  else if(tl.includes('жим')||tl.includes('грудь')||tl.includes('bench')) lastTopic='bench';
  else if(tl.includes('становая')||tl.includes('deadlift')) lastTopic='deadlift';
  else if(tl.includes('добавк')||tl.includes('креатин')||tl.includes('bcaa')) lastTopic='supplements';
  else if(tl.includes('вод')||tl.includes('питье')) lastTopic='water';
  else if(tl.includes('разминк')||tl.includes('растяжк')) lastTopic='warmup';
  else if(tl.includes('перетрен')||tl.includes('плато')) lastTopic='plateau';
  else if(tl.includes('мотивац')) lastTopic='motivation';

  if(tl.includes('сколько белка')||tl.includes('норма белка')||lastTopic==='protein'&&tl.includes('сколько')) {
    return '**Норма белка** зависит от цели:\n• Похудение: 1.8–2.2г/кг\n• Набор массы: 2.0–2.5г/кг\n• Поддержание: 1.4–1.6г/кг\nПри весе 80кг на массе = 160–200г/сутки. Источники: куриная грудка, творог, яйца, рыба, бобовые.';
  }
  if(tl.includes('похуд')||tl.includes('дефицит калор')||lastTopic==='fat_loss') {
    return '**Формула безопасного похудения:**\n• Дефицит 300–500 ккал/день = -0.3–0.5кг/нед\n• Белок 1.8–2.2г/кг — защищает мышцы\n• Силовые 3–4х/нед + HIIT 2х/нед\nИзбегай дефицита >700 ккал — потеряешь мышцы и замедлишь метаболизм.';
  }
  if(tl.includes('набор')||tl.includes('масс')||lastTopic==='muscle_gain') {
    return '**Набор мышечной массы:**\n• Профицит 200–350 ккал/день (медленный набор = меньше жира)\n• Белок 2.0–2.5г/кг, углеводы 4–6г/кг\n• Силовые 4–5х/нед, прогрессия нагрузки каждые 1–2 нед\n• Сон 8ч — пик GH и тестостерона ночью.';
  }
  if(tl.includes('боль')||tl.includes('крепатур')||tl.includes('восстановлен')||lastTopic==='recovery') {
    return '**Ускорение восстановления:**\n• Активное восстановление (лёгкое кардио, ходьба) лучше полного покоя\n• Холодный душ сразу после тренировки снижает DOMS\n• Белок 40г + углеводы в течение 60 мин после тренировки\n• Сон 7–9ч — главный анаболик\n• Магний 400мг на ночь снижает DOMS.';
  }
  if(tl.includes('сон')||lastTopic==='sleep') {
    return '**Сон и прогресс:**\n• 7–9 часов = пик выработки GH (80% суточной нормы ночью)\n• Дефицит сна на 1ч снижает тестостерон на 15–20%\n• Правила: темнота, температура 18–19°C, без экранов за 30 мин\n• 400мг магния глицинат за час до сна улучшает качество сна.';
  }
  if(tl.includes('кардио')||tl.includes('бег')||lastTopic==='cardio') {
    return '**Кардио и цели:**\n• Жиросжигание: LISS 45–60 мин при 60–70% ЧСС (зона 2)\n• Выносливость: HIIT 20 мин, интервалы 30сек/90сек\n• Сохранение мышц: не более 3х/нед при наборе, после силовых\n• Пульсовые зоны: Зона 2 (60-70%) = долго без накопления лактата.';
  }
  if(tl.includes('присед')||lastTopic==='squat') {
    return '**Техника приседаний:**\n• Стопы на ширине плеч или чуть шире, носки 15–30° наружу\n• Колени по линии носков — не заваливать внутрь\n• Спина нейтральная, взгляд прямо\n• Глубина: бёдра параллельно или ниже колен (полный присед)\n• Распространённая ошибка: подъём пяток = нужна растяжка голеностопа.';
  }
  if(tl.includes('жим')||tl.includes('грудь')||lastTopic==='bench') {
    return '**Жим лёжа — ключевые моменты:**\n• Лопатки сведены и прижаты к скамье — создаёт дугу\n• Хват: пальцы обхватывают гриф (не открытый хват!)\n• Опускай штангу на нижнюю часть груди, локти 45–75°\n• Пауза 1 сек в нижней точке убирает отбив\n• Прогрессия: +2.5кг раз в 1–2 нед.';
  }
  if(tl.includes('становая')||lastTopic==='deadlift') {
    return '**Становая тяга — безопасная техника:**\n• Гриф касается голени, над серединой стопы\n• Спина нейтральная — не округляй поясницу!\n• Поднимай бёдра и плечи одновременно\n• Подбородок нейтрально, взгляд на пол в 1–2м\n• Обувь с плоской подошвой или штангетки\n• Начни с 50–60% 1ПМ, отработай технику прежде чем добавлять вес.';
  }
  if(tl.includes('добавк')||tl.includes('креатин')||tl.includes('bcaa')||lastTopic==='supplements') {
    return '**Добавки с доказанной базой (ISSN):**\n• **Креатин** 3–5г/день — +5-15% силы, безопасен долгосрочно\n• **Кофеин** 3–6мг/кг за 30-60 мин — сила, выносливость\n• **Бета-аланин** 3.2г — помогает при 12–16 повт\n• **Витамин D3** 2000–4000МЕ — нужен большинству\n• BCAA бесполезны при достаточном белке из пищи.';
  }
  if(tl.includes('вод')||tl.includes('гидрат')||lastTopic==='water') {
    return '**Гидратация:**\n• Норма: 30–35мл/кг веса тела в покое\n• +500–750мл на каждый час тренировки\n• Признаки дегидратации: тёмная моча, усталость, снижение силы\n• Электролиты важны при тренировках >60 мин\n• Пей равномерно в течение дня, а не залпом.';
  }
  if(tl.includes('разминк')||tl.includes('растяжк')||lastTopic==='warmup') {
    return '**Разминка (10-15 мин):**\n• 5 мин общая (велосипед, прыжки)\n• Динамическая растяжка: вращения бёдрами, выпады с поворотом\n• Специфические разминочные сеты: 40-50-70-80% от рабочего веса\n**После тренировки:**\n• Статическая растяжка 20-30 сек/позиция снижает DOMS\n• Пенный ролик для миофасциального релиза.';
  }
  if(tl.includes('плато')||tl.includes('перетрен')||lastTopic==='plateau') {
    return '**Сломать плато:**\n• Деload-неделя: снизь объём на 40%, сохрани интенсивность\n• Смени сплит на 4–6 недель\n• Добавь вариативность: меняй темп, диапазон повт, угол\n• Проверь сон, стресс и калорийность — часто проблема там\n• Дроп-сеты и суперсеты дают новый стимул.';
  }
  if(tl.includes('мотивац')||tl.includes('лень')||tl.includes('не хочу')) {
    return '**Мотивация vs Дисциплина:**\nМотивация — эмоция, она приходит и уходит. Дисциплина — система.\n• Запланируй тренировки как встречи — не отменяй\n• Снизь барьер входа: "просто дойди до зала"\n• Отслеживай прогресс визуально — видеть рост важно\n• Найди партнёра по тренировкам\n• 21 день последовательности = новая привычка.';
  }
  if(tl.includes('перед тренир')||tl.includes('после тренир')||tl.includes('питание тренир')) {
    return '**Питание вокруг тренировки:**\n• **За 1.5–2ч до:** 40-60г углеводов + 20-30г белка (рис/овёс + куриная грудка)\n• **За 30 мин:** банан + кофе для пампа\n• **После (30–60 мин):** 30–40г быстрого белка + 60–80г углеводов\n• Не тренируйся натощак при силовой работе — потеряешь в производительности до 20%.';
  }

  return 'Интересный вопрос! Для точного ответа мне нужен Groq API-ключ 🔑\nПолучи бесплатно на console.groq.com (доступ по Google-аккаунту) — это займёт 2 минуты. Без ключа я могу ответить по основным темам: тренировки, питание, восстановление, техника упражнений, добавки, сон.';
}

// ── рендер сообщений ─────────────────────────────────────────
function appendMsg(role, text) {
  var msgs = document.getElementById('ai-chat-msgs');
  if(!msgs) return;
  var w = document.createElement('div');
  w.style.cssText = 'display:flex;' + (role==='user'?'justify-content:flex-end':'');
  var b = document.createElement('div');
  b.className = 'ai-bubble ai-bubble-'+role;
  var formatted = escapeHtml(text)
    .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
    .replace(/^• /gm,'&bull; ')
    .replace(/\n/g,'<br>');
  b.innerHTML = formatted;
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

// ── Groq API ─────────────────────────────────────────────────
async function callGroq(key, sys, msgs, max) {
  var r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type':'application/json', 'Authorization':'Bearer '+key },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{role:'system', content:sys}].concat(msgs),
      max_tokens: max,
      temperature: 0.5
    }),
    signal: AbortSignal.timeout(35000)
  });
  if(!r.ok) throw new Error('Groq '+r.status);
  var d = await r.json();
  return d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content;
}

// ── офлайн-фолбэк генерации плана ───────────────────────────
function makeFallback(goal, level, days, dur) {
  var POOLS = {
    loss: {
      'Full body': [
        [{name:'Приседания со штангой',sets:3,reps:'15',rest:45,rpe:7,notes:'Темп 2-0-1, короткий отдых'},{name:'Жим гантелей лёжа',sets:3,reps:'15',rest:45,rpe:7,notes:''},{name:'Тяга в наклоне',sets:3,reps:'15',rest:45,rpe:7,notes:''},{name:'Армейский жим',sets:3,reps:'15',rest:45,rpe:7,notes:''},{name:'Планка',sets:3,reps:'45сек',rest:30,rpe:6,notes:''}],
        [{name:'Выпады с гантелями',sets:3,reps:'12',rest:45,rpe:7,notes:''},{name:'Отжимания',sets:3,reps:'15',rest:45,rpe:7,notes:''},{name:'Тяга верхнего блока',sets:3,reps:'15',rest:45,rpe:7,notes:''},{name:'Боковые подъёмы',sets:3,reps:'15',rest:45,rpe:6,notes:''},{name:'Скручивания',sets:3,reps:'20',rest:30,rpe:6,notes:''}],
        [{name:'Жим ногами',sets:3,reps:'20',rest:45,rpe:7,notes:''},{name:'Сведение в кроссовере',sets:3,reps:'15',rest:45,rpe:7,notes:''},{name:'Тяга горизонтального блока',sets:3,reps:'15',rest:45,rpe:7,notes:''},{name:'Подъём на носки',sets:3,reps:'25',rest:30,rpe:6,notes:''},{name:'Велосипед',sets:3,reps:'30',rest:30,rpe:7,notes:''}]
      ]
    },
    gain: {
      'Push': [
        [{name:'Жим штанги лёжа',sets:4,reps:'8',rest:90,kg:80,rpe:8,notes:'Темп 3-1-2'},{name:'Жим гантелей наклон',sets:3,reps:'10',rest:75,kg:30,rpe:8,notes:''},{name:'Армейский жим стоя',sets:4,reps:'8',rest:90,kg:60,rpe:8,notes:''},{name:'Разводка гантелей',sets:3,reps:'12',rest:60,kg:20,rpe:7,notes:''},{name:'Трицепс на блоке',sets:3,reps:'12',rest:60,kg:25,rpe:7,notes:''}],
        [{name:'Жим на наклонной скамье',sets:4,reps:'8',rest:90,kg:70,rpe:8,notes:''},{name:'Брусья',sets:3,reps:'10',rest:75,rpe:8,notes:''},{name:'Жим Арнольда',sets:3,reps:'12',rest:60,kg:25,rpe:8,notes:''},{name:'Французский жим',sets:3,reps:'12',rest:60,kg:30,rpe:7,notes:''},{name:'Кроссовер низкий',sets:3,reps:'15',rest:60,rpe:7,notes:''}]
      ],
      'Pull': [
        [{name:'Становая тяга',sets:4,reps:'5',rest:120,kg:100,rpe:8,notes:'Нейтральная спина!'},{name:'Подтягивания',sets:4,reps:'8',rest:90,rpe:8,notes:''},{name:'Тяга штанги в наклоне',sets:3,reps:'10',rest:75,kg:70,rpe:8,notes:''},{name:'Молоток',sets:3,reps:'12',rest:60,kg:20,rpe:7,notes:''},{name:'Тяга к поясу в блоке',sets:3,reps:'12',rest:60,kg:50,rpe:7,notes:''}]
      ],
      'Legs': [
        [{name:'Приседания со штангой',sets:4,reps:'8',rest:120,kg:90,rpe:8,notes:'Полная амплитуда'},{name:'Жим ногами',sets:3,reps:'12',rest:90,kg:150,rpe:8,notes:''},{name:'Румынская тяга',sets:3,reps:'10',rest:90,kg:80,rpe:8,notes:''},{name:'Разгибание ног',sets:3,reps:'15',rest:60,kg:40,rpe:7,notes:''},{name:'Подъём на носки стоя',sets:4,reps:'20',rest:45,kg:60,rpe:7,notes:''}]
      ],
      'Full body': [
        [{name:'Приседания со штангой',sets:4,reps:'8',rest:90,kg:80,rpe:8,notes:''},{name:'Жим лёжа',sets:4,reps:'8',rest:90,kg:80,rpe:8,notes:''},{name:'Тяга штанги в наклоне',sets:4,reps:'8',rest:90,kg:70,rpe:8,notes:''},{name:'Армейский жим',sets:3,reps:'10',rest:75,kg:55,rpe:8,notes:''},{name:'Подтягивания',sets:3,reps:'8',rest:75,rpe:8,notes:''}]
      ]
    },
    tone: {
      'Full body': [
        [{name:'Приседания с гантелями',sets:3,reps:'12',rest:60,kg:20,rpe:7,notes:''},{name:'Жим гантелей лёжа',sets:3,reps:'12',rest:60,kg:25,rpe:7,notes:''},{name:'Тяга гантели в наклоне',sets:3,reps:'12',rest:60,kg:25,rpe:7,notes:''},{name:'Выпады',sets:3,reps:'12',rest:60,rpe:7,notes:''},{name:'Подъём гантелей на бицепс',sets:3,reps:'12',rest:60,kg:15,rpe:7,notes:''}],
        [{name:'Болгарские сплит-приседания',sets:3,reps:'10',rest:60,kg:15,rpe:8,notes:''},{name:'Жим гантелей на наклонной',sets:3,reps:'12',rest:60,kg:22,rpe:7,notes:''},{name:'Тяга верхнего блока',sets:3,reps:'12',rest:60,kg:45,rpe:7,notes:''},{name:'Боковые подъёмы',sets:3,reps:'15',rest:45,kg:8,rpe:7,notes:''},{name:'Планка',sets:3,reps:'45сек',rest:30,rpe:6,notes:''}]
      ]
    }
  };

  var SPLITS = {2:['Full body','Full body'],3:['Full body','Full body','Full body'],4:['Push','Pull','Legs','Full body'],5:['Push','Pull','Legs','Full body','Full body'],6:['Push','Pull','Legs','Push','Pull','Legs']};
  var SMART = {2:[true,false,false,true,false,false,false],3:[true,false,true,false,true,false,false],4:[true,true,false,true,true,false,false],5:[true,true,false,true,true,true,false],6:[true,true,true,false,true,true,true]};
  var schedule = SMART[Math.min(6,Math.max(2,days))] || SMART[3];
  var splits = SPLITS[Math.min(6,Math.max(2,days))] || SPLITS[3];
  var DAYNAMES = ['Вс','Пн','Вт','Ср','Чт','Пт','Сб'];
  var themes = ['Базовая техника','Наращивание объёма','Пиковая интенсивность','Деload — восстановление'];
  var kcalMap = {loss:300, gain:420, tone:330};
  var pool = POOLS[goal] || POOLS['tone'];
  var weeks = [];

  for(var w=0; w<4; w++) {
    var dl = [];
    var trainIdx = 0;
    var isDeload = w === 3;
    for(var d=0; d<7; d++) {
      if(schedule[d]) {
        var splitName = splits[trainIdx % splits.length];
        var splitPool = pool[splitName] || pool['Full body'] || Object.values(pool)[0];
        var variant = splitPool[Math.min(w, splitPool.length-1)];
        var exs = variant.map(function(ex) {
          return Object.assign({}, ex,
            isDeload ? {sets: Math.max(2, Math.floor(ex.sets * 0.6)), rpe: Math.max(5, (ex.rpe||7)-1), notes: ex.notes + ' [Деload]'} : {}
          );
        });
        dl.push({dayNumber:d+1, name:DAYNAMES[d]+' '+splitName, type:'тренировка', duration:isDeload?Math.round(dur*0.75):dur, caloriesBurned:isDeload?Math.round((kcalMap[goal]||320)*(w*0.15+1)*0.6):(kcalMap[goal]||320)*(w*0.15+1)|0, exercises:exs});
        trainIdx++;
      } else {
        dl.push({dayNumber:d+1, name:DAYNAMES[d]+' Отдых', type:'отдых', duration:0, caloriesBurned:0, exercises:[]});
      }
    }
    weeks.push({weekNumber:w+1, theme:themes[w], progressionNote: isDeload?'Снижение объёма на 40% для суперкомпенсации':'Добавляй +2.5кг или +1-2 повт к рабочим весам', days:dl});
  }

  return {title:'4-нед. план: '+goal+' ('+level+')', goal:goal, weeks:weeks,
    nutrition:{dailyCalories:goal==='gain'?2800:goal==='loss'?1800:2200,protein:goal==='gain'?160:140,carbs:goal==='gain'?320:180,fat:65,tip:'Ешь каждые 3-4ч, приоритет цельным продуктам'}};
}

// ── рендер плана ─────────────────────────────────────────────
function renderPlan(plan) {
  var container = document.getElementById('ai-plan-result');
  if(!container) return;
  var html = '<div style="display:flex;flex-direction:column;gap:12px">';
  html += '<div style="font-size:1.1rem;font-weight:800;color:var(--accent,#a78bfa);margin-bottom:4px">' + escapeHtml(plan.title||'') + '</div>';

  if(plan.nutrition) {
    html += '<div style="background:rgba(255,255,255,0.05);border-radius:14px;padding:12px">';
    html += '<div style="font-weight:700;margin-bottom:8px">🥗 Питание</div>';
    html += '<div style="font-size:0.85rem">' + plan.nutrition.dailyCalories + ' ккал &nbsp;|&nbsp; Б:' + plan.nutrition.protein + 'г &nbsp;У:' + plan.nutrition.carbs + 'г &nbsp;Ж:' + plan.nutrition.fat + 'г</div>';
    if(plan.nutrition.tip) html += '<div style="font-size:0.78rem;color:var(--text-light,#aaa);margin-top:6px">💡 ' + escapeHtml(plan.nutrition.tip) + '</div>';
    html += '</div>';
  }

  for(var w=0; w<plan.weeks.length; w++) {
    var week = plan.weeks[w];
    var isDeload = week.theme && week.theme.toLowerCase().includes('деload');
    html += '<div class="ai-week-card" style="' + (isDeload?'border-color:rgba(251,191,36,0.3)':'')+'">';
    html += '<div class="ai-week-title">Неделя ' + week.weekNumber + (week.theme?' — '+escapeHtml(week.theme):'') + '</div>';
    if(week.progressionNote) html += '<div style="font-size:0.73rem;color:'+(isDeload?'#fbbf24':'var(--accent,#a78bfa)')+';margin-bottom:8px">📈 '+escapeHtml(week.progressionNote)+'</div>';

    for(var d=0; d<week.days.length; d++) {
      var day = week.days[d];
      var isRest = !day.exercises || !day.exercises.length || day.type && day.type.includes('отдых');
      html += '<div class="ai-day-card">';
      html += '<div class="ai-day-header">';
      html += '<span>' + escapeHtml(day.name||'') + '</span>';
      html += '<span style="font-size:0.7rem;color:var(--text-light,#aaa)">' + (day.duration?day.duration+'мин':'') + (day.caloriesBurned?' · ~'+day.caloriesBurned+'ккал':'') + '</span>';
      html += '</div>';

      if(!isRest && day.exercises && day.exercises.length) {
        html += '<div style="margin-top:6px">';
        for(var e=0; e<day.exercises.length; e++) {
          var ex = day.exercises[e];
          var rpeColor = ex.rpe >= 9 ? '#ef4444' : ex.rpe >= 7 ? '#f59e0b' : '#22c55e';
          html += '<div class="ai-ex-row">';
          html += '<div class="ai-ex-main">';
          html += '<span style="font-weight:600">' + (e+1) + '. ' + escapeHtml(ex.name||'') + '</span>';
          html += '<span style="color:var(--text-light,#aaa)">' + ex.sets + '×' + ex.reps;
          if(ex.kg) html += ' · ' + ex.kg + 'кг';
          if(ex.rest) html += ' · ' + ex.rest + 'с';
          if(ex.rpe) html += ' <span style="font-size:0.7rem;background:'+rpeColor+'22;color:'+rpeColor+';border-radius:4px;padding:1px 4px">RPE '+ex.rpe+'</span>';
          html += '</span></div>';
          if(ex.tempo) html += '<div style="font-size:0.7rem;color:rgba(255,255,255,0.35)">⏱ темп '+escapeHtml(ex.tempo)+'</div>';
          if(ex.notes) html += '<div class="ai-ex-note">' + escapeHtml(ex.notes) + '</div>';
          html += '</div>';
        }
        html += '</div>';
      } else {
        html += '<div style="font-size:0.78rem;color:var(--text-light,#aaa);padding:6px 0">🛌 День отдыха — активное восстановление, прогулка</div>';
      }
      html += '</div>';
    }
    html += '</div>';
  }
  html += '</div>';
  container.innerHTML = html;
}

// ── очистка чата ─────────────────────────────────────────────
window.clearChatHistory = function() {
  aiChatHistory = [];
  try { localStorage.removeItem('fs-ai-chat-history'); } catch(e) {}
  var msgs = document.getElementById('ai-chat-msgs');
  if(msgs) msgs.innerHTML = '';
  appendMsg('ai', '💬 История очищена. Можем начать заново — о чём поговорим?');
};

// ── инициализация ─────────────────────────────────────────────
restoreChatHistory();