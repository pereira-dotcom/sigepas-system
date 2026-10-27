'use strict';
/* ====================================================================
   BUSCADOR CON FILTRO · reemplaza al desplegable en los campos que apuntan a
   otros registros (pasante, institución, pasantía, carrera, cuenta).
   ==================================================================== */
/* ---- Buscador con filtro (reemplaza al desplegable en campos que apuntan a otros registros) ---- */
const COMBO_TYPES=['career','student','institution','internship','account'],COMBO_MAX=50,comboStore={};
const foldText=t=>String(t??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
function comboMarkup(id,options,sel,ph,req,dis){
 comboStore[id]=options;
 return `<div class="combo"><input class="form-control combo-input" id="${id}" type="text" role="combobox" aria-autocomplete="list" aria-expanded="false" autocomplete="off" data-val="${sel?esc(sel.value):''}" value="${sel?esc(sel.label):''}" placeholder="${esc(ph)}" ${req?'required':''} ${dis?'disabled':''}><i class="bi bi-chevron-down combo-caret"></i><div class="combo-list d-none" role="listbox"></div></div>`}
function comboHTML(f,options,val,req,rec){
 let sel=options.find(o=>String(o.value)===String(val));
 if(!sel&&f.type==='student'&&req&&options.length===1&&!rec.id)sel=options[0];
 return comboMarkup('field_'+f.key,options,sel,f.type==='account'?'Sin cuenta vinculada':'Escriba para buscar...',req,f.type==='account'&&!options.length)}
/* Campo con sugerencias (type:'suggest'): lista con buscador + opción «Otros». Al elegir «Otros» aparece un cuadro
   para escribir la opción; lo que se guarda es el texto elegido o escrito (no un número). */
const SUGGEST_OTHER='__otros__';
function suggestHTML(f,val,req){
 /* options puede ser una lista o una función (para listas que salen de otros registros o dependen de la fecha).
    sinOtros:true => lista cerrada: solo se puede elegir de la lista (si el registro ya tenía otro valor, se conserva como opción). */
 let base=typeof f.options==='function'?f.options():(f.options||[]);base=[...base];
 let huerfano='';
 if(f.sinOtros&&val&&!base.includes(val)){if(!f.existe||f.existe(val))base.push(val);else{huerfano=val;val=''}}
 const opts=base.map(o=>({value:o,label:o}));if(!f.sinOtros)opts.push({value:SUGGEST_OTHER,label:'Otros'});
 const known=base.includes(val),other=!f.sinOtros&&!!val&&!known;
 const sel=known?{value:val,label:val}:other?{value:SUGGEST_OTHER,label:'Otros'}:null;
 return comboMarkup('field_'+f.key,opts,sel,'Escriba para buscar o elija...',req,false)+
  (f.sinOtros?((huerfano?`<div class="form-text text-danger">«${esc(huerfano)}» ya no está registrado en Docentes y tutores. Elija un docente de la lista.</div>`:'')+(base.length?'':`<div class="form-text text-danger">${esc(f.vacio||'No hay opciones disponibles.')}</div>`)):`<input class="form-control mt-2${other?'':' d-none'}" id="field_${f.key}_otro" type="text" placeholder="Especifique cuál" value="${other?esc(val):''}" ${other&&req?'required':''}>`)}
const comboList=inp=>inp.parentElement.querySelector('.combo-list');
const comboFind=(inp,q)=>{const terms=foldText(q).split(/\s+/).filter(Boolean);return (comboStore[inp.id]||[]).filter(o=>{const t=foldText(o.label+' '+(o.extra||''));return terms.every(w=>t.includes(w))})};
function comboActive(box,i){const items=[...box.querySelectorAll('.combo-item')];items.forEach((el,n)=>el.classList.toggle('active',n===i));box.dataset.active=i;if(items[i])items[i].scrollIntoView({block:'nearest'})}
function comboOpen(inp,q){
 const box=comboList(inp),all=comboStore[inp.id]||[],found=comboFind(inp,q),shown=found.slice(0,COMBO_MAX);
 box.innerHTML=shown.length?shown.map(o=>`<div class="combo-item${String(o.value)===inp.dataset.val?' selected':''}" role="option" data-value="${esc(o.value)}">${esc(o.label)}</div>`).join('')+(found.length>shown.length?`<div class="combo-note">Mostrando ${shown.length} de ${found.length}. Siga escribiendo para filtrar.</div>`:''):`<div class="combo-note">${all.length?'Sin coincidencias.':'No hay opciones disponibles.'}</div>`;
 box.classList.remove('d-none','up');box.style.maxHeight='220px';
 const body=inp.closest('.modal-body');
 if(body){const r=inp.getBoundingClientRect(),b=body.getBoundingClientRect(),below=b.bottom-r.bottom-8,above=r.top-b.top-8,up=below<150&&above>below;box.classList.toggle('up',up);box.style.maxHeight=Math.max(110,Math.min(220,up?above:below))+'px'}
 inp.setAttribute('aria-expanded','true');
 const items=[...box.querySelectorAll('.combo-item')],sel=items.findIndex(el=>el.dataset.value===String(inp.dataset.val));
 comboActive(box,items.length?(!foldText(q).trim()&&sel>=0?sel:0):-1)}
function comboClose(inp){comboList(inp).classList.add('d-none');inp.setAttribute('aria-expanded','false')}
function comboPick(inp,opt){inp.value=opt.label;inp.dataset.val=opt.value;comboClose(inp);if(inp.closest('#recordFields'))showErrors([],inp.id.slice(6));inp.dispatchEvent(new Event('change',{bubbles:true}));inp.dispatchEvent(new Event('combochange',{bubbles:true}))}
function comboSettle(inp){
 comboClose(inp);const txt=inp.value.trim();
 if(inp.dataset.val||!txt){if(!txt)inp.dataset.val='';inp.dispatchEvent(new Event('combochange',{bubbles:true}));return}
 const found=comboFind(inp,txt),exact=found.find(o=>foldText(o.label)===foldText(txt));
 /* Campo con «Otros»: lo escrito que no está en la lista no se borra, se guarda como «Otros» con ese texto. */
 const otros=(comboStore[inp.id]||[]).find(o=>o.value===SUGGEST_OTHER),otroBox=otros&&document.getElementById(inp.id+'_otro');
 if(exact){comboPick(inp,exact);return}
 if(otroBox){otroBox.value=txt;comboPick(inp,otros);return}
 if(found.length===1){comboPick(inp,found[0]);return}
 /* Sin coincidencia en una lista cerrada: el texto NO se borra; queda marcado como pendiente (ver comboPending) y se pide elegir una opción. */
 if(inp.closest('#recordFields')){inp.dispatchEvent(new Event('combochange',{bubbles:true}));return}
 inp.value='';inp.dispatchEvent(new Event('combochange',{bubbles:true}))}
/* Campos del formulario con texto escrito que no corresponde a ninguna opción de la lista. */
function comboPending(){return [...document.querySelectorAll('#recordFields .combo-input')].filter(i=>!i.disabled&&i.value.trim()&&!i.dataset.val).map(i=>({field:i.id.slice(6),msg:'Ese valor no está en la lista. Elija una de las opciones sugeridas.'}))}
[$('recordFields'),$('pageContent')].forEach(rf=>{const isCombo=e=>e.target.classList?.contains('combo-input')?e.target:null;
 rf.addEventListener('focusin',e=>{const i=isCombo(e);if(i&&!i.disabled)comboOpen(i,i.dataset.val?'':i.value)});
 rf.addEventListener('click',e=>{const i=isCombo(e);if(i&&!i.disabled&&comboList(i).classList.contains('d-none'))comboOpen(i,i.dataset.val?'':i.value)});
 rf.addEventListener('input',e=>{const i=isCombo(e);if(!i)return;i.dataset.val='';comboOpen(i,i.value)});
 rf.addEventListener('focusout',e=>{const i=isCombo(e);if(i)comboSettle(i)});
 rf.addEventListener('mousedown',e=>{const it=e.target.closest?.('.combo-item,.combo-note');if(!it)return;e.preventDefault();if(!it.classList.contains('combo-item'))return;const inp=it.closest('.combo').querySelector('.combo-input');comboPick(inp,(comboStore[inp.id]||[]).find(o=>String(o.value)===it.dataset.value))});
 rf.addEventListener('keydown',e=>{const i=isCombo(e);if(!i)return;const box=comboList(i),open=!box.classList.contains('d-none'),items=[...box.querySelectorAll('.combo-item')],cur=Number(box.dataset.active??-1);
  if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();if(!open){comboOpen(i,i.dataset.val?'':i.value);return}if(items.length)comboActive(box,(cur+(e.key==='ArrowDown'?1:-1)+items.length)%items.length)}
  else if(e.key==='Enter'&&open){e.preventDefault();const it=items[cur];if(it)comboPick(i,(comboStore[i.id]||[]).find(o=>String(o.value)===it.dataset.value))}
  else if(e.key==='Escape'&&open){e.preventDefault();e.stopPropagation();comboClose(i)}})});
