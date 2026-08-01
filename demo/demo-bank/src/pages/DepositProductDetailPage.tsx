import DemoBankLayout from '../components/DemoBankLayout';
import { ELEMENT_IDS, elementIdentity } from '../constants/element-ids';
import {
  createDepositProductDetailPath,
  ROUTES
} from '../constants/routes';
import {
  formatWon,
  type DepositProduct
} from '../data/demo-data';

interface DepositProductDetailPageProps {
  product: DepositProduct;
}

export default function DepositProductDetailPage({
  product
}: DepositProductDetailPageProps) {
  return (
    <DemoBankLayout
      pageId={ELEMENT_IDS.PAGE_DEPOSIT_PRODUCT_DETAIL}
      currentPath={createDepositProductDetailPath(product.id)}
      eyebrow="예금 가입 2단계"
      title="선택한 상품의 상세 조건을 확인해 주세요"
    >
      <p className="page-introduction">
        아래 내용은 금융 자동화 시연을 위한 데모용 Mock 상품
        정보입니다.
      </p>

      <article className="deposit-detail-card">
        <div className="deposit-detail-heading">
          <p className="card-kicker">데모 정기예금</p>
          <h2
            {...elementIdentity(
              ELEMENT_IDS.SUMMARY_DEPOSIT_PRODUCT_NAME
            )}
          >
            {product.name}
          </h2>
          <p className="card-description">{product.description}</p>
        </div>

        <dl className="deposit-condition-list">
          <div>
            <dt>가입 기간</dt>
            <dd
              {...elementIdentity(
                ELEMENT_IDS.SUMMARY_DEPOSIT_PRODUCT_PERIOD
              )}
            >
              {product.periodLabel}
            </dd>
          </div>
          <div>
            <dt>예시 금리</dt>
            <dd
              {...elementIdentity(
                ELEMENT_IDS.SUMMARY_DEPOSIT_PRODUCT_RATE
              )}
            >
              {product.interestRateLabel} (예시)
            </dd>
          </div>
          <div>
            <dt>최소 가입 금액</dt>
            <dd
              {...elementIdentity(
                ELEMENT_IDS.SUMMARY_DEPOSIT_PRODUCT_MINIMUM_AMOUNT
              )}
            >
              {formatWon(product.minimumAmount)}
            </dd>
          </div>
        </dl>
      </article>

      <aside className="demo-rate-notice" aria-label="데모 상품 안내">
        <h2>데모 정보임을 확인해 주세요</h2>
        <p>
          표시된 금리는 시연용 예시이며 실시간 금리가 아닙니다. 실제
          은행 상품이나 가입 조건을 나타내지 않습니다.
        </p>
      </aside>

      <p
        {...elementIdentity(ELEMENT_IDS.STATUS_DEPOSIT_NEXT_STEP)}
        className="static-notice"
        role="status"
        aria-live="polite"
      >
        다음 가입 조건 입력 단계는 준비 중입니다. 실제 예금 가입이나
        금융거래는 발생하지 않습니다.
      </p>

      <div className="detail-action-row">
        <button
          {...elementIdentity(
            ELEMENT_IDS.BUTTON_DEPOSIT_PRODUCT_LIST_BACK
          )}
          type="button"
          className="secondary-button"
          onClick={() => window.location.assign(ROUTES.DEPOSIT_PRODUCTS)}
        >
          예금 상품 목록으로 돌아가기
        </button>
      </div>
    </DemoBankLayout>
  );
}
