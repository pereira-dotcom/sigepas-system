'use strict';
/* ====================================================================
   ARRANQUE DE LAS PÁGINAS INTERNAS · se ejecuta al final, cuando ya están
   cargados el núcleo y los datos de todas las páginas. La sección que se dibuja
   la indica cada .html con <body data-page="...">.
   ==================================================================== */
currentPage=document.body.dataset.page||'inicio';
setInterval(idleTick,1000);
onDBReload=()=>{if(syncSession()){renderChip();renderNav();renderPage(currentPage)}};
initDB();
if(!syncSession())location.replace('index.html');            /* sin sesión: al ingreso */
else if(!can(currentPage,'ver'))flashTo('inicio','No tiene permiso para acceder a esa sección.');
else{showApp();if(sessionStorage.getItem('fceaLocked')==='1'||Date.now()-lastActive>=IDLE_LOGOUT_MS)lockScreen();else stamp()}
/* Si el navegador restaura la página con «Atrás» después de cerrar sesión, se vuelve al ingreso. */
window.addEventListener('pageshow',e=>{if(e.persisted&&!sessionStorage.getItem('fceaUser'))location.replace('index.html')});
