'use strict';
/* ====================================================================
   PÁGINA · Docentes y tutores
   Docentes (tutores académicos) y tutores externos, con la cuenta de
   acceso que define qué pasantías puede ver cada uno.
   ==================================================================== */
SEED.tutores=[{id:1,nombre:'Lic. Rosa Giménez',cedula:'4000001',correo:'rosa.gimenez@fcea.example',telefono:'0981-111-111',rol:'Docente',estado:'Activo'},{id:2,nombre:'Laura Martínez',cedula:'8000001',correo:'laura.martinez@coopnorte.example',telefono:'0981-222-222',rol:'Tutor externo',estado:'Activo'},{id:3,nombre:'Mg. Pedro Rojas',cedula:'4000002',correo:'pedro.rojas@fcea.example',telefono:'0981-333-333',rol:'Docente',estado:'Activo'}];
configs.tutores={title:'Docentes y tutores',singular:'Tutor',icon:'bi-person-badge',desc:'Registre docentes (tutores académicos) y tutores o supervisores externos.',fields:[{key:'nombre',label:'Nombre y apellido',required:true},{key:'cedula',label:'Cédula',required:true},{key:'correo',label:'Correo electrónico',type:'email',required:true},{key:'telefono',label:'Teléfono'},{key:'rol',label:'Rol',type:'select',options:['Docente','Tutor externo'],required:true},{key:'estado',label:'Estado',type:'select',options:['Activo','Inactivo'],required:true},{key:'usuarioId',label:'Registro vinculado',type:'account',adminOnly:true,verEliminar:r=>{const a=tutorAccount(r.id);return a?'@'+a.username:'Sin cuenta vinculada'}}],columns:[['nombre','Nombre'],['cedula','Cédula'],['rol','Rol'],['correo','Correo'],['estado','Estado']],search:['nombre','cedula','correo','rol']};
UNIQUE.tutores=[{f:'cedula',n:'code',m:'Ya existe un tutor/docente con esa cédula.'},{f:'correo',n:'mail',m:'Ya existe un tutor/docente con ese correo.'},{f:'telefono',n:'tel',m:'Ya existe un tutor/docente con ese teléfono.'}];
const roleFor=t=>t&&t.rol==='Tutor externo'?'Tutor externo':'Docente';
const tutorAccount=id=>id?list('usuarios').find(u=>String(u.vinculoId)===String(id)&&(u.rol==='Docente'||u.rol==='Tutor externo')):null;
function accountOptions(tutorRol,tutorId){if(!tutorRol)return [];const need=roleFor({rol:tutorRol});return list('usuarios').filter(u=>u.rol===need&&(!u.vinculoId||(tutorId&&String(u.vinculoId)===String(tutorId)))).map(u=>({value:u.id,label:`${u.nombre} · @${u.username}`}))}
function syncTutorAccount(rec,sel){const mine=list('usuarios').filter(u=>String(u.vinculoId)===String(rec.id)&&(u.rol==='Docente'||u.rol==='Tutor externo'));mine.forEach(u=>{if(u.rol!==roleFor(rec)||(sel!==undefined&&String(u.id)!==String(sel)))u.vinculoId=''});if(sel){const w=find('usuarios',sel);if(w&&w.rol===roleFor(rec))w.vinculoId=rec.id}}
PAGE_HOOKS.tutores={
 abrir(rec,id){if(id){const ua=tutorAccount(id);if(ua)rec.usuarioId=ua.id}},
 /* Los roles antiguos «Tutor académico» y «Responsable académico» pasan a «Docente». */
 migrar(){db.tutores.forEach(t=>{if(t.rol!=='Tutor externo'&&t.rol!=='Docente')t.rol='Docente'});
  let cambio=false;
  /* Ajuste único pedido para la pasantía PAS-2026-001: su tutor académico pasa a ser «juan benito torres». */
  if(!db._ajustePas001){const p=db.pasantias.find(x=>x.codigo==='PAS-2026-001'),d=db.tutores.find(t=>t.rol==='Docente'&&NORM.text(t.nombre)==='juan benito torres');
   if(p&&d){if(p.tutorAcademico!==d.nombre)p.tutorAcademico=d.nombre;db._ajustePas001=true;cambio=true}}
  /* Todo usuario con rol Docente o Tutor externo debe estar registrado en Docentes y tutores y vinculado a su cuenta
     (aunque no figure todavía en ninguna pasantía). */
  db.usuarios.forEach(u=>{if(u.rol!=='Docente'&&u.rol!=='Tutor externo')return;
   const n=NORM.text(u.nombre);if(!n)return;
   const toks=x=>NORM.text(x).split(/\s+/).filter(w=>w.length>3);
   const mismoNombre=t=>{const a=toks(t.nombre),b=toks(u.nombre);return !a.length||!b.length||a.some(w=>b.includes(w))};
   const lv=db.tutores.find(t=>String(t.id)===String(u.vinculoId)&&t.rol===u.rol);
   /* Vínculo válido: mismo rol, nombre afín y no compartido con otra cuenta anterior. */
   if(lv&&mismoNombre(lv)&&!db.usuarios.some(y=>y!==u&&y.id<u.id&&String(y.vinculoId)===String(lv.id)&&(y.rol==='Docente'||y.rol==='Tutor externo')))return;
   const ocupado=x=>db.usuarios.some(y=>y!==u&&String(y.vinculoId)===String(x.id)&&(y.rol==='Docente'||y.rol==='Tutor externo'));
   let t=db.tutores.find(x=>x.rol===u.rol&&NORM.text(x.nombre)===n&&!ocupado(x));
   if(!t){const sd=(SEED.tutores||[]).find(x=>x.rol===u.rol&&NORM.text(x.nombre)===n)||{};
    const libre=k=>sd[k]&&!db.tutores.some(x=>NORM.text(x[k])===NORM.text(sd[k]));
    t={id:nextId('tutores'),nombre:u.nombre,cedula:libre('cedula')?sd.cedula:'',correo:u.correo||'',telefono:libre('telefono')?sd.telefono:'',rol:u.rol,estado:u.estado==='Inactivo'?'Inactivo':'Activo'};db.tutores.push(t)}
   u.vinculoId=t.id;cambio=true});
  if(cambio)saveDB()},
 alLeer(c){if(me.rol==='Administrador')c.extra.acctSel=c.rec.usuarioId;delete c.rec.usuarioId},
 antesDeGuardar(c){const sel=c.extra.acctSel;if(sel){const w=find('usuarios',sel);if(!w||w.rol!==roleFor(c.rec))return 'La cuenta seleccionada no corresponde al rol de este docente o tutor.';if(w.vinculoId&&String(w.vinculoId)!==String(c.id))return 'Esa cuenta ya está vinculada a otro registro.'}},
 despuesDeGuardar(c){syncTutorAccount(c.rec,c.extra.acctSel);
  /* Las pasantías guardan el nombre del tutor: si se cambia el nombre o el rol aquí, se actualiza allá. */
  const o=c.old&&c.old.nombre;if(o&&(NORM.text(o)!==NORM.text(c.rec.nombre)||c.old.rol!==c.rec.rol)){const f=c.old.rol==='Docente'?'tutorAcademico':'tutorInstitucional',nf=c.rec.rol==='Docente'?'tutorAcademico':'tutorInstitucional';
   if(f===nf)list('pasantias').forEach(p=>{if(NORM.text(p[f])===NORM.text(o))p[f]=c.rec.nombre})}},
 /* Al cambiar el rol se actualiza la lista de cuentas libres para ese rol. */
 alCambiar(e){if(e.target.id!=='field_rol')return;const inp=$('field_usuarioId');if(!inp)return;const opts=accountOptions(e.target.value,editing.id),keep=opts.find(o=>String(o.value)===String(inp.dataset.val));comboStore[inp.id]=opts;inp.dataset.val=keep?keep.value:'';inp.value=keep?keep.label:'';inp.disabled=!opts.length;$('accountHint').textContent=opts.length?'Cuenta de acceso de esta persona: define qué pasantías puede ver.':'No hay cuentas libres para este rol. Cree primero el usuario en el menú Usuarios.'},
 /* Si tiene un usuario ACTIVO vinculado no se puede eliminar: primero hay que inactivar la cuenta (menú Usuarios). */
 bloqueoEliminar(id){const act=list('usuarios').find(u=>String(u.vinculoId)===String(id)&&(u.rol==='Docente'||u.rol==='Tutor externo')&&u.estado==='Activo');
  if(act)return `No se puede eliminar: tiene un usuario activo vinculado (@${act.username}). Para eliminarlo, primero inactive esa cuenta en el menú Usuarios.`;
  const t=find('tutores',id),f=t&&(t.rol==='Docente'?'tutorAcademico':'tutorInstitucional'),n=t?list('pasantias').filter(p=>NORM.text(p[f])===NORM.text(t.nombre)).length:0;
  if(n)return `No se puede eliminar: está asignado a ${n} pasantía(s). Reasigne esas pasantías primero o márquelo como Inactivo.`},
 /* Al eliminarlo, las cuentas inactivas que tenía vinculadas quedan sin vínculo. */
 alEliminar(id){list('usuarios').forEach(u=>{if(String(u.vinculoId)===String(id)&&(u.rol==='Docente'||u.rol==='Tutor externo'))u.vinculoId=''})}
};
