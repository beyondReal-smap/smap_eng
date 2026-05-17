plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.compose)
    alias(libs.plugins.kotlin.serialization)
}

// FCM 자산(google-services.json) 이 있을 때만 google-services 플러그인 적용.
// 자산은 시크릿이라 커밋 금지 — Firebase Console > 프로젝트 설정에서 다운로드해 app/ 에 배치.
// 자산이 없으면 빌드는 통과하지만 FirebaseMessaging.getToken() 이 IllegalStateException 으로 실패한다.
if (file("google-services.json").exists()) {
    apply(plugin = libs.plugins.google.services.get().pluginId)
}

android {
    namespace = "site.smap.harubook"
    compileSdk = 35

    defaultConfig {
        // Firebase Console 에 등록된 Android 앱 package_name 과 일치해야 google-services 플러그인이
        // 빌드 시 자산을 정상 인식한다. iOS Bundle ID(`com.smap.harubook`) 와 동일하지만 Firebase 는
        // 플랫폼별로 별도 mobilesdk_app_id 를 부여해 식별하므로 ID 공유에 문제 없음.
        applicationId = "com.smap.harubook"
        minSdk = 26
        targetSdk = 35
        versionCode = 1
        versionName = "0.1.0"
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

    buildTypes {
        debug {
            isMinifyEnabled = false
            // applicationIdSuffix 제거 — google-services.json 은 단일 package_name 만 등록되어
            // `.debug` 접미사가 붙으면 매칭 실패한다. Firebase Console 에 `.debug` 패키지를
            // 별도 앱으로 등록하면 suffix 복원 가능.
        }
        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro",
            )
        }
    }

    buildFeatures {
        compose = true
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
        freeCompilerArgs += listOf(
            "-opt-in=kotlin.RequiresOptIn",
            "-opt-in=androidx.compose.material3.ExperimentalMaterial3Api",
        )
    }

    packaging {
        resources {
            excludes += "/META-INF/{AL2.0,LGPL2.1}"
        }
    }

    sourceSets {
        named("test") {
            kotlin.srcDir("src/test/kotlin")
        }
    }
}

dependencies {
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.appcompat)
    implementation(libs.androidx.activity.compose)
    implementation(libs.androidx.lifecycle.viewmodel.ktx)
    implementation(libs.androidx.lifecycle.viewmodel.compose)
    implementation(libs.androidx.lifecycle.runtime.compose)
    implementation(libs.androidx.navigation.compose)
    implementation(libs.androidx.browser)
    implementation(libs.androidx.security.crypto)

    implementation(platform(libs.compose.bom))
    implementation(libs.compose.ui)
    implementation(libs.compose.ui.graphics)
    implementation(libs.compose.foundation)
    implementation(libs.compose.material3)
    implementation(libs.compose.material.icons.extended)
    debugImplementation(libs.compose.ui.tooling)
    implementation(libs.compose.ui.tooling.preview)

    implementation(libs.kotlinx.coroutines.android)
    implementation(libs.kotlinx.serialization.json)

    implementation(libs.ktor.client.core)
    implementation(libs.ktor.client.okhttp)
    implementation(libs.ktor.client.content.negotiation)
    implementation(libs.ktor.client.logging)
    implementation(libs.ktor.serialization.json)

    implementation(libs.media3.exoplayer)
    implementation(libs.coil.compose)

    // Firebase Cloud Messaging — google-services 플러그인이 google-services.json 을 읽어 자동 설정.
    implementation(platform(libs.firebase.bom))
    implementation(libs.firebase.messaging)

    // Google Play Billing v6 — Consumable IAP.
    implementation(libs.play.billing)

    testImplementation(libs.junit)
    testImplementation(libs.kotlinx.coroutines.test)
}
