import { useGuideStore } from '@/store/useGuideStore';

export default function F5_MainController() {
  const { setGuideMessage, setStatus, resetGuideState } = useGuideStore();

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-xl font-bold text-slate-800">F-5 MainController</h2>
      <p className="mt-1 text-sm text-slate-600">주요 탐색 제어 버튼 영역입니다.</p>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <button
          type="button"
          onClick={() => {
            setGuideMessage('다시 안내를 재생합니다.');
            setStatus('GUIDING');
          }}
          className="rounded-xl bg-sky-600 px-4 py-4 text-lg font-bold text-white hover:bg-sky-700"
        >
          다시듣기
        </button>

        <button
          type="button"
          onClick={() => {
            resetGuideState();
          }}
          className="rounded-xl bg-rose-600 px-4 py-4 text-lg font-bold text-white hover:bg-rose-700"
        >
          원래대로
        </button>

        <button
          type="button"
          onClick={() => {
            setGuideMessage('이전 단계로 이동합니다.');
            setStatus('IDLE');
          }}
          className="rounded-xl bg-amber-500 px-4 py-4 text-lg font-bold text-slate-900 hover:bg-amber-600"
        >
          이전
        </button>
      </div>
    </section>
  );
}
