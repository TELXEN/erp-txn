export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      afp_comisiones_mensuales: {
        Row: {
          afp: string
          aporte_fondo: number
          comision_flujo: number
          consultado_en: string
          id: string
          origen: string
          periodo: string
          prima_seguro: number
          tope_remuneracion: number
        }
        Insert: {
          afp: string
          aporte_fondo: number
          comision_flujo: number
          consultado_en?: string
          id?: string
          origen?: string
          periodo: string
          prima_seguro: number
          tope_remuneracion?: number
        }
        Update: {
          afp?: string
          aporte_fondo?: number
          comision_flujo?: number
          consultado_en?: string
          id?: string
          origen?: string
          periodo?: string
          prima_seguro?: number
          tope_remuneracion?: number
        }
        Relationships: []
      }
      almacen_encargados: {
        Row: {
          almacen_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          almacen_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          almacen_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "almacen_encargados_almacen_id_fkey"
            columns: ["almacen_id"]
            isOneToOne: false
            referencedRelation: "almacenes"
            referencedColumns: ["id"]
          },
        ]
      }
      almacenes: {
        Row: {
          activo: boolean
          created_at: string
          direccion: string
          id: string
          nombre: string
          proyecto_id: string | null
          responsable: string
          tipo: string
        }
        Insert: {
          activo?: boolean
          created_at?: string
          direccion?: string
          id?: string
          nombre: string
          proyecto_id?: string | null
          responsable?: string
          tipo?: string
        }
        Update: {
          activo?: boolean
          created_at?: string
          direccion?: string
          id?: string
          nombre?: string
          proyecto_id?: string | null
          responsable?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "almacenes_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: true
            referencedRelation: "proyectos"
            referencedColumns: ["id"]
          },
        ]
      }
      apu_componentes: {
        Row: {
          cantidad: number
          cotizacion_item_id: string | null
          created_at: string
          cuadrilla: number
          id: string
          insumo_id: string
          partida_id: string | null
          partida_maestra_id: string | null
          updated_at: string
        }
        Insert: {
          cantidad?: number
          cotizacion_item_id?: string | null
          created_at?: string
          cuadrilla?: number
          id?: string
          insumo_id: string
          partida_id?: string | null
          partida_maestra_id?: string | null
          updated_at?: string
        }
        Update: {
          cantidad?: number
          cotizacion_item_id?: string | null
          created_at?: string
          cuadrilla?: number
          id?: string
          insumo_id?: string
          partida_id?: string | null
          partida_maestra_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "apu_componentes_cotizacion_item_id_fkey"
            columns: ["cotizacion_item_id"]
            isOneToOne: false
            referencedRelation: "cotizacion_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "apu_componentes_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "epp_catalogo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "apu_componentes_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "equipos_herramientas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "apu_componentes_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "insumos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "apu_componentes_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "mano_obra"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "apu_componentes_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "materiales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "apu_componentes_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "subcontratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "apu_componentes_partida_id_fkey"
            columns: ["partida_id"]
            isOneToOne: false
            referencedRelation: "partidas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "apu_componentes_partida_maestra_id_fkey"
            columns: ["partida_maestra_id"]
            isOneToOne: false
            referencedRelation: "partidas_maestras"
            referencedColumns: ["id"]
          },
        ]
      }
      banco_saldos: {
        Row: {
          banco_id: string
          egresos: number
          ingresos: number
          saldo: number
        }
        Insert: {
          banco_id: string
          egresos?: number
          ingresos?: number
          saldo?: number
        }
        Update: {
          banco_id?: string
          egresos?: number
          ingresos?: number
          saldo?: number
        }
        Relationships: [
          {
            foreignKeyName: "banco_saldos_banco_id_fkey"
            columns: ["banco_id"]
            isOneToOne: true
            referencedRelation: "bancos"
            referencedColumns: ["id"]
          },
        ]
      }
      bancos: {
        Row: {
          activo: boolean
          cci: string
          created_at: string
          fecha_saldo_inicial: string
          id: string
          monedas: string
          nombre: string
          numero_cuenta: string
          saldo_inicial: number
          tipo_cuenta: string
          updated_at: string
        }
        Insert: {
          activo?: boolean
          cci?: string
          created_at?: string
          fecha_saldo_inicial?: string
          id?: string
          monedas?: string
          nombre: string
          numero_cuenta?: string
          saldo_inicial?: number
          tipo_cuenta?: string
          updated_at?: string
        }
        Update: {
          activo?: boolean
          cci?: string
          created_at?: string
          fecha_saldo_inicial?: string
          id?: string
          monedas?: string
          nombre?: string
          numero_cuenta?: string
          saldo_inicial?: number
          tipo_cuenta?: string
          updated_at?: string
        }
        Relationships: []
      }
      beneficios_sociales: {
        Row: {
          anio: number
          banco_id: string | null
          bonificacion: number
          created_at: string
          detalle: Json
          dias: number
          estado_pago: string
          fecha_desde: string
          fecha_hasta: string
          fecha_pago: string | null
          id: string
          meses: number
          monto: number
          numero_operacion: string
          periodo: string
          regularizacion: boolean
          remuneracion_computable: number
          tipo: string
          total: number
          trabajador_id: string
          updated_at: string
        }
        Insert: {
          anio: number
          banco_id?: string | null
          bonificacion?: number
          created_at?: string
          detalle?: Json
          dias?: number
          estado_pago?: string
          fecha_desde: string
          fecha_hasta: string
          fecha_pago?: string | null
          id?: string
          meses?: number
          monto?: number
          numero_operacion?: string
          periodo: string
          regularizacion?: boolean
          remuneracion_computable?: number
          tipo: string
          total?: number
          trabajador_id: string
          updated_at?: string
        }
        Update: {
          anio?: number
          banco_id?: string | null
          bonificacion?: number
          created_at?: string
          detalle?: Json
          dias?: number
          estado_pago?: string
          fecha_desde?: string
          fecha_hasta?: string
          fecha_pago?: string | null
          id?: string
          meses?: number
          monto?: number
          numero_operacion?: string
          periodo?: string
          regularizacion?: boolean
          remuneracion_computable?: number
          tipo?: string
          total?: number
          trabajador_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "beneficios_sociales_banco_id_fkey"
            columns: ["banco_id"]
            isOneToOne: false
            referencedRelation: "bancos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beneficios_sociales_trabajador_id_fkey"
            columns: ["trabajador_id"]
            isOneToOne: false
            referencedRelation: "trabajadores"
            referencedColumns: ["id"]
          },
        ]
      }
      boletas: {
        Row: {
          aporte_pension: number
          asignacion_familiar: number
          banco_id: string | null
          created_at: string
          dias_laborados: number
          dias_motivo: string | null
          essalud: number
          estado_pago: string
          fecha_pago: string | null
          horas_extra: number
          id: string
          neto_pagar: number
          numero_operacion: string
          otros_descuentos: number
          otros_ingresos: number
          planilla_id: string
          regimen_laboral: string
          renta_quinta: number
          renta_quinta_manual: boolean
          sistema_pensiones: string
          sueldo_basico: number
          total_descuentos: number
          total_ingresos: number
          trabajador_id: string
          updated_at: string
        }
        Insert: {
          aporte_pension?: number
          asignacion_familiar?: number
          banco_id?: string | null
          created_at?: string
          dias_laborados?: number
          dias_motivo?: string | null
          essalud?: number
          estado_pago?: string
          fecha_pago?: string | null
          horas_extra?: number
          id?: string
          neto_pagar?: number
          numero_operacion?: string
          otros_descuentos?: number
          otros_ingresos?: number
          planilla_id: string
          regimen_laboral?: string
          renta_quinta?: number
          renta_quinta_manual?: boolean
          sistema_pensiones?: string
          sueldo_basico?: number
          total_descuentos?: number
          total_ingresos?: number
          trabajador_id: string
          updated_at?: string
        }
        Update: {
          aporte_pension?: number
          asignacion_familiar?: number
          banco_id?: string | null
          created_at?: string
          dias_laborados?: number
          dias_motivo?: string | null
          essalud?: number
          estado_pago?: string
          fecha_pago?: string | null
          horas_extra?: number
          id?: string
          neto_pagar?: number
          numero_operacion?: string
          otros_descuentos?: number
          otros_ingresos?: number
          planilla_id?: string
          regimen_laboral?: string
          renta_quinta?: number
          renta_quinta_manual?: boolean
          sistema_pensiones?: string
          sueldo_basico?: number
          total_descuentos?: number
          total_ingresos?: number
          trabajador_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "boletas_banco_id_fkey"
            columns: ["banco_id"]
            isOneToOne: false
            referencedRelation: "bancos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "boletas_planilla_id_fkey"
            columns: ["planilla_id"]
            isOneToOne: false
            referencedRelation: "planillas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "boletas_trabajador_id_fkey"
            columns: ["trabajador_id"]
            isOneToOne: false
            referencedRelation: "trabajadores"
            referencedColumns: ["id"]
          },
        ]
      }
      cajas_chicas: {
        Row: {
          banco_id: string | null
          created_at: string
          estado: string
          fecha_entrega: string
          fecha_liquidacion: string | null
          id: string
          monto_entregado: number
          motivo: string
          numero_operacion: string
          observacion: string
          proyecto_id: string
          responsable_id: string
          updated_at: string
        }
        Insert: {
          banco_id?: string | null
          created_at?: string
          estado?: string
          fecha_entrega?: string
          fecha_liquidacion?: string | null
          id?: string
          monto_entregado?: number
          motivo?: string
          numero_operacion?: string
          observacion?: string
          proyecto_id: string
          responsable_id: string
          updated_at?: string
        }
        Update: {
          banco_id?: string | null
          created_at?: string
          estado?: string
          fecha_entrega?: string
          fecha_liquidacion?: string | null
          id?: string
          monto_entregado?: number
          motivo?: string
          numero_operacion?: string
          observacion?: string
          proyecto_id?: string
          responsable_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cajas_chicas_banco_id_fkey"
            columns: ["banco_id"]
            isOneToOne: false
            referencedRelation: "bancos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cajas_chicas_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "proyectos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cajas_chicas_responsable_id_fkey"
            columns: ["responsable_id"]
            isOneToOne: false
            referencedRelation: "trabajadores"
            referencedColumns: ["id"]
          },
        ]
      }
      cargos: {
        Row: {
          activo: boolean
          clasificacion: string
          created_at: string
          id: string
          nombre: string
          orden: number
          updated_at: string
        }
        Insert: {
          activo?: boolean
          clasificacion?: string
          created_at?: string
          id?: string
          nombre: string
          orden?: number
          updated_at?: string
        }
        Update: {
          activo?: boolean
          clasificacion?: string
          created_at?: string
          id?: string
          nombre?: string
          orden?: number
          updated_at?: string
        }
        Relationships: []
      }
      categorias_financieras: {
        Row: {
          activo: boolean
          codigo: string
          created_at: string
          descripcion: string
          id: string
          nombre: string
          tipo: string
          updated_at: string
        }
        Insert: {
          activo?: boolean
          codigo: string
          created_at?: string
          descripcion?: string
          id?: string
          nombre: string
          tipo: string
          updated_at?: string
        }
        Update: {
          activo?: boolean
          codigo?: string
          created_at?: string
          descripcion?: string
          id?: string
          nombre?: string
          tipo?: string
          updated_at?: string
        }
        Relationships: []
      }
      categorias_gasto_general: {
        Row: {
          activo: boolean
          created_at: string
          descripcion: string
          id: string
          nombre: string
          orden: number
          updated_at: string
        }
        Insert: {
          activo?: boolean
          created_at?: string
          descripcion?: string
          id?: string
          nombre: string
          orden?: number
          updated_at?: string
        }
        Update: {
          activo?: boolean
          created_at?: string
          descripcion?: string
          id?: string
          nombre?: string
          orden?: number
          updated_at?: string
        }
        Relationships: []
      }
      categorias_insumo: {
        Row: {
          activo: boolean
          codigo: string
          created_at: string
          descripcion: string | null
          especialidad_id: string
          id: string
          nombre: string
          orden: number
        }
        Insert: {
          activo?: boolean
          codigo?: string
          created_at?: string
          descripcion?: string | null
          especialidad_id: string
          id?: string
          nombre: string
          orden?: number
        }
        Update: {
          activo?: boolean
          codigo?: string
          created_at?: string
          descripcion?: string | null
          especialidad_id?: string
          id?: string
          nombre?: string
          orden?: number
        }
        Relationships: [
          {
            foreignKeyName: "categorias_insumo_especialidad_id_fkey"
            columns: ["especialidad_id"]
            isOneToOne: false
            referencedRelation: "especialidades_partida"
            referencedColumns: ["id"]
          },
        ]
      }
      categorias_partida: {
        Row: {
          activo: boolean
          codigo: string
          created_at: string
          especialidad: string
          grupo: string
          id: string
          nombre: string
          orden: number
          updated_at: string
        }
        Insert: {
          activo?: boolean
          codigo?: string
          created_at?: string
          especialidad?: string
          grupo?: string
          id?: string
          nombre: string
          orden?: number
          updated_at?: string
        }
        Update: {
          activo?: boolean
          codigo?: string
          created_at?: string
          especialidad?: string
          grupo?: string
          id?: string
          nombre?: string
          orden?: number
          updated_at?: string
        }
        Relationships: []
      }
      centros_costos: {
        Row: {
          activo: boolean
          codigo: string
          created_at: string
          descripcion: string
          id: string
          nombre: string
          updated_at: string
        }
        Insert: {
          activo?: boolean
          codigo: string
          created_at?: string
          descripcion?: string
          id?: string
          nombre: string
          updated_at?: string
        }
        Update: {
          activo?: boolean
          codigo?: string
          created_at?: string
          descripcion?: string
          id?: string
          nombre?: string
          updated_at?: string
        }
        Relationships: []
      }
      codificacion_config: {
        Row: {
          anio_dos_digitos: boolean
          correlativo_actual: number
          created_at: string
          digitos: number
          id: string
          incluir_anio: boolean
          prefijo: string
          separador: string
          tipo_letra: string
          updated_at: string
        }
        Insert: {
          anio_dos_digitos?: boolean
          correlativo_actual?: number
          created_at?: string
          digitos?: number
          id?: string
          incluir_anio?: boolean
          prefijo?: string
          separador?: string
          tipo_letra?: string
          updated_at?: string
        }
        Update: {
          anio_dos_digitos?: boolean
          correlativo_actual?: number
          created_at?: string
          digitos?: number
          id?: string
          incluir_anio?: boolean
          prefijo?: string
          separador?: string
          tipo_letra?: string
          updated_at?: string
        }
        Relationships: []
      }
      codificacion_cotizacion: {
        Row: {
          anio_dos_digitos: boolean
          correlativo_actual: number
          created_at: string
          digitos: number
          id: string
          incluir_anio: boolean
          prefijo: string
          separador: string
          tipo_letra: string
          updated_at: string
        }
        Insert: {
          anio_dos_digitos?: boolean
          correlativo_actual?: number
          created_at?: string
          digitos?: number
          id?: string
          incluir_anio?: boolean
          prefijo?: string
          separador?: string
          tipo_letra?: string
          updated_at?: string
        }
        Update: {
          anio_dos_digitos?: boolean
          correlativo_actual?: number
          created_at?: string
          digitos?: number
          id?: string
          incluir_anio?: boolean
          prefijo?: string
          separador?: string
          tipo_letra?: string
          updated_at?: string
        }
        Relationships: []
      }
      codificacion_documentos: {
        Row: {
          codigo: string
          correlativo_actual: number
          created_at: string
          digitos: number
          es_sistema: boolean
          id: string
          nombre: string
          orden: number
          updated_at: string
        }
        Insert: {
          codigo?: string
          correlativo_actual?: number
          created_at?: string
          digitos?: number
          es_sistema?: boolean
          id?: string
          nombre: string
          orden?: number
          updated_at?: string
        }
        Update: {
          codigo?: string
          correlativo_actual?: number
          created_at?: string
          digitos?: number
          es_sistema?: boolean
          id?: string
          nombre?: string
          orden?: number
          updated_at?: string
        }
        Relationships: []
      }
      codificacion_insumo: {
        Row: {
          correlativo_eq: number
          correlativo_ht: number
          correlativo_mat: number
          correlativo_mo: number
          correlativo_sc: number
          created_at: string
          digito_eq: number
          digito_ht: number
          digito_mat: number
          digito_mo: number
          digito_sc: number
          id: string
          updated_at: string
        }
        Insert: {
          correlativo_eq?: number
          correlativo_ht?: number
          correlativo_mat?: number
          correlativo_mo?: number
          correlativo_sc?: number
          created_at?: string
          digito_eq?: number
          digito_ht?: number
          digito_mat?: number
          digito_mo?: number
          digito_sc?: number
          id?: string
          updated_at?: string
        }
        Update: {
          correlativo_eq?: number
          correlativo_ht?: number
          correlativo_mat?: number
          correlativo_mo?: number
          correlativo_sc?: number
          created_at?: string
          digito_eq?: number
          digito_ht?: number
          digito_mat?: number
          digito_mo?: number
          digito_sc?: number
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      codificacion_preliquidacion: {
        Row: {
          anio_dos_digitos: boolean
          correlativo_actual: number
          created_at: string
          digitos: number
          id: string
          incluir_anio: boolean
          prefijo: string
          separador: string
          tipo_letra: string
          updated_at: string
        }
        Insert: {
          anio_dos_digitos?: boolean
          correlativo_actual?: number
          created_at?: string
          digitos?: number
          id?: string
          incluir_anio?: boolean
          prefijo?: string
          separador?: string
          tipo_letra?: string
          updated_at?: string
        }
        Update: {
          anio_dos_digitos?: boolean
          correlativo_actual?: number
          created_at?: string
          digitos?: number
          id?: string
          incluir_anio?: boolean
          prefijo?: string
          separador?: string
          tipo_letra?: string
          updated_at?: string
        }
        Relationships: []
      }
      comprobante_cuotas: {
        Row: {
          comprobante_id: string
          created_at: string
          fecha_vencimiento: string
          id: string
          monto: number
          numero: number
          updated_at: string
        }
        Insert: {
          comprobante_id: string
          created_at?: string
          fecha_vencimiento: string
          id?: string
          monto: number
          numero: number
          updated_at?: string
        }
        Update: {
          comprobante_id?: string
          created_at?: string
          fecha_vencimiento?: string
          id?: string
          monto?: number
          numero?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "comprobante_cuotas_comprobante_id_fkey"
            columns: ["comprobante_id"]
            isOneToOne: false
            referencedRelation: "comprobantes_electronicos"
            referencedColumns: ["id"]
          },
        ]
      }
      comprobante_items: {
        Row: {
          afectacion_igv: string
          cantidad: number
          codigo: string
          comprobante_id: string
          created_at: string
          descripcion: string
          descuento: number
          id: string
          igv: number
          orden: number
          subtotal: number
          total: number
          unidad_sunat: string
          updated_at: string
          valor_unitario: number
        }
        Insert: {
          afectacion_igv?: string
          cantidad?: number
          codigo?: string
          comprobante_id: string
          created_at?: string
          descripcion: string
          descuento?: number
          id?: string
          igv?: number
          orden?: number
          subtotal?: number
          total?: number
          unidad_sunat?: string
          updated_at?: string
          valor_unitario?: number
        }
        Update: {
          afectacion_igv?: string
          cantidad?: number
          codigo?: string
          comprobante_id?: string
          created_at?: string
          descripcion?: string
          descuento?: number
          id?: string
          igv?: number
          orden?: number
          subtotal?: number
          total?: number
          unidad_sunat?: string
          updated_at?: string
          valor_unitario?: number
        }
        Relationships: [
          {
            foreignKeyName: "comprobante_items_comprobante_id_fkey"
            columns: ["comprobante_id"]
            isOneToOne: false
            referencedRelation: "comprobantes_electronicos"
            referencedColumns: ["id"]
          },
        ]
      }
      comprobantes_electronicos: {
        Row: {
          anticipo_documento: string
          anticipo_monto: number
          anticipo_tipo: string
          banco_id: string | null
          cdr_codigo: string
          cdr_descripcion: string
          cdr_url: string
          cliente_ciudad: string
          cliente_condicion_sunat: string
          cliente_direccion: string
          cliente_estado_sunat: string
          cliente_id: string | null
          cliente_numero_documento: string
          cliente_razon_social: string
          codigo_spot: string
          comprobante_referencia_id: string | null
          condicion_pago: string
          correlativo: number
          creado_por: string
          created_at: string
          datos_guia: Json
          datos_regimen: Json
          detraccion_constancia: string
          detraccion_estado: string
          detraccion_fecha: string | null
          dias_credito: number
          documentos_relacionados: Json
          estado_fiscal: string
          estado_pago: Database["public"]["Enums"]["estado_venta"]
          fecha_emision: string
          fecha_pago: string | null
          fecha_vencimiento: string | null
          guia_remision_numero: string
          hash_cpe: string
          icbper: number
          id: string
          igv: number
          igv_tasa: number
          isc: number
          moneda: Database["public"]["Enums"]["moneda"]
          monto_detraccion: number
          monto_retencion: number
          motivo_baja: string
          motivo_nota_codigo: string
          motivo_nota_descripcion: string
          numero: string
          numero_operacion: string
          observacion: string
          operacion_tipo: string
          orden_compra: string
          otros_cargos: number
          otros_tributos: number
          payload_fiscal: Json
          pct_detraccion: number
          preliquidacion_id: string | null
          proveedor_envio: string
          proyecto_id: string | null
          qr_payload: string
          redondeo: number
          serie: string
          ticket_baja: string
          tipo_cambio: number
          tipo_comprobante: string
          tipo_tributario: string
          total: number
          total_descuentos: number
          total_letras: string
          total_soles: number
          updated_at: string
          valor_venta: number
          xml_url: string
        }
        Insert: {
          anticipo_documento?: string
          anticipo_monto?: number
          anticipo_tipo?: string
          banco_id?: string | null
          cdr_codigo?: string
          cdr_descripcion?: string
          cdr_url?: string
          cliente_ciudad?: string
          cliente_condicion_sunat?: string
          cliente_direccion?: string
          cliente_estado_sunat?: string
          cliente_id?: string | null
          cliente_numero_documento?: string
          cliente_razon_social?: string
          codigo_spot?: string
          comprobante_referencia_id?: string | null
          condicion_pago?: string
          correlativo: number
          creado_por?: string
          created_at?: string
          datos_guia?: Json
          datos_regimen?: Json
          detraccion_constancia?: string
          detraccion_estado?: string
          detraccion_fecha?: string | null
          dias_credito?: number
          documentos_relacionados?: Json
          estado_fiscal?: string
          estado_pago?: Database["public"]["Enums"]["estado_venta"]
          fecha_emision?: string
          fecha_pago?: string | null
          fecha_vencimiento?: string | null
          guia_remision_numero?: string
          hash_cpe?: string
          icbper?: number
          id?: string
          igv?: number
          igv_tasa?: number
          isc?: number
          moneda?: Database["public"]["Enums"]["moneda"]
          monto_detraccion?: number
          monto_retencion?: number
          motivo_baja?: string
          motivo_nota_codigo?: string
          motivo_nota_descripcion?: string
          numero: string
          numero_operacion?: string
          observacion?: string
          operacion_tipo?: string
          orden_compra?: string
          otros_cargos?: number
          otros_tributos?: number
          payload_fiscal?: Json
          pct_detraccion?: number
          preliquidacion_id?: string | null
          proveedor_envio?: string
          proyecto_id?: string | null
          qr_payload?: string
          redondeo?: number
          serie: string
          ticket_baja?: string
          tipo_cambio?: number
          tipo_comprobante: string
          tipo_tributario?: string
          total?: number
          total_descuentos?: number
          total_letras?: string
          total_soles?: number
          updated_at?: string
          valor_venta?: number
          xml_url?: string
        }
        Update: {
          anticipo_documento?: string
          anticipo_monto?: number
          anticipo_tipo?: string
          banco_id?: string | null
          cdr_codigo?: string
          cdr_descripcion?: string
          cdr_url?: string
          cliente_ciudad?: string
          cliente_condicion_sunat?: string
          cliente_direccion?: string
          cliente_estado_sunat?: string
          cliente_id?: string | null
          cliente_numero_documento?: string
          cliente_razon_social?: string
          codigo_spot?: string
          comprobante_referencia_id?: string | null
          condicion_pago?: string
          correlativo?: number
          creado_por?: string
          created_at?: string
          datos_guia?: Json
          datos_regimen?: Json
          detraccion_constancia?: string
          detraccion_estado?: string
          detraccion_fecha?: string | null
          dias_credito?: number
          documentos_relacionados?: Json
          estado_fiscal?: string
          estado_pago?: Database["public"]["Enums"]["estado_venta"]
          fecha_emision?: string
          fecha_pago?: string | null
          fecha_vencimiento?: string | null
          guia_remision_numero?: string
          hash_cpe?: string
          icbper?: number
          id?: string
          igv?: number
          igv_tasa?: number
          isc?: number
          moneda?: Database["public"]["Enums"]["moneda"]
          monto_detraccion?: number
          monto_retencion?: number
          motivo_baja?: string
          motivo_nota_codigo?: string
          motivo_nota_descripcion?: string
          numero?: string
          numero_operacion?: string
          observacion?: string
          operacion_tipo?: string
          orden_compra?: string
          otros_cargos?: number
          otros_tributos?: number
          payload_fiscal?: Json
          pct_detraccion?: number
          preliquidacion_id?: string | null
          proveedor_envio?: string
          proyecto_id?: string | null
          qr_payload?: string
          redondeo?: number
          serie?: string
          ticket_baja?: string
          tipo_cambio?: number
          tipo_comprobante?: string
          tipo_tributario?: string
          total?: number
          total_descuentos?: number
          total_letras?: string
          total_soles?: number
          updated_at?: string
          valor_venta?: number
          xml_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "comprobantes_electronicos_banco_id_fkey"
            columns: ["banco_id"]
            isOneToOne: false
            referencedRelation: "bancos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comprobantes_electronicos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "terceros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comprobantes_electronicos_comprobante_referencia_id_fkey"
            columns: ["comprobante_referencia_id"]
            isOneToOne: false
            referencedRelation: "comprobantes_electronicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comprobantes_electronicos_preliquidacion_id_fkey"
            columns: ["preliquidacion_id"]
            isOneToOne: false
            referencedRelation: "preliquidaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comprobantes_electronicos_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "proyectos"
            referencedColumns: ["id"]
          },
        ]
      }
      comprobantes_recibidos: {
        Row: {
          base: number
          cdr_path: string | null
          created_at: string
          error: string | null
          estado_descarga: string
          fecha: string | null
          id: string
          igv: number
          moneda: string
          numero: string
          pdf_path: string | null
          periodo: string
          razon_emisor: string
          registrado_en: string | null
          registro_id: string | null
          ruc_emisor: string
          serie: string
          tipo: string
          tipo_cambio: number
          total: number
          updated_at: string
          xml_path: string | null
        }
        Insert: {
          base?: number
          cdr_path?: string | null
          created_at?: string
          error?: string | null
          estado_descarga?: string
          fecha?: string | null
          id?: string
          igv?: number
          moneda?: string
          numero: string
          pdf_path?: string | null
          periodo: string
          razon_emisor?: string
          registrado_en?: string | null
          registro_id?: string | null
          ruc_emisor: string
          serie: string
          tipo: string
          tipo_cambio?: number
          total?: number
          updated_at?: string
          xml_path?: string | null
        }
        Update: {
          base?: number
          cdr_path?: string | null
          created_at?: string
          error?: string | null
          estado_descarga?: string
          fecha?: string | null
          id?: string
          igv?: number
          moneda?: string
          numero?: string
          pdf_path?: string | null
          periodo?: string
          razon_emisor?: string
          registrado_en?: string | null
          registro_id?: string | null
          ruc_emisor?: string
          serie?: string
          tipo?: string
          tipo_cambio?: number
          total?: number
          updated_at?: string
          xml_path?: string | null
        }
        Relationships: []
      }
      comprobantes_recibidos_items: {
        Row: {
          cantidad: number
          codigo: string | null
          comprobante_id: string
          created_at: string
          descripcion: string
          id: string
          orden: number
          origen: string
          precio_unitario: number
          unidad: string
          valor: number
        }
        Insert: {
          cantidad?: number
          codigo?: string | null
          comprobante_id: string
          created_at?: string
          descripcion?: string
          id?: string
          orden?: number
          origen?: string
          precio_unitario?: number
          unidad?: string
          valor?: number
        }
        Update: {
          cantidad?: number
          codigo?: string | null
          comprobante_id?: string
          created_at?: string
          descripcion?: string
          id?: string
          orden?: number
          origen?: string
          precio_unitario?: number
          unidad?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "comprobantes_recibidos_items_comprobante_id_fkey"
            columns: ["comprobante_id"]
            isOneToOne: false
            referencedRelation: "comprobantes_recibidos"
            referencedColumns: ["id"]
          },
        ]
      }
      configuracion_documentos: {
        Row: {
          created_at: string
          fuente_pdf: string
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          fuente_pdf?: string
          id?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          fuente_pdf?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      control_sobrecosto: {
        Row: {
          id: boolean
          tolerancia_pct: number
          updated_at: string
        }
        Insert: {
          id?: boolean
          tolerancia_pct?: number
          updated_at?: string
        }
        Update: {
          id?: boolean
          tolerancia_pct?: number
          updated_at?: string
        }
        Relationships: []
      }
      cotizacion_apu_detalle: {
        Row: {
          cantidad_o_cuadrilla: number
          codigo: string
          cotizacion_item_id: string
          created_at: string
          descripcion: string
          equipo_id: string | null
          id: string
          insumo_id: string | null
          mano_obra_id: string | null
          marca: string
          material_id: string | null
          orden: number
          precio_unitario: number | null
          subcontrato_id: string | null
          tipo_recurso: string
          unidad: string
        }
        Insert: {
          cantidad_o_cuadrilla?: number
          codigo?: string
          cotizacion_item_id: string
          created_at?: string
          descripcion?: string
          equipo_id?: string | null
          id?: string
          insumo_id?: string | null
          mano_obra_id?: string | null
          marca?: string
          material_id?: string | null
          orden?: number
          precio_unitario?: number | null
          subcontrato_id?: string | null
          tipo_recurso?: string
          unidad?: string
        }
        Update: {
          cantidad_o_cuadrilla?: number
          codigo?: string
          cotizacion_item_id?: string
          created_at?: string
          descripcion?: string
          equipo_id?: string | null
          id?: string
          insumo_id?: string | null
          mano_obra_id?: string | null
          marca?: string
          material_id?: string | null
          orden?: number
          precio_unitario?: number | null
          subcontrato_id?: string | null
          tipo_recurso?: string
          unidad?: string
        }
        Relationships: [
          {
            foreignKeyName: "cotizacion_apu_detalle_cotizacion_item_id_fkey"
            columns: ["cotizacion_item_id"]
            isOneToOne: false
            referencedRelation: "cotizacion_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cotizacion_apu_detalle_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "epp_catalogo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cotizacion_apu_detalle_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "equipos_herramientas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cotizacion_apu_detalle_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "insumos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cotizacion_apu_detalle_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "mano_obra"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cotizacion_apu_detalle_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "materiales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cotizacion_apu_detalle_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "subcontratos"
            referencedColumns: ["id"]
          },
        ]
      }
      cotizacion_gastos_generales: {
        Row: {
          cantidad: number
          cotizacion_id: string
          created_at: string
          descripcion: string
          id: string
          nivel: string
          orden: number
          precio_unitario: number
          tiempo: number
          tiempo_manual: boolean
          tipo: string
          unidad: string
        }
        Insert: {
          cantidad?: number
          cotizacion_id: string
          created_at?: string
          descripcion?: string
          id?: string
          nivel?: string
          orden?: number
          precio_unitario?: number
          tiempo?: number
          tiempo_manual?: boolean
          tipo?: string
          unidad?: string
        }
        Update: {
          cantidad?: number
          cotizacion_id?: string
          created_at?: string
          descripcion?: string
          id?: string
          nivel?: string
          orden?: number
          precio_unitario?: number
          tiempo?: number
          tiempo_manual?: boolean
          tipo?: string
          unidad?: string
        }
        Relationships: [
          {
            foreignKeyName: "cotizacion_gastos_generales_cotizacion_id_fkey"
            columns: ["cotizacion_id"]
            isOneToOne: false
            referencedRelation: "cotizaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      cotizacion_items: {
        Row: {
          categoria: string
          codigo: string
          cotizacion_id: string
          created_at: string
          especialidad: string
          especificaciones: string
          grupo: string
          id: string
          jornada: number
          marca: string
          metrado: number
          metrado_detalle: Json
          nivel: string
          nombre: string
          orden: number
          padre_id: string | null
          partida_apu_id: string | null
          pct_herramientas: number
          precio_unitario: number
          rendimiento: number
          tipo: string
          unidad: string
          updated_at: string
        }
        Insert: {
          categoria?: string
          codigo?: string
          cotizacion_id: string
          created_at?: string
          especialidad?: string
          especificaciones?: string
          grupo?: string
          id?: string
          jornada?: number
          marca?: string
          metrado?: number
          metrado_detalle?: Json
          nivel?: string
          nombre: string
          orden?: number
          padre_id?: string | null
          partida_apu_id?: string | null
          pct_herramientas?: number
          precio_unitario?: number
          rendimiento?: number
          tipo?: string
          unidad?: string
          updated_at?: string
        }
        Update: {
          categoria?: string
          codigo?: string
          cotizacion_id?: string
          created_at?: string
          especialidad?: string
          especificaciones?: string
          grupo?: string
          id?: string
          jornada?: number
          marca?: string
          metrado?: number
          metrado_detalle?: Json
          nivel?: string
          nombre?: string
          orden?: number
          padre_id?: string | null
          partida_apu_id?: string | null
          pct_herramientas?: number
          precio_unitario?: number
          rendimiento?: number
          tipo?: string
          unidad?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cotizacion_items_cotizacion_id_fkey"
            columns: ["cotizacion_id"]
            isOneToOne: false
            referencedRelation: "cotizaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cotizacion_items_padre_id_fkey"
            columns: ["padre_id"]
            isOneToOne: false
            referencedRelation: "cotizacion_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cotizacion_items_partida_apu_id_fkey"
            columns: ["partida_apu_id"]
            isOneToOne: false
            referencedRelation: "partidas_apu"
            referencedColumns: ["id"]
          },
        ]
      }
      cotizaciones: {
        Row: {
          alcance: string
          aplica_igv: boolean
          cliente: string
          cliente_id: string | null
          codigo: string | null
          condiciones: string
          condiciones_pago: string
          created_at: string
          duracion_meses: number
          estado: string
          fecha_emision: string
          id: string
          moneda: Database["public"]["Enums"]["moneda"]
          multidisciplinaria: boolean
          nombre: string
          orientacion: string
          pct_gastos_generales: number
          pct_utilidad: number
          proyecto_id: string | null
          recursos_humanos: string
          retoma_de_id: string | null
          revision: string
          ruc_cliente: string
          tiempo_ejecucion: string
          tipo_cambio: number
          ubicacion: string
          updated_at: string
          validez_dias: number
        }
        Insert: {
          alcance?: string
          aplica_igv?: boolean
          cliente?: string
          cliente_id?: string | null
          codigo?: string | null
          condiciones?: string
          condiciones_pago?: string
          created_at?: string
          duracion_meses?: number
          estado?: string
          fecha_emision?: string
          id?: string
          moneda?: Database["public"]["Enums"]["moneda"]
          multidisciplinaria?: boolean
          nombre: string
          orientacion?: string
          pct_gastos_generales?: number
          pct_utilidad?: number
          proyecto_id?: string | null
          recursos_humanos?: string
          retoma_de_id?: string | null
          revision?: string
          ruc_cliente?: string
          tiempo_ejecucion?: string
          tipo_cambio?: number
          ubicacion?: string
          updated_at?: string
          validez_dias?: number
        }
        Update: {
          alcance?: string
          aplica_igv?: boolean
          cliente?: string
          cliente_id?: string | null
          codigo?: string | null
          condiciones?: string
          condiciones_pago?: string
          created_at?: string
          duracion_meses?: number
          estado?: string
          fecha_emision?: string
          id?: string
          moneda?: Database["public"]["Enums"]["moneda"]
          multidisciplinaria?: boolean
          nombre?: string
          orientacion?: string
          pct_gastos_generales?: number
          pct_utilidad?: number
          proyecto_id?: string | null
          recursos_humanos?: string
          retoma_de_id?: string | null
          revision?: string
          ruc_cliente?: string
          tiempo_ejecucion?: string
          tipo_cambio?: number
          ubicacion?: string
          updated_at?: string
          validez_dias?: number
        }
        Relationships: [
          {
            foreignKeyName: "cotizaciones_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "terceros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cotizaciones_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "proyectos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cotizaciones_retoma_de_id_fkey"
            columns: ["retoma_de_id"]
            isOneToOne: false
            referencedRelation: "cotizaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      cronograma_partidas: {
        Row: {
          anio: number
          created_at: string
          fecha_inicio: string
          id: string
          mes: number
          partida_id: string
          pct: number
          periodicidad: string
          updated_at: string
        }
        Insert: {
          anio: number
          created_at?: string
          fecha_inicio: string
          id?: string
          mes: number
          partida_id: string
          pct?: number
          periodicidad?: string
          updated_at?: string
        }
        Update: {
          anio?: number
          created_at?: string
          fecha_inicio?: string
          id?: string
          mes?: number
          partida_id?: string
          pct?: number
          periodicidad?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cronograma_partidas_partida_id_fkey"
            columns: ["partida_id"]
            isOneToOne: false
            referencedRelation: "partidas"
            referencedColumns: ["id"]
          },
        ]
      }
      dependencias_partidas: {
        Row: {
          created_at: string
          desfase_dias: number
          id: string
          predecesora_id: string
          proyecto_id: string
          sucesora_id: string
          tipo: string
        }
        Insert: {
          created_at?: string
          desfase_dias?: number
          id?: string
          predecesora_id: string
          proyecto_id: string
          sucesora_id: string
          tipo?: string
        }
        Update: {
          created_at?: string
          desfase_dias?: number
          id?: string
          predecesora_id?: string
          proyecto_id?: string
          sucesora_id?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "dependencias_partidas_predecesora_id_fkey"
            columns: ["predecesora_id"]
            isOneToOne: false
            referencedRelation: "partidas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dependencias_partidas_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "proyectos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dependencias_partidas_sucesora_id_fkey"
            columns: ["sucesora_id"]
            isOneToOne: false
            referencedRelation: "partidas"
            referencedColumns: ["id"]
          },
        ]
      }
      emos_trabajador: {
        Row: {
          clinica: string
          costo: number
          created_at: string
          created_by: string | null
          estado_pago: string
          examenes: string[]
          fecha_emo: string
          fecha_pago: string | null
          fecha_vencimiento: string
          id: string
          observaciones: string | null
          restricciones: string | null
          resultado: string
          sede_clinica: string | null
          tipo_emo: string
          trabajador_id: string
          updated_at: string
        }
        Insert: {
          clinica: string
          costo?: number
          created_at?: string
          created_by?: string | null
          estado_pago?: string
          examenes?: string[]
          fecha_emo: string
          fecha_pago?: string | null
          fecha_vencimiento: string
          id?: string
          observaciones?: string | null
          restricciones?: string | null
          resultado?: string
          sede_clinica?: string | null
          tipo_emo?: string
          trabajador_id: string
          updated_at?: string
        }
        Update: {
          clinica?: string
          costo?: number
          created_at?: string
          created_by?: string | null
          estado_pago?: string
          examenes?: string[]
          fecha_emo?: string
          fecha_pago?: string | null
          fecha_vencimiento?: string
          id?: string
          observaciones?: string | null
          restricciones?: string | null
          resultado?: string
          sede_clinica?: string | null
          tipo_emo?: string
          trabajador_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "emos_trabajador_trabajador_id_fkey"
            columns: ["trabajador_id"]
            isOneToOne: false
            referencedRelation: "trabajadores"
            referencedColumns: ["id"]
          },
        ]
      }
      empresa_config: {
        Row: {
          color_marca: string
          created_at: string
          direccion: string
          email: string
          eslogan: string
          gerente_dni: string | null
          gerente_nombre: string | null
          id: string
          logo_url: string
          razon_social: string
          rrhh_dni: string | null
          rrhh_nombre: string | null
          rubro: string
          ruc: string
          telefono: string
          updated_at: string
          web: string
        }
        Insert: {
          color_marca?: string
          created_at?: string
          direccion?: string
          email?: string
          eslogan?: string
          gerente_dni?: string | null
          gerente_nombre?: string | null
          id?: string
          logo_url?: string
          razon_social?: string
          rrhh_dni?: string | null
          rrhh_nombre?: string | null
          rubro?: string
          ruc?: string
          telefono?: string
          updated_at?: string
          web?: string
        }
        Update: {
          color_marca?: string
          created_at?: string
          direccion?: string
          email?: string
          eslogan?: string
          gerente_dni?: string | null
          gerente_nombre?: string | null
          id?: string
          logo_url?: string
          razon_social?: string
          rrhh_dni?: string | null
          rrhh_nombre?: string | null
          rubro?: string
          ruc?: string
          telefono?: string
          updated_at?: string
          web?: string
        }
        Relationships: []
      }
      epp_entregas: {
        Row: {
          cantidad: number
          created_at: string
          epp_id: string
          fecha_devolucion: string | null
          fecha_entrega: string
          fecha_renovacion: string | null
          id: string
          motivo: string
          observaciones: string
          talla: string
          trabajador_id: string
        }
        Insert: {
          cantidad?: number
          created_at?: string
          epp_id: string
          fecha_devolucion?: string | null
          fecha_entrega?: string
          fecha_renovacion?: string | null
          id?: string
          motivo?: string
          observaciones?: string
          talla?: string
          trabajador_id: string
        }
        Update: {
          cantidad?: number
          created_at?: string
          epp_id?: string
          fecha_devolucion?: string | null
          fecha_entrega?: string
          fecha_renovacion?: string | null
          id?: string
          motivo?: string
          observaciones?: string
          talla?: string
          trabajador_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "epp_entregas_epp_id_fkey"
            columns: ["epp_id"]
            isOneToOne: false
            referencedRelation: "epp_catalogo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "epp_entregas_epp_id_fkey"
            columns: ["epp_id"]
            isOneToOne: false
            referencedRelation: "equipos_herramientas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "epp_entregas_epp_id_fkey"
            columns: ["epp_id"]
            isOneToOne: false
            referencedRelation: "insumos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "epp_entregas_epp_id_fkey"
            columns: ["epp_id"]
            isOneToOne: false
            referencedRelation: "mano_obra"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "epp_entregas_epp_id_fkey"
            columns: ["epp_id"]
            isOneToOne: false
            referencedRelation: "materiales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "epp_entregas_epp_id_fkey"
            columns: ["epp_id"]
            isOneToOne: false
            referencedRelation: "subcontratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "epp_entregas_trabajador_id_fkey"
            columns: ["trabajador_id"]
            isOneToOne: false
            referencedRelation: "trabajadores"
            referencedColumns: ["id"]
          },
        ]
      }
      especialidades_partida: {
        Row: {
          activo: boolean
          bloque: string
          codigo: string
          codigo_modular: string | null
          created_at: string
          descripcion: string | null
          id: string
          nombre: string
          orden: number
          updated_at: string
        }
        Insert: {
          activo?: boolean
          bloque?: string
          codigo?: string
          codigo_modular?: string | null
          created_at?: string
          descripcion?: string | null
          id?: string
          nombre: string
          orden?: number
          updated_at?: string
        }
        Update: {
          activo?: boolean
          bloque?: string
          codigo?: string
          codigo_modular?: string | null
          created_at?: string
          descripcion?: string | null
          id?: string
          nombre?: string
          orden?: number
          updated_at?: string
        }
        Relationships: []
      }
      estados_proyecto: {
        Row: {
          activo: boolean
          created_at: string
          id: string
          nombre: string
          orden: number
          updated_at: string
        }
        Insert: {
          activo?: boolean
          created_at?: string
          id?: string
          nombre: string
          orden?: number
          updated_at?: string
        }
        Update: {
          activo?: boolean
          created_at?: string
          id?: string
          nombre?: string
          orden?: number
          updated_at?: string
        }
        Relationships: []
      }
      financiamiento_cuotas: {
        Row: {
          banco_id: string | null
          capital: number
          comision: number
          fecha_pago: string | null
          financiamiento_id: string
          id: string
          interes: number
          numero: number
          numero_operacion: string | null
          vencimiento: string
        }
        Insert: {
          banco_id?: string | null
          capital: number
          comision?: number
          fecha_pago?: string | null
          financiamiento_id: string
          id?: string
          interes?: number
          numero: number
          numero_operacion?: string | null
          vencimiento: string
        }
        Update: {
          banco_id?: string | null
          capital?: number
          comision?: number
          fecha_pago?: string | null
          financiamiento_id?: string
          id?: string
          interes?: number
          numero?: number
          numero_operacion?: string | null
          vencimiento?: string
        }
        Relationships: [
          {
            foreignKeyName: "financiamiento_cuotas_banco_id_fkey"
            columns: ["banco_id"]
            isOneToOne: false
            referencedRelation: "bancos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financiamiento_cuotas_financiamiento_id_fkey"
            columns: ["financiamiento_id"]
            isOneToOne: false
            referencedRelation: "financiamientos"
            referencedColumns: ["id"]
          },
        ]
      }
      financiamientos: {
        Row: {
          acreedor: string
          banco_id: string
          capital: number
          creado_por: string
          created_at: string
          fecha_desembolso: string
          id: string
          moneda: string
          notas: string
          numero_operacion: string
          referencia: string
          tipo_cambio: number
        }
        Insert: {
          acreedor: string
          banco_id: string
          capital: number
          creado_por: string
          created_at?: string
          fecha_desembolso: string
          id?: string
          moneda: string
          notas?: string
          numero_operacion: string
          referencia: string
          tipo_cambio?: number
        }
        Update: {
          acreedor?: string
          banco_id?: string
          capital?: number
          creado_por?: string
          created_at?: string
          fecha_desembolso?: string
          id?: string
          moneda?: string
          notas?: string
          numero_operacion?: string
          referencia?: string
          tipo_cambio?: number
        }
        Relationships: [
          {
            foreignKeyName: "financiamientos_banco_id_fkey"
            columns: ["banco_id"]
            isOneToOne: false
            referencedRelation: "bancos"
            referencedColumns: ["id"]
          },
        ]
      }
      gastos_directos: {
        Row: {
          banco_id: string | null
          caja_chica_id: string | null
          cantidad: number
          comprobante: string
          condicion_pago: string
          created_at: string
          descripcion: string
          detraccion_banco_id: string | null
          detraccion_constancia: string | null
          detraccion_estado: string
          detraccion_fecha: string | null
          dias_credito: number
          estado_pago: string
          fecha: string
          fecha_pago: string | null
          fecha_vencimiento: string | null
          id: string
          insumo_id: string | null
          moneda: Database["public"]["Enums"]["moneda"]
          monto: number
          monto_detraccion: number | null
          monto_soles: number
          numero_operacion: string
          orden_compra_item_id: string | null
          partida_id: string
          pct_detraccion: number | null
          precio_unitario: number
          proveedor: string
          proveedor_id: string | null
          proyecto_id: string
          rubro: string
          tipo_cambio: number
        }
        Insert: {
          banco_id?: string | null
          caja_chica_id?: string | null
          cantidad?: number
          comprobante?: string
          condicion_pago?: string
          created_at?: string
          descripcion: string
          detraccion_banco_id?: string | null
          detraccion_constancia?: string | null
          detraccion_estado?: string
          detraccion_fecha?: string | null
          dias_credito?: number
          estado_pago?: string
          fecha?: string
          fecha_pago?: string | null
          fecha_vencimiento?: string | null
          id?: string
          insumo_id?: string | null
          moneda?: Database["public"]["Enums"]["moneda"]
          monto?: number
          monto_detraccion?: number | null
          monto_soles?: number
          numero_operacion?: string
          orden_compra_item_id?: string | null
          partida_id: string
          pct_detraccion?: number | null
          precio_unitario?: number
          proveedor?: string
          proveedor_id?: string | null
          proyecto_id: string
          rubro?: string
          tipo_cambio?: number
        }
        Update: {
          banco_id?: string | null
          caja_chica_id?: string | null
          cantidad?: number
          comprobante?: string
          condicion_pago?: string
          created_at?: string
          descripcion?: string
          detraccion_banco_id?: string | null
          detraccion_constancia?: string | null
          detraccion_estado?: string
          detraccion_fecha?: string | null
          dias_credito?: number
          estado_pago?: string
          fecha?: string
          fecha_pago?: string | null
          fecha_vencimiento?: string | null
          id?: string
          insumo_id?: string | null
          moneda?: Database["public"]["Enums"]["moneda"]
          monto?: number
          monto_detraccion?: number | null
          monto_soles?: number
          numero_operacion?: string
          orden_compra_item_id?: string | null
          partida_id?: string
          pct_detraccion?: number | null
          precio_unitario?: number
          proveedor?: string
          proveedor_id?: string | null
          proyecto_id?: string
          rubro?: string
          tipo_cambio?: number
        }
        Relationships: [
          {
            foreignKeyName: "gastos_directos_banco_id_fkey"
            columns: ["banco_id"]
            isOneToOne: false
            referencedRelation: "bancos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gastos_directos_caja_chica_id_fkey"
            columns: ["caja_chica_id"]
            isOneToOne: false
            referencedRelation: "cajas_chicas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gastos_directos_detraccion_banco_id_fkey"
            columns: ["detraccion_banco_id"]
            isOneToOne: false
            referencedRelation: "bancos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gastos_directos_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "epp_catalogo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gastos_directos_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "equipos_herramientas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gastos_directos_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "insumos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gastos_directos_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "mano_obra"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gastos_directos_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "materiales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gastos_directos_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "subcontratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gastos_directos_orden_compra_item_id_fkey"
            columns: ["orden_compra_item_id"]
            isOneToOne: false
            referencedRelation: "orden_compra_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gastos_directos_partida_id_fkey"
            columns: ["partida_id"]
            isOneToOne: false
            referencedRelation: "partidas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gastos_directos_proveedor_id_fkey"
            columns: ["proveedor_id"]
            isOneToOne: false
            referencedRelation: "terceros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gastos_directos_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "proyectos"
            referencedColumns: ["id"]
          },
        ]
      }
      gastos_generales: {
        Row: {
          banco_id: string | null
          caja_chica_id: string | null
          categoria: string
          comprobante: string
          condicion_pago: string
          created_at: string
          descripcion: string
          detraccion_banco_id: string | null
          detraccion_constancia: string | null
          detraccion_estado: string
          detraccion_fecha: string | null
          dias_credito: number
          estado_pago: string
          fecha: string
          fecha_pago: string | null
          fecha_vencimiento: string | null
          id: string
          moneda: Database["public"]["Enums"]["moneda"]
          monto: number
          monto_detraccion: number | null
          monto_soles: number
          numero_operacion: string
          pct_detraccion: number | null
          proveedor: string
          proveedor_id: string | null
          proyecto_id: string | null
          tipo_cambio: number
        }
        Insert: {
          banco_id?: string | null
          caja_chica_id?: string | null
          categoria?: string
          comprobante?: string
          condicion_pago?: string
          created_at?: string
          descripcion: string
          detraccion_banco_id?: string | null
          detraccion_constancia?: string | null
          detraccion_estado?: string
          detraccion_fecha?: string | null
          dias_credito?: number
          estado_pago?: string
          fecha?: string
          fecha_pago?: string | null
          fecha_vencimiento?: string | null
          id?: string
          moneda?: Database["public"]["Enums"]["moneda"]
          monto?: number
          monto_detraccion?: number | null
          monto_soles?: number
          numero_operacion?: string
          pct_detraccion?: number | null
          proveedor?: string
          proveedor_id?: string | null
          proyecto_id?: string | null
          tipo_cambio?: number
        }
        Update: {
          banco_id?: string | null
          caja_chica_id?: string | null
          categoria?: string
          comprobante?: string
          condicion_pago?: string
          created_at?: string
          descripcion?: string
          detraccion_banco_id?: string | null
          detraccion_constancia?: string | null
          detraccion_estado?: string
          detraccion_fecha?: string | null
          dias_credito?: number
          estado_pago?: string
          fecha?: string
          fecha_pago?: string | null
          fecha_vencimiento?: string | null
          id?: string
          moneda?: Database["public"]["Enums"]["moneda"]
          monto?: number
          monto_detraccion?: number | null
          monto_soles?: number
          numero_operacion?: string
          pct_detraccion?: number | null
          proveedor?: string
          proveedor_id?: string | null
          proyecto_id?: string | null
          tipo_cambio?: number
        }
        Relationships: [
          {
            foreignKeyName: "gastos_generales_banco_id_fkey"
            columns: ["banco_id"]
            isOneToOne: false
            referencedRelation: "bancos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gastos_generales_caja_chica_id_fkey"
            columns: ["caja_chica_id"]
            isOneToOne: false
            referencedRelation: "cajas_chicas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gastos_generales_detraccion_banco_id_fkey"
            columns: ["detraccion_banco_id"]
            isOneToOne: false
            referencedRelation: "bancos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gastos_generales_proveedor_id_fkey"
            columns: ["proveedor_id"]
            isOneToOne: false
            referencedRelation: "terceros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gastos_generales_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "proyectos"
            referencedColumns: ["id"]
          },
        ]
      }
      grupos_cotizacion: {
        Row: {
          activo: boolean
          created_at: string
          id: string
          nombre: string
          orden: number
          updated_at: string
        }
        Insert: {
          activo?: boolean
          created_at?: string
          id?: string
          nombre: string
          orden?: number
          updated_at?: string
        }
        Update: {
          activo?: boolean
          created_at?: string
          id?: string
          nombre?: string
          orden?: number
          updated_at?: string
        }
        Relationships: []
      }
      historial_normativo: {
        Row: {
          base_legal: string
          created_at: string
          id: string
          observaciones: string | null
          rmv: number
          uit: number
          updated_at: string
          vigencia_desde: string
        }
        Insert: {
          base_legal?: string
          created_at?: string
          id?: string
          observaciones?: string | null
          rmv: number
          uit: number
          updated_at?: string
          vigencia_desde: string
        }
        Update: {
          base_legal?: string
          created_at?: string
          id?: string
          observaciones?: string | null
          rmv?: number
          uit?: number
          updated_at?: string
          vigencia_desde?: string
        }
        Relationships: []
      }
      importacion_items: {
        Row: {
          cantidad: number
          costo_unitario_pen: number
          created_at: string
          descripcion: string
          id: string
          importacion_id: string
          insumo_id: string | null
          partida_arancelaria: string
          pct_advalorem: number
          precio_fob: number
          unidad: string
        }
        Insert: {
          cantidad?: number
          costo_unitario_pen?: number
          created_at?: string
          descripcion: string
          id?: string
          importacion_id: string
          insumo_id?: string | null
          partida_arancelaria?: string
          pct_advalorem?: number
          precio_fob?: number
          unidad?: string
        }
        Update: {
          cantidad?: number
          costo_unitario_pen?: number
          created_at?: string
          descripcion?: string
          id?: string
          importacion_id?: string
          insumo_id?: string | null
          partida_arancelaria?: string
          pct_advalorem?: number
          precio_fob?: number
          unidad?: string
        }
        Relationships: [
          {
            foreignKeyName: "importacion_items_importacion_id_fkey"
            columns: ["importacion_id"]
            isOneToOne: false
            referencedRelation: "importaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "importacion_items_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "epp_catalogo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "importacion_items_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "equipos_herramientas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "importacion_items_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "insumos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "importacion_items_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "mano_obra"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "importacion_items_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "materiales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "importacion_items_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "subcontratos"
            referencedColumns: ["id"]
          },
        ]
      }
      importaciones: {
        Row: {
          codigo: string
          created_at: string
          estado: string
          fecha_arribo: string | null
          fecha_embarque: string | null
          fecha_integracion: string | null
          fecha_liquidacion: string | null
          fecha_pedido: string
          flete: number
          gasto_almacenaje: number
          gasto_flete_local: number
          gasto_handling: number
          gasto_honorarios: number
          gasto_otros: number
          id: string
          incoterm: string
          integrado: boolean
          moneda: Database["public"]["Enums"]["moneda"]
          observacion: string
          orden_id: string | null
          pais_origen: string
          pct_percepcion: number
          proveedor_extranjero: string
          proveedor_id: string | null
          proyecto_id: string | null
          seguro: number
          tipo_cambio: number
          tipo_despacho: string
          tracking: string
          transportista: string
          updated_at: string
        }
        Insert: {
          codigo: string
          created_at?: string
          estado?: string
          fecha_arribo?: string | null
          fecha_embarque?: string | null
          fecha_integracion?: string | null
          fecha_liquidacion?: string | null
          fecha_pedido?: string
          flete?: number
          gasto_almacenaje?: number
          gasto_flete_local?: number
          gasto_handling?: number
          gasto_honorarios?: number
          gasto_otros?: number
          id?: string
          incoterm?: string
          integrado?: boolean
          moneda?: Database["public"]["Enums"]["moneda"]
          observacion?: string
          orden_id?: string | null
          pais_origen?: string
          pct_percepcion?: number
          proveedor_extranjero?: string
          proveedor_id?: string | null
          proyecto_id?: string | null
          seguro?: number
          tipo_cambio?: number
          tipo_despacho?: string
          tracking?: string
          transportista?: string
          updated_at?: string
        }
        Update: {
          codigo?: string
          created_at?: string
          estado?: string
          fecha_arribo?: string | null
          fecha_embarque?: string | null
          fecha_integracion?: string | null
          fecha_liquidacion?: string | null
          fecha_pedido?: string
          flete?: number
          gasto_almacenaje?: number
          gasto_flete_local?: number
          gasto_handling?: number
          gasto_honorarios?: number
          gasto_otros?: number
          id?: string
          incoterm?: string
          integrado?: boolean
          moneda?: Database["public"]["Enums"]["moneda"]
          observacion?: string
          orden_id?: string | null
          pais_origen?: string
          pct_percepcion?: number
          proveedor_extranjero?: string
          proveedor_id?: string | null
          proyecto_id?: string | null
          seguro?: number
          tipo_cambio?: number
          tipo_despacho?: string
          tracking?: string
          transportista?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "importaciones_orden_id_fkey"
            columns: ["orden_id"]
            isOneToOne: false
            referencedRelation: "ordenes_compra"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "importaciones_proveedor_id_fkey"
            columns: ["proveedor_id"]
            isOneToOne: false
            referencedRelation: "terceros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "importaciones_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "proyectos"
            referencedColumns: ["id"]
          },
        ]
      }
      insumos: {
        Row: {
          activo: boolean
          asignacion_familiar: boolean
          categoria_id: string | null
          categoria_inventario: string | null
          categoria_obrero: string | null
          clase_equipo: string
          codigo: string
          compra_activa: boolean
          creado_en: string | null
          creado_por: string | null
          created_at: string
          descripcion_breve: string | null
          especialidad_id: string | null
          especificaciones: string | null
          estado_aprobacion: string
          id: string
          marca_id: string | null
          margen_pct: number
          nombre: string
          numero_parte: string | null
          precio: number
          propiedad: string
          regimen_laboral: string
          subfamilia_id: string | null
          sueldo_mensual: number
          tipo: string
          unidad: string
          unidad_id: string | null
          updated_at: string
        }
        Insert: {
          activo?: boolean
          asignacion_familiar?: boolean
          categoria_id?: string | null
          categoria_inventario?: string | null
          categoria_obrero?: string | null
          clase_equipo?: string
          codigo?: string
          compra_activa?: boolean
          creado_en?: string | null
          creado_por?: string | null
          created_at?: string
          descripcion_breve?: string | null
          especialidad_id?: string | null
          especificaciones?: string | null
          estado_aprobacion?: string
          id?: string
          marca_id?: string | null
          margen_pct?: number
          nombre: string
          numero_parte?: string | null
          precio?: number
          propiedad?: string
          regimen_laboral?: string
          subfamilia_id?: string | null
          sueldo_mensual?: number
          tipo?: string
          unidad?: string
          unidad_id?: string | null
          updated_at?: string
        }
        Update: {
          activo?: boolean
          asignacion_familiar?: boolean
          categoria_id?: string | null
          categoria_inventario?: string | null
          categoria_obrero?: string | null
          clase_equipo?: string
          codigo?: string
          compra_activa?: boolean
          creado_en?: string | null
          creado_por?: string | null
          created_at?: string
          descripcion_breve?: string | null
          especialidad_id?: string | null
          especificaciones?: string | null
          estado_aprobacion?: string
          id?: string
          marca_id?: string | null
          margen_pct?: number
          nombre?: string
          numero_parte?: string | null
          precio?: number
          propiedad?: string
          regimen_laboral?: string
          subfamilia_id?: string | null
          sueldo_mensual?: number
          tipo?: string
          unidad?: string
          unidad_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "insumos_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias_insumo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insumos_especialidad_id_fkey"
            columns: ["especialidad_id"]
            isOneToOne: false
            referencedRelation: "especialidades_partida"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insumos_marca_id_fkey"
            columns: ["marca_id"]
            isOneToOne: false
            referencedRelation: "marcas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insumos_subfamilia_id_fkey"
            columns: ["subfamilia_id"]
            isOneToOne: false
            referencedRelation: "subfamilias_insumo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insumos_tipo_fkey"
            columns: ["tipo"]
            isOneToOne: false
            referencedRelation: "tipos_insumo"
            referencedColumns: ["clave"]
          },
          {
            foreignKeyName: "insumos_unidad_id_fkey"
            columns: ["unidad_id"]
            isOneToOne: false
            referencedRelation: "unidades_medida"
            referencedColumns: ["id"]
          },
        ]
      }
      insumos_aprobaciones: {
        Row: {
          accion: string
          fecha: string
          id: string
          insumo_id: string
          motivo: string | null
          usuario_id: string | null
        }
        Insert: {
          accion: string
          fecha?: string
          id?: string
          insumo_id: string
          motivo?: string | null
          usuario_id?: string | null
        }
        Update: {
          accion?: string
          fecha?: string
          id?: string
          insumo_id?: string
          motivo?: string | null
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "insumos_aprobaciones_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "epp_catalogo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insumos_aprobaciones_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "equipos_herramientas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insumos_aprobaciones_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "insumos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insumos_aprobaciones_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "mano_obra"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insumos_aprobaciones_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "materiales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insumos_aprobaciones_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "subcontratos"
            referencedColumns: ["id"]
          },
        ]
      }
      insumos_atributos_epp: {
        Row: {
          categoria: string
          criticidad: string
          insumo_id: string
          norma: string
          stock: number
          tallas: string
          vida_util_dias: number
        }
        Insert: {
          categoria?: string
          criticidad?: string
          insumo_id: string
          norma?: string
          stock?: number
          tallas?: string
          vida_util_dias?: number
        }
        Update: {
          categoria?: string
          criticidad?: string
          insumo_id?: string
          norma?: string
          stock?: number
          tallas?: string
          vida_util_dias?: number
        }
        Relationships: [
          {
            foreignKeyName: "insumos_atributos_epp_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: true
            referencedRelation: "epp_catalogo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insumos_atributos_epp_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: true
            referencedRelation: "equipos_herramientas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insumos_atributos_epp_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: true
            referencedRelation: "insumos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insumos_atributos_epp_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: true
            referencedRelation: "mano_obra"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insumos_atributos_epp_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: true
            referencedRelation: "materiales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insumos_atributos_epp_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: true
            referencedRelation: "subcontratos"
            referencedColumns: ["id"]
          },
        ]
      }
      insumos_modificaciones: {
        Row: {
          fecha: string
          id: string
          insumo_id: string
          usuario_id: string | null
        }
        Insert: {
          fecha?: string
          id?: string
          insumo_id: string
          usuario_id?: string | null
        }
        Update: {
          fecha?: string
          id?: string
          insumo_id?: string
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "insumos_modificaciones_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "epp_catalogo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insumos_modificaciones_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "equipos_herramientas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insumos_modificaciones_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "insumos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insumos_modificaciones_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "mano_obra"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insumos_modificaciones_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "materiales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insumos_modificaciones_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "subcontratos"
            referencedColumns: ["id"]
          },
        ]
      }
      integraciones_credenciales: {
        Row: {
          api_key: string
          proveedor: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          api_key: string
          proveedor: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          api_key?: string
          proveedor?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      mantenimientos_vehiculo: {
        Row: {
          banco_id: string | null
          caja_chica_id: string | null
          costo: number
          created_at: string
          detalle: string
          fecha: string
          id: string
          km: number
          numero_operacion: string
          origen_pago: string
          taller_id: string | null
          tipo: string
          updated_at: string
          vehiculo_id: string
        }
        Insert: {
          banco_id?: string | null
          caja_chica_id?: string | null
          costo?: number
          created_at?: string
          detalle?: string
          fecha?: string
          id?: string
          km?: number
          numero_operacion?: string
          origen_pago?: string
          taller_id?: string | null
          tipo?: string
          updated_at?: string
          vehiculo_id: string
        }
        Update: {
          banco_id?: string | null
          caja_chica_id?: string | null
          costo?: number
          created_at?: string
          detalle?: string
          fecha?: string
          id?: string
          km?: number
          numero_operacion?: string
          origen_pago?: string
          taller_id?: string | null
          tipo?: string
          updated_at?: string
          vehiculo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mantenimientos_vehiculo_banco_id_fkey"
            columns: ["banco_id"]
            isOneToOne: false
            referencedRelation: "bancos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mantenimientos_vehiculo_caja_chica_id_fkey"
            columns: ["caja_chica_id"]
            isOneToOne: false
            referencedRelation: "cajas_chicas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mantenimientos_vehiculo_taller_id_fkey"
            columns: ["taller_id"]
            isOneToOne: false
            referencedRelation: "terceros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mantenimientos_vehiculo_vehiculo_id_fkey"
            columns: ["vehiculo_id"]
            isOneToOne: false
            referencedRelation: "vehiculos"
            referencedColumns: ["id"]
          },
        ]
      }
      marcas: {
        Row: {
          activo: boolean
          created_at: string
          id: string
          nombre: string
          orden: number
          updated_at: string
        }
        Insert: {
          activo?: boolean
          created_at?: string
          id?: string
          nombre: string
          orden?: number
          updated_at?: string
        }
        Update: {
          activo?: boolean
          created_at?: string
          id?: string
          nombre?: string
          orden?: number
          updated_at?: string
        }
        Relationships: []
      }
      margenes_insumo: {
        Row: {
          margen_pct: number
          tipo: string
          updated_at: string
        }
        Insert: {
          margen_pct?: number
          tipo: string
          updated_at?: string
        }
        Update: {
          margen_pct?: number
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "margenes_insumo_tipo_fkey"
            columns: ["tipo"]
            isOneToOne: true
            referencedRelation: "tipos_insumo"
            referencedColumns: ["clave"]
          },
        ]
      }
      metas_flujo_caja: {
        Row: {
          anio: number
          created_at: string
          id: string
          mes: number
          meta_costo: number
          meta_ingreso: number
          notas: string
          updated_at: string
        }
        Insert: {
          anio: number
          created_at?: string
          id?: string
          mes: number
          meta_costo?: number
          meta_ingreso?: number
          notas?: string
          updated_at?: string
        }
        Update: {
          anio?: number
          created_at?: string
          id?: string
          mes?: number
          meta_costo?: number
          meta_ingreso?: number
          notas?: string
          updated_at?: string
        }
        Relationships: []
      }
      movimientos_almacen: {
        Row: {
          cantidad: number
          costo_unitario: number
          creado_por: string | null
          created_at: string
          descripcion: string
          documento: string
          estado: string
          fecha: string
          id: string
          insumo_id: string | null
          motivo: string
          observacion: string
          orden_item_id: string | null
          partida_id: string | null
          proyecto_id: string | null
          recibido_en: string | null
          recibido_por: string | null
          tipo: string
          trabajador_id: string | null
          transferencia_id: string | null
          unidad: string
          vale_id: string | null
        }
        Insert: {
          cantidad: number
          costo_unitario?: number
          creado_por?: string | null
          created_at?: string
          descripcion: string
          documento?: string
          estado?: string
          fecha?: string
          id?: string
          insumo_id?: string | null
          motivo?: string
          observacion?: string
          orden_item_id?: string | null
          partida_id?: string | null
          proyecto_id?: string | null
          recibido_en?: string | null
          recibido_por?: string | null
          tipo: string
          trabajador_id?: string | null
          transferencia_id?: string | null
          unidad?: string
          vale_id?: string | null
        }
        Update: {
          cantidad?: number
          costo_unitario?: number
          creado_por?: string | null
          created_at?: string
          descripcion?: string
          documento?: string
          estado?: string
          fecha?: string
          id?: string
          insumo_id?: string | null
          motivo?: string
          observacion?: string
          orden_item_id?: string | null
          partida_id?: string | null
          proyecto_id?: string | null
          recibido_en?: string | null
          recibido_por?: string | null
          tipo?: string
          trabajador_id?: string | null
          transferencia_id?: string | null
          unidad?: string
          vale_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "movimientos_almacen_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "epp_catalogo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimientos_almacen_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "equipos_herramientas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimientos_almacen_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "insumos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimientos_almacen_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "mano_obra"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimientos_almacen_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "materiales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimientos_almacen_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "subcontratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimientos_almacen_orden_item_id_fkey"
            columns: ["orden_item_id"]
            isOneToOne: false
            referencedRelation: "orden_compra_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimientos_almacen_partida_id_fkey"
            columns: ["partida_id"]
            isOneToOne: false
            referencedRelation: "partidas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimientos_almacen_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "proyectos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimientos_almacen_trabajador_id_fkey"
            columns: ["trabajador_id"]
            isOneToOne: false
            referencedRelation: "trabajadores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimientos_almacen_vale_fk"
            columns: ["vale_id"]
            isOneToOne: false
            referencedRelation: "vales_salida"
            referencedColumns: ["id"]
          },
        ]
      }
      movimientos_detracciones: {
        Row: {
          banco_id: string
          concepto: string
          creado_por: string | null
          created_at: string
          fecha: string
          id: string
          monto: number
          notas: string | null
          numero_operacion: string
          periodo: string | null
          tipo: string
        }
        Insert: {
          banco_id: string
          concepto: string
          creado_por?: string | null
          created_at?: string
          fecha?: string
          id?: string
          monto: number
          notas?: string | null
          numero_operacion: string
          periodo?: string | null
          tipo: string
        }
        Update: {
          banco_id?: string
          concepto?: string
          creado_por?: string | null
          created_at?: string
          fecha?: string
          id?: string
          monto?: number
          notas?: string | null
          numero_operacion?: string
          periodo?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "movimientos_detracciones_banco_id_fkey"
            columns: ["banco_id"]
            isOneToOne: false
            referencedRelation: "bancos"
            referencedColumns: ["id"]
          },
        ]
      }
      normativa_rmv: {
        Row: {
          base_legal: string
          created_at: string
          id: string
          monto: number
          observaciones: string | null
          updated_at: string
          vigencia_desde: string
        }
        Insert: {
          base_legal?: string
          created_at?: string
          id?: string
          monto: number
          observaciones?: string | null
          updated_at?: string
          vigencia_desde: string
        }
        Update: {
          base_legal?: string
          created_at?: string
          id?: string
          monto?: number
          observaciones?: string | null
          updated_at?: string
          vigencia_desde?: string
        }
        Relationships: []
      }
      normativa_uit: {
        Row: {
          anio: number
          base_legal: string
          created_at: string
          id: string
          monto: number
          observaciones: string | null
          updated_at: string
        }
        Insert: {
          anio: number
          base_legal?: string
          created_at?: string
          id?: string
          monto: number
          observaciones?: string | null
          updated_at?: string
        }
        Update: {
          anio?: number
          base_legal?: string
          created_at?: string
          id?: string
          monto?: number
          observaciones?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      orden_compra_items: {
        Row: {
          cantidad: number
          created_at: string
          descripcion: string
          id: string
          insumo_id: string | null
          orden_id: string
          precio_unitario: number
          requerimiento_item_id: string | null
          unidad: string
        }
        Insert: {
          cantidad?: number
          created_at?: string
          descripcion: string
          id?: string
          insumo_id?: string | null
          orden_id: string
          precio_unitario?: number
          requerimiento_item_id?: string | null
          unidad?: string
        }
        Update: {
          cantidad?: number
          created_at?: string
          descripcion?: string
          id?: string
          insumo_id?: string | null
          orden_id?: string
          precio_unitario?: number
          requerimiento_item_id?: string | null
          unidad?: string
        }
        Relationships: [
          {
            foreignKeyName: "orden_compra_items_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "epp_catalogo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orden_compra_items_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "equipos_herramientas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orden_compra_items_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "insumos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orden_compra_items_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "mano_obra"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orden_compra_items_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "materiales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orden_compra_items_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "subcontratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orden_compra_items_orden_id_fkey"
            columns: ["orden_id"]
            isOneToOne: false
            referencedRelation: "ordenes_compra"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orden_compra_items_requerimiento_item_id_fkey"
            columns: ["requerimiento_item_id"]
            isOneToOne: false
            referencedRelation: "requerimiento_items"
            referencedColumns: ["id"]
          },
        ]
      }
      ordenes_compra: {
        Row: {
          almacen_destino_id: string | null
          codigo: string
          condicion_pago: string
          created_at: string
          estado: string
          fecha: string
          fecha_entrega: string | null
          id: string
          observacion: string
          proveedor_id: string | null
          proyecto_id: string | null
          requerimiento_id: string | null
          rubro: string | null
          updated_at: string
        }
        Insert: {
          almacen_destino_id?: string | null
          codigo?: string
          condicion_pago?: string
          created_at?: string
          estado?: string
          fecha?: string
          fecha_entrega?: string | null
          id?: string
          observacion?: string
          proveedor_id?: string | null
          proyecto_id?: string | null
          requerimiento_id?: string | null
          rubro?: string | null
          updated_at?: string
        }
        Update: {
          almacen_destino_id?: string | null
          codigo?: string
          condicion_pago?: string
          created_at?: string
          estado?: string
          fecha?: string
          fecha_entrega?: string | null
          id?: string
          observacion?: string
          proveedor_id?: string | null
          proyecto_id?: string | null
          requerimiento_id?: string | null
          rubro?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ordenes_compra_almacen_destino_id_fkey"
            columns: ["almacen_destino_id"]
            isOneToOne: false
            referencedRelation: "almacenes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordenes_compra_proveedor_id_fkey"
            columns: ["proveedor_id"]
            isOneToOne: false
            referencedRelation: "terceros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordenes_compra_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "proyectos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordenes_compra_requerimiento_id_fkey"
            columns: ["requerimiento_id"]
            isOneToOne: false
            referencedRelation: "requerimientos"
            referencedColumns: ["id"]
          },
        ]
      }
      pagos_estado: {
        Row: {
          anio: number
          banco_id: string | null
          concepto: string
          created_at: string
          fecha_pago: string
          id: string
          mes: number
          monto: number
          numero_operacion: string
        }
        Insert: {
          anio: number
          banco_id?: string | null
          concepto: string
          created_at?: string
          fecha_pago?: string
          id?: string
          mes: number
          monto?: number
          numero_operacion?: string
        }
        Update: {
          anio?: number
          banco_id?: string | null
          concepto?: string
          created_at?: string
          fecha_pago?: string
          id?: string
          mes?: number
          monto?: number
          numero_operacion?: string
        }
        Relationships: [
          {
            foreignKeyName: "pagos_estado_banco_id_fkey"
            columns: ["banco_id"]
            isOneToOne: false
            referencedRelation: "bancos"
            referencedColumns: ["id"]
          },
        ]
      }
      parametros_laborales: {
        Row: {
          buc_oficial_pct: number
          buc_operario_pct: number
          buc_peon_pct: number
          created_at: string
          essalud_pct: number
          feriados_anuales: number
          herramienta_pct: number
          horas_semanales: number
          id: string
          jornal_oficial: number
          jornal_operario: number
          jornal_peon: number
          pasaje_diario: number
          rmv: number
          sctr_pct: number
          updated_at: string
          vida_ley_pct: number
        }
        Insert: {
          buc_oficial_pct?: number
          buc_operario_pct?: number
          buc_peon_pct?: number
          created_at?: string
          essalud_pct?: number
          feriados_anuales?: number
          herramienta_pct?: number
          horas_semanales?: number
          id?: string
          jornal_oficial?: number
          jornal_operario?: number
          jornal_peon?: number
          pasaje_diario?: number
          rmv?: number
          sctr_pct?: number
          updated_at?: string
          vida_ley_pct?: number
        }
        Update: {
          buc_oficial_pct?: number
          buc_operario_pct?: number
          buc_peon_pct?: number
          created_at?: string
          essalud_pct?: number
          feriados_anuales?: number
          herramienta_pct?: number
          horas_semanales?: number
          id?: string
          jornal_oficial?: number
          jornal_operario?: number
          jornal_peon?: number
          pasaje_diario?: number
          rmv?: number
          sctr_pct?: number
          updated_at?: string
          vida_ley_pct?: number
        }
        Relationships: []
      }
      partida_detalle: {
        Row: {
          cantidad_o_cuadrilla: number
          created_at: string
          equipo_id: string | null
          id: string
          insumo_id: string | null
          mano_obra_id: string | null
          material_id: string | null
          orden: number
          partida_obra_id: string | null
          partida_padre_id: string | null
          subcontrato_id: string | null
          subpartida_hijo_id: string | null
        }
        Insert: {
          cantidad_o_cuadrilla?: number
          created_at?: string
          equipo_id?: string | null
          id?: string
          insumo_id?: string | null
          mano_obra_id?: string | null
          material_id?: string | null
          orden?: number
          partida_obra_id?: string | null
          partida_padre_id?: string | null
          subcontrato_id?: string | null
          subpartida_hijo_id?: string | null
        }
        Update: {
          cantidad_o_cuadrilla?: number
          created_at?: string
          equipo_id?: string | null
          id?: string
          insumo_id?: string | null
          mano_obra_id?: string | null
          material_id?: string | null
          orden?: number
          partida_obra_id?: string | null
          partida_padre_id?: string | null
          subcontrato_id?: string | null
          subpartida_hijo_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partida_detalle_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "epp_catalogo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partida_detalle_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "equipos_herramientas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partida_detalle_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "insumos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partida_detalle_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "mano_obra"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partida_detalle_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "materiales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partida_detalle_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "subcontratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partida_detalle_partida_obra_id_fkey"
            columns: ["partida_obra_id"]
            isOneToOne: false
            referencedRelation: "partidas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partida_detalle_partida_padre_id_fkey"
            columns: ["partida_padre_id"]
            isOneToOne: false
            referencedRelation: "partidas_apu"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partida_detalle_subpartida_hijo_id_fkey"
            columns: ["subpartida_hijo_id"]
            isOneToOne: false
            referencedRelation: "partidas_apu"
            referencedColumns: ["id"]
          },
        ]
      }
      partidas: {
        Row: {
          aplica_gg: boolean
          aplica_gg_utilidad: boolean
          aplica_utilidad: boolean
          avance_pct: number
          categoria: string
          codigo: string
          created_at: string
          especialidad: string
          id: string
          jornada: number
          marca: string
          metrado: number
          nombre: string
          padre_id: string | null
          partida_apu_id: string | null
          pct_herramientas: number
          precio_unitario: number
          presupuesto_inicial: number
          prioridad: string
          proyecto_id: string
          rendimiento: number
          situacion: string
          tipo_presupuesto: string
          unidad: string
        }
        Insert: {
          aplica_gg?: boolean
          aplica_gg_utilidad?: boolean
          aplica_utilidad?: boolean
          avance_pct?: number
          categoria?: string
          codigo?: string
          created_at?: string
          especialidad: string
          id?: string
          jornada?: number
          marca?: string
          metrado?: number
          nombre: string
          padre_id?: string | null
          partida_apu_id?: string | null
          pct_herramientas?: number
          precio_unitario?: number
          presupuesto_inicial?: number
          prioridad?: string
          proyecto_id: string
          rendimiento?: number
          situacion?: string
          tipo_presupuesto?: string
          unidad?: string
        }
        Update: {
          aplica_gg?: boolean
          aplica_gg_utilidad?: boolean
          aplica_utilidad?: boolean
          avance_pct?: number
          categoria?: string
          codigo?: string
          created_at?: string
          especialidad?: string
          id?: string
          jornada?: number
          marca?: string
          metrado?: number
          nombre?: string
          padre_id?: string | null
          partida_apu_id?: string | null
          pct_herramientas?: number
          precio_unitario?: number
          presupuesto_inicial?: number
          prioridad?: string
          proyecto_id?: string
          rendimiento?: number
          situacion?: string
          tipo_presupuesto?: string
          unidad?: string
        }
        Relationships: [
          {
            foreignKeyName: "partidas_padre_id_fkey"
            columns: ["padre_id"]
            isOneToOne: false
            referencedRelation: "partidas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partidas_partida_apu_id_fkey"
            columns: ["partida_apu_id"]
            isOneToOne: false
            referencedRelation: "partidas_apu"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partidas_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "proyectos"
            referencedColumns: ["id"]
          },
        ]
      }
      partidas_apu: {
        Row: {
          codigo_jerarquico: string
          created_at: string
          descripcion: string
          especialidad: string
          especificaciones: string | null
          estado: string
          id: string
          pct_herramientas: number
          rendimiento_diario: number
          unidad: string
          updated_at: string
        }
        Insert: {
          codigo_jerarquico?: string
          created_at?: string
          descripcion: string
          especialidad?: string
          especificaciones?: string | null
          estado?: string
          id?: string
          pct_herramientas?: number
          rendimiento_diario?: number
          unidad?: string
          updated_at?: string
        }
        Update: {
          codigo_jerarquico?: string
          created_at?: string
          descripcion?: string
          especialidad?: string
          especificaciones?: string | null
          estado?: string
          id?: string
          pct_herramientas?: number
          rendimiento_diario?: number
          unidad?: string
          updated_at?: string
        }
        Relationships: []
      }
      partidas_apu_metrado: {
        Row: {
          cantidad: number
          concepto: string
          created_at: string
          id: string
          observacion: string
          orden: number
          partida_id: string
          unidad: string
          updated_at: string
        }
        Insert: {
          cantidad?: number
          concepto?: string
          created_at?: string
          id?: string
          observacion?: string
          orden?: number
          partida_id: string
          unidad?: string
          updated_at?: string
        }
        Update: {
          cantidad?: number
          concepto?: string
          created_at?: string
          id?: string
          observacion?: string
          orden?: number
          partida_id?: string
          unidad?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partidas_apu_metrado_partida_id_fkey"
            columns: ["partida_id"]
            isOneToOne: false
            referencedRelation: "partidas_apu"
            referencedColumns: ["id"]
          },
        ]
      }
      partidas_maestras: {
        Row: {
          activo: boolean
          categoria: string
          codigo: string
          created_at: string
          especialidad: string
          id: string
          jornada: number
          marca: string
          nombre: string
          orden: number
          pct_herramientas: number
          precio_unitario: number
          rendimiento: number
          tipo_partida: string
          unidad: string
          updated_at: string
        }
        Insert: {
          activo?: boolean
          categoria?: string
          codigo?: string
          created_at?: string
          especialidad?: string
          id?: string
          jornada?: number
          marca?: string
          nombre: string
          orden?: number
          pct_herramientas?: number
          precio_unitario?: number
          rendimiento?: number
          tipo_partida?: string
          unidad?: string
          updated_at?: string
        }
        Update: {
          activo?: boolean
          categoria?: string
          codigo?: string
          created_at?: string
          especialidad?: string
          id?: string
          jornada?: number
          marca?: string
          nombre?: string
          orden?: number
          pct_herramientas?: number
          precio_unitario?: number
          rendimiento?: number
          tipo_partida?: string
          unidad?: string
          updated_at?: string
        }
        Relationships: []
      }
      plan_mantenimiento: {
        Row: {
          activo: boolean
          cada_km: number | null
          cada_meses: number | null
          created_at: string
          descripcion: string
          id: string
          proxima_fecha: string | null
          proximo_km: number | null
          ultima_fecha: string | null
          ultimo_km: number
          updated_at: string
          vehiculo_id: string
        }
        Insert: {
          activo?: boolean
          cada_km?: number | null
          cada_meses?: number | null
          created_at?: string
          descripcion: string
          id?: string
          proxima_fecha?: string | null
          proximo_km?: number | null
          ultima_fecha?: string | null
          ultimo_km?: number
          updated_at?: string
          vehiculo_id: string
        }
        Update: {
          activo?: boolean
          cada_km?: number | null
          cada_meses?: number | null
          created_at?: string
          descripcion?: string
          id?: string
          proxima_fecha?: string | null
          proximo_km?: number | null
          ultima_fecha?: string | null
          ultimo_km?: number
          updated_at?: string
          vehiculo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_mantenimiento_vehiculo_id_fkey"
            columns: ["vehiculo_id"]
            isOneToOne: false
            referencedRelation: "vehiculos"
            referencedColumns: ["id"]
          },
        ]
      }
      planillas: {
        Row: {
          anio: number
          created_at: string
          estado: string
          id: string
          mes: number
          updated_at: string
        }
        Insert: {
          anio: number
          created_at?: string
          estado?: string
          id?: string
          mes: number
          updated_at?: string
        }
        Update: {
          anio?: number
          created_at?: string
          estado?: string
          id?: string
          mes?: number
          updated_at?: string
        }
        Relationships: []
      }
      plantilla_cotizacion_items: {
        Row: {
          categoria: string
          codigo: string
          created_at: string
          especialidad: string
          grupo: string
          id: string
          marca: string
          metrado: number
          nivel: string
          nombre: string
          orden: number
          padre_id: string | null
          plantilla_id: string
          precio_unitario: number
          tipo: string
          unidad: string
        }
        Insert: {
          categoria?: string
          codigo?: string
          created_at?: string
          especialidad?: string
          grupo?: string
          id?: string
          marca?: string
          metrado?: number
          nivel?: string
          nombre?: string
          orden?: number
          padre_id?: string | null
          plantilla_id: string
          precio_unitario?: number
          tipo?: string
          unidad?: string
        }
        Update: {
          categoria?: string
          codigo?: string
          created_at?: string
          especialidad?: string
          grupo?: string
          id?: string
          marca?: string
          metrado?: number
          nivel?: string
          nombre?: string
          orden?: number
          padre_id?: string | null
          plantilla_id?: string
          precio_unitario?: number
          tipo?: string
          unidad?: string
        }
        Relationships: [
          {
            foreignKeyName: "plantilla_cotizacion_items_padre_id_fkey"
            columns: ["padre_id"]
            isOneToOne: false
            referencedRelation: "plantilla_cotizacion_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plantilla_cotizacion_items_plantilla_id_fkey"
            columns: ["plantilla_id"]
            isOneToOne: false
            referencedRelation: "plantillas_cotizacion"
            referencedColumns: ["id"]
          },
        ]
      }
      plantillas_cotizacion: {
        Row: {
          alcance: string
          condiciones: string
          condiciones_pago: string
          created_at: string
          descripcion: string
          id: string
          multidisciplinaria: boolean
          nombre: string
          pct_gastos_generales: number
          pct_utilidad: number
          recursos_humanos: string
          tiempo_ejecucion: string
          updated_at: string
        }
        Insert: {
          alcance?: string
          condiciones?: string
          condiciones_pago?: string
          created_at?: string
          descripcion?: string
          id?: string
          multidisciplinaria?: boolean
          nombre: string
          pct_gastos_generales?: number
          pct_utilidad?: number
          recursos_humanos?: string
          tiempo_ejecucion?: string
          updated_at?: string
        }
        Update: {
          alcance?: string
          condiciones?: string
          condiciones_pago?: string
          created_at?: string
          descripcion?: string
          id?: string
          multidisciplinaria?: boolean
          nombre?: string
          pct_gastos_generales?: number
          pct_utilidad?: number
          recursos_humanos?: string
          tiempo_ejecucion?: string
          updated_at?: string
        }
        Relationships: []
      }
      preliquidacion_items: {
        Row: {
          cantidad: number
          created_at: string
          descripcion: string
          id: string
          orden: number
          precio_unitario: number
          preliquidacion_id: string
          unidad: string
        }
        Insert: {
          cantidad?: number
          created_at?: string
          descripcion?: string
          id?: string
          orden?: number
          precio_unitario?: number
          preliquidacion_id: string
          unidad?: string
        }
        Update: {
          cantidad?: number
          created_at?: string
          descripcion?: string
          id?: string
          orden?: number
          precio_unitario?: number
          preliquidacion_id?: string
          unidad?: string
        }
        Relationships: [
          {
            foreignKeyName: "preliquidacion_items_preliquidacion_id_fkey"
            columns: ["preliquidacion_id"]
            isOneToOne: false
            referencedRelation: "preliquidaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      preliquidaciones: {
        Row: {
          amortizacion: number
          cliente_id: string | null
          codigo: string
          concepto: string
          condicion_pago: string
          created_at: string
          dias_credito: number
          estado: string
          fecha: string
          fecha_vencimiento: string | null
          id: string
          moneda: Database["public"]["Enums"]["moneda"]
          observacion: string
          orden_compra: string
          pct_detraccion: number
          proyecto_id: string | null
          tipo_cambio: number
          tipo_tributario: string
          updated_at: string
        }
        Insert: {
          amortizacion?: number
          cliente_id?: string | null
          codigo: string
          concepto?: string
          condicion_pago?: string
          created_at?: string
          dias_credito?: number
          estado?: string
          fecha?: string
          fecha_vencimiento?: string | null
          id?: string
          moneda?: Database["public"]["Enums"]["moneda"]
          observacion?: string
          orden_compra?: string
          pct_detraccion?: number
          proyecto_id?: string | null
          tipo_cambio?: number
          tipo_tributario?: string
          updated_at?: string
        }
        Update: {
          amortizacion?: number
          cliente_id?: string | null
          codigo?: string
          concepto?: string
          condicion_pago?: string
          created_at?: string
          dias_credito?: number
          estado?: string
          fecha?: string
          fecha_vencimiento?: string | null
          id?: string
          moneda?: Database["public"]["Enums"]["moneda"]
          observacion?: string
          orden_compra?: string
          pct_detraccion?: number
          proyecto_id?: string | null
          tipo_cambio?: number
          tipo_tributario?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "preliquidaciones_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "terceros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "preliquidaciones_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "proyectos"
            referencedColumns: ["id"]
          },
        ]
      }
      prioridades: {
        Row: {
          activo: boolean
          created_at: string
          id: string
          nombre: string
          orden: number
          updated_at: string
        }
        Insert: {
          activo?: boolean
          created_at?: string
          id?: string
          nombre: string
          orden?: number
          updated_at?: string
        }
        Update: {
          activo?: boolean
          created_at?: string
          id?: string
          nombre?: string
          orden?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          id: string
          nombre: string
        }
        Insert: {
          created_at?: string
          email?: string
          id: string
          nombre?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          nombre?: string
        }
        Relationships: []
      }
      proyectos: {
        Row: {
          archivado_en: string | null
          avance_programado_pct: number | null
          cd_base: number | null
          cliente: string
          codigo: string | null
          created_at: string
          documento_numero: string
          documento_tipo: string
          estado: Database["public"]["Enums"]["estado_proyecto"]
          fecha_corte_programado: string | null
          fecha_fin: string | null
          fecha_inicio: string | null
          id: string
          nombre: string
          pct_gastos_generales: number
          pct_utilidad: number
          periodicidad_cronograma: string
          responsable_id: string | null
          situacion: string
          ubicacion: string
        }
        Insert: {
          archivado_en?: string | null
          avance_programado_pct?: number | null
          cd_base?: number | null
          cliente?: string
          codigo?: string | null
          created_at?: string
          documento_numero?: string
          documento_tipo?: string
          estado?: Database["public"]["Enums"]["estado_proyecto"]
          fecha_corte_programado?: string | null
          fecha_fin?: string | null
          fecha_inicio?: string | null
          id?: string
          nombre: string
          pct_gastos_generales?: number
          pct_utilidad?: number
          periodicidad_cronograma?: string
          responsable_id?: string | null
          situacion?: string
          ubicacion?: string
        }
        Update: {
          archivado_en?: string | null
          avance_programado_pct?: number | null
          cd_base?: number | null
          cliente?: string
          codigo?: string | null
          created_at?: string
          documento_numero?: string
          documento_tipo?: string
          estado?: Database["public"]["Enums"]["estado_proyecto"]
          fecha_corte_programado?: string | null
          fecha_fin?: string | null
          fecha_inicio?: string | null
          id?: string
          nombre?: string
          pct_gastos_generales?: number
          pct_utilidad?: number
          periodicidad_cronograma?: string
          responsable_id?: string | null
          situacion?: string
          ubicacion?: string
        }
        Relationships: [
          {
            foreignKeyName: "proyectos_responsable_id_fkey"
            columns: ["responsable_id"]
            isOneToOne: false
            referencedRelation: "trabajadores"
            referencedColumns: ["id"]
          },
        ]
      }
      recibos_honorarios: {
        Row: {
          adelantos: number
          anio: number
          banco_id: string | null
          concepto: string
          costo_unitario: number
          created_at: string
          descuento_herramientas: number
          devolucion_gastos: number
          dias_laborados: number
          dias_viaje: number
          estado_pago: string
          fecha_emision: string
          fecha_pago: string | null
          fondo_pensiones: number
          horas_extras: number
          id: string
          induccion: number
          lugar_emision: string
          mes: number
          monto_bruto: number
          monto_neto: number
          numero_operacion: string
          numero_recibo: string | null
          otros_remuneraciones: number
          pagos_a_cuenta_planilla: number
          proyecto_id: string | null
          retencion: number
          saldo_mes_anterior: number
          trabajador_id: string
          updated_at: string
        }
        Insert: {
          adelantos?: number
          anio?: number
          banco_id?: string | null
          concepto?: string
          costo_unitario?: number
          created_at?: string
          descuento_herramientas?: number
          devolucion_gastos?: number
          dias_laborados?: number
          dias_viaje?: number
          estado_pago?: string
          fecha_emision?: string
          fecha_pago?: string | null
          fondo_pensiones?: number
          horas_extras?: number
          id?: string
          induccion?: number
          lugar_emision?: string
          mes?: number
          monto_bruto: number
          monto_neto: number
          numero_operacion?: string
          numero_recibo?: string | null
          otros_remuneraciones?: number
          pagos_a_cuenta_planilla?: number
          proyecto_id?: string | null
          retencion?: number
          saldo_mes_anterior?: number
          trabajador_id: string
          updated_at?: string
        }
        Update: {
          adelantos?: number
          anio?: number
          banco_id?: string | null
          concepto?: string
          costo_unitario?: number
          created_at?: string
          descuento_herramientas?: number
          devolucion_gastos?: number
          dias_laborados?: number
          dias_viaje?: number
          estado_pago?: string
          fecha_emision?: string
          fecha_pago?: string | null
          fondo_pensiones?: number
          horas_extras?: number
          id?: string
          induccion?: number
          lugar_emision?: string
          mes?: number
          monto_bruto?: number
          monto_neto?: number
          numero_operacion?: string
          numero_recibo?: string | null
          otros_remuneraciones?: number
          pagos_a_cuenta_planilla?: number
          proyecto_id?: string | null
          retencion?: number
          saldo_mes_anterior?: number
          trabajador_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recibos_honorarios_banco_id_fkey"
            columns: ["banco_id"]
            isOneToOne: false
            referencedRelation: "bancos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recibos_honorarios_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "proyectos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recibos_honorarios_trabajador_id_fkey"
            columns: ["trabajador_id"]
            isOneToOne: false
            referencedRelation: "trabajadores"
            referencedColumns: ["id"]
          },
        ]
      }
      regimenes_empresa: {
        Row: {
          created_at: string
          fecha_inicio: string
          id: string
          notas: string | null
          regimen: string
          remype_certificado: string | null
          remype_numero: string | null
        }
        Insert: {
          created_at?: string
          fecha_inicio: string
          id?: string
          notas?: string | null
          regimen: string
          remype_certificado?: string | null
          remype_numero?: string | null
        }
        Update: {
          created_at?: string
          fecha_inicio?: string
          id?: string
          notas?: string | null
          regimen?: string
          remype_certificado?: string | null
          remype_numero?: string | null
        }
        Relationships: []
      }
      requerimiento_item_origenes: {
        Row: {
          cantidad: number
          cantidad_unitaria: number
          cotizacion_item_id: string | null
          created_at: string
          id: string
          metrado: number
          partida_codigo: string
          partida_nombre: string
          requerimiento_item_id: string
        }
        Insert: {
          cantidad?: number
          cantidad_unitaria?: number
          cotizacion_item_id?: string | null
          created_at?: string
          id?: string
          metrado?: number
          partida_codigo?: string
          partida_nombre?: string
          requerimiento_item_id: string
        }
        Update: {
          cantidad?: number
          cantidad_unitaria?: number
          cotizacion_item_id?: string | null
          created_at?: string
          id?: string
          metrado?: number
          partida_codigo?: string
          partida_nombre?: string
          requerimiento_item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "requerimiento_item_origenes_cotizacion_item_fk"
            columns: ["cotizacion_item_id"]
            isOneToOne: false
            referencedRelation: "cotizacion_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requerimiento_item_origenes_requerimiento_item_id_fkey"
            columns: ["requerimiento_item_id"]
            isOneToOne: false
            referencedRelation: "requerimiento_items"
            referencedColumns: ["id"]
          },
        ]
      }
      requerimiento_items: {
        Row: {
          cantidad: number
          created_at: string
          descripcion: string
          id: string
          insumo_id: string | null
          precio_referencial: number
          requerimiento_id: string
          tipo: string
          unidad: string
        }
        Insert: {
          cantidad?: number
          created_at?: string
          descripcion: string
          id?: string
          insumo_id?: string | null
          precio_referencial?: number
          requerimiento_id: string
          tipo?: string
          unidad?: string
        }
        Update: {
          cantidad?: number
          created_at?: string
          descripcion?: string
          id?: string
          insumo_id?: string | null
          precio_referencial?: number
          requerimiento_id?: string
          tipo?: string
          unidad?: string
        }
        Relationships: [
          {
            foreignKeyName: "requerimiento_items_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "epp_catalogo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requerimiento_items_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "equipos_herramientas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requerimiento_items_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "insumos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requerimiento_items_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "mano_obra"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requerimiento_items_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "materiales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requerimiento_items_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "subcontratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requerimiento_items_requerimiento_id_fkey"
            columns: ["requerimiento_id"]
            isOneToOne: false
            referencedRelation: "requerimientos"
            referencedColumns: ["id"]
          },
        ]
      }
      requerimientos: {
        Row: {
          aprobado_en: string | null
          aprobado_por: string | null
          clase: string
          codigo: string
          cotizacion_id: string | null
          creado_por: string | null
          created_at: string
          estado: string
          fecha: string
          id: string
          motivo_rechazo: string
          observacion: string
          origen: string
          proyecto_id: string | null
          rubro: string | null
          tdr: Json
          updated_at: string
        }
        Insert: {
          aprobado_en?: string | null
          aprobado_por?: string | null
          clase?: string
          codigo?: string
          cotizacion_id?: string | null
          creado_por?: string | null
          created_at?: string
          estado?: string
          fecha?: string
          id?: string
          motivo_rechazo?: string
          observacion?: string
          origen?: string
          proyecto_id?: string | null
          rubro?: string | null
          tdr?: Json
          updated_at?: string
        }
        Update: {
          aprobado_en?: string | null
          aprobado_por?: string | null
          clase?: string
          codigo?: string
          cotizacion_id?: string | null
          creado_por?: string | null
          created_at?: string
          estado?: string
          fecha?: string
          id?: string
          motivo_rechazo?: string
          observacion?: string
          origen?: string
          proyecto_id?: string | null
          rubro?: string | null
          tdr?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "requerimientos_cotizacion_id_fkey"
            columns: ["cotizacion_id"]
            isOneToOne: false
            referencedRelation: "cotizaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requerimientos_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "proyectos"
            referencedColumns: ["id"]
          },
        ]
      }
      respaldo_textos: {
        Row: {
          columna: string
          created_at: string
          fila_id: string
          id: number
          tabla: string
          valor: string | null
        }
        Insert: {
          columna: string
          created_at?: string
          fila_id: string
          id?: number
          tabla: string
          valor?: string | null
        }
        Update: {
          columna?: string
          created_at?: string
          fila_id?: string
          id?: number
          tabla?: string
          valor?: string | null
        }
        Relationships: []
      }
      rubros_ingreso: {
        Row: {
          activo: boolean
          created_at: string
          descripcion: string
          id: string
          nombre: string
          orden: number
          updated_at: string
        }
        Insert: {
          activo?: boolean
          created_at?: string
          descripcion?: string
          id?: string
          nombre: string
          orden?: number
          updated_at?: string
        }
        Update: {
          activo?: boolean
          created_at?: string
          descripcion?: string
          id?: string
          nombre?: string
          orden?: number
          updated_at?: string
        }
        Relationships: []
      }
      series_comprobante: {
        Row: {
          activo: boolean
          correlativo_actual: number
          created_at: string
          id: string
          serie: string
          tipo_comprobante: string
          updated_at: string
        }
        Insert: {
          activo?: boolean
          correlativo_actual?: number
          created_at?: string
          id?: string
          serie: string
          tipo_comprobante: string
          updated_at?: string
        }
        Update: {
          activo?: boolean
          correlativo_actual?: number
          created_at?: string
          id?: string
          serie?: string
          tipo_comprobante?: string
          updated_at?: string
        }
        Relationships: []
      }
      sire_config: {
        Row: {
          client_id: string
          created_at: string
          id: string
          ruc: string
          tiene_clave: boolean
          tiene_secret: boolean
          updated_at: string
          usuario_sol: string
        }
        Insert: {
          client_id?: string
          created_at?: string
          id?: string
          ruc?: string
          tiene_clave?: boolean
          tiene_secret?: boolean
          updated_at?: string
          usuario_sol?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          ruc?: string
          tiene_clave?: boolean
          tiene_secret?: boolean
          updated_at?: string
          usuario_sol?: string
        }
        Relationships: []
      }
      sire_credenciales: {
        Row: {
          clave_sol: string | null
          client_secret: string | null
          id: string
          updated_at: string
        }
        Insert: {
          clave_sol?: string | null
          client_secret?: string | null
          id?: string
          updated_at?: string
        }
        Update: {
          clave_sol?: string | null
          client_secret?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      sire_periodos: {
        Row: {
          aceptado_en: string | null
          aceptado_por: string | null
          created_at: string
          estado: string
          id: string
          items: Json
          libro: string
          origen: string
          periodo: string
          sincronizado_en: string | null
          ticket: string | null
          total_base: number
          total_docs: number
          total_igv: number
          updated_at: string
        }
        Insert: {
          aceptado_en?: string | null
          aceptado_por?: string | null
          created_at?: string
          estado?: string
          id?: string
          items?: Json
          libro: string
          origen?: string
          periodo: string
          sincronizado_en?: string | null
          ticket?: string | null
          total_base?: number
          total_docs?: number
          total_igv?: number
          updated_at?: string
        }
        Update: {
          aceptado_en?: string | null
          aceptado_por?: string | null
          created_at?: string
          estado?: string
          id?: string
          items?: Json
          libro?: string
          origen?: string
          periodo?: string
          sincronizado_en?: string | null
          ticket?: string | null
          total_base?: number
          total_docs?: number
          total_igv?: number
          updated_at?: string
        }
        Relationships: []
      }
      solicitud_cotizacion_items: {
        Row: {
          cantidad: number
          created_at: string
          id: string
          precio_unitario: number
          requerimiento_item_id: string
          solicitud_id: string
        }
        Insert: {
          cantidad?: number
          created_at?: string
          id?: string
          precio_unitario?: number
          requerimiento_item_id: string
          solicitud_id: string
        }
        Update: {
          cantidad?: number
          created_at?: string
          id?: string
          precio_unitario?: number
          requerimiento_item_id?: string
          solicitud_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "solicitud_cotizacion_items_requerimiento_item_id_fkey"
            columns: ["requerimiento_item_id"]
            isOneToOne: false
            referencedRelation: "requerimiento_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitud_cotizacion_items_solicitud_id_fkey"
            columns: ["solicitud_id"]
            isOneToOne: false
            referencedRelation: "solicitudes_cotizacion"
            referencedColumns: ["id"]
          },
        ]
      }
      solicitudes_cotizacion: {
        Row: {
          codigo: string
          condiciones: string
          creado_por: string | null
          created_at: string
          estado: string
          fecha: string
          id: string
          moneda: string
          observacion: string
          orden_id: string | null
          plazo_entrega: string
          proveedor_id: string
          requerimiento_id: string
        }
        Insert: {
          codigo?: string
          condiciones?: string
          creado_por?: string | null
          created_at?: string
          estado?: string
          fecha?: string
          id?: string
          moneda?: string
          observacion?: string
          orden_id?: string | null
          plazo_entrega?: string
          proveedor_id: string
          requerimiento_id: string
        }
        Update: {
          codigo?: string
          condiciones?: string
          creado_por?: string | null
          created_at?: string
          estado?: string
          fecha?: string
          id?: string
          moneda?: string
          observacion?: string
          orden_id?: string | null
          plazo_entrega?: string
          proveedor_id?: string
          requerimiento_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "solicitudes_cotizacion_orden_id_fkey"
            columns: ["orden_id"]
            isOneToOne: false
            referencedRelation: "ordenes_compra"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitudes_cotizacion_proveedor_id_fkey"
            columns: ["proveedor_id"]
            isOneToOne: false
            referencedRelation: "terceros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitudes_cotizacion_requerimiento_id_fkey"
            columns: ["requerimiento_id"]
            isOneToOne: false
            referencedRelation: "requerimientos"
            referencedColumns: ["id"]
          },
        ]
      }
      solicitudes_desbloqueo: {
        Row: {
          created_at: string
          descripcion: string
          estado: string
          exceso: number
          id: string
          monto: number
          motivo: string
          partida_id: string | null
          proveedor: string
          proyecto_id: string
          resuelto_en: string | null
          resuelto_por: string | null
          rubro: string
          solicitado_por: string | null
          usada_en: string | null
          vence_en: string | null
        }
        Insert: {
          created_at?: string
          descripcion?: string
          estado?: string
          exceso?: number
          id?: string
          monto?: number
          motivo?: string
          partida_id?: string | null
          proveedor?: string
          proyecto_id: string
          resuelto_en?: string | null
          resuelto_por?: string | null
          rubro?: string
          solicitado_por?: string | null
          usada_en?: string | null
          vence_en?: string | null
        }
        Update: {
          created_at?: string
          descripcion?: string
          estado?: string
          exceso?: number
          id?: string
          monto?: number
          motivo?: string
          partida_id?: string | null
          proveedor?: string
          proyecto_id?: string
          resuelto_en?: string | null
          resuelto_por?: string | null
          rubro?: string
          solicitado_por?: string | null
          usada_en?: string | null
          vence_en?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "solicitudes_desbloqueo_partida_id_fkey"
            columns: ["partida_id"]
            isOneToOne: false
            referencedRelation: "partidas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitudes_desbloqueo_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "proyectos"
            referencedColumns: ["id"]
          },
        ]
      }
      subfamilias_insumo: {
        Row: {
          activo: boolean
          bloque: string
          categoria_id: string | null
          codigo: string
          created_at: string
          descripcion: string | null
          especialidad_id: string
          id: string
          nombre: string
        }
        Insert: {
          activo?: boolean
          bloque?: string
          categoria_id?: string | null
          codigo: string
          created_at?: string
          descripcion?: string | null
          especialidad_id: string
          id?: string
          nombre: string
        }
        Update: {
          activo?: boolean
          bloque?: string
          categoria_id?: string | null
          codigo?: string
          created_at?: string
          descripcion?: string | null
          especialidad_id?: string
          id?: string
          nombre?: string
        }
        Relationships: [
          {
            foreignKeyName: "subfamilias_insumo_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias_insumo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subfamilias_insumo_especialidad_id_fkey"
            columns: ["especialidad_id"]
            isOneToOne: false
            referencedRelation: "especialidades_partida"
            referencedColumns: ["id"]
          },
        ]
      }
      tareo_vehiculos: {
        Row: {
          conductor_id: string | null
          costo_soles: number
          created_at: string
          dias: number
          fecha: string
          id: string
          km: number
          observacion: string
          proyecto_id: string
          updated_at: string
          vehiculo_id: string
        }
        Insert: {
          conductor_id?: string | null
          costo_soles?: number
          created_at?: string
          dias?: number
          fecha?: string
          id?: string
          km?: number
          observacion?: string
          proyecto_id: string
          updated_at?: string
          vehiculo_id: string
        }
        Update: {
          conductor_id?: string | null
          costo_soles?: number
          created_at?: string
          dias?: number
          fecha?: string
          id?: string
          km?: number
          observacion?: string
          proyecto_id?: string
          updated_at?: string
          vehiculo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tareo_vehiculos_conductor_id_fkey"
            columns: ["conductor_id"]
            isOneToOne: false
            referencedRelation: "trabajadores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tareo_vehiculos_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "proyectos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tareo_vehiculos_vehiculo_id_fkey"
            columns: ["vehiculo_id"]
            isOneToOne: false
            referencedRelation: "vehiculos"
            referencedColumns: ["id"]
          },
        ]
      }
      tareos: {
        Row: {
          asistencia: number
          costo_soles: number
          created_at: string
          fecha: string
          horas: number
          id: string
          proyecto_id: string
          tipo: string
          trabajador_id: string
        }
        Insert: {
          asistencia?: number
          costo_soles?: number
          created_at?: string
          fecha: string
          horas?: number
          id?: string
          proyecto_id: string
          tipo?: string
          trabajador_id: string
        }
        Update: {
          asistencia?: number
          costo_soles?: number
          created_at?: string
          fecha?: string
          horas?: number
          id?: string
          proyecto_id?: string
          tipo?: string
          trabajador_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tareos_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "proyectos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tareos_trabajador_id_fkey"
            columns: ["trabajador_id"]
            isOneToOne: false
            referencedRelation: "trabajadores"
            referencedColumns: ["id"]
          },
        ]
      }
      terceros: {
        Row: {
          activo: boolean
          celular_contacto: string
          condicion_pago: string
          contacto: string
          created_at: string
          direccion: string
          email: string
          es_agente_retencion: boolean
          es_cliente: boolean
          es_proveedor: boolean
          id: string
          numero_documento: string
          razon_social: string
          telefono: string
          tipo_documento: string
          updated_at: string
        }
        Insert: {
          activo?: boolean
          celular_contacto?: string
          condicion_pago?: string
          contacto?: string
          created_at?: string
          direccion?: string
          email?: string
          es_agente_retencion?: boolean
          es_cliente?: boolean
          es_proveedor?: boolean
          id?: string
          numero_documento?: string
          razon_social: string
          telefono?: string
          tipo_documento?: string
          updated_at?: string
        }
        Update: {
          activo?: boolean
          celular_contacto?: string
          condicion_pago?: string
          contacto?: string
          created_at?: string
          direccion?: string
          email?: string
          es_agente_retencion?: boolean
          es_cliente?: boolean
          es_proveedor?: boolean
          id?: string
          numero_documento?: string
          razon_social?: string
          telefono?: string
          tipo_documento?: string
          updated_at?: string
        }
        Relationships: []
      }
      terceros_cuentas_bancarias: {
        Row: {
          activo: boolean
          banco: string
          cci: string
          created_at: string
          es_detraccion: boolean
          es_principal: boolean
          id: string
          moneda: string
          numero_cuenta: string
          tercero_id: string
        }
        Insert: {
          activo?: boolean
          banco?: string
          cci?: string
          created_at?: string
          es_detraccion?: boolean
          es_principal?: boolean
          id?: string
          moneda?: string
          numero_cuenta?: string
          tercero_id: string
        }
        Update: {
          activo?: boolean
          banco?: string
          cci?: string
          created_at?: string
          es_detraccion?: boolean
          es_principal?: boolean
          id?: string
          moneda?: string
          numero_cuenta?: string
          tercero_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "terceros_cuentas_bancarias_tercero_id_fkey"
            columns: ["tercero_id"]
            isOneToOne: false
            referencedRelation: "terceros"
            referencedColumns: ["id"]
          },
        ]
      }
      tipo_cambio_diario: {
        Row: {
          compra: number
          created_at: string
          fecha: string
          fuente: string
          venta: number
        }
        Insert: {
          compra: number
          created_at?: string
          fecha: string
          fuente?: string
          venta: number
        }
        Update: {
          compra?: number
          created_at?: string
          fecha?: string
          fuente?: string
          venta?: number
        }
        Relationships: []
      }
      tipos_insumo: {
        Row: {
          clave: string
          correlativo: number
          created_at: string
          digito: number
          es_sistema: boolean
          id: string
          nombre: string
          oculto: boolean
          orden: number
          updated_at: string
        }
        Insert: {
          clave: string
          correlativo?: number
          created_at?: string
          digito: number
          es_sistema?: boolean
          id?: string
          nombre: string
          oculto?: boolean
          orden?: number
          updated_at?: string
        }
        Update: {
          clave?: string
          correlativo?: number
          created_at?: string
          digito?: number
          es_sistema?: boolean
          id?: string
          nombre?: string
          oculto?: boolean
          orden?: number
          updated_at?: string
        }
        Relationships: []
      }
      tipos_presupuesto: {
        Row: {
          activo: boolean
          created_at: string
          es_contractual: boolean
          id: string
          nombre: string
          orden: number
          updated_at: string
        }
        Insert: {
          activo?: boolean
          created_at?: string
          es_contractual?: boolean
          id?: string
          nombre: string
          orden?: number
          updated_at?: string
        }
        Update: {
          activo?: boolean
          created_at?: string
          es_contractual?: boolean
          id?: string
          nombre?: string
          orden?: number
          updated_at?: string
        }
        Relationships: []
      }
      trabajadores: {
        Row: {
          activo: boolean
          agrario_prorrateado: boolean
          asignacion_familiar: boolean
          banco: string
          cargo: string
          categoria: Database["public"]["Enums"]["categoria_obrero"]
          cci: string
          created_at: string
          cuspp: string
          dni: string
          fecha_cese: string | null
          fecha_ingreso: string | null
          id: string
          jornal_diario: number
          nombre: string
          numero_celular: string
          numero_cuenta: string
          regimen_laboral: string
          seguro_salud: string
          sistema_pensiones: string
          sueldo_mensual: number
          suspension_cuarta: boolean
          suspension_cuarta_anio: number | null
          suspension_cuarta_constancia: string | null
          suspension_cuarta_fecha: string | null
          tipo_contratacion: string
        }
        Insert: {
          activo?: boolean
          agrario_prorrateado?: boolean
          asignacion_familiar?: boolean
          banco?: string
          cargo?: string
          categoria?: Database["public"]["Enums"]["categoria_obrero"]
          cci?: string
          created_at?: string
          cuspp?: string
          dni?: string
          fecha_cese?: string | null
          fecha_ingreso?: string | null
          id?: string
          jornal_diario?: number
          nombre: string
          numero_celular?: string
          numero_cuenta?: string
          regimen_laboral?: string
          seguro_salud?: string
          sistema_pensiones?: string
          sueldo_mensual?: number
          suspension_cuarta?: boolean
          suspension_cuarta_anio?: number | null
          suspension_cuarta_constancia?: string | null
          suspension_cuarta_fecha?: string | null
          tipo_contratacion?: string
        }
        Update: {
          activo?: boolean
          agrario_prorrateado?: boolean
          asignacion_familiar?: boolean
          banco?: string
          cargo?: string
          categoria?: Database["public"]["Enums"]["categoria_obrero"]
          cci?: string
          created_at?: string
          cuspp?: string
          dni?: string
          fecha_cese?: string | null
          fecha_ingreso?: string | null
          id?: string
          jornal_diario?: number
          nombre?: string
          numero_celular?: string
          numero_cuenta?: string
          regimen_laboral?: string
          seguro_salud?: string
          sistema_pensiones?: string
          sueldo_mensual?: number
          suspension_cuarta?: boolean
          suspension_cuarta_anio?: number | null
          suspension_cuarta_constancia?: string | null
          suspension_cuarta_fecha?: string | null
          tipo_contratacion?: string
        }
        Relationships: []
      }
      transferencias_bancarias: {
        Row: {
          banco_destino_id: string
          banco_origen_id: string
          creado_por: string
          created_at: string
          fecha: string
          id: string
          monto_destino: number
          monto_origen: number
          notas: string
          numero_operacion: string
          tipo_cambio: number
        }
        Insert: {
          banco_destino_id: string
          banco_origen_id: string
          creado_por: string
          created_at?: string
          fecha: string
          id?: string
          monto_destino: number
          monto_origen: number
          notas?: string
          numero_operacion: string
          tipo_cambio?: number
        }
        Update: {
          banco_destino_id?: string
          banco_origen_id?: string
          creado_por?: string
          created_at?: string
          fecha?: string
          id?: string
          monto_destino?: number
          monto_origen?: number
          notas?: string
          numero_operacion?: string
          tipo_cambio?: number
        }
        Relationships: [
          {
            foreignKeyName: "transferencias_bancarias_banco_destino_id_fkey"
            columns: ["banco_destino_id"]
            isOneToOne: false
            referencedRelation: "bancos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transferencias_bancarias_banco_origen_id_fkey"
            columns: ["banco_origen_id"]
            isOneToOne: false
            referencedRelation: "bancos"
            referencedColumns: ["id"]
          },
        ]
      }
      transportista_conductores: {
        Row: {
          apellidos: string
          categoria_licencia: string
          celular: string
          created_at: string
          id: string
          licencia: string
          licencia_vencimiento: string | null
          nombres: string
          numero_documento: string
          tipo_documento: string
          transportista_id: string
        }
        Insert: {
          apellidos?: string
          categoria_licencia?: string
          celular?: string
          created_at?: string
          id?: string
          licencia: string
          licencia_vencimiento?: string | null
          nombres: string
          numero_documento: string
          tipo_documento?: string
          transportista_id: string
        }
        Update: {
          apellidos?: string
          categoria_licencia?: string
          celular?: string
          created_at?: string
          id?: string
          licencia?: string
          licencia_vencimiento?: string | null
          nombres?: string
          numero_documento?: string
          tipo_documento?: string
          transportista_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transportista_conductores_transportista_id_fkey"
            columns: ["transportista_id"]
            isOneToOne: false
            referencedRelation: "transportistas"
            referencedColumns: ["id"]
          },
        ]
      }
      transportista_vehiculos: {
        Row: {
          created_at: string
          id: string
          marca: string
          placa: string
          placa_secundaria: string
          tarjeta_circulacion: string
          transportista_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          marca?: string
          placa: string
          placa_secundaria?: string
          tarjeta_circulacion?: string
          transportista_id: string
        }
        Update: {
          created_at?: string
          id?: string
          marca?: string
          placa?: string
          placa_secundaria?: string
          tarjeta_circulacion?: string
          transportista_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transportista_vehiculos_transportista_id_fkey"
            columns: ["transportista_id"]
            isOneToOne: false
            referencedRelation: "transportistas"
            referencedColumns: ["id"]
          },
        ]
      }
      transportistas: {
        Row: {
          activo: boolean
          certificado_habilitacion: string
          certificado_vencimiento: string | null
          condicion_sunat: string
          created_at: string
          direccion: string
          email: string
          entidad_autorizacion: string
          estado_sunat: string
          id: string
          numero_autorizacion: string
          razon_social: string
          registro_mtc: string
          ruc: string
          telefono: string
        }
        Insert: {
          activo?: boolean
          certificado_habilitacion?: string
          certificado_vencimiento?: string | null
          condicion_sunat?: string
          created_at?: string
          direccion?: string
          email?: string
          entidad_autorizacion?: string
          estado_sunat?: string
          id?: string
          numero_autorizacion?: string
          razon_social: string
          registro_mtc?: string
          ruc: string
          telefono?: string
        }
        Update: {
          activo?: boolean
          certificado_habilitacion?: string
          certificado_vencimiento?: string | null
          condicion_sunat?: string
          created_at?: string
          direccion?: string
          email?: string
          entidad_autorizacion?: string
          estado_sunat?: string
          id?: string
          numero_autorizacion?: string
          razon_social?: string
          registro_mtc?: string
          ruc?: string
          telefono?: string
        }
        Relationships: []
      }
      traslados_vehiculo: {
        Row: {
          banco_id: string | null
          caja_chica_id: string | null
          carga: string
          combustible_galones: number
          combustible_monto: number
          conductor_id: string | null
          created_at: string
          destino: string
          fecha: string
          id: string
          km_final: number
          km_inicial: number
          numero_operacion: string
          observacion: string
          origen: string
          origen_pago: string
          proyecto_id: string | null
          updated_at: string
          vehiculo_id: string
        }
        Insert: {
          banco_id?: string | null
          caja_chica_id?: string | null
          carga?: string
          combustible_galones?: number
          combustible_monto?: number
          conductor_id?: string | null
          created_at?: string
          destino?: string
          fecha?: string
          id?: string
          km_final?: number
          km_inicial?: number
          numero_operacion?: string
          observacion?: string
          origen?: string
          origen_pago?: string
          proyecto_id?: string | null
          updated_at?: string
          vehiculo_id: string
        }
        Update: {
          banco_id?: string | null
          caja_chica_id?: string | null
          carga?: string
          combustible_galones?: number
          combustible_monto?: number
          conductor_id?: string | null
          created_at?: string
          destino?: string
          fecha?: string
          id?: string
          km_final?: number
          km_inicial?: number
          numero_operacion?: string
          observacion?: string
          origen?: string
          origen_pago?: string
          proyecto_id?: string | null
          updated_at?: string
          vehiculo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "traslados_vehiculo_banco_id_fkey"
            columns: ["banco_id"]
            isOneToOne: false
            referencedRelation: "bancos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "traslados_vehiculo_caja_chica_id_fkey"
            columns: ["caja_chica_id"]
            isOneToOne: false
            referencedRelation: "cajas_chicas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "traslados_vehiculo_conductor_id_fkey"
            columns: ["conductor_id"]
            isOneToOne: false
            referencedRelation: "trabajadores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "traslados_vehiculo_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "proyectos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "traslados_vehiculo_vehiculo_id_fkey"
            columns: ["vehiculo_id"]
            isOneToOne: false
            referencedRelation: "vehiculos"
            referencedColumns: ["id"]
          },
        ]
      }
      unidades_medida: {
        Row: {
          activo: boolean
          created_at: string
          descripcion: string
          id: string
          orden: number
          simbolo: string
          updated_at: string
        }
        Insert: {
          activo?: boolean
          created_at?: string
          descripcion?: string
          id?: string
          orden?: number
          simbolo: string
          updated_at?: string
        }
        Update: {
          activo?: boolean
          created_at?: string
          descripcion?: string
          id?: string
          orden?: number
          simbolo?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vales_salida: {
        Row: {
          codigo: string
          creado_por: string | null
          created_at: string
          fecha: string
          id: string
          observacion: string
          partida_id: string | null
          proyecto_id: string
          trabajador_id: string
        }
        Insert: {
          codigo: string
          creado_por?: string | null
          created_at?: string
          fecha?: string
          id?: string
          observacion?: string
          partida_id?: string | null
          proyecto_id: string
          trabajador_id: string
        }
        Update: {
          codigo?: string
          creado_por?: string | null
          created_at?: string
          fecha?: string
          id?: string
          observacion?: string
          partida_id?: string | null
          proyecto_id?: string
          trabajador_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vales_salida_partida_id_fkey"
            columns: ["partida_id"]
            isOneToOne: false
            referencedRelation: "partidas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vales_salida_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "proyectos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vales_salida_trabajador_id_fkey"
            columns: ["trabajador_id"]
            isOneToOne: false
            referencedRelation: "trabajadores"
            referencedColumns: ["id"]
          },
        ]
      }
      vales_salida_items: {
        Row: {
          cantidad: number
          costo_unitario: number
          descripcion: string
          id: string
          insumo_id: string | null
          unidad: string
          vale_id: string
        }
        Insert: {
          cantidad: number
          costo_unitario?: number
          descripcion: string
          id?: string
          insumo_id?: string | null
          unidad?: string
          vale_id: string
        }
        Update: {
          cantidad?: number
          costo_unitario?: number
          descripcion?: string
          id?: string
          insumo_id?: string | null
          unidad?: string
          vale_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vales_salida_items_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "epp_catalogo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vales_salida_items_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "equipos_herramientas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vales_salida_items_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "insumos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vales_salida_items_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "mano_obra"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vales_salida_items_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "materiales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vales_salida_items_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "subcontratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vales_salida_items_vale_id_fkey"
            columns: ["vale_id"]
            isOneToOne: false
            referencedRelation: "vales_salida"
            referencedColumns: ["id"]
          },
        ]
      }
      valorizacion_items: {
        Row: {
          codigo: string
          descripcion: string
          id: string
          metrado_actual: number
          metrado_contratado: number
          orden: number
          partida_id: string | null
          precio_unitario: number
          unidad: string
          valorizacion_id: string
        }
        Insert: {
          codigo?: string
          descripcion?: string
          id?: string
          metrado_actual?: number
          metrado_contratado?: number
          orden?: number
          partida_id?: string | null
          precio_unitario?: number
          unidad?: string
          valorizacion_id: string
        }
        Update: {
          codigo?: string
          descripcion?: string
          id?: string
          metrado_actual?: number
          metrado_contratado?: number
          orden?: number
          partida_id?: string | null
          precio_unitario?: number
          unidad?: string
          valorizacion_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "valorizacion_items_partida_id_fkey"
            columns: ["partida_id"]
            isOneToOne: false
            referencedRelation: "partidas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "valorizacion_items_valorizacion_id_fkey"
            columns: ["valorizacion_id"]
            isOneToOne: false
            referencedRelation: "valorizaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      valorizaciones: {
        Row: {
          aprobado_en: string | null
          aprobado_por: string | null
          costo_directo: number
          created_at: string
          created_by: string | null
          estado: string
          firma_cargo: string
          firma_fecha: string | null
          firma_nombre: string
          id: string
          neto: number
          numero: number
          observacion: string
          pct_adelanto: number
          pct_gg: number
          pct_retencion: number
          pct_utilidad: number
          periodo_fin: string
          periodo_inicio: string
          preliquidacion_id: string | null
          proyecto_id: string
          updated_at: string
        }
        Insert: {
          aprobado_en?: string | null
          aprobado_por?: string | null
          costo_directo?: number
          created_at?: string
          created_by?: string | null
          estado?: string
          firma_cargo?: string
          firma_fecha?: string | null
          firma_nombre?: string
          id?: string
          neto?: number
          numero: number
          observacion?: string
          pct_adelanto?: number
          pct_gg?: number
          pct_retencion?: number
          pct_utilidad?: number
          periodo_fin: string
          periodo_inicio: string
          preliquidacion_id?: string | null
          proyecto_id: string
          updated_at?: string
        }
        Update: {
          aprobado_en?: string | null
          aprobado_por?: string | null
          costo_directo?: number
          created_at?: string
          created_by?: string | null
          estado?: string
          firma_cargo?: string
          firma_fecha?: string | null
          firma_nombre?: string
          id?: string
          neto?: number
          numero?: number
          observacion?: string
          pct_adelanto?: number
          pct_gg?: number
          pct_retencion?: number
          pct_utilidad?: number
          periodo_fin?: string
          periodo_inicio?: string
          preliquidacion_id?: string | null
          proyecto_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "valorizaciones_preliquidacion_id_fkey"
            columns: ["preliquidacion_id"]
            isOneToOne: false
            referencedRelation: "preliquidaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "valorizaciones_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "proyectos"
            referencedColumns: ["id"]
          },
        ]
      }
      vehiculos: {
        Row: {
          anio: number | null
          created_at: string
          estado: string
          id: string
          km_actual: number
          marca: string
          modelo: string
          observacion: string
          placa: string
          propiedad: string
          proveedor_id: string | null
          revision_tecnica_vencimiento: string | null
          soat_vencimiento: string | null
          tarifa_dia: number
          tarifa_km: number
          tipo: string
          updated_at: string
        }
        Insert: {
          anio?: number | null
          created_at?: string
          estado?: string
          id?: string
          km_actual?: number
          marca?: string
          modelo?: string
          observacion?: string
          placa: string
          propiedad?: string
          proveedor_id?: string | null
          revision_tecnica_vencimiento?: string | null
          soat_vencimiento?: string | null
          tarifa_dia?: number
          tarifa_km?: number
          tipo?: string
          updated_at?: string
        }
        Update: {
          anio?: number | null
          created_at?: string
          estado?: string
          id?: string
          km_actual?: number
          marca?: string
          modelo?: string
          observacion?: string
          placa?: string
          propiedad?: string
          proveedor_id?: string | null
          revision_tecnica_vencimiento?: string | null
          soat_vencimiento?: string | null
          tarifa_dia?: number
          tarifa_km?: number
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehiculos_proveedor_id_fkey"
            columns: ["proveedor_id"]
            isOneToOne: false
            referencedRelation: "terceros"
            referencedColumns: ["id"]
          },
        ]
      }
      ventas: {
        Row: {
          banco_detraccion_id: string | null
          banco_id: string | null
          cliente_id: string | null
          comprobante_electronico_id: string | null
          concepto: string
          condicion_pago: string
          created_at: string
          detraccion_constancia: string
          detraccion_estado: string
          detraccion_fecha: string | null
          dias_credito: number
          estado: Database["public"]["Enums"]["estado_venta"]
          fecha_emision: string
          fecha_pago: string | null
          fecha_vencimiento: string | null
          id: string
          igv: number
          moneda: Database["public"]["Enums"]["moneda"]
          monto: number
          monto_detraccion: number
          monto_retencion: number
          monto_soles: number
          numero_factura: string
          numero_operacion: string
          pct_detraccion: number
          preliquidacion_id: string | null
          proyecto_id: string | null
          retencion_constancia: string
          retencion_estado: string
          retencion_fecha: string | null
          rubro: string
          tipo_cambio: number
          tipo_tributario: string
          total: number
        }
        Insert: {
          banco_detraccion_id?: string | null
          banco_id?: string | null
          cliente_id?: string | null
          comprobante_electronico_id?: string | null
          concepto: string
          condicion_pago?: string
          created_at?: string
          detraccion_constancia?: string
          detraccion_estado?: string
          detraccion_fecha?: string | null
          dias_credito?: number
          estado?: Database["public"]["Enums"]["estado_venta"]
          fecha_emision?: string
          fecha_pago?: string | null
          fecha_vencimiento?: string | null
          id?: string
          igv?: number
          moneda?: Database["public"]["Enums"]["moneda"]
          monto?: number
          monto_detraccion?: number
          monto_retencion?: number
          monto_soles?: number
          numero_factura?: string
          numero_operacion?: string
          pct_detraccion?: number
          preliquidacion_id?: string | null
          proyecto_id?: string | null
          retencion_constancia?: string
          retencion_estado?: string
          retencion_fecha?: string | null
          rubro?: string
          tipo_cambio?: number
          tipo_tributario?: string
          total?: number
        }
        Update: {
          banco_detraccion_id?: string | null
          banco_id?: string | null
          cliente_id?: string | null
          comprobante_electronico_id?: string | null
          concepto?: string
          condicion_pago?: string
          created_at?: string
          detraccion_constancia?: string
          detraccion_estado?: string
          detraccion_fecha?: string | null
          dias_credito?: number
          estado?: Database["public"]["Enums"]["estado_venta"]
          fecha_emision?: string
          fecha_pago?: string | null
          fecha_vencimiento?: string | null
          id?: string
          igv?: number
          moneda?: Database["public"]["Enums"]["moneda"]
          monto?: number
          monto_detraccion?: number
          monto_retencion?: number
          monto_soles?: number
          numero_factura?: string
          numero_operacion?: string
          pct_detraccion?: number
          preliquidacion_id?: string | null
          proyecto_id?: string | null
          retencion_constancia?: string
          retencion_estado?: string
          retencion_fecha?: string | null
          rubro?: string
          tipo_cambio?: number
          tipo_tributario?: string
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "ventas_banco_detraccion_id_fkey"
            columns: ["banco_detraccion_id"]
            isOneToOne: false
            referencedRelation: "bancos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ventas_banco_id_fkey"
            columns: ["banco_id"]
            isOneToOne: false
            referencedRelation: "bancos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ventas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "terceros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ventas_comprobante_electronico_id_fkey"
            columns: ["comprobante_electronico_id"]
            isOneToOne: false
            referencedRelation: "comprobantes_electronicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ventas_preliquidacion_id_fkey"
            columns: ["preliquidacion_id"]
            isOneToOne: false
            referencedRelation: "preliquidaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ventas_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "proyectos"
            referencedColumns: ["id"]
          },
        ]
      }
      vinculos_laborales: {
        Row: {
          created_at: string
          fecha_cese: string | null
          fecha_ingreso: string
          id: string
          liquidacion_id: string | null
          motivo: string | null
          trabajador_id: string
        }
        Insert: {
          created_at?: string
          fecha_cese?: string | null
          fecha_ingreso: string
          id?: string
          liquidacion_id?: string | null
          motivo?: string | null
          trabajador_id: string
        }
        Update: {
          created_at?: string
          fecha_cese?: string | null
          fecha_ingreso?: string
          id?: string
          liquidacion_id?: string | null
          motivo?: string | null
          trabajador_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vinculos_laborales_liquidacion_id_fkey"
            columns: ["liquidacion_id"]
            isOneToOne: false
            referencedRelation: "beneficios_sociales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vinculos_laborales_trabajador_id_fkey"
            columns: ["trabajador_id"]
            isOneToOne: false
            referencedRelation: "trabajadores"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      epp_catalogo: {
        Row: {
          activo: boolean | null
          categoria: string | null
          codigo: string | null
          costo_unitario: number | null
          created_at: string | null
          criticidad: string | null
          id: string | null
          marca: string | null
          nombre: string | null
          norma: string | null
          stock: number | null
          tallas: string | null
          vida_util_dias: number | null
        }
        Relationships: []
      }
      equipos_herramientas: {
        Row: {
          categoria_inventario: string | null
          codigo: string | null
          costo_hora: number | null
          costo_unitario: number | null
          created_at: string | null
          descripcion: string | null
          especialidad_id: string | null
          estado: string | null
          id: string | null
          margen: number | null
          subfamilia_id: string | null
          tipo: string | null
          unidad: string | null
          unidad_id: string | null
          updated_at: string | null
        }
        Insert: {
          categoria_inventario?: string | null
          codigo?: string | null
          costo_hora?: number | null
          costo_unitario?: never
          created_at?: string | null
          descripcion?: string | null
          especialidad_id?: string | null
          estado?: never
          id?: string | null
          margen?: number | null
          subfamilia_id?: string | null
          tipo?: never
          unidad?: string | null
          unidad_id?: string | null
          updated_at?: string | null
        }
        Update: {
          categoria_inventario?: string | null
          codigo?: string | null
          costo_hora?: number | null
          costo_unitario?: never
          created_at?: string | null
          descripcion?: string | null
          especialidad_id?: string | null
          estado?: never
          id?: string | null
          margen?: number | null
          subfamilia_id?: string | null
          tipo?: never
          unidad?: string | null
          unidad_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "insumos_especialidad_id_fkey"
            columns: ["especialidad_id"]
            isOneToOne: false
            referencedRelation: "especialidades_partida"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insumos_subfamilia_id_fkey"
            columns: ["subfamilia_id"]
            isOneToOne: false
            referencedRelation: "subfamilias_insumo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insumos_unidad_id_fkey"
            columns: ["unidad_id"]
            isOneToOne: false
            referencedRelation: "unidades_medida"
            referencedColumns: ["id"]
          },
        ]
      }
      mano_obra: {
        Row: {
          codigo: string | null
          costo_hora: number | null
          created_at: string | null
          descripcion: string | null
          especialidad_id: string | null
          estado: string | null
          id: string | null
          subfamilia_id: string | null
          unidad: string | null
          unidad_id: string | null
          updated_at: string | null
        }
        Insert: {
          codigo?: string | null
          costo_hora?: number | null
          created_at?: string | null
          descripcion?: string | null
          especialidad_id?: string | null
          estado?: never
          id?: string | null
          subfamilia_id?: string | null
          unidad?: string | null
          unidad_id?: string | null
          updated_at?: string | null
        }
        Update: {
          codigo?: string | null
          costo_hora?: number | null
          created_at?: string | null
          descripcion?: string | null
          especialidad_id?: string | null
          estado?: never
          id?: string | null
          subfamilia_id?: string | null
          unidad?: string | null
          unidad_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "insumos_especialidad_id_fkey"
            columns: ["especialidad_id"]
            isOneToOne: false
            referencedRelation: "especialidades_partida"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insumos_subfamilia_id_fkey"
            columns: ["subfamilia_id"]
            isOneToOne: false
            referencedRelation: "subfamilias_insumo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insumos_unidad_id_fkey"
            columns: ["unidad_id"]
            isOneToOne: false
            referencedRelation: "unidades_medida"
            referencedColumns: ["id"]
          },
        ]
      }
      materiales: {
        Row: {
          codigo: string | null
          costo_unitario: number | null
          created_at: string | null
          descripcion: string | null
          especialidad_id: string | null
          estado: string | null
          id: string | null
          marca: string | null
          marca_id: string | null
          margen: number | null
          precio_base: number | null
          subfamilia_id: string | null
          unidad: string | null
          unidad_id: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "insumos_especialidad_id_fkey"
            columns: ["especialidad_id"]
            isOneToOne: false
            referencedRelation: "especialidades_partida"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insumos_marca_id_fkey"
            columns: ["marca_id"]
            isOneToOne: false
            referencedRelation: "marcas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insumos_subfamilia_id_fkey"
            columns: ["subfamilia_id"]
            isOneToOne: false
            referencedRelation: "subfamilias_insumo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insumos_unidad_id_fkey"
            columns: ["unidad_id"]
            isOneToOne: false
            referencedRelation: "unidades_medida"
            referencedColumns: ["id"]
          },
        ]
      }
      subcontratos: {
        Row: {
          codigo: string | null
          costo: number | null
          costo_unitario: number | null
          created_at: string | null
          descripcion: string | null
          especialidad_id: string | null
          estado: string | null
          id: string | null
          margen: number | null
          subfamilia_id: string | null
          unidad: string | null
          unidad_id: string | null
          updated_at: string | null
        }
        Insert: {
          codigo?: string | null
          costo?: number | null
          costo_unitario?: never
          created_at?: string | null
          descripcion?: string | null
          especialidad_id?: string | null
          estado?: never
          id?: string | null
          margen?: number | null
          subfamilia_id?: string | null
          unidad?: string | null
          unidad_id?: string | null
          updated_at?: string | null
        }
        Update: {
          codigo?: string | null
          costo?: number | null
          costo_unitario?: never
          created_at?: string | null
          descripcion?: string | null
          especialidad_id?: string | null
          estado?: never
          id?: string | null
          margen?: number | null
          subfamilia_id?: string | null
          unidad?: string | null
          unidad_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "insumos_especialidad_id_fkey"
            columns: ["especialidad_id"]
            isOneToOne: false
            referencedRelation: "especialidades_partida"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insumos_subfamilia_id_fkey"
            columns: ["subfamilia_id"]
            isOneToOne: false
            referencedRelation: "subfamilias_insumo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insumos_unidad_id_fkey"
            columns: ["unidad_id"]
            isOneToOne: false
            referencedRelation: "unidades_medida"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      anular_cese: { Args: { _trabajador: string }; Returns: undefined }
      aprobar_insumo: {
        Args: { _aprobar: boolean; _id: string; _motivo: string }
        Returns: undefined
      }
      cambiar_destino_orden: {
        Args: { _almacen: string; _motivo: string; _orden: string }
        Returns: undefined
      }
      costo_promedio_almacen: {
        Args: { _insumo: string; _proyecto: string }
        Returns: number
      }
      eliminar_proyecto: { Args: { _id: string }; Returns: Json }
      es_encargado_almacen: {
        Args: { _proyecto: string; _user: string }
        Returns: boolean
      }
      es_personal: { Args: { _user_id: string }; Returns: boolean }
      ficha_insumo: { Args: { _id: string }; Returns: Json }
      guardar_especialidad: {
        Args: {
          _codigo: string
          _descripcion: string
          _id: string
          _nombre: string
        }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      integrar_importacion: {
        Args: {
          _gasto_general: Json
          _gastos_directos: Json
          _id: string
          _movimientos: Json
        }
        Returns: undefined
      }
      is_admin_o_gerente: { Args: { _user_id: string }; Returns: boolean }
      marca_id_de: { Args: { _nombre: string }; Returns: string }
      mo_presupuestada: { Args: { _proyecto: string }; Returns: number }
      mover_especialidad: {
        Args: { _direccion: number; _id: string }
        Returns: Json
      }
      mover_item_wbs: {
        Args: { _direccion: number; _id: string; _tabla: string }
        Returns: undefined
      }
      movimiento_bancario: {
        Args: { _fila: Json; _tabla: string }
        Returns: {
          banco_id: string
          egreso: number
          ingreso: number
        }[]
      }
      pagar_financiamiento: {
        Args: {
          _banco: string
          _cuota: string
          _fecha: string
          _operacion: string
        }
        Returns: undefined
      }
      puede_recibir_almacen: {
        Args: { _proyecto: string; _user: string }
        Returns: boolean
      }
      quitar_recurso_apu: {
        Args: { _id: string; _tabla: string }
        Returns: string
      }
      rango_regimen: { Args: { _r: string }; Returns: number }
      recepcionar_orden_obra: {
        Args: { _fecha: string; _items: Json; _obs: string; _orden: string }
        Returns: undefined
      }
      recibir_transferencia: {
        Args: { _fecha: string; _transferencia: string }
        Returns: undefined
      }
      recodificar_wbs: { Args: never; Returns: undefined }
      registrar_financiamiento: { Args: { _datos: Json }; Returns: string }
      registrar_liquidacion: {
        Args: { _datos: Json; _fecha_cese: string; _trabajador: string }
        Returns: string
      }
      registrar_movimiento_detraccion: {
        Args: {
          _banco: string
          _concepto: string
          _fecha: string
          _monto: number
          _notas?: string
          _operacion: string
          _periodo: string
          _tipo: string
        }
        Returns: string
      }
      registrar_transferencia: {
        Args: {
          _destino: string
          _fecha: string
          _monto: number
          _notas?: string
          _operacion: string
          _origen: string
          _tc: number
        }
        Returns: string
      }
      registrar_vale_salida: {
        Args: {
          _fecha: string
          _items: Json
          _obs: string
          _partida: string
          _proyecto: string
          _trabajador: string
        }
        Returns: Json
      }
      reingresar_trabajador: {
        Args: {
          _cargo: string
          _fecha: string
          _sueldo: number
          _trabajador: string
        }
        Returns: undefined
      }
      renumerar_prefijo_insumo: { Args: { _pref: string }; Returns: undefined }
      siguiente_codigo_cotizacion: { Args: never; Returns: string }
      siguiente_codigo_documento: { Args: { _nombre: string }; Returns: string }
      siguiente_codigo_insumo: { Args: { _tipo: string }; Returns: string }
      siguiente_codigo_insumo_modular: {
        Args: {
          _categoria?: string
          _especialidad: string
          _subfamilia: string
          _tipo: string
        }
        Returns: string
      }
      siguiente_codigo_preliquidacion: { Args: never; Returns: string }
      siguiente_codigo_proyecto: { Args: never; Returns: string }
      siguiente_numero_comprobante: {
        Args: { _serie: string; _tipo: string }
        Returns: {
          correlativo: number
          numero: string
        }[]
      }
      stock_insumo_almacen: {
        Args: { _insumo: string; _proyecto: string }
        Returns: number
      }
      transferir_almacen: {
        Args: {
          _destino: string
          _documento: string
          _fecha: string
          _items: Json
          _obs: string
          _origen: string
        }
        Returns: string
      }
    }
    Enums: {
      app_role: "ingeniero" | "administrador" | "gerente"
      categoria_obrero: "Operario" | "Oficial" | "Peon"
      estado_proyecto: "En Ejecucion" | "Finalizado"
      estado_venta: "Pagado" | "Pendiente de Pago"
      moneda: "PEN" | "USD"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["ingeniero", "administrador", "gerente"],
      categoria_obrero: ["Operario", "Oficial", "Peon"],
      estado_proyecto: ["En Ejecucion", "Finalizado"],
      estado_venta: ["Pagado", "Pendiente de Pago"],
      moneda: ["PEN", "USD"],
    },
  },
} as const
