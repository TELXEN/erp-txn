export type LineaComprobante = {
  descripcion: string;
  unidad: string;
  cantidad: number;
  precioUnitario: number;
};

export type CuentaBancaria = {
  nombre: string;
  numero: string;
  cci: string;
  moneda: string;
  tipoCuenta: string;
  esDetraccion?: boolean;
};

export type DatosEmpresa = {
  razonSocial: string;
  eslogan?: string;
  ruc: string;
  direccion: string;
  telefono?: string;
  email?: string;
  web?: string;
  logoUrl?: string;
};

export type DatosCliente = {
  razonSocial: string;
  ruc: string;
  direccion?: string;
};

export type TipoDocumento = 'PRELIQUIDACION' | 'FACTURA' | 'BOLETA' | 'NOTA_CREDITO' | 'NOTA_DEBITO';

export interface DatosComprobanteBase {
  tipoDocumento: TipoDocumento;
  codigo: string;
  fechaEmision: string;
  empresa: DatosEmpresa;
  cliente: DatosCliente;
  proyecto?: string;
  ordenCompra?: string;
  moneda: 'PEN' | 'USD';
  tipoCambio: number;
  lineas: LineaComprobante[];
  subtotal: number;
  igv: number;
  total: number;
  condicionPago?: string;
  diasCredito?: number;
  fechaVencimiento?: string;
  cuentasBancarias?: CuentaBancaria[];
  observacion?: string;
}

export interface DatosComprobanteElectronico extends DatosComprobanteBase {
  hash?: string;
  qrCodeUrl?: string;
  montoEnLetras?: string;
  leyendas?: string[];
}
