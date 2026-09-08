package com.budgetbrain.app.data.model

import com.google.gson.annotations.SerializedName

// Generic API Envelope DataResponse<T>
data class DataResponse<T>(
    @SerializedName("data") val data: T,
    @SerializedName("meta") val meta: Map<String, Any>? = null
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

// Category Models
data class Category(
    @SerializedName("id") val id: String,
    @SerializedName("name") val name: String,
    @SerializedName("icon") val icon: String? = "Tag",
    @SerializedName("color") val color: String? = "#3E7259",
    @SerializedName("is_default") val isDefault: Boolean = false
)

data class CategoryCreate(
    @SerializedName("name") val name: String,
    @SerializedName("icon") val icon: String? = "Tag",
    @SerializedName("color") val color: String? = "#3E7259"
)

// Expense Models
data class Expense(
    @SerializedName("id") val id: String,
    @SerializedName("title") val title: String,
    @SerializedName("amount") val amount: Double,
    @SerializedName("date") val date: String,
    @SerializedName("category_id") val categoryId: String? = null,
    @SerializedName("category_name") val categoryName: String? = null,
    @SerializedName("category_icon") val categoryIcon: String? = null,
    @SerializedName("category_color") val categoryColor: String? = null,
    @SerializedName("payment_mode") val paymentMode: String = "UPI",
    @SerializedName("notes") val notes: String? = null,
    @SerializedName("is_recurring") val isRecurring: Boolean = false,
    @SerializedName("mood") val mood: String? = null
)

data class ExpenseCreate(
    @SerializedName("title") val title: String,
    @SerializedName("amount") val amount: Double,
    @SerializedName("date") val date: String,
    @SerializedName("category_id") val categoryId: String? = null,
    @SerializedName("payment_mode") val paymentMode: String = "UPI",
    @SerializedName("notes") val notes: String? = null,
    @SerializedName("is_recurring") val isRecurring: Boolean = false
)

data class ExpenseUpdate(
    @SerializedName("title") val title: String? = null,
    @SerializedName("amount") val amount: Double? = null,
    @SerializedName("date") val date: String? = null,
    @SerializedName("category_id") val categoryId: String? = null,
    @SerializedName("payment_mode") val paymentMode: String? = null,
    @SerializedName("notes") val notes: String? = null,
    @SerializedName("is_recurring") val isRecurring: Boolean? = null
)

data class ExpenseListResponse(
    @SerializedName("items") val items: List<Expense>,
    @SerializedName("total_count") val totalCount: Int,
    @SerializedName("total_amount") val totalAmount: Double
)

data class DuplicateCheckRequest(
    @SerializedName("title") val title: String,
    @SerializedName("amount") val amount: Double,
    @SerializedName("date") val date: String,
    @SerializedName("exclude_id") val excludeId: String? = null
)

data class DuplicateCandidate(
    @SerializedName("id") val id: String,
    @SerializedName("title") val title: String,
    @SerializedName("amount") val amount: Double,
    @SerializedName("date") val date: String,
    @SerializedName("category_name") val categoryName: String? = null,
    @SerializedName("match_reason") val matchReason: String? = null
)

data class DuplicateCheckResponse(
    @SerializedName("is_duplicate") val isDuplicate: Boolean,
    @SerializedName("candidate") val candidate: DuplicateCandidate? = null,
    @SerializedName("message") val message: String? = null
)

// Budget Models
data class Budget(
    @SerializedName("id") val id: String,
    @SerializedName("period_type") val periodType: String = "month",
    @SerializedName("period_start") val periodStart: String,
    @SerializedName("limit_amount") val limitAmount: Double,
    @SerializedName("daily_limit") val dailyLimit: Double? = null,
    @SerializedName("category_id") val categoryId: String? = null
)

data class BudgetCreateOrUpdate(
    @SerializedName("limit_amount") val limitAmount: Double,
    @SerializedName("daily_limit") val dailyLimit: Double? = null,
    @SerializedName("period_type") val periodType: String = "month",
    @SerializedName("period_start") val periodStart: String? = null
)

// Dashboard Summary Models
data class BudgetSummaryData(
    @SerializedName("limit_amount") val limitAmount: Double = 0.0,
    @SerializedName("spent_amount") val spentAmount: Double = 0.0,
    @SerializedName("remaining_amount") val remainingAmount: Double = 0.0,
    @SerializedName("percentage_used") val percentageUsed: Double = 0.0,
    @SerializedName("daily_limit") val dailyLimit: Double? = null,
    @SerializedName("today_spent") val todaySpent: Double = 0.0,
    @SerializedName("today_remaining") val todayRemaining: Double? = null,
    @SerializedName("is_over_budget") val isOverBudget: Boolean = false
)

data class CategoryBreakdown(
    @SerializedName("category_id") val categoryId: String? = null,
    @SerializedName("category_name") val categoryName: String,
    @SerializedName("color") val color: String? = "#3E7259",
    @SerializedName("total_spent") val totalSpent: Double,
    @SerializedName("percentage") val percentage: Double
)

data class DashboardSummary(
    @SerializedName("total_spent_month") val totalSpentMonth: Double = 0.0,
    @SerializedName("total_spent_today") val totalSpentToday: Double = 0.0,
    @SerializedName("total_expenses_count") val totalExpensesCount: Int = 0,
    @SerializedName("average_daily_spent") val averageDailySpent: Double = 0.0,
    @SerializedName("budget") val budget: BudgetSummaryData? = null,
    @SerializedName("top_categories") val topCategories: List<CategoryBreakdown> = emptyList(),
    @SerializedName("recent_expenses") val recentExpenses: List<Expense> = emptyList()
)

// AI Models
data class AiInsight(
    @SerializedName("title") val title: String,
    @SerializedName("content") val content: String,
    @SerializedName("type") val type: String = "tip", // tip, alert, velocity
    @SerializedName("action_url") val actionUrl: String? = null
)

data class AiInsightsResponse(
    @SerializedName("provider") val provider: String = "gemini",
    @SerializedName("insights") val insights: List<AiInsight> = emptyList()
)

data class SuggestCategoryRequest(
    @SerializedName("title") val title: String,
    @SerializedName("amount") val amount: Double? = null
)

data class SuggestCategoryResponse(
    @SerializedName("category_name") val categoryName: String,
    @SerializedName("category_id") val categoryId: String? = null,
    @SerializedName("confidence") val confidence: Double = 0.9,
    @SerializedName("payment_mode") val paymentMode: String? = "UPI"
)

data class SuggestBudgetResponse(
    @SerializedName("suggested_monthly_limit") val suggestedMonthlyLimit: Double,
    @SerializedName("suggested_daily_limit") val suggestedDailyLimit: Double,
    @SerializedName("savings_target_percentage") val savingsTargetPercentage: Double = 20.0,
    @SerializedName("reasoning") val reasoning: String
)

data class ChatMessage(
    @SerializedName("role") val role: String, // "user" or "assistant"
    @SerializedName("content") val content: String,
    @SerializedName("timestamp") val timestamp: Long = System.currentTimeMillis()
)

data class CitedTransaction(
    @SerializedName("title") val title: String,
    @SerializedName("amount") val amount: Double,
    @SerializedName("date") val date: String,
    @SerializedName("category") val category: String? = null
)

data class ChatRequest(
    @SerializedName("message") val message: String,
    @SerializedName("history") val history: List<ChatMessage> = emptyList()
)

data class ChatResponse(
    @SerializedName("reply") val reply: String,
    @SerializedName("cited_expenses") val citedExpenses: List<CitedTransaction> = emptyList()
)

data class ScanReceiptResponse(
    @SerializedName("title") val title: String? = null,
    @SerializedName("amount") val amount: Double? = null,
    @SerializedName("date") val date: String? = null,
    @SerializedName("category_name") val categoryName: String? = null,
    @SerializedName("payment_mode") val paymentMode: String? = "UPI",
    @SerializedName("notes") val notes: String? = null
)
