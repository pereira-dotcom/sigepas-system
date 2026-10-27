'use strict';
/* ====================================================================
   UTILIDADES · funciones pequeñas que usan todas las pantallas.
   ==================================================================== */
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function statusClass(v){return 'status-'+String(v||'').toLowerCase().replaceAll(' ','-').normalize('NFD').replace(/[\u0300-\u036f]/g,'')}
function badge(v){return `<span class="badge-status ${statusClass(v)}">${esc(v||'—')}</span>`}
function toast(msg,error=false){const el=document.createElement('div');el.className='toast-msg'+(error?' error':'');el.textContent=msg;$('toastArea').appendChild(el);setTimeout(()=>el.remove(),3200)}
function empty(title,desc){return `<div class="empty-state"><i class="bi bi-inbox"></i><strong>${esc(title)}</strong><span>${esc(desc)}</span></div>`}
function loadScriptOnce(src){return new Promise((res,rej)=>{if(document.querySelector('script[data-lazy="'+src+'"]'))return res();const t=document.createElement('script');t.src=src;t.dataset.lazy=src;t.onload=res;t.onerror=()=>rej(new Error('No se pudo cargar '+src));document.body.appendChild(t)})}
