/** Konfigurace pro lokální build Tailwindu (náhrada za cdn.tailwindcss.com).
 *  Build: npx tailwindcss@3.4.17 -c tailwind.config.js -i tailwind-input.css -o tailwind.css --minify
 *  Safelist pokrývá dynamicky skládané třídy v JS (bg-${c}-500 apod.) — viz _GUIDES,
 *  _carrierRadios (accent) a chat notifikace; barvy: sky|pink|indigo|amber|violet|fuchsia|rose|red|gray.
 */
const DYN = '(sky|pink|indigo|amber|violet|fuchsia|rose|red|gray)';

module.exports = {
  content: ['./index.html'],
  darkMode: 'class',
  safelist: [
    { pattern: new RegExp(`^bg-${DYN}-(50|100|500|600)$`), variants: ['hover', 'has-[:checked]'] },
    { pattern: new RegExp(`^text-${DYN}-(500|600|700)$`), variants: ['hover'] },
    { pattern: new RegExp(`^border-${DYN}-(100|300|400)$`), variants: ['hover', 'has-[:checked]'] },
    { pattern: new RegExp(`^shadow-${DYN}-200$`) },
    { pattern: new RegExp(`^from-${DYN}-(50|300|400)$`) },
    { pattern: new RegExp(`^to-${DYN}-600$`) },
    { pattern: new RegExp(`^accent-${DYN}-500$`) },
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Sora"', '"Plus Jakarta Sans"', 'sans-serif'],
      },
      colors: {
        pastel: { blue: '#E0F2FE', pink: '#FCE7F3', bg: '#FDF8F3', text: '#334155' },
        top: { 50: '#fffbeb', 100: '#fef3c7', 400: '#fbbf24', 500: '#f59e0b', 600: '#d97706' },
      },
    },
  },
};
