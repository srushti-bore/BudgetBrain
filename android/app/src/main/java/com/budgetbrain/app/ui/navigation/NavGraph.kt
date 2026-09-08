package com.budgetbrain.app.ui.navigation

import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Scaffold
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.*
import androidx.navigation.navArgument
import com.budgetbrain.app.repository.*
import com.budgetbrain.app.ui.components.BudgetBrainBottomNav
import com.budgetbrain.app.ui.screens.auth.*
import com.budgetbrain.app.ui.screens.budgets.BudgetsScreen
import com.budgetbrain.app.ui.screens.chat.AskBudgetBrainChatScreen
import com.budgetbrain.app.ui.screens.dashboard.DashboardScreen
import com.budgetbrain.app.ui.screens.expenses.ExpensesScreen
import com.budgetbrain.app.ui.theme.DarkBg

@Composable
fun NavGraph(
    navController: NavHostController,
    authRepository: AuthRepository,
    dashboardRepository: DashboardRepository,
    expenseRepository: ExpenseRepository,
    budgetRepository: BudgetRepository,
    categoryRepository: CategoryRepository,
    aiRepository: AiRepository
) {
    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = navBackStackEntry?.destination?.route ?: Screen.Login.route

    val showBottomNav = currentRoute in listOf(
        Screen.Dashboard.route,
        Screen.Expenses.route,
        Screen.Budgets.route,
        Screen.AiChat.route
    )

    Scaffold(
        bottomBar = {
            if (showBottomNav) {
                BudgetBrainBottomNav(
                    currentRoute = currentRoute,
                    onNavigate = { route ->
                        navController.navigate(route) {
                            popUpTo(Screen.Dashboard.route) { saveState = true }
                            launchSingleTop = true
                            restoreState = true
                        }
                    }
                )
            }
        },
        containerColor = DarkBg
    ) { paddingValues ->
        NavHost(
            navController = navController,
            startDestination = if (authRepository.isLoggedIn()) Screen.Dashboard.route else Screen.Login.route,
            modifier = Modifier.padding(paddingValues)
        ) {
            // Auth: Login
            composable(Screen.Login.route) {
                LoginScreen(
                    authRepository = authRepository,
                    onLoginSuccess = {
                        navController.navigate(Screen.Dashboard.route) {
                            popUpTo(Screen.Login.route) { inclusive = true }
                        }
                    },
                    onNavigateToRegister = {
                        navController.navigate(Screen.Register.route)
                    }
                )
            }

            // Auth: Register
            composable(Screen.Register.route) {
                RegisterScreen(
                    authRepository = authRepository,
                    onRegisterSuccess = { email ->
                        navController.navigate(Screen.OtpVerification.createRoute(email))
                    },
                    onNavigateToLogin = {
                        navController.popBackStack()
                    }
                )
            }

            // Auth: OTP Verification
            composable(
                route = Screen.OtpVerification.route,
                arguments = listOf(navArgument("email") { type = NavType.StringType })
            ) { backStackEntry ->
                val email = backStackEntry.arguments?.getString("email") ?: ""
                OtpVerificationScreen(
                    email = email,
                    authRepository = authRepository,
                    onVerificationSuccess = {
                        navController.navigate(Screen.Dashboard.route) {
                            popUpTo(Screen.Login.route) { inclusive = true }
                        }
                    }
                )
            }

            // Main: Dashboard
            composable(Screen.Dashboard.route) {
                DashboardScreen(
                    dashboardRepository = dashboardRepository,
                    aiRepository = aiRepository,
                    authRepository = authRepository,
                    onNavigateToExpenses = { navController.navigate(Screen.Expenses.route) },
                    onNavigateToBudgets = { navController.navigate(Screen.Budgets.route) },
                    onNavigateToChat = { navController.navigate(Screen.AiChat.route) },
                    onLogout = {
                        navController.navigate(Screen.Login.route) {
                            popUpTo(0) { inclusive = true }
                        }
                    }
                )
            }

            // Main: Expenses
            composable(Screen.Expenses.route) {
                ExpensesScreen(
                    expenseRepository = expenseRepository,
                    categoryRepository = categoryRepository,
                    aiRepository = aiRepository
                )
            }

            // Main: Budgets
            composable(Screen.Budgets.route) {
                BudgetsScreen(
                    budgetRepository = budgetRepository,
                    aiRepository = aiRepository
                )
            }

            // Main: AI Chat
            composable(Screen.AiChat.route) {
                AskBudgetBrainChatScreen(
                    aiRepository = aiRepository
                )
            }
        }
    }
}
