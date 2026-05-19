// ==================== ИИ-ТРЕНЕР (без API-ключа) ====================
// Использует Google Gemini (бесплатный ключ) + локальный алгоритм как fallback
// Gemini Free Tier: 15 req/min, 1500 req/day — бесплатно

const AI_GEMINI_KEY_LS = 'fs-openrouter-key';
const AI_CHAT_LS = 'fs-ai-chat';
const AI_PLAN_LS = 'fs-ai-plan';
let aiChatHistory = [];
let aiCurrentPlan = null;
let aiCurrentTab = 'chat';

// ==================== УТИЛИТЫ ====================
function aiGetKey() { return localStorage.getItem(AI_GEMINI_KEY_LS) || ''; }
function aiSaveKey(k) { localStorage.setItem(AI_GEMINI_KEY_LS, k.trim()); }
function aiSaveChat() { try { localStorage.setItem(AI_CHAT_LS, JSON.stringify(aiChatHistory.slice(-40))); } catch(e){} }
function aiLoadChat() { try { aiChatHistory = JSON.parse(localStorage.getItem(AI_CHAT_LS) || '[]'); } catch(e){ aiChatHistory = []; } }
function aiSavePlan(p) { try { localStorage.setItem(AI_PLAN_LS, JSON.stringify(p)); } catch(e){} }
function aiLoadPlan() { try { return JSON.parse(localStorage.getItem(AI_PLAN_LS) || 'null'); } catch(e){ return null; } }

function aiGetProfile() {
  try { return JSON.parse(localStorage.getItem('fs-profile') || 'null'); } catch(e){ return null; }
}

// ==================== GEMINI API ====================
// ==================== OPENROUTER API ====================
// Бесплатно: openrouter.ai — регистрация по email, работает из России
// Бесплатные модели: meta-llama/llama-4-scout, deepseek/deepseek-r1, mistralai/mistral-7b-instruct

const AI_FREE_MODELS = [
  'meta-llama/llama-4-scout:free',
  'deepseek/deepseek-r1:free',
  'mistralai/mistral-7b-instruct:free',
  'google/gemma-3-12b-it:free'
];
let aiCurrentModelIdx = 0;

const AI_SYSTEM_PROMPT = `Ты опытный персональный фитнес-тренер и нутрициолог. Общаешься ТОЛЬКО на русском языке, обращаешься к пользователю на "ты". Отвечаешь только на вопросы о тренировках, питании, восстановлении, здоровье и фитнесе. На другие темы мягко отказываешь одним предложением. Ответы практичные и конкретные, без воды.`;

async function geminiChat(messages, isJson = false) {
  const key = aiGetKey();
  if (!key) throw new Error('NO_KEY');

  const model = AI_FREE_MODELS[aiCurrentModelIdx % AI_FREE_MODELS.length];

  const body = {
    model,
    messages: [
      { role: 'system', content: AI_SYSTEM_PROMPT + (isJson ? ' Всегда отвечай валидным JSON без markdown.' : '') },
      ...messages.map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content }))
    ],
    temperature: 0.7,
    max_tokens: isJson ? 4096 : 1024
  };

  const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`,
      'HTTP-Referer': 'https://fitsim.app',
      'X-Title': 'FitSim AI Coach'
    },
    body: JSON.stringify(body)
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    if (resp.status === 401) throw new Error('BAD_KEY');
    if (resp.status === 429) throw new Error('RATE_LIMIT');
    if (resp.status === 402) throw new Error('NO_CREDITS');
    // Try next model on error
    aiCurrentModelIdx++;
    throw new Error(err?.error?.message || 'API_ERROR');
  }

  const data = await resp.json();
  const text = data?.choices?.[0]?.message?.content || '';
  if (!text) throw new Error('EMPTY_RESPONSE');
  return text;
}

// ==================== ГЕНЕРАТОР ПЛАНА (локальный алгоритм) ====================
const AI_EXERCISE_DB = {
  chest:    ['Отжимания', 'Жим гантелей лёжа', 'Разводка гантелей', 'Отжимания на брусьях', 'Жим гантелей под углом', 'Кроссовер с гантелями'],
  back:     ['Подтягивания', 'Тяга гантели в наклоне', 'Тяга блока к поясу', 'Гиперэкстензия', 'Тяга гантелей к поясу', 'Обратные разведения'],
  legs:     ['Приседания', 'Выпады', 'Приседания с гантелями', 'Румынская тяга', 'Сгибания ног лёжа', 'Подъёмы на носки', 'Болгарские сплит-приседания'],
  shoulders:['Жим гантелей стоя', 'Махи гантелями в стороны', 'Тяга гантелей к подбородку', 'Задние дельты (разведения)', 'Жим Арнольда'],
  arms:     ['Сгибания на бицепс', 'Молотковые сгибания', 'Французский жим', 'Разгибания на трицепс', 'Отжимания узким хватом', 'Сгибания с супинацией'],
  core:     ['Планка', 'Скручивания', 'Подъёмы ног', 'Велосипед', 'Боковая планка', 'Русский твист', 'Гиперэкстензия'],
  cardio:   ['Бёрпи', 'Прыжки на месте', 'Бег на месте', 'Скакалка (имитация)', 'Джампинг-джеки', 'Горная лыжница', 'Высокое поднимание колен']
};

const AI_SPLIT_TEMPLATES = {
  2: [['chest','back','core'], ['legs','shoulders','arms']],
  3: [['chest','triceps_in_arms','core'], ['back','biceps_in_arms'], ['legs','shoulders']],
  4: [['chest','shoulders'], ['back','core'], ['legs'], ['arms','cardio']],
  5: [['chest'], ['back'], ['legs'], ['shoulders','arms'], ['core','cardio']],
  6: [['chest'], ['back'], ['legs'], ['shoulders'], ['arms','core'], ['cardio','core']]
};

const AI_WEEK_THEMES = [
  ['Адаптация', 'Строим базу и учим технику'],
  ['Прогресс', 'Повышаем интенсивность'],
  ['Пиковая нагрузка', 'Максимальная интенсивность'],
  ['Закрепление', 'Закрепляем результат, снижаем объём']
];

function aiGetSetsReps(goal, level, weekNum) {
  const base = {
    loss:     { sets: 3, reps: '15-20', rest: '30 сек' },
    maintain: { sets: 3, reps: '12-15', rest: '45 сек' },
    gain:     { sets: 4, reps: '8-12',  rest: '60 сек' }
  };
  const levelMult = { novice: 0.8, medium: 1.0, advanced: 1.2 }[level] || 1.0;
  const b = base[goal] || base.maintain;
  let sets = Math.round(b.sets * levelMult);
  if (weekNum >= 3) sets = Math.min(sets + 1, 5);
  return { sets, reps: b.reps, rest: b.rest };
}

function aiPickExercises(muscleGroups, equipment, count = 5) {
  const pool = [];
  const groups = muscleGroups.flat();
  for (const g of groups) {
    const key = g.replace('triceps_in_arms','arms').replace('biceps_in_arms','arms');
    const exs = AI_EXERCISE_DB[key] || AI_EXERCISE_DB.core;
    pool.push(...exs);
  }
  // Equipment filter
  const noGym = !equipment.includes('зал') && !equipment.includes('штанга');
  let filtered = pool;
  if (noGym) filtered = pool.filter(e => !e.includes('штанга') && !e.includes('блок'));
  if (!equipment.includes('гантели') && !equipment.includes('зал')) {
    filtered = pool.filter(e => !e.includes('гантел'));
  }
  if (!filtered.length) filtered = pool;
  // Deduplicate and shuffle
  const unique = [...new Set(filtered)];
  const shuffled = unique.sort(() => Math.random() - .5);
  return shuffled.slice(0, count);
}

function aiGenerateLocalPlan(params) {
  const { goal, level, daysPerWeek, equipment, durationMinutes } = params;
  const profile = aiGetProfile();
  const goalNames = { loss: 'Похудение', maintain: 'Тонус', gain: 'Набор массы' };
  const exPerDay = durationMinutes >= 60 ? 6 : durationMinutes >= 45 ? 5 : 4;

  const splitTemplate = AI_SPLIT_TEMPLATES[Math.min(Math.max(daysPerWeek, 2), 6)] || AI_SPLIT_TEMPLATES[3];
  const dayNames = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];

  const weeks = [];
  for (let w = 1; w <= 4; w++) {
    const [themeName, themeDesc] = AI_WEEK_THEMES[w - 1];
    const days = [];
    let dayIdx = 0;
    for (let d = 0; d < 7; d++) {
      const isWorkout = dayIdx < daysPerWeek && d < 7;
      // Distribute workout days evenly
      const workoutDayIndices = distributeWorkoutDays(daysPerWeek);
      if (!workoutDayIndices.includes(d)) {
        days.push({ dayNumber: d+1, name: dayNames[d], type: 'отдых', duration: 0, caloriesBurned: 0 });
        continue;
      }
      const splitIdx = dayIdx % splitTemplate.length;
      const muscleGroups = splitTemplate[splitIdx];
      const sr = aiGetSetsReps(goal, level, w);
      const exercises = aiPickExercises([muscleGroups], equipment.split(',').map(s=>s.trim()), exPerDay).map(name => ({
        name,
        sets: sr.sets,
        reps: sr.reps,
        rest: sr.rest,
        notes: w === 1 ? 'Следи за техникой' : w === 3 ? 'Максимальная интенсивность' : ''
      }));
      const cals = Math.round(durationMinutes * (goal === 'loss' ? 8 : 6));
      days.push({
        dayNumber: d+1,
        name: dayNames[d],
        type: 'тренировка',
        muscleGroups: muscleGroups.join(', '),
        duration: durationMinutes,
        caloriesBurned: cals,
        exercises
      });
      dayIdx++;
    }
    weeks.push({ weekNumber: w, theme: `${themeName} — ${themeDesc}`, days });
  }

  const nutritionTip = {
    loss: 'Дефицит 300–500 ккал/день. Белок 2 г/кг. Много овощей и воды.',
    maintain: 'Поддерживай TDEE. Белок 1.5–2 г/кг. Углеводы до и после тренировки.',
    gain: 'Профицит 200–400 ккал/день. Белок 2–2.5 г/кг. Углеводы — главный источник энергии.'
  }[goal] || '';

  return {
    title: `${goalNames[goal] || 'Фитнес-план'} — 4 недели`,
    description: `Программа на ${daysPerWeek} дней/неделю, ${durationMinutes} мин, уровень: ${level}`,
    nutritionTip,
    source: 'local',
    weeks
  };
}

function distributeWorkoutDays(n) {
  // Spread n workout days across 7
  if (n >= 7) return [0,1,2,3,4,5,6];
  const slots = [0,1,2,3,4,5,6];
  const step = 7 / n;
  const result = [];
  for (let i = 0; i < n; i++) result.push(Math.round(i * step));
  return result;
}

// ==================== GEMINI ПЛАН ====================
async function aiGenerateAIPlan(params) {
  const { goal, level, daysPerWeek, equipment, durationMinutes, restrictions } = params;
  const goalRu = { loss: 'похудение', maintain: 'тонус и поддержание формы', gain: 'набор мышечной массы' }[goal] || goal;
  const prompt = `Составь 4-недельный план тренировок. Верни ТОЛЬКО валидный JSON без markdown.

Параметры:
- Цель: ${goalRu}
- Уровень: ${level}
- Дней в неделю: ${daysPerWeek}
- Оборудование: ${equipment}
- Длительность тренировки: ${durationMinutes} минут
- Ограничения: ${restrictions || 'нет'}

JSON структура:
{
  "title": "Название плана",
  "description": "Краткое описание",
  "nutritionTip": "Рекомендация по питанию",
  "weeks": [
    {
      "weekNumber": 1,
      "theme": "Тема недели",
      "days": [
        {
          "dayNumber": 1,
          "name": "Пн",
          "type": "тренировка",
          "duration": ${durationMinutes},
          "caloriesBurned": 300,
          "exercises": [
            { "name": "Название", "sets": 3, "reps": "12", "rest": "60 сек", "notes": "подсказка" }
          ]
        },
        { "dayNumber": 2, "name": "Вт", "type": "отдых", "duration": 0, "caloriesBurned": 0 }
      ]
    }
  ]
}`;

  const text = await geminiChat([{ role: 'user', content: prompt }], true);
  // Strip markdown if any
  const clean = text.replace(/```json/g,'').replace(/```/g,'').trim();
  const plan = JSON.parse(clean);
  plan.source = 'openrouter';
  return plan;
}

// ==================== РЕНДЕР СТРАНИЦЫ ====================
function renderAICoach() {
  const el = document.getElementById('page-aicoach');
  if (!el) return;
  aiLoadChat();
  aiCurrentPlan = aiLoadPlan();

  el.innerHTML = `
    <div class="ai-page" id="ai-coach-root">
      <div class="ai-header">
        <div class="ai-header-icon">✨</div>
        <div>
          <div class="ai-header-title">ИИ-тренер <span class="ai-gemini-badge">OpenRouter</span></div>
          <div class="ai-header-sub">Бесплатный ИИ · Llama 4, DeepSeek, Mistral</div>
        </div>
      </div>

      <!-- Ключ Gemini -->
      <div class="ai-key-section">
        <div style="font-size:13px;color:var(--text-muted);margin-bottom:4px">🔑 OpenRouter API ключ (бесплатно на <a href="https://openrouter.ai/keys" target="_blank" style="color:var(--accent);text-decoration:none">openrouter.ai/keys</a>)</div>
        <div class="ai-key-input-wrap">
          <input type="password" id="ai-gemini-key-input" class="ai-key-input" placeholder="sk-or-v1-..." value="${aiGetKey()}" autocomplete="off" />
          <button class="ai-key-save-btn" onclick="aiSaveKeyUI()">Сохранить</button>
        </div>
        <div id="ai-key-status-line" class="ai-key-status ${aiGetKey() ? 'ok' : 'no'}">
          ${aiGetKey() ? '✓ Ключ задан — чат и генерация плана активны' : 'Без ключа доступна только локальная генерация плана'}
        </div>
        <div style="margin-top:8px;font-size:12px;color:var(--text-muted)">
          Модели (бесплатно): 
          <span style="color:var(--accent)">Llama 4 Scout</span> · 
          <span style="color:var(--text-muted)">DeepSeek R1</span> · 
          <span style="color:var(--text-muted)">Mistral 7B</span> · 
          <span style="color:var(--text-muted)">Gemma 3 12B</span>
        </div>
      </div>

      <!-- Табы -->
      <div class="ai-tabs">
        <button class="ai-tab ${aiCurrentTab==='chat'?'active':''}" onclick="aiSwitchTab('chat')">💬 Чат</button>
        <button class="ai-tab ${aiCurrentTab==='plan'?'active':''}" onclick="aiSwitchTab('plan')">📋 Составить план</button>
        ${aiCurrentPlan ? `<button class="ai-tab ${aiCurrentTab==='result'?'active':''}" onclick="aiSwitchTab('result')">🏆 Мой план</button>` : ''}
      </div>

      <div id="ai-tab-content"></div>
    </div>`;

  aiRenderTab(aiCurrentTab);
}

function aiSwitchTab(tab) {
  aiCurrentTab = tab;
  document.querySelectorAll('.ai-tab').forEach(b => b.classList.remove('active'));
  const tabs = document.querySelectorAll('.ai-tab');
  const names = ['chat','plan','result'];
  tabs.forEach((b,i) => { if (names[i] === tab) b.classList.add('active'); });
  aiRenderTab(tab);
}

function aiRenderTab(tab) {
  const el = document.getElementById('ai-tab-content');
  if (!el) return;
  if (tab === 'chat') el.innerHTML = aiChatHTML();
  else if (tab === 'plan') el.innerHTML = aiPlanFormHTML();
  else if (tab === 'result') el.innerHTML = aiCurrentPlan ? aiPlanResultHTML(aiCurrentPlan) : '<div style="padding:20px;color:var(--text-muted);text-align:center">Нет сохранённого плана</div>';

  if (tab === 'chat') {
    aiRenderMessages();
    setTimeout(() => {
      const inp = document.getElementById('ai-chat-input');
      if (inp) inp.addEventListener('keydown', e => { if (e.key==='Enter'&&!e.shiftKey){e.preventDefault();aiSendMessage();} });
      aiScrollChat();
    }, 50);
  }
}

// ==================== ЧАТ ====================
function aiChatHTML() {
  return `<div class="ai-chat-wrap">
    <div class="ai-chat-messages" id="ai-chat-msgs">
      ${aiChatHistory.length === 0 ? `
        <div class="ai-welcome">
          <div class="ai-welcome-icon">🤖</div>
          <div class="ai-welcome-title">Привет! Я твой ИИ-тренер</div>
          <div class="ai-welcome-sub">Спрашивай о тренировках, питании,<br>восстановлении и здоровье</div>
        </div>` : ''}
    </div>
    <div id="ai-error-line"></div>
    <div class="ai-quick-prompts">
      <button class="ai-chip" onclick="aiSendQuick('Дай совет на сегодняшнюю тренировку')">💪 Совет на тренировку</button>
      <button class="ai-chip" onclick="aiSendQuick('Как ускорить восстановление мышц?')">⚡ Восстановление</button>
      <button class="ai-chip" onclick="aiSendQuick('Что лучше съесть до тренировки?')">🥗 До тренировки</button>
      <button class="ai-chip" onclick="aiSendQuick('Что съесть после тренировки?')">🍗 После тренировки</button>
      <button class="ai-chip" onclick="aiSendQuick('Как правильно делать приседания?')">🦵 Техника приседаний</button>
      <button class="ai-chip" onclick="aiSendQuick('Сколько воды пить в день при тренировках?')">💧 Гидратация</button>
    </div>
    <div class="ai-input-row">
      <textarea id="ai-chat-input" class="ai-input" placeholder="Напиши вопрос..." rows="1"></textarea>
      <button class="ai-send-btn" onclick="aiSendMessage()">➤</button>
    </div>
  </div>`;
}

function aiRenderMessages() {
  const el = document.getElementById('ai-chat-msgs');
  if (!el) return;
  if (aiChatHistory.length === 0) return;
  el.innerHTML = aiChatHistory.map(m => `
    <div class="ai-msg ${m.role==='user'?'ai-msg-user':''}">
      <div class="ai-msg-avatar">${m.role==='user'?'🧑':'🤖'}</div>
      <div class="ai-msg-bubble ${m.role==='user'?'user':'bot'}">${aiEscape(m.content)}</div>
    </div>`).join('');
  aiScrollChat();
}

function aiScrollChat() {
  const el = document.getElementById('ai-chat-msgs');
  if (el) el.scrollTop = el.scrollHeight;
}

function aiEscape(s) {
  return String(s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
    .replace(/\*(.+?)\*/g,'<em>$1</em>')
    .replace(/\n/g,'<br>');
}

function aiShowTyping() {
  const el = document.getElementById('ai-chat-msgs');
  if (!el) return;
  const div = document.createElement('div');
  div.className = 'ai-msg'; div.id = 'ai-typing-indicator';
  div.innerHTML = `<div class="ai-msg-avatar">🤖</div><div class="ai-msg-bubble bot"><div class="ai-typing-dots"><span></span><span></span><span></span></div></div>`;
  el.appendChild(div);
  aiScrollChat();
}

function aiHideTyping() { const el = document.getElementById('ai-typing-indicator'); if(el) el.remove(); }

function aiShowError(msg) {
  const el = document.getElementById('ai-error-line');
  if (el) el.innerHTML = `<div class="ai-error-msg">${aiEscape(msg)}</div>`;
  setTimeout(() => { if(el) el.innerHTML=''; }, 6000);
}

async function aiSendQuick(text) {
  const inp = document.getElementById('ai-chat-input');
  if (inp) inp.value = text;
  await aiSendMessage();
}

async function aiSendMessage() {
  const inp = document.getElementById('ai-chat-input');
  const text = (inp ? inp.value : '').trim();
  if (!text) return;
  if (inp) inp.value = '';

  const profile = aiGetProfile();
  let content = text;
  // Add profile context on first message
  if (aiChatHistory.length === 0 && profile) {
    content = `[Мои данные: вес ${profile.weight}кг, рост ${profile.height}см, цель: ${profile.goal}, возраст: ${profile.age}]\n\n${text}`;
  }

  aiChatHistory.push({ role: 'user', content });
  aiRenderMessages();
  aiSaveChat();

  const key = aiGetKey();
  if (!key) {
    aiChatHistory.push({ role: 'assistant', content: '🔑 Для чата нужен бесплатный API-ключ OpenRouter.

1. Зайди на openrouter.ai/keys
2. Зарегистрируйся через email
3. Создай ключ (Create Key)
4. Вставь сюда — и всё работает бесплатно! 🚀' });
    aiRenderMessages();
    aiSaveChat();
    return;
  }

  aiShowTyping();
  try {
    const reply = await geminiChat(aiChatHistory.map(m => ({ role: m.role, content: m.content })));
    aiHideTyping();
    aiChatHistory.push({ role: 'assistant', content: reply });
    aiRenderMessages();
    aiSaveChat();
  } catch(e) {
    aiHideTyping();
    const errMap = {
      'NO_KEY': '🔑 Добавь API-ключ в поле выше',
      'BAD_KEY': '❌ Неверный ключ. Проверь на openrouter.ai/keys',
      'RATE_LIMIT': '⏱ Превышен лимит запросов. Подожди минуту и попробуй снова.',
    };
    const msg = errMap[e.message] || `Ошибка: ${e.message}`;
    aiShowError(msg);
    aiChatHistory.pop();
    aiRenderMessages();
  }
}

// ==================== ФОРМА ПЛАНА ====================
const AI_PLAN_STATE = { goal: 'maintain', level: 'medium', days: 3, equipment: ['гантели'], duration: 45, restrictions: '' };

function aiPlanFormHTML() {
  const { goal, level, days, equipment, duration } = AI_PLAN_STATE;
  const goals = [['loss','🔥 Похудение'],['maintain','⚖️ Тонус'],['gain','💪 Набор массы']];
  const levels = [['novice','Новичок'],['medium','Средний'],['advanced','Продвинутый']];
  const equips = ['зал','гантели','турник','дом','штанга'];

  return `<div class="ai-plan-form">
    <div class="ai-form-section">
      <div class="ai-form-label">Цель</div>
      <div class="ai-chips-wrap">
        ${goals.map(([v,l]) => `<button class="ai-chip-sel ${goal===v?'active':''}" onclick="aiSetPlanParam('goal','${v}',this)">${l}</button>`).join('')}
      </div>
    </div>
    <div class="ai-form-section">
      <div class="ai-form-label">Уровень</div>
      <div class="ai-chips-wrap">
        ${levels.map(([v,l]) => `<button class="ai-chip-sel ${level===v?'active':''}" onclick="aiSetPlanParam('level','${v}',this)">${l}</button>`).join('')}
      </div>
    </div>
    <div class="ai-form-section">
      <div class="ai-form-label">Дней в неделю: <span class="ai-slider-val" id="ai-days-val">${days}</span></div>
      <input type="range" class="ai-slider" min="2" max="6" value="${days}" oninput="aiSetPlanParam('days',+this.value);document.getElementById('ai-days-val').textContent=this.value">
      <div class="ai-slider-labels"><span>2 дня</span><span>6 дней</span></div>
    </div>
    <div class="ai-form-section">
      <div class="ai-form-label">Оборудование</div>
      <div class="ai-chips-wrap">
        ${equips.map(eq => `<button class="ai-chip-sel ${equipment.includes(eq)?'active':''}" onclick="aiToggleEquipment('${eq}',this)">${eq}</button>`).join('')}
      </div>
    </div>
    <div class="ai-form-section">
      <div class="ai-form-label">Длительность: <span class="ai-slider-val" id="ai-dur-val">${duration}</span> мин</div>
      <input type="range" class="ai-slider" min="20" max="90" step="5" value="${duration}" oninput="aiSetPlanParam('duration',+this.value);document.getElementById('ai-dur-val').textContent=this.value">
      <div class="ai-slider-labels"><span>20 мин</span><span>90 мин</span></div>
    </div>
    <div class="ai-form-section">
      <div class="ai-form-label">Ограничения / пожелания</div>
      <textarea class="ai-restrictions" rows="2" placeholder="Например: больная спина, нет гантелей..." oninput="AI_PLAN_STATE.restrictions=this.value"></textarea>
    </div>
    <div id="ai-plan-error"></div>
    <button class="ai-generate-btn" id="ai-gen-btn" onclick="aiGeneratePlan()">
      <span id="ai-gen-icon">✨</span>
      <span id="ai-gen-label">${aiGetKey() ? 'Сгенерировать план с ИИ (OpenRouter)' : 'Составить план (локально)'}</span>
    </button>
    ${!aiGetKey() ? '<div style="text-align:center;font-size:12px;color:var(--text-muted);margin-top:8px">Без ключа план генерируется локально по алгоритму. Добавь ключ OpenRouter для плана от ИИ.</div>' : ''}
  </div>`;
}

function aiSetPlanParam(key, val, btn) {
  AI_PLAN_STATE[key] = val;
  if (btn) {
    const wrap = btn.closest('.ai-chips-wrap');
    if (wrap) wrap.querySelectorAll('.ai-chip-sel').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  }
}

function aiToggleEquipment(eq, btn) {
  const idx = AI_PLAN_STATE.equipment.indexOf(eq);
  if (idx >= 0) AI_PLAN_STATE.equipment.splice(idx,1);
  else AI_PLAN_STATE.equipment.push(eq);
  if (btn) btn.classList.toggle('active', AI_PLAN_STATE.equipment.includes(eq));
}

async function aiGeneratePlan() {
  const btn = document.getElementById('ai-gen-btn');
  const lbl = document.getElementById('ai-gen-label');
  const icon = document.getElementById('ai-gen-icon');
  if (btn) btn.disabled = true;
  if (icon) icon.innerHTML = '<div class="ai-spinner"></div>';
  if (lbl) lbl.textContent = 'Составляю план...';

  const params = {
    goal: AI_PLAN_STATE.goal,
    level: AI_PLAN_STATE.level,
    daysPerWeek: AI_PLAN_STATE.days,
    equipment: AI_PLAN_STATE.equipment.join(', ') || 'дом',
    durationMinutes: AI_PLAN_STATE.duration,
    restrictions: AI_PLAN_STATE.restrictions
  };

  try {
    let plan;
    if (aiGetKey()) {
      try {
        plan = await aiGenerateAIPlan(params);
      } catch(e) {
        // Fallback to local on API error
        if (e.message === 'BAD_KEY') throw e;
        plan = aiGenerateLocalPlan(params);
        plan.source = 'local_fallback';
      }
    } else {
      await new Promise(r => setTimeout(r, 600)); // simulate thinking
      plan = aiGenerateLocalPlan(params);
    }

    aiCurrentPlan = plan;
    aiSavePlan(plan);

    // Re-render page with result tab
    renderAICoach();
    aiSwitchTab('result');
  } catch(e) {
    const errEl = document.getElementById('ai-plan-error');
    const msgs = { 'BAD_KEY': '❌ Неверный ключ OpenRouter. Проверь на openrouter.ai/keys', 'RATE_LIMIT': '⏱ Лимит запросов. Попробуй через минуту.' };
    if (errEl) errEl.innerHTML = `<div class="ai-error-msg" style="margin:8px 0">${msgs[e.message]||'Ошибка: '+e.message}</div>`;
    if (btn) btn.disabled = false;
    if (icon) icon.textContent = '✨';
    if (lbl) lbl.textContent = 'Попробовать снова';
  }
}

// ==================== РЕЗУЛЬТАТ ПЛАНА ====================
function aiPlanResultHTML(plan) {
  const srcBadge = plan.source === 'openrouter'
    ? '<span class="ai-gemini-badge">OpenRouter AI</span>'
    : '<span style="font-size:10px;background:rgba(255,255,255,.1);padding:2px 8px;border-radius:20px;margin-left:6px;color:var(--text-muted)">Локальный алгоритм</span>';

  return `<div class="ai-plan-result">
    <div class="ai-plan-header">
      <div class="ai-plan-title">${aiEscapeText(plan.title)} ${srcBadge}</div>
      <div class="ai-plan-desc">${aiEscapeText(plan.description||'')}</div>
    </div>
    ${plan.nutritionTip ? `
    <div class="ai-nutrition-tip">
      <div class="ai-nutrition-tip-icon">🥗</div>
      <div style="font-size:13px;color:var(--text);line-height:1.5">${aiEscapeText(plan.nutritionTip)}</div>
    </div>` : ''}
    ${(plan.weeks||[]).map(week => `
      <div class="ai-week-block">
        <div class="ai-week-header">
          <span class="ai-week-badge">НЕДЕЛЯ ${week.weekNumber}</span>
          <span class="ai-week-theme">${aiEscapeText(week.theme||'')}</span>
        </div>
        <div class="ai-days-list">
          ${(week.days||[]).map(day => `
            <div class="ai-day-card ${day.type==='отдых'?'rest':''}" id="ai-day-${week.weekNumber}-${day.dayNumber}"
              ${day.type!=='отдых'?`onclick="aiToggleDay(${week.weekNumber},${day.dayNumber})"`:''}>
              <div class="ai-day-header">
                <div>
                  <div class="ai-day-name">${aiEscapeText(day.name)}</div>
                  ${day.type!=='отдых' ? `<div class="ai-day-meta">${day.duration} мин · ${day.caloriesBurned} ккал · ${(day.exercises||[]).length} упр.</div>` : '<div class="ai-day-meta">Отдых и восстановление</div>'}
                </div>
                <span class="ai-day-badge ${day.type==='отдых'?'rest':'workout'}">${day.type==='отдых'?'😴 Отдых':'💪 Тренировка'}</span>
              </div>
              <div class="ai-day-exercises" id="ai-day-ex-${week.weekNumber}-${day.dayNumber}" style="display:none">
                ${(day.exercises||[]).map(ex => `
                  <div class="ai-exercise-row">
                    <div class="ai-ex-name">${aiEscapeText(ex.name)}</div>
                    <div class="ai-ex-meta">${ex.sets}×${ex.reps} · отдых ${ex.rest}</div>
                    ${ex.notes ? `<div class="ai-ex-notes">💡 ${aiEscapeText(ex.notes)}</div>` : ''}
                  </div>`).join('')}
              </div>
            </div>`).join('')}
        </div>
      </div>`).join('')}

    <div class="ai-plan-actions">
      <button class="ai-action-btn primary" onclick="aiSavePlanAsProgram()">💾 Сохранить как программу тренировок</button>
      <button class="ai-action-btn secondary" onclick="aiSwitchTab('plan')">🔄 Пересоздать план</button>
      <button class="ai-action-btn danger" onclick="aiDeletePlan()">🗑 Удалить план</button>
    </div>
  </div>`;
}

function aiEscapeText(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

function aiToggleDay(w, d) {
  const card = document.getElementById(`ai-day-${w}-${d}`);
  const exBlock = document.getElementById(`ai-day-ex-${w}-${d}`);
  if (!exBlock) return;
  const open = exBlock.style.display !== 'none';
  exBlock.style.display = open ? 'none' : 'block';
  if (card) card.classList.toggle('open', !open);
}

function aiDeletePlan() {
  if (!confirm('Удалить текущий план?')) return;
  aiCurrentPlan = null;
  localStorage.removeItem(AI_PLAN_LS);
  renderAICoach();
  aiSwitchTab('plan');
}

function aiSavePlanAsProgram() {
  if (!aiCurrentPlan) return;
  // Build program structure compatible with existing workout system
  try {
    const days = aiCurrentPlan.weeks?.[0]?.days || [];
    const workoutDays = days.filter(d => d.type !== 'отдых');
    const program = {
      id: 'ai-' + Date.now(),
      name: aiCurrentPlan.title,
      source: 'ai',
      description: aiCurrentPlan.description || '',
      days: workoutDays.map((d, i) => ({
        day: i + 1,
        name: d.name,
        exercises: (d.exercises || []).map(ex => ({
          name: ex.name,
          sets: ex.sets,
          reps: ex.reps,
          rest: ex.rest,
          notes: ex.notes || ''
        }))
      }))
    };

    // Save to existing programs storage
    let programs = [];
    try { programs = JSON.parse(localStorage.getItem('fs-programs') || '[]'); } catch(e){}
    // Remove old AI plan if exists
    programs = programs.filter(p => !p.id.startsWith('ai-'));
    programs.unshift(program);
    localStorage.setItem('fs-programs', JSON.stringify(programs));

    // Show success toast
    aiShowToast('✅ План сохранён в разделе "Программы"!');
  } catch(e) {
    aiShowToast('❌ Ошибка при сохранении');
  }
}

function aiShowToast(msg) {
  const t = document.createElement('div');
  t.style.cssText = 'position:fixed;bottom:90px;left:50%;transform:translateX(-50%);background:#26F5A1;color:#000;padding:10px 20px;border-radius:12px;font-weight:700;font-size:14px;z-index:9999;white-space:nowrap';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

// ==================== API КЛЮЧ ====================
function aiSaveKeyUI() {
  const inp = document.getElementById('ai-gemini-key-input');
  const key = inp ? inp.value.trim() : '';
  if (!key) return;
  aiSaveKey(key);
  const status = document.getElementById('ai-key-status-line');
  if (status) {
    status.className = 'ai-key-status ok';
    status.textContent = '✓ Ключ сохранён — чат и генерация плана активны';
  }
  aiShowToast('🔑 Ключ OpenRouter сохранён!');
  // Update generate button label
  const lbl = document.getElementById('ai-gen-label');
  if (lbl) lbl.textContent = 'Сгенерировать план с ИИ (OpenRouter)';
}

// ==================== КАРТОЧКА НА ГЛАВНОЙ ====================
function aiInjectHomeCard() {
  // Called from renderHome if content is visible
  const existing = document.getElementById('ai-home-card-inject');
  if (existing) return;
  const waterCard = document.getElementById('home-water');
  if (!waterCard) return;
  const card = document.createElement('div');
  card.id = 'ai-home-card-inject';
  card.className = 'ai-home-card';
  card.onclick = () => goTo('aicoach', '✨ ИИ-тренер');
  card.innerHTML = `
    <div class="ai-home-card-icon">✨</div>
    <div>
      <div class="ai-home-card-title">ИИ-тренер <span class="ai-gemini-badge">OpenRouter</span></div>
      <div class="ai-home-card-sub">Персональный план и советы от ИИ · OpenRouter</div>
    </div>
    <div class="ai-home-card-arrow">→</div>`;
  waterCard.parentNode.insertBefore(card, waterCard);
}

window.renderAICoach = renderAICoach;
window.aiSwitchTab = aiSwitchTab;
window.aiSendMessage = aiSendMessage;
window.aiSendQuick = aiSendQuick;
window.aiGeneratePlan = aiGeneratePlan;
window.aiSetPlanParam = aiSetPlanParam;
window.aiToggleEquipment = aiToggleEquipment;
window.aiToggleDay = aiToggleDay;
window.aiDeletePlan = aiDeletePlan;
window.aiSavePlanAsProgram = aiSavePlanAsProgram;
window.aiSaveKeyUI = aiSaveKeyUI;
window.aiInjectHomeCard = aiInjectHomeCard;
