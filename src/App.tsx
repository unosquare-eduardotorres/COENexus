import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import NexusLanding from './hub/NexusLanding';
import ResumeApp from './apps/resume/ResumeApp';

interface AppProps {
  basename?: string;
}

function App({ basename }: AppProps) {
  return (
    <ThemeProvider>
      <BrowserRouter basename={basename}>
        <Routes>
          <Route path="/" element={<NexusLanding />} />
          <Route path="/resume/*" element={<ResumeApp />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
