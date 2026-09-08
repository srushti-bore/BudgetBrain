package com.budgetbrain.app.repository

import com.budgetbrain.app.data.local.SessionManager
import com.budgetbrain.app.data.model.*
import com.budgetbrain.app.data.remote.BudgetBrainApiService
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.asRequestBody
import java.io.File

class AuthRepository(
    private val apiService: BudgetBrainApiService,
    private val sessionManager: SessionManager
) {
    suspend fun login(email: String, pass: String): Result<TokenResponse> {
        return try {
            val response = apiService.login(UserLoginRequest(email, pass))
            if (response.isSuccessful && response.body() != null) {
                val tokenData = response.body()!!.data
                sessionManager.saveToken(tokenData.accessToken)
                sessionManager.saveUser(tokenData.user)
                Result.success(tokenData)
            } else {
                val errMsg = response.errorBody()?.string() ?: "Login failed (${response.code()})"
                Result.failure(Exception(errMsg))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun googleLogin(idToken: String): Result<TokenResponse> {
        return try {
            val response = apiService.googleLogin(GoogleLoginRequest(idToken))
            if (response.isSuccessful && response.body() != null) {
                val tokenData = response.body()!!.data
                sessionManager.saveToken(tokenData.accessToken)
                sessionManager.saveUser(tokenData.user)
                Result.success(tokenData)
            } else {
                val errMsg = response.errorBody()?.string() ?: "Google Sign-In failed"
                Result.failure(Exception(errMsg))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun register(email: String, pass: String, fullName: String?): Result<RegisterResponse> {
        return try {
            val response = apiService.register(UserRegisterRequest(email, pass, fullName))
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!.data)
            } else {
                val errMsg = response.errorBody()?.string() ?: "Registration failed (${response.code()})"
                Result.failure(Exception(errMsg))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun verifyOtp(email: String, otp: String): Result<TokenResponse> {
        return try {
            val response = apiService.verifyOtp(VerifyOtpRequest(email, otp))
            if (response.isSuccessful && response.body() != null) {
                val tokenData = response.body()!!.data
                sessionManager.saveToken(tokenData.accessToken)
                sessionManager.saveUser(tokenData.user)
                Result.success(tokenData)
            } else {
                val errMsg = response.errorBody()?.string() ?: "Invalid or expired OTP"
                Result.failure(Exception(errMsg))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun resendOtp(email: String): Result<String> {
        return try {
            val response = apiService.resendOtp(ResendOtpRequest(email))
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!.data.message)
            } else {
                Result.failure(Exception("Failed to resend OTP"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    fun logout() {
        sessionManager.clearSession()
    }

    fun isLoggedIn(): Boolean = sessionManager.isLoggedIn()
    fun getCurrentUser(): User? = sessionManager.getUser()
}

class DashboardRepository(private val apiService: BudgetBrainApiService) {
    suspend fun getSummary(): Result<DashboardSummary> {
        return try {
            val response = apiService.getDashboardSummary()
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!.data)
            } else {
                Result.failure(Exception("Failed to load dashboard data"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}

class ExpenseRepository(private val apiService: BudgetBrainApiService) {
    suspend fun listExpenses(
        page: Int = 1,
        categoryId: String? = null,
        search: String? = null
    ): Result<List<Expense>> {
        return try {
            val response = apiService.listExpenses(page = page, categoryId = categoryId, search = search)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!.data)
            } else {
                Result.failure(Exception("Failed to load expenses"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun createExpense(expense: ExpenseCreate): Result<Expense> {
        return try {
            val response = apiService.createExpense(expense)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!.data)
            } else {
                val errMsg = response.errorBody()?.string() ?: "Failed to log expense"
                Result.failure(Exception(errMsg))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun deleteExpense(id: String): Result<Boolean> {
        return try {
            val response = apiService.deleteExpense(id)
            if (response.isSuccessful) {
                Result.success(true)
            } else {
                Result.failure(Exception("Failed to delete expense"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun checkDuplicate(req: DuplicateCheckRequest): Result<DuplicateCheckResponse> {
        return try {
            val response = apiService.checkDuplicate(req)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!.data)
            } else {
                Result.success(DuplicateCheckResponse(isDuplicate = false))
            }
        } catch (e: Exception) {
            Result.success(DuplicateCheckResponse(isDuplicate = false))
        }
    }
}

class BudgetRepository(private val apiService: BudgetBrainApiService) {
    suspend fun getActiveBudget(): Result<Budget?> {
        return try {
            val response = apiService.listBudgets()
            if (response.isSuccessful && response.body() != null) {
                val overall = response.body()!!.data.find { it.categoryId == null }
                Result.success(overall)
            } else {
                Result.success(null)
            }
        } catch (e: Exception) {
            Result.success(null)
        }
    }

    suspend fun saveBudget(limit: Double, dailyLimit: Double?): Result<Budget> {
        return try {
            val activeRes = getActiveBudget()
            val existing = activeRes.getOrNull()

            if (existing != null) {
                val patchRes = apiService.updateBudget(existing.id, BudgetUpdate(limit, dailyLimit))
                if (patchRes.isSuccessful && patchRes.body() != null) {
                    Result.success(patchRes.body()!!.data)
                } else {
                    Result.failure(Exception("Failed to update budget limit"))
                }
            } else {
                val createRes = apiService.createBudget(BudgetCreate(limitAmount = limit, dailyLimit = dailyLimit))
                if (createRes.isSuccessful && createRes.body() != null) {
                    Result.success(createRes.body()!!.data)
                } else {
                    Result.failure(Exception("Failed to create budget goal"))
                }
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}

class CategoryRepository(private val apiService: BudgetBrainApiService) {
    suspend fun listCategories(): Result<List<Category>> {
        return try {
            val response = apiService.listCategories()
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!.data)
            } else {
                Result.failure(Exception("Failed to load categories"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}

class AiRepository(private val apiService: BudgetBrainApiService) {
    suspend fun getInsights(): Result<List<FinancialInsight>> {
        return try {
            val response = apiService.getAiInsights()
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!.data.insights)
            } else {
                Result.failure(Exception("Failed to load AI insights"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun suggestCategory(title: String, amount: Double?): Result<SuggestCategoryResponse> {
        return try {
            val response = apiService.suggestCategory(SuggestCategoryRequest(title, amount))
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!.data)
            } else {
                Result.failure(Exception("Category suggestion failed"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun suggestBudget(): Result<SuggestBudgetResponse> {
        return try {
            val response = apiService.suggestBudget()
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!.data)
            } else {
                Result.failure(Exception("Budget recommendation failed"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun chat(message: String, history: List<ChatMessage>): Result<ChatResponse> {
        return try {
            val allMessages = history + ChatMessage(role = "user", content = message)
            val response = apiService.chatWithBudgetBrain(ChatRequest(allMessages))
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!.data)
            } else {
                Result.failure(Exception("Chat request failed"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun scanReceipt(file: File): Result<ScanReceiptResponse> {
        return try {
            val requestFile = file.asRequestBody("image/*".toMediaTypeOrNull())
            val body = MultipartBody.Part.createFormData("file", file.name, requestFile)
            val response = apiService.scanReceipt(body)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!.data)
            } else {
                Result.failure(Exception("Receipt scan failed"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
