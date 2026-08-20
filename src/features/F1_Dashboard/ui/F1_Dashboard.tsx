import { useState } from 'react';
import { useGuideStore } from '@/store/useGuideStore';

export default function F1_Dashboard() {
  const { targetUrl, recentUrls, setTargetUrl, addRecentUrl, setStatus, setGuideMessage } = useGuideStore();
  const [inputUrl, setInputUrl] = useState(targetUrl);

  const handleStart = () => {
    const normalized = inputUrl.trim();

    if (!normalized) {
      setGuideMessage('URL을 먼저 입력해 주세요.');
      return;
    }

    setTargetUrl(normalized);
    addRecentUrl(normalized);
    setStatus('LOADING');
    setGuideMessage('접속을 준비하고 있습니다. 잠시만 기다려 주세요.');
  };

  return (
    <section className="rounded-2xl border border-sky-100 bg-white/85 p-5 shadow-sm backdrop-blur">
      <h2 className="text-xl font-bold text-slate-800">F-1 Dashboard</h2>
      <p className="mt-1 text-sm text-slate-600">접속할 웹사이트 URL을 입력하고 안내를 시작하세요.</p>

      <div className="mt-4 flex flex-col gap-3">
        <input
          type="url"
          value={inputUrl}
          onChange={(e) => setInputUrl(e.target.value)}
          placeholder="https://example.com"
          className="w-full rounded-xl border border-slate-300 px-4 py-3 text-base outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
        />

        <button
          type="button"
          onClick={handleStart}
          className="rounded-xl bg-sky-600 px-6 py-4 text-lg font-bold text-white transition hover:bg-sky-700"
        >
          안내 시작
        </button>
      </div>

      <div className="mt-4">
        <h3 className="text-sm font-semibold text-slate-700">접속 이력</h3>
        <ul className="mt-2 space-y-2 text-sm text-slate-600">
          {recentUrls.length === 0 ? <li>아직 접속 이력이 없습니다.</li> : null}
          {recentUrls.map((url) => (
            <li key={url} className="truncate rounded-lg bg-slate-100 px-3 py-2">
              {url}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
