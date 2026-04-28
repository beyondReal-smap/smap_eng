/**
 * 사업자·서비스 정보 단일 출처(SSOT).
 *
 * 전자상거래법 §10(사업자정보 표시), 정보통신망법 §27의2(개인정보처리방침),
 * 약관규제법(이용약관)에서 요구하는 표기 항목을 모든 페이지가 동일하게
 * 인용할 수 있도록 한 곳에 모은다. 값 변경 시 연락처/주소가 어긋나는 사고를
 * 막기 위해 약관·푸터·고객센터 안내문이 모두 이 모듈을 import 해야 한다.
 */
export const BUSINESS_INFO = {
  /** 상호 (한글) */
  companyName: '비욘드리얼',
  /** 상호 (영문 표기) */
  companyNameEn: 'Beyond Real',
  /** 대표자명 */
  ceoName: '정진',
  /** 사업자등록번호 (xxx-xx-xxxxx) */
  registrationNumber: '208-07-09695',
  /** 사업장 소재지 */
  address: '경기도 김포시 김포한강9로75번길 66, 505-A237호 (구래동, 국제프라자)',
  /** 대표 연락처 */
  phone: '010-5709-5435',
  /** 고객 문의 이메일 */
  email: 'admin@smap.site',
  /**
   * 통신판매업 신고번호 (경기도 김포시).
   * 2024-04-19 신고 — 공정위 사업자정보공개에서 조회 가능.
   * https://www.ftc.go.kr/bizCommPop.do?wrkr_no=2080709695
   */
  mailOrderRegistration: '제2024-경기김포-3006호',
  /** 통신판매업 신고기관 */
  mailOrderAuthority: '경기도 김포시',
  /** 통신판매업 신고일 */
  mailOrderRegisteredAt: '2024-04-19',
  /** 부가세 과세 유형 */
  taxType: '간이과세자',
  /** 개업일 (YYYY-MM-DD) */
  establishedAt: '2024-04-04',
  /** 발급기관 */
  issuingAuthority: '김포세무서장',
  /** 서비스명 */
  serviceName: '하루책',
  /** 서비스 도메인 */
  serviceDomain: 'eng.smap.site',
  /** 결제 대행사 */
  paymentProcessor: '포트원(PortOne) 주식회사 코리아포트원',
  /**
   * 약관/처리방침 시행일. 본문 변경 시 함께 갱신.
   * 사용자에게 공지된 마지막 개정일자를 의미.
   */
  effectiveDate: '2026-04-27',
} as const;

export type BusinessInfo = typeof BUSINESS_INFO;
