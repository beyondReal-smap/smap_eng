import type { Metadata } from 'next';
import { BUSINESS_INFO } from '@/lib/legal/business';

export const metadata: Metadata = {
  title: '환불정책',
  description: `${BUSINESS_INFO.serviceName} 환불 정책. 청약철회, 환불 절차, 환불 제한 사유 안내.`,
};

/**
 * 「전자상거래 등에서의 소비자보호에 관한 법률」 제17조(청약철회) 및 제18조
 * (청약철회의 효과)에 따른 환불 정책. AI 크레딧/구독 형태의 디지털 콘텐츠 결제
 * 모델에 맞춰 청약철회 가능 범위와 제한 사유를 분리해 명시한다.
 */
export default function RefundPage() {
  const b = BUSINESS_INFO;

  return (
    <>
      <h1>환불정책</h1>
      <p className="legal-meta">시행일: {b.effectiveDate}</p>

      <p>
        {b.companyName}(이하 &ldquo;회사&rdquo;)는 「전자상거래 등에서의 소비자
        보호에 관한 법률」(이하 &ldquo;전자상거래법&rdquo;) 및 관련 법령에 따라
        다음과 같이 환불 정책을 운영합니다.
      </p>

      <h2>1. 결제 구조</h2>
      <ol>
        <li>
          {b.serviceName}의 유료 기능은 회사가 발행하는{' '}
          <strong>크레딧(사이버 콘텐츠 이용권)</strong> 또는{' '}
          <strong>정기 구독</strong> 형태로 제공됩니다.
        </li>
        <li>
          결제는 결제대행사 <strong>{b.paymentProcessor}</strong>을 통해 신용카드,
          계좌이체, 간편결제 등의 수단으로 이루어집니다.
        </li>
        <li>
          크레딧은 동화 생성, 이미지 생성 등의 기능 사용 시 차감되며, 차감된
          크레딧은 즉시 외부 AI 모델 호출 비용으로 사용됩니다.
        </li>
      </ol>

      <h2>2. 청약철회 (단순 변심 환불)</h2>
      <ol>
        <li>
          회원은 결제일로부터 <strong>7일 이내</strong>에 단순 변심에 의한 청약
          철회를 요청할 수 있습니다(전자상거래법 §17 ①).
        </li>
        <li>
          단, 다음 각 호의 경우 청약철회가 제한됩니다(전자상거래법 §17 ②).
          <ul>
            <li>
              회원이 이미 사용한 크레딧에 해당하는 금액 — 디지털 콘텐츠는 사용
              즉시 외부 AI 호출 비용이 발생하므로 사용분에 대해서는 청약철회가
              제한됩니다(전자상거래법 §17 ② 5호 및 시행령 §21).
            </li>
            <li>
              구독 상품의 경우 결제 후 회원이 서비스를 이용한 경우 — 단, 이용
              개시 전에는 100% 환불 가능합니다.
            </li>
            <li>
              회원에게 책임 있는 사유로 재화 등이 멸실 또는 훼손된 경우.
            </li>
          </ul>
        </li>
        <li>
          위 제한 사유에 해당하더라도 회사는 회원이 청약철회권을 행사할 수 있다는
          사실을 결제 화면에 사전 고지하며, 미고지 시 본 제한이 적용되지 않습니다.
        </li>
      </ol>

      <h2>3. 미사용 크레딧 환불</h2>
      <p>회원이 결제 후 7일이 지나도 사용하지 않은 크레딧은 다음 기준에 따라 환불됩니다.</p>
      <table className="legal-table">
        <thead>
          <tr>
            <th>구분</th>
            <th>환불 비율</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>결제일로부터 7일 이내, 사용 이력 없음</td>
            <td>결제 금액 100% 환불</td>
          </tr>
          <tr>
            <td>결제일로부터 7일 이내, 일부 사용</td>
            <td>(잔여 크레딧 ÷ 총 크레딧) × 결제 금액 환불</td>
          </tr>
          <tr>
            <td>결제일로부터 7일 경과 후, 미사용 잔여분 환불 신청</td>
            <td>
              잔여 크레딧 가치의 90% 환불 (결제대행사 수수료 등 합리적 비용 공제)
            </td>
          </tr>
        </tbody>
      </table>

      <h2>4. 정기 구독 환불</h2>
      <ol>
        <li>
          정기 구독은 매 결제 주기 시작 후 7일 이내, 서비스를 사용하지 않은
          경우에 한해 100% 환불됩니다.
        </li>
        <li>
          이용을 시작한 후 해지 시점부터의 미사용 기간에 대해서는 회사가 정한
          일할 환산 기준에 따라 환불을 제공할 수 있습니다.
        </li>
        <li>
          중도 해지 시 다음 결제 주기부터 자동 결제가 중단되며, 잔여 기간 동안의
          서비스 이용은 그대로 유지됩니다.
        </li>
      </ol>

      <h2>5. 회사 귀책 사유에 의한 환불</h2>
      <p>다음의 경우 결제 금액 전액을 환불합니다.</p>
      <ul>
        <li>회사의 시스템 오류로 결제만 이루어지고 크레딧이 지급되지 않은 경우</li>
        <li>이중 결제가 발생한 경우 (중복 분 전액 환불)</li>
        <li>
          회사가 광고 또는 결제 화면에 표시한 사양과 실제 제공 서비스가 현저히
          다른 경우
        </li>
        <li>
          회사의 책임 있는 사유로 24시간 이상 서비스 제공이 중단된 경우 (해당
          기간에 비례하는 금액)
        </li>
      </ul>

      <h2>6. 환불 신청 방법</h2>
      <ol>
        <li>
          서비스 내 계정 설정 → 결제 내역에서 해당 거래의{' '}
          <strong>환불 요청</strong> 버튼을 통해 신청하시거나,
        </li>
        <li>
          이메일 <a href={`mailto:${b.email}`}>{b.email}</a> 또는 전화{' '}
          <a href={`tel:${b.phone.replace(/-/g, '')}`}>{b.phone}</a> 로 다음 정보를
          포함하여 신청해 주십시오.
          <ul>
            <li>회원 가입 이메일</li>
            <li>결제 일시 및 결제 금액</li>
            <li>결제 거래 ID 또는 영수증</li>
            <li>환불 사유</li>
          </ul>
        </li>
      </ol>

      <h2>7. 환불 처리 기간</h2>
      <ol>
        <li>
          회사는 환불 신청 접수일로부터 <strong>3영업일 이내</strong>에 환불 가부를
          판단해 회원에게 통지합니다.
        </li>
        <li>
          환불이 결정된 경우 결제대행사 {b.paymentProcessor}을 통해 결제 수단별로
          승인 취소 또는 입금 환불이 진행되며, 카드사·은행 사정에 따라 실제 출금
          취소·환급까지 영업일 기준 3~7일이 추가 소요될 수 있습니다.
        </li>
      </ol>

      <h2>8. 분쟁 조정</h2>
      <p>
        환불과 관련해 분쟁이 발생할 경우 회사와 회원은 신의성실 원칙에 따라
        협의하며, 협의가 이루어지지 않을 경우 다음 기관의 도움을 받을 수
        있습니다.
      </p>
      <ul>
        <li>
          공정거래위원회 1372 소비자상담센터:{' '}
          <a href="https://www.ccn.go.kr" target="_blank" rel="noopener noreferrer">
            www.ccn.go.kr
          </a>{' '}
          (국번없이 1372)
        </li>
        <li>
          한국소비자원:{' '}
          <a href="https://www.kca.go.kr" target="_blank" rel="noopener noreferrer">
            www.kca.go.kr
          </a>
        </li>
        <li>
          전자거래분쟁조정위원회:{' '}
          <a href="https://www.ecmc.or.kr" target="_blank" rel="noopener noreferrer">
            www.ecmc.or.kr
          </a>
        </li>
      </ul>

      <h2>9. 약관과의 관계</h2>
      <p>
        본 환불정책은 <a href="/legal/terms">이용약관</a>의 일부를 구성하며,
        본 정책에 명시되지 않은 사항은 이용약관과 관련 법령을 따릅니다.
      </p>

      <p className="legal-meta" style={{ marginTop: '2rem' }}>
        공고일: {b.effectiveDate} / 시행일: {b.effectiveDate}
      </p>
    </>
  );
}
