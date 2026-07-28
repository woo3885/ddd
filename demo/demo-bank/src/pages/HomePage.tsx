import DemoBankLayout from '../components/DemoBankLayout';
import { ELEMENT_IDS, elementIdentity } from '../constants/element-ids';
import { ROUTES } from '../constants/routes';

export default function HomePage() {
  return (
    <DemoBankLayout
      pageId={ELEMENT_IDS.PAGE_HOME}
      currentPath={ROUTES.HOME}
      eyebrow="데모 업무 선택"
      title="안전하게 시작하는 금융 업무"
    >
      <p className="page-introduction">
        원하는 업무를 직접 선택해 주세요.
      </p>

      <div className="card-grid home-action-grid">
        <section className="information-card">
          <p className="card-kicker">예금</p>
          <h2>예금 가입</h2>
          <p>
            예금 상품의 기간, 금리와 최소 가입 금액을 비교하는 정적
            화면을 확인합니다.
          </p>
          <button
            {...elementIdentity(ELEMENT_IDS.BUTTON_START_DEPOSIT)}
            type="button"
            className="primary-button"
            aria-describedby={ELEMENT_IDS.STATUS_HOME_STATIC}
            disabled
          >
            예금 가입 시작
          </button>
        </section>

        <section className="information-card">
          <p className="card-kicker">계좌이체</p>
          <h2>계좌이체</h2>
          <p>
            마스킹된 계좌 정보와 잔액을 확인하는 정적 화면을
            살펴봅니다.
          </p>
          <button
            {...elementIdentity(ELEMENT_IDS.BUTTON_START_TRANSFER)}
            type="button"
            className="primary-button"
            aria-describedby={ELEMENT_IDS.STATUS_HOME_STATIC}
            disabled
          >
            계좌이체 시작
          </button>
        </section>
      </div>

      <p
        {...elementIdentity(ELEMENT_IDS.STATUS_HOME_STATIC)}
        className="static-notice"
        role="status"
      >
        D3 업무 버튼은 정적 상태입니다. 화면 이동은 상단 개발용 링크로
        확인해 주세요.
      </p>

      <aside className="warning-box" aria-label="보이스피싱 위험 요청 주의">
        <h2>보이스피싱 위험 요청에 주의하세요</h2>
        <p>
          기관 사칭이나 안전계좌 송금을 요구받으면 금융 업무를 중단하고
          공식 연락처를 직접 확인하세요.
        </p>
      </aside>

      <p className="no-transaction-notice">
        이 데모에서는 실제 예금 가입이나 계좌이체가 일어나지 않습니다.
      </p>
    </DemoBankLayout>
  );
}
