
import React from 'react';
import { InputPanel } from './features/calculator/InputPanel';
import { Scene } from './features/viewer-3d/Scene';
import { PatternView } from './features/viewer-2d/PatternView';
import { ViewToggle } from './components/ui';
import { useShellStore } from './store/useShellStore';

function App() {
  const { viewMode, setViewMode } = useShellStore();

  return (
    <div className="flex flex-col md:flex-row w-full h-full bg-[#141218] text-[#e6e1e5]">
      {/* Sidebar */}
      <aside className="w-full md:w-[400px] flex-none h-full overflow-y-auto border-r border-[#49454f] bg-[#1d1b20] z-10">
        <InputPanel />
      </aside>

      {/* Main 3D/2D Area - MUST be relative + flex-1 */}
      <main className="flex-1 relative w-full h-full overflow-hidden">
        {/* View Toggle */}
        <ViewToggle activeView={viewMode} onViewChange={setViewMode} />

        {/* Conditional Rendering: 3D or 2D View */}
        {viewMode === '3d' ? <Scene /> : <PatternView />}
      </main>
    </div>
  )
}

export default App;
