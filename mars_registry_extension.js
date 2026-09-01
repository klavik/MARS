
(function(){
'use strict';

/* The extension intentionally does not change any function, state object or DOM
   mechanics of the existing monitoring prototype. It only hides/shows the
   original nav/main when switching top-level product sections. */

const X = {
  top:'monitoring',
  registryTab:'objects',
  adminTab:'registry-settings',
  registrySettingsTab:'types',
  search:'',
  typeFilter:'all',
  modalMode:null,
  editRuleId:null,
  editRelationTypeId:null,
  editObjectType:null
};

const objectTypes = {
  Host:{
    label:'Host',
    attrs:[
      {id:'name',label:'Имя',type:'String',required:true},
      {id:'fqdn',label:'FQDN',type:'String'},
      {id:'ip',label:'IP',type:'String'},
      {id:'environment',label:'Окружение',type:'String'},
      {id:'owner',label:'Ответственный',type:'String'},
      {id:'informationSystemId',label:'ID информационной системы',type:'String'}
    ]
  },
  InformationSystem:{
    label:'InformationSystem',
    attrs:[
      {id:'name',label:'Имя',type:'String',required:true},
      {id:'externalId',label:'External ID',type:'String'},
      {id:'criticality',label:'Критичность',type:'String'},
      {id:'owner',label:'Ответственный',type:'String'}
    ]
  },
  Database:{
    label:'Database',
    attrs:[
      {id:'name',label:'Имя',type:'String',required:true},
      {id:'hostName',label:'Host name',type:'String'},
      {id:'engine',label:'СУБД',type:'String'},
      {id:'environment',label:'Окружение',type:'String'}
    ]
  },
  Application:{
    label:'Application',
    attrs:[
      {id:'name',label:'Имя',type:'String',required:true},
      {id:'databaseName',label:'Database name',type:'String'},
      {id:'informationSystemId',label:'ID информационной системы',type:'String'},
      {id:'owner',label:'Ответственный',type:'String'}
    ]
  }
};

let relationTypes = [
  {id:'rt-belongs',name:'Относится к',reverse:'Содержит',system:true,active:true},
  {id:'rt-hosted',name:'Размещён на',reverse:'Размещает',system:true,active:true},
  {id:'rt-runs',name:'Работает на',reverse:'Запускает',system:true,active:true},
  {id:'rt-uses',name:'Использует',reverse:'Используется',system:true,active:true},
  {id:'rt-depends',name:'Зависит от',reverse:'Имеет зависимость',system:true,active:true},
  {id:'rt-partof',name:'Является частью',reverse:'Состоит из',system:true,active:true}
];

let rules = [
  {id:'RR-001',name:'Host → ИТ-система по systemId',sourceType:'Host',sourceAttr:'informationSystemId',operator:'=',targetType:'InformationSystem',targetAttr:'externalId',relationTypeId:'rt-belongs',multiplicity:'one',active:true,formed:1180,missing:61,ambiguous:13},
  {id:'RR-002',name:'Database → Host по имени хоста',sourceType:'Database',sourceAttr:'hostName',operator:'=',targetType:'Host',targetAttr:'name',relationTypeId:'rt-hosted',multiplicity:'one',active:true,formed:322,missing:8,ambiguous:2},
  {id:'RR-003',name:'Application → Database',sourceType:'Application',sourceAttr:'databaseName',operator:'=',targetType:'Database',targetAttr:'name',relationTypeId:'rt-uses',multiplicity:'many',active:false,formed:0,missing:0,ambiguous:0}
];

let mappings = [
  {type:'Host',attr:'name',source:'Galaxy',collection:'HOSTOS',field:'name',enabled:true},
  {type:'Host',attr:'fqdn',source:'Galaxy',collection:'HOSTOS',field:'fqdn',enabled:true},
  {type:'Host',attr:'ip',source:'Galaxy',collection:'HOSTOS',field:'ip',enabled:true},
  {type:'Host',attr:'environment',source:'Galaxy',collection:'HOSTOS',field:'hostcienvtype',enabled:true},
  {type:'Host',attr:'owner',source:'Galaxy',collection:'HOSTOS',field:'owner',enabled:true},
  {type:'Host',attr:'informationSystemId',source:'Galaxy',collection:'HOSTOS',field:'itsysrisid',enabled:true}
];

let objects = [
  {id:'OBJ-H-100',type:'Host',name:'web-prod-01',source:'Galaxy/HOSTOS',externalId:'srv-1001',
   values:{fqdn:'web-prod-01.example.internal',ip:'10.0.1.50',environment:'prod',owner:'Linux Platform',informationSystemId:'IS-101'},
   raw:{environment:'prod'}, manual:{}, relations:[
     {dir:'out',type:'Относится к',object:'Payments',objectType:'InformationSystem',rule:'Host → ИТ-система по systemId'}
   ]},
  {id:'OBJ-H-101',type:'Host',name:'db-analytics',source:'Galaxy/HOSTOS',externalId:'srv-1002',
   values:{fqdn:'db-analytics.internal.example.com',ip:'10.0.3.17',environment:'test',owner:'DB Team',informationSystemId:'IS-202'},
   raw:{environment:'prod'}, manual:{environment:'test'}, relations:[
     {dir:'out',type:'Относится к',object:'Analytics Platform',objectType:'InformationSystem',rule:'Host → ИТ-система по systemId'},
     {dir:'in',type:'Размещён на',object:'orders',objectType:'Database',rule:'Database → Host по имени хоста'}
   ]},
  {id:'OBJ-H-102',type:'Host',name:'cache-01',source:'Manual',externalId:'',
   values:{fqdn:'',ip:'192.168.1.10',environment:'stage',owner:'Linux Platform',informationSystemId:''},
   raw:{}, manual:{environment:'stage',owner:'Linux Platform'}, relations:[]},
  {id:'OBJ-IS-200',type:'InformationSystem',name:'Payments',source:'Manual',externalId:'IS-101',
   values:{externalId:'IS-101',criticality:'Высокая',owner:'Payments Team'},raw:{},manual:{criticality:'Высокая',owner:'Payments Team'},relations:[
     {dir:'in',type:'Относится к',object:'web-prod-01',objectType:'Host',rule:'Host → ИТ-система по systemId'}
   ]},
  {id:'OBJ-DB-300',type:'Database',name:'orders',source:'Manual',externalId:'',
   values:{hostName:'db-analytics',engine:'PostgreSQL',environment:'prod'},raw:{},manual:{hostName:'db-analytics',engine:'PostgreSQL',environment:'prod'},relations:[
     {dir:'out',type:'Размещён на',object:'db-analytics',objectType:'Host',rule:'Database → Host по имени хоста'}
   ]}
];

const qs=(s,r=document)=>r.querySelector(s);
const qsa=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=v=>String(v??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const uid=p=>p+'-'+Math.random().toString(36).slice(2,8).toUpperCase();

function typeAttrs(type){return objectTypes[type]?.attrs||[]}
function attrLabel(type,id){return typeAttrs(type).find(a=>a.id===id)?.label||id}
function relType(id){return relationTypes.find(x=>x.id===id)}

function toast(msg){
  const e=qs('#marsx-toast'); if(!e)return;
  e.textContent=msg;e.classList.add('marsx-show');
  setTimeout(()=>e.classList.remove('marsx-show'),2400);
}

function modal(title,sub,body,foot,small=false){
  qs('#marsx-modal-title').textContent=title;
  qs('#marsx-modal-sub').textContent=sub||'';
  qs('#marsx-modal-body').innerHTML=body;
  qs('#marsx-modal-foot').innerHTML=foot||'<button class="marsx-btn" data-x-close>Закрыть</button>';
  qs('#marsx-modal').classList.toggle('marsx-small',!!small);
  qs('#marsx-modal-wrap').classList.add('marsx-show');
}
function closeModal(){qs('#marsx-modal-wrap').classList.remove('marsx-show')}

function installShell(){
  if(qs('#marsx-shell'))return;
  document.body.classList.add('marsx-with-shell','marsx-monitoring');

  const shell=document.createElement('div');
  shell.id='marsx-shell';
  shell.innerHTML=`
    <div class="marsx-shell-inner">
      <div class="marsx-shell-brand">MARS · продуктовые разделы</div>
      <div class="marsx-shell-nav">
        <button class="marsx-shell-btn marsx-active" data-x-top="monitoring">Постановка на мониторинг</button>
        <button class="marsx-shell-btn" data-x-top="registry">Реестр объектов мониторинга</button>
        <button class="marsx-shell-btn" data-x-top="admin">⚙️ Администрирование</button>
      </div>
    </div>`;
  document.body.insertBefore(shell,document.body.firstChild);

  const root=document.createElement('div');
  root.id='marsx-root';
  const originalMain=qs('body > main');
  if(originalMain) originalMain.insertAdjacentElement('afterend',root); else document.body.appendChild(root);

  const mw=document.createElement('div');
  mw.id='marsx-modal-wrap';mw.className='marsx-modal-wrap';
  mw.innerHTML=`<div id="marsx-modal" class="marsx-modal"><div class="marsx-modal-head"><div><div id="marsx-modal-title" class="marsx-modal-title"></div><div id="marsx-modal-sub" class="marsx-modal-sub"></div></div><button class="marsx-btn marsx-ghost" data-x-close>✕</button></div><div id="marsx-modal-body" class="marsx-modal-body"></div><div id="marsx-modal-foot" class="marsx-modal-foot"></div></div>`;
  document.body.appendChild(mw);
  const t=document.createElement('div');t.id='marsx-toast';t.className='marsx-toast';document.body.appendChild(t);

  shell.addEventListener('click',e=>{
    const b=e.target.closest('[data-x-top]'); if(!b)return;
    setTop(b.dataset.xTop);
  });
  document.addEventListener('click',e=>{
    if(e.target.closest('[data-x-close]')) closeModal();
    const obj=e.target.closest('[data-x-object]'); if(obj) openObject(obj.dataset.xObject);
  });
}

function setTop(top){
  X.top=top;
  document.body.classList.remove('marsx-monitoring','marsx-registry','marsx-admin');
  document.body.classList.add('marsx-'+top);
  qsa('[data-x-top]').forEach(b=>b.classList.toggle('marsx-active',b.dataset.xTop===top));
  if(top!=='monitoring') renderRoot();
}

function renderRoot(){
  if(X.top==='registry') renderRegistry();
  else if(X.top==='admin') renderAdmin();
}

function page(title,sub,actions,body){
  qs('#marsx-root').innerHTML=`<div class="marsx-page-head"><div><h1 class="marsx-title">${title}</h1><div class="marsx-sub">${sub||''}</div></div><div class="marsx-actions">${actions||''}</div></div>${body}`;
}

function renderRegistry(){
  const filtered=objects.filter(o=>{
    const q=X.search.toLowerCase();
    const matchType=X.typeFilter==='all'||o.type===X.typeFilter;
    const bag=[o.id,o.type,o.name,o.source,o.externalId,...Object.values(o.values||{})].join(' ').toLowerCase();
    return matchType&&(!q||bag.includes(q));
  });
  const actions=`<button class="marsx-btn" data-x-create-object>➕ Создать объект</button>`;
  const typeOptions=['all',...Object.keys(objectTypes)].map(t=>`<option value="${t}" ${X.typeFilter===t?'selected':''}>${t==='all'?'Все типы':esc(t)}</option>`).join('');
  const body=`<div class="marsx-panel">
    <div class="marsx-info"><b>Реестр объектов мониторинга — пользовательский раздел.</b> Здесь работают с объектами и уже сформированным контекстом. Настройка типов, mapping и правил связей вынесена в «Администрирование».</div>
    <div class="marsx-toolbar"><div class="marsx-actions"><input id="marsx-reg-search" class="marsx-input marsx-search" value="${esc(X.search)}" placeholder="Поиск по объектам…"><select id="marsx-reg-type" class="marsx-select">${typeOptions}</select></div></div>
    <div class="marsx-stats"><div class="marsx-stat"><label>Всего объектов</label><b>${objects.length}</b></div><div class="marsx-stat"><label>Host</label><b>${objects.filter(x=>x.type==='Host').length}</b></div><div class="marsx-stat"><label>С внешним источником</label><b>${objects.filter(x=>x.source!=='Manual').length}</b></div><div class="marsx-stat"><label>С ручными override</label><b>${objects.filter(x=>Object.keys(x.manual||{}).some(k=>x.raw&&k in x.raw)).length}</b></div></div>
    <div class="marsx-table-wrap"><table class="marsx-table"><thead><tr><th>Object ID</th><th>Имя</th><th>Тип</th><th>Источник</th><th>External ID</th><th>Окружение</th><th>Связи</th></tr></thead><tbody>
    ${filtered.length?filtered.map(o=>`<tr data-object-id="${esc(o.id)}" data-x-object="${esc(o.id)}"><td><div class="marsx-cell-title marsx-mono">${esc(o.id)}</div></td><td><div class="marsx-cell-title">${esc(o.name)}</div></td><td><span class="marsx-badge marsx-b-blue">${esc(o.type)}</span></td><td>${o.source==='Manual'?'<span class="marsx-badge">✍️ Manual</span>':'<span class="marsx-badge marsx-b-violet">📚 '+esc(o.source)+'</span>'}</td><td class="marsx-mono">${esc(o.externalId||'—')}</td><td>${renderEffectiveCell(o,'environment')}</td><td><span class="marsx-badge marsx-b-green">🔗 ${(o.relations||[]).length}</span></td></tr>`).join(''):`<tr><td colspan="7" class="marsx-empty">Объекты не найдены</td></tr>`}
    </tbody></table></div>
  </div>`;
  page('Реестр объектов мониторинга','Объекты MARS, effective-атрибуты, источники и сформированные связи.',actions,body);
  const s=qs('#marsx-reg-search'); if(s)s.oninput=()=>{X.search=s.value;renderRegistry()};
  const f=qs('#marsx-reg-type'); if(f)f.onchange=()=>{X.typeFilter=f.value;renderRegistry()};
  const c=qs('[data-x-create-object]');if(c)c.onclick=openCreateObject;
}

function renderEffectiveCell(o,attr){
  const v=o.values?.[attr];if(v===undefined||v==='')return '<span class="marsx-muted">—</span>';
  const isOverride=o.manual&&attr in o.manual&&o.raw&&attr in o.raw;
  return `<b>${esc(v)}</b>${isOverride?' <span class="marsx-badge marsx-b-amber">Override</span>':''}`;
}

function openObject(id){
  const o=objects.find(x=>x.id===id);if(!o)return;
  const attrs=typeAttrs(o.type);
  const attrRows=attrs.map(a=>{
    const eff=(a.id==='name'?o.name:o.values?.[a.id])??'';
    const manual=o.manual?.[a.id];
    const external=o.raw?.[a.id];
    const override=manual!==undefined&&external!==undefined;
    let src='—';
    if(override)src=`<span class="marsx-badge marsx-b-amber">Переопределено вручную</span>`;
    else if(manual!==undefined)src=`<span class="marsx-badge">Manual</span>`;
    else if(external!==undefined||o.source!=='Manual')src=`<span class="marsx-badge marsx-b-violet">${esc(o.source)}</span>`;
    return `<tr><td><b>${esc(a.label)}</b><div class="marsx-cell-sub marsx-mono">${esc(a.id)}</div></td><td><b>${esc(eff||'—')}</b></td><td>${src}</td><td>${override?`External: <span class="marsx-mono">${esc(external)}</span><br>Manual: <span class="marsx-mono">${esc(manual)}</span>`:'<span class="marsx-muted">—</span>'}</td></tr>`;
  }).join('');
  const relations=(o.relations||[]).map(r=>`<div class="marsx-card"><div class="marsx-card-main"><span class="marsx-icon">${r.dir==='out'?'➡️':'⬅️'}</span><div><div class="marsx-card-title">${esc(r.objectType)}: ${esc(r.object)}</div><div class="marsx-meta">${r.dir==='out'?'Исходящая':'Входящая'} · <b>${esc(r.type)}</b><br>Сформировано правилом: ${esc(r.rule)}</div></div></div></div>`).join('')||'<div class="marsx-empty">Связи не сформированы</div>';
  modal(`${o.type}: ${o.name}`,`${o.id}${o.externalId?' · External ID: '+o.externalId:''}`,`
    <div class="marsx-box marsx-bluebox"><b>Идентичность объекта:</b> <span class="marsx-mono">${esc(o.id)}</span><br><span class="marsx-hint">object_id остаётся постоянным при изменении имени, IP/FQDN и других атрибутов.</span></div>
    <h3>Effective-атрибуты</h3>
    <div class="marsx-table-wrap" style="max-height:none"><table class="marsx-table" style="min-width:700px"><thead><tr><th>Атрибут</th><th>Effective value</th><th>Источник effective</th><th>Детали override</th></tr></thead><tbody>${attrRows}</tbody></table></div>
    <h3 style="margin-top:20px">Связанные объекты</h3>${relations}
  `,`<button class="marsx-btn marsx-outline" data-x-close>Закрыть</button>`);
}

function openCreateObject(){
  const first=Object.keys(objectTypes)[0];
  modal('Создать объект мониторинга','Ручное создание объекта MARS. Manual не означает Override.',`
    <div class="marsx-row"><div class="marsx-field"><label>Тип объекта *</label><select id="marsx-new-object-type" class="marsx-select marsx-wide">${Object.keys(objectTypes).map(t=>`<option value="${esc(t)}">${esc(t)}</option>`).join('')}</select></div><div class="marsx-field"><label>Имя *</label><input id="marsx-new-object-name" class="marsx-input marsx-wide"></div></div>
    <div id="marsx-new-object-attrs"></div>
    <div class="marsx-box marsx-bluebox"><b>Важно:</b> значения создаются с источником Manual. Они станут Override только если позже внешний источник принесёт для этого же объекта другое значение того же логического атрибута.</div>
  `,`<button class="marsx-btn marsx-ghost" data-x-close>Отмена</button><button class="marsx-btn" id="marsx-save-object">Создать</button>`);
  const typeSel=qs('#marsx-new-object-type');
  const renderAttrs=()=>{
    const t=typeSel.value;
    qs('#marsx-new-object-attrs').innerHTML=`<h3>Атрибуты ${esc(t)}</h3>${typeAttrs(t).filter(a=>a.id!=='name').map(a=>`<div class="marsx-field"><label>${esc(a.label)}</label><input class="marsx-input marsx-wide" data-x-new-attr="${esc(a.id)}"></div>`).join('')}`;
  };
  typeSel.onchange=renderAttrs;renderAttrs();
  qs('#marsx-save-object').onclick=()=>{
    const type=typeSel.value,name=qs('#marsx-new-object-name').value.trim();if(!name)return toast('Введите имя');
    if(objects.some(o=>o.type===type&&o.name.toLowerCase()===name.toLowerCase()))return toast('Объект с таким name + type уже существует');
    const vals={},manual={};
    qsa('[data-x-new-attr]').forEach(i=>{if(i.value.trim()){vals[i.dataset.xNewAttr]=i.value.trim();manual[i.dataset.xNewAttr]=i.value.trim()}});
    const prefix=type==='Host'?'H':type==='InformationSystem'?'IS':type==='Database'?'DB':'APP';
    objects.push({id:'OBJ-'+prefix+'-'+String(objects.length+101),type,name,source:'Manual',externalId:'',values:vals,raw:{},manual,relations:[]});
    closeModal();renderRegistry();toast('Объект создан');
  };
}

function renderAdmin(){
  const topTabs=`<div class="marsx-tabs"><button class="marsx-btn marsx-tabbtn ${X.adminTab==='data'?'marsx-active':''}" data-x-admin="data">Сбор данных</button><button class="marsx-btn marsx-tabbtn ${X.adminTab==='registry-settings'?'marsx-active':''}" data-x-admin="registry-settings">Настройки реестра объектов мониторинга</button></div>`;
  let body='';
  if(X.adminTab==='data')body=renderDataCollectionAdmin();
  else body=renderRegistrySettings();
  page('⚙️ Администрирование','Административные настройки MARS. Пользовательские рабочие разделы вынесены отдельно.','',`<div class="marsx-panel">${topTabs}${body}</div>`);
  qsa('[data-x-admin]').forEach(b=>b.onclick=()=>{X.adminTab=b.dataset.xAdmin;renderAdmin()});
}

function renderDataCollectionAdmin(){
  return `<div class="marsx-info"><b>Сбор данных — административная часть постановки на мониторинг.</b> Пользовательская механика существующего раздела «Постановка на мониторинг» не переносится и не меняется.</div>
    <div class="marsx-content"><div class="marsx-grid-cards">
      <div class="marsx-card"><div class="marsx-card-main"><span class="marsx-icon">📚</span><div><div class="marsx-card-title">Источники инфраструктурных данных</div><div class="marsx-meta">CMDB Main · используется текущим сценарием справочных Host.</div><div class="marsx-pills"><span class="marsx-badge marsx-b-green">Активен</span></div></div></div></div>
      <div class="marsx-card"><div class="marsx-card-main"><span class="marsx-icon">🌐</span><div><div class="marsx-card-title">Группы прокси</div><div class="marsx-meta">Production DMZ · Analytics · K8s Cluster</div></div></div></div>
      <div class="marsx-card"><div class="marsx-card-main"><span class="marsx-icon">🔄</span><div><div class="marsx-card-title">Синхронизация справочника</div><div class="marsx-meta">Административные параметры получения данных для постановки на мониторинг.</div></div></div></div>
    </div>
    <div class="marsx-box marsx-bluebox"><b>Граница макета:</b> здесь показано место административных настроек. Существующие сценарии Хосты / Сервисы / Шаблоны / Коллекции и их правила остаются в исходном прототипе без изменения.</div></div>`;
}

function settingsTabs(){
  const tabs=[['types','Типы объектов'],['mapping','Источники и mapping'],['relationTypes','Типы связей'],['rules','Правила связей']];
  return `<div class="marsx-tabs">${tabs.map(([id,n])=>`<button class="marsx-btn marsx-tabbtn ${X.registrySettingsTab===id?'marsx-active':''}" data-x-rstab="${id}">${n}</button>`).join('')}</div>`;
}
function renderRegistrySettings(){
  let content='';
  if(X.registrySettingsTab==='types')content=renderTypesSettings();
  if(X.registrySettingsTab==='mapping')content=renderMappingSettings();
  if(X.registrySettingsTab==='relationTypes')content=renderRelationTypesSettings();
  if(X.registrySettingsTab==='rules')content=renderRulesSettings();
  setTimeout(()=>qsa('[data-x-rstab]').forEach(b=>b.onclick=()=>{X.registrySettingsTab=b.dataset.xRstab;renderAdmin()}),0);
  return `<div class="marsx-info"><b>Настройки реестра объектов мониторинга.</b> Здесь администратор определяет внутреннюю модель MARS: типы и атрибуты, внешние mapping, типы связей и правила их формирования.</div>${settingsTabs()}${content}`;
}

function renderTypesSettings(){
  return `<div class="marsx-toolbar"><span class="marsx-muted">Типов объектов: <b>${Object.keys(objectTypes).length}</b></span><button class="marsx-btn marsx-sm" id="marsx-add-type">➕ Добавить тип</button></div><div class="marsx-content">${Object.entries(objectTypes).map(([id,t])=>`<div class="marsx-card"><div class="marsx-card-main"><span class="marsx-icon">🧩</span><div><div class="marsx-card-title">${esc(t.label)}</div><div class="marsx-meta marsx-mono">${esc(id)}</div><div class="marsx-pills" style="margin-top:7px">${t.attrs.map(a=>`<span class="marsx-badge">${esc(a.label)} <span class="marsx-muted">· ${esc(a.id)}</span></span>`).join('')}</div></div></div><button class="marsx-btn marsx-xs marsx-outline" data-x-edit-type="${esc(id)}">Атрибуты</button></div>`).join('')}</div>`;
}

function renderMappingSettings(){
  const rows=mappings.map(m=>`<tr><td><span class="marsx-badge marsx-b-blue">${esc(m.type)}</span></td><td><b>${esc(attrLabel(m.type,m.attr))}</b><div class="marsx-cell-sub marsx-mono">${esc(m.attr)}</div></td><td>${esc(m.source)}</td><td><span class="marsx-badge marsx-b-violet">${esc(m.collection)}</span></td><td class="marsx-mono">${esc(m.field)}</td><td><span class="marsx-badge ${m.enabled?'marsx-b-green':'marsx-b-amber'}">${m.enabled?'Активно':'Выключено'}</span></td></tr>`).join('');
  return `<div class="marsx-info"><b>Текущий scope:</b> для типа Host внешним источником используем только Galaxy/HOSTOS. UABD/USP не используются для наполнения Host.</div><div class="marsx-content"><div class="marsx-box"><b>Логика:</b> Тип MARS → Атрибут MARS → Источник → Коллекция → Поле внешнего источника.</div></div><div class="marsx-table-wrap"><table class="marsx-table"><thead><tr><th>Тип MARS</th><th>Атрибут MARS</th><th>Источник</th><th>Коллекция</th><th>Поле</th><th>Статус</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

function renderRelationTypesSettings(){
  return `<div class="marsx-toolbar"><span class="marsx-muted">Системные + пользовательские типы связей</span><button class="marsx-btn marsx-sm" id="marsx-add-reltype">➕ Добавить тип связи</button></div><div class="marsx-content">${relationTypes.map(t=>`<div class="marsx-card"><div class="marsx-card-main"><span class="marsx-icon">🔗</span><div><div class="marsx-card-title">${esc(t.name)}</div><div class="marsx-meta">Обратное название: <b>${esc(t.reverse)}</b></div><div class="marsx-pills"><span class="marsx-badge ${t.system?'marsx-b-violet':'marsx-b-blue'}">${t.system?'Системный':'Пользовательский'}</span><span class="marsx-badge ${t.active?'marsx-b-green':'marsx-b-amber'}">${t.active?'Активен':'Выключен'}</span></div></div></div><div class="marsx-actions">${!t.system?`<button class="marsx-btn marsx-xs marsx-outline" data-x-edit-reltype="${esc(t.id)}">✏️</button>`:''}<button class="marsx-btn marsx-xs marsx-outline" data-x-toggle-reltype="${esc(t.id)}">${t.active?'Выключить':'Включить'}</button></div></div>`).join('')}</div>`;
}

function renderRulesSettings(){
  return `<div class="marsx-toolbar"><span class="marsx-muted">Одна строка = одно правило формирования связи</span><button class="marsx-btn marsx-sm" id="marsx-add-rule">➕ Добавить правило</button></div><div class="marsx-table-wrap"><table class="marsx-table"><thead><tr><th>Название</th><th>Тип связи</th><th>Условие</th><th>Направление</th><th>Множественность</th><th>Проверка</th><th>Статус</th><th></th></tr></thead><tbody>${rules.map(r=>`<tr><td><div class="marsx-cell-title">${esc(r.name)}</div><div class="marsx-cell-sub marsx-mono">${esc(r.id)}</div></td><td><span class="marsx-badge marsx-b-violet">${esc(relType(r.relationTypeId)?.name||'—')}</span></td><td class="marsx-mono">${esc(r.sourceType)}.${esc(r.sourceAttr)} ${esc(r.operator)} ${esc(r.targetType)}.${esc(r.targetAttr)}</td><td><b>${esc(r.sourceType)}</b> → <b>${esc(r.targetType)}</b></td><td>${r.multiplicity==='one'?'<span class="marsx-badge marsx-b-blue">Один</span>':'<span class="marsx-badge marsx-b-green">Несколько</span>'}</td><td><span class="marsx-badge marsx-b-green">✓ ${r.formed}</span> ${r.missing?`<span class="marsx-badge marsx-b-amber">0: ${r.missing}</span>`:''} ${r.ambiguous?`<span class="marsx-badge marsx-b-red">⚠ ${r.ambiguous}</span>`:''}</td><td><span class="marsx-badge ${r.active?'marsx-b-green':'marsx-b-amber'}">${r.active?'Активно':'Выключено'}</span></td><td><div class="marsx-actions"><button class="marsx-btn marsx-xs marsx-outline" data-x-edit-rule="${esc(r.id)}">✏️</button><button class="marsx-btn marsx-xs marsx-outline" data-x-toggle-rule="${esc(r.id)}">${r.active?'Выключить':'Включить'}</button></div></td></tr>`).join('')}</tbody></table></div>`;
}

function typeOptions(selected){return Object.keys(objectTypes).map(t=>`<option value="${esc(t)}" ${t===selected?'selected':''}>${esc(t)}</option>`).join('')}
function attrOptions(type,selected){return typeAttrs(type).map(a=>`<option value="${esc(a.id)}" ${a.id===selected?'selected':''}>${esc(a.label)} · ${esc(a.id)}</option>`).join('')}
function relOptions(selected){return relationTypes.filter(t=>t.active).map(t=>`<option value="${esc(t.id)}" ${t.id===selected?'selected':''}>${esc(t.name)}</option>`).join('')}

function openRule(id=''){
  X.editRuleId=id||null;
  const r=id?rules.find(x=>x.id===id):null;
  const x=r||{name:'Host относится к ИТ-системе',sourceType:'Host',sourceAttr:'informationSystemId',operator:'=',targetType:'InformationSystem',targetAttr:'externalId',relationTypeId:'rt-belongs',multiplicity:'one',active:true};
  modal(id?'Редактировать правило связи':'Добавить правило связи','Одна настройка = одно правило формирования связи.',`
    <div class="marsx-field"><label>Название правила</label><input id="marsx-r-name" class="marsx-input marsx-wide" value="${esc(x.name)}"></div>
    <div class="marsx-sep"></div><h3>1. Какие объекты связываем</h3>
    <div class="marsx-rule-flow">
      <div><div class="marsx-field"><label>Исходный тип объекта</label><select id="marsx-r-st" class="marsx-select marsx-wide">${typeOptions(x.sourceType)}</select></div><div class="marsx-field"><label>Исходный атрибут</label><select id="marsx-r-sa" class="marsx-select marsx-wide">${attrOptions(x.sourceType,x.sourceAttr)}</select></div></div>
      <div class="marsx-field"><label>Оператор</label><select id="marsx-r-op" class="marsx-select marsx-wide"><option value="=" ${x.operator==='='?'selected':''}>=</option><option value="IN" ${x.operator==='IN'?'selected':''}>IN</option></select></div>
      <div><div class="marsx-field"><label>Целевой тип объекта</label><select id="marsx-r-tt" class="marsx-select marsx-wide">${typeOptions(x.targetType)}</select></div><div class="marsx-field"><label>Целевой атрибут</label><select id="marsx-r-ta" class="marsx-select marsx-wide">${attrOptions(x.targetType,x.targetAttr)}</select></div></div>
    </div>
    <div class="marsx-sep"></div><h3>2. Семантика связи</h3>
    <div class="marsx-row"><div class="marsx-field"><label>Тип связи</label><select id="marsx-r-rel" class="marsx-select marsx-wide">${relOptions(x.relationTypeId)}</select><div class="marsx-hint">Выбирается из справочника типов связей.</div></div><div class="marsx-field"><label>Направление</label><div class="marsx-box" style="margin:0"><b>Исходный объект → Целевой объект</b><div class="marsx-hint">Parent/Child не используется.</div></div></div></div>
    <div id="marsx-r-preview" class="marsx-rule-preview"></div>
    <div class="marsx-sep"></div><h3>3. Множественность</h3>
    <div class="marsx-row"><label class="marsx-card" style="cursor:pointer"><div class="marsx-card-main"><input class="marsx-check" type="radio" name="marsx-r-mult" value="one" ${x.multiplicity==='one'?'checked':''}><div><div class="marsx-card-title">Только один целевой объект</div><div class="marsx-meta">0 → связь не сформирована · 1 → сформирована · &gt;1 → неоднозначность</div></div></div></label><label class="marsx-card" style="cursor:pointer"><div class="marsx-card-main"><input class="marsx-check" type="radio" name="marsx-r-mult" value="many" ${x.multiplicity==='many'?'checked':''}><div><div class="marsx-card-title">Один или несколько</div><div class="marsx-meta">0 → нет связей · N → формируем N связей</div></div></div></label></div>
    <div class="marsx-sep"></div><h3>4. Проверка правила</h3><button class="marsx-btn marsx-outline" id="marsx-r-test">▶ Проверить на данных реестра</button><div id="marsx-r-test-result"></div>
    <div class="marsx-sep"></div><label style="display:flex;gap:8px;align-items:center"><input id="marsx-r-active" class="marsx-check" type="checkbox" ${x.active?'checked':''}> <b>Правило активно</b></label>
  `,`<button class="marsx-btn marsx-ghost" data-x-close>Отмена</button><button class="marsx-btn" id="marsx-r-save">Сохранить</button>`);
  const updateAttrs=(side)=>{
    const type=qs(side==='s'?'#marsx-r-st':'#marsx-r-tt').value;
    qs(side==='s'?'#marsx-r-sa':'#marsx-r-ta').innerHTML=attrOptions(type,'');
    updatePreview();
  };
  const updatePreview=()=>{
    const s=qs('#marsx-r-st').value,t=qs('#marsx-r-tt').value,rel=relType(qs('#marsx-r-rel').value);
    qs('#marsx-r-preview').innerHTML=`<div class="marsx-rule-line"><span class="marsx-node">${esc(s)}</span><span class="marsx-arrow">── ${esc(rel?.name||'связь')} ──►</span><span class="marsx-node">${esc(t)}</span></div><div class="marsx-code">${esc(s)}.${esc(qs('#marsx-r-sa').value)} ${esc(qs('#marsx-r-op').value)} ${esc(t)}.${esc(qs('#marsx-r-ta').value)}</div>`;
  };
  qs('#marsx-r-st').onchange=()=>updateAttrs('s');qs('#marsx-r-tt').onchange=()=>updateAttrs('t');
  ['#marsx-r-sa','#marsx-r-ta','#marsx-r-op','#marsx-r-rel'].forEach(s=>qs(s).onchange=updatePreview);updatePreview();
  qs('#marsx-r-test').onclick=()=>{
    const one=qs('input[name="marsx-r-mult"]:checked').value==='one';
    qs('#marsx-r-test-result').innerHTML=`<div class="marsx-box" style="margin-top:12px"><div class="marsx-kpi3"><div class="marsx-stat"><label>Связь сформирована</label><b>1 180</b></div><div class="marsx-stat"><label>Цель не найдена</label><b>61</b></div><div class="marsx-stat"><label>${one?'Неоднозначно':'Множественных результатов'}</label><b>${one?'13':'224'}</b></div></div>${one?'<div class="marsx-box marsx-redbox"><b>Примеры неоднозначности</b><br><span class="marsx-mono">host17 · systemId=123 → найдено 2 объекта</span><br><span class="marsx-mono">host982 · systemId=777 → найдено 3 объекта</span></div>':''}</div>`;
  };
  qs('#marsx-r-save').onclick=()=>{
    const old=X.editRuleId?rules.find(r=>r.id===X.editRuleId):null;
    const d={id:old?.id||uid('RR'),name:qs('#marsx-r-name').value.trim()||'Без названия',sourceType:qs('#marsx-r-st').value,sourceAttr:qs('#marsx-r-sa').value,operator:qs('#marsx-r-op').value,targetType:qs('#marsx-r-tt').value,targetAttr:qs('#marsx-r-ta').value,relationTypeId:qs('#marsx-r-rel').value,multiplicity:qs('input[name="marsx-r-mult"]:checked').value,active:qs('#marsx-r-active').checked,formed:old?.formed||0,missing:old?.missing||0,ambiguous:old?.ambiguous||0};
    if(old)rules[rules.indexOf(old)]=d;else rules.push(d);closeModal();renderAdmin();toast(old?'Правило обновлено':'Правило создано');
  };
}

function openRelationType(id=''){
  X.editRelationTypeId=id||null;const t=id?relationTypes.find(x=>x.id===id):null;
  if(t?.system)return toast('Системный тип связи нельзя редактировать');
  modal(id?'Редактировать тип связи':'Добавить тип связи','Тип связи — отдельная сущность справочника MARS.',`
    <div class="marsx-row"><div class="marsx-field"><label>Прямое название *</label><input id="marsx-rt-name" class="marsx-input marsx-wide" value="${esc(t?.name||'')}" placeholder="Например: Резервирует"></div><div class="marsx-field"><label>Обратное название *</label><input id="marsx-rt-reverse" class="marsx-input marsx-wide" value="${esc(t?.reverse||'')}" placeholder="Например: Резервируется"></div></div>
    <div class="marsx-box marsx-bluebox"><b>Пример:</b><br>Database <b>размещена на</b> Host<br>Host <b>размещает</b> Database</div>
    <label style="display:flex;gap:8px;align-items:center"><input id="marsx-rt-active" class="marsx-check" type="checkbox" ${t?.active!==false?'checked':''}> <b>Тип связи активен</b></label>
  `,`<button class="marsx-btn marsx-ghost" data-x-close>Отмена</button><button class="marsx-btn" id="marsx-rt-save">Сохранить</button>`,true);
  qs('#marsx-rt-save').onclick=()=>{
    const name=qs('#marsx-rt-name').value.trim(),reverse=qs('#marsx-rt-reverse').value.trim();if(!name||!reverse)return toast('Заполните прямое и обратное название');
    const old=X.editRelationTypeId?relationTypes.find(x=>x.id===X.editRelationTypeId):null;
    const d={id:old?.id||uid('rt'),name,reverse,system:false,active:qs('#marsx-rt-active').checked};
    if(old)relationTypes[relationTypes.indexOf(old)]=d;else relationTypes.push(d);closeModal();renderAdmin();toast(old?'Тип связи обновлён':'Тип связи создан');
  };
}

function openTypeAttrs(type){
  const t=objectTypes[type];if(!t)return;
  modal(`Тип объекта: ${t.label}`,'Атрибуты являются внутренней моделью MARS.',`
    <div class="marsx-box marsx-bluebox"><b>Внешняя CMDB не определяет набор атрибутов.</b> Mapping внешних полей настраивается отдельно.</div>
    <div id="marsx-type-attrs">${t.attrs.map((a,i)=>`<div class="marsx-card"><div class="marsx-card-main"><span class="marsx-icon">🏷️</span><div><div class="marsx-card-title">${esc(a.label)}</div><div class="marsx-meta marsx-mono">${esc(a.id)} · ${esc(a.type)}${a.required?' · обязательный':''}</div></div></div></div>`).join('')}</div>
    <div class="marsx-row"><div class="marsx-field"><label>ID нового атрибута</label><input id="marsx-new-attr-id" class="marsx-input marsx-wide"></div><div class="marsx-field"><label>Название</label><input id="marsx-new-attr-label" class="marsx-input marsx-wide"></div></div>
  `,`<button class="marsx-btn marsx-ghost" data-x-close>Закрыть</button><button class="marsx-btn" id="marsx-add-attr">Добавить атрибут</button>`);
  qs('#marsx-add-attr').onclick=()=>{
    const id=qs('#marsx-new-attr-id').value.trim(),label=qs('#marsx-new-attr-label').value.trim();if(!id||!label)return toast('Заполните ID и название');
    if(t.attrs.some(a=>a.id===id))return toast('Атрибут с таким ID уже существует');
    t.attrs.push({id,label,type:'String'});closeModal();renderAdmin();toast('Атрибут добавлен');
  };
}

function wireAdminActions(){
  const addType=qs('#marsx-add-type');if(addType)addType.onclick=()=>{
    modal('Добавить тип объекта','Тип объекта является внутренней сущностью MARS.',`<div class="marsx-row"><div class="marsx-field"><label>ID типа *</label><input id="marsx-type-id" class="marsx-input marsx-wide" placeholder="Например: Cluster"></div><div class="marsx-field"><label>Название *</label><input id="marsx-type-label" class="marsx-input marsx-wide" placeholder="Cluster"></div></div>`,`<button class="marsx-btn marsx-ghost" data-x-close>Отмена</button><button class="marsx-btn" id="marsx-type-save">Создать</button>`,true);
    qs('#marsx-type-save').onclick=()=>{const id=qs('#marsx-type-id').value.trim(),label=qs('#marsx-type-label').value.trim();if(!id||!label)return toast('Заполните поля');if(objectTypes[id])return toast('Такой тип уже существует');objectTypes[id]={label,attrs:[{id:'name',label:'Имя',type:'String',required:true}]};closeModal();renderAdmin();toast('Тип объекта создан')};
  };
  qsa('[data-x-edit-type]').forEach(b=>b.onclick=()=>openTypeAttrs(b.dataset.xEditType));
  const ar=qs('#marsx-add-reltype');if(ar)ar.onclick=()=>openRelationType();
  qsa('[data-x-edit-reltype]').forEach(b=>b.onclick=()=>openRelationType(b.dataset.xEditReltype));
  qsa('[data-x-toggle-reltype]').forEach(b=>b.onclick=()=>{const t=relationTypes.find(x=>x.id===b.dataset.xToggleReltype);t.active=!t.active;renderAdmin();toast(t.active?'Тип связи включён':'Тип связи выключен')});
  const rr=qs('#marsx-add-rule');if(rr)rr.onclick=()=>openRule();
  qsa('[data-x-edit-rule]').forEach(b=>b.onclick=()=>openRule(b.dataset.xEditRule));
  qsa('[data-x-toggle-rule]').forEach(b=>b.onclick=()=>{const r=rules.find(x=>x.id===b.dataset.xToggleRule);r.active=!r.active;renderAdmin();toast(r.active?'Правило включено':'Правило выключено')});
}

/* Re-wire after every admin render without touching the original app. */
const originalRenderAdmin=renderAdmin;
renderAdmin=function(){
  originalRenderAdmin();
  setTimeout(wireAdminActions,0);
};

installShell();
})();
