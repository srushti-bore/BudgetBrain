package com.budgetbrain.app.ui.components

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.budgetbrain.app.ui.theme.*

enum class BrainyMood(
    val emoji: String,
    val title: String,
    val defaultQuote: String,
    val primaryColor: Color,
    val glowColor: Color
) {
    THRIVING(
        emoji = "🥳",
        title = "Thriving",
        defaultQuote = "Super disciplined! You're cruising comfortably under budget!",
        primaryColor = EmeraldPrimary,
        glowColor = EmeraldGlow
    ),
    ZEN(
        emoji = "🧘",
        title = "Zen",
        defaultQuote = "Balanced spending flow. Steady pacing keeps you safe.",
        primaryColor = TealZen,
        glowColor = Color(0x33319795)
    ),
    CAUTIOUS(
        emoji = "⚡",
        title = "Cautious",
        defaultQuote = "Near limits! Moderate discretionary splurges this week.",
        primaryColor = GoldAccent,
        glowColor = GoldGlow
    ),
    DISTRESSED(
        emoji = "😱",
        title = "Distressed",
        defaultQuote = "Budget deficit detected! Consider a spending freeze.",
        primaryColor = CoralAlert,
        glowColor = CoralGlow
    );

    companion object {
        fun fromPercentage(percentage: Double): BrainyMood {
            return when {
                percentage >= 100.0 -> DISTRESSED
                percentage >= 80.0 -> CAUTIOUS
                percentage >= 60.0 -> ZEN
                else -> THRIVING
            }
        }
    }
}

@Composable
fun BrainyMoodWidget(
    percentage: Double,
    remainingDays: Int,
    safeDailySpend: Double,
    currencySymbol: String = "₹",
    modifier: Modifier = Modifier
) {
    val mood = BrainyMood.fromPercentage(percentage)
    var quoteIndex by remember { mutableStateOf(0) }

    val extraQuotes = remember(mood) {
        when (mood) {
            BrainyMood.THRIVING -> listOf(
                "Savings target is safe! Keep this momentum going! 🚀",
                "Your wallet is smiling today! High discipline score. 🌟",
                "Plenty of cushion left for unexpected expenses! 🛡️"
            )
            BrainyMood.ZEN -> listOf(
                "Mindful daily pacing is your best superpower. 🧘",
                "Smooth financial rhythm this month. Keep it up! 📊",
                "Safe daily spend is looking solid! 💡"
            )
            BrainyMood.CAUTIOUS -> listOf(
                "Check before dining out tonight — pace your spends! ⚡",
                "80%+ of budget consumed. Watch non-essential purchases. 🛑",
                "Daily burn rate is accelerating slightly. 🔔"
            )
            BrainyMood.DISTRESSED -> listOf(
                "Deficit active. Focus strictly on essentials for now. 🚨",
                "Review recent big transactions to adjust your cap. ⚠️",
                "Brainy recommends logging every rupee accurately! 💔"
            )
        }
    }

    // Floating breathing animation
    val infiniteTransition = rememberInfiniteTransition(label = "brainy_breathing")
    val pulseScale by infiniteTransition.animateFloat(
        initialValue = 0.96f,
        targetValue = 1.04f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 2000, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "brainy_scale"
    )

    val animatedColor by animateColorAsState(targetValue = mood.primaryColor, label = "mood_color")

    Card(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = CardSurface),
        border = CardDefaults.outlinedCardBorder().copy(brush = Brush.horizontalGradient(listOf(CardBorder, animatedColor, CardBorder)))
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // Header
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Financial Mood",
                    fontSize = 14.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = TextSecondary
                )
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(20.dp))
                        .background(mood.glowColor)
                        .padding(horizontal = 10.dp, vertical = 4.dp)
                ) {
                    Text(
                        text = "${mood.emoji} ${mood.title}",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold,
                        color = mood.primaryColor
                    )
                }
            }

            Spacer(modifier = Modifier.height(14.dp))

            // Animated Mascot Circle (Clickable to cycle quips)
            Box(
                modifier = Modifier
                    .size(72.dp)
                    .scale(pulseScale)
                    .clip(CircleShape)
                    .background(
                        Brush.radialGradient(
                            listOf(mood.glowColor, CardSurface)
                        )
                    )
                    .border(2.dp, mood.primaryColor, CircleShape)
                    .clickable {
                        quoteIndex = (quoteIndex + 1) % extraQuotes.size
                    },
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = mood.emoji,
                    fontSize = 36.sp
                )
            }

            Spacer(modifier = Modifier.height(10.dp))

            // Speech Bubble Quip
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(12.dp))
                    .background(SurfaceDark)
                    .border(1.dp, CardBorder, RoundedCornerShape(12.dp))
                    .padding(10.dp)
            ) {
                Text(
                    text = "\"${extraQuotes[quoteIndex]}\"",
                    fontSize = 13.sp,
                    color = TextPrimary,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.fillMaxWidth()
                )
            }

            Spacer(modifier = Modifier.height(14.dp))

            // Daily Pacing Runway Strip
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Column {
                    Text(text = "Safe Daily Spend", fontSize = 11.sp, color = TextMuted)
                    Text(
                        text = "$currencySymbol${String.format("%,.0f", safeDailySpend)}/day",
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Bold,
                        color = if (safeDailySpend <= 0) CoralAlert else TextPrimary
                    )
                }
                Column(horizontalAlignment = Alignment.End) {
                    Text(text = "Days Remaining", fontSize = 11.sp, color = TextMuted)
                    Text(
                        text = "$remainingDays days",
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Bold,
                        color = TextSecondary
                    )
                }
            }
        }
    }
}
