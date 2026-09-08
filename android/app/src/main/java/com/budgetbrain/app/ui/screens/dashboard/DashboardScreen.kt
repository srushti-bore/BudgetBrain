package com.budgetbrain.app.ui.screens.dashboard

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.budgetbrain.app.data.model.FinancialInsight
import com.budgetbrain.app.data.model.DashboardSummary
import com.budgetbrain.app.repository.AiRepository
import com.budgetbrain.app.repository.AuthRepository
import com.budgetbrain.app.repository.DashboardRepository
import com.budgetbrain.app.ui.components.BrainyMoodWidget
import com.budgetbrain.app.ui.components.BudgetBrainTopBar
import com.budgetbrain.app.ui.components.BudgetRingCompose
import com.budgetbrain.app.ui.components.StatCard
import com.budgetbrain.app.ui.theme.*
import kotlinx.coroutines.launch
import java.util.Calendar

@Composable
fun DashboardScreen(
    dashboardRepository: DashboardRepository,
    aiRepository: AiRepository,
    authRepository: AuthRepository,
    onNavigateToExpenses: () -> Unit,
    onNavigateToBudgets: () -> Unit,
    onNavigateToChat: () -> Unit,
    onLogout: () -> Unit
) {
    var summary by remember { mutableStateOf<DashboardSummary?>(null) }
    var aiInsights by remember { mutableStateOf<List<FinancialInsight>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }
    val scope = rememberCoroutineScope()

    val refreshData = {
        isLoading = true
        scope.launch {
            val summaryRes = dashboardRepository.getSummary()
            summaryRes.onSuccess { summary = it }

            val aiRes = aiRepository.getInsights()
            aiRes.onSuccess { aiInsights = it }

            isLoading = false
        }
    }

    LaunchedEffect(Unit) {
        refreshData()
    }

    Scaffold(
        topBar = {
            BudgetBrainTopBar(
                title = "Financial Overview",
                onSyncClick = { refreshData() },
                onLogoutClick = {
                    authRepository.logout()
                    onLogout()
                }
            )
        },
        containerColor = DarkBg
    ) { paddingValues ->
        if (isLoading && summary == null) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues),
                contentAlignment = Alignment.Center
            ) {
                CircularProgressIndicator(color = EmeraldPrimary)
            }
        } else {
            val budgetData = summary?.budget
            val limit = budgetData?.limitAmount ?: 0.0
            val spent = budgetData?.spentAmount ?: summary?.totalSpent ?: 0.0
            val remaining = if (limit > 0) (limit - spent) else 0.0
            val percentage = if (limit > 0) (spent / limit) * 100.0 else 0.0

            val cal = Calendar.getInstance()
            val totalDays = cal.getActualMaximum(Calendar.DAY_OF_MONTH)
            val currentDay = cal.get(Calendar.DAY_OF_MONTH)
            val remainingDays = (totalDays - currentDay + 1).coerceAtLeast(1)
            val safeDailySpend = if (remaining > 0) remaining / remainingDays else 0.0

            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues)
                    .padding(horizontal = 16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp),
                contentPadding = PaddingValues(vertical = 16.dp)
            ) {
                // 1. Budget Ring & Core Status Card
                item {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(20.dp),
                        colors = CardDefaults.cardColors(containerColor = CardSurface),
                        border = CardDefaults.outlinedCardBorder().copy(brush = androidx.compose.ui.graphics.SolidColor(CardBorder))
                    ) {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(20.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Text(
                                text = "Monthly Budget Ceiling",
                                fontSize = 14.sp,
                                fontWeight = FontWeight.SemiBold,
                                color = TextSecondary
                            )
                            Spacer(modifier = Modifier.height(16.dp))

                            BudgetRingCompose(
                                percentage = percentage,
                                spentAmount = spent,
                                limitAmount = limit,
                                remainingAmount = remaining
                            )

                            Spacer(modifier = Modifier.height(16.dp))

                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceEvenly
                            ) {
                                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                    Text("Limit", fontSize = 11.sp, color = TextMuted)
                                    Text("₹${String.format("%,.0f", limit)}", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                                }
                                Divider(modifier = Modifier.height(24.dp).width(1.dp), color = CardBorder)
                                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                    Text("Spent", fontSize = 11.sp, color = TextMuted)
                                    Text("₹${String.format("%,.0f", spent)}", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = EmeraldLight)
                                }
                                Divider(modifier = Modifier.height(24.dp).width(1.dp), color = CardBorder)
                                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                    Text("Balance", fontSize = 11.sp, color = TextMuted)
                                    Text(
                                        if (remaining < 0) "-₹${String.format("%,.0f", -remaining)}" else "₹${String.format("%,.0f", remaining)}",
                                        fontSize = 14.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = if (remaining < 0) CoralAlert else TextPrimary
                                    )
                                }
                            }
                        }
                    }
                }

                // 2. Feature 15: Brainy Mood Widget
                item {
                    BrainyMoodWidget(
                        percentage = percentage,
                        remainingDays = remainingDays,
                        safeDailySpend = safeDailySpend
                    )
                }

                // 3. Daily Budget Spending Card
                item {
                    val dailyLimit = budgetData?.dailyLimit
                    val todaySpent = summary?.todaySpent ?: 0.0

                    if (dailyLimit != null && dailyLimit > 0) {
                        val dailyRatio = todaySpent / dailyLimit
                        val dailyStatus = when {
                            todaySpent > dailyLimit -> "Over Daily Limit 🔥"
                            dailyRatio >= 0.85 -> "Near Daily Limit ⚠️"
                            else -> "On Track ✓"
                        }
                        val statusColor = when {
                            todaySpent > dailyLimit -> CoralAlert
                            dailyRatio >= 0.85 -> GoldAccent
                            else -> EmeraldPrimary
                        }

                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(16.dp),
                            colors = CardDefaults.cardColors(containerColor = CardSurface),
                            border = CardDefaults.outlinedCardBorder().copy(brush = androidx.compose.ui.graphics.SolidColor(statusColor.copy(alpha = 0.5f)))
                        ) {
                            Column(modifier = Modifier.padding(16.dp)) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Text("Today's Spend", fontSize = 13.sp, color = TextSecondary)
                                    Text(
                                        dailyStatus,
                                        fontSize = 12.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = statusColor
                                    )
                                }
                                Spacer(modifier = Modifier.height(6.dp))
                                Text(
                                    "₹${String.format("%,.0f", todaySpent)} of ₹${String.format("%,.0f", dailyLimit)}",
                                    fontSize = 17.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = TextPrimary
                                )
                                Spacer(modifier = Modifier.height(8.dp))
                                LinearProgressIndicator(
                                    progress = (dailyRatio.coerceIn(0.0, 1.0)).toFloat(),
                                    color = statusColor,
                                    trackColor = CardBorder,
                                    modifier = Modifier.fillMaxWidth().height(6.dp).clip(RoundedCornerShape(3.dp))
                                )
                            }
                        }
                    }
                }

                // 4. Bento Stat Cards Grid
                item {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        StatCard(
                            title = "Daily Average",
                            value = "₹${String.format("%,.0f", summary?.averageDailySpent ?: 0.0)}",
                            subtitle = "This month",
                            icon = Icons.Default.TrendingUp,
                            accentColor = EmeraldPrimary,
                            modifier = Modifier.weight(1f)
                        )
                        StatCard(
                            title = "Transactions",
                            value = "${summary?.expenseCount ?: 0}",
                            subtitle = "Total logged",
                            icon = Icons.Default.ReceiptLong,
                            accentColor = GoldAccent,
                            modifier = Modifier.weight(1f)
                        )
                    }
                }

                // 5. AI Insights Cards
                if (aiInsights.isNotEmpty()) {
                    item {
                        Text(
                            text = "✨ Smart AI Insights",
                            fontSize = 16.sp,
                            fontWeight = FontWeight.Bold,
                            color = TextPrimary
                        )
                    }

                    items(aiInsights) { insight ->
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(14.dp),
                            colors = CardDefaults.cardColors(containerColor = CardSurface),
                            border = CardDefaults.outlinedCardBorder().copy(brush = androidx.compose.ui.graphics.SolidColor(EmeraldPrimary.copy(alpha = 0.3f)))
                        ) {
                            Column(modifier = Modifier.padding(14.dp)) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Box(
                                        modifier = Modifier
                                            .size(24.dp)
                                            .clip(CircleShape)
                                            .background(EmeraldGlow),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Text("💡", fontSize = 12.sp)
                                    }
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Text(
                                        text = insight.title,
                                        fontSize = 14.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = TextPrimary
                                    )
                                }
                                Spacer(modifier = Modifier.height(6.dp))
                                Text(
                                    text = insight.message,
                                    fontSize = 13.sp,
                                    color = TextSecondary
                                )
                            }
                        }
                    }
                }

                // 6. Quick Action AI Chat Trigger
                item {
                    Button(
                        onClick = onNavigateToChat,
                        colors = ButtonDefaults.buttonColors(containerColor = EmeraldPrimary),
                        shape = RoundedCornerShape(14.dp),
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(52.dp)
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.AutoAwesome, contentDescription = null, tint = TextPrimary)
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("Ask BudgetBrain AI Assistant", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                        }
                    }
                }
            }
        }
    }
}
