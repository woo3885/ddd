import DemoBankLayout from '../components/DemoBankLayout';
import { ELEMENT_IDS } from '../constants/element-ids';
import { ROUTES } from '../constants/routes';

interface NotFoundPageProps {
  currentPath: string;
}

export default function NotFoundPage({
  currentPath
}: NotFoundPageProps) {
  return (
    <DemoBankLayout
      pageId={ELEMENT_IDS.PAGE_NOT_FOUND}
      currentPath={currentPath}
      eyebrow="404"
      title="요청한 화면을 찾을 수 없습니다"
    >
      <div className="not-found-panel">
        <p>
          주소를 다시 확인하거나 메인 화면에서 데모 화면을 선택해
          주세요.
        </p>
        <a className="text-link" href={ROUTES.HOME}>
          메인 화면으로 돌아가기
        </a>
      </div>
    </DemoBankLayout>
  );
}
