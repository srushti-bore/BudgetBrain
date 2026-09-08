package com.budgetbrain.app.ui.navigation

sealed class Screen(val route: String) {
    object Splash : Screen("splash")
    object Login : Screen("login")
    object Register : Screen("register")
    object OtpVerification : Screen("otp_verification/{email}") {
        fun createRoute(email: String) = "otp_verification/$email"
    }
    object Dashboard : Screen("dashboard")
    object Expenses : Screen("expenses")
    object Budgets : Screen("budgets")
    object AiChat : Screen("ai_chat")
}

sealed class BottomNavItem(val route: String, val title: String, val iconName: String) {
    object Dashboard : BottomNavItem("dashboard", "Overview", "Dashboard")
    object Expenses : BottomNavItem("expenses", "Expenses", "Receipt")
    object Budgets : BottomNavItem("budgets", "Budgets", "Sliders")
    object AiChat : BottomNavItem("ai_chat", "Ask AI", "Sparkles")
}
