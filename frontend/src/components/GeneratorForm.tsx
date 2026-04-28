import { useState, useEffect } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import type { ContentType, FormValues, GenerationStatus } from '../types';

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1.5">
      {children}
    </label>
  );
}

function Input({ value, onChange, placeholder, error }: {
  value: string; onChange: (v: string) => void; placeholder?: string; error?: string;
}) {
  return (
    <>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full px-3 py-2 text-sm border rounded-lg bg-white
                   focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent
                   placeholder:text-gray-300 text-gray-800
                   ${error ? 'border-red-300' : 'border-gray-200'}`}
      />
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </>
  );
}

function Textarea({ value, onChange, placeholder, rows = 3, error }: {
  value: string; onChange: (v: string) => void; placeholder?: string; rows?: number; error?: string;
}) {
  return (
    <>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className={`w-full px-3 py-2 text-sm border rounded-lg bg-white
                   focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent
                   placeholder:text-gray-300 text-gray-800 resize-none
                   ${error ? 'border-red-300' : 'border-gray-200'}`}
      />
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </>
  );
}

function ButtonGroup({ label, options, value, onChange }: {
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="flex flex-wrap gap-1.5">
        {options.map(opt => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`px-3 py-1.5 text-xs rounded-full border transition-all duration-100 font-medium
              ${value === opt.value
                ? 'bg-violet-600 border-violet-600 text-white'
                : 'border-gray-200 text-gray-500 hover:border-violet-300 hover:text-violet-600'
              }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function Toggle({ label, value, onChange }: {
  label: string; value: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <Label>{label}</Label>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={`relative w-10 h-5 rounded-full transition-colors duration-200
          ${value ? 'bg-violet-500' : 'bg-gray-200'}`}
      >
        <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all duration-200
          ${value ? 'left-5' : 'left-0.5'}`} />
      </button>
    </div>
  );
}

const TONE_OPTIONS = [
  { value: 'professional',  label: 'Professional' },
  { value: 'casual',        label: 'Casual' },
  { value: 'engaging',      label: 'Engaging' },
  { value: 'humorous',      label: 'Humorous' },
  { value: 'formal',        label: 'Formal' },
  { value: 'inspirational', label: 'Inspirational' },
];

const DEFAULTS: Record<ContentType, FormValues> = {
  blog_post: {
    topic: '', target_audience: '', word_count: '800-1200',
    tone: 'engaging', seo_focus: true, expertise_level: 'beginner',
  },
  email: {
    purpose: '', recipient_context: '', key_points: '',
    tone: 'professional', urgency_level: 'medium', cta: '',
  },
  story: {
    genre: 'fantasy', characters: '', setting: '', length: 'short',
    style: '', target_audience: '', mood: '',
  },
  social_media: {
    product_service: '', platform: 'linkedin', goal: '',
    tone: 'engaging', cta: '',
  },
};

type Errors = Record<string, string>;

function BlogPostFields({ v, set, errors }: { v: FormValues; set: (k: string, val: string | boolean) => void; errors: Errors }) {
  return (
    <>
      <div><Label>Topic</Label>
        <Input value={v.topic as string} onChange={val => set('topic', val)}
          placeholder="e.g. Are there aliens among us?" error={errors.topic} />
      </div>
      <div><Label>Target audience</Label>
        <Input value={v.target_audience as string} onChange={val => set('target_audience', val)}
          placeholder="e.g. General public, tech enthusiasts…" error={errors.target_audience} />
      </div>
      <ButtonGroup label="Word count"
        options={[
          { value: '300-500',   label: '300–500' },
          { value: '500-800',   label: '500–800' },
          { value: '800-1200',  label: '800–1200' },
          { value: '1200-2000', label: '1200–2000' },
        ]}
        value={v.word_count as string} onChange={val => set('word_count', val)}
      />
      <ButtonGroup label="Tone" options={TONE_OPTIONS}
        value={v.tone as string} onChange={val => set('tone', val)}
      />
      <ButtonGroup label="Expertise level"
        options={[
          { value: 'beginner',     label: 'Beginner' },
          { value: 'intermediate', label: 'Intermediate' },
          { value: 'advanced',     label: 'Advanced' },
        ]}
        value={v.expertise_level as string} onChange={val => set('expertise_level', val)}
      />
      <Toggle label="SEO focus" value={v.seo_focus as boolean} onChange={val => set('seo_focus', val)} />
    </>
  );
}

function EmailFields({ v, set, errors }: { v: FormValues; set: (k: string, val: string | boolean) => void; errors: Errors }) {
  return (
    <>
      <div><Label>Purpose</Label>
        <Input value={v.purpose as string} onChange={val => set('purpose', val)}
          placeholder="e.g. Follow up after a product demo" error={errors.purpose} />
      </div>
      <div><Label>Recipient context</Label>
        <Input value={v.recipient_context as string} onChange={val => set('recipient_context', val)}
          placeholder="e.g. B2B client, decision maker at a SaaS company" error={errors.recipient_context} />
      </div>
      <div><Label>Key points</Label>
        <Textarea value={v.key_points as string} onChange={val => set('key_points', val)}
          placeholder="e.g. Pricing flexibility, 30-day trial, integration support" error={errors.key_points} />
      </div>
      <div><Label>Call to action</Label>
        <Input value={v.cta as string} onChange={val => set('cta', val)}
          placeholder="e.g. Book a follow-up call" error={errors.cta} />
      </div>
      <ButtonGroup label="Tone" options={TONE_OPTIONS}
        value={v.tone as string} onChange={val => set('tone', val)}
      />
      <ButtonGroup label="Urgency"
        options={[
          { value: 'low',    label: 'Low' },
          { value: 'medium', label: 'Medium' },
          { value: 'high',   label: 'High' },
        ]}
        value={v.urgency_level as string} onChange={val => set('urgency_level', val)}
      />
    </>
  );
}

function StoryFields({ v, set, errors }: { v: FormValues; set: (k: string, val: string | boolean) => void; errors: Errors }) {
  return (
    <>
      <ButtonGroup label="Genre"
        options={[
          { value: 'fantasy',   label: 'Fantasy' },
          { value: 'sci-fi',    label: 'Sci-Fi' },
          { value: 'romance',   label: 'Romance' },
          { value: 'thriller',  label: 'Thriller' },
          { value: 'mystery',   label: 'Mystery' },
          { value: 'horror',    label: 'Horror' },
          { value: 'adventure', label: 'Adventure' },
          { value: 'literary',  label: 'Literary' },
        ]}
        value={v.genre as string} onChange={val => set('genre', val)}
      />
      <div><Label>Characters</Label>
        <Textarea value={v.characters as string} onChange={val => set('characters', val)}
          placeholder="e.g. Mara, a seasoned detective with a photographic memory…" error={errors.characters} />
      </div>
      <div><Label>Setting</Label>
        <Input value={v.setting as string} onChange={val => set('setting', val)}
          placeholder="e.g. Rainy 1940s Chicago" error={errors.setting} />
      </div>
      <div><Label>Mood</Label>
        <Input value={v.mood as string} onChange={val => set('mood', val)}
          placeholder="e.g. Tense, melancholic, hopeful" error={errors.mood} />
      </div>
      <div><Label>Style</Label>
        <Input value={v.style as string} onChange={val => set('style', val)}
          placeholder="e.g. Minimalist prose, stream-of-consciousness" error={errors.style} />
      </div>
      <div><Label>Target audience</Label>
        <Input value={v.target_audience as string} onChange={val => set('target_audience', val)}
          placeholder="e.g. Young adults" error={errors.target_audience} />
      </div>
      <ButtonGroup label="Length"
        options={[
          { value: 'short',  label: 'Short (~600w)' },
          { value: 'medium', label: 'Medium (~1200w)' },
          { value: 'long',   label: 'Long (~2200w)' },
        ]}
        value={v.length as string} onChange={val => set('length', val)}
      />
    </>
  );
}

function SocialMediaFields({ v, set, errors }: { v: FormValues; set: (k: string, val: string | boolean) => void; errors: Errors }) {
  return (
    <>
      <ButtonGroup label="Platform"
        options={[
          { value: 'twitter',   label: '𝕏 Twitter' },
          { value: 'linkedin',  label: 'LinkedIn' },
          { value: 'instagram', label: 'Instagram' },
        ]}
        value={v.platform as string} onChange={val => set('platform', val)}
      />
      <div><Label>Product / Service</Label>
        <Input value={v.product_service as string} onChange={val => set('product_service', val)}
          placeholder="e.g. AI-powered note-taking app" error={errors.product_service} />
      </div>
      <div><Label>Goal</Label>
        <Input value={v.goal as string} onChange={val => set('goal', val)}
          placeholder="e.g. Drive app installs, build brand awareness" error={errors.goal} />
      </div>
      <div><Label>Call to action</Label>
        <Input value={v.cta as string} onChange={val => set('cta', val)}
          placeholder="e.g. Link in bio, Try free for 14 days" error={errors.cta} />
      </div>
      <ButtonGroup label="Tone" options={TONE_OPTIONS}
        value={v.tone as string} onChange={val => set('tone', val)}
      />
    </>
  );
}

interface Props {
  contentType: ContentType;
  status: GenerationStatus;
  fieldErrors: Record<string, string>;
  onGenerate: (values: FormValues) => void;
}

export function GeneratorForm({ contentType, status, fieldErrors, onGenerate }: Props) {
  const [values, setValues] = useState<FormValues>(DEFAULTS[contentType]);

  useEffect(() => {
    setValues(DEFAULTS[contentType]);
  }, [contentType]);

  function set(key: string, val: string | boolean) {
    setValues(prev => ({ ...prev, [key]: val }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onGenerate({ ...values, content_type: contentType });
  }

  const isGenerating = status === 'generating';

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {contentType === 'blog_post'    && <BlogPostFields    v={values} set={set} errors={fieldErrors} />}
      {contentType === 'email'        && <EmailFields        v={values} set={set} errors={fieldErrors} />}
      {contentType === 'story'        && <StoryFields        v={values} set={set} errors={fieldErrors} />}
      {contentType === 'social_media' && <SocialMediaFields  v={values} set={set} errors={fieldErrors} />}

      <button
        type="submit"
        disabled={isGenerating}
        className={`mt-2 w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl
          font-semibold text-sm transition-all duration-150
          ${isGenerating
            ? 'bg-violet-300 cursor-not-allowed text-white'
            : 'bg-violet-600 hover:bg-violet-700 text-white shadow-sm hover:shadow-md'
          }`}
      >
        {isGenerating ? (
          <><Loader2 size={15} className="animate-spin" /> Generating…</>
        ) : (
          <><Sparkles size={15} /> Generate</>
        )}
      </button>
    </form>
  );
}
