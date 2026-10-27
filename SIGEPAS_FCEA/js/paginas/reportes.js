'use strict';
/* ====================================================================
   PÁGINA · Reportes
   Indicadores, gráficos y detalle con filtros por pasante, filial, empresa
   y carrera. La exportación a Excel/PDF está en js/nucleo/09-exportacion.js.
   ==================================================================== */
let repFilters={est:'',filial:'',inst:'',carrera:'',anio:'',sem:''};
/* Año y semestre salen del período de la pasantía («2026-2»); si no tiene ese formato, el año se toma de la fecha de inicio. */
function periodoParts(p){const m=String(p.periodo||'').match(/(\d{4})\D+([12])/);return {anio:m?m[1]:String(p.fechaInicio||'').slice(0,4),sem:m?m[2]:''}}
const SEM_LABEL={'1':'1.er semestre','2':'2.º semestre'};
function reportPs(){const f=repFilters;return vis('pasantias').filter(p=>{const e=find('estudiantes',p.estudianteId);return (!f.est||String(p.estudianteId)===f.est)&&(!f.inst||String(p.institucionId)===f.inst)&&(!f.carrera||String(e?.carreraId)===f.carrera)&&(!f.filial||e?.filial===f.filial)&&(!f.anio||periodoParts(p).anio===f.anio)&&(!f.sem||periodoParts(p).sem===f.sem)})}
const repActive=()=>Object.values(repFilters).some(Boolean);
function repFilterList(){const f=repFilters,a=[];if(f.anio)a.push(['Año',f.anio]);if(f.sem)a.push(['Semestre',SEM_LABEL[f.sem]]);if(f.est)a.push(['Pasante',studentName(f.est)]);if(f.filial)a.push(['Filial',f.filial]);if(f.inst)a.push(['Empresa',institutionName(f.inst)]);if(f.carrera)a.push(['Carrera',careerName(f.carrera)]);return a}
function repFilterText(){return repFilterList().map(x=>x[0]+': '+x[1]).join(' · ')}
function repOpts(){const ps=reportPs(),t=repFilterText();return {ps,filters:{...repFilters},fl:repFilterList(),title:'Reportes y consultas',subtitle:(t||'Sin filtros (datos generales)')+' · '+ps.length+' pasantía(s)',file:'reporte_pasantias_fcea'}}
function repChipsHtml(){const l=repFilterList();return l.length?`<div class="rf-chips"><span>Aplicados:</span>${l.map(([k,v])=>`<button type="button" class="rf-chip" data-clear="${k}" title="Quitar este filtro">${esc(k)}: <b>${esc(v)}</b><i class="bi bi-x-lg"></i></button>`).join('')}</div>`:''}
function repRefreshChips(){const b=$('rfChips');if(!b)return;b.innerHTML=repChipsHtml();bindChipClear();const c=$('repClear');if(c)c.disabled=!repActive()}
function bindChipClear(){document.querySelectorAll('[data-clear]').forEach(b=>b.addEventListener('click',()=>{const m={Año:{anio:''},Semestre:{sem:''},Pasante:{est:''},Filial:{filial:''},Empresa:{inst:''},Carrera:{carrera:''}};repFilters={...repFilters,...m[b.dataset.clear]};renderReports()}))}
function renderReports(){
 const students=vis('estudiantes').map(x=>({value:x.id,label:`${x.nombre} · ${x.cedula}`,extra:`${x.matricula||''} ${x.correo||''}`})),insts=list('instituciones').map(x=>({value:x.id,label:x.nombre})),f=repFilters;
 const years=[...new Set([...vis('pasantias').map(p=>periodoParts(p).anio),f.anio,String(new Date().getFullYear())].filter(y=>/^\d{4}$/.test(y)))].sort().reverse();
 const yearOpts=years.map(y=>({value:y,label:y})),semOpts=Object.entries(SEM_LABEL).map(([k,v])=>({value:k,label:v})),filialOpts=FILIALES.map(x=>({value:x,label:x})),careers=list('carreras').map(c=>({value:c.id,label:c.nombre})),pick=(arr,v)=>arr.find(o=>String(o.value)===String(v));
 $('pageContent').innerHTML=`<div class="print-only doc-header">${instHeader()}<div class="doc-meta"><div><small>Sistema de Gestión de Pasantías (SIGEPAS)</small></div><div class="print-meta"><span>Reporte generado el ${new Date().toLocaleDateString('es-PY',{day:'2-digit',month:'long',year:'numeric'})}</span><small>Por: ${esc(me.nombre)} · ${esc(me.rol)}</small></div></div></div><div class="welcome"><div><h3>Reportes y consultas</h3><p>Se muestra y se exporta solo lo que selecciona en los filtros.</p></div><div class="report-actions no-print"><button id="exportExcel" class="btn btn-success" type="button"><i class="bi bi-file-earmark-excel me-2"></i>Exportar Excel</button><button id="exportPdf" class="btn btn-danger" type="button"><i class="bi bi-file-earmark-pdf me-2"></i>Exportar PDF</button><button id="printReport" class="btn btn-outline-secondary" type="button"><i class="bi bi-printer me-2"></i>Imprimir</button></div></div>
 <section class="panel report-filters no-print"><div class="rf-head"><h4><i class="bi bi-sliders2"></i>Filtros del reporte</h4><button id="repClear" class="btn btn-sm btn-outline-secondary" type="button"${repActive()?'':' disabled'}><i class="bi bi-arrow-counterclockwise me-1"></i>Limpiar filtros</button></div>
 <div class="rf-grid rf-grid-4">
  <div><label class="form-label" for="rep_anio">Año</label>${comboMarkup('rep_anio',yearOpts,pick(yearOpts,f.anio),'Todos · escriba para buscar')}</div>
  <div><label class="form-label" for="rep_sem">Semestre</label>${comboMarkup('rep_sem',semOpts,pick(semOpts,f.sem),'Ambos · escriba para buscar')}</div>
  <div><label class="form-label" for="rep_filial">Filial</label>${comboMarkup('rep_filial',filialOpts,pick(filialOpts,f.filial),'Todas · escriba para buscar')}</div>
  <div><label class="form-label" for="rep_carrera">Carrera</label>${comboMarkup('rep_carrera',careers,pick(careers,f.carrera),'Todas · escriba para buscar')}</div>
 </div>
 <div class="rf-grid rf-grid-2 mt-3">${students.length>1?`<div><label class="form-label" for="rep_est">Pasante</label>${comboMarkup('rep_est',students,pick(students,f.est),'Todos · escriba para buscar')}</div>`:''}<div><label class="form-label" for="rep_inst">Empresa / institución</label>${comboMarkup('rep_inst',insts,pick(insts,f.inst),'Todas · escriba para buscar')}</div></div>
 <div id="rfChips">${repChipsHtml()}</div></section><div id="repResults"></div>`;
 const apply=()=>{const n={est:$('rep_est')?.dataset.val||'',filial:$('rep_filial').dataset.val||'',inst:$('rep_inst').dataset.val||'',carrera:$('rep_carrera').dataset.val||'',anio:$('rep_anio').dataset.val||'',sem:$('rep_sem').dataset.val||''};if(JSON.stringify(n)===JSON.stringify(repFilters))return;repFilters=n;renderReports()};
 ['rep_est','rep_inst','rep_carrera','rep_filial','rep_anio','rep_sem'].forEach(id=>$(id)?.addEventListener('combochange',apply));
 bindChipClear();
 $('repClear').addEventListener('click',()=>{repFilters={est:'',filial:'',inst:'',carrera:'',anio:'',sem:''};renderReports()});
 $('exportPdf').addEventListener('click',()=>exportPDF(repOpts()));$('exportExcel').addEventListener('click',()=>exportExcel(repOpts()));$('printReport').addEventListener('click',printReport);
 renderRepResults()}
function renderRepResults(){
 const ps=reportPs(),act=repActive(),rows=reportRows(ps);
 $('repResults').innerHTML=`<div class="section-note print-only"><i class="bi bi-funnel"></i><strong>${act?'Filtros aplicados':'Sin filtros'}:</strong> ${esc(repFilterText()||'todas las pasantías')} · ${ps.length} pasantía(s)</div>
 <section class="panel report-card print-detail"><div class="table-responsive"><table class="table"><thead><tr>${rows[0].map(c=>`<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${rows.slice(1).map(r=>`<tr>${r.map(c=>`<td>${esc(String(c??''))}</td>`).join('')}</tr>`).join('')||`<tr><td colspan="12" class="text-center text-muted py-4">No hay pasantías que coincidan con la búsqueda y los filtros.</td></tr>`}</tbody></table></div></section>`}
function reportRows(ps=vis('pasantias')){return [['Código','Pasante','Carrera','Filial','Institución','Período','Inicio','Fin','Horas planificadas','Horas realizadas','Estado','Evaluación'],...ps.map(p=>[p.codigo,studentName(p.estudianteId),careerName(find('estudiantes',p.estudianteId)?.carreraId),find('estudiantes',p.estudianteId)?.filial||'—',institutionName(p.institucionId),p.periodo,p.fechaInicio,p.fechaFin,p.horasPlanificadas,p.horasRealizadas,p.estado,p.evaluacion])]}
/* Bloques del resumen. Con filtros activos solo se listan las categorías que tienen datos y se omiten las dimensiones ya fijadas por el filtro (p. ej. filtrando una carrera no se lista «por carrera»). */
function reportSummary(ps0,f){
 const all=vis('pasantias'),ps=ps0||all,ids=new Set(ps.map(p=>p.id)),docs=vis('documentos').filter(d=>ids.has(d.pasantiaId)),fx=f||{},stu=id=>find('estudiantes',id);
 const hide=Object.values(fx).some(Boolean)||!!(ps0&&ps0.length<all.length),keep=a=>hide?a.filter(x=>x[1]>0):a;
 const out=[['Indicadores generales',[['Total de pasantías',ps.length],['Horas registradas',ps.reduce((a,p)=>a+(Number(p.horasRealizadas)||0),0)],['Instituciones receptoras',hide?new Set(ps.map(p=>p.institucionId)).size:list('instituciones').length],['Documentos pendientes',docs.filter(d=>['Pendiente','En revisión','Observado'].includes(d.estado)).length]]]];
 out.push(['Pasantías por estado',keep(['Solicitada','En revisión','Aprobada','En ejecución','Observada','Finalizada','Cancelada','Rechazada'].map(x=>[x,ps.filter(p=>p.estado===x).length]))]);
 if(!fx.carrera&&!fx.est)out.push(['Pasantías por carrera',keep(list('carreras').map(c=>[c.nombre,ps.filter(p=>stu(p.estudianteId)?.carreraId===c.id).length]))]);
 if(!fx.filial&&!fx.est)out.push(['Pasantías por filial',keep(FILIALES.map(x=>[x,ps.filter(p=>stu(p.estudianteId)?.filial===x).length]))]);
 if(!fx.inst)out.push(['Pasantías por institución',keep(list('instituciones').map(i=>[i.nombre,ps.filter(p=>p.institucionId===i.id).length]))]);
 out.push(['Control documental',keep(['Pendiente','Entregado','En revisión','Aprobado','Observado','Rechazado'].map(x=>[x,docs.filter(d=>d.estado===x).length]))]);
 return out}
function printReport(){const prev=document.title,st=document.createElement('style');st.textContent='@page{size:A4 landscape;margin:10mm}';document.head.appendChild(st);document.title='Reporte_Pasantias_FCEA_'+new Date().toISOString().slice(0,10);const restore=()=>{document.title=prev;st.remove();window.removeEventListener('afterprint',restore)};window.addEventListener('afterprint',restore);window.print()}
PAGE_HOOKS.reportes={reiniciar(){repFilters={est:'',filial:'',inst:'',carrera:'',anio:'',sem:''}}};
PAGE_RENDER.reportes={title:'Reportes',render:renderReports};
