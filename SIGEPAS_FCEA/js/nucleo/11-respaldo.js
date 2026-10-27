'use strict';
/* ====================================================================
   RESPALDO DE LA BASE DE DATOS · tres destinos:
   1) Manual: botón «Respaldo» (descarga el JSON al equipo) y «Respaldar ahora».
   2) Automático en el mismo servidor: cada BACKUP_INTERVAL_SEC (120 s por defecto) se envía la
      base a server.js, que la guarda en la carpeta ./respaldos.
   3) Automático en la nube: Google Drive (API, con el botón «Conectar Google Drive») y/o la carpeta
      sincronizada del servidor (CLOUD_DIR). Requiere iniciar con:  node server.js
   ==================================================================== */
const BK_KEY='sigepasBackupState',BK_FOLDER='SIGEPAS_Respaldos',BK_DRIVE_KEEP=30;
const BK_API=(location.protocol.startsWith('http')&&location.port==='3000')?'':'http://localhost:3000';
let bkCfg={intervaloSeg:120,googleClientId:'',nubeLocal:false,carpetaNube:''},bkBusy=false,bkToken=null,bkTokenExp=0,bkTokenClient=null,bkFolderId=null;
const bkLoad=()=>{try{return JSON.parse(localStorage.getItem(BK_KEY))||{}}catch{return{}}};
const bkSave=p=>{try{localStorage.setItem(BK_KEY,JSON.stringify({...bkLoad(),...p}))}catch{}};
const bkPayload=()=>({app:'SIGEPAS',version:1,exportado:new Date().toISOString(),datos:db});
const bkHora=t=>t?new Date(t).toLocaleString('es-PY',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit'}):'—';
const bkCanUse=()=>!!me&&['Administrador','Coordinador'].includes(me.rol);
/* Intervalo del respaldo automático: lo define el Administrador (se guarda en la base: db.config.respaldoSeg).
   Si no lo definió, vale el del servidor (BACKUP_INTERVAL_SEC) o 120 s. */
const BK_MIN_SEG=10,BK_MAX_SEG=7*86400,BK_SEG_DEF=120;
let bkSrvSeg=BK_SEG_DEF;
const bkSeg=()=>{const v=Number(db?.config?.respaldoSeg);return v>=BK_MIN_SEG&&v<=BK_MAX_SEG?v:bkSrvSeg};
function bkDur(s){s=Math.round(s);if(s%86400===0)return s/86400+(s===86400?' día':' días');if(s%3600===0)return s/3600+(s===3600?' hora':' horas');if(s%60===0)return s/60+(s===60?' minuto':' minutos');return s+' segundos'}

/* ---- Destino 2: servidor ---- */
async function bkToServer(origen){
 const r=await fetch(BK_API+'/api/respaldo?origen='+origen,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(bkPayload())});
 const j=await r.json().catch(()=>({}));if(!r.ok||!j.ok)throw new Error(j.error||'El servidor rechazó el respaldo.');return j}

/* ---- Destino 3: Google Drive (OAuth en el navegador, permiso drive.file: solo ve los archivos que crea el sistema) ---- */
const bkDriveOn=()=>!!bkToken&&Date.now()<bkTokenExp;
function bkDriveToken(interactive){
 return new Promise(async(resolve,reject)=>{
  if(!bkCfg.googleClientId)return reject(new Error('Google Drive no está configurado (falta GOOGLE_CLIENT_ID en el servidor).'));
  if(bkDriveOn())return resolve(bkToken);
  try{await loadScriptOnce('https://accounts.google.com/gsi/client')}catch{return reject(new Error('No se pudo cargar Google (¿sin internet?).'))}
  if(!bkTokenClient)bkTokenClient=google.accounts.oauth2.initTokenClient({client_id:bkCfg.googleClientId,scope:'https://www.googleapis.com/auth/drive.file',callback:()=>{}});
  bkTokenClient.callback=t=>{if(t.error)return reject(new Error('Google Drive: '+(t.error_description||t.error)));bkToken=t.access_token;bkTokenExp=Date.now()+(Number(t.expires_in)||3600)*1000-60000;bkSave({driveLinked:true});resolve(bkToken)};
  bkTokenClient.error_callback=e=>reject(new Error('Google Drive: '+(e.type==='popup_closed'?'ventana cerrada.':e.type||'no autorizado.')));
  bkTokenClient.requestAccessToken({prompt:interactive?'consent':''})})}
async function bkDriveFetch(url,opt={}){const r=await fetch(url,{...opt,headers:{...(opt.headers||{}),Authorization:'Bearer '+bkToken}});if(!r.ok)throw new Error('Google Drive respondió '+r.status);return r}
async function bkDriveFolder(){
 if(bkFolderId)return bkFolderId;
 const q=encodeURIComponent(`name='${BK_FOLDER}' and mimeType='application/vnd.google-apps.folder' and trashed=false`);
 const f=(await(await bkDriveFetch('https://www.googleapis.com/drive/v3/files?fields=files(id)&q='+q)).json()).files||[];
 if(f.length)return bkFolderId=f[0].id;
 return bkFolderId=(await(await bkDriveFetch('https://www.googleapis.com/drive/v3/files?fields=id',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:BK_FOLDER,mimeType:'application/vnd.google-apps.folder'})})).json()).id}
async function bkToDrive(name,interactive=false){
 await bkDriveToken(interactive);const parent=await bkDriveFolder(),b='sigepas'+Date.now();
 const body=`--${b}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify({name,parents:[parent],mimeType:'application/json'})}\r\n--${b}\r\nContent-Type: application/json\r\n\r\n${JSON.stringify(bkPayload())}\r\n--${b}--`;
 await bkDriveFetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id',{method:'POST',headers:{'Content-Type':'multipart/related; boundary='+b},body});
 /* Rotación: se conservan los últimos BK_DRIVE_KEEP respaldos en Drive. */
 try{const q=encodeURIComponent(`'${parent}' in parents and trashed=false`),l=(await(await bkDriveFetch('https://www.googleapis.com/drive/v3/files?orderBy=createdTime desc&pageSize=200&fields=files(id)&q='+q)).json()).files||[];for(const x of l.slice(BK_DRIVE_KEEP))await bkDriveFetch('https://www.googleapis.com/drive/v3/files/'+x.id,{method:'DELETE'})}catch{}}

/* ---- Destino alternativo sin servidor: carpeta del equipo (File System Access API, Chrome/Edge).
   Se elige una vez; sirve también para la carpeta de «Google Drive para escritorio» (queda en la nube). ---- */
let bkDir=null;
const bkIdb=()=>new Promise((ok,no)=>{const r=indexedDB.open('SIGEPAS_BK',1);r.onupgradeneeded=()=>r.result.createObjectStore('h');r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)});
async function bkDirLoad(){try{const d=await bkIdb();bkDir=await new Promise(ok=>{const q=d.transaction('h').objectStore('h').get('dir');q.onsuccess=()=>ok(q.result||null);q.onerror=()=>ok(null)});d.close()}catch{bkDir=null}}
async function bkDirStore(h){const d=await bkIdb();await new Promise(ok=>{const t=d.transaction('h','readwrite');t.objectStore('h').put(h,'dir');t.oncomplete=ok;t.onerror=ok});d.close()}
const bkDirOk=async()=>!!bkDir&&(await bkDir.queryPermission({mode:'readwrite'}))==='granted';
async function bkPickDir(){
 if(!window.showDirectoryPicker)throw new Error('Este navegador no permite elegir carpetas (use Chrome o Edge).');
 const h=await window.showDirectoryPicker({mode:'readwrite',id:'sigepas-respaldos'});
 if((await h.requestPermission({mode:'readwrite'}))!=='granted')throw new Error('Permiso denegado.');
 bkDir=h;await bkDirStore(h)}
async function bkToFolder(name){
 if(!(await bkDirOk()))throw new Error('Falta autorizar la carpeta (abra «Respaldos» y pulse Autorizar).');
 const fh=await bkDir.getFileHandle(name,{create:true}),w=await fh.createWritable();await w.write(JSON.stringify(bkPayload(),null,2));await w.close();
 try{const names=[];for await(const [n] of bkDir.entries())if(/^respaldo_.*\.json$/.test(n))names.push(n);names.sort().reverse();for(const n of names.slice(50))await bkDir.removeEntry(n)}catch{}}

/* ---- Ejecuta un respaldo en todos los destinos disponibles ---- */
async function bkRun(origen,interactive=false){
 if(bkBusy||!me||!db)return null;bkBusy=true;const res={};
 try{
  try{const j=await bkToServer(origen);res.servidor={ok:true,archivo:j.archivo,nube:j.nube};bkSave({servidor:{t:Date.now(),ok:true,archivo:j.archivo,carpetaNube:j.nube===true}})}
  catch(e){res.servidor={ok:false,error:e.message};bkSave({servidor:{t:Date.now(),ok:false,error:/fetch|Failed/i.test(e.message)?'Servidor no disponible (inicie «node server.js»).':e.message}})}
  const name=res.servidor.archivo||`respaldo_${new Date().toISOString().replace(/[:.]/g,'-')}_${origen}.json`;
  if(bkDir){try{await bkToFolder(name);res.carpeta={ok:true};bkSave({carpeta:{t:Date.now(),ok:true,nombre:bkDir.name}})}catch(e){res.carpeta={ok:false,error:e.message};bkSave({carpeta:{t:Date.now(),ok:false,error:e.message}})}}
  if(bkCfg.googleClientId&&(bkLoad().driveLinked||interactive)){
   try{await bkToDrive(name,interactive);res.drive={ok:true};bkSave({drive:{t:Date.now(),ok:true,archivo:name}})}
   catch(e){res.drive={ok:false,error:e.message};bkSave({drive:{t:Date.now(),ok:false,error:e.message}})}}
 }finally{bkBusy=false}
 bkRefreshUI();return res}

/* ---- Temporizador automático: se guarda la última hora en localStorage para que valga entre páginas y pestañas ---- */
function bkTick(){
 if(!bkCanUse()||bkBusy)return;
 const last=Number(localStorage.getItem('sigepasBackupLastAuto'))||0;
 if(Date.now()-last<bkSeg()*1000)return;
 try{localStorage.setItem('sigepasBackupLastAuto',String(Date.now()))}catch{}
 bkRun('auto').then(r=>{if(r&&!r.servidor.ok&&!r.carpeta?.ok)toast('Respaldo automático sin destino: inicie «node server.js» o elija una carpeta en «Respaldos».',true);else if(r)toast('Respaldo automático realizado.')})}

/* ---- Pantalla de respaldos ---- */
function bkEnsureUI(){
 if($('bkModal'))return;
 document.body.insertAdjacentHTML('beforeend',`<div class="modal fade" id="bkModal" tabindex="-1" aria-hidden="true"><div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable"><div class="modal-content"><div class="modal-header"><div><p class="modal-kicker mb-1">SEGURIDAD DE LA INFORMACIÓN</p><h5 class="modal-title"><i class="bi bi-cloud-arrow-up me-2"></i>Respaldo de la base de datos</h5></div><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div><div class="modal-body" id="bkBody"></div><div class="modal-footer"><button type="button" class="btn btn-light" data-bs-dismiss="modal">Cerrar</button></div></div></div></div>`);
 $('bkBody').addEventListener('click',async e=>{const b=e.target.closest('[data-bk]');if(!b)return;const a=b.dataset.bk;
  if(a==='now'){b.disabled=true;const r=await bkRun('manual',false);b.disabled=false;const ok=r&&r.servidor.ok;toast(ok?'Respaldo realizado.':(r?.servidor.error||'No se pudo respaldar.'),!ok)}
  else if(a==='interval'||a==='intervalDef'){const def=a==='intervalDef',seg=def?null:Number($('bkIntVal').value)*Number($('bkIntUnit').value),err=bkSetInterval(seg);
   if(err){$('bkIntErr').textContent=err;return}toast(def?`Frecuencia restablecida: cada ${bkDur(bkSeg())}.`:`Respaldo automático cada ${bkDur(bkSeg())}.`);bkRender()}
  else if(a==='file')$('restoreFile').click();
  else if(a==='download')$('backupBtn').click();
  else if(a==='drive'){b.disabled=true;const r=await bkRun('manual',true);b.disabled=false;toast(r?.drive?.ok?'Google Drive conectado y respaldo enviado.':(r?.drive?.error||'No se pudo conectar.'),!r?.drive?.ok)}
  else if(a==='dir'){try{await bkPickDir();const r=await bkRun('manual',false);toast(r?.carpeta?.ok?'Carpeta configurada y respaldo guardado.':(r?.carpeta?.error||'Carpeta configurada.'),!r?.carpeta?.ok)}catch(err){if(err.name!=='AbortError')toast(err.message,true)}bkRender()}
  else if(a==='authdir'){try{if((await bkDir.requestPermission({mode:'readwrite'}))==='granted'){await bkRun('manual',false);toast('Carpeta autorizada.')}}catch(err){toast(err.message,true)}bkRender()}
  else if(a==='restore')bkRestore(b.dataset.file)});
}
async function bkRestore(file){
 if(me?.rol!=='Administrador')return;
 try{const r=await fetch(BK_API+'/api/respaldos/'+encodeURIComponent(file));if(!r.ok)throw new Error('No se pudo leer el respaldo del servidor.');
  const parsed=await r.json(),inc=parsed.datos||parsed;if(!inc.carreras||!inc.estudiantes||!inc.pasantias)throw new Error('El archivo no parece un respaldo SIGEPAS válido.');
  if(!confirm('Se reemplazarán los datos actuales por el respaldo «'+file+'». ¿Desea continuar?'))return;
  for(const k of Object.keys(SEED))if(!Array.isArray(inc[k]))inc[k]=[];
  db=inc;migrate();saveDB();bootstrap.Modal.getInstance($('bkModal'))?.hide();
  if(!syncSession()){toast('Datos restaurados. Su usuario ya no existe en el respaldo: inicie sesión de nuevo.',true);return}
  toast('Datos restaurados correctamente.');renderNav();renderPage(currentPage)}catch(err){toast(err.message||'No se pudo restaurar.',true)}}
function bkLine(icon,titulo,st,extra){const ok=st&&st.ok,txt=!st?'Sin respaldos todavía':ok?'Último: '+bkHora(st.t):'Error: '+esc(st.error||'');return `<li class="d-flex gap-2 align-items-start mb-2"><i class="bi ${icon} fs-5 ${!st?'text-muted':ok?'text-success':'text-danger'}"></i><div><strong>${titulo}</strong><div class="small ${ok||!st?'text-muted':'text-danger'}">${txt}</div>${extra||''}</div></li>`}
async function bkRender(){
 const s=bkLoad(),admin=me?.rol==='Administrador';let lista=[],srvOk=true;
 try{lista=(await(await fetch(BK_API+'/api/respaldos')).json()).respaldos||[]}catch{srvOk=false}
 const driveBtn=bkCfg.googleClientId?`<button class="btn btn-outline-primary btn-sm mt-1" data-bk="drive" type="button"><i class="bi bi-google me-1"></i>${s.driveLinked?'Reconectar':'Conectar'} Google Drive</button>`:'<div class="small text-muted">Para usar Google Drive inicie el servidor con GOOGLE_CLIENT_ID (ver README).</div>';
 $('bkBody').innerHTML=`<p class="small text-muted">Respaldo automático cada <strong id="bkIntTxt">${bkDur(bkSeg())}</strong> mientras haya una sesión abierta (Administrador o Coordinador).</p>${admin?bkIntervalForm():''}
 <ul class="list-unstyled">${bkLine('bi-hdd-network','Servidor (automático)',srvOk?s.servidor:{ok:false,t:Date.now(),error:'Servidor no disponible. Inicie «node server.js».'},'<div class="small text-muted">Carpeta <code>respaldos/</code> del servidor.</div>')}
 ${bkLine('bi-folder-check','Carpeta del equipo (automático)',s.carpeta,await bkFolderBtns())}
 ${bkLine('bi-cloud-check','Nube · Google Drive (automático)',s.drive,driveBtn)}
 ${bkCfg.nubeLocal?bkLine('bi-cloud-upload','Nube · carpeta sincronizada',s.servidor&&s.servidor.ok?{ok:!!s.servidor.carpetaNube,t:s.servidor.t,error:'No se pudo copiar a la carpeta.'}:null,'<div class="small text-muted">Carpeta «'+esc(bkCfg.carpetaNube)+'».</div>'):''}</ul>
 <div class="d-flex gap-2 flex-wrap mb-3"><button class="btn btn-primary btn-sm" data-bk="now" type="button"><i class="bi bi-cloud-arrow-up me-1"></i>Respaldar ahora</button><button class="btn btn-outline-secondary btn-sm" data-bk="download" type="button"><i class="bi bi-download me-1"></i>Descargar copia manual (.json)</button>${admin?'<button class="btn btn-outline-secondary btn-sm" data-bk="file" type="button"><i class="bi bi-upload me-1"></i>Restaurar desde archivo</button>':''}</div>
 <h6 class="mt-3">Respaldos guardados en el servidor</h6>
 <div class="table-responsive"><table class="table table-sm align-middle"><thead><tr><th>Archivo</th><th>Fecha</th><th>Tipo</th>${admin?'<th></th>':''}</tr></thead><tbody>${lista.slice(0,15).map(b=>`<tr><td><code>${esc(b.archivo)}</code></td><td>${bkHora(b.fecha)}</td><td>${esc(b.origen)}</td>${admin?`<td class="text-end"><button class="btn btn-outline-danger btn-sm py-0" data-bk="restore" data-file="${esc(b.archivo)}" type="button">Restaurar</button></td>`:''}</tr>`).join('')||`<tr><td colspan="4" class="text-center text-muted">Sin respaldos.</td></tr>`}</tbody></table></div>`}
function bkIntervalForm(){
 const s=bkSeg(),u=s%86400===0?86400:s%3600===0?3600:s%60===0?60:1,sel=v=>u===v?' selected':'';
 return `<div class="border rounded p-3 mb-3 bg-light"><label class="form-label fw-semibold mb-1" for="bkIntVal"><i class="bi bi-stopwatch me-1"></i>Frecuencia del respaldo automático</label>
 <div class="small text-muted mb-2">Solo el Administrador puede cambiarla. Mínimo ${BK_MIN_SEG} segundos y máximo 7 días.</div>
 <div class="d-flex gap-2 flex-wrap align-items-center"><span class="small">Cada</span><input id="bkIntVal" type="number" class="form-control form-control-sm" style="width:6rem" min="1" step="1" value="${s/u}"><select id="bkIntUnit" class="form-select form-select-sm" style="width:auto"><option value="1"${sel(1)}>segundos</option><option value="60"${sel(60)}>minutos</option><option value="3600"${sel(3600)}>horas</option><option value="86400"${sel(86400)}>días</option></select>
 <button class="btn btn-primary btn-sm" data-bk="interval" type="button"><i class="bi bi-check2 me-1"></i>Guardar</button><button class="btn btn-outline-secondary btn-sm" data-bk="intervalDef" type="button">Valor por defecto</button></div><div class="small text-danger mt-1" id="bkIntErr"></div></div>`}
function bkSetInterval(seg){
 if(me?.rol!=='Administrador')return 'Solo el Administrador puede cambiar la frecuencia del respaldo.';
 if(seg!==null&&(!Number.isFinite(seg)||seg<BK_MIN_SEG||seg>BK_MAX_SEG))return `La frecuencia debe estar entre ${BK_MIN_SEG} segundos y 7 días.`;
 if(seg===null)delete db.config?.respaldoSeg;else{db.config=db.config||{};db.config.respaldoSeg=Math.round(seg)}
 saveDB();bkCfg.intervaloSeg=bkSeg();
 /* Reinicia la cuenta para que el nuevo intervalo rija desde ahora. */
 try{localStorage.setItem('sigepasBackupLastAuto',String(Date.now()))}catch{}
 return ''}
async function bkFolderBtns(){
 const ok=bkDir&&await bkDirOk().catch(()=>false);
 return `<div class="small text-muted">${bkDir?'Carpeta: <code>'+esc(bkDir.name)+'</code>':'Funciona sin servidor. Si elige la carpeta de «Google Drive para escritorio», queda en la nube.'}</div><button class="btn btn-outline-primary btn-sm mt-1" data-bk="dir" type="button"><i class="bi bi-folder2-open me-1"></i>${bkDir?'Cambiar':'Elegir'} carpeta</button>${bkDir&&!ok?' <button class="btn btn-warning btn-sm mt-1" data-bk="authdir" type="button">Autorizar carpeta</button>':''}`}
function bkRefreshUI(){const el=$('bkStatus');if(el){const s=bkLoad().servidor;el.textContent=s?(s.ok?'Último respaldo: '+bkHora(s.t):'Respaldo con error'):'Sin respaldos'}if($('bkModal')?.classList.contains('show'))bkRender()}
async function bkInit(){
 if(!bkCanUse())return;
 await bkDirLoad();
 try{const j=await(await fetch(BK_API+'/api/estado')).json();if(j.ok){bkCfg={...bkCfg,...j};bkSrvSeg=Math.max(BK_MIN_SEG,Number(j.intervaloSeg)||BK_SEG_DEF)}}catch{}
 bkCfg.intervaloSeg=bkSeg();
 const btn=document.createElement('button');btn.id='bkBtn';btn.type='button';btn.className='btn btn-outline-success btn-sm';btn.title='Respaldo automático y en la nube';btn.innerHTML='<i class="bi bi-cloud-arrow-up me-1"></i>Respaldos';
 $('backupBtn').parentElement.insertAdjacentElement('beforebegin',btn);
 btn.addEventListener('click',()=>{bkEnsureUI();bkRender();bootstrap.Modal.getOrCreateInstance($('bkModal')).show()});
 const f=document.querySelector('footer');if(f)f.insertAdjacentHTML('beforeend',' · <span id="bkStatus"></span>');bkRefreshUI();
 setInterval(bkTick,5000);setTimeout(bkTick,1500)}
/* main.js abre la sesión después de cargar este archivo: se espera a que haya usuario. */
const bkWait=setInterval(()=>{if(me){clearInterval(bkWait);bkInit()}},300);setTimeout(()=>clearInterval(bkWait),15000);
