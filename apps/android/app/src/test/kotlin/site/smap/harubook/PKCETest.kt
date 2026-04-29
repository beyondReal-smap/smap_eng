package site.smap.harubook

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Test
import site.smap.harubook.core.auth.PKCE

class PKCETest {

    @Test
    fun verifierIsBase64Url() {
        val verifier = PKCE.generateVerifier()
        assertFalse(verifier.contains("+"))
        assertFalse(verifier.contains("/"))
        assertFalse(verifier.contains("="))
    }

    @Test
    fun verifierLengthFor32Bytes() {
        val verifier = PKCE.generateVerifier(byteLength = 32)
        // base64url 무패딩, 32 byte → 43자
        assertEquals(43, verifier.length)
    }

    /** RFC 7636 Appendix B 검증 벡터. */
    @Test
    fun challengeMatchesRFC7636Vector() {
        val verifier = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"
        val expected = "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM"
        assertEquals(expected, PKCE.challenge(verifier))
    }
}
