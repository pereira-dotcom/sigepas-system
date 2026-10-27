'use strict';
/* ====================================================================
   PÁGINA · Convenios
   Acuerdos con las instituciones; avisa los que vencen en los próximos 60 días.
   ==================================================================== */
SEED.convenios=[{id:1,institucionId:1,numero:'CONV-2026-001',fechaInicio:'2026-01-01',fechaFin:'2027-12-31',condiciones:'Recepción de pasantes según disponibilidad.',estado:'Vigente'},{id:2,institucionId:2,numero:'CONV-2026-002',fechaInicio:'2026-01-01',fechaFin:'2027-06-30',condiciones:'Prácticas en áreas administrativas.',estado:'Vigente'}];
configs.convenios={title:'Convenios',singular:'Convenio',icon:'bi-file-earmark-text',desc:'Controle acuerdos vigentes y consulte convenios próximos a vencer.',fields:[{key:'institucionId',label:'Institución receptora',type:'institution',required:true},{key:'numero',label:'Número de convenio',required:true},{key:'fechaInicio',label:'Fecha de inicio',type:'date',required:true},{key:'fechaFin',label:'Fecha de vencimiento',type:'date',required:true},{key:'condiciones',label:'Condiciones del acuerdo',type:'textarea'},{key:'estado',label:'Estado',type:'select',options:['Vigente','En renovación','Vencido'],required:true}],columns:[['institucionId','Institución'],['numero','N.º convenio'],['fechaInicio','Desde'],['fechaFin','Hasta'],['estado','Estado']],search:['numero','condiciones','estado']};
UNIQUE.convenios=[{f:'numero',n:'code',m:'Ya existe un convenio con ese número.'}];
PAGE_HOOKS.convenios={
 nota:()=>`<span class="small-muted"><i class="bi bi-bell me-1"></i>${list('convenios').filter(x=>x.fechaFin&&((new Date(x.fechaFin)-new Date())/86400000)<=60&&new Date(x.fechaFin)>=new Date()).length} convenio(s) vencen en los próximos 60 días.</span>`,
 fechas:{par:['fechaInicio','fechaFin']} /* el vencimiento no puede ser anterior al inicio */
};
