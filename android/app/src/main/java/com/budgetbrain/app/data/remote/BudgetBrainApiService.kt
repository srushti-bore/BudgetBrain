package com.budgetbrain.app.data.remote

import com.budgetbrain.app.data.model.*
import okhttp3.MultipartBody
import retrofit2.Response
import retrofit2.http.*

interface BudgetBrainApiService {

    // ---------------- AUTH ENDPOINTS ----------------
    @POST("auth/login")
    suspend fun login(
        @Body request: UserLoginRequest
    ): Response<DataResponse<TokenResponse>>

    @POST("auth/register")
    suspend fun register(
        @Body request: UserRegisterRequest
    ): Response<DataResponse<RegisterResponse>>

    @POST("auth/verify-otp")
    suspend fun verifyOtp(
        @Body request: VerifyOtpRequest
    ): Response<DataResponse<TokenResponse>>

    @POST("auth/resend-otp")
    suspend fun resendOtp(
        @Body request: ResendOtpRequest
    ): Response<DataResponse<MessageResponse>>

    @GET("auth/me")
    suspend fun getCurrentUser(): Response<DataResponse<User>>

    // ---------------- DASHBOARD ENDPOINTS ----------------
    @GET("dashboard/summary")
    suspend fun getDashboardSummary(): Response<DataResponse<DashboardSummary>>

    // ---------------- EXPENSES ENDPOINTS ----------------
    @GET("expenses")
    suspend fun listExpenses(
        @Query("page") page: Int = 1,
        @Query("page_size") pageSize: Int = 50,
        @Query("category_id") categoryId: String? = null,
        @Query("search") search: String? = null,
        @Query("sort_by") sortBy: String = "date",
        @Query("sort_order") sortOrder: String = "desc"
    ): Response<DataResponse<ExpenseListResponse>>

    @POST("expenses")
    suspend fun createExpense(
        @Body request: ExpenseCreate
    ): Response<DataResponse<Expense>>

    @PATCH("expenses/{id}")
    suspend fun updateExpense(
        @Path("id") id: String,
        @Body request: ExpenseUpdate
    ): Response<DataResponse<Expense>>

    @DELETE("expenses/{id}")
    suspend fun deleteExpense(
        @Path("id") id: String
    ): Response<DataResponse<MessageResponse>>

    @POST("expenses/check-duplicate")
    suspend fun checkDuplicate(
        @Body request: DuplicateCheckRequest
    ): Response<DataResponse<DuplicateCheckResponse>>

    // ---------------- BUDGETS ENDPOINTS ----------------
    @GET("budgets/active")
    suspend fun getActiveBudget(): Response<DataResponse<Budget?>>

    @POST("budgets/overall")
    suspend fun setOverallBudget(
        @Body request: BudgetCreateOrUpdate
    ): Response<DataResponse<Budget>>

    // ---------------- CATEGORIES ENDPOINTS ----------------
    @GET("categories")
    suspend fun listCategories(): Response<DataResponse<List<Category>>>

    @POST("categories")
    suspend fun createCategory(
        @Body request: CategoryCreate
    ): Response<DataResponse<Category>>

    // ---------------- AI ENDPOINTS ----------------
    @GET("ai/insights")
    suspend fun getAiInsights(): Response<DataResponse<AiInsightsResponse>>

    @POST("ai/suggest-category")
    suspend fun suggestCategory(
        @Body request: SuggestCategoryRequest
    ): Response<DataResponse<SuggestCategoryResponse>>

    @GET("ai/suggest-budget")
    suspend fun suggestBudget(): Response<DataResponse<SuggestBudgetResponse>>

    @POST("ai/chat")
    suspend fun chatWithBudgetBrain(
        @Body request: ChatRequest
    ): Response<DataResponse<ChatResponse>>

    @Multipart
    @POST("ai/scan-receipt")
    suspend fun scanReceipt(
        @Part file: MultipartBody.Part
    ): Response<DataResponse<ScanReceiptResponse>>
}
