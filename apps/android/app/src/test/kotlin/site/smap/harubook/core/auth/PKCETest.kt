package site.smap.harubook.core.auth

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class PKCETest {
    @Test
    fun verifierIsBase64UrlSafeLength43To128() {
        val v = PKCE.generateVerifier()
        assertTrue("len=${v.length}", v.length in 43..128)
        assertTrue("alphabet", v.all { it.isLetterOrDigit() || it == '-' || it == '_' })
    }

    @Test
    fun challengeIsDeterministicAndLen43() {
        val v = "abcdefghijklmnopqrstuvwxyz0123456789-_ABC"
        val c1 = PKCE.challenge(v)
        val c2 = PKCE.challenge(v)
        assertEquals(c1, c2)
        // SHA-256 32바이트 → base64url no-pad = 43자.
        assertEquals(43, c1.length)
    }

    @Test
    fun verifierGeneratesUniqueValues() {
        val a = PKCE.generateVerifier()
        val b = PKCE.generateVerifier()
        assertNotEquals(a, b)
    }
}
