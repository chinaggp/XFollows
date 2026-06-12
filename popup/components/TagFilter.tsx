import React from 'react';

interface Props {
  enabledTags: string[];
  onChange: (tags: string[]) => void;
}

export default function TagFilter({ enabledTags, onChange }: Props) {
  const commonTags = ['科技', 'AI', '编程', '设计', '产品', '创业'];

  const toggleTag = (tag: string) => {
    if (enabledTags.includes(tag)) {
      onChange(enabledTags.filter(t => t !== tag));
    } else {
      onChange([...enabledTags, tag]);
    }
  };

  return (
    <div className="mb-4">
      <label className="block text-sm font-medium mb-2">标签筛选</label>
      <div className="flex flex-wrap gap-2">
        {commonTags.map(tag => (
          <button
            key={tag}
            onClick={() => toggleTag(tag)}
            className={`px-3 py-1 rounded text-sm ${
              enabledTags.includes(tag) ? 'bg-blue-500 text-white' : 'bg-gray-200'
            }`}
          >
            {tag}
          </button>
        ))}
      </div>
    </div>
  );
}
