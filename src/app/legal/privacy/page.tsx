import type { Metadata } from 'next';
import { BUSINESS_INFO } from '@/lib/legal/business';

export const metadata: Metadata = {
  title: '개인정보처리방침',
  description: `${BUSINESS_INFO.serviceName} 개인정보처리방침. 수집 항목, 이용 목적, 보유 기간, 정보주체 권리 안내.`,
};

/**
 * 「개인정보 보호법」 제30조 및 「정보통신망법」 제27조의2에 따른 개인정보처리방침.
 *
 * 본 서비스는 OAuth(Google/Kakao) 기반 회원가입 + 자녀 학습용 프로필을 운영하며,
 * 식별 가능한 개인정보 수집 범위는 보호자 이메일·OAuth provider sub·결제 거래 식별자
 * 수준으로 최소화한다. 자녀의 별도 식별 정보는 수집하지 않는다.
 */
export default function PrivacyPage() {
  const b = BUSINESS_INFO;

  return (
    <>
      <h1>개인정보처리방침</h1>
      <p className="legal-meta">시행일: {b.effectiveDate}</p>

      <p>
        {b.companyName}(이하 &ldquo;회사&rdquo;)는 {b.serviceName} 서비스를 제공함에
        있어 「개인정보 보호법」, 「정보통신망 이용촉진 및 정보보호 등에 관한 법률」
        등 관련 법령을 준수하며, 정보주체의 개인정보를 안전하게 보호하기 위해 다음과
        같은 처리방침을 두고 있습니다.
      </p>

      <h2>1. 처리 목적</h2>
      <p>회사는 다음의 목적으로 최소한의 개인정보를 처리합니다.</p>
      <ul>
        <li>회원 가입 의사 확인 및 본인 식별</li>
        <li>서비스 제공 및 학습 콘텐츠 맞춤화 (자녀 프로필별 학습 이력 관리)</li>
        <li>유료 콘텐츠 결제 및 환불 처리</li>
        <li>고객 문의 응대, 공지사항 전달</li>
        <li>서비스 부정 이용 방지, 비인가 접근 차단</li>
        <li>법령 또는 이용약관 위반 행위 조사·조치</li>
      </ul>

      <h2>2. 수집하는 개인정보 항목 및 수집 방법</h2>
      <p>
        회사는 서비스 운영에 반드시 필요한 정보만을 수집하며, 자녀(학습자)의 별도
        식별 정보는 수집하지 않습니다.
      </p>
      <table className="legal-table">
        <thead>
          <tr>
            <th>구분</th>
            <th>수집 항목</th>
            <th>수집 방법</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>회원 가입 (필수)</td>
            <td>
              이메일, 사용자 ID, OAuth provider 식별자(Google sub / Kakao id),
              로그인 일시, IP 주소
            </td>
            <td>OAuth(Google/Kakao) 인증 또는 자체 가입 시 이용자 입력</td>
          </tr>
          <tr>
            <td>프로필 (자녀 학습용)</td>
            <td>
              프로필 별명(닉네임), 연령대(5~10세 등 범위), 영어 레벨(CEFR),
              아바타 선택값
            </td>
            <td>보호자가 직접 입력 (실명·생년월일 등 식별 정보 미수집)</td>
          </tr>
          <tr>
            <td>학습 활동</td>
            <td>
              생성된 책 목록, 읽기 진행률, 퀴즈 점수, 단어장 학습 이력, 신고 내역
            </td>
            <td>서비스 이용 과정에서 자동 생성·저장</td>
          </tr>
          <tr>
            <td>유료 결제</td>
            <td>
              결제 거래 식별자, 결제 일시, 결제 금액, 결제 수단 분류, 영수증 URL
            </td>
            <td>
              결제대행사 {b.paymentProcessor} 경유. 카드번호·계좌번호 등 민감
              결제정보는 회사가 직접 수집·보관하지 않습니다.
            </td>
          </tr>
          <tr>
            <td>자동 수집</td>
            <td>
              브라우저 종류·OS, 접속 일시, 접속 IP, 쿠키, 서비스 이용 로그
            </td>
            <td>서비스 이용 과정에서 자동 수집</td>
          </tr>
          <tr>
            <td>음성 학습 (선택)</td>
            <td>아동의 따라 읽기 음성 녹음(Blob)</td>
            <td>
              브라우저 IndexedDB에 로컬 저장됨. 회사 서버로 전송·저장되지
              않습니다(현재 업로드 기능 미제공).
            </td>
          </tr>
        </tbody>
      </table>

      <h2>3. 개인정보의 보유 및 이용 기간</h2>
      <p>
        회사는 원칙적으로 개인정보 처리 목적이 달성되거나 이용자가 회원 탈퇴를
        요청한 경우 지체 없이 해당 정보를 파기합니다. 다만 관련 법령에 따라
        보존이 필요한 경우 다음 기간 동안 보관합니다.
      </p>
      <ul>
        <li>회원 가입 정보: 회원 탈퇴 시까지 (탈퇴 즉시 파기)</li>
        <li>
          계약 또는 청약철회 등에 관한 기록: 5년 (전자상거래법 제6조)
        </li>
        <li>
          대금결제 및 재화 등의 공급에 관한 기록: 5년 (전자상거래법 제6조)
        </li>
        <li>
          소비자의 불만 또는 분쟁처리에 관한 기록: 3년 (전자상거래법 제6조)
        </li>
        <li>
          웹사이트 방문 기록(로그인, 접속IP): 3개월 (통신비밀보호법 제15조의2)
        </li>
      </ul>

      <h2>4. 개인정보의 제3자 제공</h2>
      <p>
        회사는 정보주체의 동의, 법률의 특별한 규정 등 「개인정보 보호법」 제17조에
        해당하는 경우를 제외하고는 개인정보를 제3자에게 제공하지 않습니다.
      </p>

      <h2>5. 개인정보 처리의 위탁</h2>
      <p>
        회사는 서비스 제공을 위해 다음과 같이 개인정보 처리 업무를 위탁하고
        있으며, 「개인정보 보호법」 제26조에 따라 위탁계약 시 개인정보의 안전한
        처리를 위한 사항을 명시합니다.
      </p>
      <table className="legal-table">
        <thead>
          <tr>
            <th>수탁자</th>
            <th>위탁 업무</th>
            <th>보관 위치</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{b.paymentProcessor}</td>
            <td>전자결제 처리, 결제 인증 및 승인, 영수증 발행</td>
            <td>대한민국</td>
          </tr>
          <tr>
            <td>Google LLC</td>
            <td>OAuth 로그인 인증 (Google 계정)</td>
            <td>해외 (Google 인프라)</td>
          </tr>
          <tr>
            <td>Kakao Corp.</td>
            <td>OAuth 로그인 인증 (Kakao 계정)</td>
            <td>대한민국</td>
          </tr>
          <tr>
            <td>OpenAI, L.L.C.</td>
            <td>
              AI 동화·번역·퀴즈 생성을 위한 프롬프트 처리
              (개인 식별 정보를 프롬프트에 포함시키지 않습니다.)
            </td>
            <td>해외 (미국)</td>
          </tr>
        </tbody>
      </table>

      <h2>6. 정보주체의 권리·의무 및 행사 방법</h2>
      <ol>
        <li>
          정보주체는 회사에 대하여 언제든지 다음 권리를 행사할 수 있습니다.
          <ul>
            <li>개인정보 열람·정정·삭제·처리정지 요구</li>
            <li>회원 탈퇴를 통한 개인정보 파기 요구</li>
            <li>동의 철회 요구</li>
          </ul>
        </li>
        <li>
          권리 행사는 서비스 내 계정 설정 메뉴 또는{' '}
          <a href={`mailto:${b.email}`}>{b.email}</a> 로 요청하실 수 있으며, 회사는
          요청을 받은 날로부터 10일 이내에 처리합니다.
        </li>
        <li>
          만 14세 미만 아동의 권리는 법정대리인이 행사할 수 있으며, 회사는
          법정대리인의 요청에 따라 아동 관련 학습 정보를 즉시 파기합니다.
        </li>
      </ol>

      <h2>7. 개인정보 파기 절차 및 방법</h2>
      <ul>
        <li>
          전자적 파일 형태: 복구 및 재생이 불가능한 방법으로 영구 삭제
        </li>
        <li>출력물·서면 형태: 분쇄기로 분쇄하거나 소각하여 파기</li>
      </ul>

      <h2>8. 개인정보의 안전성 확보 조치</h2>
      <ul>
        <li>관리적 조치: 내부관리계획 수립·시행, 접근권한 최소화 운영</li>
        <li>기술적 조치: 비밀번호 일방향 암호화, 통신 구간 TLS 암호화, 접근 통제</li>
        <li>물리적 조치: 데이터 처리시설 출입 통제</li>
      </ul>

      <h2>9. 쿠키(Cookie)의 운용 및 거부</h2>
      <ol>
        <li>
          회사는 로그인 세션 유지, 사용자 환경(테마·글자 크기) 저장, 학습 진행 상태
          복원을 위해 쿠키 및 브라우저 로컬스토리지를 사용합니다.
        </li>
        <li>
          이용자는 브라우저 설정에서 쿠키를 거부할 수 있으나, 일부 서비스 기능
          이용에 제약이 있을 수 있습니다.
        </li>
      </ol>

      <h2>10. 개인정보 보호책임자</h2>
      <dl>
        <dt>책임자</dt>
        <dd>{b.ceoName} (대표)</dd>
        <dt>이메일</dt>
        <dd>
          <a href={`mailto:${b.email}`}>{b.email}</a>
        </dd>
        <dt>전화</dt>
        <dd>
          <a href={`tel:${b.phone.replace(/-/g, '')}`}>{b.phone}</a>
        </dd>
      </dl>
      <p>
        개인정보 침해로 인한 신고나 상담이 필요하신 경우 아래 기관에 문의하실 수
        있습니다.
      </p>
      <ul>
        <li>
          개인정보 침해신고센터:{' '}
          <a
            href="https://privacy.kisa.or.kr"
            target="_blank"
            rel="noopener noreferrer"
          >
            privacy.kisa.or.kr
          </a>{' '}
          (국번없이 118)
        </li>
        <li>
          개인정보 분쟁조정위원회:{' '}
          <a
            href="https://www.kopico.go.kr"
            target="_blank"
            rel="noopener noreferrer"
          >
            www.kopico.go.kr
          </a>{' '}
          (1833-6972)
        </li>
        <li>
          대검찰청 사이버범죄수사단:{' '}
          <a
            href="https://www.spo.go.kr"
            target="_blank"
            rel="noopener noreferrer"
          >
            www.spo.go.kr
          </a>{' '}
          (02-3480-3573)
        </li>
        <li>
          경찰청 사이버수사국:{' '}
          <a
            href="https://ecrm.cyber.go.kr"
            target="_blank"
            rel="noopener noreferrer"
          >
            ecrm.cyber.go.kr
          </a>{' '}
          (국번없이 182)
        </li>
      </ul>

      <h2>11. 개인정보처리방침의 변경</h2>
      <p>
        본 방침은 시행일로부터 적용되며, 법령 또는 서비스 정책에 따라 변경될 경우
        적용일 7일 전(중요한 변경은 30일 전) 서비스 화면을 통해 공지합니다.
      </p>

      <p className="legal-meta" style={{ marginTop: '2rem' }}>
        공고일: {b.effectiveDate} / 시행일: {b.effectiveDate}
      </p>
    </>
  );
}
