'use strict';
/* ====================================================================
   CONFIGURACIÓN GENERAL · textos institucionales, tiempos de seguridad,
   roles, permisos por rol y opciones del menú principal.
   ==================================================================== */
const KEY='fceaPasantiasDB';
/* Datos institucionales que aparecen en las impresiones y en el PDF. */
const FACULTAD='FACULTAD DE CIENCIAS ECONÓMICAS Y ADMINISTRATIVAS',UNIVERSIDAD='UNIVERSIDAD NACIONAL DE CONCEPCIÓN',FACULTAD_TIT='Facultad De Ciencias Económicas Y Administrativas';
/* Encabezado institucional único: logo UNC a la izquierda, nombres centrados, logo FCEA a la derecha. */
function instHeader(extra){return `<div class="inst-head${extra?' '+extra:''}"><img class="inst-logo" src="img/logo-unc.png" alt="Universidad Nacional de Concepción"><div class="inst-text"><strong>${UNIVERSIDAD}</strong><span>${FACULTAD_TIT}</span></div><img class="inst-logo" src="img/logo-fcea.png" alt="FCEA"></div>`}
/* Seguridad: cierre de sesión al minuto sin actividad (aviso 10 s antes); la confirmación de contraseña para secciones de nivel alto vale 10 min. */
const HORAS_PASANTIA=192; /* horas fijas que cada pasante debe realizar: ni más ni menos */
const HORAS_MAX_DIA=6;    /* máximo de horas que un pasante puede realizar por día */
const DIAS_HABILES=[1,2,3,4,5]; /* días en que se pueden realizar horas: lunes (1) a viernes (5) */
const diaSemana=f=>new Date(f+'T00:00:00').getDay(); /* 0 = domingo … 6 = sábado */
const esDiaHabil=f=>DIAS_HABILES.includes(diaSemana(f));
const fmtH=n=>String(Number(n)).replace('.',','); /* 4.5 → «4,5» */
const IDLE_LOGOUT_MS=60*1000,WARN_MS=10*1000,REAUTH_MS=10*60*1000,SECURE_PAGES=['usuarios'];
const ROLES=['Administrador','Coordinador','Docente','Tutor externo','Pasante'];
const ROLE_INFO={
 'Administrador':{icon:'bi-shield-lock',slug:'administrador',desc:'Control total del sistema: usuarios y roles, respaldo, restauración y todos los módulos.'},
 'Coordinador':{icon:'bi-person-workspace',slug:'coordinador',desc:'Gestiona carreras, pasantes, convenios, pasantías, seguimiento, documentación y reportes.'},
 'Docente':{icon:'bi-person-badge',slug:'docente',desc:'Tutor académico: ve y evalúa las pasantías que tiene a cargo y revisa su seguimiento y documentos.'},
 'Tutor externo':{icon:'bi-building-check',slug:'tutor',desc:'Supervisor en la institución receptora: registra horas y avances de sus pasantes.'},
 'Pasante':{icon:'bi-mortarboard',slug:'estudiante',desc:'Solicita su pasantía, consulta su avance y presenta su documentación.'}
};
const ALL4=['ver','crear','editar','eliminar'],V=['ver'],VCE=['ver','crear','editar'];
const PAGES=['inicio','carreras','estudiantes','tutores','instituciones','convenios','pasantias','seguimientos','documentos','reportes','usuarios'];
const PERMS={
 'Administrador':Object.fromEntries(PAGES.map(p=>[p,['inicio','reportes'].includes(p)?V:ALL4])),
 'Coordinador':Object.fromEntries(PAGES.filter(p=>p!=='usuarios').map(p=>[p,['inicio','reportes'].includes(p)?V:ALL4])),
 'Docente':{inicio:V,estudiantes:V,pasantias:['ver','editar'],seguimientos:VCE,documentos:VCE,reportes:V},
 'Tutor externo':{inicio:V,pasantias:V,seguimientos:VCE,documentos:V},
 'Pasante':{inicio:V,pasantias:['ver','crear'],seguimientos:V,documentos:VCE}
};
const NAV=[['inicio','bi-grid-1x2','Panel principal'],['carreras','bi-book','Carreras'],['estudiantes','bi-people','Pasantes'],['tutores','bi-person-badge','Docentes y tutores'],['instituciones','bi-building','Instituciones receptoras'],['convenios','bi-file-earmark-text','Convenios'],['pasantias','bi-clipboard-check','Pasantías y solicitudes'],['seguimientos','bi-clock-history','Seguimiento y horas'],['documentos','bi-folder2-open','Documentación'],['reportes','bi-bar-chart','Reportes'],['usuarios','bi-person-gear','Usuarios']];
let me=null; /* usuario con la sesión abierta */
const can=(page,action='ver')=>!!me&&(PERMS[me.rol]?.[page]||[]).includes(action);
const nowDate=()=>new Date().toISOString().slice(0,10);
const FILIALES=['Concepción','Horqueta','Yby Yaú'];
