import React from 'react';

interface FormattedChatMessageProps {
  text: string;
  className?: string;
}

/**
 * Parses and renders rich text formatting in chat messages:
 * - Bold: **text**
 * - Italic: *text* or _text_
 * - Strikethrough / Cross text: ~~text~~
 * - Inline Code: `code`
 * - Highlight: ==text==
 * - Lists: lines starting with "- " or "* "
 */
export const FormattedChatMessage: React.FC<FormattedChatMessageProps> = ({ text, className = '' }) => {
  if (!text) return null;

  const renderFormattedLine = (line: string, lineIndex: number) => {
    // Check if line is a bullet point
    const isBullet = line.trim().startsWith('- ') || line.trim().startsWith('* ');
    const contentToParse = isBullet ? line.trim().substring(2) : line;

    // Helper function to tokenize and parse inline formatting
    const parseInline = (raw: string): React.ReactNode[] => {
      // Regex matching bold (**text**), strikethrough (~~text~~), code (`text`), highlight (==text==), italic (*text*)
      const regex = /(\*\*.*?\*\*|~~.*?~~|`.*?`|==.*?==|\*.*?\*|_.*?_)/g;
      const parts = raw.split(regex);

      return parts.map((part, index) => {
        if (!part) return null;

        if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
          return (
            <strong key={index} className="font-extrabold">
              {part.slice(2, -2)}
            </strong>
          );
        }

        if (part.startsWith('~~') && part.endsWith('~~') && part.length > 4) {
          return (
            <span key={index} className="line-through opacity-80 decoration-rose-500 decoration-2">
              {part.slice(2, -2)}
            </span>
          );
        }

        if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
          return (
            <code
              key={index}
              className="rounded bg-black/10 dark:bg-white/15 px-1.5 py-0.5 font-mono text-[11px] border border-black/5 dark:border-white/10"
            >
              {part.slice(1, -1)}
            </code>
          );
        }

        if (part.startsWith('==') && part.endsWith('==') && part.length > 4) {
          return (
            <mark
              key={index}
              className="rounded bg-amber-200/90 dark:bg-amber-900/80 px-1 text-slate-900 dark:text-amber-100 font-medium"
            >
              {part.slice(2, -2)}
            </mark>
          );
        }

        if ((part.startsWith('*') && part.endsWith('*') && part.length > 2) ||
            (part.startsWith('_') && part.endsWith('_') && part.length > 2)) {
          return (
            <em key={index} className="italic">
              {part.slice(1, -1)}
            </em>
          );
        }

        return <span key={index}>{part}</span>;
      });
    };

    if (isBullet) {
      return (
        <li key={lineIndex} className="ml-4 list-disc space-y-0.5">
          {parseInline(contentToParse)}
        </li>
      );
    }

    return (
      <div key={lineIndex} className="min-h-[1.25em]">
        {parseInline(contentToParse)}
      </div>
    );
  };

  const lines = text.split('\n');

  return (
    <div className={`space-y-0.5 break-words ${className}`}>
      {lines.map((line, idx) => renderFormattedLine(line, idx))}
    </div>
  );
};
