# SIGEPAS — Sistema de Información y Seguimiento de Pasantías
## FCEA · Prototipo académico 2026

Aplicación web basada en HTML, CSS, JavaScript y Bootstrap. Los datos se persisten en IndexedDB y se mantiene una copia alternativa en localStorage para compatibilidad y recuperación básica.

## Estructura del código
Se abre `index.html` directamente (no necesita servidor). Cada opción del menú principal es su propio archivo `.html`. El código está separado así:

```
index.html              ingreso (login). Si ya hay sesión abierta pasa directo a inicio.html
inicio.html  carreras.html  estudiantes.html  tutores.html  instituciones.html
convenios.html  pasantias.html  seguimientos.html  documentos.html  reportes.html  usuarios.html
                        una página por cada opción del menú; cada una indica su sección con <body data-page="...">
app.css                 estilos
js/nucleo/              lo compartido por todas las páginas
  00-estructura.js        menú lateral, barra superior y ventanas (modales) de las páginas internas
  01-config.js            textos institucionales, tiempos de seguridad, roles, permisos y menú
  02-seguridad.js         SHA-256 y política de contraseñas
  03-utilidades.js        funciones pequeñas ($, esc, toast, badge...)
  04-datos.js             base local (localStorage + IndexedDB), consultas comunes y migraciones
  05-validaciones.js      valores repetidos y coherencia de fechas
  06-buscador.js          campos con búsqueda y filtro
  07-tabla.js             listado genérico con buscador
  08-formulario.js        crear, editar y eliminar registros
  09-exportacion.js       Excel y PDF
  10-sesion.js            sesión abierta, perfil, respaldo, menú, bloqueo por inactividad
  logo-pdf.js             logo embebido para el PDF
js/paginas/             una página por cada opción del menú principal
  inicio.js  carreras.js  estudiantes.js  tutores.js (Docentes y tutores)  instituciones.js
  convenios.js  pasantias.js  seguimientos.js  documentos.js  reportes.js  usuarios.js
js/login.js             lógica de index.html: cuentas demo, ingreso y «¿Olvidaste tu contraseña?»
js/main.js              arranque de las páginas internas (se ejecuta al final)
```
Cada archivo de `js/paginas/` contiene todo lo de su opción del menú: datos de ejemplo (`SEED`), campos y columnas (`configs`), valores únicos (`UNIQUE`) y sus reglas propias (`PAGE_HOOKS`): `duplicados`, `fechas`, `antesDeGuardar`, `despuesDeGuardar`, `bloqueoEliminar`, `avisoEliminar`, `alEliminar`, `puedeEditar`, `migrar`, etc. El orden de los `<script>` en cada `.html` importa: primero el núcleo, luego las páginas y al final `main.js`. Todas las páginas internas cargan los datos y reglas de todas las opciones (se relacionan entre sí: pasantes con cuentas, pasantías con seguimiento, etc.), pero solo dibujan la suya. La sesión, el bloqueo por inactividad y la confirmación de contraseña de «Usuarios» se conservan al cambiar de página (`sessionStorage`).

**Para agregar una opción nueva al menú:** crear `js/paginas/<nombre>.js` con su `configs`, `SEED` y `UNIQUE` (o `PAGE_RENDER` si tiene pantalla propia), sumarla a `PAGES`, `PERMS` y `NAV` en `01-config.js`, copiar cualquiera de los `.html` internos como `<nombre>.html` cambiando `data-page` y el `<title>`, y agregar `<script src="js/paginas/<nombre>.js">` en **todos** los `.html` (incluido `index.html`).

## Acceso de demostración
En la pantalla de ingreso hay botones con las cuentas de demostración (clic para completar solo el usuario; la contraseña se escribe a mano):

| Rol | Usuario | Contraseña |
|---|---|---|
| Administrador | `admin` | `admin123` |
| Coordinador | `coordinador` | `coord123` |
| Docente (tutor académico) | `rosa.gimenez` | `docente123` |
| Tutor externo | `laura.martinez` | `tutor123` |
| Pasante | `maria.lopez`, `juan.benitez`, `ana.duarte` | `estudiante123` |

## Usuarios
El menú **Usuarios** (solo Administrador) permite crear, editar, activar/inactivar y eliminar cuentas, y restablecer contraseñas. Las cuentas de Docente y Tutor externo se vinculan a su registro desde el menú Docentes y tutores (campo «Registro vinculado», solo Administrador), y las de Pasante se crean desde el formulario de Pasantes; con ese vínculo solo ve las pasantías, seguimientos y documentos propios. La tabla «Permisos por rol» de esa pantalla resume qué puede hacer cada rol. En el formulario de Pasantes, el Administrador puede completar «Contraseña de acceso» para crear (o actualizar) la cuenta del pasante: su usuario es la parte del correo antes de @, y la cuenta sigue el estado Activo/Inactivo del pasante. Cada usuario puede cambiar su contraseña desde su perfil (clic en su nombre, arriba a la derecha). En el login, «¿Olvidaste tu contraseña?» registra una solicitud que el administrador ve en la parte superior de «Usuarios»; tras verificar la identidad de la persona, le asigna una contraseña temporal. Antes de eliminar cualquier registro, el sistema muestra todos sus datos y lo que se eliminará junto con él, y pide la contraseña para confirmar. El sistema impide eliminar la propia cuenta o dejar al sistema sin administrador activo.

## Módulos
- Panel principal con indicadores de solicitudes, horas y documentos.
- Carreras, con opción de activar e inactivar.
- Pasantes, con datos personales y académicos, filial (Concepción, Horqueta o Yby Yaú) y búsqueda.
- Docentes y tutores, con rol «Docente» (tutor académico) o «Tutor externo».
- Instituciones receptoras.
- Convenios con fechas de vigencia y aviso visual de convenios que vencen en los próximos 60 días.
- Solicitudes y pasantías con fechas, carga horaria, tutores, plan de actividades y estados de trámite.
- Seguimiento y horas: registros de avance, de 0,5 a 6 horas por registro, **máximo 6 horas por día por pasante y solo de lunes a viernes** (`HORAS_MAX_DIA` y `DIAS_HABILES` en `01-config.js`), validación de estado de ejecución y control frente a las horas planificadas.
- Documentación, con estado de entrega y observaciones.
- Reportes y exportación CSV.
- Respaldo y restauración de los datos mediante archivo JSON.

## Campos con búsqueda
En los formularios, los campos que apuntan a otro registro (Pasante, Institución receptora, Pasantía, Carrera y Registro vinculado) son un cuadro de texto que filtra la lista mientras se escribe, en lugar de un desplegable largo. Ignora mayúsculas y tildes, admite varias palabras y busca también por cédula (estudiantes: además matrícula y correo; pasantías: además institución). Se navega con ↑ ↓, se elige con Enter o clic y Esc cierra la lista. Si el texto escrito no coincide con ningún registro, se limpia al salir del campo y el formulario pide seleccionar uno. La lista muestra hasta 50 resultados (`COMBO_MAX` en `js/nucleo/06-buscador.js`). Las listas fijas (estados, tipos, roles, etc.) siguen siendo desplegables.

## Coherencia de fechas
Las fechas relacionadas se controlan en ambos sentidos, tanto en el calendario como al guardar:
- **Pasantías y Convenios:** la fecha de finalización/vencimiento no permite elegir días anteriores al inicio, y la de inicio no permite elegir días posteriores a la finalización. Si se escribe una fecha fuera de rango, ambos campos se marcan en rojo con el motivo.
- **Seguimiento y horas:** la fecha del registro debe estar dentro del período de la pasantía elegida (desde su inicio hasta su finalización prevista).
- **Edición de una pasantía:** no se pueden mover sus fechas de modo que dejen fuera registros de seguimiento ya cargados.
Las reglas se declaran en la propiedad `fechas` del `PAGE_HOOKS` de cada página (`convenios.js`, `pasantias.js`, `seguimientos.js`) y las aplica `js/nucleo/05-validaciones.js`; para sumar otro par de fechas basta agregar `fechas:{par:[inicio,fin]}` a la página.

## Validación de valores repetidos
Al guardar (y al salir de cada campo) se rechazan valores duplicados, sin distinguir mayúsculas, tildes, espacios, puntos ni guiones:
- Carreras: nombre y código.
- Pasantes: cédula, correo, teléfono y N.º de matrícula.
- Instituciones: RUC, nombre, correo y teléfono.
- Docentes y tutores: cédula, correo y teléfono.
- Convenios: número de convenio.
- Pasantías: código, y un mismo pasante no puede tener dos pasantías abiertas a la vez.
- Seguimiento: no se admite un registro idéntico (misma pasantía, fecha, tipo, horas y actividad).
- Documentación: mismo nombre de archivo dentro de una pasantía y un solo documento por tipo (solicitud, carta de aceptación, convenio, plan, evaluación, informe final, certificado).

## Ejecutar
1. Instalar Node.js 16 o superior (https://nodejs.org, versión LTS), una sola vez.
2. Hacer doble clic en `iniciar.bat` (o ejecutar `node server.js` en esta carpeta). La ventana debe quedar abierta.
3. Abrir `http://localhost:3000` en Chrome o Edge.
4. En la pantalla de ingreso pulsar **Cargar la base de datos** (botón de base de datos, abajo a la derecha): sin eso el formulario permanece bloqueado. Hay que hacerlo en cada ingreso.

Los usuarios y contraseñas registrados están en `USUARIOS_Y_PASOS_PARA_ABRIR_SIGEPAS.txt`.
`index.html` también puede abrirse suelto, pero así no funcionan los respaldos en el servidor.

## Exportar e imprimir listados
Todas las opciones con tabla (Carreras, Pasantes, Docentes y tutores, Instituciones receptoras, Convenios, Pasantías y solicitudes, Seguimiento y horas, Documentación) tienen tres botones junto al buscador:
- **Excel**: descarga un `.xlsx` con todos los campos del registro (hoja 1) y los datos del listado: fecha, usuario y filtros aplicados (hoja 2).
- **PDF**: descarga el listado con el encabezado institucional (logos UNC y FCEA) y número de página.
- **Imprimir**: abre el mismo PDF en otra pestaña y lanza el cuadro de impresión (hay que permitir ventanas emergentes).

Se exporta lo que se ve en pantalla: respeta la búsqueda, los filtros y los permisos del rol (por ejemplo, un pasante solo exporta sus propios registros). El código está en `js/nucleo/09-exportacion.js` (sección «Exportación de listados») y los botones en `js/nucleo/07-tabla.js`. Reportes mantiene su propia exportación.

## Consideraciones importantes
Este es un prototipo académico local, no un sistema de producción. El acceso de demostración usa una contraseña fija en el código y no constituye autenticación segura. Las contraseñas se guardan con hash y sal, pero la verificación de permisos se hace en el navegador, por lo que no reemplaza un control de acceso en servidor. Los datos permanecen en el navegador y no se sincronizan entre equipos. Los adjuntos documentales se registran como nombre/referencia; la carga y almacenamiento real de archivos, las notificaciones externas, la auditoría completa y la autorización granular por usuario requieren implementación adicional antes de un uso institucional. El cierre definitivo debe revisarse manualmente por el responsable académico; alcanzar las horas planificadas no finaliza automáticamente la pasantía.


## Seguridad de acceso
- **Niveles al abrir una sección:** cada vez que se abre una página se valida la sesión y el permiso del rol (si no tiene permiso se muestra un aviso y vuelve al Panel principal). La sección **Usuarios** es de nivel alto: pide confirmar la contraseña al abrirla (la confirmación vale 10 minutos; se indica con el icono de escudo en el menú). Tras 5 intentos fallidos se cierra la sesión.
- **Bloqueo por inactividad:** al minuto sin interacción (mouse, teclado, scroll o toque) la pantalla se bloquea y pide la contraseña de la persona que tiene la sesión abierta; 10 segundos antes aparece un aviso con el botón «Seguir trabajando». El bloqueo se superpone sin tocar lo que hay debajo: al desbloquear se continúa exactamente donde se estaba (formulario abierto con lo escrito, filtros, sección). Mientras está bloqueada, el contenido no es accesible con el mouse ni con el teclado. Recargar la página no evita el bloqueo (vuelve a la misma sección, bloqueada). Desde la pantalla de bloqueo también se puede «Cerrar sesión», y tras 5 contraseñas incorrectas la sesión se cierra. Los tiempos se ajustan en las constantes `IDLE_LOGOUT_MS`, `WARN_MS` y `REAUTH_MS` de `js/nucleo/01-config.js`.
- **Horas de la pasantía:** cada pasante realiza exactamente **192 horas** (constante `HORAS_PASANTIA` en `js/nucleo/01-config.js`). Las horas planificadas son fijas (192, no editables), las realizadas no pueden superar 192 y una pasantía solo puede pasar a «Finalizada» con las 192 horas completas.
- **Impresión y exportación:** el reporte impreso, el PDF y la planilla de Excel llevan el logo de la FCEA (en Excel solo el texto), la facultad, la universidad y el usuario que lo generó. Los textos se definen en `FACULTAD` y `UNIVERSIDAD` al inicio de `app.js`.
- Es un prototipo local: estas protecciones se ejecutan en el navegador y no reemplazan la seguridad de un servidor.

## Contraseñas
- Toda contraseña nueva (alta o edición de usuarios, cuenta de pasante creada desde Pasantes y cambio desde «Mi perfil») debe tener **mínimo 8 caracteres, con mayúsculas, minúsculas, números y símbolos**, y se pide **confirmarla**. El formulario avisa en vivo qué falta y si las dos contraseñas coinciden.
- La regla está en `passwordMissing()` / `passwordCheck()` de `js/nucleo/02-seguridad.js`. Las cuentas de demostración y las contraseñas ya guardadas no se modifican: la regla se aplica al establecer una contraseña nueva.


## Filtros de Reportes
«Reportes» permite filtrar por **Pasante** (con búsqueda), **Filial**, **Empresa / institución** (con búsqueda) y **Carrera**, combinables entre sí. Los indicadores, los gráficos de barras y el detalle (ahora con columna Filial) se recalculan, y Excel, PDF e impresión incluyen solo los datos filtrados y indican los filtros aplicados. Con filtros activos solo se muestra lo pedido: se listan únicamente las categorías con datos y se omiten los bloques que el propio filtro ya fija (por ejemplo, al filtrar una carrera no aparece «Pasantías por carrera»; al filtrar un pasante tampoco aparecen carrera ni filial). El PDF lleva letra grande, un recuadro con los filtros aplicados y una tabla de detalle sin cortes de palabras; la impresión sale en horizontal. «Limpiar filtros» vuelve a los datos generales.

## Exportar e imprimir
Tanto «Reportes» como «Pasantías y solicitudes» permiten exportar a Excel, exportar a PDF e imprimir. En «Pasantías y solicitudes» se exporta la lista tal como está filtrada en pantalla (estado y búsqueda) y solo incluye las pasantías que el rol del usuario puede ver.

## Campos con sugerencias y «Otros»
En **Instituciones receptoras**, *Área o rubro*, *Ciudad* y *Cargo del contacto* son listas con buscador (se filtran al escribir, ignorando tildes y mayúsculas) que terminan con la opción **Otros**: al elegirla aparece un cuadro para escribir la opción, y lo escrito es lo que se guarda. Para usarlo en otro campo basta declararlo en `configs` como `{key:'...',label:'...',type:'suggest',options:[...]}` (ver `RUBROS`, `CIUDADES` y `CARGOS` en `js/paginas/instituciones.js`). La lógica está en `suggestHTML()` de `js/nucleo/06-buscador.js`.

En **Pasantías y solicitudes**: *Período académico* y *Horario* usan el mismo campo con sugerencias y «Otros» (los períodos se generan según el año: anterior, actual y siguiente, semestres 1 y 2). *Tutor académico* es una **lista cerrada** (`sinOtros:true`) con los Docentes activos de «Docentes y tutores»: no se puede asignar un docente que no esté registrado. *Tutor externo* sigue siendo texto libre.

## Respaldo de la base de datos (servidor + nube)
Para que funcione el respaldo automático hay que abrir el sistema con el servidor incluido (en vez de abrir `index.html` suelto):

1. Instalar Node.js (versión 16 o superior).
2. Doble clic en `iniciar.bat` (o `node server.js` en una terminal dentro de esta carpeta).
3. Abrir `http://localhost:3000` e ingresar como Administrador o Coordinador.

| Tipo | Cómo funciona |
|---|---|
| **Manual** | Botón **Respaldo** (descarga `respaldo_sigepas.json`) y, en **Respaldos → Respaldar ahora**, guarda uno en el servidor y en la nube. El Administrador puede **Restaurar** desde un archivo o desde la lista de respaldos del servidor. |
| **Automático en el mismo servidor** | Cada 120 s (configurable) el sistema envía la base al servidor, que la guarda en la carpeta `respaldos/` (se conservan los últimos 50). |
| **Automático en la nube (Google Drive)** | Cada 120 s se sube también a la carpeta `SIGEPAS_Respaldos` de Google Drive (se conservan los últimos 30). |

El intervalo se cambia con `BACKUP_INTERVAL_SEC` (por defecto 120 = 2 minutos, el tiempo pedido para la demostración).

**Frecuencia desde el sistema:** el Administrador puede cambiarla en **Respaldos → Frecuencia del respaldo automático** (segundos, minutos, horas o días; mínimo 10 s, máximo 7 días) y volver al valor por defecto. Se guarda en la base de datos (`db.config.respaldoSeg`); si no se define, rige `BACKUP_INTERVAL_SEC`. El Coordinador solo ve la frecuencia vigente.

### Conectar Google Drive (una sola vez)
1. En https://console.cloud.google.com crear un proyecto y activar **Google Drive API**.
2. *Credenciales → Crear credenciales → ID de cliente de OAuth → Aplicación web*. En **Orígenes de JavaScript autorizados** agregar `http://localhost:3000`.
3. En *Pantalla de consentimiento* agregar su cuenta de Google como **usuario de prueba**.
4. Iniciar el servidor con el ID de cliente: `set GOOGLE_CLIENT_ID=XXXX.apps.googleusercontent.com` y luego `node server.js`.
5. En el sistema: **Respaldos → Conectar Google Drive** y aceptar el permiso. Desde ahí los respaldos automáticos también suben a Drive mientras la sesión esté abierta (si el permiso vence a la hora, pulsar **Reconectar**).

**Alternativa sin configurar la API:** instalar «Google Drive para escritorio» e iniciar con `set CLOUD_DIR=C:\Users\USUARIO\Google Drive\SIGEPAS`. El servidor copia cada respaldo a esa carpeta y Drive la sube a la nube.


## Límite de horas diarias
- Cada registro de horas va de 0,5 a **6 h** y la suma de un pasante en un mismo día no puede pasar de 6 h (se suman todos sus registros de ese día).
- Las horas solo pueden registrarse de **lunes a viernes**; sábados y domingos se rechazan.
- El **Horario** de una pasantía no puede durar más de 6 h por día (se validan textos tipo «08:00 a 14:00»).
- Los registros ya guardados no se modifican; las reglas se aplican al crear o editar.
