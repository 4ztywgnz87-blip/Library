import { useEffect } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import Home from './pages/Home';
import Library from './pages/Library';
import Add from './pages/Add';
import BookDetail from './pages/BookDetail';
import Shelf from './pages/Shelf';
import Profile from './pages/Profile';
import { SeriesDetail, SeriesList } from './pages/Series';
import Next from './pages/Next';
import Shop from './pages/Shop';
import Quiz from './pages/Quiz';
import Stats from './pages/Stats';
import Wishlist from './pages/Wishlist';
import TrendingPage from './pages/TrendingPage';
import NewBooksPage from './pages/NewBooksPage';
import { startBackgroundSync } from './lib/sync';
import { backfillSeries, harmonizeSeriesGenres } from './lib/seriesLookup';

export default function App() {
  useEffect(() => {
    const stop = startBackgroundSync();
    // fill in series for older books in the background, once the app has settled
    const t = setTimeout(() => void backfillSeries().then(harmonizeSeriesGenres), 4000);
    return () => {
      stop();
      clearTimeout(t);
    };
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="library" element={<Library />} />
          <Route path="add" element={<Add />} />
          <Route path="book/:id" element={<BookDetail />} />
          <Route path="shelf" element={<Shelf />} />
          <Route path="series" element={<SeriesList />} />
          <Route path="series/:name" element={<SeriesDetail />} />
          <Route path="profile" element={<Profile />} />
          <Route path="next" element={<Next />} />
          <Route path="shop" element={<Shop />} />
          <Route path="quiz" element={<Quiz />} />
          <Route path="stats" element={<Stats />} />
          <Route path="wishlist" element={<Wishlist />} />
          <Route path="trending" element={<TrendingPage />} />
          <Route path="new-books" element={<NewBooksPage />} />
          <Route path="*" element={<Home />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
