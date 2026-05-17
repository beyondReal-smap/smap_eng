package site.smap.harubook.core.networking

import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.engine.okhttp.OkHttp
import io.ktor.client.plugins.DefaultRequest
import io.ktor.client.plugins.HttpTimeout
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.client.plugins.logging.LogLevel
import io.ktor.client.plugins.logging.Logging
import io.ktor.client.request.header
import io.ktor.client.request.request
import io.ktor.client.request.setBody
import io.ktor.client.statement.HttpResponse
import io.ktor.client.statement.bodyAsText
import io.ktor.http.ContentType
import io.ktor.http.HttpHeaders
import io.ktor.http.HttpMethod
import io.ktor.http.URLBuilder
import io.ktor.http.Url
import io.ktor.http.appendPathSegments
import io.ktor.http.contentType
import io.ktor.http.takeFrom
import io.ktor.serialization.kotlinx.json.json
import kotlinx.coroutines.CancellationException
import kotlinx.serialization.json.Json
import site.smap.harubook.core.auth.AuthState

/**
 * Ktor 기반 단일 HTTP 클라이언트. iOS `APIClient.swift` 미러.
 *
 * - 백엔드는 요청·응답 모두 camelCase. snake_case가 필요한 곳은 모델 측 `@SerialName` 으로 명시.
 * - 401 응답 시 [AuthState.handleUnauthorized] 호출 후 [ApiError.Unauthorized] throw.
 */
object ApiClient {
    val json: Json = Json {
        ignoreUnknownKeys = true
        coerceInputValues = true
        explicitNulls = false
    }

    private val client = HttpClient(OkHttp) {
        expectSuccess = false
        install(ContentNegotiation) { json(json) }
        install(Logging) { level = LogLevel.INFO }
        install(HttpTimeout) {
            requestTimeoutMillis = 60_000
            connectTimeoutMillis = 10_000
            socketTimeoutMillis = 60_000
        }
        install(DefaultRequest) {
            url(AppConfig.API_BASE_URL)
            contentType(ContentType.Application.Json)
        }
    }

    suspend inline fun <reified R> get(
        path: String,
        query: Map<String, String> = emptyMap(),
        requiresAuth: Boolean = true,
    ): R = request(HttpMethod.Get, path, query = query, body = Unit, requiresAuth = requiresAuth)

    suspend inline fun <reified R> post(
        path: String,
        body: Any? = null,
        requiresAuth: Boolean = true,
    ): R = request(HttpMethod.Post, path, body = body, requiresAuth = requiresAuth)

    suspend inline fun <reified R> patch(
        path: String,
        body: Any? = null,
        requiresAuth: Boolean = true,
    ): R = request(HttpMethod.Patch, path, body = body, requiresAuth = requiresAuth)

    /** 모든 verb 일반화 진입점. inline + reified 로 응답 타입 자동 디코딩. */
    suspend inline fun <reified R> request(
        method: HttpMethod,
        path: String,
        query: Map<String, String> = emptyMap(),
        body: Any? = null,
        requiresAuth: Boolean = true,
    ): R {
        val response = sendRaw(method, path, query, body, requiresAuth)

        if (response.status.value == 401 && requiresAuth) {
            AuthState.handleUnauthorized()
            throw ApiError.Unauthorized
        }

        if (response.status.value !in 200..299) {
            val text = runCatching { response.bodyAsText() }.getOrDefault("")
            throw ApiError.Http(response.status.value, response.status.description, text.take(200))
        }

        return try {
            response.body()
        } catch (e: CancellationException) {
            throw e
        } catch (e: Throwable) {
            throw ApiError.Decoding(e)
        }
    }

    suspend fun sendRaw(
        method: HttpMethod,
        path: String,
        query: Map<String, String>,
        body: Any?,
        requiresAuth: Boolean,
    ): HttpResponse = try {
        client.request {
            this.method = method
            url { takeFrom(buildUrl(path, query)) }
            if (requiresAuth) {
                AuthState.peekAccessToken()?.let { token ->
                    header(HttpHeaders.Authorization, "Bearer $token")
                }
            }
            if (body != null && body !== Unit) {
                setBody(body)
            }
        }
    } catch (e: CancellationException) {
        throw e
    } catch (e: ApiError) {
        throw e
    } catch (e: Throwable) {
        throw ApiError.Transport(e)
    }

    private fun buildUrl(path: String, query: Map<String, String>): Url {
        val builder = URLBuilder().takeFrom(AppConfig.API_BASE_URL)
        val segments = path.trim('/').split('/').filter { it.isNotEmpty() }
        builder.appendPathSegments(segments)
        query.forEach { (k, v) -> builder.parameters.append(k, v) }
        return builder.build()
    }

    /** `/api/static/...` 처럼 본문이 바이트인 인증 게이트 미디어 다운로드용. */
    suspend fun downloadAuthenticated(path: String): ByteArray {
        val response = sendRaw(HttpMethod.Get, path, emptyMap(), null, requiresAuth = true)
        if (response.status.value !in 200..299) {
            throw ApiError.Http(response.status.value, response.status.description, null)
        }
        return response.body()
    }
}
