import{s as ea,a as ta,b as la,c as na,d as oa}from"./index-BrIECQzA.js";import{a as sa,b as ra,c as ia}from"./index-8B6jVA3a.js";import{b as da,s as ca}from"./index-B-mgjAW1.js";import{_ as ua,u as pa,q as va,F as ma,G as fa,p as s,v as ba,C as Ea,c as ga,h as t,w as i,A as Ca,o as _a,a as n,t as xa,D as C,H as Na}from"./index-pguNv6pf.js";const Sa={class:"card"},Va={class:"ml-2"},wa={class:"ml-2"},ya={class:"ml-2"},Ba={class:"ml-2"},La={class:"ml-2"},Ta={class:"flex flex-wrap gap-2 items-center justify-between"},ha={class:"p-4"},ka={class:"field"},Ra={class:"field"},Ia={class:"field"},Da={class:"field"},Ua={__name:"ControlCestas",setup(Pa){const{showAlert:c,closeAlert:S}=pa();Ca();const D=va();ma();const U=fa(()=>{var e;return((e=D.user)==null?void 0:e.Username)||"Invitado"}),P=s([]),V=s([]),v=s([]),A=s([]),m=s(""),f=s(""),w=s(new Date),y=s(new Date),b=s(!1),E=s(!1),p=s(null),_=s(null),B=s(0),L=s(0),T=s(0),h=s(0),k=s(!1),H=()=>{const e=localStorage.getItem("rutas");e?V.value=JSON.parse(e):V.value=[]},R=async(e,a,r="")=>{try{const d=await C.post("https://calidad-yesentregas-api.yes.com.sv/control-cestas/",{kunnr:e,vbeln:r,tipo_mov:a,start_date:w.value.toISOString().split("T")[0],end_date:y.value.toISOString().split("T")[0]});return console.log("Response data:",d.data),d.data.filter(o=>o.kunnr===e&&o.tipo_mov===a)}catch(d){return console.error("Error al obtener el inventario:",d),c({title:"Error",text:"Hubo un problema al obtener el inventario.",icon:"error",confirmButtonText:"Entendido"}),[]}},I=e=>{const a={cantidad:0,cantidad_palets:0};return e.forEach(r=>{a.cantidad+=r.cantidad,a.cantidad_palets+=r.cantidad_palets}),a},O=async()=>{try{if(!f.value){c({title:"Ruta no seleccionada",text:"Por favor, selecciona una ruta.",icon:"warning",confirmButtonText:"Entendido"});return}k.value=!0,c({title:"Cargando",text:"Cargando los clientes...",icon:"info",showConfirmButton:!1});const e=await C.post("https://calidad-yesentregas-api.yes.com.sv/clientes/",{sortl:f.value});if(e.data&&e.data.length>0){v.value=e.data;for(const a of v.value){const r=await C.post("https://calidad-yesentregas-api.yes.com.sv/entregas/",{bzirk:f.value});if(r.data){const d=[...new Set(r.data.filter(o=>o.KUNAG===a.KUNNR).map(o=>o.VBELN))];a.VBELN=d.map(o=>({VBELN:o}))}else a.VBELN=[]}x(),S(),c({title:"Éxito",text:"Los clientes han sido cargados correctamente.",icon:"success",confirmButtonText:"Entendido"})}else S(),c({title:"Sin clientes",text:"No se encontraron clientes para la ruta seleccionada.",icon:"info",confirmButtonText:"Entendido"})}catch(e){console.error("Error al cargar los clientes:",e),S(),c({title:"Error",text:"Hubo un problema al cargar los clientes.",icon:"error",confirmButtonText:"Entendido"})}finally{k.value=!1}},j=async()=>{try{for(const e of v.value){const a=await R(e.KUNNR,"E"),r=I(a);e.cantidad_entradas=r.cantidad,e.cantidad_palets_entradas=r.cantidad_palets}x()}catch(e){console.error("Error al cargar el inventario de entradas:",e),c({title:"Error",text:"Hubo un problema al cargar el inventario de entradas.",icon:"error",confirmButtonText:"Entendido"})}},G=async()=>{try{for(const e of v.value){const a=await R(e.KUNNR,"S"),r=I(a);e.cantidad_salidas=r.cantidad,e.cantidad_palets_salidas=r.cantidad_palets;for(const d of e.VBELN){const o=await R(e.KUNNR,"S",d.VBELN),N=I(o);d.cantidad_salidas=N.cantidad,d.cantidad_palets_salidas=N.cantidad_palets}}x()}catch(e){console.error("Error al cargar el inventario de salidas:",e),c({title:"Error",text:"Hubo un problema al cargar el inventario de salidas.",icon:"error",confirmButtonText:"Entendido"})}},x=()=>{A.value=v.value.filter(e=>e.NAME1.toLowerCase().includes(m.value.toLowerCase())||e.NAME2.toLowerCase().includes(m.value.toLowerCase()))};ba([m],x);const F=s(),J=s({global:{value:null,matchMode:Na.CONTAINS}}),q=()=>{F.value.exportCSV()},z=e=>{p.value=e,_.value="",b.value=!0},Q=(e,a)=>{p.value=e,_.value=a,E.value=!0},W=async()=>{try{if(!p.value)throw new Error("Cliente no seleccionado");const e={kunnr:p.value.KUNNR,vbeln:"",tipo_mov:"E",cantidad:B.value,fecha:new Date().toISOString().split("T")[0],usuario:U.value,cantidad_palets:L.value};await C.post("https://calidad-yesentregas-api.yes.com.sv/control-cestas/insert/",e,{headers:{"Content-Type":"application/json"}}),c({title:"Entrada insertada",text:"La entrada ha sido insertada correctamente.",icon:"success",confirmButtonText:"Entendido"}),b.value=!1}catch(e){console.error("Error al insertar la entrada:",e),c({title:"Error",text:"Hubo un problema al insertar la entrada.",icon:"error",confirmButtonText:"Entendido"})}},X=async()=>{try{if(!p.value||!_.value)throw new Error("Cliente o VBELN no seleccionado");const e={kunnr:p.value.KUNNR,vbeln:_.value,tipo_mov:"S",cantidad:T.value,fecha:new Date().toISOString().split("T")[0],usuario:U.value,cantidad_palets:h.value};await C.post("https://calidad-yesentregas-api.yes.com.sv/control-cestas/insert/",e,{headers:{"Content-Type":"application/json"}}),c({title:"Salida insertada",text:"La salida ha sido insertada correctamente.",icon:"success",confirmButtonText:"Entendido"}),E.value=!1}catch(e){console.error("Error al insertar la salida:",e),c({title:"Error",text:"Hubo un problema al insertar la salida.",icon:"error",confirmButtonText:"Entendido"})}},K=()=>{b.value=!1,E.value=!1};return Ea(()=>{D.loadSession(),H()}),(e,a)=>{const r=sa,d=na,o=da,N=ea,Y=ra,g=ca,Z=ia,u=oa,M=ta,$=la;return _a(),ga("div",Sa,[t(N,{class:"mb-6"},{start:i(()=>[n("div",null,[a[12]||(a[12]=n("label",{for:"startDate"},"Seleccione una Ruta",-1)),t(r,{modelValue:f.value,"onUpdate:modelValue":a[0]||(a[0]=l=>f.value=l),options:V.value,placeholder:"Rutas",onChange:O,disabled:k.value},null,8,["modelValue","options","disabled"])]),n("div",Va,[a[13]||(a[13]=n("label",{for:"startDate"},"Fecha de Inicio",-1)),t(d,{id:"startDate",modelValue:w.value,"onUpdate:modelValue":a[1]||(a[1]=l=>w.value=l),dateFormat:"yy-mm-dd"},null,8,["modelValue"])]),n("div",wa,[a[14]||(a[14]=n("label",{for:"endDate"},"Fecha de Fin",-1)),t(d,{id:"endDate",modelValue:y.value,"onUpdate:modelValue":a[2]||(a[2]=l=>y.value=l),dateFormat:"yy-mm-dd"},null,8,["modelValue"])]),n("div",ya,[t(o,{label:"Cargar Entradas",onClick:j})]),n("div",Ba,[t(o,{label:"Cargar Salidas",onClick:G})]),n("div",La,[t(o,{label:"Exportar en excel",icon:"pi pi-upload",severity:"secondary",onClick:a[3]||(a[3]=l=>q(l))})])]),end:i(()=>a[15]||(a[15]=[])),_:1}),t(M,{ref_key:"dt",ref:F,expandedRows:P.value,"onUpdate:expandedRows":a[5]||(a[5]=l=>P.value=l),value:A.value,dataKey:"KUNNR",paginator:!0,rows:10,filters:J.value,paginatorTemplate:"FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown",rowsPerPageOptions:[5,10,25],currentPageReportTemplate:"Mostrando del {first} al {last} de {totalRecords} clientes"},{header:i(()=>[n("div",Ta,[a[17]||(a[17]=n("h4",{class:"m-0"},"Lista de Clientes",-1)),t(Z,null,{default:i(()=>[t(Y,null,{default:i(()=>a[16]||(a[16]=[n("i",{class:"pi pi-search"},null,-1)])),_:1}),t(g,{modelValue:m.value,"onUpdate:modelValue":a[4]||(a[4]=l=>m.value=l),placeholder:"Buscar por nombre..."},null,8,["modelValue"])]),_:1})])]),expansion:i(l=>[n("div",ha,[n("h5",null,"Facturas del cliente: "+xa(l.data.NAME1),1),t(M,{value:l.data.VBELN},{default:i(()=>[t(u,{field:"VBELN",header:"VBELN",sortable:""}),t(u,{field:"cantidad_salidas",header:"Salidas de jabas",sortable:""}),t(u,{field:"cantidad_palets_salidas",header:"Salidas de palets",sortable:""}),t(u,{header:"Acciones"},{body:i(aa=>[t(o,{label:"Insertar Salida",onClick:()=>Q(l.data,aa.data.VBELN)},null,8,["onClick"])]),_:2},1024)]),_:2},1032,["value"])])]),default:i(()=>[t(u,{expander:"",style:{width:"3rem"}}),t(u,{field:"KUNNR",header:"Kunnr",sortable:""}),t(u,{field:"NAME1",header:"Razon social",sortable:""}),t(u,{field:"NAME2",header:"Nombre",sortable:""}),t(u,{field:"STRAS",header:"Dirección",sortable:""}),t(u,{field:"cantidad_entradas",header:"# de jabas (Entradas)",sortable:""}),t(u,{field:"cantidad_palets_entradas",header:"# de palets (Entradas)",sortable:""}),t(u,{header:"Acciones"},{body:i(l=>[t(o,{label:"Insertar Entrada",onClick:()=>z(l.data)},null,8,["onClick"])]),_:1})]),_:1},8,["expandedRows","value","filters"]),t($,{visible:b.value,"onUpdate:visible":a[8]||(a[8]=l=>b.value=l),header:"Insertar Entrada",modal:!0,class:"p-fluid",closable:!1},{footer:i(()=>[t(o,{label:"Cancelar",icon:"pi pi-times",class:"p-button-text",onClick:K}),t(o,{label:"Insertar",icon:"pi pi-check",class:"p-button-text",onClick:W})]),default:i(()=>[n("div",ka,[a[18]||(a[18]=n("label",{for:"cantidad",class:"mr-2"},"Cantidad Jabas",-1)),t(g,{id:"cantidad",modelValue:B.value,"onUpdate:modelValue":a[6]||(a[6]=l=>B.value=l),class:"small-input"},null,8,["modelValue"])]),a[20]||(a[20]=n("br",null,null,-1)),n("div",Ra,[a[19]||(a[19]=n("label",{for:"cantidad-palets",class:"mr-1"},"Cantidad Palets",-1)),t(g,{id:"cantidad-palets",modelValue:L.value,"onUpdate:modelValue":a[7]||(a[7]=l=>L.value=l),class:"small-input"},null,8,["modelValue"])])]),_:1},8,["visible"]),t($,{visible:E.value,"onUpdate:visible":a[11]||(a[11]=l=>E.value=l),header:"Insertar Salida",modal:!0,class:"p-fluid",closable:!1},{footer:i(()=>[t(o,{label:"Cancelar",icon:"pi pi-times",class:"p-button-text",onClick:K}),t(o,{label:"Insertar",icon:"pi pi-check",class:"p-button-text",onClick:X})]),default:i(()=>[n("div",Ia,[a[21]||(a[21]=n("label",{for:"cantidad-salida",class:"mr-2"},"Cantidad Jabas",-1)),t(g,{id:"cantidad-salida",modelValue:T.value,"onUpdate:modelValue":a[9]||(a[9]=l=>T.value=l),class:"small-input"},null,8,["modelValue"])]),a[23]||(a[23]=n("br",null,null,-1)),n("div",Da,[a[22]||(a[22]=n("label",{for:"cantidad-palets-salida",class:"mr-1"},"Cantidad Palets",-1)),t(g,{id:"cantidad-palets-salida",modelValue:h.value,"onUpdate:modelValue":a[10]||(a[10]=l=>h.value=l),class:"small-input"},null,8,["modelValue"])])]),_:1},8,["visible"])])}}},$a=ua(Ua,[["__scopeId","data-v-2d487738"]]);export{$a as default};
