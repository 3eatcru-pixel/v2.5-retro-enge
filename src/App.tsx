import { useProjectStore } from './state/project.store';
import { Dashboard } from './editor/dashboard/Dashboard';
import { EditorLayout } from './editor/layout/EditorLayout';

export function App() {
  const mode = useProjectStore((state) => state.mode);

  return (
    <div className="w-full h-full flex flex-col bg-neutral-950 text-neutral-200 font-sans">
      {mode === 'dashboard' ? <Dashboard /> : <EditorLayout />}
    </div>
  );
}
