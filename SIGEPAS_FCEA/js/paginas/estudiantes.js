'use strict';
/* ====================================================================
   PÁGINA · Pasantes
   Datos personales y académicos, y la cuenta de acceso opcional del estudiante.
   ==================================================================== */
SEED.estudiantes=[{id:1,cedula:'5123456',nombre:'María Fernanda López',correo:'maria.lopez@estudiante.edu.py',telefono:'0981-123-456',carreraId:1,semestre:'8.º semestre',matricula:'2021-0045',filial:'Concepción',estado:'Activo'},{id:2,cedula:'6234567',nombre:'Juan Carlos Benítez',correo:'juan.benitez@estudiante.edu.py',telefono:'0982-456-789',carreraId:2,semestre:'9.º semestre',matricula:'2020-0081',filial:'Concepción',estado:'Activo'},{id:3,cedula:'7345678',nombre:'Ana Belén Duarte',correo:'ana.duarte@estudiante.edu.py',telefono:'0971-333-444',carreraId:3,semestre:'7.º semestre',matricula:'2022-0018',filial:'Horqueta',estado:'Activo'}];
configs.estudiantes={title:'Pasantes',singular:'Pasante',icon:'bi-people',desc:'Datos personales y académicos del pasante, separados de los datos de la institución receptora.',fields:[{key:'cedula',label:'Cédula de identidad',required:true},{key:'nombre',label:'Nombre y apellido',required:true},{key:'correo',label:'Correo electrónico',type:'email',required:true},{key:'telefono',label:'Teléfono',required:true},{key:'carreraId',label:'Carrera',type:'career',required:true},{key:'semestre',label:'Semestre',type:'select',options:['1.º semestre','2.º semestre','3.º semestre','4.º semestre','5.º semestre','6.º semestre','7.º semestre','8.º semestre','9.º semestre','10.º semestre'],required:true},{key:'matricula',label:'N.º de matrícula',required:true},{key:'filial',label:'Filial',type:'select',options:FILIALES,required:true},{key:'estado',label:'Estado',type:'select',options:['Activo','Inactivo'],required:true,def:'Activo'},{key:'password',label:'Contraseña de acceso',type:'password',adminOnly:true,ph:id=>id&&studentAccount(id)?'Dejar en blanco para conservar la actual':'Opcional: crea su cuenta de acceso'},{key:'passwordConfirm',label:'Confirmar contraseña',type:'password',adminOnly:true,ph:'Repita la contraseña'}],columns:[['cedula','Cédula'],['nombre','Pasante'],['carreraId','Carrera'],['semestre','Semestre'],['filial','Filial'],['correo','Correo'],['estado','Estado']],search:['cedula','nombre'],searchPh:'Cédula o estudiante...'};
configs.estudiantes.dependientes=['pasantias','estudianteId','pasantía(s)']; /* no se elimina si tiene pasantías */
UNIQUE.estudiantes=[{f:'cedula',n:'code',m:'Ya existe un pasante con esa cédula.'},{f:'correo',n:'mail',m:'Ya existe un pasante con ese correo.'},{f:'telefono',n:'tel',m:'Ya existe un pasante con ese teléfono.'},{f:'matricula',n:'code',m:'Ya existe un pasante con ese N.º de matrícula.'}];
const studentAccount=id=>id?list('usuarios').find(u=>u.rol==='Pasante'&&String(u.vinculoId)===String(id)):null;
function studentAccountCheck(rec,id,pw,pc){const acc=studentAccount(id);if(pw||pc){const e=passwordCheck(pw||'',pc||'');if(e)return e}if(pw||acc){const other=list('usuarios').find(u=>(!acc||u.id!==acc.id)&&NORM.mail(u.correo)&&NORM.mail(u.correo)===NORM.mail(rec.correo));if(other)return `No se puede crear/actualizar la cuenta: el correo ya pertenece al usuario @${other.username}.`}return ''}
function syncStudentAccount(rec,pw){let u=studentAccount(rec.id),created='';if(!u&&!pw)return '';
 if(!u){let base=String(rec.correo||'').split('@')[0].toLowerCase().replace(/[^a-z0-9._-]/g,'')||('est'+rec.id);if(base.length<3)base='est'+base;base=base.slice(0,26);let un=base,n=2;while(list('usuarios').some(x=>String(x.username).toLowerCase()===un))un=base+(n++);
  u={id:nextId('usuarios'),username:un,nombre:rec.nombre,correo:rec.correo,rol:'Pasante',vinculoId:rec.id,estado:rec.estado==='Activo'?'Activo':'Inactivo',creado:nowDate(),ultimoAcceso:'',salt:'',hash:''};db.usuarios.push(u);created=un}
 else{u.nombre=rec.nombre;u.correo=rec.correo;u.estado=rec.estado==='Activo'?'Activo':'Inactivo'}
 if(pw){u.salt=newSalt();u.hash=sha256(u.salt+pw);list('solicitudesClave').forEach(r=>{if(r.usuarioId===u.id&&r.estado==='Pendiente'){r.estado='Resuelta';r.resuelta=new Date().toISOString()}})}
 return created}
PAGE_HOOKS.estudiantes={
 filtros:{antes:()=>`<select id="carreraFilter" class="form-select" style="max-width:165px" aria-label="Filtrar por carrera"><option value="">Todas las carreras</option>${list('carreras').map(x=>`<option value="${esc(x.id)}">${esc(x.nombre)}</option>`).join('')}</select><select id="filialFilter" class="form-select" style="max-width:130px" aria-label="Filtrar por filial"><option value="">Todas las filiales</option>${FILIALES.map(f=>`<option>${esc(f)}</option>`).join('')}</select>`},
 alMostrar(){['carreraFilter','filialFilter'].forEach(i=>$(i).addEventListener('change',renderRows))},
 filtrar(r){const c=$('carreraFilter')?.value||'',f=$('filialFilter')?.value||'';return (!c||String(r.carreraId)===c)&&(!f||r.filial===f)},
 aviso:()=>'<div class="section-note"><i class="bi bi-person-vcard"></i>Los datos personales y académicos del pasante se administran aquí. La institución receptora se registra en un módulo independiente.</div>',
 celda:(k,r)=>k==='nombre'?`<span class="table-person">${esc(r[k])}</span><span class="table-sub">${esc(r.cedula||'')}</span>`:undefined,
 /* El antiguo campo «Dirección / ciudad» pasa a ser «Filial». */
 migrar(){
  db.estudiantes.forEach(e=>{if(FILIALES.includes(e.filial))return;const txt=NORM.text(e.filial||e.direccion);const m=FILIALES.find(f=>txt.includes(NORM.text(f)));if(m){e.filial=m;delete e.direccion}else if(e.filial===undefined)e.filial=''});
 },
 antesDeGuardar(c){
  const pw=c.rec.password||'',pc=c.rec.passwordConfirm||'';c.extra.pw=pw;delete c.rec.password;delete c.rec.passwordConfirm;
  const err=studentAccountCheck(c.rec,c.id,pw,pc);if(err)return err},
 despuesDeGuardar(c){const u=syncStudentAccount(c.rec,c.extra.pw);return u?`Pasante guardado. Usuario de acceso creado: ${u}`:undefined},
 bloqueoEliminar(id){const linked=list('usuarios').find(u=>String(u.vinculoId)===String(id)&&u.rol==='Pasante');if(linked)return `No se puede eliminar: tiene una cuenta de usuario vinculada (@${linked.username}). Elimine primero el usuario.`}
};
