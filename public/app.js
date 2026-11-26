
const $ = id => document.getElementById(id);
const CAT = { personal:'🏠 Cá nhân', work:'💼 Công việc', study:'📚 Học tập' };
const PRIO = { 1:'Cao', 2:'Trung bình', 3:'Thấp' };
let items = [], filter = 'all', timer;

const root = document.documentElement;
function setTheme(t){ root.dataset.theme = t; $('theme').textContent = t === 'dark' ? '☀️' : '🌙'; try{localStorage.setItem('theme', t)}catch(e){} }
let saved = null; try{ saved = localStorage.getItem('theme') }catch(e){}
setTheme(saved || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
$('theme').onclick = () => setTheme(root.dataset.theme === 'dark' ? 'light' : 'dark');

const hr = new Date().getHours();
$('hello').textContent = (hr < 12 ? 'Chào buổi sáng' : hr < 18 ? 'Chào buổi chiều' : 'Chào buổi tối') + '! Sắp xếp một ngày thật gọn gàng.';

function toast(msg){
  const t = $('toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(timer); timer = setTimeout(() => t.classList.remove('show'), 2000);
}
function confetti(){
  const colors = ['#6366f1','#ec4899','#f59e0b','#10b981','#3b82f6'];
  for (let i = 0; i < 60; i++){
    const d = document.createElement('div'); d.className = 'conf';
    d.style.left = Math.random()*100 + 'vw';
    d.style.background = colors[i % colors.length];
    d.style.animationDuration = (1.5 + Math.random()*1.5) + 's';
    d.style.animationDelay = Math.random()*.4 + 's';
    document.body.appendChild(d);
    setTimeout(() => d.remove(), 3500);
  }
}
async function api(url, method, body){
  const write=method!=='GET'; if(write){pendingWrites++;loadSequence++;}
  try { const res = await fetch(url, { method, cache:'no-store', signal:AbortSignal.timeout(10000), headers:{'Content-Type':'application/json'}, body: body ? JSON.stringify(body) : undefined });
  if (!res.ok) throw new Error('err');
  return await res.json(); } finally {if(write)pendingWrites--;}
}
let loadSequence = 0, backgroundBusy = false, lastSnapshot = null, pendingWrites = 0;
async function load(quiet=false){
  if (quiet && (backgroundBusy || pendingWrites || document.hidden || document.querySelector('.edit-in'))) return;
  const seq=++loadSequence;
  if(quiet) backgroundBusy=true;
  try {
    const data=await api('/items','GET');
    if(seq!==loadSequence || (quiet && (pendingWrites || document.querySelector('.edit-in')))) return;
    if(!Array.isArray(data)) throw Error('Invalid data');
    const snapshot=JSON.stringify(data);
    if(!quiet || snapshot!==lastSnapshot){items=data;lastSnapshot=snapshot;render();}
    $('connection').textContent='● API đã kết nối';
    $('synced').textContent='Lần tải: '+new Date().toLocaleTimeString('vi-VN');
    $('syncNote').textContent=quiet?'Đồng bộ tự động thành công':'';
  } catch(e){if(seq===loadSequence){$('connection').textContent='● Không kết nối được API';$('syncNote').textContent='Giữ dữ liệu lần tải trước';if(!quiet)toast('Không tải được dữ liệu');}}
  finally{if(quiet)backgroundBusy=false;}
}
function today(){ return new Date(Date.now() - new Date().getTimezoneOffset()*60000).toISOString().slice(0,10); }
function fmt(d){ return new Date(d).toLocaleString('vi-VN',{hour:'2-digit',minute:'2-digit',day:'2-digit',month:'2-digit'}); }
function fmtDue(s){ const [y,m,d] = s.split('-'); return d + '/' + m + '/' + y; }

const ICON_EDIT = '<svg viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z"/></svg>';
const ICON_DEL = '<svg viewBox="0 0 24 24"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/></svg>';
const ICON_CAL = '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>';

function render(){
  const t = today();
  const done = items.filter(i => i.done).length;
  const late = items.filter(i => !i.done && i.due_date && i.due_date < t).length;
  $('sAll').textContent = items.length; $('sDone').textContent = done;
  $('sTodo').textContent = items.length - done; $('sLate').textContent = late;
  $('bar').style.width = (items.length ? done/items.length*100 : 0) + '%';

  const q = normalize($('search').value.trim()), cf = $('catF').value, sort = $('sort').value;
  let shown = items.filter(i =>
    (filter === 'all' || (filter === 'done' ? i.done : filter === 'today' ? !i.done && i.due_date === t : filter === 'late' ? !i.done && i.due_date && i.due_date < t : !i.done)) &&
    (cf === 'all' || i.category === cf) &&
    normalize(i.name).includes(q));
  const by = {
    new: (a,b) => b.id - a.id,
    due: (a,b) => (a.due_date || '9999').localeCompare(b.due_date || '9999'),
    prio: (a,b) => a.priority - b.priority,
    name: (a,b) => a.name.localeCompare(b.name, 'vi')
  };
  shown.sort(by[sort]);
  renderAnalytics(); renderAlternate(shown);

  const list = $('list'); list.innerHTML = '';
  if (!shown.length){
    list.innerHTML = '<div class="empty"><div>🎉</div>' +
      (items.length ? 'Không có công việc nào ở đây' : 'Chưa có việc nào, hãy thêm việc đầu tiên!') + '</div>';
    return;
  }
  shown.forEach(it => {
    const li = document.createElement('li');
    if (it.done) li.className = 'done';

    const cb = document.createElement('input');
    cb.type = 'checkbox'; cb.className = 'chk'; cb.checked = it.done;
    cb.onchange = async () => {
      try {
        await api('/items/' + it.id, 'PUT', { done: cb.checked });
        it.done = cb.checked;
        toast(cb.checked ? '✅ Đã hoàn thành' : '↩️ Đã mở lại');
        if (cb.checked && items.length && items.every(x => x.done)){ confetti(); toast('🎉 Tuyệt vời! Xong hết rồi!'); }
        load();
      } catch { cb.checked = it.done; toast('Có lỗi xảy ra'); }
    };

    const txt = document.createElement('div'); txt.className = 'txt';
    const b = document.createElement('b'); b.textContent = it.name;
    const meta = document.createElement('div'); meta.className = 'meta';

    const cat = document.createElement('span'); cat.className = 'chip'; cat.textContent = CAT[it.category] || CAT.personal;
    const pr = document.createElement('button'); pr.className = 'chip p' + it.priority;
    pr.textContent = '● ' + PRIO[it.priority]; pr.title = 'Bấm để đổi mức ưu tiên';
    pr.onclick = async () => {
      try { await api('/items/' + it.id, 'PUT', { priority: it.priority % 3 + 1 }); load(); } catch { toast('Có lỗi xảy ra'); }
    };
    meta.append(cat, pr);
    if (it.due_date){
      const du = document.createElement('span'); du.className = 'chip';
      du.textContent = '📅 ' + fmtDue(it.due_date);
      if (!it.done && it.due_date < t){ du.classList.add('due-over'); du.textContent += ' · Quá hạn'; }
      else if (!it.done && it.due_date === t){ du.classList.add('due-today'); du.textContent += ' · Hôm nay'; }
      meta.append(du);
    }
    const cr = document.createElement('span'); cr.className = 'chip'; cr.textContent = '🕒 ' + fmt(it.created_at);
    meta.append(cr);
    txt.append(b, meta);
    txt.ondblclick = () => startEdit(it, b);

    const cal = document.createElement('button'); cal.className = 'ico'; cal.title = 'Đặt hạn chót'; cal.innerHTML = ICON_CAL;
    const di = document.createElement('input'); di.type = 'date'; di.className = 'hid'; di.value = it.due_date || '';
    di.onchange = async () => {
      try { await api('/items/' + it.id, 'PUT', { due_date: di.value }); toast('📅 Đã đặt hạn chót'); load(); } catch { toast('Có lỗi xảy ra'); }
    };
    cal.onclick = () => { try { di.showPicker(); } catch { di.focus(); di.click(); } };
    cal.append(di);

    const edit = document.createElement('button'); edit.className = 'ico'; edit.title = 'Sửa'; edit.innerHTML = ICON_EDIT;
    edit.onclick = () => startEdit(it, b);

    const del = document.createElement('button'); del.className = 'ico del'; del.title = 'Xóa'; del.innerHTML = ICON_DEL;
    del.onclick = async () => {
      li.classList.add('removing');
      try { await api('/items/' + it.id, 'DELETE'); setTimeout(() => { toast('🗑️ Đã xóa'); load(); }, 280); }
      catch { li.classList.remove('removing'); toast('Có lỗi xảy ra'); }
    };

    li.append(cb, txt, cal, edit, del);
    list.appendChild(li);
  });
}

function startEdit(it, bEl){
  const input = document.createElement('input');
  input.className = 'edit-in'; input.value = it.name; input.maxLength = 200;
  bEl.replaceWith(input); input.focus(); input.select();
  let finished = false;
  const save = async () => {
    if (finished) return; finished = true;
    const v = input.value.trim();
    if (v && v !== it.name){ try { await api('/items/' + it.id, 'PUT', { name: v }); toast('✏️ Đã cập nhật'); } catch { toast('Có lỗi xảy ra'); } }
    load();
  };
  input.onkeydown = e => { if (e.key === 'Enter') save(); if (e.key === 'Escape'){ finished = true; load(); } };
  input.onblur = save;
}

async function addItem(){
  const input = $('name'), v = input.value.trim();
  if (!v){ input.focus(); return; }
  if ($('addBtn').disabled) return; $('addBtn').disabled=true;
  try {
    await api('/items', 'POST', { name: v, priority: +$('prio').value, category: $('cat').value, due_date: $('due').value || null });
    input.value = ''; $('due').value = ''; toast('➕ Đã thêm'); await load();
  } catch { toast('Có lỗi xảy ra'); } finally { $('addBtn').disabled=false; }
}

function exportCsv(){
  if (!items.length){ toast('Chưa có dữ liệu để xuất'); return; }
  const esc = s => '"' + String(s ?? '').replace(/"/g, '""') + '"';
  const rows = [['ID','Công việc','Phân loại','Ưu tiên','Hạn chót','Trạng thái','Ngày tạo']];
  items.forEach(i => rows.push([i.id, i.name, CAT[i.category] || '', PRIO[i.priority], i.due_date || '', i.done ? 'Hoàn thành' : 'Đang làm', fmt(i.created_at)]));
  const csv = '\uFEFF' + rows.map(r => r.map(esc).join(',')).join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type:'text/csv;charset=utf-8' }));
  a.download = 'viec-can-lam.csv'; a.click(); URL.revokeObjectURL(a.href);
  toast('⬇ Đã xuất file CSV');
}
async function clearDone(){
  const n = items.filter(i => i.done).length;
  if (!n){ toast('Chưa có việc nào hoàn thành'); return; }
  if (!confirm('Xóa ' + n + ' việc đã hoàn thành?')) return;
  try { await api('/items/done', 'DELETE'); toast('🧹 Đã dọn ' + n + ' việc'); load(); } catch { toast('Có lỗi xảy ra'); }
}

$('addBtn').onclick = addItem;
$('exportBtn').onclick = exportCsv;
$('clearBtn').onclick = clearDone;
$('name').addEventListener('keydown', e => { if (e.key === 'Enter') addItem(); });
['search','sort','catF'].forEach(id => $(id).addEventListener(id === 'search' ? 'input' : 'change', render));
document.querySelectorAll('.tab').forEach(t => t.onclick = () => {
  document.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
  t.classList.add('active'); filter = t.dataset.f; render();
});
document.addEventListener('keydown', e => {
  const tag = (e.target.tagName || '').toLowerCase();
  if (tag === 'input' || tag === 'select' || e.ctrlKey || e.metaKey) return;
  if (e.key === '/'){ e.preventDefault(); $('search').focus(); }
  if (e.key.toLowerCase() === 'n'){ e.preventDefault(); $('name').focus(); }
});
let view='list', month=new Date();
function normalize(s){return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d');}
function el(tag,cls,text){const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;}
function renderAnalytics(){const a=$('analytics');a.replaceChildren();for(const [key,label] of Object.entries(CAT)){const group=items.filter(i=>i.category===key), n=group.filter(i=>i.done).length;const r=el('div','metric'), track=el('div','track'), bar=el('i');bar.style.width=(group.length?n/group.length*100:0)+'%';track.append(bar);r.append(el('span','',label),track,el('span','',n+'/'+group.length));a.append(r);}}
function renderAlternate(shown){const a=$('alternate');$('list').hidden=view!=='list';a.hidden=view==='list';a.replaceChildren();if(view==='list')return;if(view==='board'){const board=el('div','board');for(const done of [false,true]){const lane=el('div','lane');lane.append(el('h3','',done?'Hoàn thành':'Chưa hoàn thành'));for(const i of shown.filter(i=>!!i.done===done)){const card=el('div','task-card');card.append(el('strong','',i.name),el('p','',CAT[i.category]||''));const b=el('button','mini',done?'Mở lại':'Hoàn thành');b.onclick=async()=>{b.disabled=true;try{await api('/items/'+i.id,'PUT',{done:!done});await load();}catch{toast('Không cập nhật được');b.disabled=false;}};card.append(b);lane.append(card);}board.append(lane);}a.append(board);return;}const y=month.getFullYear(),m=month.getMonth();const nav=el('div','calendar-nav');for(const delta of [-1,0,1]){if(!delta){nav.append(el('strong','',`Tháng ${m+1}/${y}`));continue;}const b=el('button','',delta<0?'‹ Trước':'Sau ›');b.onclick=()=>{month=new Date(y,m+delta,1);render();};nav.append(b);}a.append(nav);const grid=el('div','calendar-grid');for(const d of ['T2','T3','T4','T5','T6','T7','CN'])grid.append(el('strong','',d));for(let k=0;k<(new Date(y,m,1).getDay()+6)%7;k++)grid.append(el('div','day'));for(let d=1;d<=new Date(y,m+1,0).getDate();d++){const cell=el('div','day',d);const date=`${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;for(const i of shown.filter(i=>i.due_date===date)){const b=el('button','mini',i.name);b.onclick=()=>{view='list';$('search').value=i.name;render();};cell.append(b);}grid.append(cell);}a.append(grid);}
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{view=b.dataset.view;document.querySelectorAll('[data-view]').forEach(x=>x.classList.toggle('active',x===b));render();});document.querySelector('[data-view=list]').classList.add('active');$('refresh').onclick=()=>load();load();

let healthBusy=false;
async function checkHealth(){
  if(healthBusy)return;healthBusy=true;
  const start=performance.now();
  try{
    const res=await fetch('/health',{cache:'no-store',signal:AbortSignal.timeout(7000)});
    const h=await res.json();if(h.server!==true)throw Error('Invalid health');
    $('hServer').textContent='Hoạt động';$('hDb').textContent=h.database?'Đã kết nối':'Lỗi kết nối';
    $('hLatency').textContent=Math.round(performance.now()-start)+' ms';
    $('hDbMs').textContent=h.databaseMs===null?'—':h.databaseMs+' ms';
    $('hUptime').textContent=Math.floor(h.uptime/3600)+'h '+Math.floor(h.uptime%3600/60)+'m '+h.uptime%60+'s';
    $('hInstance').textContent=h.instance; $('hPlatform').textContent=h.platform || '—';
    $('healthNote').textContent='Kiểm tra lúc '+new Date().toLocaleTimeString('vi-VN');
  }catch(e){for(const id of ['hDb','hLatency','hDbMs','hUptime','hInstance'])$(id).textContent='—';$('hServer').textContent='Không phản hồi';$('healthNote').textContent='Không lấy được số liệu máy chủ';}
  finally{healthBusy=false;}
}
$('monitorNav').onclick=()=>$('monitor').scrollIntoView({behavior:'smooth'});
$('healthRefresh').onclick=checkHealth;
$('autoSync').onchange=()=>{if($('autoSync').checked)load(true);else $('syncNote').textContent='Đã tắt tự đồng bộ';};
setInterval(()=>{if($('autoSync').checked)load(true);},5000);
setInterval(()=>{if(!document.hidden)checkHealth();},10000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden){if($('autoSync').checked)load(true);checkHealth();}});
checkHealth();
