import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Copy, Download, Edit3, Eye, RotateCcw, CheckCheck } from 'lucide-react';
import type { GenerationStatus, GenerationMetadata, ProcessedOutput } from '../types';

interface Props {
  text: string;
  status: GenerationStatus;
  metadata: GenerationMetadata | null;
  processed: ProcessedOutput | null;
  error: string | null;
  onReset: () => void;
}

export function OutputPanel({ text, status, metadata, processed, error, onReset }: Props) {
  const [isEditing, setIsEditing]   = useState(false);
  const [edited, setEdited]         = useState('');
  const [copied, setCopied]         = useState(false);

  // When generation finishes, seed the editor with the generated text
  // so edits start from the full content
  const displayText = isEditing ? edited : text;
  const isDone      = status === 'done';

  function handleEditToggle() {
    if (!isEditing) setEdited(text);   // copy current output into editor
    setIsEditing(v => !v);
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(isEditing ? edited : text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleDownload(format: 'md' | 'txt') {
    const content = isEditing ? edited : text;
    const plain   = format === 'txt'
      ? content.replace(/#{1,6}\s/g, '').replace(/\*\*/g, '').replace(/\*/g, '')
      : content;
    const blob = new Blob([plain], { type: 'text/plain' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `ghostwriter-output.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handlePrint() {
    const content  = isEditing ? edited : text;
    const win      = window.open('', '_blank')!;
    win.document.write(`
      <html><head><title>Ghostwriter Export</title>
      <style>
        body { font-family: Georgia, serif; max-width: 720px; margin: 48px auto; color: #111; line-height: 1.7; }
        h1 { font-size: 2em; } h2 { font-size: 1.4em; } h3 { font-size: 1.1em; }
        pre { background: #f4f4f4; padding: 12px; border-radius: 4px; }
      </style></head>
      <body><pre style="white-space:pre-wrap;font-family:inherit">${content.replace(/</g, '&lt;')}</pre>
      </body></html>
    `);
    win.print();
    win.close();
  }

  // ── Empty / error states ────────────────────────────────────────────────────
  if (status === 'idle') {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-8 text-gray-300">
        <span className="text-5xl mb-4">✨</span>
        <p className="text-sm font-medium">Your generated content will appear here</p>
        <p className="text-xs mt-1">Fill in the form and hit Generate</p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center">
        <span className="text-4xl mb-3">⚠️</span>
        <p className="text-sm font-semibold text-red-600 mb-1">Generation failed</p>
        <p className="text-xs text-gray-400 mb-4">{error}</p>
        <button onClick={onReset}
          className="flex items-center gap-1.5 text-xs text-violet-600 hover:underline">
          <RotateCcw size={12} /> Try again
        </button>
      </div>
    );
  }

  // ── Toolbar ─────────────────────────────────────────────────────────────────
  const toolbar = isDone && (
    <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-gray-100 bg-gray-50/50">
      {/* Edit / Preview toggle */}
      <button onClick={handleEditToggle}
        className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-gray-200
                   text-gray-500 hover:text-violet-600 hover:border-violet-300 transition-colors">
        {isEditing ? <><Eye size={12} /> Preview</> : <><Edit3 size={12} /> Edit</>}
      </button>

      <div className="flex-1" />

      {/* Export actions */}
      <button onClick={handleCopy}
        className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-gray-200
                   text-gray-500 hover:text-violet-600 hover:border-violet-300 transition-colors">
        {copied ? <><CheckCheck size={12} className="text-green-500" /> Copied!</> : <><Copy size={12} /> Copy</>}
      </button>
      <button onClick={() => handleDownload('md')}
        className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-gray-200
                   text-gray-500 hover:text-violet-600 hover:border-violet-300 transition-colors">
        <Download size={12} /> .md
      </button>
      <button onClick={() => handleDownload('txt')}
        className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-gray-200
                   text-gray-500 hover:text-violet-600 hover:border-violet-300 transition-colors">
        <Download size={12} /> .txt
      </button>
      <button onClick={handlePrint}
        className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-gray-200
                   text-gray-500 hover:text-violet-600 hover:border-violet-300 transition-colors">
        <Download size={12} /> PDF
      </button>
      <button onClick={onReset}
        className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-gray-200
                   text-gray-500 hover:text-red-500 hover:border-red-300 transition-colors ml-1">
        <RotateCcw size={12} /> New
      </button>
    </div>
  );

  // ── Metadata strip ───────────────────────────────────────────────────────────
  const metaStrip = isDone && (
    <div className="px-4 py-2 text-xs text-gray-400 border-t border-gray-100 bg-gray-50/50
                    flex gap-4 flex-wrap items-center">
      {processed && (
        <>
          <span className="font-medium text-gray-600">{processed.word_count} words</span>
          <span>{processed.estimated_read_time}</span>
          {processed.validation.word_count_delta_pct !== null && (
            <span className={processed.validation.word_count_ok ? 'text-green-500' : 'text-amber-500'}>
              {processed.validation.word_count_ok ? '✓' : '⚠'} target{' '}
              {processed.validation.word_count_delta_pct > 0 ? '+' : ''}
              {processed.validation.word_count_delta_pct}%
            </span>
          )}
          {processed.validation.artifacts_removed > 0 && (
            <span className="text-violet-400">
              ✦ {processed.validation.artifacts_removed} artifact{processed.validation.artifacts_removed > 1 ? 's' : ''} cleaned
            </span>
          )}
          <span className="ml-auto" />
        </>
      )}
      {metadata && (
        <>
          <span>{metadata.model}</span>
          <span>{metadata.input_tokens}→{metadata.output_tokens} tokens</span>
        </>
      )}
    </div>
  );

  // ── Content area ─────────────────────────────────────────────────────────────
  return (
    <div className="h-full flex flex-col">
      {toolbar}

      <div className="flex-1 overflow-y-auto">
        {isEditing ? (
          <textarea
            value={edited}
            onChange={e => setEdited(e.target.value)}
            className="w-full h-full min-h-full p-5 text-sm font-mono text-gray-800
                       border-none outline-none resize-none bg-white leading-relaxed"
          />
        ) : (
          <div className="p-5 prose prose-sm prose-violet max-w-none text-gray-800">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {displayText}
            </ReactMarkdown>
            {/* Blinking cursor while streaming */}
            {status === 'generating' && (
              <span className="inline-block w-0.5 h-4 bg-violet-500 animate-pulse ml-0.5 align-middle" />
            )}
          </div>
        )}
      </div>

      {metaStrip}
    </div>
  );
}
