import DemoBankLayout from '../components/DemoBankLayout';
import { ELEMENT_IDS, elementIdentity } from '../constants/element-ids';
import { ROUTES } from '../constants/routes';
import { depositProducts, formatWon } from '../data/demo-data';

export default function DepositProductsPage() {
  return (
    <DemoBankLayout
      pageId={ELEMENT_IDS.PAGE_DEPOSIT_PRODUCTS}
      currentPath={ROUTES.DEPOSIT_PRODUCTS}
      eyebrow="예금 가입 1단계"
      title="예금 상품을 직접 비교해 주세요"
    >
      <p className="page-introduction">
        금리와 가입 조건을 확인한 뒤 원하는 상품을 직접 선택하는
        화면입니다.
      </p>

      <div className="card-grid">
        {depositProducts.map((product) => (
          <article
            {...elementIdentity(product.cardElementId)}
            key={product.id}
            className="information-card product-card"
          >
            <div>
              <p className="card-kicker">정기예금</p>
              <h2>{product.name}</h2>
              <p className="card-description">{product.description}</p>
            </div>

            <dl className="detail-list">
              <div>
                <dt>가입 기간</dt>
                <dd>{product.periodLabel}</dd>
              </div>
              <div>
                <dt>기본 금리</dt>
                <dd>{product.interestRateLabel}</dd>
              </div>
              <div>
                <dt>최소 가입 금액</dt>
                <dd>{formatWon(product.minimumAmount)}</dd>
              </div>
            </dl>

            <button
              {...elementIdentity(product.selectButtonElementId)}
              type="button"
              className="primary-button"
              aria-describedby={ELEMENT_IDS.STATUS_DEPOSIT_STATIC}
              disabled
            >
              이 상품 선택
            </button>
          </article>
        ))}
      </div>

      <p
        {...elementIdentity(ELEMENT_IDS.STATUS_DEPOSIT_STATIC)}
        className="static-notice"
        role="status"
      >
        상품 선택은 D4에서 연결합니다. 현재는 상품 정보만 확인할 수
        있습니다.
      </p>
    </DemoBankLayout>
  );
}
