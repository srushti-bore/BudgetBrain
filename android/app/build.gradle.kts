plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

val envBaseUrl: String = (project.findProperty("BUDGETBRAIN_API_BASE_URL") as String?)
    ?: System.getenv("BUDGETBRAIN_API_BASE_URL")
    ?: "https://budgetbrain-ojnr.onrender.com/api/v1/"

val envGoogleClientId: String = (project.findProperty("GOOGLE_WEB_CLIENT_ID") as String?)
    ?: System.getenv("GOOGLE_WEB_CLIENT_ID")
    ?: ""

val envBiometricEnabled: Boolean = ((project.findProperty("ENABLE_BIOMETRIC_LOCK") as String?)
    ?: System.getenv("ENABLE_BIOMETRIC_LOCK")
    ?: "true").toBoolean()

android {
    namespace = "com.budgetbrain.app"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.budgetbrain.app"
        minSdk = 24
        targetSdk = 34
        versionCode = 1
        versionName = "1.0.0"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        vectorDrawables {
            useSupportLibrary = true
        }

        buildConfigField("String", "BASE_URL", "\"$envBaseUrl\"")
        buildConfigField("String", "GOOGLE_WEB_CLIENT_ID", "\"$envGoogleClientId\"")
        buildConfigField("boolean", "ENABLE_BIOMETRIC_LOCK", "$envBiometricEnabled")
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
        debug {
            applicationIdSuffix = ".debug"
            isDebuggable = true
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
    buildFeatures {
        compose = true
        buildConfig = true
    }
    composeOptions {
        kotlinCompilerExtensionVersion = "1.5.8"
    }
    packaging {
        resources {
            excludes += "/META-INF/{AL2.0,LGPL2.1}"
        }
    }
}

dependencies {
    // AndroidX & Core
    implementation("androidx.core:core-ktx:1.12.0")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.7.0")
    implementation("androidx.activity:activity-compose:1.8.2")

    // Jetpack Compose BOM & UI
    val composeBom = platform("androidx.compose:compose-bom:2024.02.01")
    implementation(composeBom)
    androidTestImplementation(composeBom)

    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-graphics")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.material:material-icons-extended")

    // Navigation & Architecture Components
    implementation("androidx.navigation:navigation-compose:2.7.7")
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.7.0")
    implementation("androidx.lifecycle:lifecycle-runtime-compose:2.7.0")

    // Networking - Retrofit, OkHttp & Gson
    implementation("com.squareup.retrofit2:retrofit:2.9.0")
    implementation("com.squareup.retrofit2:converter-gson:2.9.0")
    implementation("com.squareup.okhttp3:okhttp:4.12.0")
    implementation("com.squareup.okhttp3:logging-interceptor:4.12.0")

    // Kotlin Coroutines
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-core:1.7.3")

    // Security & Encrypted Storage
    implementation("androidx.security:security-crypto:1.1.0-alpha06")

    // Biometric Authentication (Fingerprint & Face Unlock)
    implementation("androidx.biometric:biometric:1.2.0-alpha05")

    // Google Credential Manager (Native Google Sign-In)
    implementation("androidx.credentials:credentials:1.2.1")
    implementation("androidx.credentials:credentials-play-services-auth:1.2.1")
    implementation("com.google.android.libraries.identity.googleid:googleid:1.1.0")

    // Background Work & Notifications
    implementation("androidx.work:work-runtime-ktx:2.9.0")

    // Image Loading (Receipts, Brainy Assets)
    implementation("io.coil-kt:coil-compose:2.5.0")

    // CameraX (For AI Receipt Scanner)
    implementation("androidx.camera:camera-camera2:1.3.1")
    implementation("androidx.camera:camera-lifecycle:1.3.1")
    implementation("androidx.camera:camera-view:1.3.1")

    // Testing
    testImplementation("junit:junit:4.13.2")
    androidTestImplementation("androidx.test.ext:junit:1.1.5")
    androidTestImplementation("androidx.test.espresso:espresso-core:3.5.1")
    androidTestImplementation("androidx.compose.ui:ui-test-junit4")
    debugImplementation("androidx.compose.ui:ui-tooling")
    debugImplementation("androidx.compose.ui:ui-test-manifest")
}

