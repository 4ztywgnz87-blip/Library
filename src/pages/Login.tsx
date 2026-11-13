import { useState } from 'react';
import { motion } from 'motion/react';
import { loginWithLink, requestLoginLink, verifyCode } from '../lib/auth';
import { Button } from '../components/ui';
import { SleepyCat } from '../components/SleepyCat';

type Step = 'email' | 'code' | 'nomail';

export default function Login({ onLoggedIn }: { onLoggedIn: () => void }) {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [link, setLink] = useState('');
  // Without a mail service, Snug is opened with a personal link instead
  const [step, setStep] = useState<Step>(import.meta.env.VITE_EMAIL_LOGIN === '1' ? 'email' : 'nomail');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const expired = new URLSearchParams(location.search).get('error');

  const sendCode = async () => {
    setBusy(true);
    setError(null);
    try {
      const { mailEnabled } = await requestLoginLink(email);
      setCode('');
      setStep(mailEnabled ? 'code' : 'nomail');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const submitCode = async (value: string) => {
    setBusy(true);
    setError(null);
    try {
      await verifyCode(email, value);
      onLoggedIn();
    } catch (err) {
      setError((err as Error).message);
      setCode('');
    } finally {
      setBusy(false);
    }
  };

  const inputClass =
    'w-full rounded-full border border-sand bg-white px-5 py-3.5 text-center text-[16px] outline-none placeholder:text-mocha focus:border-oat';

  return (
    <div className="paper flex min-h-dvh items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-sm text-center"
      >
        <SleepyCat className="mx-auto w-44" />
        <h1 className="mt-4 text-5xl font-semibold text-wine">Snug</h1>
        <p className="mt-2 text-cocoa">Your cosy little library</p>

        {step === 'email' && (
          <form
            className="mt-10 space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              void sendCode();
            }}
          >
            {expired && <p className="text-sm text-wine">That link has expired. Ask for a new code below.</p>}
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Your email"
              className={inputClass}
            />
            <Button type="submit" disabled={busy} className="w-full py-3.5">
              {busy ? 'Sending…' : 'Email me a login code'}
            </Button>
            {error && <p className="text-sm text-wine">{error}</p>}
          </form>
        )}

        {step === 'code' && (
          <form
            className="mt-10 space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              void submitCode(code);
            }}
          >
            <p className="font-soft text-xl">Check your inbox ✉️</p>
            <p className="text-sm text-cocoa">
              We sent a 6-digit code to <span className="font-medium text-ink">{email}</span>. Not there? Peek in
              your junk folder.
            </p>
            <input
              autoFocus
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]*"
              maxLength={6}
              value={code}
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, '').slice(0, 6);
                setCode(v);
                if (v.length === 6) void submitCode(v);
              }}
              placeholder="••••••"
              className={`${inputClass} font-soft text-2xl tracking-[0.5em]`}
            />
            <Button type="submit" disabled={busy || code.length !== 6} className="w-full py-3.5">
              {busy ? 'Checking…' : 'Log in'}
            </Button>
            {error && <p className="text-sm text-wine">{error}</p>}
            <div className="flex justify-center gap-4 pt-1 text-sm">
              <button type="button" className="text-cocoa underline" onClick={() => void sendCode()} disabled={busy}>
                Send a new code
              </button>
              <button type="button" className="text-cocoa underline" onClick={() => setStep('email')}>
                Other email
              </button>
            </div>
          </form>
        )}

        {step === 'nomail' && (
          <form
            className="mt-10 space-y-3"
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError(null);
              try {
                await loginWithLink(link);
                onLoggedIn();
              } catch (err) {
                setError((err as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <p className="font-soft text-xl">Paste your Snug link 🔑</p>
            {expired && <p className="text-sm text-wine">That link was already used or has expired.</p>}
            <input
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="https://snug…/api/auth/verify?token=…"
              autoCapitalize="off"
              autoCorrect="off"
              className={inputClass}
            />
            <Button type="submit" disabled={busy || !link.trim()} className="w-full py-3.5">
              {busy ? 'Opening…' : 'Open my library'}
            </Button>
            {error && <p className="text-sm text-wine">{error}</p>}
            <p className="pt-2 text-xs text-cocoa">
              Need a new link? On a device where Snug is already open, go to{' '}
              <span className="font-medium">Me → Login link</span>.
            </p>
          </form>
        )}
      </motion.div>
    </div>
  );
}
