// Server-side stand-in for @react-pdf/renderer. PDFs are generated only in the browser;
// the real library breaks the published server at startup.
const noop = () => null;
const noDisponible = () => {
  throw new Error("La generación de PDF solo está disponible en el navegador.");
};
export const Document = noop;
export const Page = noop;
export const Text = noop;
export const View = noop;
export const Image = noop;
export const StyleSheet = { create: <T,>(s: T) => s };
export const Font = { register: () => {}, registerHyphenationCallback: () => {} };
export const pdf = noDisponible;
export default { Document, Page, Text, View, Image, StyleSheet, Font, pdf };
