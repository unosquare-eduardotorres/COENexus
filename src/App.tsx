import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';

import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import TransformPage from './pages/TransformPage';
import RecruiterDashboard from './pages/RecruiterDashboard';
import AdminDashboard from './pages/AdminDashboard';

interface AppProps {
  basename?: string;
}

function AdminDashboardWrapper() {
  const navigate = useNavigate();
  return <AdminDashboard onNavigateToResume={(id) => navigate(`/review?resume=${id}`)} />;
}

function App({ basename }: AppProps) {
  return (
    <ThemeProvider>
      <BrowserRouter basename={basename}>
        <Layout>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/transform" element={<TransformPage />} />
            <Route path="/review" element={<RecruiterDashboard />} />
            <Route path="/admin" element={<AdminDashboardWrapper />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
