package com.budgetbrain.app.ui.components

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.*
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.budgetbrain.app.ui.theme.*

@Composable
fun BudgetRingCompose(
    percentage: Double,
    spentAmount: Double,
    limitAmount: Double,
    remainingAmount: Double,
    currencySymbol: String = "₹",
    modifier: Modifier = Modifier,
    size: Dp = 190.dp,
    strokeWidth: Dp = 14.dp
) {
    val animatedProgress = remember { Animatable(0f) }
    val isDeficit = remainingAmount < 0 || percentage > 100.0

    val primaryRingColor = when {
        percentage >= 100.0 -> CoralAlert
        percentage >= 80.0 -> GoldAccent
        percentage >= 60.0 -> TealZen
        else -> EmeraldPrimary
    }

    val secondaryRingColor = when {
        percentage >= 100.0 -> Color(0xFFE57373)
        percentage >= 80.0 -> Color(0xFFFFD54F)
        percentage >= 60.0 -> Color(0xFF80CBC4)
        else -> EmeraldLight
    }

    LaunchedEffect(percentage) {
        val target = (percentage.coerceIn(0.0, 100.0) / 100.0).toFloat()
        animatedProgress.animateTo(
            targetValue = target,
            animationSpec = tween(durationMillis = 1000)
        )
    }

    Box(
        modifier = modifier.size(size),
        contentAlignment = Alignment.Center
    ) {
        Canvas(modifier = Modifier.fillMaxSize()) {
            val strokePx = strokeWidth.toPx()
            val diameter = size.toPx() - strokePx
            val arcSize = Size(diameter, diameter)
            val topLeft = Offset(strokePx / 2, strokePx / 2)

            // Background Track
            drawArc(
                color = CardBorder,
                startAngle = -90f,
                sweepAngle = 360f,
                useCenter = false,
                topLeft = topLeft,
                size = arcSize,
                style = Stroke(width = strokePx, cap = StrokeCap.Round)
            )

            // Animated Fill Arc
            val sweep = animatedProgress.value * 360f
            if (sweep > 0f) {
                drawArc(
                    brush = Brush.sweepGradient(
                        listOf(primaryRingColor, secondaryRingColor, primaryRingColor)
                    ),
                    startAngle = -90f,
                    sweepAngle = sweep,
                    useCenter = false,
                    topLeft = topLeft,
                    size = arcSize,
                    style = Stroke(width = strokePx, cap = StrokeCap.Round)
                )
            }
        }

        // Center Content
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Text(
                text = "${percentage.toInt()}%",
                fontSize = 28.sp,
                fontWeight = FontWeight.Bold,
                color = if (isDeficit) CoralAlert else TextPrimary
            )
            Text(
                text = if (isDeficit) "Monthly Deficit" else "Remaining",
                fontSize = 12.sp,
                color = TextSecondary
            )
            Text(
                text = if (isDeficit) "-$currencySymbol${String.format("%,.0f", -remainingAmount)}"
                else "$currencySymbol${String.format("%,.0f", remainingAmount)}",
                fontSize = 14.sp,
                fontWeight = FontWeight.SemiBold,
                color = if (isDeficit) CoralAlert else EmeraldLight
            )
        }
    }
}
