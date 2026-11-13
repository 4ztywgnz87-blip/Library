import { useCallback, useEffect, useRef } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { TABS, useTabSwipe } from '../lib/swipe';
import { BooksIcon, HomeIcon, PlusIcon, ShelfIcon, UserIcon } from './Icons';

const items = [
  { to: '/', label: 'Home', icon: HomeIcon, end: true },
  { to: '/library', label: 'Library', icon: BooksIcon },
  { to: '/add', label: 'Add', icon: PlusIcon, primary: true },
  { to: '/shelf', label: 'Shelf', icon: ShelfIcon },
  { to: '/profile', label: 'Me', icon: UserIcon },
];

export function Layout() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const hideNav = pathname.startsWith('/book/') || pathname === '/quiz';

  // Slide direction between the main screens (swipe or tab tap): +1 = from the right
  const tabIndex = TABS.indexOf(pathname);
  const lastTab = useRef(tabIndex);
  const dir = tabIndex >= 0 && lastTab.current >= 0 ? Math.sign(tabIndex - lastTab.current) : 0;
  useEffect(() => {
    if (tabIndex >= 0) lastTab.current = tabIndex;
  }, [tabIndex]);

  const onSwipe = useCallback((to: string) => navigate(to), [navigate]);
  useTabSwipe(pathname, onSwipe);
  return (
    <div className="paper relative min-h-dvh md:pl-24">
      <main className={`relative z-10 ${hideNav ? '' : 'pb-28 md:pb-8'}`}>
        {tabIndex >= 0 ? (
          <motion.div
            key={pathname}
            initial={dir ? { x: dir * 48, opacity: 0 } : false}
            animate={{ x: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 380, damping: 34 }}
          >
            <Outlet />
          </motion.div>
        ) : (
          <Outlet />
        )}
      </main>

      {/* Phone: bottom bar · iPad/Mac: side rail */}
      <nav
        className={`pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-sand/70 bg-cream/90 backdrop-blur-md md:inset-y-0 md:right-auto md:left-0 md:w-24 md:border-t-0 md:border-r md:pb-0 ${
          hideNav ? 'hidden md:block' : ''
        }`}
      >
        <div className="mx-auto flex h-16 max-w-md items-center justify-around px-2 md:h-full md:flex-col md:justify-center md:gap-6">
          <span className="hidden font-soft text-2xl font-semibold text-wine md:absolute md:top-8 md:block">Snug</span>
          {items.map(({ to, label, icon: Icon, end, primary }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                primary
                  ? 'flex h-12 w-12 items-center justify-center rounded-full bg-wine text-cream shadow-[var(--shadow-soft)] transition-transform active:scale-95'
                  : `flex flex-col items-center gap-0.5 rounded-xl px-3 py-1 text-[0.68rem] transition-colors ${
                      isActive ? 'text-wine' : 'text-mocha hover:text-cocoa'
                    }`
              }
              aria-label={label}
            >
              <Icon width={primary ? 26 : 23} height={primary ? 26 : 23} />
              {!primary && <span>{label}</span>}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
