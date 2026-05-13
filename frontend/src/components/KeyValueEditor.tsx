import { useState } from 'react';
import type { KeyValue } from '../types';

interface Props {
  pairs: KeyValue[];
  onChange: (pairs: KeyValue[]) => void;
}

export default function KeyValueEditor({ pairs, onChange }: Props) {
  const [kvs, setKvs] = useState<KeyValue[]>(pairs);

  const update = (index: number, field: 'key' | 'value', val: string) => {
    const next = [...kvs];
    next[index] = { ...next[index], [field]: val };
    setKvs(next);
    onChange(next);
  };

  const add = () => {
    setKvs([...kvs, { key: '', value: '' }]);
  };

  const remove = (index: number) => {
    const next = kvs.filter((_, i) => i !== index);
    setKvs(next);
    onChange(next);
  };

  return (
    <div className="space-y-1">
      {kvs.map((kv, i) => (
        <div key={i} className="flex gap-2">
          <input
            className="flex-1 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs"
            placeholder="Key"
            value={kv.key}
            onChange={(e) => update(i, 'key', e.target.value)}
          />
          <input
            className="flex-1 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs"
            placeholder="Value"
            value={kv.value}
            onChange={(e) => update(i, 'value', e.target.value)}
          />
          <button
            className="text-red-400 hover:text-red-300 text-xs px-1"
            onClick={() => remove(i)}
          >
            ✕
          </button>
        </div>
      ))}
      <button
        className="text-xs text-purple-400 hover:text-purple-300"
        onClick={add}
      >
        + Add header
      </button>
    </div>
  );
}
