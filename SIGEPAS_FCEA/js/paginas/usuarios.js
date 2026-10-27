'use strict';
/* ====================================================================
   PÁGINA · Usuarios
   Cuentas de acceso, roles, permisos por rol y restablecimiento de contraseñas.
   Es de nivel de seguridad alto: pide confirmar la contraseña al abrirla.
   ==================================================================== */
/* Cuentas de demostración (se crean la primera vez; luego se administran desde «Usuarios»). */
const DEMO=[
 {id:1,username:'admin',password:'admin123',nombre:'Administrador',correo:'admin@fcea.example',rol:'Administrador',vinculoId:''},
 {id:2,username:'coordinador',password:'coord123',nombre:'Coordinación de Pasantías',correo:'coordinacion@fcea.example',rol:'Coordinador',vinculoId:''},
 {id:3,username:'rosa.gimenez',password:'docente123',nombre:'Lic. Rosa Giménez',correo:'rosa.gimenez@fcea.example',rol:'Docente',vinculoId:1},
 {id:4,username:'laura.martinez',password:'tutor123',nombre:'Laura Martínez',correo:'laura.martinez@coopnorte.example',rol:'Tutor externo',vinculoId:2},
 {id:5,username:'maria.lopez',password:'estudiante123',nombre:'María Fernanda López',correo:'maria.lopez@estudiante.edu.py',rol:'Pasante',vinculoId:1},
 {id:6,username:'juan.benitez',password:'estudiante123',nombre:'Juan Carlos Benítez',correo:'juan.benitez@estudiante.edu.py',rol:'Pasante',vinculoId:2},
 {id:7,username:'ana.duarte',password:'estudiante123',nombre:'Ana Belén Duarte',correo:'ana.duarte@estudiante.edu.py',rol:'Pasante',vinculoId:3}
];
function defaultUsers(){return DEMO.map(({password,...u})=>{const salt=newSalt();return {...u,salt,hash:sha256(salt+password),estado:'Activo',creado:new Date().toISOString().slice(0,10),ultimoAcceso:''}})}
SEED.usuarios=defaultUsers();
SEED.solicitudesClave=[]; /* solicitudes de «¿Olvidaste tu contraseña?» */
configs.usuarios={title:'Usuarios',singular:'Usuario',icon:'bi-person-gear',desc:'',fields:[{key:'nombre',label:'Nombre completo',required:true},{key:'username',label:'Nombre de usuario',required:true},{key:'correo',label:'Correo electrónico',type:'email',required:true},{key:'rol',label:'Rol',type:'select',options:ROLES,required:true},{key:'estado',label:'Estado de la cuenta',type:'select',options:['Activo','Inactivo'],required:true,def:'Activo'},{key:'accesoRapido',label:'Mostrar en el inicio de sesión (acceso rápido)',type:'select',options:['Sí','No'],def:'No'},{key:'password',label:'Contraseña',type:'password',requiredOnCreate:true,ph:id=>id?'Dejar en blanco para conservar la actual':'Mínimo 8 caracteres'},{key:'passwordConfirm',label:'Confirmar contraseña',type:'password',requiredOnCreate:true,ph:'Repita la contraseña'}],columns:[],search:['nombre','username','correo','rol']};
UNIQUE.usuarios=[{f:'username',n:'code',m:'Ya existe un usuario con ese nombre de usuario.'},{f:'correo',n:'mail',m:'Ya existe un usuario con ese correo.'}];
function roleBadge(r){const i=ROLE_INFO[r];return `<span class="badge-status role-${i?i.slug:'x'}">${esc(r||'—')}</span>`}
function linkedLabel(u){if(u.rol==='Pasante')return find('estudiantes',u.vinculoId)?.nombre||'—';if(u.rol==='Docente'||u.rol==='Tutor externo')return find('tutores',u.vinculoId)?.nombre||'—';return 'Sin vínculo'}
function fmtAccess(v){if(!v)return 'Nunca';const d=new Date(v);return isNaN(d)?'—':d.toLocaleDateString('es-PY',{day:'2-digit',month:'2-digit',year:'numeric'})+' '+d.toLocaleTimeString('es-PY',{hour:'2-digit',minute:'2-digit'})}
function permText(rol,page){const a=PERMS[rol]?.[page]||[];if(!a.length)return '<span class="perm none">—</span>';if(a.length===4)return '<span class="perm full">Total</span>';if(a.length===1)return '<span class="perm view">Solo ver</span>';return `<span class="perm some">${a.map(x=>({ver:'Ver',crear:'Crear',editar:'Editar',eliminar:'Eliminar'}[x])).join(' · ')}</span>`}
function resetBox(){const pend=list('solicitudesClave').filter(r=>r.estado==='Pendiente'&&find('usuarios',r.usuarioId));if(!pend.length)return '';return `<section class="reset-box"><div class="reset-title"><i class="bi bi-key"></i>Solicitudes de restablecimiento de contraseña<span class="you-tag">${pend.length}</span></div><p>Verifique la identidad de la persona por un canal oficial y luego asigne una contraseña temporal.</p>${pend.map(r=>{const u=find('usuarios',r.usuarioId);return `<div class="reset-row"><div><b>${esc(u.nombre)}</b><span>@${esc(u.username)} · ${esc(u.rol)} · solicitada el ${esc(fmtAccess(r.fecha))}</span></div><div class="d-flex gap-2"><button class="btn btn-sm btn-primary" data-reset="${r.id}">Asignar contraseña</button><button class="btn btn-sm btn-light" data-dismiss="${r.id}">Descartar</button></div></div>`}).join('')}</section>`}
function renderUsers(){const us=list('usuarios');
$('pageContent').innerHTML=`<div class="welcome"><div><h3>Usuarios</h3><p>Administre las cuentas de acceso y el rol que define qué puede ver y hacer cada persona.</p></div><button class="btn btn-primary" id="addRecord"><i class="bi bi-person-plus me-2"></i>Nuevo usuario</button></div>
<div class="role-grid">${ROLES.map(r=>`<div class="role-card"><div class="role-icon role-${ROLE_INFO[r].slug}"><i class="bi ${ROLE_INFO[r].icon}"></i></div><div><strong>${esc(r)}</strong><span class="role-count">${us.filter(u=>u.rol===r).length} usuario(s)</span><p>${esc(ROLE_INFO[r].desc)}</p></div></div>`).join('')}</div>
${resetBox()}<div class="table-card"><div class="table-toolbar"><div><h4>Listado de usuarios</h4><p id="rowCount">${us.length} usuario(s)</p></div><div class="filter-row"><select id="roleFilter" class="form-select"><option value="">Todos los roles</option>${ROLES.map(r=>`<option>${esc(r)}</option>`).join('')}</select><div class="input-group input-group-sm search-box"><span class="input-group-text"><i class="bi bi-search"></i></span><input id="tableSearch" class="form-control" placeholder="Buscar usuario..."></div></div></div><div id="tableMount"></div></div>
<section class="panel mt-4"><div class="panel-heading"><div><h4>Permisos por rol</h4><p>Qué puede hacer cada rol en cada módulo. Docentes, tutores y pasantes solo ven los datos de sus propias pasantías.</p></div></div><div class="table-responsive"><table class="table perm-table"><thead><tr><th>Módulo</th>${ROLES.map(r=>`<th>${esc(r)}</th>`).join('')}</tr></thead><tbody>${NAV.map(([p,,l])=>`<tr><td><b>${esc(l)}</b></td>${ROLES.map(r=>`<td>${permText(r,p)}</td>`).join('')}</tr>`).join('')}</tbody></table></div></section>`;
$('pageContent').querySelectorAll('[data-reset]').forEach(b=>b.addEventListener('click',()=>{const r=find('solicitudesClave',b.dataset.reset);if(r&&find('usuarios',r.usuarioId))openRecord('usuarios',r.usuarioId)}));$('pageContent').querySelectorAll('[data-dismiss]').forEach(b=>b.addEventListener('click',()=>{const r=find('solicitudesClave',b.dataset.dismiss);if(r){r.estado='Descartada';saveDB();renderUsers()}}));
$('addRecord').addEventListener('click',()=>openRecord('usuarios'));$('tableSearch').addEventListener('input',renderUserRows);$('roleFilter').addEventListener('change',renderUserRows);renderUserRows()}
function renderUserRows(){const q=($('tableSearch')?.value||'').toLowerCase(),role=$('roleFilter')?.value||'';const rows=list('usuarios').filter(u=>(!role||u.rol===role)&&[u.nombre,u.username,u.correo,u.rol,linkedLabel(u)].join(' ').toLowerCase().includes(q));$('rowCount').textContent=`${rows.length} usuario(s)`;
if(!rows.length){$('tableMount').innerHTML=empty('No se encontraron usuarios','Pruebe con otro término de búsqueda o filtro.');return}
$('tableMount').innerHTML=`<div class="table-responsive"><table class="table"><thead><tr><th>Usuario</th><th>Rol</th><th>Vinculado a</th><th>Estado</th><th>Inicio de sesión</th><th>Último acceso</th><th class="text-end">Acciones</th></tr></thead><tbody>${rows.map(u=>`<tr><td><span class="table-person">${esc(u.nombre)}${String(u.id)===String(me.id)?' <span class="you-tag">usted</span>':''}</span><span class="table-sub">@${esc(u.username)} · ${esc(u.correo||'sin correo')}</span></td><td>${roleBadge(u.rol)}</td><td>${esc(linkedLabel(u))}</td><td>${badge(u.estado)}</td><td>${u.accesoRapido==='Sí'?'<span class="badge-status role-coordinador"><i class="bi bi-lightning-charge-fill me-1"></i>Acceso rápido</span>':'<span class="table-sub">—</span>'}</td><td>${esc(fmtAccess(u.ultimoAcceso))}</td><td><div class="action-buttons justify-content-end"><button class="action-btn" title="${u.accesoRapido==='Sí'?'Quitar del':'Agregar al'} inicio de sesión (acceso rápido)" data-quick="${u.id}"><i class="bi ${u.accesoRapido==='Sí'?'bi-lightning-charge-fill':'bi-lightning-charge'}"></i></button><button class="action-btn" title="Editar / restablecer contraseña" data-edit="${u.id}"><i class="bi bi-pencil"></i></button><button class="action-btn danger" title="Eliminar" data-delete="${u.id}"><i class="bi bi-trash3"></i></button></div></td></tr>`).join('')}</tbody></table></div>`;
$('tableMount').querySelectorAll('[data-quick]').forEach(b=>b.addEventListener('click',()=>{const u=find('usuarios',b.dataset.quick);if(!u)return;u.accesoRapido=u.accesoRapido==='Sí'?'No':'Sí';saveDB();renderUserRows()}));$('tableMount').querySelectorAll('[data-edit]').forEach(b=>b.addEventListener('click',()=>openRecord('usuarios',Number(b.dataset.edit))));$('tableMount').querySelectorAll('[data-delete]').forEach(b=>b.addEventListener('click',()=>askDelete('usuarios',Number(b.dataset.delete))))}
function prepareUser(rec,old,id){
 rec.username=String(rec.username||'').trim().toLowerCase();
 if(!/^[a-z0-9._-]{3,30}$/.test(rec.username))return 'El nombre de usuario debe tener de 3 a 30 caracteres: letras, números, punto, guion o guion bajo (sin espacios).';
 /* El vínculo con el registro se define desde Docentes y tutores (o al crear la cuenta desde Pasantes). */
 const kind=r=>r==='Pasante'?'e':(r==='Docente'||r==='Tutor externo')?r:'';
 if(!id||!kind(rec.rol)||kind(rec.rol)!==kind(old.rol))rec.vinculoId='';
 if(rec.password||rec.passwordConfirm){const pe=passwordCheck(rec.password||'',rec.passwordConfirm||'');if(pe)return pe;rec.salt=newSalt();rec.hash=sha256(rec.salt+rec.password)}
 else if(!id)return 'La contraseña es obligatoria para un usuario nuevo.';
 else{rec.salt=old.salt;rec.hash=old.hash}
 delete rec.password;delete rec.passwordConfirm;
 if(id){
  if(String(id)===String(me.id)&&(rec.rol!==me.rol||rec.estado!=='Activo'))return 'No puede cambiar su propio rol ni desactivar su propia cuenta.';
  if(old.rol==='Administrador'&&old.estado==='Activo'&&(rec.rol!=='Administrador'||rec.estado!=='Activo')&&!list('usuarios').some(u=>u.id!==id&&u.rol==='Administrador'&&u.estado==='Activo'))return 'Debe existir al menos un administrador activo.';
 }else{rec.creado=nowDate();rec.ultimoAcceso=''}
 return '';
}
PAGE_RENDER.usuarios={title:'Usuarios',render:renderUsers};
PAGE_HOOKS.usuarios={
 migrar(){if(!db.usuarios.length)return; /* base vacía: no se recrean cuentas solas */
  /* Una sola vez: acceso rápido para las cuentas de siempre; incluidos los docentes Rosa Giménez y Juan Benito (si existe su cuenta). */
  if(!db._accesoRapidoInit){const jb=db.usuarios.find(u=>u.rol==='Docente'&&NORM.text(u.nombre).includes('juan benito')),base=['admin','coordinador','laura.martinez','maria.lopez','juan.benitez'];
   db.usuarios.forEach(u=>{u.accesoRapido=(base.includes(u.username)||u===jb||u.username==='rosa.gimenez')?'Sí':'No'});db._accesoRapidoInit=true;saveDB()}
  db.usuarios.forEach(u=>{if(u.accesoRapido!=='Sí'&&u.accesoRapido!=='No')u.accesoRapido='No'})},
 antesDeGuardar(c){const err=prepareUser(c.rec,c.old,c.id);if(err)return err},
 despuesDeGuardar(c){const {rec,old,id}=c;
  if(id&&rec.hash!==old.hash)list('solicitudesClave').forEach(r=>{if(r.usuarioId===id&&r.estado==='Pendiente'){r.estado='Resuelta';r.resuelta=new Date().toISOString()}});
  if(id&&String(id)===String(me.id)){me=find('usuarios',id);renderChip()}},
 bloqueoEliminar(id){const u=find('usuarios',id);if(String(id)===String(me.id))return 'No puede eliminar su propia cuenta.';if(u&&u.rol==='Administrador'&&u.estado==='Activo'&&!list('usuarios').some(x=>x.id!==id&&x.rol==='Administrador'&&x.estado==='Activo'))return 'Debe existir al menos un administrador activo.'},
 avisoEliminar(id){const n=list('solicitudesClave').filter(x=>x.usuarioId===id).length;return `<div class="dp-also">Solo se elimina la cuenta de acceso. El registro vinculado y sus pasantías se conservan${n?`; se borran ${n} solicitud(es) de restablecimiento de contraseña`:''}.</div>`},
 alEliminar(id){db.solicitudesClave=list('solicitudesClave').filter(r=>r.usuarioId!==id)}
};
