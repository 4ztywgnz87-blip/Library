import { PageHeader } from '../components/ui';
import { SleepyCat } from '../components/SleepyCat';

export default function Shelf() {
  return (
    <div>
      <PageHeader title="My shelf" />
      <div className="mx-auto flex max-w-md flex-col items-center px-8 py-12 text-center">
        <SleepyCat className="w-44" />
        <h2 className="mt-5 text-2xl">Your bookcase is being built</h2>
        <p className="mt-2 text-sm text-cocoa">
          Soon this becomes a cosy, animated bookcase with all your spines, a plant, a candle and a cat that
          guards the top shelf. 🕯️🪴
        </p>
      </div>
    </div>
  );
}
