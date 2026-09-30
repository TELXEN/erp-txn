import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Encabezado } from "@/components/AppShell";
import { Preliquidaciones, type Preliquidacion } from "@/components/Preliquidaciones";
import { SinAcceso } from "@/components/ui-kit";
import { puedeVerDinero, useAuth } from "@/lib/auth";
import { ofertaProyecto, usePartidas, useProyectos, useTiposPresupuesto, useVentas } from "@/lib/datos";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/valorizaciones")({
  head:()=>({meta:[{title:"Preliquidaciones — ERP TELXEN"},{name:"description",content:"Preliquidaciones de obra, aprobación y preparación para la facturación electrónica."},{property:"og:title",content:"Preliquidaciones — ERP TELXEN"},{property:"og:description",content:"Control comercial previo a la emisión de comprobantes."},{property:"og:type",content:"website"},{name:"twitter:card",content:"summary"}]}), component:PreliquidacionesPage,
});
function PreliquidacionesPage(){
 const {rol}=useAuth(); const navigate=useNavigate(); const {data:proyectos=[]}=useProyectos(); const {data:partidas=[]}=usePartidas(); const {data:tipos=[]}=useTiposPresupuesto(); const {data:ventas=[]}=useVentas();
 const {data:clientes=[]}=useQuery({queryKey:["terceros","clientes-activos"],queryFn:async()=>{const {data,error}=await supabase.from("terceros").select("id, razon_social, numero_documento, direccion").eq("es_cliente",true).eq("activo",true).order("razon_social");if(error)throw error;return data??[]}});
 if(!puedeVerDinero(rol))return <SinAcceso/>;
 const ofertado=(id:string)=>{const p=proyectos.find(x=>x.id===id);return p?ofertaProyecto(partidas.filter(x=>x.proyecto_id===id),tipos,Number(p.pct_gastos_generales),Number(p.pct_utilidad)).ofertado:0};
 const facturado=(id:string)=>ventas.filter(v=>v.proyecto_id===id).reduce((s,v)=>s+Number(v.monto_soles),0);
 const facturar=(pl:Preliquidacion)=>navigate({to:"/facturacion-electronica",search:{preliquidacion:pl.id}});
 return <><Encabezado titulo="Preliquidaciones" subtitulo="Comercial · valorización, aprobación y preparación del comprobante"/><Preliquidaciones proyectos={proyectos} clientes={clientes} ofertadoDe={ofertado} facturadoDe={facturado} onFacturar={facturar}/></>;
}
