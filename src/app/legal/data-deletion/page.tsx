import type { Metadata } from 'next';
import { BUSINESS_INFO } from '@/lib/legal/business';

export const metadata: Metadata = {
  title: '데이터 삭제 요청',
  description: `${BUSINESS_INFO.serviceName} 사용자 데이터 삭제 절차. 계정 전체 삭제 외에 일부 데이터(자녀 프로필·동화·학습 기록·단어장)만 선택 삭제 요청도 가능합니다.`,
};

/**
 * Google Play Data Safety / GDPR Art.17 (right to erasure) / 개인정보보호법 §36
 * 모두를 충족하는 데이터 삭제 안내 페이지.
 *
 * Play Console "사용자가 데이터 삭제를 요청할 수 있는 링크" 입력란에 이 URL 을 등록한다.
 */
export default function DataDeletionPage() {
  const b = BUSINESS_INFO;

  return (
    <>
      <h1>데이터 삭제 요청</h1>
      <p className="legal-meta">시행일: {b.effectiveDate}</p>

      <p>
        {b.companyName}(이하 &ldquo;회사&rdquo;)는 「개인정보 보호법」 제36조(개인정보의
        정정·삭제) 및 GDPR Article 17(Right to Erasure)에 따라 회원이 자신의 데이터를
        스스로 또는 회사에 요청하여 삭제할 수 있는 절차를 마련하고 있습니다.
      </p>

      <h2>1. 앱 내에서 직접 삭제</h2>
      <p>
        가장 빠른 방법입니다. {b.serviceName} 앱에서 다음 경로로 즉시 삭제할 수
        있습니다.
      </p>
      <table className="legal-table">
        <thead>
          <tr>
            <th>대상 데이터</th>
            <th>경로</th>
            <th>처리 방식</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>자녀 프로필 1개</td>
            <td>프로필 선택 화면 → 카드 우상단 ⋯ → 삭제</td>
            <td>프로필은 즉시 목록에서 사라지며, 해당 자녀가 만든 책·학습 기록은 30일간 보존 후 영구 삭제 (사용자가 같은 이름으로 재가입할 경우 이어보기 위함).</td>
          </tr>
          <tr>
            <td>계정 + 모든 데이터</td>
            <td>설정 → 위험 영역 → 계정 삭제</td>
            <td>이메일, 자녀 프로필, 동화, 학습 기록, 단어장, 결제 영수증, 푸시 토큰을 즉시 익명화하고 30일 후 완전 삭제합니다.</td>
          </tr>
        </tbody>
      </table>

      <h2>2. 일부 데이터만 별도 삭제 요청</h2>
      <p>
        계정은 유지한 채 특정 데이터만 삭제하고 싶은 경우, 이메일로 요청해 주시면
        영업일 기준 <strong>3일 이내</strong>에 처리합니다.
      </p>
      <ul>
        <li>
          요청 가능 항목 예시: <em>특정 동화 1권 삭제 / 단어장 전체 초기화 /
          학습 통계만 삭제 / 푸시 토큰만 해지 / 보호자 PIN 초기화</em>
        </li>
        <li>
          요청 주소: <a href={`mailto:${b.email}`}>{b.email}</a>
        </li>
        <li>
          포함 정보:
          <ol>
            <li>가입 이메일</li>
            <li>자녀 프로필 이름 (해당하는 경우)</li>
            <li>삭제 대상 (예: &ldquo;책 #142, 단어장 전체&rdquo;)</li>
            <li>요청 사유 (선택)</li>
          </ol>
        </li>
      </ul>

      <h2>3. 계정 전체 삭제 (외부 요청 경로)</h2>
      <p>
        앱에 접근할 수 없거나 가입 이메일을 분실한 경우에도 본인 확인을 거쳐 계정을
        삭제해 드립니다.
      </p>
      <ol>
        <li>
          이메일 <a href={`mailto:${b.email}`}>{b.email}</a> 로 다음 정보를 보내
          주십시오.
          <ul>
            <li>제목: &ldquo;[하루책] 계정 삭제 요청&rdquo;</li>
            <li>가입에 사용한 이메일 또는 SNS 로그인(구글/카카오) 식별 정보</li>
            <li>본인 확인을 위한 추가 정보 (회사가 요청할 경우)</li>
          </ul>
        </li>
        <li>
          접수 후 영업일 기준 3일 이내에 본인 확인을 위한 회신을 드리며, 확인
          완료 후 7일 이내에 계정과 연관 데이터를 모두 삭제합니다.
        </li>
        <li>
          삭제 후 30일 동안은 결제 환불·법적 분쟁 등에 대비해 익명화된 상태로
          보관된 후, 30일이 지나면 백업·재해 복구본을 포함해 완전히 파기됩니다.
        </li>
      </ol>

      <h2>4. 보존되는 정보</h2>
      <p>
        다음 정보는 관련 법령에 따라 일정 기간 보존됩니다. 회원의 삭제 요청이
        있어도 법정 보존기간 동안에는 분리 보관됩니다.
      </p>
      <ul>
        <li>전자상거래법 §6 ③, 시행령 §6: 표시·광고 기록 6개월</li>
        <li>전자상거래법 §6 ③, 시행령 §6: 계약/청약철회 등 기록 5년</li>
        <li>전자상거래법 §6 ③, 시행령 §6: 대금결제·재화공급 기록 5년</li>
        <li>전자상거래법 §6 ③, 시행령 §6: 소비자 불만·분쟁처리 기록 3년</li>
        <li>통신비밀보호법 §15의2: 로그 기록 3개월</li>
      </ul>

      <h2>5. 처리 결과 통지</h2>
      <p>
        삭제 요청 처리 결과는 회원이 지정한 연락처(이메일)로 통지하며, 처리에
        이의가 있는 경우 다음 기관의 도움을 받을 수 있습니다.
      </p>
      <ul>
        <li>
          개인정보침해 신고센터:{' '}
          <a href="https://privacy.kisa.or.kr" target="_blank" rel="noopener noreferrer">
            privacy.kisa.or.kr
          </a>{' '}
          (국번없이 118)
        </li>
        <li>
          개인정보분쟁조정위원회:{' '}
          <a href="https://www.kopico.go.kr" target="_blank" rel="noopener noreferrer">
            www.kopico.go.kr
          </a>{' '}
          (1833-6972)
        </li>
        <li>대검찰청 사이버수사과: <a href="https://www.spo.go.kr" target="_blank" rel="noopener noreferrer">www.spo.go.kr</a> (국번없이 1301)</li>
        <li>경찰청 사이버수사국: <a href="https://ecrm.cyber.go.kr" target="_blank" rel="noopener noreferrer">ecrm.cyber.go.kr</a> (국번없이 182)</li>
      </ul>

      <h2>6. 관련 문서</h2>
      <p>
        자세한 처리 방침은 <a href="/legal/privacy">개인정보처리방침</a>과{' '}
        <a href="/legal/refund">환불정책</a>을 함께 참고해 주십시오. 결제 환불은
        환불정책의 절차를 따릅니다.
      </p>

      <p className="legal-meta" style={{ marginTop: '2rem' }}>
        공고일: {b.effectiveDate} / 시행일: {b.effectiveDate}
        <br />
        문의: <a href={`mailto:${b.email}`}>{b.email}</a>
        {' / '}
        <a href={`tel:${b.phone.replace(/-/g, '')}`}>{b.phone}</a>
      </p>
    </>
  );
}
