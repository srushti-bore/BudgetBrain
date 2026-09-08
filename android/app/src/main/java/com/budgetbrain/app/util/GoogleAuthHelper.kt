package com.budgetbrain.app.util

import android.content.Context
import androidx.credentials.CredentialManager
import androidx.credentials.CustomCredential
import androidx.credentials.GetCredentialRequest
import androidx.credentials.exceptions.GetCredentialCancellationException
import androidx.credentials.exceptions.GetCredentialException
import com.budgetbrain.app.BuildConfig
import com.budgetbrain.app.data.model.TokenResponse
import com.budgetbrain.app.repository.AuthRepository
import com.google.android.libraries.identity.googleid.GetGoogleIdOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class GoogleAuthHelper(
    private val context: Context,
    private val authRepository: AuthRepository
) {
    private val credentialManager = CredentialManager.create(context)

    suspend fun signIn(): Result<TokenResponse> = withContext(Dispatchers.IO) {
        val serverClientId = try {
            BuildConfig.GOOGLE_WEB_CLIENT_ID
        } catch (e: Exception) {
            ""
        }

        if (serverClientId.isBlank()) {
            return@withContext Result.failure(
                Exception("Google Sign-In is not configured in this build. Please set the GOOGLE_WEB_CLIENT_ID environment variable or sign in with Email & Password.")
            )
        }

        try {
            val googleIdOption = GetGoogleIdOption.Builder()
                .setFilterByAuthorizedAccounts(false)
                .setServerClientId(serverClientId)
                .setAutoSelectEnabled(false)
                .build()

            val request = GetCredentialRequest.Builder()
                .addCredentialOption(googleIdOption)
                .build()

            val response = credentialManager.getCredential(
                context = context,
                request = request
            )

            val credential = response.credential
            if (credential is CustomCredential && credential.type == GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL) {
                val googleIdTokenCredential = GoogleIdTokenCredential.createFrom(credential.data)
                val idToken = googleIdTokenCredential.idToken
                return@withContext authRepository.googleLogin(idToken)
            } else {
                return@withContext Result.failure(Exception("Unsupported credential type returned by Google"))
            }
        } catch (e: GetCredentialCancellationException) {
            return@withContext Result.failure(Exception("Google Sign-In was cancelled"))
        } catch (e: GetCredentialException) {
            return@withContext Result.failure(Exception("Google Sign-In error: ${e.message}"))
        } catch (e: Exception) {
            return@withContext Result.failure(Exception("Failed to complete Google Sign-In: ${e.message}"))
        }
    }
}
