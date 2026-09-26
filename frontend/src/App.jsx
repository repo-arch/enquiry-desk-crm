import { Navigate, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { useMasters } from './hooks/useMasters';
import { AuthProvider, useAuth } from './context/AuthContext';
import MastersPage from './pages/MastersPage';
import CompaniesPage from './pages/CompaniesPage';
import CompanyDetailPage from './pages/CompanyDetailPage';
import LeadsPage from './pages/LeadsPage';
import LeadDetailPage from './pages/LeadDetailPage';
import PipelinePage from './pages/PipelinePage';
import DashboardPage from './pages/DashboardPage';
import LoginPage from './pages/LoginPage';

const NAV = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/companies', label: 'Companies' },
  { to: '/leads', label: 'Leads & Enquiries' },
  { to: '/pipeline', label: 'Pipeline' },
  { to: '/masters', label: 'Masters' },
];

function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="flex min-h-full items-center justify-center text-sm text-ink/50">Loading…</div>;
  }
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return children;
}

function Shell() {
  const masters = useMasters();
  const { user, logout } = useAuth();

  return (
    <div className="flex min-h-full">
      <aside className="flex w-60 shrink-0 flex-col border-r border-line bg-surface">
        <div className="border-b border-line px-5 py-5">
          <div className="text-[15px] font-semibold leading-tight">Enquiry Desk</div>
          <div className="text-xs text-ink/50">Masters → Company → Lead → Enquiry → P.O.</div>
        </div>
        <nav className="flex flex-col gap-0.5 p-3">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `rounded-sm px-3 py-2 text-sm font-medium transition-colors ${
                  isActive ? 'bg-teal-50 text-teal-700' : 'text-ink/70 hover:bg-paper'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto border-t border-line px-5 py-4">
          <div className="mb-2 text-xs text-ink/50">
            Signed in as <span className="font-medium text-ink/80">{user?.name || user?.username}</span>
          </div>
          <button onClick={logout} className="btn btn-secondary w-full text-xs">
            Log out
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl px-8 py-8">
          <Routes>
            <Route path="/" element={<DashboardPage masters={masters} />} />
            <Route path="/companies" element={<CompaniesPage masters={masters} />} />
            <Route path="/companies/:id" element={<CompanyDetailPage masters={masters} />} />
            <Route path="/leads" element={<LeadsPage masters={masters} />} />
            <Route path="/leads/:id" element={<LeadDetailPage masters={masters} />} />
            <Route path="/pipeline" element={<PipelinePage masters={masters} />} />
            <Route path="/masters" element={<MastersPage masters={masters} />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/*"
          element={
            <RequireAuth>
              <Shell />
            </RequireAuth>
          }
        />
      </Routes>
    </AuthProvider>
  );
}
