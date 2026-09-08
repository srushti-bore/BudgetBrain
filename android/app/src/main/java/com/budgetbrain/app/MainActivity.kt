package com.budgetbrain.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Surface
import androidx.compose.ui.Modifier
import androidx.navigation.compose.rememberNavController
import com.budgetbrain.app.ui.navigation.NavGraph
import com.budgetbrain.app.ui.theme.BudgetBrainTheme
import com.budgetbrain.app.ui.theme.DarkBg

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val app = application as BudgetBrainApp

        setContent {
            BudgetBrainTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = DarkBg
                ) {
                    val navController = rememberNavController()
                    NavGraph(
                        navController = navController,
                        authRepository = app.authRepository,
                        dashboardRepository = app.dashboardRepository,
                        expenseRepository = app.expenseRepository,
                        budgetRepository = app.budgetRepository,
                        categoryRepository = app.categoryRepository,
                        aiRepository = app.aiRepository
                    )
                }
            }
        }
    }
}
