import dynamic from 'next/dynamic';

// Import DndWrapperClient with SSR disabled
const DndWrapperClient = dynamic(() => import('./DndWrapperClient'), {
  ssr: false,
});

// Re-export the default component
export default DndWrapperClient;

// Re-export the hook
export { useDndState } from './DndWrapperClient';
