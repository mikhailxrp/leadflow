import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <div className="flex w-max flex-col gap-8">
        <div className="flex items-center gap-5">
          <span
            className="flex h-[50px] w-[50px] shrink-0 items-center justify-center rounded-full border border-[#10B981]"
            aria-hidden="true"
          >
            <span className="block h-[35px] w-[35px] rounded-full bg-[#10B981] animate-pulse-dot" />
          </span>
          <h1 className="text-[42px] font-medium leading-[1.3]">LeadFlow</h1>
        </div>

        <Link
          href="/login"
          className="flex h-[36px] w-full items-center justify-center rounded-[6px] bg-[#10B981] text-[13px] font-medium text-white transition-all duration-150 hover:bg-[#0E9E6E]"
        >
          Сегодня
        </Link>
      </div>
    </main>
  );
}
