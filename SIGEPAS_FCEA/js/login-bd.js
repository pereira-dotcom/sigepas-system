'use strict';
/* ====================================================================
   BASE DE DATOS · botones del inicio de sesión (ver / cargar original / eliminar).
   Trabaja con las mismas tablas que usa el sistema (localStorage + IndexedDB).
   Las contraseñas se guardan cifradas (SHA-256 con sal), por eso se muestra el hash abreviado.
   ==================================================================== */
const BD_TABLAS=[
 ['usuarios','USUARIOS',[['id','Id Usuario'],['username','Usuario'],['nombre','Nombre'],['correo','Correo'],['rol','Rol'],['estado','Estado'],['hash','Contraseña (hash)'],['ultimoAcceso','Último acceso']]],
 ['carreras','CARRERAS',[['id','Id Carrera'],['codigo','Código'],['nombre','Nombre'],['activa','Estado']]],
 ['estudiantes','PASANTES',[['id','Id Pasante'],['cedula','N° Cédula'],['nombre','Nombre'],['correo','Correo'],['telefono','Celular'],['carreraId','Id Carrera'],['semestre','Semestre'],['matricula','Matrícula'],['filial','Filial'],['estado','Estado']]],
 ['tutores','DOCENTES Y TUTORES',[['id','Id'],['cedula','N° Cédula'],['nombre','Nombre'],['rol','Rol'],['correo','Correo'],['telefono','Celular'],['estado','Estado']]],
 ['instituciones','INSTITUCIONES RECEPTORAS',[['id','Id'],['ruc','RUC'],['nombre','Nombre'],['tipo','Tipo'],['rubro','Rubro'],['ciudad','Ciudad'],['contacto','Contacto'],['telefono','Teléfono'],['convenio','Convenio'],['vigenciaHasta','Vigencia hasta']]],
 ['convenios','CONVENIOS',[['id','Id'],['numero','Número'],['institucionId','Id Institución'],['fechaInicio','Inicio'],['fechaFin','Fin'],['estado','Estado']]],
 ['pasantias','PASANTÍAS',[['id','Id'],['codigo','Código'],['estudianteId','Id Pasante'],['institucionId','Id Institución'],['tutorAcademico','Tutor académico'],['tutorInstitucional','Tutor externo'],['periodo','Período'],['horasPlanificadas','Horas plan.'],['horasRealizadas','Horas real.'],['estado','Estado'],['evaluacion','Evaluación']]],
 ['seguimientos','SEGUIMIENTO Y HORAS',[['id','Id'],['pasantiaId','Id Pasantía'],['fecha','Fecha'],['tipo','Tipo'],['horas','Horas'],['responsable','Responsable'],['actividad','Actividad']]],
 ['documentos','DOCUMENTACIÓN',[['id','Id'],['pasantiaId','Id Pasantía'],['tipo','Tipo'],['nombreArchivo','Archivo'],['fechaEntrega','Entrega'],['estado','Estado']]],
 ['solicitudesClave','SOLICITUDES DE CONTRASEÑA',[['id','Id'],['usuarioId','Id Usuario'],['username','Usuario'],['fecha','Fecha'],['estado','Estado']]]
];
const bdEstado={}; /* orden y página de cada tabla */
const bdFmt=(k,v)=>{if(v===undefined||v===null||v==='')return '';if(k==='hash')return String(v).slice(0,12)+'…';if(k==='ultimoAcceso'||k==='fecha'){const d=new Date(v);return isNaN(d)?String(v):d.toLocaleDateString('es-PY')+' '+d.toLocaleTimeString('es-PY',{hour:'2-digit',minute:'2-digit'})}return String(v)};
const bdNum=k=>/^(id|.*Id|horas.*|cedula)$/.test(k);
function bdToast(msg,error){const a=$('bdToasts');const el=document.createElement('div');el.className='bd-toast'+(error?' error':'');el.textContent=msg;a.appendChild(el);setTimeout(()=>el.remove(),3200)}
/* Lee siempre lo último guardado (por si se cambió desde otra pestaña). */
function bdRaw(){try{const d=JSON.parse(localStorage.getItem(KEY));if(d&&d.carreras)return d}catch{}return db}
/* El visor solo muestra datos si la base fue CARGADA en esta sesión; si no, se ve vacía aunque haya una copia guardada en el navegador. */
function bdLeer(){if(bdCargada())return bdRaw();const v={};Object.keys(SEED).forEach(k=>v[k]=[]);return v}
function bdTabla(clave,titulo,cols){
 const st=bdEstado[clave]=bdEstado[clave]||{col:cols[0][0],dir:1,pag:1},POR=5;
 let filas=(bdLeer()[clave]||[]).slice();
 filas.sort((a,b)=>{let x=a[st.col],y=b[st.col];if(bdNum(st.col)){x=Number(x)||0;y=Number(y)||0;return (x-y)*st.dir}return String(x??'').localeCompare(String(y??''),'es',{numeric:true})*st.dir});
 const n=filas.length,pags=Math.max(1,Math.ceil(n/POR));st.pag=Math.min(st.pag,pags);const ini=(st.pag-1)*POR,vis=filas.slice(ini,ini+POR);
 const th=cols.map(([k,l])=>`<th data-sort="${k}" class="${bdNum(k)?'text-end':''}">${esc(l)}<i class="bi ${st.col===k?(st.dir>0?'bi-caret-up-fill':'bi-caret-down-fill'):'bi-chevron-expand'} ms-1"></i></th>`).join('');
 const tr=vis.length?vis.map(r=>`<tr>${cols.map(([k])=>`<td class="${bdNum(k)?'text-end':''}">${esc(bdFmt(k,r[k]))}</td>`).join('')}</tr>`).join(''):`<tr><td colspan="${cols.length}" class="text-center text-muted">Ningún dato disponible en esta tabla</td></tr>`;
 const num=Array.from({length:pags},(_,i)=>`<button type="button" class="bd-pg ${i+1===st.pag?'on':''}" data-pg="${i+1}">${i+1}</button>`).join('');
 return `<section class="bd-sec" data-t="${clave}"><h6>${esc(titulo)}</h6><div class="table-responsive"><table class="table bd-table"><thead><tr>${th}</tr></thead><tbody>${tr}</tbody></table></div><div class="bd-foot"><span>${n?`Mostrando ${ini+1} a ${ini+vis.length} de ${n} registros`:'Mostrando 0 registros'}</span><div class="bd-pager"><button type="button" class="bd-pg" data-pg="1" ${st.pag===1?'disabled':''}>Primero</button><button type="button" class="bd-pg" data-pg="${st.pag-1}" ${st.pag===1?'disabled':''}>Anterior</button>${num}<button type="button" class="bd-pg" data-pg="${st.pag+1}" ${st.pag===pags?'disabled':''}>Siguiente</button><button type="button" class="bd-pg" data-pg="${pags}" ${st.pag===pags?'disabled':''}>Último</button></div></div></section>`}
function bdRender(){$('bdBody').innerHTML='<p class="fw-semibold small mb-1">Los datos que se visualizan se encuentran en el localStorage</p>'+BD_TABLAS.map(([k,t,c])=>bdTabla(k,t,c)).join('')}
$('bdBody').addEventListener('click',e=>{const sec=e.target.closest('.bd-sec');if(!sec)return;const clave=sec.dataset.t,cols=BD_TABLAS.find(t=>t[0]===clave)[2],st=bdEstado[clave];
 const th=e.target.closest('[data-sort]');if(th){const k=th.dataset.sort;st.dir=st.col===k?-st.dir:1;st.col=k;st.pag=1;sec.outerHTML=bdTabla(clave,BD_TABLAS.find(t=>t[0]===clave)[1],cols);return}
 const pg=e.target.closest('[data-pg]');if(pg&&!pg.disabled){st.pag=Number(pg.dataset.pg);sec.outerHTML=bdTabla(clave,BD_TABLAS.find(t=>t[0]===clave)[1],cols)}});
/* Guarda una base nueva en localStorage e IndexedDB (con marca de tiempo nueva para que gane sobre cualquier copia vieja). */
function bdGuardar(datos){datos._ts=Date.now();db=datos;migrate();saveDB();renderDemo();$('loginError').textContent='';$('loginError').dataset.bd='';bdLeida=true;sessionStorage.removeItem('fceaUser');sessionStorage.setItem(BD_FLAG,'1');estadoLogin()}
$('btnVerBD').addEventListener('click',()=>{bdRender();bootstrap.Modal.getOrCreateInstance($('bdModal')).show()});
$('btnCargarBD').addEventListener('click',()=>{
 /* Sin preguntas: si hay una base guardada se carga tal cual; si no hay ninguna, se carga la original. */
 if((bdRaw().usuarios||[]).length){
  db=bdRaw();migrate();bdLeida=true;sessionStorage.setItem(BD_FLAG,'1');renderDemo();$('loginError').textContent='';$('loginError').dataset.bd='';estadoLogin();bdToast('Base de datos cargada');return}
 const o=JSON.parse(JSON.stringify(SEED));o.usuarios=defaultUsers();bdGuardar(o);bdToast('Base de datos original cargada')});
$('btnBorrarBD').addEventListener('click',()=>bootstrap.Modal.getOrCreateInstance($('bdConfirmModal')).show());
$('bdConfirmBtn').addEventListener('click',()=>{
 const vacio={};Object.keys(SEED).forEach(k=>vacio[k]=[]);bdGuardar(vacio);sessionStorage.removeItem(BD_FLAG);estadoLogin();
 bootstrap.Modal.getInstance($('bdConfirmModal')).hide();bdToast('Base de datos eliminada',true)});
