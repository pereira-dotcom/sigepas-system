'use strict';
/* ====================================================================
   PÁGINA · Seguimiento y horas
   Avances, actividades y horas verificadas; las horas suman a la pasantía.
   ==================================================================== */
SEED.seguimientos=[{id:1,pasantiaId:1,fecha:'2026-10-09',tipo:'Registro de horas',horas:6,actividad:'Conciliación de comprobantes y actualización de planillas.',responsable:'Laura Martínez',observaciones:'Avance semanal verificado.'}];
configs.seguimientos={title:'Seguimiento y horas',singular:'Registro de seguimiento',icon:'bi-clock-history',desc:'Registre avances, actividades, reportes periódicos y horas verificadas por el tutor.',fields:[{key:'pasantiaId',label:'Pasantía',type:'internship',required:true},{key:'fecha',label:'Fecha del seguimiento',type:'date',required:true,def:nowDate},{key:'tipo',label:'Tipo de registro',def:'Registro de horas',type:'select',options:['Registro de horas','Reporte periódico','Reunión con tutor','Incidencia'],required:true},{key:'horas',label:`Horas realizadas en este registro (máx. ${HORAS_MAX_DIA} por día, de lunes a viernes)`,type:'number',required:true,min:0.5,max:HORAS_MAX_DIA,step:0.5},{key:'actividad',label:'Actividad / avance',type:'textarea',required:true},{key:'responsable',label:'Responsable que verifica',required:true},{key:'observaciones',label:'Observaciones',type:'textarea'}],columns:[['pasantiaId','Pasantía'],['fecha','Fecha'],['tipo','Tipo'],['horas','Horas'],['actividad','Actividad'],['responsable','Responsable']],search:['fecha','tipo','actividad','responsable','observaciones']};
/* Horas ya registradas por un pasante en una fecha (en todas sus pasantías), sin contar el registro que se edita. */
function horasDelDia(estudianteId,fecha,excluirId){
 return list('seguimientos').filter(x=>x.id!==excluirId&&x.fecha===fecha&&x.tipo==='Registro de horas'&&find('pasantias',x.pasantiaId)?.estudianteId===estudianteId).reduce((a,x)=>a+(Number(x.horas)||0),0)}
PAGE_HOOKS.seguimientos={
 duplicados(rec,id){const errs=[];
  if(rec.pasantiaId){const other=list('seguimientos').find(x=>x.id!==id&&x.pasantiaId===rec.pasantiaId&&x.fecha===rec.fecha&&x.tipo===rec.tipo&&Number(x.horas)===Number(rec.horas)&&NORM.text(x.actividad)===NORM.text(rec.actividad));if(other)errs.push({field:'actividad',msg:'Ya existe un registro idéntico (misma pasantía, fecha, tipo, horas y actividad).'})}
  return errs},
 /* La fecha del registro debe estar dentro del período de la pasantía elegida. */
 fechas:{campos:['fecha'],vigilar:['pasantiaId','tipo','horas'],
  extra(rec,id){const e=[],p=find('pasantias',rec.pasantiaId);
   /* Las horas solo se realizan de lunes a viernes y hasta HORAS_MAX_DIA por día (sumando todos los registros del pasante ese día). */
   if(rec.tipo==='Registro de horas'&&rec.fecha){
    if(!esDiaHabil(rec.fecha))e.push({field:'fecha',msg:'Las horas solo se pueden registrar de lunes a viernes (no sábados ni domingos).'});
    else if(p){const h=Number(rec.horas)||0,ya=horasDelDia(p.estudianteId,rec.fecha,id);if(ya+h>HORAS_MAX_DIA)e.push({field:'fecha',msg:`Ese día el pasante ya tiene ${fmtH(ya)} h registradas; el máximo es ${HORAS_MAX_DIA} h por día${ya<HORAS_MAX_DIA?` (puede registrar hasta ${fmtH(HORAS_MAX_DIA-ya)} h más)`:''}.`})}}
   if(p&&rec.fecha){if(p.fechaInicio&&rec.fecha<p.fechaInicio)e.push({field:'fecha',msg:`No puede ser anterior al inicio de la pasantía (${fmtD(p.fechaInicio)}).`});else if(p.fechaFin&&rec.fecha>p.fechaFin)e.push({field:'fecha',msg:`No puede ser posterior a la finalización prevista de la pasantía (${fmtD(p.fechaFin)}).`})}return e},
  limites(){const f=$('field_fecha'),p=find('pasantias',$('field_pasantiaId')?.dataset.val);if(f){f.min=p?.fechaInicio||'';f.max=p?.fechaFin||''}}},
 /* Solo en pasantías «En ejecución»; los registros de horas actualizan las horas realizadas de la pasantía. */
 antesDeGuardar(c){const {rec,old,id}=c;
   const p=find('pasantias',rec.pasantiaId);
   if(!p)return 'Seleccione una pasantía válida.'
   if(Number(rec.horas)<0.5||Number(rec.horas)>HORAS_MAX_DIA)return `Las horas por registro deben estar entre 0,5 y ${HORAS_MAX_DIA} (máximo diario).`
   if(rec.tipo==='Registro de horas'){
    if(!esDiaHabil(rec.fecha))return 'Las horas solo se pueden registrar de lunes a viernes (no sábados ni domingos).'
    const ya=horasDelDia(p.estudianteId,rec.fecha,id);if(ya+Number(rec.horas)>HORAS_MAX_DIA)return `El pasante ya tiene ${fmtH(ya)} h registradas el ${fmtD(rec.fecha)}; el máximo es ${HORAS_MAX_DIA} h por día.`}
   if(p.estado!=='En ejecución')return 'Solo se pueden registrar avances en pasantías En ejecución.'
   const oldWasHours=!!id&&old.tipo==='Registro de horas';
   const newIsHours=rec.tipo==='Registro de horas';
   const oldP=oldWasHours?find('pasantias',old.pasantiaId):null;
   const newP=newIsHours?p:null;
   const oldHours=oldWasHours?(Number(old.horas)||0):0;
   const newHours=newIsHours?(Number(rec.horas)||0):0;
   if(oldP&&oldP.id===p.id){
     const total=(Number(p.horasRealizadas)||0)-oldHours+newHours;
     if(Number(p.horasPlanificadas)>0&&total>Number(p.horasPlanificadas))return 'Este registro supera las horas planificadas disponibles para la pasantía.'
     p.horasRealizadas=Math.max(0,total);
   }else{
     if(newP&&Number(p.horasPlanificadas)>0&&(Number(p.horasRealizadas)||0)+newHours>Number(p.horasPlanificadas))return 'Este registro supera las horas planificadas disponibles para la pasantía.'
     if(oldP)oldP.horasRealizadas=Math.max(0,(Number(oldP.horasRealizadas)||0)-oldHours);
     if(newP)newP.horasRealizadas=(Number(newP.horasRealizadas)||0)+newHours;
   }
   /* El cumplimiento de horas no cierra automáticamente la pasantía: el responsable debe verificar documentos y evaluación antes del cierre académico. */
 }
};
