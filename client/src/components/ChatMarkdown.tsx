import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import type { Components } from 'react-markdown';
import 'katex/dist/katex.min.css';

const mdComponents: Components = {
  p: ({ children }) => <p style={{ margin: '0 0 0.65em', lineHeight: 1.5 }}>{children}</p>,
  h1: ({ children }) => (
    <h1 style={{ fontSize: 15, fontWeight: 600, margin: '0.4em 0 0.35em', lineHeight: 1.35 }}>{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 style={{ fontSize: 14, fontWeight: 600, margin: '0.45em 0 0.3em', lineHeight: 1.35 }}>{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 style={{ fontSize: 13, fontWeight: 600, margin: '0.4em 0 0.25em', opacity: 0.95 }}>{children}</h3>
  ),
  ul: ({ children }) => <ul style={{ margin: '0.35em 0', paddingLeft: 18, lineHeight: 1.45 }}>{children}</ul>,
  ol: ({ children }) => <ol style={{ margin: '0.35em 0', paddingLeft: 18, lineHeight: 1.45 }}>{children}</ol>,
  li: ({ children }) => <li style={{ marginBottom: 4 }}>{children}</li>,
  strong: ({ children }) => <strong style={{ fontWeight: 600, color: 'rgba(255,255,255,0.96)' }}>{children}</strong>,
  em: ({ children }) => <em style={{ fontStyle: 'italic', opacity: 0.95 }}>{children}</em>,
  code: ({ className, children, ...props }) => {
    const isBlock = className?.includes('language-');
    if (isBlock) {
      return (
        <code
          className={className}
          style={{
            display: 'block',
            margin: '0.5em 0',
            padding: '10px 12px',
            borderRadius: 8,
            background: 'rgba(0,0,0,0.45)',
            border: '1px solid rgba(255,255,255,0.08)',
            fontSize: 11,
            overflowX: 'auto',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word'
          }}
          {...props}
        >
          {children}
        </code>
      );
    }
    return (
      <code
        style={{
          padding: '2px 5px',
          borderRadius: 4,
          background: 'rgba(0,229,200,0.1)',
          fontSize: '0.92em',
          border: '1px solid rgba(255,255,255,0.08)'
        }}
        {...props}
      >
        {children}
      </code>
    );
  },
  pre: ({ children }) => <pre style={{ margin: '0.5em 0', overflow: 'auto' }}>{children}</pre>,
  blockquote: ({ children }) => (
    <blockquote
      style={{
        margin: '0.45em 0',
        paddingLeft: 12,
        borderLeft: '3px solid rgba(0,229,200,0.35)',
        opacity: 0.92
      }}
    >
      {children}
    </blockquote>
  ),
  a: ({ href, children }) => (
    <a href={href} style={{ color: 'rgba(110, 231, 183, 0.95)', textDecoration: 'underline' }} target="_blank" rel="noreferrer">
      {children}
    </a>
  ),
  hr: () => <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.1)', margin: '0.65em 0' }} />,
  table: ({ children }) => (
    <div style={{ overflowX: 'auto', margin: '0.5em 0' }}>
      <table style={{ borderCollapse: 'collapse', fontSize: 11, width: '100%' }}>{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th style={{ border: '1px solid rgba(255,255,255,0.12)', padding: '6px 8px', textAlign: 'left' }}>{children}</th>
  ),
  td: ({ children }) => (
    <td style={{ border: '1px solid rgba(255,255,255,0.08)', padding: '6px 8px' }}>{children}</td>
  )
};

export function ChatMarkdown({ content }: { content: string }) {
  return (
    <div className="chat-md-root" style={{ fontSize: 12, lineHeight: 1.5, wordBreak: 'break-word' }}>
      <style>{`
        .chat-md-root .katex { color: rgba(255,255,255,0.92) !important; }
        .chat-md-root .katex-display { margin: 0.6em 0 !important; overflow-x: auto; }
      `}</style>
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]} components={mdComponents}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
