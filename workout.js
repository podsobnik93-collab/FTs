// workout.js — Тренировки: база упражнений, конструктор, выполнение

// ==================== БАЗА УПРАЖНЕНИЙ ====================
const ENCYCLOPEDIA = {
  "biceps":[{"n":"Концентрированные сгибания на бицепс"},{"n":"Сгибание в стиле молоток на скамье Скотта"},{"n":"Сгибание рук в блоке лёжа"},{"n":"Сгибание рук в блоке сидя на корточках"},{"n":"Сгибание рук в кроссовере"},{"n":"Сгибание рук в тренажёре"},{"n":"Сгибание рук на скамье Скотта в блоке"},{"n":"Сгибание одной руки с гантелью на скамье Скотта"},{"n":"Сгибание рук с гантелями стоя, одновременное или поочерёдное"},{"n":"Сгибание рук с гантелями хватом молот"},{"n":"Сгибание рук с разворотом сидя на наклонной скамье"},{"n":"Сгибание рук сидя на наклонной скамье, вместе или поочерёдно"},{"n":"Сгибание рук со штангой или гантелями лёжа на наклонной скамье"},{"n":"Сгибание рук со штангой на скамье Скотта"},{"n":"Сгибание рук со штангой с армбластером"},{"n":"Сгибание руки сидя от колена"},{"n":"Сгибания рук с разворотом стоя или сидя"},{"n":"Сгибания рук со штангой EZ-грифом параллельным хватом"},{"n":"Сгибания рук стоя в кроссовере, «проповедник»"}],
  "chest":[{"n":"Жим в кроссовере горизонтально"},{"n":"Жим в рычажном тренажёре"},{"n":"Жим в Смите лёжа"},{"n":"Жим в Смите под наклоном"},{"n":"Жим гантелей лёжа"},{"n":"Жим гантелей под наклоном"},{"n":"Жим Свенда с гантелями лёжа или под наклоном"},{"n":"Жим штанги лёжа под наклоном"},{"n":"Жим штанги лёжа"},{"n":"Отжимания на брусьях"},{"n":"Отжимания широким хватом"},{"n":"Пуловер лёжа на скамье"},{"n":"Разведение гантелей"},{"n":"Сведение рук в кроссовере снизу"},{"n":"Сведение рук в кроссовере стоя или лёжа"},{"n":"Сведение рук в тренажёре"}],
  "legs":[{"n":"Сгибание ног лёжа"},{"n":"Сгибание ног сидя"},{"n":"Сгибание ног стоя"},{"n":"Жим платформы носками"},{"n":"Подъём на носки сидя в тренажёре"},{"n":"Подъём на носки стоя"},{"n":"Разгибание ног в тренажёре сидя"},{"n":"Разгибание ног в тренажёре одной ногой"},{"n":"Воздушные приседания"},{"n":"Выпады вперёд с гантелями"},{"n":"Выпады назад"},{"n":"Выпады в тренажёре Смита"},{"n":"Гакк-приседания"},{"n":"Жим ногами в тренажёре"},{"n":"Жим ногами одной ногой"},{"n":"Зашагивания на тумбу с гантелями"},{"n":"Приседания в тренажёре Смита"},{"n":"Приседания с гантелями"},{"n":"Приседания со штангой"},{"n":"Фронтальные приседания со штангой"},{"n":"Становая тяга: классика, сумо, трап-гриф"},{"n":"Приведение бедра стоя в тренажёре"},{"n":"Приведение ноги в нижнем блоке"},{"n":"Сведение ног сидя в тренажёре"}],
  "glutes":[{"n":"Доброе утро (Good Morning)"},{"n":"Мёртвая тяга на прямых ногах"},{"n":"Румынская тяга"},{"n":"Румынская тяга с гантелями"},{"n":"Румынская тяга в тренажёре Смита"},{"n":"Становая тяга на одной ноге с гантелями"},{"n":"Болгарские приседания"},{"n":"Выпады в Смите с акцентом на ягодицы"},{"n":"Выпады вперёд с акцентом на ягодицы"},{"n":"Выпады на месте с наклоном корпуса"},{"n":"Подъёмы на платформу"},{"n":"Гиперэкстензия с акцентом на ягодицы"},{"n":"Краб с резинкой"},{"n":"Ласточка"},{"n":"Махи ногой в сторону"},{"n":"Отведение бедра стоя в тренажёре"},{"n":"Отведение ноги в сторону в кроссовере"},{"n":"Отведение ноги назад в блоке"},{"n":"Отведение ноги назад в упоре на руках"},{"n":"Отведение ноги вверх на блоке"},{"n":"Отведение ног в тренажёре сидя"},{"n":"Разведение бёдер сидя с резинкой"},{"n":"Разведение ног с резинкой в ягодичном мостике"},{"n":"Разгибание бедра стоя в тренажёре"},{"n":"Хип-траст на скамье"},{"n":"Ягодичный мост в тренажёре"},{"n":"Ягодичный мост в тренажёре Смита на скамье"},{"n":"Ягодичный мост лёжа на полу"}],
  "shoulders":[{"n":"Армейский жим стоя"},{"n":"Жим гантелей сидя или стоя"},{"n":"Жим Арнольда"},{"n":"Жим вверх перед собой в тренажёре"},{"n":"Жим резины над головой"},{"n":"Махи гантелями в стороны стоя или сидя"},{"n":"Махи гантелью одной рукой в сторону"},{"n":"Махи в стороны с резинкой"},{"n":"Отведение рук в стороны в тренажёре"},{"n":"Махи гантелями перед собой"},{"n":"Подъём гантелей перед собой лёжа на наклонной скамье"},{"n":"Face Pull с резинкой"},{"n":"Обратная бабочка в тренажёре"},{"n":"Разведения гантелей в наклоне нейтральным хватом"},{"n":"Махи на заднюю дельту лёжа грудью на наклонной скамье"},{"n":"Разведения на задние дельты в наклоне с резинкой"},{"n":"Отведение руки в сторону в наклоне на блоке"},{"n":"Тяга резины с высоким креплением на задние дельты"},{"n":"Наружная и внутренняя ротация плеча с резинкой"},{"n":"Наружная ротация плеча 90 градусов с резинкой"},{"n":"Тяга штанги к подбородку"},{"n":"Тяга нижнего блока к подбородку"}],
  "back":[{"n":"Подтягивания широким прямым хватом к груди"},{"n":"Подтягивания параллельным хватом"},{"n":"Подтягивания узким обратным хватом"},{"n":"Тяга верхнего блока широким прямым хватом к груди"},{"n":"Тяга верхнего блока параллельным узким хватом к груди"},{"n":"Тяга верхнего блока обратным хватом к груди"},{"n":"Вертикальная тяга в Хаммере"},{"n":"Горизонтальная тяга блока сидя узким хватом"},{"n":"Тяга нижнего блока параллельным хватом"},{"n":"Горизонтальная рычажная тяга в Хаммере"},{"n":"Тяга Т-грифа с упором грудью"},{"n":"Тяга гантели одной рукой в упоре на скамье"},{"n":"Тяга штанги в наклоне прямым хватом"},{"n":"Тяга штанги в наклоне обратным хватом"},{"n":"Тяга Т-грифа в наклоне"},{"n":"Пуловер на верхнем блоке стоя"},{"n":"Тяга верхнего блока к лицу"},{"n":"Шраги с гантелями"}],
  "triceps":[{"n":"Жим лёжа узким хватом"},{"n":"Жим лёжа узким хватом в тренажёре Смита"},{"n":"Отжимания на брусьях"},{"n":"Отжимания на брусьях в гравитроне узким хватом"},{"n":"Отжимания с узкой постановкой рук"},{"n":"Обратные отжимания от скамьи"},{"n":"Разгибание рук на верхнем блоке"},{"n":"Разгибание рук на блоке с V-образной рукоятью и канатом"},{"n":"Разгибание одной руки в блоке"},{"n":"Французский жим лёжа"},{"n":"Разгибание рук из-за головы в кроссовере"},{"n":"Разгибание рук из-за головы в нижнем блоке"},{"n":"Разгибание одной руки с гантелью из-за головы стоя или сидя"},{"n":"Разгибание одной руки с гантелью лёжа"}],
  "abs":[{"n":"Планка"},{"n":"Боковая планка"},{"n":"Частичный подъём туловища лёжа на полу"},{"n":"Скручивания лёжа на наклонной скамье"},{"n":"Скручивания в верхнем блоке стоя на коленях"},{"n":"Обратные скручивания"},{"n":"Подъём ног в висе на локтях"},{"n":"Поочерёдный подъём ног лёжа на спине"},{"n":"Вакуум"}],
  "forearms":[{"n":"Сгибание кистей со штангой в упоре сидя"},{"n":"Сгибание кисти с гантелью в упоре"},{"n":"Разгибание кисти с гантелью в упоре"},{"n":"Сгибание кистей со штангой за спиной стоя"}]
};
for(const [cat,exs] of Object.entries(ENCYCLOPEDIA)){
  ALL_EXERCISES[cat]=exs.map(ex=>({...ex,s:3,r:12,kg:0,k:30,desc:'',tech:''}));
}
if(!ALL_EXERCISES.glutes)ALL_EXERCISES.glutes=[];
if(!ALL_EXERCISES.glutes.find(e=>e.n==='Ягодичный мостик со штангой')) ALL_EXERCISES.glutes.push({n:'Ягодичный мостик со штангой',s:3,r:15,kg:20,k:40,desc:'',tech:''});
if(!ALL_EXERCISES.back.find(e=>e.n==='Тяга горизонтального блока к поясу')) ALL_EXERCISES.back.push({n:'Тяга горизонтального блока к поясу',s:3,r:10,kg:50,k:45,desc:'',tech:''});
if(!ALL_EXERCISES.chest.find(e=>e.n==='Разводка гантелей лёжа')) ALL_EXERCISES.chest.push({n:'Разводка гантелей лёжа',s:3,r:10,kg:20,k:40,desc:'',tech:''});
if(!ALL_EXERCISES.legs.find(e=>e.n==='Жим платформы')) ALL_EXERCISES.legs.push({n:'Жим платформы',s:4,r:10,kg:80,k:60,desc:'',tech:''});


// ==================== УПРАВЛЕНИЕ ПОТОКОМ ТРЕНИРОВКИ ====================
function saveWorkoutFlowState(){
  const state = {
    currentWtScreen,
    customWt,
    editMode,
    workoutTitle: document.getElementById('exe-title')?.textContent || 'Тренировка',
    builderTitle: document.getElementById('wt-name-input')?.value || '',
    pickerChecked: pickerChecked ? Object.fromEntries(Object.entries(pickerChecked).map(([k,v]) => [k, Array.from(v)])) : {},
    pickerParams: pickerParams || {},
    activeMuscle: activeMuscle || null
  };
  localStorage.setItem('fs-workout-flow-state', JSON.stringify(state));
}
function restoreWorkoutFlowState(){
  try {
    const state = JSON.parse(localStorage.getItem('fs-workout-flow-state') || '{}');
    if (!state || typeof state !== 'object') return false;
    if (Array.isArray(state.customWt)) customWt = state.customWt;
    if (typeof state.editMode === 'boolean') editMode = state.editMode;
    if (state.builderTitle && document.getElementById('wt-name-input')) document.getElementById('wt-name-input').value = state.builderTitle;
    if (state.workoutTitle && document.getElementById('exe-title')) document.getElementById('exe-title').textContent = state.workoutTitle;
    currentWtScreen = state.currentWtScreen || (customWt.length ? 'execute' : 'home');
    if (state.pickerChecked) {
      pickerChecked = {};
      for (let [cat, arr] of Object.entries(state.pickerChecked)) {
        pickerChecked[cat] = new Set(arr);
      }
    }
    if (state.pickerParams) pickerParams = state.pickerParams;
    if (state.activeMuscle) activeMuscle = state.activeMuscle;
    return true;
  } catch(e) {
    return false;
  }
}
function clearWorkoutFlowState(){
  localStorage.removeItem('fs-workout-flow-state');
}

// FIX: добавлен beforeunload для активной тренировки
window.addEventListener('beforeunload', (e) => {
  if (currentWtScreen === 'execute' && customWt.length > 0 && customWt.some(ex => !ex.done)) {
    e.preventDefault();
    e.returnValue = 'У вас есть незавершённая тренировка. Точно хотите покинуть страницу?';
    return e.returnValue;
  }
});


// ==================== КОНСТРУКТОР ТРЕНИРОВКИ ====================
let pickerChecked={}, pickerParams={}, activeMuscle=null;

function showWtScreen(screen){
  currentWtScreen=screen; saveWorkoutFlowState(); updateCtaLabel();
  ['wt-home','wt-builder','wt-execute'].forEach(id=>{
    const el=document.getElementById(id);
    if(el) el.style.display=(id==='wt-'+screen)?'block':'none';
  });
  const titles={home:'🏋️ Тренировка',builder:'✏️ Создать тренировку',execute:'💪 Выполнение'};
  const hdr=document.getElementById('header-title'); if(hdr) hdr.textContent=titles[screen]||'FitSim';
  const scrollArea=document.querySelector('.scroll-area'); if(scrollArea) scrollArea.scrollTop=0;
  const cta=document.querySelector('.bottom-cta'); if(cta) cta.style.display='none';
  if(screen==='home'){ renderSavedWts(); }
  if(screen==='builder'){
    if(!pickerChecked||Object.keys(pickerChecked).length===0) initBuilder();
    else { renderMuscleGrid(); if(activeMuscle) renderExPicker(activeMuscle); updateBldStartBar(); }
    if(typeof renderProgramTags==='function') renderProgramTags();
    if(typeof renderBuilderTabs==='function') renderBuilderTabs();
    if(typeof renderFrequentExs==='function') renderFrequentExs();
  }
  if(screen==='execute'){ editMode=false; renderExecute(); }
}
window.showWtScreen = showWtScreen;

function renderSavedWts(){
  const card=document.getElementById('saved-wt-card'),list=document.getElementById('saved-wt-list'),cnt=document.getElementById('saved-wt-count');
  savedWts=JSON.parse(localStorage.getItem('fs-saved-wts')||'[]');
  if(!savedWts.length){if(card)card.style.display='none';return;}
  if(card)card.style.display='block';
  if(cnt)cnt.textContent=savedWts.length+(savedWts.length===1?' шаблон':savedWts.length<5?' шаблона':' шаблонов');
  if(list) list.innerHTML=savedWts.map((wt,i)=>`<div class="saved-wt-item"><div class="saved-wt-info"><div class="saved-wt-name">${wt.name||'Тренировка '+(i+1)}</div><div class="saved-wt-meta">${wt.exercises.length} упражнений</div></div><div class="saved-wt-btns"><button class="saved-wt-start" onclick="loadSavedWt(${i})">▶ Начать</button><button class="saved-wt-del" onclick="deleteSavedWt(${i})">✕</button></div></div>`).join('');
}
window.renderSavedWts = renderSavedWts;

function saveWtTemplate(){
  if(!customWt.length){toast('Добавь упражнения сначала');return;}
  const name=(document.getElementById('wt-name-input')?.value||'').trim()||'Тренировка '+new Date().toLocaleDateString('ru');
  savedWts.push({name,exercises:customWt.map(e=>({n:e.n,s:e.s,r:e.r,kg:e.kg}))});
  localStorage.setItem('fs-saved-wts',JSON.stringify(savedWts));
  toast('💾 Шаблон сохранён!');
  renderSavedWts();
}
window.saveWtTemplate = saveWtTemplate;

function loadSavedWt(idx){
  const wt=savedWts[idx]; if(!wt)return;
  customWt=wt.exercises.map(e=>({...e,sets_data:new Array(e.s).fill(false).map(()=>({r:e.r,kg:e.kg,done:false})),done:false}));
  showWtScreen('execute');
  document.getElementById('exe-title').textContent=wt.name||'Тренировка';
}
window.loadSavedWt = loadSavedWt;

function deleteSavedWt(idx){
  if(!confirm('Удалить сохранённый шаблон?'))return;
  savedWts.splice(idx,1);
  localStorage.setItem('fs-saved-wts',JSON.stringify(savedWts));
  renderSavedWts();
  toast('Шаблон удалён');
}
window.deleteSavedWt = deleteSavedWt;

function initBuilder(){
  activeMuscle=null; pickerChecked={}; pickerParams={};
  document.querySelectorAll('.muscle-tile').forEach(t=>t.classList.remove('active-muscle'));
  const picker=document.getElementById('ex-picker'),bar=document.getElementById('bld-start-bar'),ni=document.getElementById('wt-name-input');
  if(picker) picker.style.display='none';
  if(bar) bar.style.display='none';
  if(ni) ni.value='';
  if(typeof builderActiveTab!=='undefined') builderActiveTab='muscles';
  renderMuscleGrid();
  if(typeof renderProgramTags==='function') renderProgramTags();
  if(typeof renderBuilderTabs==='function') renderBuilderTabs();
  if(typeof renderFrequentExs==='function') renderFrequentExs();
  const ms=document.getElementById('builder-muscle-section'); if(ms)ms.style.display='';
  const fs=document.getElementById('builder-fav-section'); if(fs)fs.style.display='none';
}

function renderMuscleGrid(){
  const grid=document.getElementById('muscle-grid'); if(!grid)return;
  const muscles=Object.keys(ALL_EXERCISES);
  const labels={chest:'Грудные',back:'Спина',legs:'Ноги',shoulders:'Плечи',biceps:'Бицепс',triceps:'Трицепс',glutes:'Ягодицы',abs:'Пресс',forearms:'Предплечья',cardio:'Кардио'};
  const emojis={chest:'💪',back:'🔙',legs:'🦵',shoulders:'🏋️',biceps:'💪',triceps:'💪',glutes:'🍑',abs:'⬡',forearms:'✊',cardio:'❤️'};
  const counts={};
  muscles.forEach(m=>{ counts[m]=(pickerChecked[m]&&pickerChecked[m].size)||0; });
  grid.innerHTML=muscles.map(m=>`<div class="muscle-tile${activeMuscle===m?' active-muscle':''}" data-cat="${m}" onclick="selectMuscle('${m}')" style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;padding:12px 8px;border-radius:12px;background:var(--input-bg);border:1.5px solid ${activeMuscle===m?'var(--accent)':'var(--border)'};cursor:pointer;min-height:64px;position:relative;">${counts[m]>0?`<span style="position:absolute;top:6px;right:6px;background:var(--accent);color:#fff;border-radius:9999px;font-size:10px;font-weight:700;min-width:18px;height:18px;display:flex;align-items:center;justify-content:center;padding:0 4px;">${counts[m]}</span>`:''}<span style="font-size:22px;">${emojis[m]||'💪'}</span><span style="font-size:11px;font-weight:600;color:var(--text);text-align:center;">${labels[m]||m}</span></div>`).join('');
}

function selectMuscle(cat){
  document.querySelectorAll('.muscle-tile').forEach(t=>t.classList.toggle('active-muscle',t.dataset.cat===cat));
  activeMuscle=cat;
  if(!pickerChecked[cat]) pickerChecked[cat]=new Set();
  renderExPicker(cat);
  setTimeout(()=>{const el=document.getElementById('ex-picker'); if(el)el.scrollIntoView({behavior:'smooth',block:'start'});},80);
}
window.selectMuscle = selectMuscle;

function renderExPicker(cat){
  const picker=document.getElementById('ex-picker'),list=document.getElementById('ex-picker-list'),title=document.getElementById('ex-picker-title');
  if(!picker||!list)return;
  const LABELS={chest:'Грудные',back:'Спина',legs:'Ноги',shoulders:'Плечи',biceps:'Бицепс',triceps:'Трицепс',glutes:'Ягодицы',abs:'Пресс',forearms:'Предплечья',cardio:'Кардио'};
  if(title)title.textContent=(LABELS[cat]||cat)+' — выбери упражнения';
  const exs=ALL_EXERCISES[cat]||[];
  const checked=pickerChecked[cat]||new Set();
  if(!pickerParams[cat])pickerParams[cat]={};
  let html='';
  for(let i=0;i<exs.length;i++){
    const e=exs[i]; const isChk=checked.has(e.n);
    if(!pickerParams[cat][e.n]){const lastKg=exlog[e.n]?.at(-1)?.kg??e.kg; pickerParams[cat][e.n]={s:e.s,r:e.r,kg:lastKg};}
    const p=pickerParams[cat][e.n];
    const paramsHtml=isChk?`<div class="pick-params" onclick="event.stopPropagation()"><div class="pick-param-group"><div class="pick-param-lbl">Подходы</div><div class="pick-param-ctrl"><button class="pick-param-btn" onclick="adjPickParam('${cat}','${e.n}','s',-1,${i})">−</button><span class="pick-param-val" id="pp-s-${cat}-${i}">${p.s}</span><button class="pick-param-btn" onclick="adjPickParam('${cat}','${e.n}','s',1,${i})">+</button></div></div><div class="pick-param-group"><div class="pick-param-lbl">Повторы</div><div class="pick-param-ctrl"><button class="pick-param-btn" onclick="adjPickParam('${cat}','${e.n}','r',-1,${i})">−</button><span class="pick-param-val" id="pp-r-${cat}-${i}">${p.r}</span><button class="pick-param-btn" onclick="adjPickParam('${cat}','${e.n}','r',1,${i})">+</button></div></div><div class="pick-param-group"><div class="pick-param-lbl">Вес, кг</div><div class="pick-param-ctrl"><button class="pick-param-btn" onclick="adjPickParam('${cat}','${e.n}','kg',-0.5,${i})">−</button><input class="pick-param-input" id="pp-kg-${cat}-${i}" type="number" inputmode="decimal" value="${p.kg}" onfocus="this.select()" onchange="setPickParam('${cat}','${e.n}','kg',parseFloat(this.value)||0,${i})"><button class="pick-param-btn" onclick="adjPickParam('${cat}','${e.n}','kg',0.5,${i})">+</button></div></div></div>`:'';
    html+=`<div class="ex-pick-row ${isChk?'row-checked':''}" data-i="${i}" data-cat="${cat}"><div class="ex-pick-row-top" onclick="togglePickEx(${i}, '${cat}')"><div class="ex-pick-check ${isChk?'checked':''}">${isChk?'✓':''}</div><div class="ex-pick-info"><div class="ex-pick-name">${e.n}</div></div></div>${paramsHtml}</div>`;
  }
  list.innerHTML=html||'<div style="padding:16px;color:var(--text-muted);text-align:center">Нет упражнений</div>';
  picker.style.display='block';
  updateBldStartBar();
}
function togglePickEx(exIdx,cat){
  const e=(ALL_EXERCISES[cat]||[])[exIdx]; if(!e)return;
  if(!pickerChecked[cat])pickerChecked[cat]=new Set();
  const checked=pickerChecked[cat];
  if(checked.has(e.n)) checked.delete(e.n);
  else{checked.add(e.n); if(!pickerParams[cat])pickerParams[cat]={}; if(!pickerParams[cat][e.n]){const lastKg=exlog[e.n]?.at(-1)?.kg??e.kg; pickerParams[cat][e.n]={s:e.s,r:e.r,kg:lastKg};}}
  renderExPicker(cat);
}
window.togglePickEx = togglePickEx;

function adjPickParam(cat,name,field,delta,idx){
  if(!pickerParams[cat]||!pickerParams[cat][name])return;
  const mins={s:1,r:1,kg:0},maxs={s:10,r:100,kg:500};
  const cur=pickerParams[cat][name][field];
  pickerParams[cat][name][field]=Math.max(mins[field],Math.min(maxs[field],cur+delta));
  const el=document.getElementById(`pp-${field}-${cat}-${idx}`);
  if(el){if(el.tagName==='INPUT')el.value=pickerParams[cat][name][field]; else el.textContent=pickerParams[cat][name][field];}
}
window.adjPickParam = adjPickParam;

function setPickParam(cat,name,field,val,idx){
  if(!pickerParams[cat]||!pickerParams[cat][name])return;
  const mins={s:1,r:1,kg:0},maxs={s:10,r:100,kg:500};
  val=Math.max(mins[field],Math.min(maxs[field],val));
  val=Math.round(val*10)/10;
  pickerParams[cat][name][field]=val;
  const el=document.getElementById(`pp-${field}-${cat}-${idx}`);
  if(el&&el.tagName==='INPUT')el.value=val;
}
window.setPickParam = setPickParam;

function selectAllExs(){
  if(!activeMuscle)return;
  const exs=ALL_EXERCISES[activeMuscle]||[];
  if(!pickerChecked[activeMuscle])pickerChecked[activeMuscle]=new Set();
  exs.forEach(e=>pickerChecked[activeMuscle].add(e.n));
  renderExPicker(activeMuscle);
}
window.selectAllExs = selectAllExs;

function clearAllExs(){
  if(!activeMuscle)return;
  pickerChecked[activeMuscle]=new Set();
  renderExPicker(activeMuscle);
}
window.clearAllExs = clearAllExs;

function updateBldStartBar(){
  const bar=document.getElementById('bld-start-bar'),label=document.getElementById('bld-start-label');
  let total=0; for(const s of Object.values(pickerChecked)) total+=s.size;
  if(bar)bar.style.display=total>0?'block':'none';
  if(label)label.textContent='▶ Начать тренировку · '+total+' упр.';
}
function startCustomWorkout(){
  customWt=[];
  for(const [cat,names] of Object.entries(pickerChecked)){
    for(const name of names){
      const e=(ALL_EXERCISES[cat]||[]).find(x=>x.n===name);
      if(e){
        const p=(pickerParams[cat]&&pickerParams[cat][name])||{s:e.s,r:e.r,kg:e.kg};
        customWt.push({...e,s:p.s,r:p.r,kg:p.kg,sets_data:Array.from({length:p.s},()=>({r:p.r,kg:p.kg,done:false})),done:false});
      }
    }
  }
  if(!customWt.length){toast('❗ Выбери хотя бы одно упражнение');return;}
  const rawName=(document.getElementById('wt-name-input')?.value||'').trim();
  const name=rawName||(Object.keys(pickerChecked).map(cat=>({chest:'Грудь',back:'Спина',legs:'Ноги',shoulders:'Плечи',biceps:'Бицепс',triceps:'Трицепс',glutes:'Ягодицы',abs:'Пресс',forearms:'Предплечья',cardio:'Кардио'}[cat]||cat)).join(' + ')||'Тренировка');
  document.getElementById('exe-title').textContent=name;
  showWtScreen('execute');
}
window.startCustomWorkout = startCustomWorkout;

// ==================== ВЫПОЛНЕНИЕ ТРЕНИРОВКИ ====================
// ==================== ВЫПОЛНЕНИЕ ТРЕНИРОВКИ ====================
function toggleEditMode(){editMode=!editMode; renderExecute();}
window.toggleEditMode = toggleEditMode;

function moveEx(idx, dir) {
  const newIdx = idx + dir;
  if (newIdx < 0 || newIdx >= customWt.length) return;
  [customWt[idx], customWt[newIdx]] = [customWt[newIdx], customWt[idx]];
  renderExecute();
  setTimeout(() => {
    const el = document.getElementById('exe-row-' + newIdx);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, 50);
}
window.moveEx = moveEx;



function renderExecute(){
  updateExeProgress();
  const el=document.getElementById('exe-list'),buttonsDiv=document.getElementById('execute-buttons');
  if(!el)return;
  let html='';
  for(let i=0;i<customWt.length;i++){
    const e=customWt[i];
    if(!e.sets_data)e.sets_data=Array.from({length:e.s},(_,idx)=>({r:e.r,kg:e.kg,done:false}));
    const setsHtml=e.sets_data.map((set,si)=>`<div class="exe-set-row ${set.done?'done-set':''}"><div class="set-chip" onclick="toggleSet(${i},${si})"><div class="chk">✓</div>Подход ${si+1}</div><div class="set-controls"><div class="set-ctrl"><button onclick="updateSetVal(${i},${si},'kg',-0.5)">-</button><input class="set-kg-input" id="set-kg-${i}-${si}" type="number" inputmode="decimal" value="${set.kg}" onfocus="this.select()" onchange="setSetVal(${i},${si},'kg',parseFloat(this.value)||0)"> кг<button onclick="updateSetVal(${i},${si},'kg',0.5)">+</button></div><div class="set-ctrl"><button onclick="updateSetVal(${i},${si},'r',-1)">-</button><span id="set-r-${i}-${si}">${set.r} повт</span><button onclick="updateSetVal(${i},${si},'r',1)">+</button></div></div></div>`).join('');
    const editControls=editMode?`<div style="display:flex;gap:6px;margin-top:8px;justify-content:flex-end;border-top:1px solid var(--border);padding-top:8px;flex-wrap:wrap;"><button onclick="moveEx(${i},-1)" ${i===0?"disabled":""} style="background:var(--input-bg);border:1px solid var(--border);border-radius:8px;padding:5px 10px;font-size:14px;${i===0?"opacity:.3":""}">↑</button><button onclick="moveEx(${i},1)" ${i===customWt.length-1?"disabled":""} style="background:var(--input-bg);border:1px solid var(--border);border-radius:8px;padding:5px 10px;font-size:14px;${i===customWt.length-1?"opacity:.3":""}">↓</button><button onclick="editExercise(${i})" style="background:var(--input-bg);border:1px solid var(--border);border-radius:8px;padding:5px 10px;font-size:12px;">⚙️ Параметры</button><button onclick="deleteExercise(${i})" style="background:#fdeaea;border:1px solid #e74c3c;border-radius:8px;padding:5px 10px;font-size:12px;color:#e74c3c;">✕ Удалить</button></div>`:"";
    const prEntry=exlog[e.n]?.reduce((best,s)=>s.kg>best.kg?s:best,{kg:0,r:0});
    const prHtml=(prEntry&&prEntry.kg>0)?`<div style="font-size:11px;color:var(--accent);margin-top:2px;opacity:.8">🏆 Рекорд: ${prEntry.kg} кг × ${prEntry.r}</div>`:'';
    html+=`<div class="exe-ex-row ${e.done?'done-row':''}" id="exe-row-${i}"><div class="exe-ex-inner"><div class="exe-ex-left"><div class="exe-ex-name">${e.n}</div>${prHtml}<div class="exe-ex-detail" style="color:var(--text-muted); font-size:12px; margin-top:4px;">${e.s} подходов</div></div><div class="exe-check ${e.done?'checked':''}" onclick="toggleExDone(${i})">${e.done?'✓':''}</div></div><div class="exe-sets-container" id="exe-sets-${i}">${setsHtml}</div>${editControls}</div>`;
  }
  el.innerHTML=html||'<div style="text-align:center; padding:32px; color:var(--text-muted)">Нет упражнений. Нажмите «+ Добавить»</div>';
  if(editMode){
    buttonsDiv.innerHTML=`<button onclick="openAddExerciseSheet()" style="width:100%; padding:12px; border-radius:14px; background:var(--accent); color:#fff; border:none; font-weight:700; cursor:pointer;">+ Добавить упражнение</button>`;
  } else {
    const allDone=customWt.length>0 && customWt.every(e=>e.done);
    buttonsDiv.innerHTML=`
      <div style="display:flex; gap:8px; flex-wrap:wrap;">
        <button onclick="openAddExerciseSheet()" style="flex:1; padding:12px; border-radius:14px; background:var(--card-inner); border:1px solid var(--border); color:var(--text); font-weight:700; cursor:pointer;">+ Добавить</button>
        <button onclick="${allDone?'finishCustomWorkout()':'toast(\'❗ Выполни все подходы перед сохранением\')'}" style="flex:2; padding:12px; border-radius:14px; background:${allDone?'var(--accent)':'var(--border)'}; color:${allDone?'#fff':'var(--text-light)'}; border:none; font-weight:700; cursor:${allDone?'pointer':'default'};">✅ Сохранить</button>
        <button onclick="cancelWorkout()" style="flex:0 1 auto; padding:12px 16px; border-radius:14px; background:transparent; border:1px solid #ef4444; color:#ef4444; font-weight:700; cursor:pointer;">✕ Отмена</button>
      </div>
    `;
  }
}

function updateExeProgress(){
  const total=customWt.reduce((acc,e)=>acc+e.s,0);
  const done=customWt.reduce((acc,e)=>acc+e.sets_data.filter(s=>s.done).length,0);
  const pct=total>0?Math.round(done/total*100):0;
  document.getElementById('exe-progress-text').textContent=`${done}/${total} подходов`;
  document.getElementById('exe-progress-bar').style.width=pct+'%';
}

function toggleSet(exIdx,setIdx){
  const ex=customWt[exIdx];
  if(!ex)return;
  ex.sets_data[setIdx].done=!ex.sets_data[setIdx].done;
  // Проверяем, все ли подходы выполнены
  const allDone=ex.sets_data.every(s=>s.done);
  ex.done=allDone;
  renderExecute();
}
window.toggleSet = toggleSet;

function toggleExDone(exIdx){
  const ex=customWt[exIdx];
  if(!ex)return;
  const newState=!ex.done;
  ex.done=newState;
  ex.sets_data.forEach(s=>s.done=newState);
  renderExecute();
}
window.toggleExDone = toggleExDone;

function updateSetVal(exIdx,setIdx,field,delta){
  const set=customWt[exIdx]?.sets_data[setIdx];
  if(!set)return;
  const mins={kg:0,r:1};
  const maxs={kg:500,r:100};
  const newVal=Math.max(mins[field],Math.min(maxs[field],set[field]+delta));
  set[field]=field==='kg'?Math.round(newVal*10)/10:Math.round(newVal);
  // Обновляем display
  const el=document.getElementById(`set-${field}-${exIdx}-${setIdx}`);
  if(el){
    if(field==='kg') el.value=set[field];
    else el.textContent=set[field]+' повт';
  }
}
window.updateSetVal = updateSetVal;

function setSetVal(exIdx,setIdx,field,val){
  const set=customWt[exIdx]?.sets_data[setIdx];
  if(!set)return;
  const mins={kg:0,r:1};
  const maxs={kg:500,r:100};
  val=Math.max(mins[field],Math.min(maxs[field],val));
  set[field]=field==='kg'?Math.round(val*10)/10:Math.round(val);
  const el=document.getElementById(`set-${field}-${exIdx}-${setIdx}`);
  if(el){
    if(field==='kg') el.value=set[field];
    else el.textContent=set[field]+' повт';
  }
}
window.setSetVal = setSetVal;

function finishCustomWorkout(){
  if(!customWt.every(e=>e.done)){
    toast('❗ Выполни все подходы');
    return;
  }
  // Сохраняем в дневник
  const diary=JSON.parse(localStorage.getItem('fs-diary')||'[]');
  const name=document.getElementById('exe-title').textContent||'Тренировка';
  const date=new Date().toLocaleDateString('ru-RU');
  // Собираем упражнения с деталями
  const exLines=customWt.map(e=>{
    const groups=[];
    let current=null;
    for(const s of e.sets_data){
      if(!current || s.r!==current.r || s.kg!==current.kg){
        if(current)groups.push(current);
        current={count:1,r:s.r,kg:s.kg};
      }else{
        current.count++;
      }
    }
    if(current)groups.push(current);
    const setsStr=groups.map(g=>`${g.count}×${g.r}${g.kg>0?' - '+g.kg+'кг':''}`).join(', ');
    return `${e.n}: ${setsStr}`;
  }).join('\n');
  const kcal=Math.round(customWt.reduce((acc,e)=>acc+(e.sets_data.reduce((s,set)=>s+((set.kg||0)*0.05*set.r),0)),0));
  diary.push({id:Date.now()+'_'+Math.random().toString(36).slice(2), date, type:name, exercises:exLines, kcal});
  localStorage.setItem('fs-diary',JSON.stringify(diary));
  // Обновляем exlog
  const exlog=JSON.parse(localStorage.getItem('fs-exlog')||'{}');
  customWt.forEach(e=>{
    if(!exlog[e.n])exlog[e.n]=[];
    let maxKg=0, maxKgReps=0, totalSets=0;
    e.sets_data.forEach(s=>{
      if(s.kg>maxKg){maxKg=s.kg;maxKgReps=s.r;}
      totalSets++;
    });
    exlog[e.n].push({date,kg:maxKg,s:totalSets,r:maxKgReps});
  });
  localStorage.setItem('fs-exlog',JSON.stringify(exlog));
  toast('✅ Тренировка сохранена!');
  customWt=[];
  initBuilder();
  clearWorkoutFlowState();
  showWtScreen('home');
  updateCtaLabel();
  renderHome();
  renderCalendar();
}
window.finishCustomWorkout = finishCustomWorkout;

function cancelWorkout() {
  if (confirm('❌ Отменить тренировку? Весь прогресс будет потерян.')) {
    customWt = [];
    initBuilder();
    clearWorkoutFlowState();
    showWtScreen('home');
    updateCtaLabel();
    toast('Тренировка отменена');
  }
}
window.cancelWorkout = cancelWorkout;

function deleteExercise(idx){
  if(confirm('Удалить упражнение "'+customWt[idx].n+'"?')){customWt.splice(idx,1); renderExecute();}
}
window.deleteExercise = deleteExercise;

let currentEditingIdx=null;
function editExercise(idx){
  const ex=customWt[idx]; currentEditingIdx=idx;
  document.getElementById('edit-ex-name').value=ex.n;
  document.getElementById('edit-ex-sets').value=ex.s;
  document.getElementById('edit-ex-reps').value=ex.r;
  document.getElementById('edit-ex-kg').value=ex.kg;
  document.getElementById('edit-ex-sheet').classList.add('show');
  document.getElementById('sheet-overlay').classList.add('show');
}
window.editExercise = editExercise;

function saveExerciseParams(){
  if(currentEditingIdx===null)return;
  const ex=customWt[currentEditingIdx];
  const newName=document.getElementById('edit-ex-name').value.trim()||ex.n;
  const newSets=parseInt(document.getElementById('edit-ex-sets').value)||1;
  const newReps=parseInt(document.getElementById('edit-ex-reps').value)||1;
  const newKg=parseFloat(document.getElementById('edit-ex-kg').value)||0;
  ex.n=newName; ex.s=newSets; ex.r=newReps; ex.kg=newKg;
  const oldSets=ex.sets_data.length;
  if(newSets>oldSets){for(let i=oldSets;i<newSets;i++)ex.sets_data.push({r:newReps,kg:newKg,done:false});}
  else if(newSets<oldSets)ex.sets_data=ex.sets_data.slice(0,newSets);
  else ex.sets_data.forEach(set=>{set.r=newReps;set.kg=newKg;});
  ex.done=false;
  closeAllSheets(); renderExecute();
}
window.saveExerciseParams = saveExerciseParams;

let selectedAddCat=null, selectedAddEx=null, addExParams={s:3,r:12,kg:0};
let searchResults = [];

function openAddExerciseSheet(){
  selectedAddCat=null; selectedAddEx=null; addExParams={s:3,r:12,kg:0};
  const srch=document.getElementById('add-ex-search'); if(srch) srch.value='';
  const mg=document.getElementById('add-muscle-grid'); if(mg) mg.style.display='';
  const al=document.getElementById('add-ex-list'); if(al) al.innerHTML='';
  const ap=document.getElementById('add-ex-params'); if(ap) ap.style.display='none';
  const cb=document.getElementById('confirm-add-ex-btn'); if(cb) cb.style.display='none';
  renderAddMuscleGrid();
  document.getElementById('add-ex-sheet').classList.add('show');
  document.getElementById('sheet-overlay').classList.add('show');
}
window.openAddExerciseSheet = openAddExerciseSheet;

function renderAddMuscleGrid(){
  const grid=document.getElementById('add-muscle-grid'); if(!grid)return;
  const muscles=Object.keys(ALL_EXERCISES);
  const labels={chest:'Грудные',back:'Спина',legs:'Ноги',shoulders:'Плечи',biceps:'Бицепс',triceps:'Трицепс',glutes:'Ягодицы',abs:'Пресс',forearms:'Предплечья',cardio:'Кардио'};
  const emojis={chest:'💪',back:'🔙',legs:'🦵',shoulders:'🏋️',biceps:'💪',triceps:'💪',glutes:'🍑',abs:'⬡',forearms:'✊',cardio:'❤️'};
  grid.innerHTML=muscles.map(m=>`<div class="muscle-tile${selectedAddCat===m?' active-muscle':''}" onclick="selectAddMuscle('${m}')" style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;padding:12px 8px;border-radius:12px;background:var(--input-bg);border:1.5px solid ${selectedAddCat===m?'var(--accent)':'var(--border)'};cursor:pointer;min-height:64px;"><span style="font-size:22px;">${emojis[m]||'💪'}</span><span style="font-size:11px;font-weight:600;color:var(--text);text-align:center;">${labels[m]||m}</span></div>`).join('');
}

function selectAddMuscle(cat){
  selectedAddCat=cat; renderAddMuscleGrid(); renderAddExList(cat);
}
window.selectAddMuscle = selectAddMuscle;

function renderAddExList(cat){
  const container=document.getElementById('add-ex-list'); const exs=ALL_EXERCISES[cat]||[];
  if(!exs.length){container.innerHTML='<div style="padding:16px; text-align:center; color:var(--text-muted)">Нет упражнений</div>'; document.getElementById('add-ex-params').style.display='none'; document.getElementById('confirm-add-ex-btn').style.display='none'; return;}
  let html='<div style="display:flex; flex-direction:column; gap:4px;">';
  exs.forEach((ex,idx)=>{html+=`<div class="ex-pick-row" data-idx="${idx}" onclick="selectAddExercise(${idx})" style="cursor:pointer; background:${selectedAddEx===ex?'var(--accent)':'transparent'}; color:${selectedAddEx===ex?'#fff':'var(--text)'}; border-radius:8px; padding:8px 12px;"><div class="ex-pick-name">${ex.n}</div></div>`;});
  html+='</div>'; container.innerHTML=html;
  if(selectedAddEx)showAddExerciseParams(selectedAddEx); else{document.getElementById('add-ex-params').style.display='none'; document.getElementById('confirm-add-ex-btn').style.display='none';}
}
function selectAddExercise(idx){
  if(!selectedAddCat) return;
  const ex = ALL_EXERCISES[selectedAddCat]?.[idx];
  if(!ex) return;
  selectedAddEx = ex;
  if (!addExParams.s) addExParams = { s: ex.s || 3, r: ex.r || 12, kg: ex.kg || 0 };
  const searchVal = (document.getElementById('add-ex-search')?.value || '').trim();
  if (searchVal) {
    filterAddExSearch();
  } else {
    renderAddExList(selectedAddCat);
  }
  showAddExerciseParams(ex);
}
window.selectAddExercise = selectAddExercise;

function selectAddExerciseFromSearch(cat, idx) {
  const ex = ALL_EXERCISES[cat]?.[idx];
  if (!ex) return;
  selectedAddCat = cat;
  selectedAddEx = ex;
  if (!addExParams.s) addExParams = { s: ex.s || 3, r: ex.r || 12, kg: ex.kg || 0 };
  filterAddExSearch();
  showAddExerciseParams(ex);
}
window.selectAddExerciseFromSearch = selectAddExerciseFromSearch;

function showAddExerciseParams(ex) {
  const paramsDiv = document.getElementById('add-ex-params');
  const confirmBtn = document.getElementById('confirm-add-ex-btn');
  if (!paramsDiv) return;
  paramsDiv.style.display = 'block';
  paramsDiv.innerHTML = `
    <div style="margin-bottom:12px; font-weight:700;">Параметры для "${ex.n}"</div>
    <div class="sheet-fields-row">
      <div class="sheet-field">
        <label>Подходы</label>
        <input id="add-sets" type="number" min="1" value="${addExParams.s || ex.s || 3}">
      </div>
      <div class="sheet-field">
        <label>Повторы</label>
        <input id="add-reps" type="number" min="1" value="${addExParams.r || ex.r || 12}">
      </div>
      <div class="sheet-field">
        <label>Вес (кг)</label>
        <input id="add-kg" type="number" step="0.5" value="${addExParams.kg || ex.kg || 0}">
      </div>
    </div>
  `;
  if (confirmBtn) confirmBtn.style.display = 'block';
}

function filterAddExSearch() {
  const raw = (document.getElementById('add-ex-search')?.value || '').toLowerCase().trim().replace(/ё/g, 'е');
  const muscleGrid = document.getElementById('add-muscle-grid');
  const container = document.getElementById('add-ex-list');
  const paramsDiv = document.getElementById('add-ex-params');
  const confirmBtn = document.getElementById('confirm-add-ex-btn');
  if (!container) return;
  if (!raw) {
    if (muscleGrid) muscleGrid.style.display = '';
    container.innerHTML = '';
    if (paramsDiv) paramsDiv.style.display = 'none';
    if (confirmBtn) confirmBtn.style.display = 'none';
    selectedAddEx = null;
    searchResults = [];
    if (selectedAddCat) {
      renderAddExList(selectedAddCat);
    }
    return;
  }
  const qWords = raw.split(/\s+/).filter(Boolean);
  function fuzzyScore(name) {
    const n = name.toLowerCase().replace(/ё/g, 'е');
    if (!raw) return 0;
    if (n === raw) return 1000;
    if (n.includes(raw)) return 200;
    let score = 0;
    for (const w of qWords) {
      if (n.includes(w)) {
        score += 20;
        continue;
      }
      const nWords = n.split(/\s+/);
      let partial = false;
      for (const nw of nWords) {
        const minLen = Math.min(w.length, nw.length);
        if (minLen < 4) continue;
        const prefixLen = Math.max(4, Math.floor(minLen * 0.7));
        if (nw.startsWith(w.slice(0, prefixLen)) || w.startsWith(nw.slice(0, prefixLen))) {
          score += 8;
          partial = true;
          break;
        }
      }
      if (!partial) return 0;
    }
    return score;
  }
  let results = [];
  const catLabels = {
    chest: 'Грудные', back: 'Спина', legs: 'Ноги', shoulders: 'Плечи',
    biceps: 'Бицепс', triceps: 'Трицепс', glutes: 'Ягодицы', abs: 'Пресс',
    forearms: 'Предплечья', cardio: 'Кардио'
  };
  Object.entries(ALL_EXERCISES).forEach(([cat, exs]) => {
    exs.forEach((ex, idx) => {
      const score = fuzzyScore(ex.n);
      if (score > 0) {
        results.push({ ex, cat, idx, score });
      }
    });
  });
  results.sort((a, b) => b.score - a.score);
  searchResults = results;
  if (!results.length) {
    container.innerHTML = '<div style="padding:16px; text-align:center; color:var(--text-muted)">Ничего не найдено 🤷</div>';
    if (paramsDiv) paramsDiv.style.display = 'none';
    if (confirmBtn) confirmBtn.style.display = 'none';
    if (muscleGrid) muscleGrid.style.display = 'none';
    selectedAddEx = null;
    return;
  }
  if (muscleGrid) muscleGrid.style.display = 'none';
  let html = '<div style="display:flex; flex-direction:column; gap:4px;">';
  results.forEach(({ ex, cat, idx }) => {
    const isSel = selectedAddEx && selectedAddEx.n === ex.n;
    html += `
      <div class="ex-pick-row"
           data-cat="${cat}"
           data-idx="${idx}"
           onclick="selectAddExerciseFromSearch('${cat}', ${idx})"
           style="cursor:pointer; background:${isSel ? 'var(--accent)' : 'transparent'};
                  color:${isSel ? '#fff' : 'var(--text)'}; border-radius:8px; padding:8px 12px;">
        <div class="ex-pick-name">${ex.n}</div>
        <div style="font-size:11px; color:${isSel ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)'}; margin-top:2px;">
          ${catLabels[cat] || cat}
        </div>
      </div>
    `;
  });
  html += '</div>';
  container.innerHTML = html;
  if (selectedAddEx) {
    const found = results.some(r => r.ex.n === selectedAddEx.n);
    if (found) {
      showAddExerciseParams(selectedAddEx);
    } else {
      if (paramsDiv) paramsDiv.style.display = 'none';
      if (confirmBtn) confirmBtn.style.display = 'none';
    }
  } else {
    if (paramsDiv) paramsDiv.style.display = 'none';
    if (confirmBtn) confirmBtn.style.display = 'none';
  }
}
window.filterAddExSearch = filterAddExSearch;

function confirmAddExercise(){
  if(!selectedAddEx){
    toast('❗ Сначала выберите упражнение');
    return;
  }
  const sets = parseInt(document.getElementById('add-sets')?.value) || 1;
  const reps = parseInt(document.getElementById('add-reps')?.value) || 1;
  const kg = parseFloat(document.getElementById('add-kg')?.value) || 0;
  addExParams = { s: sets, r: reps, kg: kg };
  const newEx = {
    ...selectedAddEx,
    s: sets,
    r: reps,
    kg: kg,
    sets_data: Array.from({ length: sets }, () => ({ r: reps, kg: kg, done: false })),
    done: false
  };
  customWt.push(newEx);
  closeAllSheets();
  renderExecute();
  toast(`✅ ${selectedAddEx.n} добавлено`);
}
window.confirmAddExercise = confirmAddExercise;

// ==================== ПОИСК УПРАЖНЕНИЙ В КОНСТРУКТОРЕ ====================
function searchBuilderEx() {
  const input = document.getElementById('builder-ex-search');
  const list = document.getElementById('builder-ex-search-list');
  if (!input || !list) return;
  const norm = s => (s || '').trim().toLowerCase().replace(/ё/g, 'е');
  const q = norm(input.value);
  if (!q) {
    list.style.display = 'none';
    list.innerHTML = '';
    return;
  }
  const qWords = q.split(/\s+/).filter(Boolean);
  function fuzzyScore(name) {
    const n = norm(name);
    if (!q) return 0;
    if (n === q) return 1000;
    if (n.includes(q)) return 200;
    let score = 0;
    for (const w of qWords) {
      if (n.includes(w)) {
        score += 20;
        continue;
      }
      const nWords = n.split(/\s+/);
      let partial = false;
      for (const nw of nWords) {
        const minLen = Math.min(w.length, nw.length);
        if (minLen < 4) continue;
        const prefixLen = Math.max(4, Math.floor(minLen * 0.7));
        if (nw.startsWith(w.slice(0, prefixLen)) || w.startsWith(nw.slice(0, prefixLen))) {
          score += 8;
          partial = true;
          break;
        }
      }
      if (!partial) return 0;
    }
    return score;
  }
  const results = [];
  const labels = {
    chest: 'Грудные', back: 'Спина', legs: 'Ноги', shoulders: 'Плечи',
    biceps: 'Бицепс', triceps: 'Трицепс', glutes: 'Ягодицы',
    abs: 'Пресс', forearms: 'Предплечья', cardio: 'Кардио'
  };
  for (const [cat, exs] of Object.entries(ALL_EXERCISES)) {
    for (const ex of exs) {
      const score = fuzzyScore(ex.n);
      if (score > 0) results.push({ cat, ex, score });
    }
  }
  results.sort((a, b) => b.score - a.score);
  if (!results.length) {
    list.innerHTML = '<div style="padding:12px;color:var(--text-light);text-align:center;">Ничего не найдено 🤷</div>';
    list.style.display = 'block';
    return;
  }
  let html = '<div style="display:flex;flex-direction:column;gap:4px;">';
  results.forEach(({ cat, ex }) => {
    html += `<div class="ex-pick-row" onclick="selectSearchResult('${cat}','${ex.n}')" style="cursor:pointer;padding:8px 12px;border-radius:8px;background:var(--input-bg);margin-bottom:2px;">
      <div style="font-weight:600;">${ex.n}</div>
      <div style="font-size:11px;color:var(--text-light);">${labels[cat] || cat}</div>
    </div>`;
  });
  html += '</div>';
  list.innerHTML = html;
  list.style.display = 'block';
}
window.searchBuilderEx = searchBuilderEx;

function selectSearchResult(cat, name) {
  const ex = ALL_EXERCISES[cat]?.find(e => e.n === name);
  if (!ex) return;
  if (!pickerChecked[cat]) pickerChecked[cat] = new Set();
  pickerChecked[cat].add(name);
  activeMuscle = cat;
  selectMuscle(cat);
  const list = document.getElementById('builder-ex-search-list');
  const input = document.getElementById('builder-ex-search');
  if (list) { list.style.display = 'none'; list.innerHTML = ''; }
  if (input) input.value = '';
  updateBldStartBar();
  toast('✅ Добавлено: ' + name);
}
window.selectSearchResult = selectSearchResult;

function handleBuilderVoiceSearch() {
  searchBuilderEx();
}
window.handleBuilderVoiceSearch = handleBuilderVoiceSearch;
// ==================== ПАТЧ 2: ШАБЛОНЫ ПРОГРАММ ====================
const WORKOUT_PROGRAMS = [
  { id:'push',      label:'🔥 Push',      cats:['chest','shoulders','triceps'] },
  { id:'pull',      label:'🎯 Pull',      cats:['back','biceps','forearms'] },
  { id:'legs',      label:'🦵 Legs',      cats:['legs','glutes'] },
  { id:'upper',     label:'💪 Верх',      cats:['chest','back','shoulders','biceps','triceps'] },
  { id:'lower',     label:'🏋️ Низ',       cats:['legs','glutes'] },
  { id:'fullbodyA', label:'⚡ Full A',    cats:['chest','back','legs'] },
  { id:'fullbodyB', label:'🌟 Full B',    cats:['shoulders','biceps','triceps','glutes','abs'] },
  { id:'korcabs',   label:'⬡ Кор',       cats:['abs','forearms'] },
];

function applyProgram(programId) {
  const prog = WORKOUT_PROGRAMS.find(p => p.id === programId);
  if (!prog) return;
  pickerChecked = {};
  pickerParams = {};
  activeMuscle = null;
  document.querySelectorAll('.muscle-tile').forEach(t => t.classList.remove('active-muscle'));
  const picker = document.getElementById('ex-picker');
  if (picker) picker.style.display = 'none';
  prog.cats.forEach(cat => {
    if (ALL_EXERCISES[cat]) pickerChecked[cat] = new Set();
  });
  builderActiveTab = 'muscles';
  renderBuilderTabs();
  const ms = document.getElementById('builder-muscle-section');
  const fs = document.getElementById('builder-fav-section');
  if (ms) ms.style.display = '';
  if (fs) fs.style.display = 'none';
  renderMuscleGrid();
  if (prog.cats.length > 0 && ALL_EXERCISES[prog.cats[0]]) {
    selectMuscle(prog.cats[0]);
  }
  updateBldStartBar();
  toast('Шаблон «' + prog.label + '» применён ✓');
}
window.applyProgram = applyProgram;

function renderProgramTags() {
  const container = document.getElementById('program-tags');
  if (!container) return;
  container.innerHTML = WORKOUT_PROGRAMS.map(p =>
    '<button class="prog-tag-btn" onclick="applyProgram(\''+p.id+'\')">'+p.label+'</button>'
  ).join('');
}
window.renderProgramTags = renderProgramTags;

// ==================== ПАТЧ 3: ВКЛАДКИ + ИЗБРАННЫЕ ====================
// builderActiveTab объявлен в initBuilder

function renderBuilderTabs() {
  const tabsEl = document.getElementById('builder-tabs');
  if (!tabsEl) return;
  tabsEl.innerHTML =
    '<button class="bld-tab ' + (builderActiveTab==='muscles'?'bld-tab-active':'') + '" onclick="switchBuilderTab(\'muscles\')">🗂 По мышцам</button>' +
    '<button class="bld-tab ' + (builderActiveTab==='favorites'?'bld-tab-active':'') + '" onclick="switchBuilderTab(\'favorites\')">⭐ Избранные</button>';
}
window.renderBuilderTabs = renderBuilderTabs;

function switchBuilderTab(tab) {
  builderActiveTab = tab;
  renderBuilderTabs();
  const ms = document.getElementById('builder-muscle-section');
  const fs = document.getElementById('builder-fav-section');
  if (ms) ms.style.display = (tab === 'muscles') ? '' : 'none';
  if (fs) fs.style.display = (tab === 'favorites') ? '' : 'none';
  if (tab === 'favorites') renderBuilderFavorites();
}
window.switchBuilderTab = switchBuilderTab;

function renderBuilderFavorites() {
  const container = document.getElementById('builder-fav-list');
  if (!container) return;
  const favExs = JSON.parse(localStorage.getItem('fs-fav-exs') || '[]');
  if (!favExs.length) {
    container.innerHTML = '<div style="padding:24px;text-align:center;color:var(--text-muted);font-size:13px;line-height:1.6">Нет избранных упражнений.<br>Добавьте ⭐ в Энциклопедии.</div>';
    return;
  }
  const catLabels = {chest:'Грудные',back:'Спина',legs:'Ноги',shoulders:'Плечи',biceps:'Бицепс',triceps:'Трицепс',glutes:'Ягодицы',abs:'Пресс',forearms:'Предплечья',cardio:'Кардио'};
  let html = '';
  favExs.forEach(function(name) {
    let foundCat = null, foundEx = null;
    for (const [cat, exs] of Object.entries(ALL_EXERCISES)) {
      const ex = exs.find(e => e.n === name);
      if (ex) { foundCat = cat; foundEx = ex; break; }
    }
    if (!foundCat) return;
    const isChecked = pickerChecked[foundCat]?.has(name);
    const safeN = name.replace(/\\/g,'\\\\').replace(/'/g,"\\'");
    html += '<div class="ex-pick-row ' + (isChecked?'row-checked':'') + '" onclick="toggleFavEx(\''+foundCat+'\',\''+safeN+'\')">' +
      '<div class="ex-pick-row-top">' +
      '<div class="ex-pick-check ' + (isChecked?'checked':'') + '">' + (isChecked?'✓':'') + '</div>' +
      '<div class="ex-pick-info">' +
      '<div class="ex-pick-name">' + name + '</div>' +
      '<div style="font-size:11px;color:var(--text-muted);margin-top:2px">' + (catLabels[foundCat]||foundCat) + '</div>' +
      '</div></div></div>';
  });
  container.innerHTML = html || '<div style="padding:16px;text-align:center;color:var(--text-muted)">Упражнения не найдены</div>';
}
window.renderBuilderFavorites = renderBuilderFavorites;

function toggleFavEx(cat, name) {
  if (!pickerChecked[cat]) pickerChecked[cat] = new Set();
  if (pickerChecked[cat].has(name)) {
    pickerChecked[cat].delete(name);
  } else {
    pickerChecked[cat].add(name);
    if (!pickerParams[cat]) pickerParams[cat] = {};
    if (!pickerParams[cat][name]) {
      const ex = ALL_EXERCISES[cat]?.find(e => e.n === name);
      const lastKg = exlog[name]?.at(-1)?.kg ?? ex?.kg ?? 0;
      pickerParams[cat][name] = { s: ex?.s || 3, r: ex?.r || 12, kg: lastKg };
    }
  }
  renderBuilderFavorites();
  renderMuscleGrid();
  updateBldStartBar();
}
window.toggleFavEx = toggleFavEx;

// ==================== ПАТЧ 4: ЧАСТО ИСПОЛЬЗУЕМЫЕ ====================
function renderFrequentExs() {
  const container = document.getElementById('frequent-exs');
  if (!container) return;
  const topExs = Object.entries(exlog)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 8)
    .map(([name]) => name);
  if (!topExs.length) { container.style.display = 'none'; return; }
  container.style.display = '';
  let chipsHtml = '';
  topExs.forEach(function(name) {
    let foundCat = null;
    for (const [cat, exs] of Object.entries(ALL_EXERCISES)) {
      if (exs.find(e => e.n === name)) { foundCat = cat; break; }
    }
    if (!foundCat) return;
    const isChecked = pickerChecked[foundCat]?.has(name);
    const count = exlog[name]?.length || 0;
    const safeN = name.replace(/\\/g,'\\\\').replace(/'/g,"\\'");
    chipsHtml += '<div class="freq-ex-chip ' + (isChecked?'freq-ex-checked':'') + '" onclick="toggleFreqEx(\''+foundCat+'\',\''+safeN+'\')">' +
      (isChecked?'✓ ':'') + name +
      '<span style="font-size:10px;opacity:.6;margin-left:4px">' + count + '×</span></div>';
  });
  container.innerHTML =
    '<div style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.6px;margin-bottom:8px">🕐 Часто используемые</div>' +
    '<div style="display:flex;flex-wrap:wrap;gap:6px">' + chipsHtml + '</div>';
}
window.renderFrequentExs = renderFrequentExs;

function toggleFreqEx(cat, name) {
  if (!pickerChecked[cat]) pickerChecked[cat] = new Set();
  if (pickerChecked[cat].has(name)) {
    pickerChecked[cat].delete(name);
  } else {
    pickerChecked[cat].add(name);
    if (!pickerParams[cat]) pickerParams[cat] = {};
    if (!pickerParams[cat][name]) {
      const ex = ALL_EXERCISES[cat]?.find(e => e.n === name);
      const lastKg = exlog[name]?.at(-1)?.kg ?? ex?.kg ?? 0;
      pickerParams[cat][name] = { s: ex?.s || 3, r: ex?.r || 12, kg: lastKg };
    }
  }
  renderFrequentExs();
  renderMuscleGrid();
  updateBldStartBar();
}
window.toggleFreqEx = toggleFreqEx;


// ==================== ГОЛОСОВОЙ ВВОД ВО ВРЕМЯ ТРЕНИРОВКИ ====================
function handleVoiceForExecute(text) {
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

  const existingIdx = customWt.findIndex(e => e.n === found.n);
  if (existingIdx !== -1) {
    const ex = customWt[existingIdx];
    ex.s = sets;
    ex.r = reps;
    ex.kg = kg || found.kg;
    ex.setsdata = Array.from({ length: sets }, () => ({ r: reps, kg: kg || found.kg, done: false }));
    ex.done = false;
  } else {
    const newEx = {
      ...found,
      s: sets,
      r: reps,
      kg: kg || found.kg,
      setsdata: Array.from({ length: sets }, () => ({ r: reps, kg: kg || found.kg, done: false })),
      done: false
    };
    customWt.push(newEx);
  }

  renderExecute();
  if (typeof updateCtaLabel === 'function') updateCtaLabel();
  showVoiceResult('✅ ' + found.n + ' — ' + sets + '×' + reps + ((kg || found.kg) ? ' · ' + (kg || found.kg) + ' кг' : ''));
  toast('✅ Добавлено в тренировку: ' + found.n);
}
window.handleVoiceForExecute = handleVoiceForExecute;
