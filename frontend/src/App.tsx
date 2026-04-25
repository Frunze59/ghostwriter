import { useState } from 'react';
import { ContentTypeSelector } from './components/ContentTypeSelector';
import { GeneratorForm } from './components/GeneratorForm';
import { OutputPanel } from './components/OutputPanel';
import { useGenerate } from './hooks/useGenerate';
import type { ContentType } from './types';

export default function App() {
  const [contentType, setContentType] = useState<ContentType>('blog_post');
  const { status, text, metadata, error, generate, reset } = useGenerate();

  function handleTypeChange(type: ContentType) {
    setContentType(type);
    reset();
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-3">
        <span className="text-xl">✍️</span>
        <span className="font-bold text-gray-900 tracking-tight text-lg">Ghostwriter</span>
        <span className="text-xs text-gray-400 font-medium ml-1">AI Content Generator</span>
      </header>

      {/* ── Main layout ────────────────────────────────────────────────────── */}
      <main className="flex-1 flex overflow-hidden">

        {/* Left panel — form */}
        <aside className="w-80 xl:w-96 flex-shrink-0 bg-white border-r border-gray-200
                          flex flex-col overflow-y-auto">
          <div className="p-5 flex flex-col gap-6">
            <ContentTypeSelector selected={contentType} onChange={handleTypeChange} />
            <div className="border-t border-gray-100" />
            <GeneratorForm
              contentType={contentType}
              status={status}
              onGenerate={generate}
            />
          </div>
        </aside>

        {/* Right panel — output */}
        <section className="flex-1 bg-white overflow-hidden flex flex-col">
          <OutputPanel
            text={text}
            status={status}
            metadata={metadata}
            error={error}
            onReset={reset}
          />
        </section>

      </main>
    </div>
  );
}
