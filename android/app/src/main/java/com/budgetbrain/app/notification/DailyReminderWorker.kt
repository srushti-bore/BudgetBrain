package com.budgetbrain.app.notification

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.budgetbrain.app.data.local.SessionManager

class DailyReminderWorker(
    private val context: Context,
    workerParams: WorkerParameters
) : CoroutineWorker(context, workerParams) {

    override suspend fun doWork(): Result {
        val sessionManager = SessionManager(context)
        if (sessionManager.isLoggedIn()) {
            NotificationHelper.showDailyReminder(context)
        }
        return Result.success()
    }
}
