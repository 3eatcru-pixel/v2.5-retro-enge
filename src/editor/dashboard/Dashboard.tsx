import { 
  FolderOpen, Archive, BookOpen, Settings, Search,
  Gamepad2, Hammer, AppWindow, FileBox, LayoutGrid
} from 'lucide-react';
import { useEngineStore } from '../../state/engine.store';
import { useProjectStore } from '../../state/project.store';
import { useState } from 'react';

const MOCK_RECENT_PROJECTS = [
  { id: '1', name: 'Cyberpunk RPG', lastEdited: '2 hours ago', icon: Gamepad2, color: 'text-rose-500' },
  { id: '2', name: 'Platformer Prototype', lastEdited: 'Yesterday', icon: Hammer, color: 'text-amber-500' },
  { id: '3', name: 'Space Shooter', lastEdited: 'Last week', icon: AppWindow, color: 'text-sky-500' },
];

const QUICK_TEMPLATES = [
  { id: 'blank', name: 'Blank Project', desc: 'Start from an empty scene', icon: FileBox },
  { id: 'rpg', name: 'Top-Down RPG', desc: 'Grid movement & basic combat', icon: LayoutGrid },
  { id: 'platformer', name: 'Platformer', desc: 'Jump physics & level progression', icon: Gamepad2 },
];

export function Dashboard() {
  const engine = useEngineStore((state) => state.engine);
  const setMode = useProjectStore((state) => state.setMode);
  const setProjectName = useProjectStore((state) => state.setProjectName);

  const [activeTab, setActiveTab] = useState<'projects' | 'vault'>('projects');
  const [searchQuery, setSearchQuery] = useState('');

  const handleCreateProject = (name: string) => {
    if (engine) engine.projects.createProject(name);
    setProjectName(name);
    setMode('scene');
  };

  const TopNav = () => (
    <div className="flex items-center justify-between border-b border-neutral-800 bg-neutral-900/50 p-4 shrink-0">
      <div className="flex items-center space-x-2">
        <div className="w-8 h-8 bg-indigo-600 rounded-md flex items-center justify-center shadow-lg">
          <Gamepad2 className="w-5 h-5 text-white" />
        </div>
        <h1 className="text-xl font-semibold text-neutral-100 tracking-tight ml-2">Retro Engine</h1>
      </div>
      <div className="flex items-center space-x-6">
        <button className="text-neutral-400 hover:text-neutral-200 text-sm font-medium flex items-center space-x-2 transition-colors">
          <BookOpen className="w-4 h-4" />
          <span>Documentation</span>
        </button>
        <button className="text-neutral-400 hover:text-neutral-200 text-sm font-medium flex items-center space-x-2 transition-colors">
          <Settings className="w-4 h-4" />
          <span>Settings</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col w-full h-full bg-neutral-950 text-neutral-200 overflow-hidden font-sans">
      <TopNav />
      
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Nav */}
        <div className="w-64 bg-neutral-900/30 border-r border-neutral-800 p-4 flex flex-col space-y-2 shrink-0">
          <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2 ml-2">Menu</div>
          <button 
            onClick={() => setActiveTab('projects')}
            className={`flex items-center space-x-3 px-3 py-2.5 rounded-md transition-colors ${activeTab === 'projects' ? 'bg-indigo-600/15 text-indigo-300 font-medium' : 'text-neutral-400 hover:bg-neutral-800/50 hover:text-neutral-200'}`}
          >
            <FolderOpen className="w-4 h-4" />
            <span>Projects</span>
          </button>
          <button 
            onClick={() => setActiveTab('vault')}
            className={`flex items-center space-x-3 px-3 py-2.5 rounded-md transition-colors ${activeTab === 'vault' ? 'bg-indigo-600/15 text-indigo-300 font-medium' : 'text-neutral-400 hover:bg-neutral-800/50 hover:text-neutral-200'}`}
          >
            <Archive className="w-4 h-4" />
            <span>Asset Vault</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col p-10 overflow-y-auto custom-scrollbar relative">
          {activeTab === 'projects' && (
            <div className="max-w-5xl w-full mx-auto space-y-12 animate-in fade-in duration-300">
              
              {/* Templates */}
              <div>
                <h2 className="text-2xl font-semibold mb-2 text-neutral-100">Create New Project</h2>
                <p className="text-neutral-500 text-sm mb-6">Start from scratch or use a predefined template.</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {QUICK_TEMPLATES.map(template => (
                    <button 
                      key={template.id}
                      onClick={() => handleCreateProject(template.name)}
                      className="flex flex-col items-start bg-neutral-900/40 border border-neutral-800 hover:border-indigo-500/50 hover:bg-neutral-900 p-6 rounded-xl transition-all group text-left"
                    >
                      <div className="w-12 h-12 rounded-lg bg-neutral-800 flex items-center justify-center mb-4 group-hover:bg-indigo-500/20 text-neutral-400 group-hover:text-indigo-400 transition-colors">
                        <template.icon className="w-6 h-6" />
                      </div>
                      <h3 className="font-medium text-neutral-200 mb-1 group-hover:text-white transition-colors">{template.name}</h3>
                      <p className="text-sm text-neutral-500 group-hover:text-neutral-400 transition-colors">{template.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="h-px bg-neutral-800/60 w-full" />

              {/* Recent Projects */}
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-neutral-200">Recent Projects</h2>
                  <div className="relative w-64">
                    <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input 
                      type="text" 
                      placeholder="Search projects..." 
                      className="w-full bg-neutral-900 border border-neutral-800 text-sm rounded-lg pl-9 pr-4 py-2 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all text-neutral-200 placeholder:text-neutral-600"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>

                <div className="bg-neutral-900/40 border border-neutral-800 rounded-xl overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-neutral-900/60 border-b border-neutral-800">
                      <tr>
                        <th className="px-6 py-4 text-xs font-semibold text-neutral-400 uppercase tracking-wider w-1/2">Name</th>
                        <th className="px-6 py-4 text-xs font-semibold text-neutral-400 uppercase tracking-wider w-1/4">Last Modified</th>
                        <th className="px-6 py-4 text-right text-xs font-semibold text-neutral-400 uppercase tracking-wider w-1/4">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-800/60">
                      {MOCK_RECENT_PROJECTS.map(project => (
                         <tr key={project.id} className="hover:bg-neutral-800/40 group transition-colors">
                           <td className="px-6 py-4 cursor-pointer" onClick={() => handleCreateProject(project.name)}>
                             <div className="flex items-center space-x-4">
                               <div className="p-2.5 bg-neutral-950 rounded-lg text-neutral-400 border border-neutral-800 group-hover:border-neutral-700 transition-colors shadow-sm">
                                 <project.icon className={`w-5 h-5 ${project.color}`} />
                               </div>
                               <span className="font-medium text-neutral-200 group-hover:text-indigo-300 transition-colors">{project.name}</span>
                             </div>
                           </td>
                           <td className="px-6 py-4 text-sm text-neutral-500">
                             {project.lastEdited}
                           </td>
                           <td className="px-6 py-4 text-right">
                             <button
                               onClick={() => handleCreateProject(project.name)}
                               className="px-5 py-2 bg-neutral-800 hover:bg-indigo-600 text-neutral-200 hover:text-white text-sm font-medium rounded-lg opacity-0 group-hover:opacity-100 transition-all border border-neutral-700 hover:border-indigo-500 shadow-sm"
                             >
                               Open
                             </button>
                           </td>
                         </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}
          {activeTab === 'vault' && (
            <div className="max-w-5xl mx-auto w-full flex-1 flex flex-col items-center justify-center animate-in fade-in duration-300">
              <div className="text-center py-20 text-neutral-500">
                <div className="w-20 h-20 bg-neutral-900 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-neutral-800">
                  <Archive className="w-10 h-10 text-neutral-600" />
                </div>
                <h2 className="text-xl font-medium text-neutral-300 mb-2">Asset Vault</h2>
                <p className="text-sm max-w-sm mx-auto">Global asset repository and marketplace. Browse sprites, tilesets, and scripts.</p>
                <div className="mt-8 px-4 py-2 bg-neutral-900 rounded-full text-xs font-medium text-neutral-400 border border-neutral-800 inline-block">
                  Coming soon
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
