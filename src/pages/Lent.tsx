import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Cover } from '../components/Cover';
import { Button, Card, PageHeader } from '../components/ui';
import { EmptyState } from '../components/SleepyCat';
import { ago, dateLabel, returnBook, useLending } from '../lib/lending';

/** Every book that is out on loan, per person, with a list she can send or print */
export default function Lent() {
  const { out, people, history, ready } = useLending();
  const [copied, setCopied] = useState(false);
  if (!ready) return null;

  const shareList = async () => {
    const text = [
      'Books I have lent out:',
      ...[...people.entries()].flatMap(([who, books]) => [
        '',
        `${who}:`,
        ...books.map((b) => `• ${b.title} (${b.authors[0] ?? ''}) · since ${dateLabel(b.lent!.since)}`),
      ]),
    ].join('\n');
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Books I lent out', text });
        return;
      } catch (e) {
        if ((e as Error).name === 'AbortError') return;
      }
    }
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div>
      <PageHeader
        back
        title="Lent out"
        right={
          out.length > 0 ? (
            <Button variant="soft" className="px-4 py-2 text-xs" onClick={() => void shareList()}>
              {copied ? 'Copied ✓' : 'Share list'}
            </Button>
          ) : undefined
        }
      />
      <div className="mx-auto max-w-xl space-y-6 px-4 pb-10">
        {out.length === 0 ? (
          <EmptyState title="Nothing lent out">
            On a book’s page, tap “Lent it to someone” and it shows up here.
          </EmptyState>
        ) : (
          <>
            <p className="text-sm text-cocoa">
              {out.length} book{out.length === 1 ? '' : 's'} with {people.size}{' '}
              {people.size === 1 ? 'person' : 'people'}.
            </p>
            {[...people.entries()].map(([who, books]) => (
              <section key={who}>
                <h2 className="mb-2 text-xl">
                  {who} <span className="text-base text-mocha">· {books.length}</span>
                </h2>
                <Card className="divide-y divide-linen py-1">
                  {books.map((b) => (
                    <div key={b.id} className="flex items-center gap-3 py-3">
                      <Link to={`/book/${b.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                        <Cover book={b} className="w-11 shrink-0" />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium">{b.title}</span>
                          <span className="block text-xs text-cocoa">
                            {dateLabel(b.lent!.since)} · {ago(b.lent!.since)}
                          </span>
                        </span>
                      </Link>
                      <Button variant="soft" className="shrink-0 px-3 py-2 text-xs" onClick={() => void returnBook(b)}>
                        Back ✓
                      </Button>
                    </div>
                  ))}
                </Card>
              </section>
            ))}
          </>
        )}

        {history.length > 0 && (
          <section>
            <h2 className="mb-2 text-xl">Earlier loans</h2>
            <Card className="divide-y divide-linen py-1">
              {history.slice(0, 30).map((h, i) => (
                <div key={`${h.book.id}-${i}`} className="py-2.5 text-sm">
                  <span className="font-medium">{h.book.title}</span>
                  <span className="text-cocoa"> · {h.to}</span>
                  <span className="block text-xs text-mocha">
                    {dateLabel(h.since)} → {dateLabel(h.returnedAt)}
                  </span>
                </div>
              ))}
            </Card>
          </section>
        )}
      </div>
    </div>
  );
}
