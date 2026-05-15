import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { AuthWrapper } from './components/auth/AuthWrapper';
import { LoginPage } from './pages/Login';
import { SignupPage } from './pages/Signup';
import { ListsPage } from './pages/Lists';
import { ListDetailPage } from './pages/ListDetail';
import { ScheduledPage } from './pages/Scheduled';
import { TemplatesPage } from './pages/Templates';
import { HistoryPage } from './pages/History';
import { SettingsPage } from './pages/Settings';
import { AttachmentsPage } from './pages/Attachments';

function App() {

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        
        <Route element={<AuthWrapper />}>
          <Route path="/" element={<AppLayout />}>
            <Route index element={<Navigate to="/lists" replace />} />
            <Route path="lists" element={<ListsPage />} />
            <Route path="lists/:id" element={<ListDetailPage />} />
            <Route path="templates/*" element={<TemplatesPage />} />
            <Route path="attachments" element={<AttachmentsPage />} />
            <Route path="scheduled/*" element={<ScheduledPage />} />
            <Route path="history/*" element={<HistoryPage />} />
            <Route path="settings/*" element={<SettingsPage />} />
          </Route>
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
