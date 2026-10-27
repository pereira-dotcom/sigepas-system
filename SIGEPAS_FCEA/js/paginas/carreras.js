'use strict';
/* ====================================================================
   PÁGINA · Carreras
   Datos de ejemplo, campos del formulario, columnas y reglas de la página.
   ==================================================================== */
SEED.carreras=[{id:1,nombre:'Contabilidad',codigo:'CON',activa:'Activa'},{id:2,nombre:'Administración',codigo:'ADM',activa:'Activa'},{id:3,nombre:'Economía',codigo:'ECO',activa:'Activa'},{id:4,nombre:'Comercio Internacional',codigo:'CI',activa:'Inactiva'}];
configs.carreras={title:'Carreras',singular:'Carrera',femenino:true,icon:'bi-book',desc:'Administre las carreras habilitadas para pasantes de la FCEA.',fields:[{key:'nombre',label:'Nombre de la carrera',required:true},{key:'codigo',label:'Código',required:true},{key:'activa',label:'Estado',type:'select',options:['Activa','Inactiva'],required:true}],columns:[['nombre','Carrera'],['codigo','Código'],['activa','Estado']],search:['nombre','codigo']};
configs.carreras.dependientes=['estudiantes','carreraId','pasante(s)']; /* no se elimina si tiene pasantes */
UNIQUE.carreras=[{f:'nombre',n:'text',m:'Ya existe una carrera con ese nombre.'},{f:'codigo',n:'code',m:'Ya existe una carrera con ese código.'}];
PAGE_HOOKS.carreras={
 nota:()=>'<span class="small-muted"><i class="bi bi-info-circle me-1"></i>Las carreras inactivas no aparecerán al registrar estudiantes.</span>'
};
