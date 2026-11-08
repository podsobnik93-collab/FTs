// voice.js - shared speech lifecycle and water commands.
(function(){
 'use strict';
 if(window.fsVoice){console.warn('voice.js: speech engine already loaded');return;}
 const VERSION='voice-module-5';
 let active=null,pending=null,serial=0,lastNativeEnd=null,restartDelay=120,micCheck=null;
 const events=[];
 const notify=text=>{if(typeof toast==='function')toast(text);};
 function trace(s,event,data={}){
  events.push({at:new Date().toISOString(),id:s?.id||0,key:s?.key||'',event,...data});if(events.length>120)events.shift();
  try{document.dispatchEvent(new CustomEvent('fsvoice:diagnostic'));}catch(e){}
 }
 function valid(s){try{return !document.hidden&&(!s.options.valid||s.options.valid());}catch(e){return false;}}
 function paint(s,state){
  trace(s,'state',{state});const b=s.options.button;
  if(b){b.classList.toggle('listening',state==='listening');b.classList.toggle('is-listening',state==='listening');b.setAttribute('aria-pressed',String(state==='listening'));b.setAttribute('aria-busy',String(state==='starting'||state==='stopping'));}
  try{s.options.onState?.(state);}catch(e){console.error('Voice state callback',e);}
 }
 function clear(s){['watchdog','deadline','release','retry','settle','startTimer'].forEach(k=>{clearTimeout(s[k]);s[k]=null;});}
 function detach(rec){if(rec)rec.onstart=rec.onresult=rec.onerror=rec.onend=rec.onspeechstart=rec.onspeechend=rec.onaudiostart=rec.onaudioend=null;}
 function drain(){if(active||!pending)return;const next=pending;pending=null;if(valid(next))launch(next);else finish(next);}
 function finish(s){
  if(s.finished)return;s.finished=true;clear(s);trace(s,'finish',{received:s.received,discard:s.discard});paint(s,'idle');
  if(active===s)active=null;
  try{s.options.onEnd?.();}catch(e){console.error('Voice cleanup',e);}drain();
 }
 function armRelease(s,rec,ms=3000){
  clearTimeout(s.release);s.release=setTimeout(()=>{
   if(s.finished||s.rec!==rec)return;
   trace(s,'release-timeout');s.discard=true;
   try{rec.abort();}catch(e){trace(s,'abort-exception',{name:e.name||'Error'});}
   if(s.finished||s.rec!==rec)return;
   s.release=setTimeout(()=>{
    if(s.finished||s.rec!==rec)return;
    trace(s,'missing-native-end');detach(rec);s.rec=null;
    const q=pending;pending=null;if(q)finish(q);
    notify('Микрофон не завершил запись. Нажмите ещё раз; если повторится — перезагрузите приложение.');finish(s);
   },1200);
  },ms);
 }
 function cancel(s,flush=false){
  if(!s||s.finished)return;if(!flush)s.discard=true;
  clearTimeout(s.startTimer);s.startTimer=null;if(s.stopping)return;
  trace(s,'cancel',{flush});s.stopping=true;clearTimeout(s.retry);clearTimeout(s.watchdog);clearTimeout(s.settle);s.retry=null;paint(s,'stopping');
  if(!s.rec||!s.nativeStarted){detach(s.rec);s.rec=null;finish(s);return;}
  const rec=s.rec;armRelease(s,rec);
  try{if(flush)rec.stop();else rec.abort();}catch(e){trace(s,'stop-exception',{name:e.name||'Error'});try{rec.abort();}catch(x){}}
 }
 function send(s,text){
  text=String(text||'').trim();if(!text||s.discard||s.finished||!valid(s)||(!s.options.continuous&&s.received))return;
  s.received=true;s.emptyEnds=0;trace(s,'deliver',{characters:text.length});
  try{s.options.onText(text);}catch(e){console.error('Voice result callback',e);notify('Не удалось обработать голосовую команду. Повторите.');}
 }
 function errorMessage(code){
  const messages={'not-allowed':'Нет доступа к микрофону. Проверьте разрешение для приложения или сайта.','service-not-allowed':'Браузер запретил распознавание речи.','audio-capture':'Микрофон недоступен или занят другим приложением.','network':'Ошибка сети при распознавании речи. Повторите запись.','language-not-supported':'Русский язык распознавания недоступен.','no-speech':'Не удалось расслышать речь. Нажмите микрофон и повторите.'};
  return messages[code]||'Не удалось включить распознавание речи. Нажмите микрофон ещё раз.';
 }
 function attempt(s){
  if(active!==s||s.finished||s.stopping||!valid(s)){finish(s);return;}
  let rec;try{const SR=window.SpeechRecognition||window.webkitSpeechRecognition;rec=new SR();}catch(e){notify(errorMessage('start'));finish(s);return;}
  s.rec=rec;s.nativeStarted=false;s.interim='';s.hadFinal=false;s.error=null;trace(s,'recognizer-created');const delivered=new Map();
  rec.lang='ru-RU';rec.continuous=!!s.options.continuous;rec.interimResults=true;rec.maxAlternatives=1;paint(s,'starting');
  clearTimeout(s.watchdog);s.watchdog=setTimeout(()=>{if(active===s&&!s.finished){trace(s,'startup-timeout');notify('Микрофон не ответил. Нажмите кнопку ещё раз.');cancel(s);}},8000);
  rec.onstart=()=>{
   if(active!==s||s.rec!==rec||s.finished)return;
   trace(s,'start');clearTimeout(s.watchdog);s.watchdog=null;
   if(s.stopping){try{rec.abort();}catch(e){}return;}
   paint(s,'listening');
   if(!s.options.continuous)s.watchdog=setTimeout(()=>{if(active===s&&!s.finished&&!s.received){trace(s,'result-timeout');notify('Распознавание не вернуло результат. Повторите запись.');cancel(s,true);}},12000);
  };
  rec.onaudiostart=()=>{if(s.rec===rec&&!s.finished)trace(s,'audiostart');};
  rec.onaudioend=()=>{if(s.rec===rec&&!s.finished)trace(s,'audioend');};
  rec.onspeechstart=()=>{if(s.rec===rec&&!s.finished)trace(s,'speechstart');};
  rec.onspeechend=()=>{if(s.rec!==rec||s.finished)return;trace(s,'speechend');if(!s.stopping&&!s.options.continuous)cancel(s,true);};
  rec.onresult=e=>{
   if(active!==s||s.rec!==rec||s.finished||s.discard||(!s.options.continuous&&s.received))return;
   if(!valid(s)){cancel(s);return;}
   const finals=[],partial=[];
   for(let i=0;i<e.results.length;i++){
    const r=e.results[i],text=r?.[0]?.transcript||'';
    if(r?.isFinal){if(delivered.get(i)!==text){delivered.set(i,text);s.hadFinal=true;finals.push(text);}}else if(text)partial.push(text);
   }
   s.interim=partial.join(' ').trim();trace(s,'result',{finals:finals.length,interim:partial.length,resultIndex:e.resultIndex??0});
   if(s.interim){
    try{s.options.onPreview?.(s.interim);}catch(x){console.error('Voice preview callback',x);}
    if(!s.options.continuous&&!s.stopping){clearTimeout(s.settle);s.settle=setTimeout(()=>{if(active===s&&!s.finished&&!s.stopping)cancel(s,true);},1800);}
   }
   if(finals.length){clearTimeout(s.settle);send(s,finals.join(' '));if(!s.options.continuous)cancel(s,true);}
  };
  rec.onerror=e=>{
   if(active!==s||s.rec!==rec||s.finished)return;if(s.stopping&&e.error==='aborted')return;
   s.error=e.error||'unknown';trace(s,'error',{code:s.error});
   if(s.error!=='no-speech'&&s.error!=='aborted'){notify(errorMessage(s.error));s.stopping=true;s.discard=true;paint(s,'stopping');}
   armRelease(s,rec,600);
  };
  rec.onend=()=>{
   if(active!==s||s.rec!==rec||s.finished)return;
   lastNativeEnd=Date.now();trace(s,'end');clearTimeout(s.watchdog);clearTimeout(s.release);clearTimeout(s.settle);detach(rec);s.rec=null;s.nativeStarted=false;
   if(s.options.interimFallback&&s.interim&&!s.error)send(s,s.interim);
   if(!s.received&&!s.discard&&s.interim&&!s.error&&valid(s)){trace(s,'unfinalized');try{s.options.onUnfinalized?.(s.interim);}catch(x){console.error('Voice unfinished callback',x);}}
   if(s.stopping||!valid(s)||s.error&&s.error!=='no-speech'){if(!s.received&&!s.discard&&!s.interim&&!s.error&&valid(s))notify(errorMessage('no-speech'));finish(s);return;}
   if(s.options.continuous&&Date.now()<s.endsAt){
    if(!s.hadFinal&&!s.interim)s.emptyEnds++;else s.emptyEnds=0;
    if(s.emptyEnds>=2){notify(errorMessage('no-speech'));finish(s);return;}
    paint(s,'starting');s.retry=setTimeout(()=>attempt(s),300);return;
   }
   if(!s.received)notify(errorMessage('no-speech'));finish(s);
  };
  function startNative(){
   s.startTimer=null;if(active!==s||s.finished||s.stopping||s.rec!==rec)return;
   if(!valid(s)){cancel(s);return;}trace(s,'start-call');s.nativeStarted=true;
   try{rec.start();}catch(e){trace(s,'start-exception',{name:e.name||'Error'});detach(rec);if(s.rec===rec)s.rec=null;s.nativeStarted=false;notify(errorMessage('start'));finish(s);}
  }
  const delay=lastNativeEnd===null?0:Math.max(0,restartDelay-(Date.now()-lastNativeEnd));
  if(delay){trace(s,'start-scheduled',{delay});s.startTimer=setTimeout(startNative,delay);}else startNative();
 }
 function launch(s){active=s;s.endsAt=Date.now()+(s.options.maxMs||60000);s.deadline=setTimeout(()=>cancel(s,true),s.options.maxMs||60000);attempt(s);}
 function toggle(key,options){
  if(micCheck){notify('Дождитесь завершения проверки микрофона или ответа на запрос разрешения.');return null;}
  if(pending?.key===key){const q=pending;pending=null;finish(q);return null;}
  if(active?.key===key&&!active.stopping){cancel(active,true);return null;}
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!SR){notify('Распознавание речи не поддерживается в этом браузере.');return null;}
  if(window.isSecureContext===false){notify('Для микрофона откройте приложение по HTTPS.');return null;}
  const s={id:++serial,key,options,rec:null,finished:false,stopping:false,discard:false,received:false,emptyEnds:0};trace(s,'request');
  const handle={stop:()=>cancel(s,true),abort:()=>cancel(s,false)};s.handle=handle;
  if(pending){const q=pending;pending=null;finish(q);}
  if(active){pending=s;cancel(active);}else launch(s);
  return s.finished?null:handle;
 }

 function checkMicrophone(){
  if(micCheck)return Promise.resolve({status:'busy'});
  if(active||pending)return Promise.resolve({status:'recording'});
  if(document.hidden)return Promise.resolve({status:'hidden'});
  if(window.isSecureContext===false||!navigator.mediaDevices?.getUserMedia)return Promise.resolve({status:'unsupported'});
  const t={state:'requesting',done:false};micCheck=t;
  const result=new Promise(resolve=>{t.resolve=resolve;});
  t.report=r=>{try{document.dispatchEvent(new CustomEvent('fsvoice:mic-check',{detail:r}));}catch(e){}if(!t.done){t.done=true;t.resolve(r);}};
  trace(null,'mic-check-request');
  t.timer=setTimeout(()=>{if(micCheck!==t)return;t.state='waiting';trace(null,'mic-check-timeout');t.report({status:'timeout'});},8000);
  let request;try{request=navigator.mediaDevices.getUserMedia({audio:true});}catch(e){request=Promise.reject(e);}
  Promise.resolve(request).then(stream=>{
   clearTimeout(t.timer);let count=0,ok=true;const late=t.state!=='requesting';
   try{for(const track of stream.getTracks()){try{track.stop();count++;}catch(e){ok=false;}}}catch(e){ok=false;}
   trace(null,'mic-check-tracks-stopped',{count,late,ok});
   if(ok){if(micCheck===t)micCheck=null;t.report({status:late?'released':'ready'});}
   else{t.state='cleanup-failed';t.report({status:'cleanup-failed'});}
  },e=>{clearTimeout(t.timer);if(micCheck===t)micCheck=null;trace(null,'mic-check-error',{name:e?.name||'Error'});t.report({status:'error',name:e?.name||'Error'});});
  return result;
 }
 function cancelMicrophoneCheck(){if(!micCheck||micCheck.state==='cleanup-failed')return;const t=micCheck;clearTimeout(t.timer);t.state='cancelled';trace(null,'mic-check-cancel');t.report({status:'cancelled'});}

 function stop(key,flush=false){
  if(!key)cancelMicrophoneCheck();
  if(pending&&(!key||pending.key===key)){const q=pending;pending=null;finish(q);}
  if(active&&(!key||active.key===key))cancel(active,flush);
 }
 window.fsVoice={version:VERSION,toggle,stop,checkMicrophone,cancelMicrophoneCheck,isCheckingMicrophone:()=>!!micCheck,
  isActive:key=>!!((active&&!active.finished&&active.key===key)||(pending&&pending.key===key)),
  getDiagnostics:()=>({version:VERSION,restartDelay,microphoneCheck:micCheck?.state||'idle',events:events.map(e=>({...e}))}),
  setRestartDelay:ms=>{restartDelay=Math.max(0,Math.min(500,Number(ms)||0));},
  clearDiagnostics:()=>{events.length=0;trace(null,'log-cleared');}
 };
 document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
 window.addEventListener('pagehide',()=>stop());
})();

(function(){
 'use strict';
 if(window._fsWaterVoiceInstalled)return;window._fsWaterVoiceInstalled=true;
 let waterMicActive=false,waterRec=null;
const WATER_DRINK_MAP = [
  { keys: ['минеральн', 'минералка', 'минеральную'],       label: 'Минеральная вода' },
  { keys: ['травяной', 'травяного', 'травяной чай'],       label: 'Травяной чай' },
  { keys: ['компот'],                                       label: 'Компот' },
  { keys: ['молоко', 'кефир', 'молока', 'кефира'],         label: 'Молоко/кефир' },
  { keys: ['йогурт', 'йогурта'],                           label: 'Йогурт' },
  { keys: ['сок', 'сока', 'натуральный сок'],              label: 'Сок натуральный' },
  { keys: ['зелёный чай', 'зеленый чай', 'зелёного'],     label: 'Зелёный чай' },
  { keys: ['чёрный чай', 'черный чай', 'чёрного чая'],    label: 'Чёрный чай' },
  { keys: ['лимонад'],                                     label: 'Лимонад' },
  { keys: ['какао'],                                       label: 'Какао' },
  { keys: ['латте', 'лате'],                               label: 'Латте' },
  { keys: ['капучино', 'капуччино'],                       label: 'Капучино' },
  { keys: ['кофе', 'кофейку', 'кофея'],                   label: 'Кофе' },
  { keys: ['газировка', 'газировки', 'газированн'],        label: 'Газировка' },
  { keys: ['кола', 'колы', 'кока-кола', 'пепси'],         label: 'Кола' },
  { keys: ['квас', 'кваса'],                               label: 'Квас' },
  { keys: ['энергетик', 'энергетика', 'энерджи'],         label: 'Энергетик' },
  { keys: ['пиво', 'пива', 'пивка'],                      label: 'Пиво' },
  { keys: ['чай'],                                         label: 'Чёрный чай' },
  { keys: ['вода', 'воды', 'водички', 'водичку'],         label: 'Вода' },
];

// Карта объёмов: слова → мл
const WATER_ML_MAP = {
  'стакан': 250, 'стаканчик': 200, 'кружка': 300, 'кружку': 300,
  'чашка': 220, 'чашку': 220, 'бутылка': 500, 'бутылку': 500,
  'поллитра': 500, 'пол-литра': 500, 'литр': 1000, 'литра': 1000,
  'полстакана': 125, 'банка': 330, 'банку': 330, 'баночка': 330
};


 function waterVoiceStatus(text){const el=document.getElementById('water-voice-status');if(el){el.hidden=!text;el.textContent=text;}}
 function renderWaterVoiceDiagnostics(){
  const panel=document.getElementById('water-voice-diagnostics'),out=document.getElementById('water-voice-log');
  if(panel?.open&&out&&window.fsVoice?.getDiagnostics)out.value=JSON.stringify(window.fsVoice.getDiagnostics(),null,2);
 }
 async function copyWaterVoiceDiagnostics(){
  const panel=document.getElementById('water-voice-diagnostics'),out=document.getElementById('water-voice-log'),button=document.getElementById('water-voice-copy');
  if(panel)panel.open=true;renderWaterVoiceDiagnostics();if(!out)return;
  try{if(!navigator.clipboard?.writeText)throw new Error('Clipboard unavailable');await navigator.clipboard.writeText(out.value);if(button)button.textContent='Скопировано';}
  catch(e){out.focus();out.select();if(button)button.textContent='Выделено — скопируйте вручную';}
 }
 document.addEventListener('fsvoice:diagnostic',renderWaterVoiceDiagnostics);
 function parseWaterVoice(spoken){
  const text=String(spoken||'').toLowerCase().replace(/ё/g,'е').trim();
  const drink=WATER_DRINK_MAP.find(entry=>entry.keys.some(k=>text.includes(k.replace(/ё/g,'е'))));
  let ml=null;
  const literal=text.match(/(?:^|[^\d])(\d+(?:[.,]\d+)?)\s*(литр[а-я]*|л(?=$|[\s.,!?])|миллилитр[а-я]*|мл(?=$|[\s.,!?]))?/u);
  if(literal){ml=Number(literal[1].replace(',','.'));if(literal[2]&&/^л/.test(literal[2]))ml*=1000;}
  if(ml===null){
   const quantity=Object.entries(WATER_ML_MAP).sort((a,b)=>b[0].length-a[0].length).find(([word])=>new RegExp('(^|[^а-я])'+word+'(?=$|[^а-я])','u').test(text));
   if(quantity)ml=quantity[1];
  }
  if(ml===null){
   const nums={'ноль':0,'один':1,'одна':1,'одну':1,'два':2,'две':2,'три':3,'четыре':4,'пять':5,'шесть':6,'семь':7,'восемь':8,'девять':9,'десять':10,'одиннадцать':11,'двенадцать':12,'тринадцать':13,'четырнадцать':14,'пятнадцать':15,'шестнадцать':16,'семнадцать':17,'восемнадцать':18,'девятнадцать':19,'двадцать':20,'тридцать':30,'сорок':40,'пятьдесят':50,'шестьдесят':60,'семьдесят':70,'восемьдесят':80,'девяносто':90,'сто':100,'двести':200,'триста':300,'четыреста':400,'пятьсот':500,'шестьсот':600,'семьсот':700,'восемьсот':800,'девятьсот':900};
   let n=0,found=false;for(const word of text.split(/[^а-я]+/u)){if(Object.prototype.hasOwnProperty.call(nums,word)){n+=nums[word];found=true;}}if(found)ml=n;
  }
  return {drink:drink?.label||null,ml:ml===null?null:Math.round(ml)};
 }
 function applyWaterVoiceFields(command){
  const type=document.getElementById('water-drink-type'),volume=document.getElementById('water-add-val');if(!type||!volume)return false;
  if(command.drink){const index=Array.from(type.options).findIndex(o=>o.text===command.drink);if(index<0)return false;type.selectedIndex=index;}
  if(command.ml!==null){
   if(!Number.isFinite(command.ml)||command.ml<10||command.ml>5000)return false;
   let option=Array.from(volume.options).find(o=>Number(o.value)===command.ml);
   if(!option){Array.from(volume.options).filter(o=>o.dataset.voice==='true').forEach(o=>o.remove());option=document.createElement('option');option.value=String(command.ml);option.textContent=command.ml+' мл';option.dataset.voice='true';volume.appendChild(option);}
   volume.value=String(command.ml);
  }
  return true;
 }
 function startWaterVoice(){
  if(!window.fsVoice){if(typeof toast==='function')toast('Голосовой модуль ещё не загружен. Повторите.');return;}
  const button=document.getElementById('water-mic-btn');let outcome=false;
  if(!window.fsVoice.isActive('water'))waterVoiceStatus('Включаю микрофон…');
  waterRec=window.fsVoice.toggle('water',{
   button,maxMs:15000,
   valid:()=>typeof currentPage!=='undefined'&&currentPage==='home'&&!!document.getElementById('water-mic-btn'),
   onState:state=>{waterMicActive=state==='listening';if(state==='listening')waterVoiceStatus('Слушаю. Скажите, например: «Кофе 100».');else if(state==='starting')waterVoiceStatus('Включаю микрофон…');else if(state==='stopping'&&!outcome)waterVoiceStatus('Завершаю распознавание…');},
   onPreview:text=>waterVoiceStatus('Распознаю: «'+text+'»'),
   onUnfinalized:text=>{
    outcome=true;const command=parseWaterVoice(text);
    if(command.drink&&command.ml!==null&&applyWaterVoiceFields(command))waterVoiceStatus('Не получен окончательный результат: «'+text+'». Проверьте напиток и объём, затем нажмите «Выпил». Автоматически не добавлено.');
    else waterVoiceStatus('Не удалось подтвердить: «'+text+'». Повторите запись.');
   },
   onEnd:()=>{waterMicActive=false;waterRec=null;if(!outcome)waterVoiceStatus('Запись завершена без добавления. Повторите или откройте «Диагностика микрофона».');},
   onText:spoken=>{
    outcome=true;const command=parseWaterVoice(spoken);
    if(!command.drink&&command.ml===null){waterVoiceStatus('Не разобрал: «'+spoken+'». Скажите напиток и объём.');return;}
    if(!applyWaterVoiceFields(command)){waterVoiceStatus('Не удалось заполнить: «'+spoken+'». Укажите объём от 10 до 5000 мл.');return;}
    if(command.ml===null){waterVoiceStatus('Напиток выбран. Назовите объём или выберите его и нажмите «Выпил».');return;}
    addWaterDrink(1);
    const type=document.getElementById('water-drink-type');waterVoiceStatus('Добавлено: '+(command.drink||type?.options[type.selectedIndex]?.text||'напиток')+' '+command.ml+' мл. Для следующей записи нажмите микрофон.');
   }
  });
 }
 window.startWaterVoice=startWaterVoice;
 window.renderWaterVoiceDiagnostics=renderWaterVoiceDiagnostics;
 window.copyWaterVoiceDiagnostics=copyWaterVoiceDiagnostics;
})();

// Install the manual check into the existing diagnostics panel; no HTML replacement.
(function(){
 function install(){
  const panel=document.getElementById('water-voice-diagnostics');if(!panel||document.getElementById('water-mic-check'))return;
  const button=document.createElement('button'),status=document.createElement('p');
  button.id='water-mic-check';button.type='button';button.textContent='Проверить перезапуск микрофона';
  button.style.cssText='margin:8px 0;padding:8px 12px;border:1px solid var(--border);border-radius:8px;background:var(--input-bg);color:var(--text)';
  status.id='water-mic-check-status';status.setAttribute('role','status');status.setAttribute('aria-live','polite');
  status.textContent='Проверка выполняется только по нажатию. Полученные треки сразу останавливаются. Аудио проверкой не сохраняется и не отправляется.';
  const messages={ready:'Микрофон открыт, треки остановлены. Теперь отдельно нажмите микрофон и повторите команду. Это не гарантия исправления распознавания.',released:'Поздний поток закрыт. Можно повторить обычную запись.',timeout:'Нет ответа за 8 секунд. Ответьте на запрос разрешения; до его завершения запись заблокирована. Если запроса нет — перезагрузите приложение.',busy:'Предыдущий запрос микрофона ещё не завершён. Ответьте на запрос разрешения или перезагрузите приложение.',recording:'Сначала остановите запись и дождитесь её завершения.',hidden:'Вернитесь в приложение и повторите проверку.',unsupported:'Проверка недоступна: нужны HTTPS и поддержка getUserMedia.',cancelled:'Проверка отменена. Поздний поток будет закрыт автоматически. Если запрос разрешения открыт, ответьте на него.','cleanup-failed':'Не удалось остановить поток. Перезагрузите приложение перед новой записью.'};
  function show(r){button.disabled=false;status.textContent=r.status==='error'?'Не удалось открыть микрофон: '+r.name:messages[r.status]||'Проверка завершена.';window.renderWaterVoiceDiagnostics?.();}
  document.addEventListener('fsvoice:mic-check',e=>show(e.detail));
  button.onclick=async()=>{button.disabled=true;status.textContent='Проверяю доступ. При необходимости ответьте на запрос разрешения…';show(await window.fsVoice.checkMicrophone());};
  panel.appendChild(button);panel.appendChild(status);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
