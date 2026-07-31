import { defineConfig } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';

// Next 16 ha rimosso `next lint`: il lint gira con la CLI ESLint (`npm run lint`)
// e la configurazione e' in formato flat (ESLint 9). Sostituisce .eslintrc.json,
// che estendeva "next/core-web-vitals".
//
// I preset vanno spalmati al primo livello (`[...nextVitals]`), come nella
// documentazione Next 16: annidarli in `extends` registra i plugin piu' volte e
// ogni problema viene segnalato in copie multiple.
export default defineConfig([...nextVitals]);
