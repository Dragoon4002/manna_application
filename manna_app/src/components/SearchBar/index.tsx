'use client';

import { Search } from 'iconoir-react';

interface SearchBarProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}

export default function SearchBar({ value, onChange, placeholder = 'Search...' }: SearchBarProps) {
  return (
    <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-white/10 border border-white/10">
      <Search width={16} height={16} className="text-gray-400 shrink-0" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="bg-transparent text-sm text-white outline-none w-full placeholder:text-gray-500"
      />
    </div>
  );
}
