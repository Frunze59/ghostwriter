import { useState, useEffect } from 'react';
import { Trash2 } from 'lucide-react';
import { ContentTypeSelector } from './components/ContentTypeSelector';
import { GeneratorForm } from './components/GeneratorForm';
import { OutputPanel } from './components/OutputPanel';
import { useGenerate } from './hooks/useGenerate';
import { useHistory } from './hooks/useHistory';
import type { ContentType } from './types';

const CONTENT_TYPE_ICONS: Record<ContentType, string> = {
  blog_post:    '✍️',
  email:        '📧',
  story:        '📖',
  social_media: '📣',
};

function timeAgo(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60)   return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function App() {
  const [contentType, setContentType] = useState<ContentType>('blog_post');
  const { status, text, processed, metadata, error, fieldErrors, generate, stop, restore, reset } = useGenerate();
  const { items: history, addItem, clearHistory } = useHistory();

  useEffect(() => {
    if (status === 'done' && processed && metadata) {
      addItem(metadata.content_type as ContentType, processed, metadata);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  function handleTypeChange(type: ContentType) {
    setContentType(type);
    reset();
  }

  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">

      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-3">
        <span className="text-xl">✍️</span>
        <span className="font-bold text-gray-900 tracking-tight text-lg">Ghostwriter</span>
        <span className="text-xs text-gray-400 font-medium ml-1">AI Content Generator</span>
      </header>

      <main className="flex-1 flex overflow-hidden">

        <aside className="w-80 xl:w-96 flex-shrink-0 bg-white border-r border-gray-200
                          flex flex-col overflow-y-auto">
          <div className="p-5 flex flex-col gap-6">
            <ContentTypeSelector selected={contentType} onChange={handleTypeChange} />
            <div className="border-t border-gray-100" />
            <GeneratorForm
              contentType={contentType}
              status={status}
              fieldErrors={fieldErrors}
              onGenerate={generate}
            />

            {history.length > 0 && (
              <>
                <div className="border-t border-gray-100" />
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Recent</p>
                    <button
                      onClick={clearHistory}
                      className="text-gray-300 hover:text-red-400 transition-colors"
                      title="Clear history"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                  <ul className="flex flex-col gap-1.5">
                    {history.map(item => (
                      <li key={item.id}>
                        <button
                          onClick={() => restore(item.processed, item.metadata)}
                          className="w-full text-left px-3 py-2 rounded-lg border border-gray-100
                                     hover:border-violet-200 hover:bg-violet-50/40 transition-all duration-100 group"
                        >
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm">{CONTENT_TYPE_ICONS[item.content_type]}</span>
                            <span className="text-xs font-medium text-gray-700 truncate flex-1 group-hover:text-violet-700">
                              {item.title ?? item.preview.slice(0, 40)}
                            </span>
                            <span className="text-xs text-gray-300 flex-shrink-0">{timeAgo(item.timestamp)}</span>
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5 truncate pl-5">{item.preview}</p>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}
          </div>
        </aside>

        <section className="flex-1 bg-white overflow-hidden flex flex-col">
          <OutputPanel
            text={text}
            status={status}
            metadata={metadata}
            processed={processed}
            error={error}
            onReset={reset}
            onStop={stop}
          />
        </section>

      </main>
    </div>
  );
}
