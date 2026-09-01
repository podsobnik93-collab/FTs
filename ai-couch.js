/**
 * ai-couch.js — улучшенный AI-тренер для FitSim v2.0
 * Улучшения:
 * - Streaming-like анимация текста (посимвольный вывод)
 * - Markdown-рендеринг (жирный, курсив, списки, заголовки)
 * - Умные быстрые ответы (контекстные чипы под каждым AI-сообщением)
 * - История диалога с поиском
 * - Реакции на сообщения (👍/👎)
 * - Улучшенный system prompt с полным контекстом пользователя
 * - Стриминг мышления (typing-индикатор с фазами: "Анализирую...", "Составляю план...")
 * - Голосовой ввод в чате
 * - Экспорт плана тренировки в дневник одной кнопкой
 * - Мод "Строгий тренер" / "Мягкий тренер" / "Наставник"
 * - Быстрые шаблоны запросов
 * - Индикатор токенов / лимита истории
 */

'use strict';

/* ══════════════════════════════════════════════════════════════
   CONSTANTS & STATE
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
var aiCoachPersonality = 'balanced'; // 'strict' | 'balanced' | 'mentor'
var aiStreamingEnabled = true;

var PERSONALITY_PROMPTS = {
  strict: 'Ты строгий, требовательный тренер. Не терпишь отговорок. Мотивируешь жёстко, но честно. Иногда немного подтруниваешь, чтобы встряхнуть пользователя.',
  balanced: 'Ты профессиональный фитнес-тренер с отличным чувством юмора. Мотивируешь, поддерживаешь, но говоришь прямо если видишь проблему.',
  mentor: 'Ты терпеливый наставник и нутрициолог. Объясняешь науку, даёшь развёрнутые ответы, радуешься каждому прогрессу пользователя.'
};

var QUICK_REPLY_SETS = {
  greeting: ['Составь план на неделю', 'Что поесть перед тренировкой?', 'Как ускорить прогресс?'],
  workout:  ['Добавить в дневник', 'Сделай легче', 'Объясни технику', 'Альтернативные упражнения'],
  nutrition:['Рассчитай макросы', 'Что лучше до/после тренировки?', 'Список продуктов на неделю'],
  progress: ['Что не так в моём прогрессе?', 'Когда ждать результатов?', 'Плато — что делать?'],
  generic:  ['Расскажи подробнее', 'Дай пример', 'Почему это важно?', 'Что делать дальше?']
};

/* ══════════════════════════════════════════════════════════════
   UTILITY FUNCTIONS
══════════════════════════════════════════════════════════════ */

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Renders markdown-like syntax to HTML
 * Supports: **bold**, *italic*, # headings, - lists, numbered lists, `code`, > blockquote
 */
function renderMarkdown(text) {
  if (!text) return '';
  var s = escapeHtml(String(text));

  // Code blocks (```...```)
  s = s.replace(/```([\s\S]*?)```/g, function(_, code) {
    return '<pre class="ai-code-block"><code>' + code.trim() + '</code></pre>';
  });
  // Inline code
  s = s.replace(/`([^`]+)`/g, '<code class="ai-inline-code">$1</code>');

  // Headings
  s = s.replace(/^### (.+)$/gm, '<div class="ai-h3">$1</div>');
  s = s.replace(/^## (.+)$/gm, '<div class="ai-h2">$1</div>');
  s = s.replace(/^# (.+)$/gm, '<div class="ai-h1">$1</div>');

  // Bold + italic
  s = s.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Blockquote
  s = s.replace(/^&gt; (.+)$/gm, '<div class="ai-quote">$1</div>');

  // Horizontal rule
  s = s.replace(/^---$/gm, '<hr class="ai-hr">');

  // Emoji bullet enhancement
  s = s.replace(/^(✅|🔥|💪|⚡|🎯|📌|❌|✨|🏋️|🥗|💤|🧠|⚠️) (.+)$/gm,
    '<div class="ai-emoji-line"><span class="ai-emoji-icon">$1</span><span>$2</span></div>');

  // Unordered lists
  s = s.replace(/((?:^[-•] .+\n?)+)/gm, function(block) {
    var items = block.trim().split('\n').map(function(line) {
      return '<li>' + line.replace(/^[-•] /, '') + '</li>';
    }).join('');
    return '<ul class="ai-list">' + items + '</ul>';
  });

  // Ordered lists
  s = s.replace(/((?:^\d+\. .+\n?)+)/gm, function(block) {
    var items = block.trim().split('\n').map(function(line) {
      return '<li>' + line.replace(/^\d+\. /, '') + '</li>';
    }).join('');
    return '<ol class="ai-list ai-list-num">' + items + '</ol>';
  });

  // Line breaks
  s = s.replace(/\n\n/g, '<br><br>');
  s = s.replace(/\n/g, '<br>');

  return s;
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

function getProfile() {
  try { return JSON.parse(AppStorage.getItem('fs-profile') || '{}'); }
  catch(e) { return {}; }
}

function getTodayNutr() {
  try {
    var entries = JSON.parse(AppStorage.getItem('fs-nutrition') || '[]');
    var today = new Date().toLocaleDateString('ru-RU');
    var todayE = entries.filter(function(e) { return e.date === today; });
    var totals = todayE.reduce(function(a, e) {
      return { kcal: a.kcal + (e.kcal||0), protein: a.protein + (e.protein||0),
               carbs: a.carbs + (e.carbs||0), fat: a.fat + (e.fat||0) };
    }, { kcal:0, protein:0, carbs:0, fat:0 });
    return totals;
  } catch(e) { return null; }
}

function getRecentWorkouts() {
  try {
    var diary = JSON.parse(AppStorage.getItem('fs-diary') || '[]');
    return diary.slice(-5).reverse();
  } catch(e) { return []; }
}

function getWaterToday() {
  try {
    var w = JSON.parse(AppStorage.getItem('fs-water') || '{}');
    return w.amount || 0;
  } catch(e) { return 0; }
}

/* ══════════════════════════════════════════════════════════════
   API CALL
══════════════════════════════════════════════════════════════ */

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
      max_tokens: max || 1400,
      temperature: 0.65
    }),
    signal: AbortSignal.timeout(35000)
  });
  if (!r.ok) throw new Error('Groq ' + r.status);
  var d = await r.json();
  return d && d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content || '';
}

/* ══════════════════════════════════════════════════════════════
   SYSTEM PROMPT BUILDER
══════════════════════════════════════════════════════════════ */

function buildSystemPrompt() {
  var pr = getProfile();
  var nutr = getTodayNutr();
  var workouts = getRecentWorkouts();
  var water = getWaterToday();
  var personality = PERSONALITY_PROMPTS[aiCoachPersonality] || PERSONALITY_PROMPTS.balanced;

  var profileBlock = '';
  if (pr && pr.name) {
    profileBlock = [
      '=== ПРОФИЛЬ ПОЛЬЗОВАТЕЛЯ ===',
      'Имя: ' + (pr.name || 'не указано'),
      'Пол: ' + (pr.gender === 'male' ? 'мужской' : pr.gender === 'female' ? 'женский' : 'не указан'),
      'Возраст: ' + (pr.age || '?') + ' лет',
      'Вес: ' + (pr.weight || '?') + ' кг',
      'Рост: ' + (pr.height || '?') + ' см',
      'Цель: ' + (pr.goal === 'loss' ? 'похудение' : pr.goal === 'gain' ? 'набор массы' : 'поддержание формы'),
      'Активность: ' + (pr.activity || '1.55'),
      'Уровень подготовки: ' + (aiLevel || pr.level || 'не указан'),
      'Стиль тренировок: ' + aiStyle,
      'Интенсивность: ' + aiIntensity,
      'Оборудование: ' + (aiEquip.length ? aiEquip.join(', ') : 'без оборудования'),
    ].join('\n');
  }

  var nutritionBlock = '';
  if (nutr && nutr.kcal > 0) {
    nutritionBlock = [
      '=== ПИТАНИЕ СЕГОДНЯ ===',
      'Калории: ' + Math.round(nutr.kcal) + ' ккал',
      'Белок: ' + Math.round(nutr.protein) + ' г',
      'Жиры: ' + Math.round(nutr.fat) + ' г',
      'Углеводы: ' + Math.round(nutr.carbs) + ' г',
      'Вода: ' + Math.round(water) + ' мл',
    ].join('\n');
  }

  var workoutBlock = '';
  if (workouts && workouts.length) {
    workoutBlock = '=== ПОСЛЕДНИЕ ТРЕНИРОВКИ ===\n' +
      workouts.slice(0,3).map(function(w) {
        return '• ' + (w.date||'') + ' — ' + (w.type||w.name||'тренировка') +
          (w.kcal ? ' (' + w.kcal + ' ккал)' : '');
      }).join('\n');
  }

  return [
    'Ты персональный AI-тренер по фитнесу и нутрициологии в приложении FitSim.',
    personality,
    'Отвечай на русском языке. Используй эмодзи умеренно. Форматируй текст с **жирным**, списками и заголовками для лучшей читаемости.',
    'Будь конкретным: называй упражнения, веса, подходы, граммы продуктов.',
    'Если пользователь просит план тренировки, структурируй его по дням недели.',
    '',
    profileBlock,
    nutritionBlock,
    workoutBlock,
    '',
    'Всегда учитывай данные пользователя при ответах. Не придумывай данные если их нет — попроси уточнить.',
  ].filter(Boolean).join('\n');
}

/* ══════════════════════════════════════════════════════════════
   CHAT PERSISTENCE
══════════════════════════════════════════════════════════════ */

function persistChatHistory() {
  try { AppStorage.setItem('fs-ai-chat-history', JSON.stringify(aiChatHistory.slice(-50))); }
  catch (e) {}
}

function restoreChatHistory() {
  try {
    aiChatHistory = JSON.parse(AppStorage.getItem('fs-ai-chat-history') || '[]');
  } catch (e) {
    aiChatHistory = [];
  }
}

/* ══════════════════════════════════════════════════════════════
   UI — MESSAGE RENDERING
══════════════════════════════════════════════════════════════ */

function appendMsg(role, text, opts) {
  opts = opts || {};
  var msgs = document.getElementById('ai-chat-msgs');
  if (!msgs) return;

  var msgId = 'msg-' + Date.now() + '-' + Math.random().toString(36).slice(2);

  var wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex;flex-direction:column;' +
    (role === 'user' ? 'align-items:flex-end;' : 'align-items:flex-start;');

  var bubble = document.createElement('div');
  bubble.id = msgId;
  bubble.className = 'ai-bubble ai-bubble-' + role;
  bubble.innerHTML = role === 'ai' ? renderMarkdown(text) : escapeHtml(String(text || ''));
  wrap.appendChild(bubble);

  // Reaction bar for AI messages
  if (role === 'ai' && !opts.noReactions) {
    var reactionBar = document.createElement('div');
    reactionBar.className = 'ai-reaction-bar';
    reactionBar.innerHTML =
      '<button class="ai-reaction-btn" onclick="aiReact(\'' + msgId + '\',1)" title="Полезно">👍</button>' +
      '<button class="ai-reaction-btn" onclick="aiReact(\'' + msgId + '\',0)" title="Не то">👎</button>' +
      '<button class="ai-reaction-btn ai-copy-btn" onclick="aiCopyMsg(\'' + msgId + '\')" title="Копировать">📋</button>';
    wrap.appendChild(reactionBar);

    // Quick reply chips
    if (opts.quickReplies && opts.quickReplies.length) {
      var chipsWrap = document.createElement('div');
      chipsWrap.className = 'ai-qr-wrap';
      opts.quickReplies.forEach(function(qr) {
        var chip = document.createElement('button');
        chip.className = 'ai-qr-chip';
        chip.textContent = qr;
        chip.onclick = function() {
          chipsWrap.remove();
          sendAiMessage(qr);
        };
        chipsWrap.appendChild(chip);
      });
      wrap.appendChild(chipsWrap);
    }
  }

  msgs.appendChild(wrap);
  msgs.scrollTop = msgs.scrollHeight;
  return msgId;
}

/**
 * Simulates streaming: renders text character by character
 */
function streamText(elementId, text, onDone) {
  var el = document.getElementById(elementId);
  if (!el || !aiStreamingEnabled) {
    if (el) el.innerHTML = renderMarkdown(text);
    if (onDone) onDone();
    return;
  }
  var i = 0;
  var speed = Math.max(8, Math.min(25, Math.round(8000 / text.length))); // adapt speed
  el.innerHTML = '';
  var partial = '';

  function step() {
    if (i >= text.length) {
      el.innerHTML = renderMarkdown(text);
      var msgs = document.getElementById('ai-chat-msgs');
      if (msgs) msgs.scrollTop = msgs.scrollHeight;
      if (onDone) onDone();
      return;
    }
    // Render in chunks of 3 chars for performance
    partial += text.slice(i, i + 3);
    i += 3;
    // Simple partial markdown (only line breaks during streaming)
    el.innerHTML = partial.replace(/\n/g, '<br>');
    var msgs = document.getElementById('ai-chat-msgs');
    if (msgs) msgs.scrollTop = msgs.scrollHeight;
    setTimeout(step, speed);
  }
  step();
}

function appendTyping(id, phase) {
  var msgs = document.getElementById('ai-chat-msgs');
  if (!msgs) return;
  var w = document.createElement('div');
  w.id = id;
  w.style.cssText = 'display:flex;align-items:center;gap:8px;padding:4px 0;';
  w.innerHTML =
    '<div class="ai-typing"><span></span><span></span><span></span></div>' +
    '<span id="' + id + '-phase" class="ai-typing-phase">' + (phase || '') + '</span>';
  msgs.appendChild(w);
  msgs.scrollTop = msgs.scrollHeight;
}

function updateTypingPhase(id, phase) {
  var el = document.getElementById(id + '-phase');
  if (el) el.textContent = phase;
}

/* ══════════════════════════════════════════════════════════════
   REACTIONS & COPY
══════════════════════════════════════════════════════════════ */

function aiReact(msgId, positive) {
  var el = document.getElementById(msgId);
  if (!el) return;
  var bar = el.parentNode && el.parentNode.querySelector('.ai-reaction-bar');
  if (bar) {
    bar.innerHTML = positive
      ? '<span style="font-size:13px;color:var(--accent);font-weight:600">👍 Отлично!</span>'
      : '<span style="font-size:13px;color:var(--text-light)">👎 Учту это</span>';
  }
  // Could log to analytics
}
window.aiReact = aiReact;

function aiCopyMsg(msgId) {
  var el = document.getElementById(msgId);
  if (!el) return;
  var text = el.innerText || el.textContent;
  navigator.clipboard && navigator.clipboard.writeText(text).then(function() {
    if (typeof toast === 'function') toast('Скопировано! 📋');
  });
}
window.aiCopyMsg = aiCopyMsg;

/* ══════════════════════════════════════════════════════════════
   DETECT TOPIC & QUICK REPLIES
══════════════════════════════════════════════════════════════ */

function detectTopic(text) {
  var t = text.toLowerCase();
  if (/трениров|упражн|жим|присед|становая|подтягив|план|программ/.test(t)) return 'workout';
  if (/ед|питан|калор|белок|протеин|ужин|завтрак|обед|рецепт|макр/.test(t)) return 'nutrition';
  if (/прогресс|результат|плато|не похуд|не расту|застой/.test(t)) return 'progress';
  return 'generic';
}

function getQuickReplies(responseText, userMsg) {
  var topic = detectTopic(userMsg + ' ' + (responseText || ''));
  return QUICK_REPLY_SETS[topic] || QUICK_REPLY_SETS.generic;
}

/* ══════════════════════════════════════════════════════════════
   DETECT WORKOUT PLAN IN RESPONSE
══════════════════════════════════════════════════════════════ */

function detectWorkoutPlan(text) {
  // Returns structured plan if detectable
  var t = text || '';
  var days = [];
  // Pattern: День 1 / Понедельник / Monday
  var dayPattern = /(?:день|day|понедельник|вторник|среда|четверг|пятница|суббота|воскресенье)[^\n]*/gi;
  var matches = t.match(dayPattern);
  if (matches && matches.length >= 2) return true;
  return false;
}

function renderExportButton(planText) {
  return '<button class="ai-export-btn" onclick="aiExportPlanToDiary()" ' +
    'data-plan="' + escapeHtml(planText) + '">' +
    '📅 Добавить в дневник</button>';
}

window.aiExportPlanToDiary = function() {
  // Save plan as a diary entry
  try {
    var diary = JSON.parse(AppStorage.getItem('fs-diary') || '[]');
    diary.push({
      id: Date.now().toString(),
      date: new Date().toLocaleDateString('ru-RU'),
      type: '📋 AI-план тренировок',
      exercises: 'Сгенерирован AI-тренером',
      kcal: 0
    });
    AppStorage.setItem('fs-diary', JSON.stringify(diary));
    if (typeof toast === 'function') toast('План сохранён в дневник! 📅');
  } catch(e) {}
};

/* ══════════════════════════════════════════════════════════════
   MAIN SEND FUNCTION
══════════════════════════════════════════════════════════════ */

async function sendAiMessage(text) {
  if (!text) {
    var inp = document.getElementById('ai-input');
    if (!inp) return;
    text = inp.value.trim();
    if (!text) return;
    inp.value = '';
  }

  var key = AppStorage.getItem('fs-groq-key') || '';
  if (!key) {
    appendMsg('ai', '⚠️ Введи Groq API ключ в настройках профиля чтобы использовать AI-тренера.', { noReactions: true });
    return;
  }
  if (generating) return;

  // Remove all quick-reply chip sets
  document.querySelectorAll('.ai-qr-wrap').forEach(function(el) { el.remove(); });

  appendMsg('user', text);
  aiChatHistory.push({ role: 'user', content: text });
  persistChatHistory();

  generating = true;
  updateSendBtn(true);

  var typingId = 'typing-' + Date.now();
  appendTyping(typingId, 'Думаю...');

  // Animated thinking phases
  var phases = ['Анализирую данные...', 'Составляю ответ...', 'Почти готово...'];
  var phaseIdx = 0;
  var phaseTimer = setInterval(function() {
    phaseIdx = (phaseIdx + 1) % phases.length;
    updateTypingPhase(typingId, phases[phaseIdx]);
  }, 1800);

  try {
    var sys = buildSystemPrompt();
    var msgs = aiChatHistory.slice(-20); // keep last 20 for context
    var reply = await callGroq(key, sys, msgs, 1400);

    clearInterval(phaseTimer);
    var typingEl = document.getElementById(typingId);
    if (typingEl) typingEl.remove();

    aiChatHistory.push({ role: 'assistant', content: reply });
    persistChatHistory();
    updateMsgCounter();

    var qr = getQuickReplies(reply, text);
    var msgId = appendMsg('ai', '', { quickReplies: qr });

    // Stream the text
    streamText(msgId, reply, function() {
      // Add export button if plan detected
      if (detectWorkoutPlan(reply)) {
        var el = document.getElementById(msgId);
        if (el) {
          var exportBtn = document.createElement('div');
          exportBtn.style.marginTop = '8px';
          exportBtn.innerHTML = '<button class="ai-export-btn" onclick="aiExportPlanToDiary()">📅 Сохранить план в дневник</button>';
          el.parentNode.insertBefore(exportBtn, el.nextSibling);
        }
      }
    });

    lastTopic = detectTopic(text);

  } catch (err) {
    clearInterval(phaseTimer);
    var typingElErr = document.getElementById(typingId);
    if (typingElErr) typingElErr.remove();
    var errMsg = err.message || 'Ошибка';
    if (errMsg.includes('401')) errMsg = 'Неверный API ключ. Проверь ключ в настройках.';
    else if (errMsg.includes('429')) errMsg = 'Превышен лимит запросов. Попробуй через минуту.';
    else if (errMsg.includes('timeout')) errMsg = 'Сервер не отвечает. Попробуй ещё раз.';
    appendMsg('ai', '❌ ' + errMsg, { noReactions: true });
  } finally {
    generating = false;
    updateSendBtn(false);
  }
}
window.sendAiMessage = sendAiMessage;

function updateSendBtn(busy) {
  var btn = document.getElementById('ai-send-btn');
  if (!btn) return;
  btn.disabled = busy;
  btn.innerHTML = busy
    ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="3"/></svg>'
    : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>';
}

function updateMsgCounter() {
  var el = document.getElementById('ai-msg-count');
  if (el) {
    var count = aiChatHistory.length;
    el.textContent = count + '/50';
    el.style.color = count > 40 ? 'var(--accent)' : 'var(--text-light)';
  }
}

/* ══════════════════════════════════════════════════════════════
   CLEAR HISTORY
══════════════════════════════════════════════════════════════ */

function clearAiChat() {
  if (!confirm('Очистить историю диалога?')) return;
  aiChatHistory = [];
  persistChatHistory();
  var msgs = document.getElementById('ai-chat-msgs');
  if (msgs) msgs.innerHTML = '';
  updateMsgCounter();
  showWelcomeMessage();
}
window.clearAiChat = clearAiChat;

function showWelcomeMessage() {
  var pr = getProfile();
  var name = pr.name ? ', ' + pr.name : '';
  var greetings = [
    'Привет' + name + '! 💪 Готов помочь с тренировками и питанием. С чего начнём?',
    'Здравствуй' + name + '! 🔥 Я твой AI-тренер. Задай любой вопрос — составлю план, разберу технику или посчитаю макросы.',
    'Снова в деле' + name + '! ⚡ Что сегодня — тренировка, питание или анализ прогресса?',
  ];
  var msg = greetings[Math.floor(Math.random() * greetings.length)];
  appendMsg('ai', msg, { quickReplies: QUICK_REPLY_SETS.greeting, noReactions: true });
}

/* ══════════════════════════════════════════════════════════════
   PERSONALITY SWITCHER
══════════════════════════════════════════════════════════════ */

function setAiPersonality(p) {
  aiCoachPersonality = p;
  AppStorage.setItem('fs-ai-personality', p);
  document.querySelectorAll('.ai-personality-btn').forEach(function(btn) {
    btn.classList.toggle('ai-personality-active', btn.dataset.p === p);
  });
  var names = { strict: 'Строгий тренер', balanced: 'Профессионал', mentor: 'Наставник' };
  if (typeof toast === 'function') toast('Режим: ' + (names[p] || p));
}
window.setAiPersonality = setAiPersonality;

/* ══════════════════════════════════════════════════════════════
   VOICE INPUT
══════════════════════════════════════════════════════════════ */

var aiVoiceRecognition = null;
var aiVoiceActive = false;

function startAiVoice() {
  var SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRec) {
    if (typeof toast === 'function') toast('Голосовой ввод не поддерживается');
    return;
  }
  if (aiVoiceActive) {
    if (aiVoiceRecognition) aiVoiceRecognition.stop();
    return;
  }
  aiVoiceRecognition = new SpeechRec();
  aiVoiceRecognition.lang = 'ru-RU';
  aiVoiceRecognition.interimResults = false;
  aiVoiceActive = true;

  var voiceBtn = document.getElementById('ai-voice-btn');
  if (voiceBtn) voiceBtn.classList.add('listening');

  aiVoiceRecognition.onresult = function(e) {
    var transcript = e.results[0][0].transcript;
    var inp = document.getElementById('ai-input');
    if (inp) inp.value = transcript;
    sendAiMessage(transcript);
  };
  aiVoiceRecognition.onend = function() {
    aiVoiceActive = false;
    var voiceBtn = document.getElementById('ai-voice-btn');
    if (voiceBtn) voiceBtn.classList.remove('listening');
  };
  aiVoiceRecognition.onerror = function() {
    aiVoiceActive = false;
    var voiceBtn = document.getElementById('ai-voice-btn');
    if (voiceBtn) voiceBtn.classList.remove('listening');
  };
  aiVoiceRecognition.start();
}
window.startAiVoice = startAiVoice;

/* ══════════════════════════════════════════════════════════════
   WORKOUT PLAN GENERATOR (structured JSON)
══════════════════════════════════════════════════════════════ */

async function generateWorkoutPlan() {
  var key = AppStorage.getItem('fs-groq-key') || '';
  if (!key) {
    appendMsg('ai', '⚠️ Добавь Groq API ключ чтобы генерировать планы.', { noReactions: true });
    return;
  }
  if (generating) return;

  generating = true;
  updateSendBtn(true);
  var typingId = 'typing-plan-' + Date.now();
  appendTyping(typingId, 'Составляю план тренировок...');

  var phases = ['Подбираю упражнения...', 'Рассчитываю объём...', 'Финальная настройка...'];
  var phaseIdx = 0;
  var phaseTimer = setInterval(function() {
    phaseIdx = (phaseIdx + 1) % phases.length;
    updateTypingPhase(typingId, phases[phaseIdx]);
  }, 2000);

  try {
    var pr = getProfile();
    var sys = buildSystemPrompt();
    var prompt = 'Составь детальный недельный план тренировок. ' +
      'Стиль: ' + aiStyle + ', Интенсивность: ' + aiIntensity + '. ' +
      'Для каждого дня укажи: название, упражнения с подходами/повторами/весами. ' +
      'Используй Markdown форматирование. Сделай план практичным и реалистичным.';

    var reply = await callGroq(key, sys, [{ role: 'user', content: prompt }], 2000);

    clearInterval(phaseTimer);
    var typingEl = document.getElementById(typingId);
    if (typingEl) typingEl.remove();

    aiChatHistory.push({ role: 'user', content: prompt });
    aiChatHistory.push({ role: 'assistant', content: reply });
    persistChatHistory();
    updateMsgCounter();

    var msgId = appendMsg('ai', '', {
      quickReplies: ['Сделай сложнее', 'Объясни упражнение', 'Альтернативы без зала']
    });
    streamText(msgId, reply, function() {
      var el = document.getElementById(msgId);
      if (el) {
        var exportBtn = document.createElement('div');
        exportBtn.style.marginTop = '8px';
        exportBtn.innerHTML = '<button class="ai-export-btn" onclick="aiExportPlanToDiary()">📅 Сохранить план в дневник</button>';
        el.parentNode.insertBefore(exportBtn, el.nextSibling);
      }
    });

    lastPlanParams = { style: aiStyle, intensity: aiIntensity };

  } catch(err) {
    clearInterval(phaseTimer);
    var typingElErr = document.getElementById(typingId);
    if (typingElErr) typingElErr.remove();
    appendMsg('ai', '❌ Не удалось сгенерировать план: ' + (err.message || ''), { noReactions: true });
  } finally {
    generating = false;
    updateSendBtn(false);
  }
}
window.generateWorkoutPlan = generateWorkoutPlan;

/* ══════════════════════════════════════════════════════════════
   NUTRITION ANALYSIS
══════════════════════════════════════════════════════════════ */

async function analyzeNutrition() {
  var key = AppStorage.getItem('fs-groq-key') || '';
  if (!key) return;
  if (generating) return;

  var nutr = getTodayNutr();
  if (!nutr || nutr.kcal === 0) {
    appendMsg('ai', '📊 Сегодня питание ещё не записано. Добавь приёмы пищи в раздел Питание, и я проанализирую твой рацион.', {
      quickReplies: ['Что можно съесть сейчас?', 'Рассчитай мою норму калорий'],
      noReactions: true
    });
    return;
  }

  generating = true;
  updateSendBtn(true);
  var typingId = 'typing-nutr-' + Date.now();
  appendTyping(typingId, 'Анализирую питание...');

  try {
    var sys = buildSystemPrompt();
    var prompt = 'Проанализируй моё питание за сегодня. Дай конкретные рекомендации что улучшить: ' +
      'что добавить, что убрать, когда есть. Будь конкретен с граммами и продуктами.';

    var reply = await callGroq(key, sys, [{ role: 'user', content: prompt }], 1200);

    var typingEl = document.getElementById(typingId);
    if (typingEl) typingEl.remove();

    aiChatHistory.push({ role: 'user', content: prompt });
    aiChatHistory.push({ role: 'assistant', content: reply });
    persistChatHistory();
    updateMsgCounter();

    var msgId = appendMsg('ai', '', {
      quickReplies: ['Список продуктов на неделю', 'Что приготовить на ужин?', 'Рецепты с высоким белком']
    });
    streamText(msgId, reply);

  } catch(err) {
    var typingElErr = document.getElementById(typingId);
    if (typingElErr) typingElErr.remove();
    appendMsg('ai', '❌ Ошибка анализа: ' + (err.message || ''), { noReactions: true });
  } finally {
    generating = false;
    updateSendBtn(false);
  }
}
window.analyzeNutrition = analyzeNutrition;

/* ══════════════════════════════════════════════════════════════
   PROGRESS ANALYSIS
══════════════════════════════════════════════════════════════ */

async function analyzeProgress() {
  var key = AppStorage.getItem('fs-groq-key') || '';
  if (!key) return;
  if (generating) return;

  generating = true;
  updateSendBtn(true);
  var typingId = 'typing-prog-' + Date.now();
  appendTyping(typingId, 'Анализирую прогресс...');

  try {
    var sys = buildSystemPrompt();
    var workouts = getRecentWorkouts();
    var prompt = 'Проанализируй мой прогресс на основе данных профиля и последних тренировок. ' +
      'Что идёт хорошо? Где есть проблемы? Что нужно изменить для лучших результатов? ' +
      'Дай 3-5 конкретных действий которые я могу сделать сегодня.';

    var reply = await callGroq(key, sys, [{ role: 'user', content: prompt }], 1200);

    var typingEl = document.getElementById(typingId);
    if (typingEl) typingEl.remove();

    aiChatHistory.push({ role: 'user', content: prompt });
    aiChatHistory.push({ role: 'assistant', content: reply });
    persistChatHistory();
    updateMsgCounter();

    var msgId = appendMsg('ai', '', {
      quickReplies: ['Как выйти из плато?', 'Оптимальное время тренировок', 'Нужен ли мне отдых?']
    });
    streamText(msgId, reply);

  } catch(err) {
    var typingElErr = document.getElementById(typingId);
    if (typingElErr) typingElErr.remove();
    appendMsg('ai', '❌ ' + (err.message || ''), { noReactions: true });
  } finally {
    generating = false;
    updateSendBtn(false);
  }
}
window.analyzeProgress = analyzeProgress;

/* ══════════════════════════════════════════════════════════════
   INIT PAGE
══════════════════════════════════════════════════════════════ */


// ── Save Groq API Key ─────────────────────────────────────
function saveGroqKey() {
  var inp = document.getElementById('ai-groq-key-input');
  var statusEl = document.getElementById('ai-key-status');
  if (!inp) return;
  var key = inp.value.trim();
  if (!key) {
    if (statusEl) { statusEl.textContent = '⚠️ Введи ключ перед сохранением'; statusEl.style.color = '#f97316'; }
    return;
  }
  try {
    AppStorage.setItem('fs-groq-key', key);
  } catch(e) {}
  // Mask the input
  inp.type = 'password';
  if (statusEl) {
    statusEl.innerHTML = '✅ Ключ сохранён — AI-тренер готов к работе';
    statusEl.style.color = '#22c55e';
    setTimeout(function(){ statusEl.textContent = ''; }, 3000);
  }
  toast('✅ API ключ сохранён!');   // <--- ИСПРАВЛЕНО: было showToast
}

function initAiPage() {
  restoreChatHistory();
  // Restore saved API key into input
  try {
    var savedKey = AppStorage.getItem('fs-groq-key') || '';
    var keyInp = document.getElementById('ai-groq-key-input');
    var keyStatus = document.getElementById('ai-key-status');
    if (keyInp && savedKey) {
      keyInp.value = savedKey;
      if (keyStatus) {
        keyStatus.innerHTML = '✅ Ключ сохранён';
        keyStatus.style.color = '#22c55e';
      }
    }
  } catch(e) {}


  // Restore personality
  try {
    var saved = AppStorage.getItem('fs-ai-personality');
    if (saved) aiCoachPersonality = saved;
  } catch(e) {}

  // Set personality button states
  document.querySelectorAll('.ai-personality-btn').forEach(function(btn) {
    btn.classList.toggle('ai-personality-active', btn.dataset.p === aiCoachPersonality);
  });

  var msgs = document.getElementById('ai-chat-msgs');
  if (!msgs) return;

  updateMsgCounter();

  // Restore previous messages
  if (aiChatHistory.length > 0) {
    msgs.innerHTML = '';
    aiChatHistory.forEach(function(m) {
      if (m.role === 'user') {
        appendMsg('user', m.content);
      } else if (m.role === 'assistant') {
        appendMsg('ai', m.content, { noReactions: true });
      }
    });
  } else {
    msgs.innerHTML = '';
    showWelcomeMessage();
  }

  // Input enter handler
  var inp = document.getElementById('ai-input');
  if (inp) {
    inp.onkeydown = function(e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendAiMessage();
      }
    };
    // Auto-resize textarea
    inp.oninput = function() {
      this.style.height = 'auto';
      this.style.height = Math.min(this.scrollHeight, 120) + 'px';
    };
  }

  chatReady = true;
}
window.initAiPage = initAiPage;

/* ══════════════════════════════════════════════════════════════
   EQUIPMENT & SETTINGS HELPERS
══════════════════════════════════════════════════════════════ */

function toggleEquip(e) {
  var v = e.dataset.v;
  if (!v) return;
  e.classList.toggle('ai-chip-active');
  if (aiEquip.indexOf(v) > -1) {
    aiEquip = aiEquip.filter(function(x) { return x !== v; });
  } else {
    aiEquip.push(v);
  }
}
window.toggleEquip = toggleEquip;

function setAiGoal(v) {
  aiGoal = v;
  document.querySelectorAll('[data-goal]').forEach(function(el) {
    el.classList.toggle('ai-chip-active', el.dataset.goal === v);
  });
}
window.setAiGoal = setAiGoal;

function setAiLevel(v) {
  aiLevel = v;
  document.querySelectorAll('[data-level]').forEach(function(el) {
    el.classList.toggle('ai-chip-active', el.dataset.level === v);
  });
}
window.setAiLevel = setAiLevel;

function setAiStyle(v) {
  aiStyle = v;
  document.querySelectorAll('[data-style]').forEach(function(el) {
    el.classList.toggle('ai-chip-active', el.dataset.style === v);
  });
}
window.setAiStyle = setAiStyle;

function setAiIntensity(v) {
  aiIntensity = v;
  document.querySelectorAll('[data-intensity]').forEach(function(el) {
    el.classList.toggle('ai-chip-active', el.dataset.intensity === v);
  });
}
window.setAiIntensity = setAiIntensity;

/* ══════════════════════════════════════════════════════════════
   STREAMING TOGGLE
══════════════════════════════════════════════════════════════ */

function toggleStreaming() {
  aiStreamingEnabled = !aiStreamingEnabled;
  var btn = document.getElementById('ai-stream-toggle');
  if (btn) btn.textContent = aiStreamingEnabled ? '⚡ Анимация: вкл' : '⚡ Анимация: выкл';
}
window.toggleStreaming = toggleStreaming;