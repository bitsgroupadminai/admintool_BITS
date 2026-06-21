/**
 * Lightweight markdown for chat bubbles — bold, lists, paragraphs.
 * Avoids showing raw ** in assistant replies.
 */
export function ChatMessageBody({ content, variant = 'assistant' }) {
  const lines = content.split('\n');

  return (
    <div
      className={`space-y-1.5 ${
        variant === 'user' ? 'text-white' : 'text-[#052E1C]'
      }`}
    >
      {lines.map((line, index) => {
        const trimmed = line.trim();

        if (!trimmed) {
          return <div key={`gap-${index}`} className="h-1" aria-hidden />;
        }

        const isNumbered = /^\d+\.\s/.test(trimmed);
        const isBullet = /^[-•]\s/.test(trimmed);

        return (
          <p
            key={index}
            className={`leading-relaxed ${
              isNumbered || isBullet ? 'pl-0.5' : ''
            } ${variant === 'user' ? 'text-white' : ''}`}
          >
            {parseInlineMarkdown(trimmed, variant)}
          </p>
        );
      })}
    </div>
  );
}

function parseInlineMarkdown(text, variant) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);

  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong
          key={index}
          className={variant === 'user' ? 'font-semibold text-white' : 'font-semibold text-[#052E1C]'}
        >
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={index}>{part}</span>;
  });
}
