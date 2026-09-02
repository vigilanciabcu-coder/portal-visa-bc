import React from 'react';
import { ExternalLink } from 'lucide-react';

interface AutoLinkTextProps {
  text: string;
  className?: string;
  linkClassName?: string;
  showIcon?: boolean;
}

// Regex to capture http://, https://, and www. links
const URL_REGEX = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;

export const AutoLinkText: React.FC<AutoLinkTextProps> = ({
  text,
  className = '',
  linkClassName = 'text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline font-bold inline-flex items-center gap-0.5 break-all cursor-pointer transition',
  showIcon = true,
}) => {
  if (!text) return null;

  const parts: (string | { url: string; href: string })[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = URL_REGEX.exec(text)) !== null) {
    const rawUrl = match[0];
    const startIndex = match.index;

    // Remove trailing punctuation that may not belong to the URL (like . , ) ] )
    let cleanUrl = rawUrl;
    let trailingPunctuation = '';
    while (cleanUrl.length > 0 && /[.,;:!?)\]}>]$/.test(cleanUrl)) {
      trailingPunctuation = cleanUrl.slice(-1) + trailingPunctuation;
      cleanUrl = cleanUrl.slice(0, -1);
    }

    if (startIndex > lastIndex) {
      parts.push(text.substring(lastIndex, startIndex));
    }

    const href = cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://')
      ? cleanUrl
      : `https://${cleanUrl}`;

    parts.push({ url: cleanUrl, href });

    if (trailingPunctuation) {
      parts.push(trailingPunctuation);
    }

    lastIndex = startIndex + rawUrl.length;
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return (
    <span className={className}>
      {parts.map((part, index) => {
        if (typeof part === 'string') {
          return <React.Fragment key={index}>{part}</React.Fragment>;
        }

        return (
          <a
            key={index}
            href={part.href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            title={`Abrir link externo: ${part.href}`}
            className={linkClassName}
          >
            <span>{part.url}</span>
            {showIcon && <ExternalLink className="w-3 h-3 inline shrink-0" />}
          </a>
        );
      })}
    </span>
  );
};
