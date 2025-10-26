'use client';

import { useState } from 'react';
import { createBrainDumpItem } from '@/lib/planner-api';
import { useRouter } from 'next/navigation';

interface BrainDumpInputProps {
  plannerId: string;
}

export default function BrainDumpInput({ plannerId }: BrainDumpInputProps) {
  const [text, setText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  // Core submit logic without event dependency
  const submitItem = async () => {
    if (!text.trim()) return;

    setIsLoading(true);
    try {
      await createBrainDumpItem({
        planner_id: plannerId,
        text: text.trim(),
      });

      setText(''); // Clear input
      router.refresh(); // Refresh to show new item
    } catch (error) {
      console.error('Failed to create brain dump item:', error);
      alert('Failed to add item. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    await submitItem();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      submitItem();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mb-4">
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Add a thought... (Press Enter)"
        disabled={isLoading}
        className="w-full rounded border-2 border-gray-300 px-3 py-2 transition-colors focus:border-blue-500 focus:outline-none disabled:bg-gray-100"
      />
    </form>
  );
}
