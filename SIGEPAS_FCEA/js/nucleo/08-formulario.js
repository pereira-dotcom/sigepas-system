'use strict';
/* ====================================================================
   FORMULARIO Y ELIMINACIÓN GENÉRICOS · crear, editar y eliminar registros de las
   páginas con configs[...]. Lo propio de cada página va en su PAGE_HOOKS:
   abrir, alLeer, duplicados, fechas, antesDeGuardar, despuesDeGuardar,
   alCambiar, puedeEditar, bloqueoEliminar, avisoEliminar, alEliminar.
   ==================================================================== */
const formFields=c=>c.fields.filter(f=>!f.adminOnly||me.rol==='Administrador');
function fieldOptions(f,rec={}){let opts=f.options||[];if(f.type==='account')opts=accountOptions(rec.rol,rec.id);if(f.type==='career')opts=list('carreras').filter(x=>x.activa==='Activa').map(x=>({value:x.id,label:x.nombre}));if(f.type==='student')opts=list('estudiantes').filter(x=>x.estado==='Activo'&&(me.rol!=='Pasante'||String(x.id)===String(me.vinculoId))).map(x=>({value:x.id,label:`${x.nombre} · ${x.cedula}`,extra:`${x.matricula||''} ${x.correo||''}`}));if(f.type==='institution')opts=list('instituciones').map(x=>({value:x.id,label:x.nombre}));if(f.type==='internship')opts=vis('pasantias').map(x=>({value:x.id,label:`${x.codigo} · ${studentName(x.estudianteId)}`,extra:find('instituciones',x.institucionId)?.nombre||''}));return opts.map(o=>typeof o==='object'?o:{value:o,label:o})}
function openRecord(key,id=null){if(!can(key,id?'editar':'crear'))return;const c=configs[key];editing={key,id};const rec=id?{...find(key,id)}:{};PAGE_HOOKS[key]?.abrir?.(rec,id);$('recordModalTitle').textContent=(id?'Editar ':(c.femenino?'Nueva ':'Nuevo '))+c.singular.toLowerCase();$('recordError').textContent='';$('recordFields').innerHTML=formFields(c).map(f=>{const val=rec[f.key]??(typeof f.def==='function'?f.def():f.def??'');const full=f.type==='textarea';const req=f.requiredOnCreate?!id:f.required;let control='';if(f.type==='suggest'){control=suggestHTML(f,val,req)}else if(COMBO_TYPES.includes(f.type)){const options=fieldOptions(f,rec);control=comboHTML(f,options,val,req,rec)}else if(f.type==='select'){const options=fieldOptions(f,rec);control=`<select class="form-select" id="field_${f.key}" ${req?'required':''}><option value="">Seleccione...</option>${options.map(o=>`<option value="${esc(o.value)}" ${String(val)===String(o.value)?'selected':''}>${esc(o.label)}</option>`).join('')}</select>`}else if(full){control=`<textarea class="form-control" id="field_${f.key}" rows="3" ${req?'required':''}>${esc(val)}</textarea>`}else{const type=f.type==='email'?'email':f.type==='date'?'date':f.type==='number'?'number':f.type==='password'?'password':'text';control=`<input class="form-control" id="field_${f.key}" type="${type}" ${f.type==='number'?`min="${f.min??0}"${f.max!=null?` max="${f.max}"`:''}${f.step?` step="${f.step}"`:''}${f.fijo?' readonly':''}`:''} ${f.type==='password'?`autocomplete="new-password" placeholder="${typeof f.ph==='function'?f.ph(id,rec):f.ph||'Mínimo 8 caracteres'}"`:''} value="${f.type==='password'?'':esc(val)}" ${req?'required':''}>`}return `<div class="${full?'col-12':'col-md-6'}"><label class="form-label" for="field_${f.key}">${esc(f.label)}${req?' <span class="text-danger">*</span>':''}</label>${control}${f.key==='password'?`<div class="form-text" id="pwRules">${PW_RULES}</div>`:''}${f.key==='passwordConfirm'?'<div class="form-text" id="pwMatch" aria-live="polite"></div>':''}${f.type==='account'?`<div class="form-text" id="accountHint">${fieldOptions(f,rec).length?'Cuenta de acceso de esta persona: define qué pasantías puede ver.':'No hay cuentas libres para este rol. Cree primero el usuario en el menú Usuarios.'}</div>`:''}</div>`}).join('');{const pw=$('field_password')?.parentElement,pc=$('field_passwordConfirm')?.parentElement;if(pw&&pc){pc.className='mt-3';pw.appendChild(pc)}}dateLimits();bootstrap.Modal.getOrCreateInstance($('recordModal')).show()}
function readForm(c,old){const rec={...old};for(const f of formFields(c)){const el=$('field_'+f.key);let val=f.type==='password'?el.value:el.value.trim();if(COMBO_TYPES.includes(f.type))val=el.dataset.val?Number(el.dataset.val):'';if(f.type==='suggest')val=el.dataset.val===SUGGEST_OTHER?($('field_'+f.key+'_otro')?.value.trim()||''):(el.dataset.val||'');if(f.type==='number')val=Number(val||0);rec[f.key]=val}return rec}
function showErrors(errs,only){
 const box=$('recordFields');
 box.querySelectorAll('.is-invalid').forEach(el=>{if(!only||el.id==='field_'+only)el.classList.remove('is-invalid')});
 box.querySelectorAll('.dup-msg').forEach(el=>{if(!only||el.dataset.field===only)el.remove()});
 for(const e of errs){if(only&&e.field!==only)continue;const el=$('field_'+e.field);if(!el)continue;el.classList.add('is-invalid');const cb=el.classList.contains('combo-input'),d=document.createElement('div');d.className=(cb?'text-danger small mt-1':'invalid-feedback')+' dup-msg';d.dataset.field=e.field;d.textContent=e.msg;(cb?el.closest('.combo'):el).insertAdjacentElement('afterend',d)}
 if(!only){$('recordError').textContent=errs.length?'No se guardó: corrija los campos marcados en rojo.':'';if(errs.length)$('field_'+errs[0].field)?.focus()}
}
$('recordFields').addEventListener('focusout',e=>{if(!editing||!e.target.id?.startsWith('field_'))return;const fk=e.target.id.slice(6),{key,id}=editing;{const rec=readForm(configs[key],id?find(key,id):{});showErrors([...comboPending(),...checkDuplicates(key,rec,id),...dateErrors(key,rec,id)],fk)}});
$('recordFields').addEventListener('input',e=>{if(e.target.id!=='field_password'&&e.target.id!=='field_passwordConfirm')return;pwLive($('field_password'),$('field_passwordConfirm'),$('pwMatch'),$('pwRules'))});
$('recordFields').addEventListener('change',e=>{if(editing)PAGE_HOOKS[editing.key]?.alCambiar?.(e)});
/* «Otros» en un campo con sugerencias: muestra (u oculta) el cuadro para escribir la opción. */
['change','combochange'].forEach(ev=>$('recordFields').addEventListener(ev,e=>{const id=e.target.id||'';if(!editing||!id.startsWith('field_'))return;const k=id.slice(6),o=$('field_'+k+'_otro');if(!o||e.target===o)return;const on=e.target.dataset.val===SUGGEST_OTHER,was=!o.classList.contains('d-none');o.classList.toggle('d-none',!on);o.required=on&&!!configs[editing.key].fields.find(f=>f.key===k)?.required;if(!on)o.value='';else if(!was&&!o.value)o.focus()}));
$('recordFields').addEventListener('input',e=>{if(e.target.classList?.contains('is-invalid'))showErrors([],e.target.id.slice(6))});
['input','change','combochange'].forEach(ev=>$('recordFields').addEventListener(ev,e=>{if(!editing)return;const id=e.target.id||'';if(dateWatch(editing.key).some(f=>id==='field_'+f))refreshDates()}));
function deleteBlockers(key,id){
 const b=PAGE_HOOKS[key]?.bloqueoEliminar?.(id);if(b)return b;
 const dep=configs[key].dependientes; /* [página hija, campo que la liga, texto] */
 if(dep){const [child,field,label]=dep;const n=list(child).filter(x=>String(x[field])===String(id)).length;if(n)return `No se puede eliminar: tiene ${n} ${label} vinculado(s). Inactive el registro o elimine/actualice primero sus dependencias.`}
 return '';
}
function deletePreview(key,id){
 const c=configs[key],r=find(key,id);if(!r)return '';
 const rows=c.fields.filter(f=>f.type!=='password').map(f=>{let v=f.verEliminar?f.verEliminar(r):['career','student','institution','internship'].includes(f.type)?resolve(key,f.key,r[f.key]):r[f.key];if(v===undefined||v===null||v==='')v='—';return `<div class="dp-row"><dt>${esc(f.label)}</dt><dd>${esc(v)}</dd></div>`}).join('');
 const also=PAGE_HOOKS[key]?.avisoEliminar?.(id)||'';
 return `<div class="dp-box"><div class="dp-title"><i class="bi bi-exclamation-triangle"></i>Se eliminará el siguiente registro (${esc(c.singular.toLowerCase())}):</div><dl class="dp-list">${rows}</dl>${also}</div>`;
}
function askDelete(key,id){if(!can(key,'eliminar'))return;deleteTarget={key,id};$('deletePassword').value='';$('deleteError').textContent='';
 const bl=deleteBlockers(key,id);
 $('deleteMessage').innerHTML=deletePreview(key,id)+(bl?`<div class="dp-block"><i class="bi bi-slash-circle me-1"></i>${esc(bl)}</div>`:'<p class="mb-2 mt-3">Para eliminar este registro, confirme su contraseña.</p>');
 $('deleteConfirm').classList.toggle('d-none',!!bl);$('deleteConfirmBtn').disabled=!!bl;
 bootstrap.Modal.getOrCreateInstance($('deleteModal')).show()}
$('recordForm').addEventListener('submit',e=>{
 e.preventDefault();if(!editing)return;
 const {key,id}=editing,c=configs[key],h=PAGE_HOOKS[key]||{},old=id?find(key,id):{},rec=readForm(c,old),ctx={key,id,rec,old,extra:{}};
 h.alLeer?.(ctx);
 if(!can(key,id?'editar':'crear'))return;
 showErrors([]);const dups=[...comboPending(),...checkDuplicates(key,rec,id),...dateErrors(key,rec,id)];if(dups.length){showErrors(dups);return}
 const r=h.antesDeGuardar?.(ctx);if(r===false)return;if(r){$('recordError').textContent=r;return}
 if(id){const ix=list(key).findIndex(x=>x.id===id);db[key][ix]=rec}else{rec.id=nextId(key);db[key].push(rec)}
 const msg=h.despuesDeGuardar?.(ctx);
 saveDB();bootstrap.Modal.getInstance($('recordModal')).hide();toast(msg||(id?'Registro actualizado correctamente.':'Registro creado correctamente.'));renderPage(currentPage)
});
$('deleteForm').addEventListener('submit',e=>{e.preventDefault();if(!deleteTarget||!can(deleteTarget.key,'eliminar'))return;if(sha256((me.salt||'')+$('deletePassword').value)!==me.hash){$('deleteError').textContent='Contraseña incorrecta. No se eliminó el registro.';return}const {key,id}=deleteTarget;const bl=deleteBlockers(key,id);if(bl){$('deleteError').textContent=bl;return}db[key]=list(key).filter(x=>x.id!==id);PAGE_HOOKS[key]?.alEliminar?.(id);saveDB();bootstrap.Modal.getInstance($('deleteModal')).hide();toast('Registro eliminado correctamente.');renderPage(currentPage)});
