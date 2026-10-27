'use strict';
/* ====================================================================
   PÁGINA · Documentación
   Entrega, revisión y aprobación de los documentos de cada pasantía.
   ==================================================================== */
SEED.documentos=[{id:1,pasantiaId:1,tipo:'Carta de aceptación',nombreArchivo:'carta_aceptacion_maria.pdf',fechaEntrega:'2026-07-25',estado:'Aprobado',observacion:'Documentación revisada.'},{id:2,pasantiaId:1,tipo:'Plan de actividades',nombreArchivo:'plan_actividades.pdf',fechaEntrega:'2026-07-28',estado:'Aprobado',observacion:''},{id:3,pasantiaId:2,tipo:'Carta de aceptación',nombreArchivo:'',fechaEntrega:'',estado:'Pendiente',observacion:'Aún no presentada.'}];
configs.documentos={title:'Documentación',singular:'Documento',icon:'bi-folder2-open',desc:'Controle la entrega, revisión, aprobación y observaciones de los documentos requeridos.',fields:[{key:'pasantiaId',label:'Pasantía',type:'internship',required:true},{key:'tipo',label:'Tipo de documento',type:'select',options:['Solicitud de pasantía','Carta de aceptación','Convenio','Plan de actividades','Informe parcial','Planilla de horas','Evaluación del tutor','Informe final','Certificado de finalización','Otro'],required:true},{key:'nombreArchivo',label:'Nombre o referencia del archivo'},{key:'fechaEntrega',label:'Fecha de entrega',type:'date',def:nowDate},{key:'estado',label:'Estado documental',def:'Pendiente',type:'select',options:['Pendiente','Entregado','En revisión','Aprobado','Observado','Rechazado'],required:true},{key:'observacion',label:'Observaciones',type:'textarea'}],columns:[['pasantiaId','Pasantía'],['tipo','Documento'],['nombreArchivo','Archivo / referencia'],['fechaEntrega','Fecha de entrega'],['estado','Estado'],['observacion','Observación']],search:['tipo','nombreArchivo','estado','observacion']};
const SINGLE_DOCS=['Solicitud de pasantía','Carta de aceptación','Convenio','Plan de actividades','Evaluación del tutor','Informe final','Certificado de finalización'];
PAGE_HOOKS.documentos={
 /* Un pasante solo puede editar documentos que aún no fueron revisados. */
 puedeEditar:r=>me.rol!=='Pasante'||['Pendiente','Entregado','Observado'].includes(r.estado),
 duplicados(rec,id){const errs=[];
  if(rec.pasantiaId){
   if(NORM.text(rec.nombreArchivo)&&list('documentos').some(x=>x.id!==id&&x.pasantiaId===rec.pasantiaId&&NORM.text(x.nombreArchivo)===NORM.text(rec.nombreArchivo)))errs.push({field:'nombreArchivo',msg:'Esta pasantía ya tiene un documento con ese nombre de archivo.'});
   if(SINGLE_DOCS.includes(rec.tipo)&&list('documentos').some(x=>x.id!==id&&x.pasantiaId===rec.pasantiaId&&x.tipo===rec.tipo))errs.push({field:'tipo',msg:`Esta pasantía ya tiene un documento de tipo “${rec.tipo}”.`})}
  return errs},
 antesDeGuardar(c){if(me.rol==='Pasante'){if(c.id&&!canEditRec('documentos',c.old))return 'Este documento ya fue revisado y no puede modificarse.';c.rec.estado='Entregado'}}
};
