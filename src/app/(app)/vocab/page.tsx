import { TAB_PAGE_SHELL } from '@/components/haru';
import { VocabDeck } from '@/components/vocab-deck';

export const dynamic = 'force-dynamic';

/**
 * 단어장 "단어 카드"(그림책 세계 웹 2단계). SiteHeader는 (app)/layout.tsx가 보유해
 * 페이지 이동 사이 마운트가 유지된다. 제목 줄(TabHeader)은 오늘 진행 칩이 단어 목록에
 * 따라 달라져 VocabDeck이 그린다 — 책장·통계와 같은 바깥 틀(TAB_PAGE_SHELL)로 제목 위치를 맞춘다.
 * 책장 복귀는 헤더 로고·메뉴로(기존 "← 책장" 버튼은 탭 제목 줄 규칙에 맞춰 뺐다).
 */
export default function VocabPage() {
  return (
    <main className={TAB_PAGE_SHELL}>
      <VocabDeck />
    </main>
  );
}
