'use strict';
/* ====================================================================
   DATOS · estado global, base local (localStorage + IndexedDB) y consultas comunes.
   Cada página de js/paginas/ agrega aquí sus datos iniciales (SEED), su
   configuración (configs), sus reglas de valores únicos (UNIQUE) y sus
   reglas propias (PAGE_HOOKS).
   ==================================================================== */
let db, currentPage='inicio', editing=null, deleteTarget=null, activeSearch='';
const SEED={};        /* datos iniciales: los aporta cada página */
const configs={};     /* campos, columnas y textos de cada página */
const UNIQUE={};      /* valores que no pueden repetirse, por página */
const PAGE_HOOKS={};  /* reglas propias de cada página (validar, guardar, eliminar...) */
const PAGE_RENDER={}; /* páginas con pantalla propia (inicio, reportes, usuarios) */
const list=k=>db[k]||[];
function openLocalDB(){return new Promise((resolve,reject)=>{if(!('indexedDB' in window)){reject(new Error('IndexedDB no está disponible'));return}const req=indexedDB.open('SIGEPAS_DB',1);req.onupgradeneeded=()=>{const d=req.result;if(!d.objectStoreNames.contains('sistema'))d.createObjectStore('sistema')};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)})}
function persistIndexedDB(){openLocalDB().then(d=>{const tx=d.transaction('sistema','readwrite');tx.objectStore('sistema').put(db,'datos');tx.oncomplete=()=>d.close();tx.onerror=()=>d.close()}).catch(()=>{/* El sistema conserva el respaldo alternativo en localStorage. */})}
/* Cada página es un .html distinto, así que los datos se leen de nuevo en cada navegación. Para no pisar
   cambios recientes con una copia vieja de IndexedDB, cada guardado lleva una marca de tiempo (_ts) y gana la más nueva. */
let onDBReload=null; /* la página interna lo define: se llama si IndexedDB trae datos más nuevos que localStorage */
function initDB(){
 let fromSeed=false;
 try{db=JSON.parse(localStorage.getItem(KEY))}catch{db=null}
 if(!db||!db.carreras){db={};Object.keys(SEED).forEach(k=>db[k]=[]);db._ts=0;fromSeed=true;/* base VACÍA: los datos solo aparecen al pulsar «Cargar la base de datos» */try{localStorage.setItem(KEY,JSON.stringify(db))}catch{}}
 migrate();
 return openLocalDB().then(d=>new Promise(resolve=>{const req=d.transaction('sistema','readonly').objectStore('sistema').get('datos');
  req.onsuccess=()=>{const s=req.result;
   if(s&&s.carreras&&(fromSeed||(s._ts||0)>(db._ts||0))){db=s;migrate();localStorage.setItem(KEY,JSON.stringify(db));onDBReload?.()}
   else if(!s||(s._ts||0)<(db._ts||0))persistIndexedDB();
   d.close();resolve()};
  req.onerror=()=>{d.close();resolve()}})).catch(()=>{})}
function saveDB(){db._ts=Date.now();localStorage.setItem(KEY,JSON.stringify(db));persistIndexedDB()}
function nextId(k){return list(k).reduce((m,x)=>Math.max(m,Number(x.id)||0),0)+1}
function find(k,id){return list(k).find(x=>String(x.id)===String(id))}
function pasantiasOf(u=me){const all=list('pasantias');if(u.rol==='Pasante')return all.filter(p=>String(p.estudianteId)===String(u.vinculoId));const t=find('tutores',u.vinculoId);if(!t)return [];const n=NORM.text(t.nombre),f=u.rol==='Docente'?'tutorAcademico':'tutorInstitucional';return all.filter(p=>NORM.text(p[f])===n)}
function vis(k){const all=list(k);if(!me||['Administrador','Coordinador'].includes(me.rol))return all;const mine=pasantiasOf(),ids=new Set(mine.map(p=>p.id));if(k==='pasantias')return mine;if(k==='seguimientos'||k==='documentos')return all.filter(x=>ids.has(x.pasantiaId));if(k==='estudiantes')return all.filter(e=>mine.some(p=>p.estudianteId===e.id));return all}
function canEditRec(key,r){return can(key,'editar')&&(PAGE_HOOKS[key]?.puedeEditar?.(r)??true)}
function careerName(id){return find('carreras',id)?.nombre||'Carrera eliminada'}
function studentName(id){return find('estudiantes',id)?.nombre||'Pasante no disponible'}
function institutionName(id){return find('instituciones',id)?.nombre||'Institución no disponible'}
function internshipName(id){const p=find('pasantias',id);return p?`${p.codigo} · ${studentName(p.estudianteId)}`:'Pasantía no disponible'}
function resolve(k,key,v){if(key==='carreraId')return careerName(v);if(key==='estudianteId')return studentName(v);if(key==='institucionId')return institutionName(v);if(key==='pasantiaId')return internshipName(v);return v??'—'}
/* Cada página puede definir migrar() para adaptar datos guardados con versiones anteriores. */
function migrate(){
 for(const k of Object.keys(SEED))if(!Array.isArray(db[k]))db[k]=[];
 /* Renombre de rol: «Tutor institucional» pasó a «Tutor externo». */
 for(const k of ['tutores','usuarios'])db[k].forEach(x=>{if(x.rol==='Tutor institucional')x.rol='Tutor externo'});
 db.usuarios.forEach(x=>{if(x.rol==='Estudiante')x.rol='Pasante'}); /* «Estudiante» pasó a «Pasante» */
 Object.values(PAGE_HOOKS).forEach(h=>h.migrar?.());
}
/* Al iniciar o cerrar sesión cada página puede reiniciar su estado (p. ej. los filtros de Reportes). */
function reiniciarPaginas(){Object.values(PAGE_HOOKS).forEach(h=>h.reiniciar?.())}
