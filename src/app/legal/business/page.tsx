import type { Metadata } from 'next';
import { BUSINESS_INFO } from '@/lib/legal/business';

export const metadata: Metadata = {
  title: '사업자정보',
  description: `${BUSINESS_INFO.serviceName} 운영사 ${BUSINESS_INFO.companyName}의 사업자 정보 안내.`,
};

/**
 * 전자상거래법 §10이 요구하는 사업자 표시 항목.
 * 표기 누락 시 동법 §40에 따라 시정 명령/과태료 대상이 될 수 있어 모든 항목을 빠짐없이 노출.
 */
export default function BusinessPage() {
  const b = BUSINESS_INFO;

  return (
    <>
      <h1>사업자정보</h1>
      <p className="legal-meta">최종 갱신: {b.effectiveDate}</p>

      <p>
        본 페이지는 「전자상거래 등에서의 소비자보호에 관한 법률」 제10조에 따른
        사업자 정보를 안내합니다.
      </p>

      <dl>
        <dt>상호</dt>
        <dd>
          {b.companyName} ({b.companyNameEn})
        </dd>

        <dt>대표자</dt>
        <dd>{b.ceoName}</dd>

        <dt>사업자등록번호</dt>
        <dd>
          {b.registrationNumber}{' '}
          <a
            href={`https://www.ftc.go.kr/bizCommPop.do?wrkr_no=${b.registrationNumber.replace(/-/g, '')}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            (사업자정보 확인)
          </a>
        </dd>

        <dt>통신판매업 신고번호</dt>
        <dd>
          {b.mailOrderRegistration}
          <br />
          <small>
            신고기관: {b.mailOrderAuthority} / 신고일: {b.mailOrderRegisteredAt}
          </small>
        </dd>

        <dt>과세 유형</dt>
        <dd>{b.taxType}</dd>

        <dt>개업일</dt>
        <dd>{b.establishedAt}</dd>

        <dt>발급기관</dt>
        <dd>{b.issuingAuthority}</dd>

        <dt>사업장 소재지</dt>
        <dd>{b.address}</dd>

        <dt>고객센터 전화</dt>
        <dd>
          <a href={`tel:${b.phone.replace(/-/g, '')}`}>{b.phone}</a>
        </dd>

        <dt>고객센터 이메일</dt>
        <dd>
          <a href={`mailto:${b.email}`}>{b.email}</a>
        </dd>

        <dt>서비스명 / 도메인</dt>
        <dd>
          {b.serviceName} / {b.serviceDomain}
        </dd>

        <dt>결제 대행사</dt>
        <dd>{b.paymentProcessor}</dd>
      </dl>

      <h2>업태 및 종목</h2>
      <ul>
        <li>정보통신업 / 그 외 기타 정보 서비스업</li>
        <li>도매 및 소매업 / SNS마켓</li>
        <li>정보통신업 / 컴퓨터 프로그래밍 서비스업</li>
        <li>정보통신업 / 자료 처리업</li>
      </ul>

      <h2>고객 응대 시간</h2>
      <p>평일 10:00 ~ 18:00 (점심시간 12:30 ~ 13:30, 주말 및 공휴일 제외)</p>
      <p>
        문의는 가능한 빠른 시간 내에 이메일{' '}
        <a href={`mailto:${b.email}`}>{b.email}</a> 로 답변드리며, 영업일 기준
        2일 이내 응답을 원칙으로 합니다.
      </p>
    </>
  );
}
