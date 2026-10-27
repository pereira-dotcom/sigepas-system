'use strict';
/* ====================================================================
   SESIÓN Y NAVEGACIÓN · sesión abierta, cierre de sesión, perfil, respaldo, menú,
   bloqueo por inactividad y confirmación de contraseña en páginas de nivel alto.
   ==================================================================== */
let locked=false, lockFails=0, lockFocus=null; /* bloqueo por inactividad */
let lastActive=Number(sessionStorage.getItem('fceaLastActive'))||Date.now(),lastStamp=0,reauthUntil=Number(sessionStorage.getItem('fceaReauth'))||0,reauthDone=false,reauthTarget='',reauthFails=0;
function syncSession(){const id=sessionStorage.getItem('fceaUser');const u=id?find('usuarios',id):null;if(!u||u.estado!=='Activo'){if(me)logout();me=null;return false}me=u;return true}
function renderChip(){const ini=me.nombre.split(/\s+/).filter(Boolean).slice(0,2).map(w=>w[0]).join('').toUpperCase()||'U';$('userAvatar').textContent=ini;$('userName').textContent=me.nombre;$('userRole').textContent=me.rol}
function renderNav(){$('mainNav').innerHTML=NAV.filter(([p])=>can(p,'ver')).map(([p,i,l])=>`<a class="nav-link${p===currentPage?' active':''}" href="${p}.html" data-page="${p}"${p===currentPage?' aria-current="page"':''}><i class="bi ${i}"></i>${esc(l)}${SECURE_PAGES.includes(p)?'<i class="bi bi-shield-lock nav-secure" title="Nivel de seguridad alto: pide confirmar la contraseña"></i>':''}</a>`).join('');$('backupBtn').classList.toggle('d-none',!['Administrador','Coordinador'].includes(me.rol));$('restoreBtn').classList.toggle('d-none',me.rol!=='Administrador')}
function showApp(){$('appView').classList.remove('d-none');renderChip();renderNav();const fl=sessionStorage.getItem('fceaFlash');if(fl){sessionStorage.removeItem('fceaFlash');toast(fl,true)}if(SECURE_PAGES.includes(currentPage)&&Date.now()>reauthUntil)askReauth(currentPage);else renderPage(currentPage)}
/* Cada opción del menú es su propio .html: ir a otra sección es abrir su archivo. */
function goPage(p){location.href=p+'.html'}
function flashTo(p,msg){try{sessionStorage.setItem('fceaFlash',msg)}catch{}location.replace(p+'.html')}
function logout(msg){reauthDone=true;document.querySelectorAll('.modal.show').forEach(m=>bootstrap.Modal.getInstance(m)?.hide());['fceaUser','fceaLastActive','fceaLocked','fceaReauth','fceaFlash'].forEach(k=>sessionStorage.removeItem(k));if(typeof msg==='string'&&msg)sessionStorage.setItem('fceaLoginMsg',msg);reauthUntil=0;me=null;location.replace('index.html')}
$('logoutBtn').addEventListener('click',()=>logout());
/* Mi perfil / cambio de contraseña */
$('userChip').addEventListener('click',()=>{$('profileInfo').innerHTML=`<strong>${esc(me.nombre)}</strong><span>${esc(me.rol)} · @${esc(me.username)}</span>`;$('profileForm').reset();$('profileError').textContent='';pwLive($('newPass'),$('newPass2'),$('profileMatch'),$('profileRules'));bootstrap.Modal.getOrCreateInstance($('profileModal')).show()});
$('profileForm').addEventListener('input',e=>{if(e.target.id==='newPass'||e.target.id==='newPass2')pwLive($('newPass'),$('newPass2'),$('profileMatch'),$('profileRules'))});
$('profileForm').addEventListener('submit',e=>{e.preventDefault();const cur=$('curPass').value,np=$('newPass').value,cf=$('newPass2').value;if(sha256((me.salt||'')+cur)!==me.hash){$('profileError').textContent='La contraseña actual no es correcta.';return}const pe=passwordError(np);if(pe){$('profileError').textContent=pe;return}if(np!==cf){$('profileError').textContent='La confirmación no coincide con la nueva contraseña.';return}me.salt=newSalt();me.hash=sha256(me.salt+np);saveDB();bootstrap.Modal.getInstance($('profileModal')).hide();toast('Contraseña actualizada correctamente.')});
$('mobileMenu').addEventListener('click',()=>$('sidebar').classList.toggle('open'));
$('backupBtn').addEventListener('click',()=>{const blob=new Blob([JSON.stringify({app:'SIGEPAS',version:1,exportado:new Date().toISOString(),datos:db},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='respaldo_sigepas.json';a.click();URL.revokeObjectURL(url);toast('Respaldo descargado.')});
$('restoreBtn').addEventListener('click',()=>{if(me?.rol==='Administrador')$('restoreFile').click()});
$('restoreFile').addEventListener('change',async e=>{const f=e.target.files?.[0];if(!f)return;try{const parsed=JSON.parse(await f.text()),incoming=parsed.datos||parsed;if(!incoming.carreras||!incoming.estudiantes||!incoming.pasantias)throw new Error('El archivo no parece un respaldo SIGEPAS válido.');if(!confirm('La restauración reemplazará los datos actuales del navegador. ¿Desea continuar?'))return;for(const k of Object.keys(SEED))if(!Array.isArray(incoming[k]))incoming[k]=[];db=incoming;migrate();saveDB();if(!syncSession()){toast('Datos restaurados. Su usuario ya no existe en el respaldo: inicie sesión de nuevo.',true);return}toast('Datos restaurados correctamente.');renderNav();renderPage(currentPage)}catch(err){toast(err.message||'No se pudo restaurar el archivo.',true)}finally{e.target.value=''}});
function renderPage(page=currentPage){if(!me||!syncSession())return;if(page!==currentPage){goPage(page);return}if(!can(page,'ver')){flashTo('inicio','No tiene permiso para acceder a esa sección.');return}const pr=PAGE_RENDER[page],cfg=configs[page];if(pr){$('pageTitle').textContent=pr.title;pr.render();return}if(!cfg)return;$('pageTitle').textContent=cfg.title;renderTablePage(page)}
/* ---- Seguridad: cierre por inactividad y nivel de acceso alto ---- */
function stamp(){const t=Date.now();lastActive=t;if(t-lastStamp>2000){lastStamp=t;try{sessionStorage.setItem('fceaLastActive',String(t))}catch{}}}
/* Al cambiar de página se conserva la última actividad, para que el bloqueo por inactividad siga contando. */
window.addEventListener('pagehide',()=>{if(me)try{sessionStorage.setItem('fceaLastActive',String(lastActive))}catch{}});
function idleTick(){if(!me||locked)return;const idle=Date.now()-lastActive;if(idle>=IDLE_LOGOUT_MS){lockScreen();return}$('idleWarn').classList.toggle('d-none',idle<IDLE_LOGOUT_MS-WARN_MS)}
['mousemove','mousedown','keydown','wheel','touchstart','scroll'].forEach(ev=>document.addEventListener(ev,()=>{if(!me||locked)return;stamp();$('idleWarn').classList.add('d-none')},{passive:true,capture:true}));
$('idleKeep').addEventListener('click',()=>{if(locked)return;stamp();$('idleWarn').classList.add('d-none')});
/* Bloqueo por inactividad: se superpone sin tocar lo que hay debajo (formularios, filtros, texto escrito), así que al desbloquear se sigue donde se estaba. */
function lockScreen(){
 if(!me||locked)return;
 locked=true;lockFails=0;lockFocus=document.activeElement;
 try{sessionStorage.setItem('fceaLocked','1')}catch{}
 $('idleWarn').classList.add('d-none');
 document.querySelectorAll('.combo-list').forEach(l=>l.classList.add('d-none'));
 $('lockUser').textContent=me.nombre+' · '+me.rol;$('lockPass').value='';$('lockError').textContent='';
 document.querySelectorAll('#appView,.modal').forEach(el=>el.setAttribute('inert',''));
 $('lockView').classList.remove('d-none');
 setTimeout(()=>$('lockPass').focus(),60)}
function unlockScreen(){
 locked=false;try{sessionStorage.removeItem('fceaLocked')}catch{}
 $('lockView').classList.add('d-none');$('lockPass').value='';
 document.querySelectorAll('#appView,.modal').forEach(el=>el.removeAttribute('inert'));
 stamp();
 if(lockFocus&&document.contains(lockFocus)&&!lockFocus.classList?.contains('combo-input'))try{lockFocus.focus({preventScroll:true})}catch{}}
/* Bootstrap devuelve el foco al modal abierto; aquí se le impide para poder escribir la contraseña de desbloqueo. */
window.addEventListener('focusin',e=>{if($('lockView').contains(e.target))e.stopPropagation()},true);
$('lockForm').addEventListener('submit',e=>{e.preventDefault();if(!me||!locked)return;
 if(sha256((me.salt||'')+$('lockPass').value)===me.hash){unlockScreen();return}
 lockFails++;$('lockPass').value='';
 if(lockFails>=5){logout('Demasiados intentos fallidos. Inicie sesión nuevamente.');return}
 $('lockError').textContent='Contraseña incorrecta. Intentos restantes: '+(5-lockFails)+'.';$('lockPass').focus()});
$('lockLogout').addEventListener('click',()=>logout());
function askReauth(page){reauthTarget=page;reauthFails=0;reauthDone=false;$('reauthPage').textContent=NAV.find(n=>n[0]===page)?.[2]||page;$('reauthPass').value='';$('reauthError').textContent='';const m=$('reauthModal');m.addEventListener('shown.bs.modal',()=>$('reauthPass').focus(),{once:true});
 /* Si se cierra la ventana sin confirmar, se vuelve al Panel principal. */
 m.addEventListener('hidden.bs.modal',()=>{if(!reauthDone)location.replace('inicio.html')},{once:true});bootstrap.Modal.getOrCreateInstance(m).show()}
$('reauthForm').addEventListener('submit',e=>{e.preventDefault();if(!me)return;if(sha256((me.salt||'')+$('reauthPass').value)===me.hash){reauthUntil=Date.now()+REAUTH_MS;try{sessionStorage.setItem('fceaReauth',String(reauthUntil))}catch{}reauthDone=true;$('reauthPass').value='';bootstrap.Modal.getInstance($('reauthModal')).hide();renderPage(reauthTarget);return}reauthFails++;$('reauthPass').value='';if(reauthFails>=5){logout('Demasiados intentos fallidos. Inicie sesión nuevamente.');return}$('reauthError').textContent='Contraseña incorrecta. Intentos restantes: '+(5-reauthFails)+'.'});
