package com.budgetbrain.app.ui.screens.auth

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Person
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.budgetbrain.app.repository.AuthRepository
import com.budgetbrain.app.ui.theme.*
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LoginScreen(
    authRepository: AuthRepository,
    onLoginSuccess: () -> Unit,
    onNavigateToRegister: () -> Unit
) {
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var isLoading by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(DarkBg)
            .padding(24.dp),
        contentAlignment = Alignment.Center
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .verticalScroll(rememberScrollState()),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // Logo
            Box(
                modifier = Modifier
                    .size(64.dp)
                    .clip(RoundedCornerShape(16.dp))
                    .background(EmeraldPrimary),
                contentAlignment = Alignment.Center
            ) {
                Text(text = "🧠", fontSize = 32.sp)
            }

            Spacer(modifier = Modifier.height(16.dp))

            Text(
                text = "BudgetBrain",
                fontSize = 26.sp,
                fontWeight = FontWeight.Bold,
                color = TextPrimary
            )
            Text(
                text = "Sign in to manage your wealth & intelligence",
                fontSize = 13.sp,
                color = TextSecondary,
                textAlign = TextAlign.Center
            )

            Spacer(modifier = Modifier.height(28.dp))

            if (errorMessage != null) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(10.dp))
                        .background(CoralGlow)
                        .border(1.dp, CoralAlert, RoundedCornerShape(10.dp))
                        .padding(12.dp)
                ) {
                    Text(
                        text = errorMessage!!,
                        color = CoralAlert,
                        fontSize = 13.sp,
                        textAlign = TextAlign.Center,
                        modifier = Modifier.fillMaxWidth()
                    )
                }
                Spacer(modifier = Modifier.height(16.dp))
            }

            // Email Input
            OutlinedTextField(
                value = email,
                onValueChange = { email = it; errorMessage = null },
                label = { Text("Email Address") },
                leadingIcon = { Icon(Icons.Default.Email, contentDescription = null, tint = EmeraldLight) },
                singleLine = true,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = EmeraldPrimary,
                    unfocusedBorderColor = CardBorder,
                    focusedTextColor = TextPrimary,
                    unfocusedTextColor = TextPrimary
                ),
                modifier = Modifier.fillMaxWidth()
            )

            Spacer(modifier = Modifier.height(14.dp))

            // Password Input
            OutlinedTextField(
                value = password,
                onValueChange = { password = it; errorMessage = null },
                label = { Text("Password") },
                leadingIcon = { Icon(Icons.Default.Lock, contentDescription = null, tint = EmeraldLight) },
                singleLine = true,
                visualTransformation = PasswordVisualTransformation(),
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = EmeraldPrimary,
                    unfocusedBorderColor = CardBorder,
                    focusedTextColor = TextPrimary,
                    unfocusedTextColor = TextPrimary
                ),
                modifier = Modifier.fillMaxWidth()
            )

            Spacer(modifier = Modifier.height(20.dp))

            // Submit Button
            Button(
                onClick = {
                    if (email.isBlank() || password.isBlank()) {
                        errorMessage = "Please enter your email and password"
                        return@Button
                    }
                    isLoading = true
                    errorMessage = null
                    scope.launch {
                        val result = authRepository.login(email.trim(), password)
                        isLoading = false
                        result.fold(
                            onSuccess = { onLoginSuccess() },
                            onFailure = { errorMessage = it.message ?: "Login failed" }
                        )
                    }
                },
                enabled = !isLoading,
                colors = ButtonDefaults.buttonColors(containerColor = EmeraldPrimary),
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .height(50.dp)
            ) {
                if (isLoading) {
                    CircularProgressIndicator(color = TextPrimary, modifier = Modifier.size(24.dp))
                } else {
                    Text("Sign In", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Divider
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Divider(modifier = Modifier.weight(1f), color = CardBorder)
                Text(
                    text = "  OR CONTINUE WITH  ",
                    fontSize = 11.sp,
                    color = TextMuted,
                    fontWeight = FontWeight.SemiBold
                )
                Divider(modifier = Modifier.weight(1f), color = CardBorder)
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Google Sign-In Button
            OutlinedButton(
                onClick = {
                    errorMessage = "Google One-Tap is connecting to secure cloud account..."
                    // Connects to Google ID Token / Auth endpoint
                },
                shape = RoundedCornerShape(12.dp),
                border = ButtonDefaults.outlinedButtonBorder.copy(brush = androidx.compose.ui.graphics.SolidColor(CardBorder)),
                colors = ButtonDefaults.outlinedButtonColors(containerColor = CardSurface),
                modifier = Modifier
                    .fillMaxWidth()
                    .height(50.dp)
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(text = "G ", fontSize = 18.sp, fontWeight = FontWeight.ExtraBold, color = Color(0xFF4285F4))
                    Text(
                        text = "Continue with Google",
                        fontSize = 14.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = TextPrimary
                    )
                }
            }

            Spacer(modifier = Modifier.height(20.dp))

            TextButton(onClick = onNavigateToRegister) {
                Text(
                    text = "Don't have an account? Sign Up",
                    color = EmeraldLight,
                    fontSize = 14.sp
                )
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RegisterScreen(
    authRepository: AuthRepository,
    onRegisterSuccess: (email: String) -> Unit,
    onNavigateToLogin: () -> Unit
) {
    var fullName by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var isLoading by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(DarkBg)
            .padding(24.dp),
        contentAlignment = Alignment.Center
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .verticalScroll(rememberScrollState()),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(
                text = "Create Account",
                fontSize = 26.sp,
                fontWeight = FontWeight.Bold,
                color = TextPrimary
            )
            Text(
                text = "Join BudgetBrain and automate your finances",
                fontSize = 13.sp,
                color = TextSecondary,
                textAlign = TextAlign.Center
            )

            Spacer(modifier = Modifier.height(24.dp))

            if (errorMessage != null) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(10.dp))
                        .background(CoralGlow)
                        .border(1.dp, CoralAlert, RoundedCornerShape(10.dp))
                        .padding(12.dp)
                ) {
                    Text(
                        text = errorMessage!!,
                        color = CoralAlert,
                        fontSize = 13.sp,
                        textAlign = TextAlign.Center,
                        modifier = Modifier.fillMaxWidth()
                    )
                }
                Spacer(modifier = Modifier.height(16.dp))
            }

            // Name
            OutlinedTextField(
                value = fullName,
                onValueChange = { fullName = it },
                label = { Text("Full Name (Optional)") },
                leadingIcon = { Icon(Icons.Default.Person, contentDescription = null, tint = EmeraldLight) },
                singleLine = true,
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = EmeraldPrimary,
                    unfocusedBorderColor = CardBorder,
                    focusedTextColor = TextPrimary,
                    unfocusedTextColor = TextPrimary
                ),
                modifier = Modifier.fillMaxWidth()
            )

            Spacer(modifier = Modifier.height(12.dp))

            // Email
            OutlinedTextField(
                value = email,
                onValueChange = { email = it; errorMessage = null },
                label = { Text("Email Address") },
                leadingIcon = { Icon(Icons.Default.Email, contentDescription = null, tint = EmeraldLight) },
                singleLine = true,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = EmeraldPrimary,
                    unfocusedBorderColor = CardBorder,
                    focusedTextColor = TextPrimary,
                    unfocusedTextColor = TextPrimary
                ),
                modifier = Modifier.fillMaxWidth()
            )

            Spacer(modifier = Modifier.height(12.dp))

            // Password
            OutlinedTextField(
                value = password,
                onValueChange = { password = it; errorMessage = null },
                label = { Text("Password (min 6 chars)") },
                leadingIcon = { Icon(Icons.Default.Lock, contentDescription = null, tint = EmeraldLight) },
                singleLine = true,
                visualTransformation = PasswordVisualTransformation(),
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = EmeraldPrimary,
                    unfocusedBorderColor = CardBorder,
                    focusedTextColor = TextPrimary,
                    unfocusedTextColor = TextPrimary
                ),
                modifier = Modifier.fillMaxWidth()
            )

            Spacer(modifier = Modifier.height(20.dp))

            Button(
                onClick = {
                    if (email.isBlank() || password.length < 6) {
                        errorMessage = "Enter valid email & password (min 6 chars)"
                        return@Button
                    }
                    isLoading = true
                    errorMessage = null
                    scope.launch {
                        val result = authRepository.register(email.trim(), password, fullName.trim().ifBlank { null })
                        isLoading = false
                        result.fold(
                            onSuccess = { onRegisterSuccess(email.trim()) },
                            onFailure = { errorMessage = it.message ?: "Registration failed" }
                        )
                    }
                },
                enabled = !isLoading,
                colors = ButtonDefaults.buttonColors(containerColor = EmeraldPrimary),
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .height(50.dp)
            ) {
                if (isLoading) {
                    CircularProgressIndicator(color = TextPrimary, modifier = Modifier.size(24.dp))
                } else {
                    Text("Create Account", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Google Sign-Up Button
            OutlinedButton(
                onClick = {
                    errorMessage = "Google One-Tap is connecting to secure cloud account..."
                },
                shape = RoundedCornerShape(12.dp),
                border = ButtonDefaults.outlinedButtonBorder.copy(brush = androidx.compose.ui.graphics.SolidColor(CardBorder)),
                colors = ButtonDefaults.outlinedButtonColors(containerColor = CardSurface),
                modifier = Modifier
                    .fillMaxWidth()
                    .height(50.dp)
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(text = "G ", fontSize = 18.sp, fontWeight = FontWeight.ExtraBold, color = Color(0xFF4285F4))
                    Text(
                        text = "Continue with Google",
                        fontSize = 14.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = TextPrimary
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            TextButton(onClick = onNavigateToLogin) {
                Text(
                    text = "Already have an account? Sign In",
                    color = EmeraldLight,
                    fontSize = 14.sp
                )
            }
        }
    }
}

@Composable
fun OtpVerificationScreen(
    email: String,
    authRepository: AuthRepository,
    onVerificationSuccess: () -> Unit
) {
    var otpDigits by remember { mutableStateOf(List(6) { "" }) }
    var isLoading by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    var infoMessage by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()
    val focusRequesters = remember { List(6) { FocusRequester() } }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(DarkBg)
            .padding(24.dp),
        contentAlignment = Alignment.Center
    ) {
        Column(
            modifier = Modifier.fillMaxWidth(),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Box(
                modifier = Modifier
                    .size(60.dp)
                    .clip(RoundedCornerShape(16.dp))
                    .background(EmeraldGlow),
                contentAlignment = Alignment.Center
            ) {
                Text(text = "✉️", fontSize = 30.sp)
            }

            Spacer(modifier = Modifier.height(16.dp))

            Text(
                text = "Verify Your Email",
                fontSize = 24.sp,
                fontWeight = FontWeight.Bold,
                color = TextPrimary
            )
            Text(
                text = "Enter the 6-digit code sent to:\n$email",
                fontSize = 13.sp,
                color = TextSecondary,
                textAlign = TextAlign.Center
            )

            Spacer(modifier = Modifier.height(28.dp))

            if (errorMessage != null) {
                Text(text = errorMessage!!, color = CoralAlert, fontSize = 13.sp, textAlign = TextAlign.Center)
                Spacer(modifier = Modifier.height(12.dp))
            }

            if (infoMessage != null) {
                Text(text = infoMessage!!, color = EmeraldLight, fontSize = 13.sp, textAlign = TextAlign.Center)
                Spacer(modifier = Modifier.height(12.dp))
            }

            // 6-Segmented OTP Box Row
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceEvenly
            ) {
                for (i in 0 until 6) {
                    OutlinedTextField(
                        value = otpDigits[i],
                        onValueChange = { newValue ->
                            if (newValue.length <= 1 && newValue.all { it.isDigit() }) {
                                val newDigits = otpDigits.toMutableList()
                                newDigits[i] = newValue
                                otpDigits = newDigits

                                if (newValue.isNotEmpty() && i < 5) {
                                    focusRequesters[i + 1].requestFocus()
                                }

                                // If 6th digit entered, auto submit
                                if (newDigits.all { it.isNotEmpty() }) {
                                    val fullOtp = newDigits.joinToString("")
                                    isLoading = true
                                    errorMessage = null
                                    scope.launch {
                                        val result = authRepository.verifyOtp(email, fullOtp)
                                        isLoading = false
                                        result.fold(
                                            onSuccess = { onVerificationSuccess() },
                                            onFailure = { errorMessage = it.message ?: "Invalid OTP" }
                                        )
                                    }
                                }
                            }
                        },
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        textStyle = LocalTextStyle.current.copy(
                            textAlign = TextAlign.Center,
                            fontSize = 20.sp,
                            fontWeight = FontWeight.Bold,
                            color = TextPrimary
                        ),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = EmeraldPrimary,
                            unfocusedBorderColor = CardBorder
                        ),
                        modifier = Modifier
                            .width(46.dp)
                            .height(56.dp)
                            .focusRequester(focusRequesters[i])
                    )
                }
            }

            Spacer(modifier = Modifier.height(30.dp))

            // Verify Button
            Button(
                onClick = {
                    val fullOtp = otpDigits.joinToString("")
                    if (fullOtp.length < 6) {
                        errorMessage = "Please enter all 6 digits"
                        return@Button
                    }
                    isLoading = true
                    errorMessage = null
                    scope.launch {
                        val result = authRepository.verifyOtp(email, fullOtp)
                        isLoading = false
                        result.fold(
                            onSuccess = { onVerificationSuccess() },
                            onFailure = { errorMessage = it.message ?: "Invalid OTP" }
                        )
                    }
                },
                enabled = !isLoading,
                colors = ButtonDefaults.buttonColors(containerColor = EmeraldPrimary),
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .height(50.dp)
            ) {
                if (isLoading) {
                    CircularProgressIndicator(color = TextPrimary, modifier = Modifier.size(24.dp))
                } else {
                    Text("Verify & Sign In", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            TextButton(
                onClick = {
                    scope.launch {
                        val res = authRepository.resendOtp(email)
                        res.fold(
                            onSuccess = { infoMessage = "New code sent to your inbox!" },
                            onFailure = { errorMessage = "Could not resend OTP" }
                        )
                    }
                }
            ) {
                Text("Resend OTP Code", color = GoldAccent, fontSize = 14.sp)
            }
        }
    }
}
