'use client';

interface FormFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  inputMode?: 'text' | 'numeric' | 'decimal';
  className?: string;
}

export default function FormField({ label, value, onChange, placeholder, type = 'text', inputMode, className }: FormFieldProps) {
  return (
    <div className={className}>
      <label className="text-xs text-gray-400 mb-1.5 block">{label}</label>
      <div className="flex items-center px-3 py-2.5 rounded-lg bg-white/10 border border-white/10">
        <input
          type={type}
          inputMode={inputMode}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="bg-transparent text-sm text-white outline-none w-full placeholder:text-gray-500"
        />
      </div>
    </div>
  );
}
