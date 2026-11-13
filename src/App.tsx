import { useEffect } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import Home from './pages/Home';
import Library from './pages/Library';
import Add from './pages/Add';
import BookDetail from './pages/BookDetail';
import Shelf from './pages/Shelf';
import Profile from './pages/Profile';
import { startBackgroundSync } from './lib/sync';

export default function App() {
  useEffect(() => startBackgroundSync(), []);

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="library" element={<Library />} />
          <Route path="add" element={<Add />} />
          <Route path="book/:id" element={<BookDetail />} />
          <Route path="shelf" element={<Shelf />} />
          <Route path="profile" element={<Profile />} />
          <Route path="*" element={<Home />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
