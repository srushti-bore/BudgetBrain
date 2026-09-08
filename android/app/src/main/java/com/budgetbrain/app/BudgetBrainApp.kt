package com.budgetbrain.app

import android.app.Application
import com.budgetbrain.app.data.local.SessionManager
import com.budgetbrain.app.data.remote.RetrofitClient
import com.budgetbrain.app.repository.*

class BudgetBrainApp : Application() {

    lateinit var sessionManager: SessionManager
    lateinit var authRepository: AuthRepository
    lateinit var dashboardRepository: DashboardRepository
    lateinit var expenseRepository: ExpenseRepository
    lateinit var budgetRepository: BudgetRepository
    lateinit var categoryRepository: CategoryRepository
    lateinit var aiRepository: AiRepository

    override fun onCreate() {
        super.onCreate()

        sessionManager = SessionManager(this)
        val apiService = RetrofitClient.getApiService(this)

        authRepository = AuthRepository(apiService, sessionManager)
        dashboardRepository = DashboardRepository(apiService)
        expenseRepository = ExpenseRepository(apiService)
        budgetRepository = BudgetRepository(apiService)
        categoryRepository = CategoryRepository(apiService)
        aiRepository = AiRepository(apiService)
    }
}
