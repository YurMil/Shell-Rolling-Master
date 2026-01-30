
import React, { useState } from 'react';
import { InputPanel } from './features/calculator/InputPanel';
import { PatternView } from './features/viewer-2d/PatternView';
import { Scene } from './features/viewer-3d/Scene';
import { Tab } from './components/ui';

function App() {
  const [activeTab, setActiveTab] = useState<'3d' | '2d'>('3d');

  return (
    <div className="srm-flex srm-flex-col md:srm-flex-row srm-h-screen srm-bg-md-base srm-text-gray-100 srm-overflow-hidden">

      {/* Sidebar */}
      <aside className="srm-w-full md:srm-w-[400px] srm-h-full srm-flex-shrink-0 srm-border-r srm-border-[#49454f] srm-bg-md-surface2 srm-shadow-2xl srm-z-10 srm-overflow-y-auto">
        <InputPanel />
      </aside>

      {/* Main Content */}
      <main className="srm-flex-1 srm-relative srm-flex srm-flex-col srm-h-full srm-bg-md-base">

        {/* Tab Switcher */}
        <div className="srm-absolute srm-top-4 srm-left-1/2 srm-transform srm--translate-x-1/2 srm-bg-[#2b2930] srm-rounded-full srm-p-1 srm-flex srm-shadow-xl srm-z-20 srm-border srm-border-[#49454f]">
          <Tab active={activeTab === '3d'} onClick={() => setActiveTab('3d')}>3D Model</Tab>
          <Tab active={activeTab === '2d'} onClick={() => setActiveTab('2d')}>2D Pattern</Tab>
        </div>

        {/* Viewports */}
        <div className="srm-w-full srm-h-full srm-relative">
          {activeTab === '3d' && (
            <div className="srm-w-full srm-h-full">
              <Scene />
            </div>
          )}
          {activeTab === '2d' && (
            <PatternView />
          )}
        </div>

      </main>
    </div>
  );
}

export default App;
