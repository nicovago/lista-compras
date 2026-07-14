const DB_NAME='shopping_db_v1';
const STORE='items';
const LAST_CATEGORY_KEY='shopping_last_category';
const CATS=['Carnicería','Verdulería','Supermercado','Dietética','Ferretería','Mercería','Librería','Farmacia','Otros'];
const CAT_META={
  Carnicería:{icon:'🥩',accent:'#9f4f46'},
  Verdulería:{icon:'🥬',accent:'#4f7a5b'},
  Supermercado:{icon:'🛒',accent:'#8a6a3e'},
  Dietética:{icon:'🌾',accent:'#7b6b45'},
  Ferretería:{icon:'🔧',accent:'#596675'},
  Mercería:{icon:'🧵',accent:'#7d5f76'},
  Librería:{icon:'✏️',accent:'#4f6980'},
  Farmacia:{icon:'💊',accent:'#4f7b77'},
  Otros:{icon:'📦',accent:'#6d6964'}
};
let db;
let editingId=null;
let activeCategory='';

const $=id=>document.getElementById(id);
const els={name:$('itemName'),qty:$('itemQty'),cat:$('itemCat'),note:$('itemNote'),add:$('addBtn'),cancel:$('cancelEditBtn'),filter:$('filter'),filterClear:$('filterClear'),clearDone:$('clearDone'),list:$('listContainer'),stats:$('stats'),export:$('exportBtn'),import:$('importBtn'),importFile:$('importFile'),quickCats:$('quickCats'),share:$('shareBtn'),formTitle:$('formTitle')};

function openDB(){return new Promise((resolve,reject)=>{const req=indexedDB.open(DB_NAME,1);req.onupgradeneeded=e=>{const database=e.target.result;if(!database.objectStoreNames.contains(STORE)){const os=database.createObjectStore(STORE,{keyPath:'id'});os.createIndex('by_cat','category',{unique:false});os.createIndex('by_done','done',{unique:false});os.createIndex('by_created','created',{unique:false});}};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});}
async function withStore(mode,fn){if(!db)db=await openDB();return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,mode);const store=tx.objectStore(STORE);const result=fn(store);tx.oncomplete=()=>resolve(result);tx.onerror=()=>reject(tx.error);});}
const addItem=item=>withStore('readwrite',s=>s.add(item));
const putItem=item=>withStore('readwrite',s=>s.put(item));
const delItem=id=>withStore('readwrite',s=>s.delete(id));
function getAll(){return withStore('readonly',s=>new Promise((resolve,reject)=>{const req=s.getAll();req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);}));}
function uuid(){return crypto.randomUUID?.()||`${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;}
function escapeHtml(value=''){return String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#039;'}[char]));}
function setCatStyle(el,cat){el.style.setProperty('--cat-accent',(CAT_META[cat]||CAT_META.Otros).accent);}
function refreshCategoryButtons(){els.quickCats.querySelectorAll('.chip').forEach(button=>button.classList.toggle('active',button.dataset.category===activeCategory));}
function setCategoryFilter(category){activeCategory=activeCategory===category?'':category;els.filter.value=activeCategory;els.filterClear.classList.toggle('hidden',!activeCategory);refreshCategoryButtons();render();}

function initializeCategories(){
  const allButton=document.createElement('button');
  allButton.type='button';allButton.className='chip all-chip active';allButton.dataset.category='';allButton.innerHTML='<span aria-hidden="true">☰</span><span>Todos</span>';
  allButton.onclick=()=>{activeCategory='';els.filter.value='';els.filterClear.classList.add('hidden');refreshCategoryButtons();render();};
  els.quickCats.appendChild(allButton);
  for(const cat of CATS){
    const option=document.createElement('option');option.value=cat;option.textContent=cat;els.cat.appendChild(option);
    const button=document.createElement('button');button.type='button';button.className='chip';button.dataset.category=cat;button.innerHTML=`<span class="chip-icon" aria-hidden="true">${CAT_META[cat].icon}</span><span>${cat}</span>`;setCatStyle(button,cat);button.onclick=()=>setCategoryFilter(cat);els.quickCats.appendChild(button);
  }
  const saved=localStorage.getItem(LAST_CATEGORY_KEY);els.cat.value=CATS.includes(saved)?saved:CATS[0];
}
function resetForm(){editingId=null;els.name.value='';els.qty.value='';els.note.value='';els.formTitle.textContent='Agregar producto';els.add.innerHTML='<span aria-hidden="true">＋</span> Agregar';els.cancel.classList.add('hidden');els.name.focus();}
async function save(){const name=els.name.value.trim();if(!name)return;localStorage.setItem(LAST_CATEGORY_KEY,els.cat.value);const item={id:editingId||uuid(),name,qty:els.qty.value.trim(),category:els.cat.value,note:els.note.value.trim(),done:false,created:Date.now()};if(editingId){const current=(await getAll()).find(x=>x.id===editingId);if(current){item.done=current.done;item.created=current.created;}await putItem(item);}else{await addItem(item);}resetForm();await render();}
async function beginEdit(id){const item=(await getAll()).find(x=>x.id===id);if(!item)return;editingId=id;els.name.value=item.name;els.qty.value=item.qty||'';els.cat.value=item.category||CATS[0];els.note.value=item.note||'';els.formTitle.textContent='Editar producto';els.add.textContent='Guardar cambios';els.cancel.classList.remove('hidden');window.scrollTo({top:0,behavior:'smooth'});els.name.focus();}
async function toggle(id){const item=(await getAll()).find(x=>x.id===id);if(!item)return;item.done=!item.done;item.updated=Date.now();await putItem(item);await render();}
async function remove(id){const item=(await getAll()).find(x=>x.id===id);if(!item)return;if(confirm(`¿Eliminar “${item.name}”?`)){await delItem(id);if(editingId===id)resetForm();await render();}}

function itemRow(item){
  const li=document.createElement('li');li.className=`item${item.done?' done':''}`;
  const checkbox=document.createElement('input');checkbox.type='checkbox';checkbox.checked=item.done;checkbox.setAttribute('aria-label',`Marcar ${item.name} como comprado`);checkbox.onchange=()=>toggle(item.id);
  const text=document.createElement('div');text.innerHTML=`<div class="item-name">${escapeHtml(item.name)}</div>${item.note?`<div class="item-note">${escapeHtml(item.note)}</div>`:''}`;
  const qty=document.createElement('span');qty.className='item-qty';qty.textContent=item.qty||'';
  const actions=document.createElement('div');actions.className='item-actions';
  const edit=document.createElement('button');edit.className='action-icon edit-icon';edit.innerHTML='✏️';edit.title='Editar';edit.setAttribute('aria-label',`Editar ${item.name}`);edit.onclick=()=>beginEdit(item.id);
  const del=document.createElement('button');del.className='action-icon delete-icon';del.innerHTML='🗑️';del.title='Eliminar';del.setAttribute('aria-label',`Eliminar ${item.name}`);del.onclick=()=>remove(item.id);
  actions.append(edit,del);li.append(checkbox,text,qty,actions);return li;
}

async function render(){const query=els.filter.value.toLowerCase().trim();const all=await getAll();const items=all.filter(item=>!query||[item.name,item.category,item.note].some(value=>(value||'').toLowerCase().includes(query))).sort((a,b)=>Number(a.done)-Number(b.done)||(a.category||'').localeCompare(b.category||'')||b.created-a.created);els.list.innerHTML='';if(!items.length){els.list.innerHTML='<div class="card empty">No hay productos para mostrar.</div>';}else{const groups=Object.groupBy?Object.groupBy(items,item=>item.category||'Otros'):items.reduce((acc,item)=>{(acc[item.category||'Otros']??=[]).push(item);return acc;},{});for(const cat of Object.keys(groups).sort((a,b)=>a.localeCompare(b))){const group=document.createElement('section');group.className='group';const title=document.createElement('h2');title.className='group-title';title.innerHTML=`<span class="category-icon" aria-hidden="true">${(CAT_META[cat]||CAT_META.Otros).icon}</span><span>${escapeHtml(cat)}</span><span class="category-count">${groups[cat].length}</span>`;setCatStyle(title,cat);const list=document.createElement('ul');list.className='item-list';groups[cat].forEach(item=>list.appendChild(itemRow(item)));group.append(title,list);els.list.appendChild(group);}}const remaining=all.filter(item=>!item.done).length;els.stats.textContent=`${all.length} ítems · ${remaining} pendientes`;}

async function buildShareText(){const pending=(await getAll()).filter(item=>!item.done);if(!pending.length)return'🛒 Lista de compras\n(vacía)';const groups=pending.reduce((acc,item)=>{(acc[item.category||'Otros']??=[]).push(item);return acc;},{});const lines=['🛒 Lista de compras'];for(const cat of Object.keys(groups).sort((a,b)=>a.localeCompare(b))){lines.push(`\n${cat}:`);for(const item of groups[cat])lines.push(` • ${item.name}${item.qty?` x ${item.qty}`:''}${item.note?` (${item.note})`:''}`);}return lines.join('\n');}
async function share(){const text=await buildShareText();if(navigator.share){try{await navigator.share({text});return;}catch(error){if(error.name==='AbortError')return;}}window.open(`https://wa.me/?text=${encodeURIComponent(text)}`,'_blank','noopener');}
async function exportData(){const blob=new Blob([JSON.stringify(await getAll(),null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=`lista_compras_${new Date().toISOString().slice(0,10)}.json`;link.click();URL.revokeObjectURL(url);}
function validImportedItem(item){return item&&typeof item==='object'&&typeof item.id==='string'&&typeof item.name==='string'&&typeof item.done==='boolean'&&Number.isFinite(item.created);}
async function importData(file){let data;try{data=JSON.parse(await file.text());}catch{alert('El archivo no contiene JSON válido.');return;}if(!Array.isArray(data)||!data.every(validImportedItem)){alert('El archivo no tiene el formato esperado.');return;}const existing=await getAll();const map=new Map(existing.map(item=>[item.id,item]));data.forEach(item=>map.set(item.id,{...item,category:CATS.includes(item.category)?item.category:'Otros'}));await withStore('readwrite',s=>s.clear());for(const item of map.values())await addItem(item);await render();}

els.cat.addEventListener('change',()=>localStorage.setItem(LAST_CATEGORY_KEY,els.cat.value));
els.add.onclick=save;els.cancel.onclick=resetForm;els.name.addEventListener('keydown',event=>{if(event.key==='Enter')save();});els.qty.addEventListener('keydown',event=>{if(event.key==='Enter')save();});
els.filter.addEventListener('input',()=>{if(els.filter.value!==activeCategory)activeCategory='';els.filterClear.classList.toggle('hidden',!els.filter.value);refreshCategoryButtons();render();});
els.filterClear.onclick=()=>{activeCategory='';els.filter.value='';els.filterClear.classList.add('hidden');refreshCategoryButtons();render();};
els.clearDone.onclick=async()=>{const done=(await getAll()).filter(item=>item.done);if(!done.length)return;if(confirm(`¿Borrar ${done.length} producto${done.length===1?'':'s'} comprado${done.length===1?'':'s'}?`)){for(const item of done)await delItem(item.id);await render();}};els.share.onclick=share;els.export.onclick=exportData;els.import.onclick=()=>els.importFile.click();els.importFile.onchange=async event=>{const file=event.target.files?.[0];if(file)await importData(file);event.target.value='';};

initializeCategories();
openDB().then(render).catch(error=>{console.error(error);alert('No se pudo abrir el almacenamiento local.');});
if('serviceWorker'in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js?v=6',{updateViaCache:'none'}).then(registration=>registration.update()));
