package com.budgetbrain.app.ui.screens.expenses

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.budgetbrain.app.data.model.*
import com.budgetbrain.app.repository.AiRepository
import com.budgetbrain.app.repository.CategoryRepository
import com.budgetbrain.app.repository.ExpenseRepository
import com.budgetbrain.app.ui.components.BudgetBrainTopBar
import com.budgetbrain.app.ui.theme.*
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ExpensesScreen(
    expenseRepository: ExpenseRepository,
    categoryRepository: CategoryRepository,
    aiRepository: AiRepository
) {
    var expenses by remember { mutableStateOf<List<Expense>>(emptyList()) }
    var categories by remember { mutableStateOf<List<Category>>(emptyList()) }
    var selectedCategoryId by remember { mutableStateOf<String?>(null) }
    var searchQuery by remember { mutableStateOf("") }
    var isLoading by remember { mutableStateOf(true) }
    var showAddSheet by remember { mutableStateOf(false) }
    var expenseToDelete by remember { mutableStateOf<Expense?>(null) }

    val scope = rememberCoroutineScope()

    val loadExpenses = {
        isLoading = true
        scope.launch {
            val res = expenseRepository.listExpenses(
                page = 1,
                categoryId = selectedCategoryId,
                search = searchQuery.ifBlank { null }
            )
            res.onSuccess { expenses = it }
            isLoading = false
        }
    }

    LaunchedEffect(Unit) {
        scope.launch {
            categoryRepository.listCategories().onSuccess { categories = it }
        }
        loadExpenses()
    }

    LaunchedEffect(selectedCategoryId, searchQuery) {
        loadExpenses()
    }

    Scaffold(
        topBar = {
            BudgetBrainTopBar(
                title = "Expenses",
                onSyncClick = { loadExpenses() }
            )
        },
        floatingActionButton = {
            FloatingActionButton(
                onClick = { showAddSheet = true },
                containerColor = EmeraldPrimary,
                contentColor = TextPrimary,
                shape = CircleShape
            ) {
                Icon(Icons.Default.Add, contentDescription = "Add Expense")
            }
        },
        containerColor = DarkBg
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            // Search Input
            OutlinedTextField(
                value = searchQuery,
                onValueChange = { searchQuery = it },
                placeholder = { Text("Search transactions...", color = TextMuted) },
                leadingIcon = { Icon(Icons.Default.Search, contentDescription = null, tint = EmeraldLight) },
                singleLine = true,
                shape = RoundedCornerShape(12.dp),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = EmeraldPrimary,
                    unfocusedBorderColor = CardBorder,
                    focusedTextColor = TextPrimary,
                    unfocusedTextColor = TextPrimary,
                    focusedContainerColor = SurfaceDark,
                    unfocusedContainerColor = SurfaceDark
                ),
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 8.dp)
            )

            // Category Filter Chips
            LazyRow(
                modifier = Modifier.fillMaxWidth(),
                contentPadding = PaddingValues(horizontal = 16.dp, vertical = 4.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                item {
                    FilterChip(
                        selected = selectedCategoryId == null,
                        onClick = { selectedCategoryId = null },
                        label = { Text("All") },
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = EmeraldPrimary,
                            selectedLabelColor = TextPrimary,
                            containerColor = CardSurface,
                            labelColor = TextSecondary
                        )
                    )
                }
                items(categories) { cat ->
                    FilterChip(
                        selected = selectedCategoryId == cat.id,
                        onClick = { selectedCategoryId = if (selectedCategoryId == cat.id) null else cat.id },
                        label = { Text(cat.name) },
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = EmeraldPrimary,
                            selectedLabelColor = TextPrimary,
                            containerColor = CardSurface,
                            labelColor = TextSecondary
                        )
                    )
                }
            }

            // Expense List
            if (isLoading) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = EmeraldPrimary)
                }
            } else if (expenses.isEmpty()) {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(24.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text("🧾", fontSize = 48.sp)
                        Spacer(modifier = Modifier.height(12.dp))
                        Text("No expenses found", fontSize = 16.sp, fontWeight = FontWeight.SemiBold, color = TextPrimary)
                        Text("Tap + button below to log your first expense", fontSize = 13.sp, color = TextSecondary)
                    }
                }
            } else {
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    items(expenses, key = { it.id }) { expense ->
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(14.dp),
                            colors = CardDefaults.cardColors(containerColor = CardSurface),
                            border = CardDefaults.outlinedCardBorder().copy(brush = androidx.compose.ui.graphics.SolidColor(CardBorder))
                        ) {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(14.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    modifier = Modifier.weight(1f)
                                ) {
                                    Box(
                                        modifier = Modifier
                                            .size(40.dp)
                                            .clip(RoundedCornerShape(10.dp))
                                            .background(EmeraldGlow),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Text("💳", fontSize = 18.sp)
                                    }
                                    Spacer(modifier = Modifier.width(12.dp))
                                    Column {
                                        Text(
                                            text = expense.title,
                                            fontSize = 15.sp,
                                            fontWeight = FontWeight.SemiBold,
                                            color = TextPrimary,
                                            maxLines = 1,
                                            overflow = TextOverflow.Ellipsis
                                        )
                                        Spacer(modifier = Modifier.height(2.dp))
                                        Row(verticalAlignment = Alignment.CenterVertically) {
                                            Text(
                                                text = expense.categoryName ?: "General",
                                                fontSize = 12.sp,
                                                color = EmeraldLight
                                            )
                                            Text(" • ", fontSize = 12.sp, color = TextMuted)
                                            Text(
                                                text = expense.date,
                                                fontSize = 12.sp,
                                                color = TextSecondary
                                            )
                                        }
                                    }
                                }

                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Text(
                                        text = "₹${String.format("%,.0f", expense.amount)}",
                                        fontSize = 16.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = TextPrimary
                                    )
                                    IconButton(
                                        onClick = { expenseToDelete = expense },
                                        modifier = Modifier.size(32.dp)
                                    ) {
                                        Icon(
                                            Icons.Default.DeleteOutline,
                                            contentDescription = "Delete",
                                            tint = TextMuted,
                                            modifier = Modifier.size(18.dp)
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    // Delete Confirmation Dialog
    if (expenseToDelete != null) {
        AlertDialog(
            onDismissRequest = { expenseToDelete = null },
            title = { Text("Delete Expense?", color = TextPrimary) },
            text = {
                Text(
                    "Are you sure you want to delete \"${expenseToDelete?.title}\" (₹${String.format("%,.0f", expenseToDelete?.amount ?: 0.0)})?",
                    color = TextSecondary
                )
            },
            confirmButton = {
                TextButton(
                    onClick = {
                        val id = expenseToDelete?.id
                        if (id != null) {
                            scope.launch {
                                expenseRepository.deleteExpense(id)
                                loadExpenses()
                                expenseToDelete = null
                            }
                        }
                    }
                ) {
                    Text("Delete", color = CoralAlert, fontWeight = FontWeight.Bold)
                }
            },
            dismissButton = {
                TextButton(onClick = { expenseToDelete = null }) {
                    Text("Cancel", color = TextSecondary)
                }
            },
            containerColor = CardSurface
        )
    }

    // Add Expense Bottom Sheet
    if (showAddSheet) {
        ModalBottomSheet(
            onDismissRequest = { showAddSheet = false },
            containerColor = SurfaceDark,
            dragHandle = { BottomSheetDefaults.DragHandle(color = TextMuted) }
        ) {
            AddExpenseForm(
                categories = categories,
                aiRepository = aiRepository,
                expenseRepository = expenseRepository,
                onSuccess = {
                    showAddSheet = false
                    loadExpenses()
                }
            )
        }
    }
}

@Composable
fun AddExpenseForm(
    categories: List<Category>,
    aiRepository: AiRepository,
    expenseRepository: ExpenseRepository,
    onSuccess: () -> Unit
) {
    var title by remember { mutableStateOf("") }
    var amountText by remember { mutableStateOf("") }
    var selectedCategory by remember { mutableStateOf<Category?>(categories.firstOrNull()) }
    var paymentMode by remember { mutableStateOf("UPI") }
    val today = remember { SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date()) }
    var dateText by remember { mutableStateOf(today) }

    var suggestedCategoryName by remember { mutableStateOf<String?>(null) }
    var duplicateExistingExpense by remember { mutableStateOf<Expense?>(null) }
    var isDuplicateAcknowledged by remember { mutableStateOf(false) }
    var isSubmitting by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }

    val scope = rememberCoroutineScope()
    var searchJob by remember { mutableStateOf<Job?>(null) }

    // Real-time Category Suggestion & Duplicate Check (Debounced 400ms)
    fun triggerAiCheck(currentTitle: String, currentAmountStr: String) {
        searchJob?.cancel()
        searchJob = scope.launch {
            delay(400)
            val amt = currentAmountStr.toDoubleOrNull()
            if (currentTitle.length >= 3) {
                aiRepository.suggestCategory(currentTitle, amt).onSuccess { res ->
                    suggestedCategoryName = res.suggestedCategory
                    val match = categories.find { it.name.equals(res.suggestedCategory, ignoreCase = true) }
                    if (match != null) selectedCategory = match
                    if (res.suggestedPaymentMode != null) paymentMode = res.suggestedPaymentMode
                }
            }
            if (amt != null && amt > 0 && currentTitle.length >= 3) {
                expenseRepository.checkDuplicate(DuplicateCheckRequest(currentTitle, amt, dateText)).onSuccess { dupRes ->
                    if (dupRes.isDuplicate && dupRes.existingExpense != null) {
                        duplicateExistingExpense = dupRes.existingExpense
                        isDuplicateAcknowledged = false
                    } else {
                        duplicateExistingExpense = null
                    }
                }
            }
        }
    }

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(20.dp)
            .padding(bottom = 24.dp)
    ) {
        Text("Log New Expense", fontSize = 20.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
        Spacer(modifier = Modifier.height(16.dp))

        if (errorMessage != null) {
            Text(text = errorMessage!!, color = CoralAlert, fontSize = 13.sp)
            Spacer(modifier = Modifier.height(8.dp))
        }

        // Title
        OutlinedTextField(
            value = title,
            onValueChange = {
                title = it
                triggerAiCheck(it, amountText)
            },
            label = { Text("Expense Title (e.g. Swiggy Dinner, Groceries)") },
            singleLine = true,
            colors = OutlinedTextFieldDefaults.colors(
                focusedBorderColor = EmeraldPrimary,
                unfocusedBorderColor = CardBorder,
                focusedTextColor = TextPrimary,
                unfocusedTextColor = TextPrimary
            ),
            modifier = Modifier.fillMaxWidth()
        )

        // AI Category Prediction Banner
        AnimatedVisibility(visible = suggestedCategoryName != null) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 6.dp)
                    .clip(RoundedCornerShape(8.dp))
                    .background(EmeraldGlow)
                    .padding(horizontal = 10.dp, vertical = 6.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text("✨ AI Suggested: ", fontSize = 12.sp, color = EmeraldLight, fontWeight = FontWeight.Bold)
                Text("$suggestedCategoryName ($paymentMode)", fontSize = 12.sp, color = TextPrimary)
            }
        }

        Spacer(modifier = Modifier.height(10.dp))

        // Amount
        OutlinedTextField(
            value = amountText,
            onValueChange = {
                amountText = it
                triggerAiCheck(title, it)
            },
            label = { Text("Amount (₹)") },
            leadingIcon = { Text("₹", color = EmeraldLight, fontWeight = FontWeight.Bold) },
            singleLine = true,
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
            colors = OutlinedTextFieldDefaults.colors(
                focusedBorderColor = EmeraldPrimary,
                unfocusedBorderColor = CardBorder,
                focusedTextColor = TextPrimary,
                unfocusedTextColor = TextPrimary
            ),
            modifier = Modifier.fillMaxWidth()
        )

        // Duplicate Transaction Guard Alert Banner
        AnimatedVisibility(visible = duplicateExistingExpense != null && !isDuplicateAcknowledged) {
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 8.dp),
                shape = RoundedCornerShape(10.dp),
                colors = CardDefaults.cardColors(containerColor = CardSurface),
                border = CardDefaults.outlinedCardBorder().copy(brush = androidx.compose.ui.graphics.SolidColor(GoldAccent))
            ) {
                Column(modifier = Modifier.padding(12.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text("⚠️ Possible Duplicate", fontWeight = FontWeight.Bold, color = GoldAccent, fontSize = 13.sp)
                    }
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        "Found matching \"${duplicateExistingExpense?.title}\" (₹${String.format("%,.0f", duplicateExistingExpense?.amount ?: 0.0)}) on ${duplicateExistingExpense?.date}.",
                        color = TextSecondary,
                        fontSize = 12.sp
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    TextButton(
                        onClick = { isDuplicateAcknowledged = true }
                    ) {
                        Text("I Understand, Log Anyway", color = GoldAccent, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Submit Button
        Button(
            onClick = {
                val amt = amountText.toDoubleOrNull()
                val catId = selectedCategory?.id ?: categories.firstOrNull()?.id
                if (title.isBlank() || amt == null || amt <= 0 || catId == null) {
                    errorMessage = "Please enter valid title, amount, and category"
                    return@Button
                }
                isSubmitting = true
                scope.launch {
                    val res = expenseRepository.createExpense(
                        ExpenseCreate(
                            title = title.trim(),
                            amount = amt,
                            categoryId = catId,
                            date = dateText,
                            paymentMode = paymentMode
                        )
                    )
                    isSubmitting = false
                    res.fold(
                        onSuccess = { onSuccess() },
                        onFailure = { errorMessage = it.message ?: "Failed to log expense" }
                    )
                }
            },
            enabled = !isSubmitting && (duplicateExistingExpense == null || isDuplicateAcknowledged),
            colors = ButtonDefaults.buttonColors(containerColor = EmeraldPrimary),
            shape = RoundedCornerShape(12.dp),
            modifier = Modifier
                .fillMaxWidth()
                .height(50.dp)
        ) {
            if (isSubmitting) {
                CircularProgressIndicator(color = TextPrimary, modifier = Modifier.size(24.dp))
            } else {
                Text("Log Expense", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
            }
        }
    }
}
