import { useState } from 'react';
import { useGuideStore } from '@/store/useGuideStore';

type SpeechRecognitionCtor = new () => {
  lang: string;
  interimResults: boolean;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  start: () => void;
  stop: () => void;
};

export default function F4_VoiceController() {
  const { guideMessage, setGuideMessage, setStatus } = useGuideStore();
  const [listening, setListening] = useState(false);

  const startListening = () => {
    const Ctor = (window as Window & { webkitSpeechRecognition?: SpeechRecognitionCtor }).webkitSpeechRecognition;

    if (!Ctor) {
      setGuideMessage('이 브라우저는 STT 기능을 지원하지 않습니다.');
      return;
    }

    const recognition = new Ctor();
    recognition.lang = 'ko-KR';
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript ?? '';
      setGuideMessage(`인식된 명령: ${transcript}`);
      setStatus('GUIDING');
    };
    recognition.onerror = (event) => {
      setGuideMessage(`음성 인식 오류: ${event.error}`);
      setListening(false);
    };

    recognition.start();
    setListening(true);
    setGuideMessage('음성 명령을 듣고 있습니다.');
  };

  const stopListening = () => {
    setListening(false);
    setGuideMessage('음성 듣기를 중지했습니다.');
  };

  const speakGuide = () => {
    if (!('speechSynthesis' in window)) {
      setGuideMessage('이 브라우저는 TTS 기능을 지원하지 않습니다.');
      return;
    }

    const utter = new SpeechSynthesisUtterance(guideMessage);
    utter.lang = 'ko-KR';
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utter);
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-xl font-bold text-slate-800">F-4 VoiceController</h2>
      <p className="mt-1 text-sm text-slate-600">Web Speech API 기반 STT/TTS 제어 영역입니다.</p>

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={startListening}
          className="rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-700"
        >
          STT 시작
        </button>
        <button
          type="button"
          onClick={stopListening}
          className="rounded-lg bg-slate-600 px-4 py-2 font-semibold text-white hover:bg-slate-700"
        >
          STT 중지
        </button>
        <button
          type="button"
          onClick={speakGuide}
          className="rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white hover:bg-indigo-700"
        >
          안내 멘트 읽기
        </button>
      </div>

      <div className="mt-3 rounded-lg bg-slate-100 p-3 text-sm text-slate-700">
        상태: {listening ? 'Listening' : 'Idle'}
      </div>
    </section>
  );
}
