package com.budgetbrain.app.util

import android.content.Context
import android.content.Intent
import com.budgetbrain.app.BuildConfig
import com.budgetbrain.app.data.model.TokenResponse
import com.budgetbrain.app.repository.AuthRepository
import com.google.android.gms.auth.api.signin.GoogleSignIn
import com.google.android.gms.auth.api.signin.GoogleSignInClient
import com.google.android.gms.auth.api.signin.GoogleSignInOptions
import com.google.android.gms.common.api.ApiException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class GoogleAuthHelper(
    private val context: Context,
    private val authRepository: AuthRepository
) {
    fun getSignInIntent(): Result<Intent> {
        val serverClientId = try {
            BuildConfig.GOOGLE_WEB_CLIENT_ID
        } catch (e: Exception) {
            ""
        }

        if (serverClientId.isBlank()) {
            return Result.failure(
                Exception("Google Sign-In is not configured in this build. Please set the GOOGLE_WEB_CLIENT_ID environment variable or sign in with Email & Password.")
            )
        }

        return try {
            val gso = GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
                .requestIdToken(serverClientId)
                .requestEmail()
                .build()

            val client: GoogleSignInClient = GoogleSignIn.getClient(context, gso)
            Result.success(client.signInIntent)
        } catch (e: Exception) {
            Result.failure(Exception("Failed to initialize Google Sign-In: ${e.message}"))
        }
    }

    suspend fun handleSignInResult(data: Intent?): Result<TokenResponse> = withContext(Dispatchers.IO) {
        try {
            val task = GoogleSignIn.getSignedInAccountFromIntent(data)
            val account = task.getResult(ApiException::class.java)
            val idToken = account.idToken
            if (!idToken.isNullOrBlank()) {
                authRepository.googleLogin(idToken)
            } else {
                Result.failure(Exception("Failed to retrieve Google ID token"))
            }
        } catch (e: ApiException) {
            Result.failure(Exception("Google Sign-In failed (${e.statusCode}): ${e.message}"))
        } catch (e: Exception) {
            Result.failure(Exception("Google Sign-In error: ${e.message}"))
        }
    }
}
