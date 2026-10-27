'use strict';
/* ====================================================================
   PÁGINA · Pasantías y solicitudes
   Solicitudes, aprobación, períodos, carga horaria y cierre. Incluye la lista
   filtrable con exportación a Excel, PDF e impresión.
   ==================================================================== */
/* Listas sugeridas del formulario. Período: se generan solas según el año (anterior, actual y siguiente; semestres 1 y 2). */
const PERIODOS=()=>{const y=new Date().getFullYear(),r=[];for(let a=y-1;a<=y+1;a++)r.push(a+'-1',a+'-2');return r};
const HORARIOS=['07:00 a 11:00','08:00 a 12:00','13:00 a 17:00','14:00 a 18:00','18:00 a 22:00','08:00 a 14:00'];
/* Duración en horas de un horario «HH:MM a HH:MM»; null si el texto no tiene ese formato. */
const horarioHoras=h=>{const m=String(h||'').match(/(\d{1,2})[:.](\d{2})\D+(\d{1,2})[:.](\d{2})/);return m?((+m[3]*60+ +m[4])-(+m[1]*60+ +m[2]))/60:null};
/* Tutor académico: solo docentes activos registrados en «Docentes y tutores» (lista cerrada, sin «Otros»). */
const DOCENTES_ACTIVOS=()=>list('tutores').filter(t=>t.rol==='Docente'&&t.estado==='Activo').map(t=>t.nombre);
SEED.pasantias=[{id:1,codigo:'PAS-2026-001',estudianteId:1,institucionId:1,tutorInstitucional:'Laura Martínez',tutorAcademico:'Lic. Rosa Giménez',periodo:'2026-2',fechaInicio:'2026-08-01',fechaFin:'2026-11-30',horario:'08:00 a 12:00',horasPlanificadas:192,horasRealizadas:96,actividades:'Apoyo en conciliaciones, archivo y elaboración de informes contables.',estado:'En ejecución',evaluacion:'Pendiente',observaciones:''},{id:2,codigo:'PAS-2026-002',estudianteId:2,institucionId:2,tutorInstitucional:'Carlos Vera',tutorAcademico:'Mg. Pedro Rojas',periodo:'2026-2',fechaInicio:'2026-09-01',fechaFin:'2026-12-15',horario:'07:00 a 11:00',horasPlanificadas:192,horasRealizadas:0,actividades:'Apoyo administrativo, registro y organización de documentos.',estado:'Solicitada',evaluacion:'Pendiente',observaciones:'Solicitud en revisión por coordinación.'}];
configs.pasantias={title:'Pasantías y solicitudes',singular:'Pasantía',femenino:true,icon:'bi-clipboard-check',desc:'Gestione solicitudes, aprobación, asignación de tutores, períodos, carga horaria y cierre.',fields:[{key:'codigo',label:'Código de pasantía',required:true},{key:'estudianteId',label:'Pasante',type:'student',required:true},{key:'institucionId',label:'Institución receptora',type:'institution',required:true},{key:'tutorInstitucional',label:'Tutor externo',required:true},{key:'tutorAcademico',label:'Tutor académico',type:'suggest',options:DOCENTES_ACTIVOS,sinOtros:true,existe:v=>list('tutores').some(t=>t.rol==='Docente'&&NORM.text(t.nombre)===NORM.text(v)),vacio:'No hay docentes activos. Regístrelos primero en «Docentes y tutores».',required:true},{key:'periodo',label:'Período académico',type:'suggest',options:PERIODOS,required:true},{key:'fechaInicio',label:'Fecha de inicio',type:'date',required:true},{key:'fechaFin',label:'Fecha de finalización prevista',type:'date',required:true},{key:'horario',label:'Horario',type:'suggest',options:HORARIOS,required:true},{key:'horasPlanificadas',label:'Horas planificadas (fijas)',type:'number',required:true,def:HORAS_PASANTIA,min:HORAS_PASANTIA,max:HORAS_PASANTIA,fijo:true},{key:'horasRealizadas',label:'Horas realizadas',type:'number',required:true,def:0,max:HORAS_PASANTIA},{key:'actividades',label:'Plan general de actividades',type:'textarea',required:true},{key:'estado',label:'Estado de la solicitud',def:'Solicitada',type:'select',options:['Solicitada','En revisión','Aprobada','En ejecución','Observada','Finalizada','Cancelada','Rechazada'],required:true},{key:'evaluacion',label:'Evaluación final',def:'Pendiente',type:'select',options:['Pendiente','Aprobada','Requiere correcciones','No aprobada'],required:true},{key:'observaciones',label:'Observaciones',type:'textarea'}],columns:[['codigo','Código'],['estudianteId','Pasante'],['institucionId','Institución'],['periodo','Período'],['fechaInicio','Inicio'],['estado','Estado']],search:['codigo','periodo','tutorInstitucional','tutorAcademico','actividades']};
configs.pasantias.dependientes=['seguimientos','pasantiaId','registro(s) de seguimiento']; /* no se elimina si tiene seguimientos */
UNIQUE.pasantias=[{f:'codigo',n:'code',m:'Ya existe una pasantía con ese código.'}];
const CLOSED_STATES=['Finalizada','Cancelada','Rechazada'];
PAGE_HOOKS.pasantias={
 aviso:()=>'<div class="section-note"><i class="bi bi-diagram-3"></i>Flujo sugerido: solicitud → revisión → aprobación → ejecución → documentación y evaluación → finalización.</div>',
 botonNuevo:()=>me.rol==='Pasante'?'Solicitar pasantía':undefined,
 exportacionPropia:true, /* ya trae sus botones Excel / PDF / Imprimir: la tabla genérica no agrega otros */
 filtros:{
  antes:()=>'<select id="statusFilter" class="form-select"><option value="">Todos los estados</option>'+['Solicitada','En revisión','Aprobada','En ejecución','Observada','Finalizada','Cancelada','Rechazada'].map(s=>`<option>${s}</option>`).join('')+'</select>',
  despues:()=>'<div class="export-group no-print"><button id="plExcel" class="btn btn-success btn-sm" type="button" title="Exportar la lista filtrada a Excel"><i class="bi bi-file-earmark-excel me-1"></i>Excel</button><button id="plPdf" class="btn btn-danger btn-sm" type="button" title="Exportar la lista filtrada a PDF"><i class="bi bi-file-earmark-pdf me-1"></i>PDF</button><button id="plPrint" class="btn btn-outline-secondary btn-sm" type="button" title="Imprimir la lista filtrada"><i class="bi bi-printer me-1"></i>Imprimir</button></div>'
 },
 alMostrar(){$('statusFilter').addEventListener('change',renderRows);$('plExcel').addEventListener('click',()=>exportExcel(listOpts()));$('plPdf').addEventListener('click',()=>exportPDF(listOpts()));$('plPrint').addEventListener('click',printList)},
 /* Un pasante no puede tener dos pasantías abiertas a la vez. */
 duplicados(rec,id){const errs=[];
  if(rec.estudianteId&&!CLOSED_STATES.includes(rec.estado)){const other=list('pasantias').find(x=>x.id!==id&&x.estudianteId===rec.estudianteId&&!CLOSED_STATES.includes(x.estado));if(other)errs.push({field:'estudianteId',msg:`Este pasante ya tiene otra pasantía abierta (${other.codigo}). Finalícela o cancélela antes de registrar una nueva.`})}
  return errs},
 /* Fechas: la finalización no puede ser anterior al inicio y no deja fuera registros de seguimiento ya cargados. */
 fechas:{par:['fechaInicio','fechaFin'],
  extra(rec,id){const e=[];
   if(id){const out=list('seguimientos').filter(x=>String(x.pasantiaId)===String(id)&&x.fecha&&((rec.fechaInicio&&x.fecha<rec.fechaInicio)||(rec.fechaFin&&x.fecha>rec.fechaFin)));if(out.length)e.push({field:rec.fechaFin&&out.some(x=>x.fecha>rec.fechaFin)?'fechaFin':'fechaInicio',msg:`Hay ${out.length} registro(s) de seguimiento fuera de este período (p. ej. ${fmtD(out[0].fecha)}). Corrija primero esas fechas.`})}
   return e}},
 antesDeGuardar(c){const {rec,id}=c;
  if(me.rol==='Pasante'){rec.estudianteId=Number(me.vinculoId);rec.estado='Solicitada';rec.horasRealizadas=0;rec.evaluacion='Pendiente'}
  if(me.rol==='Docente'&&id&&!pasantiasOf().some(x=>x.id===id))return false;
  const dur=horarioHoras(rec.horario);if(dur!==null&&dur>HORAS_MAX_DIA)return `El horario no puede superar ${HORAS_MAX_DIA} horas por día (el indicado tiene ${fmtH(+dur.toFixed(2))}).`;
  rec.horasPlanificadas=HORAS_PASANTIA; /* siempre 192 */
  if(Number(rec.horasRealizadas)>HORAS_PASANTIA)return `Las horas realizadas no pueden superar las ${HORAS_PASANTIA} horas de la pasantía.`;
  if(rec.estado==='Finalizada'&&Number(rec.horasRealizadas)!==HORAS_PASANTIA)return `Para finalizar la pasantía el pasante debe completar exactamente ${HORAS_PASANTIA} horas (lleva ${Number(rec.horasRealizadas)||0}).`},
 /* Datos ya guardados: todas las pasantías pasan a 192 horas y ninguna supera ese total. */
 migrar(){db.pasantias.forEach(x=>{x.horasPlanificadas=HORAS_PASANTIA;if(Number(x.horasRealizadas)>HORAS_PASANTIA)x.horasRealizadas=HORAS_PASANTIA})},
 avisoEliminar(id){const docs=list('documentos').filter(x=>x.pasantiaId===id);return `<div class="dp-also"><b>También se eliminarán:</b> ${docs.length} documento(s) de esta pasantía${docs.length?`: ${docs.map(d=>esc(d.tipo)).join(', ')}`:''}.</div>`},
 /* Al eliminar una pasantía se eliminan también sus documentos. */
 alEliminar(id){db.seguimientos=db.seguimientos.filter(x=>x.pasantiaId!==id);db.documentos=db.documentos.filter(x=>x.pasantiaId!==id)}
};
/* ---- Lista de pasantías: filtros, exportación e impresión ---- */
function listOpts(){const ps=filteredList('pasantias'),q=($('tableSearch')?.value||'').trim(),st=$('statusFilter')?.value||'',f=[];if(st)f.push(`estado «${st}»`);if(q)f.push(`búsqueda «${q}»`);return {ps,title:'Pasantías y solicitudes',file:'pasantias_solicitudes_fcea',listOnly:true,subtitle:(f.length?'Filtros: '+f.join(' · '):'Sin filtros')+' · '+ps.length+' registro(s)'}}
function printList(){const o=listOpts(),rows=reportRows(o.ps),prev=document.title;$('printArea').innerHTML=`<div class="doc-header">${instHeader()}<div class="doc-meta"><div><small>Sistema de Gestión de Pasantías (SIGEPAS)</small></div><div class="print-meta"><span>Generado el ${new Date().toLocaleDateString('es-PY',{day:'2-digit',month:'long',year:'numeric'})}</span><small>Por: ${esc(me.nombre)} · ${esc(me.rol)}</small></div></div></div><h3>${esc(o.title)}</h3><div class="print-sub">${esc(o.subtitle)}</div><table><thead><tr>${rows[0].map(h=>`<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.slice(1).map(r=>`<tr>${r.map(c=>`<td>${esc(String(c??''))}</td>`).join('')}</tr>`).join('')||`<tr><td colspan="${rows[0].length}">Sin pasantías para mostrar.</td></tr>`}</tbody></table>`;document.body.classList.add('print-list');document.title='Pasantias_FCEA_'+new Date().toISOString().slice(0,10);const restore=()=>{document.body.classList.remove('print-list');$('printArea').innerHTML='';document.title=prev;window.removeEventListener('afterprint',restore)};window.addEventListener('afterprint',restore);window.print()}
