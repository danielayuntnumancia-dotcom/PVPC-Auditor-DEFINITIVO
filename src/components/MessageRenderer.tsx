import React from 'react';

interface Token {
  type: 'text' | 'bold' | 'underline' | 'price' | 'percent';
  text: string;
}

export function parseInlineText(text: string): React.ReactNode[] {
  let tokens: Token[] = [{ type: 'text', text }];

  // 1. Split for Bold: **bold**
  let nextTokens: Token[] = [];
  for (const token of tokens) {
    if (token.type === 'text') {
      const parts = token.text.split('**');
      for (let i = 0; i < parts.length; i++) {
        if (i % 2 === 1) {
          nextTokens.push({ type: 'bold', text: parts[i] });
        } else if (parts[i]) {
          nextTokens.push({ type: 'text', text: parts[i] });
        }
      }
    } else {
      nextTokens.push(token);
    }
  }
  tokens = nextTokens;

  // 2. Split for Underline: _underline_
  nextTokens = [];
  for (const token of tokens) {
    if (token.type === 'text') {
      const parts = token.text.split('_');
      for (let i = 0; i < parts.length; i++) {
        if (i % 2 === 1) {
          nextTokens.push({ type: 'underline', text: parts[i] });
        } else if (parts[i]) {
          nextTokens.push({ type: 'text', text: parts[i] });
        }
      }
    } else {
      nextTokens.push(token);
    }
  }
  tokens = nextTokens;

  // 3. Highlight Euro Prices (e.g. "12.34 €" or "0.15 €/kWh" or "10€")
  nextTokens = [];
  for (const token of tokens) {
    if (token.type === 'text') {
      // Matches prices like 12.34 €, 0.125 €/kWh, 10€, 12,50€, etc.
      const priceRegex = /(\d+(?:[\.,]\d+)?\s*€(?:\/kWh|\/kW\/año|\/kW\/día)?|\d+\s*€)/g;
      const parts = token.text.split(priceRegex);
      const matches = token.text.match(priceRegex) || [];
      let matchIdx = 0;
      
      for (let i = 0; i < parts.length; i++) {
        if (parts[i] !== undefined && parts[i] !== '') {
          if (matches[matchIdx] && parts[i] === matches[matchIdx]) {
            nextTokens.push({ type: 'price', text: parts[i] });
            matchIdx++;
          } else {
            nextTokens.push({ type: 'text', text: parts[i] });
          }
        }
      }
    } else {
      nextTokens.push(token);
    }
  }
  tokens = nextTokens;

  // 4. Split for Percentages (e.g. "15%")
  nextTokens = [];
  for (const token of tokens) {
    if (token.type === 'text') {
      const percentRegex = /(\d+(?:[\.,]\d+)?\s*%)/g;
      const parts = token.text.split(percentRegex);
      const matches = token.text.match(percentRegex) || [];
      let matchIdx = 0;
      
      for (let i = 0; i < parts.length; i++) {
        if (parts[i] !== undefined && parts[i] !== '') {
          if (matches[matchIdx] && parts[i] === matches[matchIdx]) {
            nextTokens.push({ type: 'percent', text: parts[i] });
            matchIdx++;
          } else {
            nextTokens.push({ type: 'text', text: parts[i] });
          }
        }
      }
    } else {
      nextTokens.push(token);
    }
  }
  tokens = nextTokens;

  return tokens.map((t, idx) => {
    switch (t.type) {
      case 'bold':
        return (
          <strong key={idx} className="font-extrabold text-indigo-200 dark:text-indigo-200 drop-shadow-sm">
            {t.text}
          </strong>
        );
      case 'underline':
        return (
          <span key={idx} className="underline decoration-indigo-400/80 underline-offset-4 text-white font-medium">
            {t.text}
          </span>
        );
      case 'price':
        return (
          <span key={idx} className="inline-block font-mono font-bold text-amber-300 bg-slate-900 border border-slate-800/80 px-1.5 py-0.5 rounded leading-none mx-0.5 shadow-2xs">
            {t.text}
          </span>
        );
      case 'percent':
        return (
          <span key={idx} className="inline-block font-mono font-bold text-emerald-400 bg-emerald-950/40 px-1.5 py-0.5 rounded leading-none border border-emerald-900/40 mx-0.5">
            {t.text}
          </span>
        );
      default:
        return <span key={idx}>{t.text}</span>;
    }
  });
}

interface MessageRendererProps {
  content: string;
}

export default function MessageRenderer({ content }: MessageRendererProps) {
  if (!content) return null;

  const lines = content.split('\n');

  return (
    <div className="space-y-1 text-slate-200 leading-relaxed select-text">
      {lines.map((line, lineIdx) => {
        const trimmed = line.trim();

        // 1. Skip completely empty lines, but render small spacing
        if (!trimmed) {
          return <div key={lineIdx} className="h-2" />;
        }

        // 2. Headers
        if (trimmed.startsWith('###')) {
          const title = trimmed.replace(/^###\s*/, '');
          return (
            <h3 
              key={lineIdx} 
              className="text-xs font-bold text-indigo-300 uppercase tracking-wider mt-4 mb-2 flex items-center gap-1.5 border-b border-slate-800/60 pb-1.5"
            >
              <span className="w-1.5 h-3 bg-indigo-500 rounded-xs" />
              {parseInlineText(title)}
            </h3>
          );
        }

        if (trimmed.startsWith('##') || trimmed.startsWith('#')) {
          const title = trimmed.replace(/^#+\s*/, '');
          return (
            <h2 
              key={lineIdx} 
              className="text-sm font-extrabold text-white tracking-tight mt-5 mb-3 flex items-center gap-2"
            >
              <span className="w-2 h-4 bg-indigo-600 rounded-xs" />
              {parseInlineText(title)}
            </h2>
          );
        }

        // 3. Bullet list items
        if (trimmed.startsWith('* ') || trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
          const itemText = trimmed.replace(/^(\*\s*|-\s*|•\s*)/, '');
          
          // Let's choose a nice bullet emoji or symbol based on keywords for beautiful visuals
          let icon = '✦';
          const lowerText = itemText.toLowerCase();
          if (lowerText.includes('ahorro') || lowerText.includes('barat') || lowerText.includes('descuento') || lowerText.includes('pro')) {
            icon = '💰';
          } else if (lowerText.includes('potencia') || lowerText.includes('kw') || lowerText.includes('luz') || lowerText.includes('electric')) {
            icon = '⚡';
          } else if (lowerText.includes('atención') || lowerText.includes('cuidado') || lowerText.includes('ojo') || lowerText.includes('advert') || lowerText.includes('con:')) {
            icon = '⚠️';
          } else if (lowerText.includes('consejo') || lowerText.includes('idea') || lowerText.includes('recomend')) {
            icon = '💡';
          } else if (lowerText.includes('analiz') || lowerText.includes('calcul') || lowerText.includes('factura')) {
            icon = '📊';
          }

          return (
            <div key={lineIdx} className="flex items-start gap-2 py-1 pl-1 hover:bg-slate-900/30 rounded-lg transition-colors duration-150">
              <span className="text-indigo-400 font-bold mt-0.5 shrink-0 text-xs w-4 text-center">{icon}</span>
              <div className="flex-1 text-slate-300 text-xs sm:text-sm">
                {parseInlineText(itemText)}
              </div>
            </div>
          );
        }

        // 4. Standard text line
        return (
          <p key={lineIdx} className="text-xs sm:text-sm my-1 text-slate-300">
            {parseInlineText(line)}
          </p>
        );
      })}
    </div>
  );
}
