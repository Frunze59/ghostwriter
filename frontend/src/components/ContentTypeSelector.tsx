import type { ContentType, ContentTypeCard } from '../types';

const CARDS: ContentTypeCard[] = [
  {
    id: 'blog_post',
    label: 'Blog Post',
    description: 'Structured article with SEO optimisation',
    icon: '✍️',
  },
  {
    id: 'email',
    label: 'Email',
    description: 'Professional email with subject & body',
    icon: '📧',
  },
  {
    id: 'story',
    label: 'Short Story',
    description: 'Creative fiction with narrative structure',
    icon: '📖',
  },
  {
    id: 'social_media',
    label: 'Social Media',
    description: 'Platform-optimised post with hashtags',
    icon: '📣',
  },
];

interface Props {
  selected: ContentType | null;
  onChange: (type: ContentType) => void;
}

export function ContentTypeSelector({ selected, onChange }: Props) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">
        Content type
      </p>
      <div className="grid grid-cols-2 gap-2">
        {CARDS.map(card => {
          const isSelected = selected === card.id;
          return (
            <button
              key={card.id}
              onClick={() => onChange(card.id)}
              className={`
                text-left p-3 rounded-xl border-2 transition-all duration-150
                ${isSelected
                  ? 'border-violet-500 bg-violet-50'
                  : 'border-gray-200 bg-white hover:border-violet-300 hover:bg-violet-50/40'
                }
              `}
            >
              <span className="text-xl">{card.icon}</span>
              <p className={`text-sm font-semibold mt-1 ${isSelected ? 'text-violet-700' : 'text-gray-800'}`}>
                {card.label}
              </p>
              <p className="text-xs text-gray-400 mt-0.5 leading-snug">
                {card.description}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
