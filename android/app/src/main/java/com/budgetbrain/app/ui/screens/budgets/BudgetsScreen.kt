package com.budgetbrain.app.ui.screens.budgets

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.Save
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.budgetbrain.app.data.model.SuggestBudgetResponse
import com.budgetbrain.app.repository.AiRepository
import com.budgetbrain.app.repository.BudgetRepository
import com.budgetbrain.app.ui.components.BudgetBrainTopBar
import com.budgetbrain.app.ui.theme.*
import kotlinx.coroutines.launch

@Composable
fun BudgetsScreen(
    budgetRepository: BudgetRepository,
    aiRepository: AiRepository
) {
    var monthlyLimitText by remember { mutableStateOf("") }
    var dailyLimitText by remember { mutableStateOf("") }
    var aiRecommendation by remember { mutableStateOf<SuggestBudgetResponse?>(null) }
    var isLoading by remember { mutableStateOf(true) }
    var isSaving by remember { mutableStateOf(false) }
    var successMsg by remember { mutableStateOf<String?>(null) }
    var errorMsg by remember { mutableStateOf<String?>(null) }

    val scope = rememberCoroutineScope()

    val loadData = {
        isLoading = true
        scope.launch {
            budgetRepository.getActiveBudget().onSuccess { budget ->
                if (budget != null) {
                    monthlyLimitText = budget.limitAmount.toInt().toString()
                    dailyLimitText = budget.dailyLimit?.toInt()?.toString() ?: ""
                }
            }
            aiRepository.suggestBudget().onSuccess { rec ->
                aiRecommendation = rec
            }
            isLoading = false
        }
    }

    LaunchedEffect(Unit) {
        loadData()
    }

    Scaffold(
        topBar = {
            BudgetBrainTopBar(
                title = "Budget Settings",
                onSyncClick = { loadData() }
            )
        },
        containerColor = DarkBg
    ) { paddingValues ->
        if (isLoading) {
            Box(modifier = Modifier.fillMaxSize().padding(paddingValues), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = EmeraldPrimary)
            }
        } else {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues)
                    .padding(16.dp)
                    .verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                // Feedback Alerts
                if (successMsg != null) {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = EmeraldGlow),
                        border = CardDefaults.outlinedCardBorder().copy(brush = androidx.compose.ui.graphics.SolidColor(EmeraldPrimary))
                    ) {
                        Text(text = "✓ $successMsg", color = EmeraldLight, modifier = Modifier.padding(12.dp), fontWeight = FontWeight.Bold)
                    }
                }

                if (errorMsg != null) {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = CoralGlow),
                        border = CardDefaults.outlinedCardBorder().copy(brush = androidx.compose.ui.graphics.SolidColor(CoralAlert))
                    ) {
                        Text(text = "⚠️ $errorMsg", color = CoralAlert, modifier = Modifier.padding(12.dp))
                    }
                }

                // AI Recommendation Card (1-Click Adopt)
                if (aiRecommendation != null) {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(16.dp),
                        colors = CardDefaults.cardColors(containerColor = CardSurface),
                        border = CardDefaults.outlinedCardBorder().copy(brush = androidx.compose.ui.graphics.SolidColor(EmeraldPrimary.copy(alpha = 0.5f)))
                    ) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Box(
                                    modifier = Modifier
                                        .size(28.dp)
                                        .clip(RoundedCornerShape(8.dp))
                                        .background(EmeraldGlow),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Icon(Icons.Default.AutoAwesome, contentDescription = null, tint = EmeraldLight, modifier = Modifier.size(16.dp))
                                }
                                Spacer(modifier = Modifier.width(10.dp))
                                Text("AI Adaptive Recommendation", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                            }
                            Spacer(modifier = Modifier.height(10.dp))
                            Text(
                                text = "Suggested Monthly Cap: ₹${String.format("%,.0f", aiRecommendation!!.suggestedMonthlyLimit)} (₹${String.format("%,.0f", aiRecommendation!!.suggestedDailyLimit)}/day)",
                                fontSize = 13.sp,
                                fontWeight = FontWeight.SemiBold,
                                color = EmeraldLight
                            )
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                text = aiRecommendation!!.reasoning,
                                fontSize = 12.sp,
                                color = TextSecondary
                            )
                            Spacer(modifier = Modifier.height(12.dp))
                            Button(
                                onClick = {
                                    monthlyLimitText = aiRecommendation!!.suggestedMonthlyLimit.toInt().toString()
                                    dailyLimitText = aiRecommendation!!.suggestedDailyLimit.toInt().toString()
                                    successMsg = "Applied AI suggestions! Tap 'Save Budget' below."
                                },
                                colors = ButtonDefaults.buttonColors(containerColor = EmeraldPrimary.copy(alpha = 0.2f)),
                                shape = RoundedCornerShape(10.dp),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Text("✨ 1-Click Adopt Recommendation", color = EmeraldLight, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                            }
                        }
                    }
                }

                // Master Monthly Budget Setter Card
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = CardSurface),
                    border = CardDefaults.outlinedCardBorder().copy(brush = androidx.compose.ui.graphics.SolidColor(CardBorder))
                ) {
                    Column(modifier = Modifier.padding(18.dp)) {
                        Text("Monthly Overall Budget", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                        Text("Set your total spending limit for the active calendar month.", fontSize = 12.sp, color = TextSecondary)
                        Spacer(modifier = Modifier.height(14.dp))

                        OutlinedTextField(
                            value = monthlyLimitText,
                            onValueChange = { monthlyLimitText = it; successMsg = null },
                            label = { Text("Monthly Limit (₹)") },
                            leadingIcon = { Text("₹", color = EmeraldLight, fontWeight = FontWeight.Bold) },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                            singleLine = true,
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedBorderColor = EmeraldPrimary,
                                unfocusedBorderColor = CardBorder,
                                focusedTextColor = TextPrimary,
                                unfocusedTextColor = TextPrimary
                            ),
                            modifier = Modifier.fillMaxWidth()
                        )
                    }
                }

                // Daily Spending Cap Card
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = CardSurface),
                    border = CardDefaults.outlinedCardBorder().copy(brush = androidx.compose.ui.graphics.SolidColor(CardBorder))
                ) {
                    Column(modifier = Modifier.padding(18.dp)) {
                        Text("Custom Daily Budget Limit", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                        Text("Receive dashboard warnings whenever single-day spend approaches this cap.", fontSize = 12.sp, color = TextSecondary)
                        Spacer(modifier = Modifier.height(14.dp))

                        OutlinedTextField(
                            value = dailyLimitText,
                            onValueChange = { dailyLimitText = it; successMsg = null },
                            label = { Text("Daily Spending Cap (₹) - Optional") },
                            leadingIcon = { Text("₹", color = EmeraldLight, fontWeight = FontWeight.Bold) },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                            singleLine = true,
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedBorderColor = EmeraldPrimary,
                                unfocusedBorderColor = CardBorder,
                                focusedTextColor = TextPrimary,
                                unfocusedTextColor = TextPrimary
                            ),
                            modifier = Modifier.fillMaxWidth()
                        )
                    }
                }

                // Save Action Button
                Button(
                    onClick = {
                        val monthlyAmt = monthlyLimitText.toDoubleOrNull()
                        val dailyAmt = dailyLimitText.toDoubleOrNull()
                        if (monthlyAmt == null || monthlyAmt <= 0) {
                            errorMsg = "Please enter a valid monthly limit"
                            return@Button
                        }
                        isSaving = true
                        errorMsg = null
                        successMsg = null
                        scope.launch {
                            val res = budgetRepository.saveBudget(monthlyAmt, dailyAmt)
                            isSaving = false
                            res.fold(
                                onSuccess = { successMsg = "Budget limits saved successfully!" },
                                onFailure = { errorMsg = it.message ?: "Failed to save budget" }
                            )
                        }
                    },
                    enabled = !isSaving,
                    colors = ButtonDefaults.buttonColors(containerColor = EmeraldPrimary),
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(50.dp)
                ) {
                    if (isSaving) {
                        CircularProgressIndicator(color = TextPrimary, modifier = Modifier.size(24.dp))
                    } else {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.Save, contentDescription = null, tint = TextPrimary)
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("Save Budget Limits", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                        }
                    }
                }
            }
        }
    }
}
