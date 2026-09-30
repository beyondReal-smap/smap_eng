package site.smap.harubook.features.reader

import org.junit.Assert.assertEquals
import org.junit.Test

/**
 * 읽기 위치 복원 클램프 — 웹 reader.tsx 범위 가드 + 페이지 수 변동 대비.
 */
class ReaderProgressTest {
    @Test
    fun clampMissingOrEmpty() {
        assertEquals(0, ReaderViewModel.clampProgressIndex(null, 10))
        assertEquals(0, ReaderViewModel.clampProgressIndex(4, 0))
        assertEquals(0, ReaderViewModel.clampProgressIndex(null, 0))
    }

    @Test
    fun clampInRange() {
        assertEquals(0, ReaderViewModel.clampProgressIndex(0, 5))
        assertEquals(4, ReaderViewModel.clampProgressIndex(4, 5))
        assertEquals(2, ReaderViewModel.clampProgressIndex(2, 5))
    }

    @Test
    fun clampOutOfRangeToLastPage() {
        // 책이 12쪽에서 8쪽으로 줄어든 경우 마지막 페이지로.
        assertEquals(7, ReaderViewModel.clampProgressIndex(11, 8))
        assertEquals(0, ReaderViewModel.clampProgressIndex(-3, 8))
    }

    @Test
    fun progressKeyMatchesWebConvention() {
        assertEquals("reader:progress:42", ReaderViewModel.progressStorageKey(42))
    }
}
