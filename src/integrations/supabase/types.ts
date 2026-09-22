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
      bancos: {
        Row: {
          activo: boolean
          created_at: string
          id: string
          monedas: string
          nombre: string
          updated_at: string
        }
        Insert: {
          activo?: boolean
          created_at?: string
          id?: string
          monedas?: string
          nombre: string
          updated_at?: string
        }
        Update: {
          activo?: boolean
          created_at?: string
          id?: string
          monedas?: string
          nombre?: string
          updated_at?: string
        }
        Relationships: []
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
      gastos_directos: {
        Row: {
          created_at: string
          descripcion: string
          fecha: string
          id: string
          moneda: Database["public"]["Enums"]["moneda"]
          monto: number
          monto_soles: number
          partida_id: string
          proveedor: string
          proveedor_id: string | null
          proyecto_id: string
          rubro: string
          tipo_cambio: number
        }
        Insert: {
          created_at?: string
          descripcion: string
          fecha?: string
          id?: string
          moneda?: Database["public"]["Enums"]["moneda"]
          monto?: number
          monto_soles?: number
          partida_id: string
          proveedor?: string
          proveedor_id?: string | null
          proyecto_id: string
          rubro?: string
          tipo_cambio?: number
        }
        Update: {
          created_at?: string
          descripcion?: string
          fecha?: string
          id?: string
          moneda?: Database["public"]["Enums"]["moneda"]
          monto?: number
          monto_soles?: number
          partida_id?: string
          proveedor?: string
          proveedor_id?: string | null
          proyecto_id?: string
          rubro?: string
          tipo_cambio?: number
        }
        Relationships: [
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
          categoria: string
          created_at: string
          descripcion: string
          fecha: string
          id: string
          moneda: Database["public"]["Enums"]["moneda"]
          monto: number
          monto_soles: number
          proveedor: string
          proveedor_id: string | null
          proyecto_id: string | null
          tipo_cambio: number
        }
        Insert: {
          categoria?: string
          created_at?: string
          descripcion: string
          fecha?: string
          id?: string
          moneda?: Database["public"]["Enums"]["moneda"]
          monto?: number
          monto_soles?: number
          proveedor?: string
          proveedor_id?: string | null
          proyecto_id?: string | null
          tipo_cambio?: number
        }
        Update: {
          categoria?: string
          created_at?: string
          descripcion?: string
          fecha?: string
          id?: string
          moneda?: Database["public"]["Enums"]["moneda"]
          monto?: number
          monto_soles?: number
          proveedor?: string
          proveedor_id?: string | null
          proyecto_id?: string | null
          tipo_cambio?: number
        }
        Relationships: [
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
      partidas: {
        Row: {
          aplica_gg_utilidad: boolean
          avance_pct: number
          created_at: string
          especialidad: string
          id: string
          nombre: string
          presupuesto_inicial: number
          prioridad: string
          proyecto_id: string
          situacion: string
          tipo_presupuesto: string
        }
        Insert: {
          aplica_gg_utilidad?: boolean
          avance_pct?: number
          created_at?: string
          especialidad: string
          id?: string
          nombre: string
          presupuesto_inicial?: number
          prioridad?: string
          proyecto_id: string
          situacion?: string
          tipo_presupuesto?: string
        }
        Update: {
          aplica_gg_utilidad?: boolean
          avance_pct?: number
          created_at?: string
          especialidad?: string
          id?: string
          nombre?: string
          presupuesto_inicial?: number
          prioridad?: string
          proyecto_id?: string
          situacion?: string
          tipo_presupuesto?: string
        }
        Relationships: [
          {
            foreignKeyName: "partidas_proyecto_id_fkey"
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
          created_at: string
          estado: Database["public"]["Enums"]["estado_proyecto"]
          fecha_fin: string | null
          fecha_inicio: string | null
          id: string
          nombre: string
          pct_gastos_generales: number
          pct_utilidad: number
          prioridad: string
          situacion: string
          ubicacion: string
        }
        Insert: {
          cliente?: string
          created_at?: string
          estado?: Database["public"]["Enums"]["estado_proyecto"]
          fecha_fin?: string | null
          fecha_inicio?: string | null
          id?: string
          nombre: string
          pct_gastos_generales?: number
          pct_utilidad?: number
          prioridad?: string
          situacion?: string
          ubicacion?: string
        }
        Update: {
          cliente?: string
          created_at?: string
          estado?: Database["public"]["Enums"]["estado_proyecto"]
          fecha_fin?: string | null
          fecha_inicio?: string | null
          id?: string
          nombre?: string
          pct_gastos_generales?: number
          pct_utilidad?: number
          prioridad?: string
          situacion?: string
          ubicacion?: string
        }
        Relationships: []
      }
      tareos: {
        Row: {
          asistencia: number
          costo_soles: number
          created_at: string
          fecha: string
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
          condicion_pago: string
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
          condicion_pago?: string
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
          condicion_pago?: string
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
          banco: string
          cargo: string
          categoria: Database["public"]["Enums"]["categoria_obrero"]
          cci: string
          created_at: string
          dni: string
          id: string
          jornal_diario: number
          nombre: string
          numero_celular: string
          numero_cuenta: string
        }
        Insert: {
          activo?: boolean
          banco?: string
          cargo?: string
          categoria?: Database["public"]["Enums"]["categoria_obrero"]
          cci?: string
          created_at?: string
          dni?: string
          id?: string
          jornal_diario?: number
          nombre: string
          numero_celular?: string
          numero_cuenta?: string
        }
        Update: {
          activo?: boolean
          banco?: string
          cargo?: string
          categoria?: Database["public"]["Enums"]["categoria_obrero"]
          cci?: string
          created_at?: string
          dni?: string
          id?: string
          jornal_diario?: number
          nombre?: string
          numero_celular?: string
          numero_cuenta?: string
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
          cliente_id: string | null
          concepto: string
          created_at: string
          estado: Database["public"]["Enums"]["estado_venta"]
          fecha_pago: string | null
          id: string
          moneda: Database["public"]["Enums"]["moneda"]
          monto: number
          monto_soles: number
          numero_factura: string
          proyecto_id: string
          tipo_cambio: number
        }
        Insert: {
          cliente_id?: string | null
          concepto: string
          created_at?: string
          estado?: Database["public"]["Enums"]["estado_venta"]
          fecha_pago?: string | null
          id?: string
          moneda?: Database["public"]["Enums"]["moneda"]
          monto?: number
          monto_soles?: number
          numero_factura?: string
          proyecto_id: string
          tipo_cambio?: number
        }
        Update: {
          cliente_id?: string | null
          concepto?: string
          created_at?: string
          estado?: Database["public"]["Enums"]["estado_venta"]
          fecha_pago?: string | null
          id?: string
          moneda?: Database["public"]["Enums"]["moneda"]
          monto?: number
          monto_soles?: number
          numero_factura?: string
          proyecto_id?: string
          tipo_cambio?: number
        }
        Relationships: [
          {
            foreignKeyName: "ventas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "terceros"
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
