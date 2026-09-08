package com.budgetbrain.app.data.model

import com.google.gson.annotations.SerializedName

// Generic API Envelope DataResponse<T> & PaginatedResponse<T>
data class DataResponse<T>(
    @SerializedName("data") val data: T,
    @SerializedName("meta") val meta: Map<String, Any>? = null,
    @SerializedName("error") val error: ApiError? = null
)

data class ApiError(
    @SerializedName("code") val code: String? = null,
    @SerializedName("message") val message: String? = null,
    @SerializedName("field") val field: String? = null
)

// Auth Models
data class User(
    @SerializedName("id") val id: String,
    @SerializedName("email") val email: String,
    @SerializedName("full_name") val fullName: String? = null,
    @SerializedName("is_verified") val isVerified: Boolean = false,
    @SerializedName("created_at") val createdAt: String? = null
)

data class TokenResponse(
    @SerializedName("access_token") val accessToken: String,
    @SerializedName("token_type") val tokenType: String = "bearer",
    @SerializedName("user") val user: User
)

data class RegisterResponse(
    @SerializedName("message") val message: String,
    @SerializedName("user") val user: User,
    @SerializedName("requires_verification") val requiresVerification: Boolean = true
)

data class MessageResponse(
    @SerializedName("message") val message: String
)

data class UserLoginRequest(
    @SerializedName("email") val email: String,
    @SerializedName("password") val password: String
)

data class UserRegisterRequest(
    @SerializedName("email") val email: String,
    @SerializedName("password") val password: String,
    @SerializedName("full_name") val fullName: String? = null
)

data class VerifyOtpRequest(
    @SerializedName("email") val email: String,
    @SerializedName("otp") val otp: String
)

data class ResendOtpRequest(
    @SerializedName("email") val email: String
)

data class GoogleLoginRequest(
    @SerializedName("id_token") val idToken: String
)

// Category Models
data class Category(
    @SerializedName("id") val id: String,
    @SerializedName("name") val name: String,
    @SerializedName("is_system") val isSystem: Boolean = false,
    @SerializedName("expense_count") val expenseCount: Int = 0
)

data class CategoryCreate(
    @SerializedName("name") val name: String
)

// Expense Models
data class Expense(
    @SerializedName("id") val id: String,
    @SerializedName("title") val title: String,
    @SerializedName("amount") val amount: Double,
    @SerializedName("date") val date: String,
    @SerializedName("category_id") val categoryId: String? = null,
    @SerializedName("category_name") val categoryName: String? = null,
    @SerializedName("payment_mode") val paymentMode: String? = "UPI",
    @SerializedName("notes") val notes: String? = null,
    @SerializedName("is_recurring") val isRecurring: Boolean = false,
    @SerializedName("mood") val mood: String? = null
)

data class ExpenseCreate(
    @SerializedName("title") val title: String,
    @SerializedName("amount") val amount: Double,
    @SerializedName("category_id") val categoryId: String,
    @SerializedName("date") val date: String,
    @SerializedName("notes") val notes: String? = null,
    @SerializedName("payment_mode") val paymentMode: String? = "UPI",
    @SerializedName("is_recurring") val isRecurring: Boolean = false
)

data class ExpenseUpdate(
    @SerializedName("title") val title: String? = null,
    @SerializedName("amount") val amount: Double? = null,
    @SerializedName("category_id") val categoryId: String? = null,
    @SerializedName("date") val date: String? = null,
    @SerializedName("notes") val notes: String? = null,
    @SerializedName("payment_mode") val paymentMode: String? = null,
    @SerializedName("is_recurring") val isRecurring: Boolean? = null
)

data class DuplicateCheckRequest(
    @SerializedName("title") val title: String,
    @SerializedName("amount") val amount: Double,
    @SerializedName("date") val date: String,
    @SerializedName("exclude_id") val excludeId: String? = null
)

data class DuplicateCheckResponse(
    @SerializedName("is_duplicate") val isDuplicate: Boolean,
    @SerializedName("match_type") val matchType: String? = null,
    @SerializedName("existing_expense") val existingExpense: Expense? = null,
    @SerializedName("days_difference") val daysDifference: Int? = null,
    @SerializedName("message") val message: String? = null
)

// Budget Models
data class Budget(
    @SerializedName("id") val id: String,
    @SerializedName("category_id") val categoryId: String? = null,
    @SerializedName("category_name") val categoryName: String? = null,
    @SerializedName("period_type") val periodType: String = "monthly",
    @SerializedName("period_start") val periodStart: String? = null,
    @SerializedName("limit_amount") val limitAmount: Double = 0.0,
    @SerializedName("daily_limit") val dailyLimit: Double? = null,
    @SerializedName("spent_amount") val spentAmount: Double = 0.0,
    @SerializedName("remaining_amount") val remainingAmount: Double = 0.0,
    @SerializedName("percentage_used") val percentageUsed: Double = 0.0,
    @SerializedName("status") val status: String = "on_track"
)

data class BudgetCreate(
    @SerializedName("category_id") val categoryId: String? = null,
    @SerializedName("period_type") val periodType: String = "monthly",
    @SerializedName("period_start") val periodStart: String? = null,
    @SerializedName("limit_amount") val limitAmount: Double,
    @SerializedName("daily_limit") val dailyLimit: Double? = null
)

data class BudgetUpdate(
    @SerializedName("limit_amount") val limitAmount: Double? = null,
    @SerializedName("daily_limit") val dailyLimit: Double? = null
)

// Dashboard Summary Models
data class BudgetSummaryData(
    @SerializedName("limit_amount") val limitAmount: Double = 0.0,
    @SerializedName("spent_amount") val spentAmount: Double = 0.0,
    @SerializedName("remaining_amount") val remainingAmount: Double = 0.0,
    @SerializedName("daily_limit") val dailyLimit: Double? = null,
    @SerializedName("status") val status: String = "no_budget"
)

data class DashboardSummary(
    @SerializedName("total_spent") val totalSpent: Double = 0.0,
    @SerializedName("today_spent") val todaySpent: Double = 0.0,
    @SerializedName("average_daily_spent") val averageDailySpent: Double = 0.0,
    @SerializedName("expense_count") val expenseCount: Int = 0,
    @SerializedName("period_start") val periodStart: String? = null,
    @SerializedName("period_end") val periodEnd: String? = null,
    @SerializedName("budget") val budget: BudgetSummaryData? = null,
    @SerializedName("recent_expenses") val recentExpenses: List<Expense> = emptyList()
)

// AI Models
data class FinancialInsight(
    @SerializedName("id") val id: String? = null,
    @SerializedName("type") val type: String = "saving_tip",
    @SerializedName("title") val title: String,
    @SerializedName("message") val message: String,
    @SerializedName("icon") val icon: String? = "lightbulb",
    @SerializedName("severity") val severity: String? = "info",
    @SerializedName("metric") val metric: String? = null
)

data class InsightsResponse(
    @SerializedName("provider") val provider: String = "gemini",
    @SerializedName("model") val model: String? = null,
    @SerializedName("insights") val insights: List<FinancialInsight> = emptyList(),
    @SerializedName("summary") val summary: String? = null
)

data class SuggestCategoryRequest(
    @SerializedName("title") val title: String,
    @SerializedName("amount") val amount: Double? = null
)

data class SuggestCategoryResponse(
    @SerializedName("suggested_category") val suggestedCategory: String,
    @SerializedName("confidence") val confidence: Double = 0.9,
    @SerializedName("suggested_payment_mode") val suggestedPaymentMode: String? = "UPI",
    @SerializedName("suggested_mood") val suggestedMood: String? = null,
    @SerializedName("reasoning") val reasoning: String? = null
)

data class SuggestBudgetResponse(
    @SerializedName("recommended_monthly_limit") val recommendedMonthlyLimit: Double,
    @SerializedName("recommended_daily_limit") val recommendedDailyLimit: Double,
    @SerializedName("estimated_savings_rate") val estimatedSavingsRate: Double = 20.0,
    @SerializedName("rationale") val rationale: String
)

data class ChatMessage(
    @SerializedName("role") val role: String, // "user", "assistant", "system"
    @SerializedName("content") val content: String
)

data class ChatRequest(
    @SerializedName("messages") val messages: List<ChatMessage>
)

data class RagSource(
    @SerializedName("expense_id") val expenseId: String,
    @SerializedName("title") val title: String,
    @SerializedName("amount") val amount: Double,
    @SerializedName("date") val date: String,
    @SerializedName("category_name") val categoryName: String? = null
)

data class ChatResponse(
    @SerializedName("reply") val reply: String,
    @SerializedName("sources") val sources: List<RagSource> = emptyList(),
    @SerializedName("provider") val provider: String? = null
)

data class ScanReceiptResponse(
    @SerializedName("title") val title: String? = null,
    @SerializedName("amount") val amount: Double? = null,
    @SerializedName("date") val date: String? = null,
    @SerializedName("category_name") val categoryName: String? = null,
    @SerializedName("payment_mode") val paymentMode: String? = "UPI",
    @SerializedName("notes") val notes: String? = null
)
