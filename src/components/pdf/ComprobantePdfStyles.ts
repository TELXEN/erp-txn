import { StyleSheet } from "@react-pdf/renderer";

export const PDF_COLORS = {
  slate950: "#0f172a",
  slate700: "#334155",
  slate500: "#64748b",
  slate300: "#cbd5e1",
  slate100: "#f1f5f9",
  slate50: "#f8fafc",
  emerald800: "#065f46",
  emerald700: "#047857",
  emerald100: "#d1fae5",
  emerald50: "#ecfdf5",
  white: "#ffffff",
};

export const pdfStyles = StyleSheet.create({
  page: { padding: "32 34 30", fontFamily: "Helvetica", fontSize: 8.5, color: PDF_COLORS.slate700 },
  header: { flexDirection: "row", justifyContent: "space-between", borderBottomWidth: 2, borderBottomColor: PDF_COLORS.emerald700, paddingBottom: 12, marginBottom: 16 },
  brand: { width: 96, alignItems: "center", justifyContent: "center" },
  logo: { maxWidth: 96, maxHeight: 46, objectFit: "contain" },
  logoFallback: { width: 46, height: 46, borderRadius: 9, backgroundColor: PDF_COLORS.emerald700, color: PDF_COLORS.white, fontFamily: "Helvetica-Bold", fontSize: 14, textAlign: "center", lineHeight: 46 },
  company: { flex: 1, alignItems: "flex-end", paddingTop: 2 },
  companyName: { fontFamily: "Helvetica-Bold", fontSize: 8.5, color: PDF_COLORS.emerald800, letterSpacing: 0.3, textAlign: "right" },
  slogan: { fontFamily: "Helvetica", fontSize: 7, color: PDF_COLORS.emerald800, letterSpacing: 0.3, textAlign: "right", lineHeight: 1.3, marginTop: 2 },
  companyLine: { fontFamily: "Helvetica", fontSize: 7, color: PDF_COLORS.slate700, textAlign: "right", lineHeight: 1.35, marginTop: 3 },
  companyLineMt: { fontFamily: "Helvetica", fontSize: 7, color: PDF_COLORS.slate700, textAlign: "right", lineHeight: 1.35, marginTop: 1.5 },
  companyWeb: { fontFamily: "Helvetica", fontSize: 7, color: PDF_COLORS.emerald800, textAlign: "right", lineHeight: 1.35, marginTop: 1.5 },
  
  titleCol: { width: 145 },
  titleBox: { alignItems: "center", backgroundColor: PDF_COLORS.emerald50, borderTopWidth: 3, borderTopColor: PDF_COLORS.emerald700, borderRadius: 4, paddingVertical: 8, paddingHorizontal: 12 },
  boxTitle: { fontFamily: "Helvetica-Bold", fontSize: 12, color: PDF_COLORS.slate950, letterSpacing: 1.0, lineHeight: 1.15, textAlign: 'center' },
  boxRuc: { fontFamily: "Helvetica-Bold", fontSize: 8.5, color: PDF_COLORS.slate950, marginTop: 2 },
  boxCode: { fontFamily: "Helvetica-Bold", fontSize: 10, color: PDF_COLORS.slate950, marginTop: 1.5, letterSpacing: 0.5 },
  
  statusLine: { flexDirection: "row", justifyContent: "space-between", marginTop: 4 },
  statusText: { fontFamily: "Helvetica-Bold", fontSize: 7, color: PDF_COLORS.slate500, letterSpacing: 0.8 },
  
  infoBand: { flexDirection: "row", gap: 16, padding: 12, backgroundColor: PDF_COLORS.slate50, borderTopWidth: 1, borderBottomWidth: 1, borderColor: PDF_COLORS.slate300, marginBottom: 17 },
  infoColumn: { flex: 1 },
  label: { fontFamily: "Helvetica-Bold", fontSize: 6.7, color: PDF_COLORS.slate500, letterSpacing: 0.7, textTransform: "uppercase", marginBottom: 3 },
  value: { fontFamily: "Helvetica-Bold", fontSize: 9, color: PDF_COLORS.slate950, lineHeight: 1.3 },
  subvalue: { fontSize: 7.8, color: PDF_COLORS.slate500, lineHeight: 1.35, marginTop: 2 },
  
  sectionTitle: { fontFamily: "Helvetica-Bold", fontSize: 8, color: PDF_COLORS.emerald800, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 7 },
  
  table: { marginBottom: 15 },
  tableHeader: { flexDirection: "row", backgroundColor: PDF_COLORS.slate950, color: PDF_COLORS.white, minHeight: 24, alignItems: "center" },
  tableRow: { flexDirection: "row", minHeight: 27, alignItems: "center", borderBottomWidth: 0.7, borderBottomColor: PDF_COLORS.slate300 },
  tableRowAlt: { backgroundColor: PDF_COLORS.slate50 },
  cell: { paddingHorizontal: 6 },
  number: { width: "5%", textAlign: "center" },
  codeCell: { width: "10%", textAlign: "left" },
  description: { width: "35%" },
  unit: { width: "9%", textAlign: "center" },
  quantity: { width: "11%", textAlign: "right" },
  price: { width: "14%", textAlign: "right" },
  subtotal: { width: "16%", textAlign: "right" },
  
  summaryWrap: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 },
  paymentCard: { width: "52%", padding: 11, borderWidth: 1, borderColor: PDF_COLORS.slate300, borderRadius: 4 },
  paymentRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 5 },
  
  totals: { width: "42%" },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4, borderBottomWidth: 0.5, borderBottomColor: PDF_COLORS.slate300 },
  totalStrong: { flexDirection: "row", justifyContent: "space-between", padding: "8 7", backgroundColor: PDF_COLORS.slate950, color: PDF_COLORS.white, fontFamily: "Helvetica-Bold", fontSize: 10 },
  
  banking: { padding: 11, backgroundColor: PDF_COLORS.slate50, marginBottom: 13, flexGrow: 1 },
  bankList: { flexGrow: 1 },
  bankLabel: { fontFamily: "Helvetica-Bold", fontSize: 6.7, color: PDF_COLORS.slate500, letterSpacing: 0.7, textTransform: "uppercase", marginBottom: 1, marginTop: 2 },
  bankValue: { fontFamily: "Helvetica-Bold", fontSize: 9, color: PDF_COLORS.slate950, lineHeight: 1.2, marginTop: 1 },
  
  notes: { padding: 10, borderLeftWidth: 3, borderLeftColor: PDF_COLORS.emerald700, backgroundColor: PDF_COLORS.emerald50, marginBottom: 14 },
  legal: { fontSize: 7, lineHeight: 1.4, color: PDF_COLORS.slate500, marginTop: "auto", paddingTop: 12, borderTopWidth: 0.7, borderTopColor: PDF_COLORS.slate300 },
  footer: { position: "absolute", left: 34, right: 34, bottom: 14, flexDirection: "row", justifyContent: "space-between", color: PDF_COLORS.slate500, fontSize: 6.5 },
  
  qrContainer: { flexDirection: 'row', gap: 10, alignItems: 'center', marginTop: 10 },
  qrImage: { width: 60, height: 60 },
  hashText: { fontSize: 6, color: PDF_COLORS.slate500, marginTop: 2 },
});
