import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import HomePage from './pages/HomePage';
import ReaderPage from './pages/ReaderPage';
import './App.css'; // You can keep this if you have global styles here

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/comic/:comicId" element={<ReaderPage />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;