import { useCallback, useEffect, useState } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import Home from './pages/Home';
import Library from './pages/Library';
import Add from './pages/Add';
import BookDetail from './pages/BookDetail';
import Shelf from './pages/Shelf';
import Profile from './pages/Profile';
import Login from './pages/Login';
import { checkAuth, type AuthState } from './lib/auth';
import { startBackgroundSync } from './lib/sync';

export default function App() {
  const [auth, setAuth] = useState<AuthState>('checking');

  useEffect(() => {
    checkAuth().then(setAuth);
    const onOut = () => setAuth('out');
    window.addEventListener('snug:logged-out', onOut);
    return () => window.removeEventListener('snug:logged-out', onOut);
  }, []);

  useEffect(() => {
    if (auth === 'in') startBackgroundSync();
  }, [auth]);

  const onLoggedOut = useCallback(() => setAuth('out'), []);

  if (auth === 'checking') return <div className="min-h-dvh bg-cream" />;
  if (auth === 'out') return <Login />;

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="library" element={<Library />} />
          <Route path="add" element={<Add />} />
          <Route path="book/:id" element={<BookDetail />} />
          <Route path="shelf" element={<Shelf />} />
          <Route path="profile" element={<Profile onLoggedOut={onLoggedOut} />} />
          <Route path="*" element={<Home />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
