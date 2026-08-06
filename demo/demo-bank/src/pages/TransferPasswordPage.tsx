import { useRef, useState, type FormEvent } from 'react';

import DemoBankLayout from '../components/DemoBankLayout';
import { ELEMENT_IDS, elementIdentity } from '../constants/element-ids';
import {
  createTransferAmountPath,
  createTransferPasswordPath
} from '../constants/routes';
import type { DemoAccount } from '../data/demo-data';
import type { TransferRecipient } from '../data/transfer-recipients';
import {
  resolveTransferPasswordInputState,
  type TransferPasswordInputState
} from '../utils/transfer-password';

interface TransferPasswordPageProps {
  account: DemoAccount;
  recipient: TransferRecipient;
}

export default function TransferPasswordPage({
  account,
  recipient
}: TransferPasswordPageProps) {
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const [inputState, setInputState] =
    useState<TransferPasswordInputState>('EMPTY');
  const [passwordInputCompleted, setPasswordInputCompleted] =
    useState(false);

  const handlePasswordInput = (event: FormEvent<HTMLInputElement>) => {
    const hasInput = event.currentTarget.value.length > 0;
    setInputState(resolveTransferPasswordInputState(hasInput));
    setPasswordInputCompleted(false);
  };

  const handleInputComplete = () => {
    if (inputState !== 'ENTERED' || !passwordInputRef.current) {
      return;
    }

    passwordInputRef.current.value = '';
    setInputState('EMPTY');
    setPasswordInputCompleted(true);
  };

  const inputStatusMessage = passwordInputCompleted
    ? '입력한 비밀번호는 화면에서 제거되었습니다.'
    : inputState === 'ENTERED'
      ? '비밀번호가 입력되었습니다. 입력 완료 버튼을 눌러 주세요.'
      : '비밀번호를 사용자가 직접 입력해 주세요.';

  return (
    <DemoBankLayout
      pageId={ELEMENT_IDS.PAGE_TRANSFER_PASSWORD}
      currentPath={createTransferPasswordPath(account.id, recipient.id)}
      eyebrow="계좌이체 4단계"
      title="계좌 비밀번호를 직접 입력해 주세요"
    >
      <p className="page-introduction">
        URL에서 확인된 Mock 계좌와 수취인 정보만 표시합니다. 이전 화면의
        금액 입력이나 확인 완료 상태는 이 화면에 전달되지 않습니다.
      </p>

      <section
        className="transfer-password-card"
        aria-label="계좌 비밀번호 보안 입력"
      >
        <div className="transfer-password-context-grid">
          <article
            {...elementIdentity(
              ELEMENT_IDS.SUMMARY_TRANSFER_PASSWORD_SOURCE_ACCOUNT
            )}
            className="transfer-password-context-panel"
          >
            <span>URL에서 확인된 Mock 출금 계좌</span>
            <strong>{account.label}</strong>
          </article>
          <article
            {...elementIdentity(
              ELEMENT_IDS.SUMMARY_TRANSFER_PASSWORD_RECIPIENT
            )}
            className="transfer-password-context-panel"
          >
            <span>URL에서 확인된 Mock 수취인</span>
            <strong>{recipient.displayName}</strong>
          </article>
        </div>

        <aside
          {...elementIdentity(ELEMENT_IDS.NOTICE_TRANSFER_SECURE_INPUT)}
          className="transfer-secure-input-notice"
          aria-label="보안 입력 주의"
        >
          <h2>데모 보안 입력 모드</h2>
          <p>
            실제 금융 비밀번호를 입력하지 말고 데모 전용 입력만 사용해
            주세요.
          </p>
          <p>
            자동화와 AI는 이 값을 입력하거나 읽어서는 안 되며, 화면 캡처와
            DOM 전달 중단은 개발자 B의 후속 연동 책임입니다.
          </p>
        </aside>

        <div className="transfer-password-field">
          <label htmlFor={ELEMENT_IDS.INPUT_ACCOUNT_PASSWORD}>
            계좌 비밀번호
          </label>
          <input
            {...elementIdentity(ELEMENT_IDS.INPUT_ACCOUNT_PASSWORD)}
            ref={passwordInputRef}
            type="password"
            autoComplete="off"
            spellCheck={false}
            autoCorrect="off"
            autoCapitalize="none"
            data-ddd-policy="secure-input"
            aria-describedby={`${ELEMENT_IDS.NOTICE_TRANSFER_SECURE_INPUT} ${ELEMENT_IDS.STATUS_TRANSFER_PASSWORD_INPUT} ${ELEMENT_IDS.STATUS_CONFIRMED_TRANSFER_PASSWORD}`}
            onInput={handlePasswordInput}
          />

          <p
            {...elementIdentity(
              ELEMENT_IDS.STATUS_TRANSFER_PASSWORD_INPUT
            )}
            className="transfer-password-input-status"
            role="status"
            aria-live="polite"
          >
            {inputStatusMessage}
          </p>

          <p
            {...elementIdentity(
              ELEMENT_IDS.STATUS_CONFIRMED_TRANSFER_PASSWORD
            )}
            className="transfer-password-completion-status"
            role="status"
            aria-live="polite"
          >
            {passwordInputCompleted
              ? '데모 비밀번호 입력이 완료되었습니다. 실제 인증과 송금은 진행되지 않았으며 OTP는 후속 단계입니다.'
              : '아직 완료된 데모 비밀번호 입력이 없습니다.'}
          </p>
        </div>

        <div className="transfer-password-actions">
          <button
            {...elementIdentity(ELEMENT_IDS.BUTTON_TRANSFER_AMOUNT_BACK)}
            type="button"
            className="secondary-button"
            onClick={() =>
              window.location.assign(
                createTransferAmountPath(account.id, recipient.id)
              )
            }
          >
            이체 금액 화면으로 돌아가기
          </button>
          <button
            {...elementIdentity(ELEMENT_IDS.BUTTON_SECURE_INPUT_COMPLETE)}
            type="button"
            className="primary-button"
            disabled={inputState !== 'ENTERED'}
            aria-describedby={`${ELEMENT_IDS.STATUS_TRANSFER_PASSWORD_INPUT} ${ELEMENT_IDS.STATUS_CONFIRMED_TRANSFER_PASSWORD}`}
            onClick={handleInputComplete}
          >
            입력 완료
          </button>
        </div>
      </section>

      <p className="no-transaction-notice">
        입력값은 API, WebSocket, URL 또는 저장소로 전송하지 않습니다. 실제
        인증, OTP 이동, 잔액 차감과 송금은 발생하지 않습니다.
      </p>
    </DemoBankLayout>
  );
}
