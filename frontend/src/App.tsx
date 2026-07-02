import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import { useTheme } from './ThemeContext';
import { EnvironmentProvider, useEnvironment } from './EnvironmentContext';
import { FontSizeProvider, useFontSize } from './FontSizeContext';
import DashboardPage from './pages/DashboardPage';
import EndpointsPage from './pages/EndpointsPage';
import EnvironmentsPage from './pages/EnvironmentsPage';
import ResultsPage from './pages/ResultsPage';
import ExportImportPage from './pages/ExportImportPage';
import ReferencePage from './pages/ReferencePage';

const navItems = [
  { to: '/', label: 'Dashboard', icon: '◉' },
  { to: '/endpoints', label: 'Endpoints', icon: '⬡' },
  { to: '/environments', label: 'Environments', icon: '⚙' },
  { to: '/results', label: 'Results', icon: '☰' },
  { to: '/export', label: 'Export/Import', icon: '⇅' },
  { to: '/reference', label: 'Reference', icon: '?' },
];

function Sidebar() {
  const { theme, toggleTheme } = useTheme();
  const { environments, activeEnvironmentId, setActiveEnvironmentId } = useEnvironment();
  const { fontSize, increaseFontSize, decreaseFontSize, resetFontSize } = useFontSize();

  return (
    <aside className="w-56 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col">
      <div className="p-4 border-b border-gray-200 dark:border-gray-800">
        <h1 className="text-lg font-bold text-purple-600 dark:text-purple-400">Lithium</h1>
        <p className="text-xs text-gray-600 dark:text-gray-500">API Testing & Monitoring</p>
      </div>
      <div className="px-3 pt-3 pb-1">
        <label className="text-xs text-gray-500 dark:text-gray-500 block mb-1">Active Environment</label>
        <select
          className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded px-2 py-1.5 text-xs text-gray-900 dark:text-gray-100"
          value={activeEnvironmentId ?? ''}
          onChange={e => setActiveEnvironmentId(e.target.value ? Number(e.target.value) : null)}
        >
          <option value="">None</option>
          {environments.map(env => (
            <option key={env.id} value={env.id}>
              {env.name}{env.isDefault ? ' (Default)' : ''}
            </option>
          ))}
        </select>
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
                  ? 'bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300'
                  : 'text-gray-700 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200'
              }`
            }
          >
            <span className="text-xs">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="p-3 border-t border-gray-200 dark:border-gray-800 space-y-2">
        <div className="flex items-center justify-between gap-1">
          <button
            onClick={decreaseFontSize}
            className="flex-1 flex items-center justify-center px-2 py-1.5 rounded-md text-xs text-gray-700 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title="Decrease font size"
          >
            A-
          </button>
          <button
            onClick={resetFontSize}
            className="flex-1 flex items-center justify-center px-2 py-1.5 rounded-md text-xs text-gray-700 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title={`Reset font size (${fontSize}px)`}
          >
            {fontSize}px
          </button>
          <button
            onClick={increaseFontSize}
            className="flex-1 flex items-center justify-center px-2 py-1.5 rounded-md text-xs text-gray-700 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title="Increase font size"
          >
            A+
          </button>
        </div>
        <button
          onClick={toggleTheme}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm text-gray-700 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark' ? (
            <>
              <span>☀</span>
              <span>Light Mode</span>
            </>
          ) : (
            <>
              <span>☾</span>
              <span>Dark Mode</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}

function App() {
  return (
    <FontSizeProvider>
      <EnvironmentProvider>
        <BrowserRouter>
          <div className="flex h-screen bg-gray-50 dark:bg-gray-950 text-gray-800 dark:text-gray-200">
            <Sidebar />
            <main className="flex-1 overflow-auto p-6">
              <Routes>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/endpoints" element={<EndpointsPage />} />
                <Route path="/environments" element={<EnvironmentsPage />} />
                <Route path="/results" element={<ResultsPage />} />
                <Route path="/export" element={<ExportImportPage />} />
                <Route path="/reference" element={<ReferencePage />} />
              </Routes>
            </main>
          </div>
        </BrowserRouter>
      </EnvironmentProvider>
    </FontSizeProvider>
  );
}

export default App;
