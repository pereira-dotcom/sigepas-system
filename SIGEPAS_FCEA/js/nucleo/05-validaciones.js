'use strict';
/* ====================================================================
   VALIDACIONES · valores repetidos y coherencia de fechas.
   Las reglas de cada página se declaran en su archivo de js/paginas/.
   ==================================================================== */
/* ---- Validación de valores repetidos ---- */
const strip=s=>String(s??'').normalize('NFD').replace(/[̀-ͯ]/g,'');
const NORM={
 text:v=>strip(v).toLowerCase().replace(/\s+/g,' ').trim(),            // nombres: sin tildes, mayúsculas ni espacios extra
 code:v=>strip(v).toLowerCase().replace(/[^a-z0-9]/g,''),               // cédula, RUC, matrícula, códigos: ignora puntos, guiones y espacios
 tel:v=>{const d=String(v??'').replace(/\D/g,'');return d.length>9?d.slice(-9):d}, // teléfono: ignora formato y prefijo 0 / +595
 mail:v=>String(v??'').toLowerCase().trim()
};
/* Reglas de valores únicos: cada página agrega las suyas en UNIQUE (ver 04-datos.js). */
function checkDuplicates(key,rec,id){
 const errs=[];
 for(const r of UNIQUE[key]||[]){const v=NORM[r.n](rec[r.f]);if(!v)continue;const other=list(key).find(x=>x.id!==id&&NORM[r.n](x[r.f])===v);if(other){const who=other.nombre||other.codigo||other.numero;errs.push({field:r.f,msg:r.m+(who&&NORM.text(who)!==NORM.text(rec[r.f])?` (${who})`:'')})}}
 errs.push(...(PAGE_HOOKS[key]?.duplicados?.(rec,id)||[]));
 return errs;
}
/* ---- Coherencia de fechas ----
   Una página la activa con PAGE_HOOKS.<página>.fechas = { par:[inicio,fin], extra(rec,id), campos, vigilar, limites() } */
const fmtD=d=>{const [y,m,dd]=String(d).split('-');return dd&&m?`${dd}/${m}/${y}`:String(d)};
function dateErrors(key,rec,id){
 const h=PAGE_HOOKS[key]?.fechas;if(!h)return [];
 const e=[],pr=h.par;
 if(pr){const ini=rec[pr[0]],fin=rec[pr[1]];if(ini&&fin&&fin<ini){e.push({field:pr[1],msg:`No puede ser anterior a la fecha de inicio (${fmtD(ini)}).`});e.push({field:pr[0],msg:`No puede ser posterior a la fecha de finalización (${fmtD(fin)}).`})}}
 e.push(...(h.extra?.(rec,id)||[]));
 return e}
const dateWatch=key=>{const h=PAGE_HOOKS[key]?.fechas;return h?[...(h.par||[]),...(h.campos||[]),...(h.vigilar||[])]:[]};
/* Límites del calendario: no deja elegir fechas fuera de rango. */
function dateLimits(){
 if(!editing)return;const h=PAGE_HOOKS[editing.key]?.fechas;if(!h)return;const pr=h.par;
 if(pr){const a=$('field_'+pr[0]),b=$('field_'+pr[1]);if(a&&b){b.min=a.value||'';a.max=b.value||''}}
 h.limites?.()}
function refreshDates(){
 if(!editing)return;dateLimits();const {key,id}=editing,h=PAGE_HOOKS[key]?.fechas;if(!h)return;
 const errs=dateErrors(key,readForm(configs[key],id?find(key,id):{}),id);
 new Set([...(h.par||[]),...(h.campos||[])]).forEach(f=>showErrors(errs,f))}
