'use client';

import { DndContext, DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { createContext, useContext, useState } from 'react';

interface DndWrapperProps {
  children: React.ReactNode;
  onDragEnd: (event: DragEndEvent) => void;
}

// Create context to share drag state with children
interface DndStateContextType {
  activeId: string | null;
}

const DndStateContext = createContext<DndStateContextType>({
  activeId: null,
});

// Export hook to use in child components
export function useDndState() {
  return useContext(DndStateContext);
}

export default function DndWrapperClient({
  children,
  onDragEnd,
}: DndWrapperProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
    console.log('🎯 Drag started:', event.active.id);
  }

  function handleDragEnd(event: DragEndEvent) {
    console.log('🎯 Drag ended:', {
      active: event.active.id,
      over: event.over?.id,
    });

    setActiveId(null);
    onDragEnd(event);
  }

  function handleDragCancel() {
    setActiveId(null);
    console.log('🎯 Drag cancelled');
  }

  return (
    <DndContext
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <DndStateContext.Provider value={{ activeId }}>
        {children}
      </DndStateContext.Provider>
    </DndContext>
  );
}
