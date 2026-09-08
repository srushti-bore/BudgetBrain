package com.budgetbrain.app.ui.screens.chat

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.Send
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.budgetbrain.app.data.model.ChatMessage
import com.budgetbrain.app.data.model.RagSource
import com.budgetbrain.app.repository.AiRepository
import com.budgetbrain.app.ui.components.BudgetBrainTopBar
import com.budgetbrain.app.ui.theme.*
import kotlinx.coroutines.launch

data class UiChatMessage(
    val message: ChatMessage,
    val citedExpenses: List<RagSource> = emptyList()
)

@Composable
fun AskBudgetBrainChatScreen(
    aiRepository: AiRepository
) {
    var messages by remember {
        mutableStateOf(
            listOf(
                UiChatMessage(
                    ChatMessage(
                        role = "assistant",
                        content = "Hello! I am your BudgetBrain AI financial assistant. Ask me anything about your spending, budget health, or affordability in Marathi, Hindi, or English!"
                    )
                )
            )
        )
    }
    var inputText by remember { mutableStateOf("") }
    var isThinking by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    val listState = rememberLazyListState()

    val quickPrompts = listOf(
        "Can I afford dinner tonight?",
        "मी आज ₹2,000 चा खर्च करू शकतो का?",
        "Where is most of my money going?",
        "घाटा कसा भरून काढू?",
        "Give me 3 spending tips"
    )

    fun sendMessage(textToSend: String) {
        if (textToSend.isBlank() || isThinking) return
        val userMsg = ChatMessage(role = "user", content = textToSend.trim())
        val updatedMessages = messages + UiChatMessage(userMsg)
        messages = updatedMessages
        inputText = ""
        isThinking = true

        scope.launch {
            listState.animateScrollToItem(messages.size - 1)
            val history = updatedMessages.map { it.message }
            val res = aiRepository.chat(textToSend.trim(), history)
            isThinking = false
            res.fold(
                onSuccess = { replyData ->
                    val assistantMsg = ChatMessage(role = "assistant", content = replyData.reply)
                    messages = messages + UiChatMessage(assistantMsg, replyData.sources)
                    listState.animateScrollToItem(messages.size - 1)
                },
                onFailure = {
                    val err = ChatMessage(role = "assistant", content = "Sorry, I could not process your request right now. Please check your network and try again.")
                    messages = messages + UiChatMessage(err)
                }
            )
        }
    }

    Scaffold(
        topBar = {
            BudgetBrainTopBar(title = "Ask BudgetBrain AI")
        },
        containerColor = DarkBg
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            // Message Thread
            LazyColumn(
                state = listState,
                modifier = Modifier
                    .weight(1f)
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
                contentPadding = PaddingValues(vertical = 16.dp)
            ) {
                items(messages) { uiMsg ->
                    val isUser = uiMsg.message.role == "user"
                    Column(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalAlignment = if (isUser) Alignment.End else Alignment.Start
                    ) {
                        Row(
                            verticalAlignment = Alignment.Top,
                            horizontalArrangement = if (isUser) Arrangement.End else Arrangement.Start,
                            modifier = Modifier.fillMaxWidth(0.9f)
                        ) {
                            if (!isUser) {
                                Box(
                                    modifier = Modifier
                                        .size(32.dp)
                                        .clip(CircleShape)
                                        .background(EmeraldGlow),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Icon(Icons.Default.AutoAwesome, contentDescription = null, tint = EmeraldLight, modifier = Modifier.size(16.dp))
                                }
                                Spacer(modifier = Modifier.width(8.dp))
                            }

                            Card(
                                shape = RoundedCornerShape(
                                    topStart = 16.dp,
                                    topEnd = 16.dp,
                                    bottomStart = if (isUser) 16.dp else 4.dp,
                                    bottomEnd = if (isUser) 4.dp else 16.dp
                                ),
                                colors = CardDefaults.cardColors(
                                    containerColor = if (isUser) EmeraldPrimary else CardSurface
                                ),
                                border = if (!isUser) CardDefaults.outlinedCardBorder().copy(brush = androidx.compose.ui.graphics.SolidColor(CardBorder)) else null
                            ) {
                                Column(modifier = Modifier.padding(14.dp)) {
                                    Text(
                                        text = uiMsg.message.content,
                                        fontSize = 14.sp,
                                        color = TextPrimary,
                                        lineHeight = 20.sp
                                    )

                                    // RAG Cited Transactions Badges
                                    if (uiMsg.citedExpenses.isNotEmpty()) {
                                        Spacer(modifier = Modifier.height(10.dp))
                                        Text(
                                            text = "📌 Cited Transactions [RAG]:",
                                            fontSize = 11.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = GoldAccent
                                        )
                                        Spacer(modifier = Modifier.height(4.dp))
                                        uiMsg.citedExpenses.forEach { cited ->
                                            Box(
                                                modifier = Modifier
                                                    .fillMaxWidth()
                                                    .padding(vertical = 2.dp)
                                                    .clip(RoundedCornerShape(6.dp))
                                                    .background(SurfaceDark)
                                                    .padding(horizontal = 8.dp, vertical = 4.dp)
                                            ) {
                                                Text(
                                                    text = "• ${cited.title}: ₹${String.format("%,.0f", cited.amount)} (${cited.date})",
                                                    fontSize = 11.sp,
                                                    color = TextSecondary
                                                )
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                if (isThinking) {
                    item {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            CircularProgressIndicator(modifier = Modifier.size(18.dp), color = EmeraldLight, strokeWidth = 2.dp)
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("BudgetBrain is analyzing your finances...", fontSize = 12.sp, color = TextSecondary)
                        }
                    }
                }
            }

            // Quick Prompt Chips
            LazyRow(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 4.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                items(quickPrompts) { prompt ->
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(20.dp))
                            .background(CardSurface)
                            .border(1.dp, CardBorder, RoundedCornerShape(20.dp))
                            .clickable { sendMessage(prompt) }
                            .padding(horizontal = 12.dp, vertical = 6.dp)
                    ) {
                        Text(text = prompt, fontSize = 12.sp, color = EmeraldLight)
                    }
                }
            }

            // Input Bar
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                OutlinedTextField(
                    value = inputText,
                    onValueChange = { inputText = it },
                    placeholder = { Text("Ask in English, Marathi, Hindi...", color = TextMuted, fontSize = 13.sp) },
                    singleLine = true,
                    shape = RoundedCornerShape(24.dp),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = EmeraldPrimary,
                        unfocusedBorderColor = CardBorder,
                        focusedTextColor = TextPrimary,
                        unfocusedTextColor = TextPrimary,
                        focusedContainerColor = CardSurface,
                        unfocusedContainerColor = CardSurface
                    ),
                    modifier = Modifier.weight(1f)
                )
                Spacer(modifier = Modifier.width(8.dp))
                IconButton(
                    onClick = { sendMessage(inputText) },
                    enabled = inputText.isNotBlank() && !isThinking,
                    modifier = Modifier
                        .size(46.dp)
                        .clip(CircleShape)
                        .background(if (inputText.isNotBlank() && !isThinking) EmeraldPrimary else CardSurface)
                ) {
                    Icon(
                        Icons.Default.Send,
                        contentDescription = "Send",
                        tint = if (inputText.isNotBlank() && !isThinking) TextPrimary else TextMuted,
                        modifier = Modifier.size(20.dp)
                    )
                }
            }
        }
    }
}
