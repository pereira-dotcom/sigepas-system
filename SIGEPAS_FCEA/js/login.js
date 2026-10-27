'use strict';
/* ====================================================================
   INGRESO · lógica de index.html (la única página sin sesión): cuentas de
   demostración, inicio de sesión y «¿Olvidaste tu contraseña?».
   Al ingresar se abre inicio.html; las demás opciones del menú son sus propios .html.
   ==================================================================== */
/* Accesos rápidos: son los usuarios activos marcados con «Acceso rápido» (se administra en Usuarios). Al eliminar un usuario desaparece también de aquí. */
function renderDemo(){const us=(typeof bdLista==='function'&&!bdLista())?[]:list('usuarios').filter(u=>u.accesoRapido==='Sí'&&u.estado==='Activo'),box=$('demoAccounts');box.hidden=!us.length;
 box.innerHTML=us.length?'<p>Accesos rápidos — clic para completar el usuario:</p><div>'+us.map(d=>`<button type="button" class="demo-chip" data-u="${esc(d.username)}"><span class="role-dot role-${(ROLE_INFO[d.rol]||{slug:'x'}).slug}"></span><b>${esc(d.rol)}</b><small>${esc(d.username)}</small></button>`).join('')+'</div>':''}
/* Inicio rápido: solo completa el usuario. La contraseña la escribe la persona (no se rellena ni viaja en el HTML). */
$('demoAccounts').addEventListener('click',e=>{const b=e.target.closest('.demo-chip');if(!b)return;$('loginUser').value=b.dataset.u;$('loginPass').value='';$('loginError').textContent='';$('loginPass').focus()});
$('loginForm').addEventListener('submit',e=>{e.preventDefault();if(!bdLista()){estadoLogin();return}const name=$('loginUser').value.trim().toLowerCase(),pass=$('loginPass').value;const u=list('usuarios').find(x=>String(x.username).toLowerCase()===name);if(!u||sha256((u.salt||'')+pass)!==u.hash){$('loginError').textContent='Usuario o contraseña incorrectos. Intente nuevamente.';return}if(u.estado!=='Activo'){$('loginError').textContent='Esta cuenta está inactiva. Comuníquese con la coordinación.';return}u.ultimoAcceso=new Date().toISOString();saveDB();sessionStorage.setItem('fceaUser',String(u.id));['fceaLocked','fceaReauth','fceaFlash','fceaLoginMsg',BD_FLAG].forEach(k=>sessionStorage.removeItem(k));sessionStorage.setItem('fceaLastActive',String(Date.now()));location.href='inicio.html'});
/* ¿Olvidaste tu contraseña? Registra una solicitud que el administrador ve en «Usuarios». */
$('forgotLink').addEventListener('click',e=>{e.preventDefault();$('forgotForm').reset();$('forgotMsg').textContent='';$('forgotSend').disabled=false;bootstrap.Modal.getOrCreateInstance($('forgotModal')).show()});
$('forgotForm').addEventListener('submit',e=>{e.preventDefault();const q=$('forgotId').value.trim().toLowerCase();if(!q)return;const u=list('usuarios').find(x=>String(x.username).toLowerCase()===q||String(x.correo||'').toLowerCase()===q);if(u&&!list('solicitudesClave').some(r=>r.usuarioId===u.id&&r.estado==='Pendiente')){db.solicitudesClave.push({id:nextId('solicitudesClave'),usuarioId:u.id,username:u.username,fecha:new Date().toISOString(),estado:'Pendiente'});saveDB()}$('forgotMsg').textContent='Solicitud enviada. Si los datos corresponden a una cuenta, el administrador la verá y le asignará una contraseña temporal. Se comunicará con usted por un canal oficial para verificar su identidad.';$('forgotSend').disabled=true});
/* Arranque: si ya hay una sesión abierta se pasa directo al panel; si se llegó por un cierre de sesión, se muestra el motivo. */
/* Para ingresar hay que CARGAR la base de datos en cada ingreso (botón de base de datos de esta pantalla).
   Queda bloqueado mientras se lee (IndexedDB), si la base está vacía o si todavía no se pulsó «Cargar». */
const BD_FLAG='fceaBDCargada';
let bdLeida=false;
const bdCargada=()=>sessionStorage.getItem(BD_FLAG)==='1';
const bdLista=()=>bdLeida&&list('usuarios').length>0&&bdCargada();
function estadoLogin(){
 const ok=bdLista();renderDemo();const err=$('loginError'),propio=err.dataset.bd==='1',b=$('btnCargarBD');
 ['loginUser','loginPass'].forEach(id=>$(id).disabled=!ok);$('loginForm').querySelector('button[type=submit]').disabled=!ok;
 if(b&&b.classList)b.classList.toggle('bd-pulse',bdLeida&&!ok);
 if(!ok){err.dataset.bd='1';err.textContent=!bdLeida?'Cargando la base de datos…':(!list('usuarios').length?'La base de datos está vacía. Pulse «Cargar la base de datos» (botón de base de datos, abajo a la derecha) para poder ingresar.':'Antes de ingresar debe cargar la base de datos: pulse el botón «Cargar la base de datos» (abajo a la derecha).')}
 else if(propio){err.dataset.bd='';err.textContent=''}
}
onDBReload=()=>{renderDemo();estadoLogin()};
const bdCarga=initDB();renderDemo();estadoLogin();
Promise.resolve(bdCarga).catch(()=>{}).then(()=>{bdLeida=true;renderDemo();estadoLogin()});
(()=>{const id=sessionStorage.getItem('fceaUser'),u=id?find('usuarios',id):null;
 if(u&&u.estado==='Activo'){location.replace('inicio.html');return}
 const msg=sessionStorage.getItem('fceaLoginMsg');if(msg){sessionStorage.removeItem('fceaLoginMsg');$('loginError').textContent=msg}})();
