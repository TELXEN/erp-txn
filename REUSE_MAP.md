# Mapping for Electronic Comprobante PDF Reuse

This document maps the existing Preliquidation design and data flow for reuse in Electronic Invoices (Factura, Boleta, Notas).

## 1. Visual Mapping (UI/Design)

| Component | Preliquidation Pattern | Reusable Comprobante Mapping |
|-----------|-------------------------|------------------------------|
| **Header** | Emerald/Slate branded header | Identical branding, dynamic title (Factura, etc.) |
| **Title Box** | "PRELIQUIDACIÓN" label | "FACTURA ELECTRÓNICA", "BOLETA", etc. |
| **Issuer Info**| Company RUC, Address, Logo | Identical (Mandatory for Sunat) |
| **Client Info**| Customer RUC, Address | Mandatory (RUC/DNI, Reason Social) |
| **Project Info**| Project & Order of Purchase | Optional (referential) |
| **Line Items** | Hierarchical coding (01.01) | Identical structure (Quantity, Unit, P.U, Total) |
| **Summary** | Net, IGV, Total | Identical, add "Monto en Letras" |
| **Banking** | Accounts & Detractions | Crucial for Facturas subject to detracción |
| **Footer** | Disclaimer text | Replace with "Representación impresa..." and Hash |
| **New Element**| N/A | **QR Code** (Standard placement bottom-left) |

## 2. Data Flow Mapping

### Step A: Source Data (Supabase)
- **Issuer**: `empresa_config` (RUC, Razon Social, Address).
- **Document**: `comprobantes` (New table or existing `valorizaciones` relation).
- **Items**: `comprobante_items` (linked to document).
- **Customer**: `terceros` (RUC, Name, Address).

### Step B: Transformation (Mapping Function)
Create a mapper that converts DB records to the common `DatosComprobanteElectronico` interface:
```typescript
const mapToPdfData = (doc, items, empresa, cliente): DatosComprobanteElectronico => ({
  tipoDocumento: doc.tipo === 'f' ? 'FACTURA' : 'BOLETA',
  codigo: `${doc.serie}-${doc.correlativo}`,
  fechaEmision: doc.fecha_emision,
  empresa: { ... },
  cliente: { ... },
  moneda: doc.moneda,
  tipoCambio: doc.tipo_cambio,
  lineas: items.map(i => ({ ... })),
  subtotal: doc.base_imponible,
  igv: doc.igv,
  total: doc.total,
  hash: doc.hash_sunat,
  qrCodeUrl: doc.qr_url,
  montoEnLetras: convertirANumeroLetras(doc.total, doc.moneda)
});
```

### Step C: Rendering (@react-pdf/renderer)
Reuse `pdfStyles` and shared components to maintain 100% visual consistency.

## 3. Implementation Plan

1.  **Shared Types**: Define `src/types/comprobantes.ts` (Done).
2.  **Shared Styles**: Extract `src/components/pdf/ComprobantePdfStyles.ts` (Done).
3.  **Refactor**: Modify `PreliquidacionPdf.tsx` to use these shared styles and types.
4.  **New Component**: Create `ComprobanteElectronicoPdf.tsx` using the same patterns.


## 4. File References

- **Shared Types**: `src/types/comprobantes.ts`
- **Shared Styles**: `src/components/pdf/ComprobantePdfStyles.ts`
- **Base PDF Component**: `src/components/pdf/ComprobantePdf.tsx`
- **Legacy Pattern Source**: `src/components/PreliquidacionPdf.tsx`

