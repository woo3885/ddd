import DemoBankLayout from '../components/DemoBankLayout';
import { ELEMENT_IDS, elementIdentity } from '../constants/element-ids';
import { ROUTES } from '../constants/routes';
import { demoAccounts, formatWon } from '../data/demo-data';

export default function TransferAccountsPage() {
  return (
    <DemoBankLayout
      pageId={ELEMENT_IDS.PAGE_TRANSFER_ACCOUNTS}
      currentPath={ROUTES.TRANSFER_ACCOUNTS}
      eyebrow="계좌이체 1단계"
      title="출금 계좌를 직접 확인해 주세요"
    >
      <p className="page-introduction">
        계좌번호는 마스킹된 값만 표시하며 실제 계좌 선택은 수행하지
        않습니다.
      </p>

      <div className="card-grid">
        {demoAccounts.map((account) => (
          <article
            {...elementIdentity(account.cardElementId)}
            key={account.id}
            className="information-card account-card"
          >
            <div>
              <p className="card-kicker">{account.bankName}</p>
              <h2>{account.label}</h2>
              <p className="masked-account-number">
                {account.maskedAccountNumber}
              </p>
            </div>

            <dl className="detail-list">
              <div>
                <dt>은행명</dt>
                <dd>{account.bankName}</dd>
              </div>
              <div>
                <dt>출금 가능 잔액</dt>
                <dd>{formatWon(account.balance)}</dd>
              </div>
            </dl>

            <button
              {...elementIdentity(account.selectButtonElementId)}
              type="button"
              className="primary-button"
              aria-describedby={ELEMENT_IDS.STATUS_TRANSFER_STATIC}
              disabled
            >
              이 계좌 선택
            </button>
          </article>
        ))}
      </div>

      <p
        {...elementIdentity(ELEMENT_IDS.STATUS_TRANSFER_STATIC)}
        className="static-notice"
        role="status"
      >
        계좌 선택은 D4에서 연결합니다. 실제 계좌 상태는 저장하지
        않습니다.
      </p>
    </DemoBankLayout>
  );
}
