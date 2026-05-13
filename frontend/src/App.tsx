import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import DashboardPage from './pages/DashboardPage';
import EndpointsPage from './pages/EndpointsPage';
import SchedulesPage from './pages/SchedulesPage';
import ValidationRulesPage from './pages/ValidationRulesPage';
import ResultsPage from './pages/ResultsPage';
import ExportImportPage from './pages/ExportImportPage';

const navItems = [
  { to: '/', label: 'Dashboard', icon: '◉' },
  { to: '/endpoints', label: 'Endpoints', icon: '⬡' },
  { to: '/schedules', label: 'Schedules', icon: '◷' },
  { to: '/validation', label: 'Validation', icon: '✓' },
  { to: '/results', label: 'Results', icon: '☰' },
  { to: '/export', label: 'Export/Import', icon: '⇅' },
];

function App() {
  return (
    <BrowserRouter>
      <div className="flex h-screen bg-gray-950 text-gray-200">
        <aside className="w-56 bg-gray-900 border-r border-gray-800 flex flex-col">
          <div className="p-4 border-b border-gray-800">
            <h1 className="text-lg font-bold text-purple-400">Lithium</h1>
            <p className="text-xs text-gray-500">API Testing & Monitoring</p>
          </div>
          <nav className="flex-1 p-2 space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                    isActive
                      ? 'bg-purple-900/50 text-purple-300'
                      : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                  }`
                }
              >
                <span className="text-xs">{item.icon}</span>
                {item.label}
              </NavLink>
            ))}
          </nav>
        </aside>
        <main className="flex-1 overflow-auto p-6">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/endpoints" element={<EndpointsPage />} />
            <Route path="/schedules" element={<SchedulesPage />} />
            <Route path="/validation" element={<ValidationRulesPage />} />
            <Route path="/results" element={<ResultsPage />} />
            <Route path="/export" element={<ExportImportPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
