package com.budgetbrain.app

import android.os.Bundle
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.fragment.app.FragmentActivity
import androidx.navigation.compose.rememberNavController
import com.budgetbrain.app.ui.navigation.NavGraph
import com.budgetbrain.app.ui.theme.*
import com.budgetbrain.app.util.BiometricHelper

class MainActivity : FragmentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val app = application as BudgetBrainApp

        setContent {
            BudgetBrainTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = DarkBg
                ) {
                    var isBiometricLocked by remember {
                        mutableStateOf(app.sessionManager.isLoggedIn() && app.sessionManager.isBiometricEnabled() && BiometricHelper.isBiometricAvailable(this@MainActivity))
                    }

                    if (isBiometricLocked) {
                        LaunchedEffect(Unit) {
                            BiometricHelper.promptBiometric(
                                activity = this@MainActivity,
                                onSuccess = { isBiometricLocked = false },
                                onError = { /* Keep locked until verified */ }
                            )
                        }

                        Box(
                            modifier = Modifier
                                .fillMaxSize()
                                .background(DarkBg)
                                .padding(24.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Text("🔒", fontSize = 48.sp)
                                Spacer(modifier = Modifier.height(16.dp))
                                Text("BudgetBrain Locked", fontSize = 20.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                                Spacer(modifier = Modifier.height(8.dp))
                                Text("Biometric verification required", fontSize = 14.sp, color = TextSecondary)
                                Spacer(modifier = Modifier.height(24.dp))
                                Button(
                                    onClick = {
                                        BiometricHelper.promptBiometric(
                                            activity = this@MainActivity,
                                            onSuccess = { isBiometricLocked = false },
                                            onError = { /* retry */ }
                                        )
                                    },
                                    colors = ButtonDefaults.buttonColors(containerColor = EmeraldPrimary)
                                ) {
                                    Text("Unlock with Fingerprint", color = TextPrimary, fontWeight = FontWeight.Bold)
                                }
                            }
                        }
                    } else {
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
}

