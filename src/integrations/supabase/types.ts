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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
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
            referencedRelation: "insumos"
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
      categorias_partida: {
        Row: {
          activo: boolean
          codigo: string
          created_at: string
          especialidad: string
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
      cotizacion_items: {
        Row: {
          categoria: string
          codigo: string
          cotizacion_id: string
          created_at: string
          especialidad: string
          id: string
          jornada: number
          metrado: number
          nombre: string
          orden: number
          padre_id: string | null
          pct_herramientas: number
          precio_unitario: number
          rendimiento: number
          unidad: string
          updated_at: string
        }
        Insert: {
          categoria?: string
          codigo?: string
          cotizacion_id: string
          created_at?: string
          especialidad?: string
          id?: string
          jornada?: number
          metrado?: number
          nombre: string
          orden?: number
          padre_id?: string | null
          pct_herramientas?: number
          precio_unitario?: number
          rendimiento?: number
          unidad?: string
          updated_at?: string
        }
        Update: {
          categoria?: string
          codigo?: string
          cotizacion_id?: string
          created_at?: string
          especialidad?: string
          id?: string
          jornada?: number
          metrado?: number
          nombre?: string
          orden?: number
          padre_id?: string | null
          pct_herramientas?: number
          precio_unitario?: number
          rendimiento?: number
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
        ]
      }
      cotizaciones: {
        Row: {
          cliente: string
          cliente_id: string | null
          codigo: string | null
          condiciones: string
          created_at: string
          estado: string
          fecha_emision: string
          id: string
          moneda: Database["public"]["Enums"]["moneda"]
          nombre: string
          pct_gastos_generales: number
          pct_utilidad: number
          proyecto_id: string | null
          tipo_cambio: number
          ubicacion: string
          updated_at: string
          validez_dias: number
        }
        Insert: {
          cliente?: string
          cliente_id?: string | null
          codigo?: string | null
          condiciones?: string
          created_at?: string
          estado?: string
          fecha_emision?: string
          id?: string
          moneda?: Database["public"]["Enums"]["moneda"]
          nombre: string
          pct_gastos_generales?: number
          pct_utilidad?: number
          proyecto_id?: string | null
          tipo_cambio?: number
          ubicacion?: string
          updated_at?: string
          validez_dias?: number
        }
        Update: {
          cliente?: string
          cliente_id?: string | null
          codigo?: string | null
          condiciones?: string
          created_at?: string
          estado?: string
          fecha_emision?: string
          id?: string
          moneda?: Database["public"]["Enums"]["moneda"]
          nombre?: string
          pct_gastos_generales?: number
          pct_utilidad?: number
          proyecto_id?: string | null
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
        ]
      }
      empresa_config: {
        Row: {
          color_marca: string
          created_at: string
          direccion: string
          email: string
          id: string
          logo_url: string
          razon_social: string
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
          id?: string
          logo_url?: string
          razon_social?: string
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
          id?: string
          logo_url?: string
          razon_social?: string
          ruc?: string
          telefono?: string
          updated_at?: string
          web?: string
        }
        Relationships: []
      }
      especialidades_partida: {
        Row: {
          activo: boolean
          codigo: string
          created_at: string
          id: string
          nombre: string
          orden: number
          updated_at: string
        }
        Insert: {
          activo?: boolean
          codigo?: string
          created_at?: string
          id?: string
          nombre: string
          orden?: number
          updated_at?: string
        }
        Update: {
          activo?: boolean
          codigo?: string
          created_at?: string
          id?: string
          nombre?: string
          orden?: number
          updated_at?: string
        }
        Relationships: []
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
          dias_credito: number
          estado_pago: string
          fecha: string
          fecha_pago: string | null
          fecha_vencimiento: string | null
          id: string
          moneda: Database["public"]["Enums"]["moneda"]
          monto: number
          monto_soles: number
          numero_operacion: string
          partida_id: string
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
          dias_credito?: number
          estado_pago?: string
          fecha?: string
          fecha_pago?: string | null
          fecha_vencimiento?: string | null
          id?: string
          moneda?: Database["public"]["Enums"]["moneda"]
          monto?: number
          monto_soles?: number
          numero_operacion?: string
          partida_id: string
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
          dias_credito?: number
          estado_pago?: string
          fecha?: string
          fecha_pago?: string | null
          fecha_vencimiento?: string | null
          id?: string
          moneda?: Database["public"]["Enums"]["moneda"]
          monto?: number
          monto_soles?: number
          numero_operacion?: string
          partida_id?: string
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
          dias_credito: number
          estado_pago: string
          fecha: string
          fecha_pago: string | null
          fecha_vencimiento: string | null
          id: string
          moneda: Database["public"]["Enums"]["moneda"]
          monto: number
          monto_soles: number
          numero_operacion: string
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
          dias_credito?: number
          estado_pago?: string
          fecha?: string
          fecha_pago?: string | null
          fecha_vencimiento?: string | null
          id?: string
          moneda?: Database["public"]["Enums"]["moneda"]
          monto?: number
          monto_soles?: number
          numero_operacion?: string
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
          dias_credito?: number
          estado_pago?: string
          fecha?: string
          fecha_pago?: string | null
          fecha_vencimiento?: string | null
          id?: string
          moneda?: Database["public"]["Enums"]["moneda"]
          monto?: number
          monto_soles?: number
          numero_operacion?: string
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
            referencedRelation: "insumos"
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
          codigo: string
          created_at: string
          id: string
          nombre: string
          precio: number
          tipo: string
          unidad: string
          updated_at: string
        }
        Insert: {
          activo?: boolean
          codigo?: string
          created_at?: string
          id?: string
          nombre: string
          precio?: number
          tipo?: string
          unidad?: string
          updated_at?: string
        }
        Update: {
          activo?: boolean
          codigo?: string
          created_at?: string
          id?: string
          nombre?: string
          precio?: number
          tipo?: string
          unidad?: string
          updated_at?: string
        }
        Relationships: []
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
          fecha: string
          id: string
          insumo_id: string | null
          observacion: string
          orden_item_id: string | null
          proyecto_id: string
          tipo: string
          unidad: string
        }
        Insert: {
          cantidad: number
          costo_unitario?: number
          creado_por?: string | null
          created_at?: string
          descripcion: string
          documento?: string
          fecha?: string
          id?: string
          insumo_id?: string | null
          observacion?: string
          orden_item_id?: string | null
          proyecto_id: string
          tipo: string
          unidad?: string
        }
        Update: {
          cantidad?: number
          costo_unitario?: number
          creado_por?: string | null
          created_at?: string
          descripcion?: string
          documento?: string
          fecha?: string
          id?: string
          insumo_id?: string | null
          observacion?: string
          orden_item_id?: string | null
          proyecto_id?: string
          tipo?: string
          unidad?: string
        }
        Relationships: [
          {
            foreignKeyName: "movimientos_almacen_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "insumos"
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
            foreignKeyName: "movimientos_almacen_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "proyectos"
            referencedColumns: ["id"]
          },
        ]
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
          unidad?: string
        }
        Relationships: [
          {
            foreignKeyName: "orden_compra_items_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "insumos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orden_compra_items_orden_id_fkey"
            columns: ["orden_id"]
            isOneToOne: false
            referencedRelation: "ordenes_compra"
            referencedColumns: ["id"]
          },
        ]
      }
      ordenes_compra: {
        Row: {
          codigo: string
          condicion_pago: string
          created_at: string
          estado: string
          fecha: string
          fecha_entrega: string | null
          id: string
          observacion: string
          proveedor_id: string | null
          proyecto_id: string
          requerimiento_id: string | null
          updated_at: string
        }
        Insert: {
          codigo?: string
          condicion_pago?: string
          created_at?: string
          estado?: string
          fecha?: string
          fecha_entrega?: string | null
          id?: string
          observacion?: string
          proveedor_id?: string | null
          proyecto_id: string
          requerimiento_id?: string | null
          updated_at?: string
        }
        Update: {
          codigo?: string
          condicion_pago?: string
          created_at?: string
          estado?: string
          fecha?: string
          fecha_entrega?: string | null
          id?: string
          observacion?: string
          proveedor_id?: string | null
          proyecto_id?: string
          requerimiento_id?: string | null
          updated_at?: string
        }
        Relationships: [
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
          metrado: number
          nombre: string
          padre_id: string | null
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
          metrado?: number
          nombre: string
          padre_id?: string | null
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
          metrado?: number
          nombre?: string
          padre_id?: string | null
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
            foreignKeyName: "partidas_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "proyectos"
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
          nombre: string
          pct_herramientas: number
          precio_unitario: number
          rendimiento: number
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
          nombre: string
          pct_herramientas?: number
          precio_unitario?: number
          rendimiento?: number
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
          nombre?: string
          pct_herramientas?: number
          precio_unitario?: number
          rendimiento?: number
          unidad?: string
          updated_at?: string
        }
        Relationships: []
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
          pct_detraccion: number
          proyecto_id: string
          tipo_cambio: number
          tipo_tributario: string
          updated_at: string
        }
        Insert: {
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
          pct_detraccion?: number
          proyecto_id: string
          tipo_cambio?: number
          tipo_tributario?: string
          updated_at?: string
        }
        Update: {
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
          pct_detraccion?: number
          proyecto_id?: string
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
          cliente: string
          codigo: string | null
          created_at: string
          estado: Database["public"]["Enums"]["estado_proyecto"]
          fecha_fin: string | null
          fecha_inicio: string | null
          id: string
          nombre: string
          pct_gastos_generales: number
          pct_utilidad: number
          responsable_id: string | null
          situacion: string
          ubicacion: string
        }
        Insert: {
          cliente?: string
          codigo?: string | null
          created_at?: string
          estado?: Database["public"]["Enums"]["estado_proyecto"]
          fecha_fin?: string | null
          fecha_inicio?: string | null
          id?: string
          nombre: string
          pct_gastos_generales?: number
          pct_utilidad?: number
          responsable_id?: string | null
          situacion?: string
          ubicacion?: string
        }
        Update: {
          cliente?: string
          codigo?: string | null
          created_at?: string
          estado?: Database["public"]["Enums"]["estado_proyecto"]
          fecha_fin?: string | null
          fecha_inicio?: string | null
          id?: string
          nombre?: string
          pct_gastos_generales?: number
          pct_utilidad?: number
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
          banco_id: string | null
          concepto: string
          created_at: string
          estado_pago: string
          fecha_emision: string
          fecha_pago: string | null
          id: string
          monto_bruto: number
          monto_neto: number
          numero_operacion: string
          numero_recibo: string
          proyecto_id: string | null
          retencion: number
          trabajador_id: string
          updated_at: string
        }
        Insert: {
          banco_id?: string | null
          concepto?: string
          created_at?: string
          estado_pago?: string
          fecha_emision?: string
          fecha_pago?: string | null
          id?: string
          monto_bruto: number
          monto_neto: number
          numero_operacion?: string
          numero_recibo: string
          proyecto_id?: string | null
          retencion?: number
          trabajador_id: string
          updated_at?: string
        }
        Update: {
          banco_id?: string | null
          concepto?: string
          created_at?: string
          estado_pago?: string
          fecha_emision?: string
          fecha_pago?: string | null
          id?: string
          monto_bruto?: number
          monto_neto?: number
          numero_operacion?: string
          numero_recibo?: string
          proyecto_id?: string | null
          retencion?: number
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
            referencedRelation: "insumos"
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
          codigo: string
          creado_por: string | null
          created_at: string
          estado: string
          fecha: string
          id: string
          observacion: string
          proyecto_id: string
          updated_at: string
        }
        Insert: {
          codigo?: string
          creado_por?: string | null
          created_at?: string
          estado?: string
          fecha?: string
          id?: string
          observacion?: string
          proyecto_id: string
          updated_at?: string
        }
        Update: {
          codigo?: string
          creado_por?: string | null
          created_at?: string
          estado?: string
          fecha?: string
          id?: string
          observacion?: string
          proyecto_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "requerimientos_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "proyectos"
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
          sistema_pensiones: string
          sueldo_mensual: number
          suspension_cuarta: boolean
          tipo_contratacion: string
        }
        Insert: {
          activo?: boolean
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
          sistema_pensiones?: string
          sueldo_mensual?: number
          suspension_cuarta?: boolean
          tipo_contratacion?: string
        }
        Update: {
          activo?: boolean
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
          sistema_pensiones?: string
          sueldo_mensual?: number
          suspension_cuarta?: boolean
          tipo_contratacion?: string
        }
        Relationships: []
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
      ventas: {
        Row: {
          banco_id: string | null
          cliente_id: string | null
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
          proyecto_id: string
          tipo_cambio: number
          tipo_tributario: string
          total: number
        }
        Insert: {
          banco_id?: string | null
          cliente_id?: string | null
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
          proyecto_id: string
          tipo_cambio?: number
          tipo_tributario?: string
          total?: number
        }
        Update: {
          banco_id?: string | null
          cliente_id?: string | null
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
          proyecto_id?: string
          tipo_cambio?: number
          tipo_tributario?: string
          total?: number
        }
        Relationships: [
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin_o_gerente: { Args: { _user_id: string }; Returns: boolean }
      siguiente_codigo_cotizacion: { Args: never; Returns: string }
      siguiente_codigo_proyecto: { Args: never; Returns: string }
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
