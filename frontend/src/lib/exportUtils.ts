import { Expense, Category, Budget } from '@/types';

/**
 * Converts a list of expenses to a structured CSV string and triggers a browser file download.
 */
export function exportExpensesToCSV(expenses: Expense[], currencySymbol: string = 'INR') {
  const headers = ['ID', 'Date', 'Title', 'Category', 'Amount', 'Currency', 'Payment Mode', 'Recurring', 'Notes'];

  const rows = expenses.map((exp) => {
    const escape = (val: any) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    return [
      escape(exp.id),
      escape(exp.date),
      escape(exp.title),
      escape(exp.category_name || 'Uncategorized'),
      escape(exp.amount),
      escape(currencySymbol),
      escape(exp.payment_mode || 'None'),
      escape(exp.is_recurring ? 'Yes' : 'No'),
      escape(exp.notes || ''),
    ].join(',');
  });

  const csvContent = [headers.join(','), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  
  const today = new Date().toISOString().split('T')[0];
  downloadBlob(blob, `budgetbrain_expenses_${today}.csv`);
}

/**
 * Generates a full JSON backup of the application database and downloads it.
 */
export function exportFullBackupJSON(data: {
  categories: Category[];
  expenses: Expense[];
  budgets: Budget[];
}) {
  const backupPayload = {
    version: '1.1.0',
    app: 'BudgetBrain',
    exported_at: new Date().toISOString(),
    record_counts: {
      categories: data.categories.length,
      expenses: data.expenses.length,
      budgets: data.budgets.length,
    },
    data,
  };

  const jsonString = JSON.stringify(backupPayload, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });

  const today = new Date().toISOString().split('T')[0];
  downloadBlob(blob, `budgetbrain_backup_${today}.json`);
}

/**
 * Triggers a client-side file download for a given Blob.
 */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Parses and validates a JSON backup file content.
 */
export function validateBackupJSON(jsonContent: string): {
  isValid: boolean;
  error?: string;
  data?: {
    categories: Category[];
    expenses: Expense[];
    budgets: Budget[];
  };
} {
  try {
    const parsed = JSON.parse(jsonContent);
    if (!parsed || typeof parsed !== 'object') {
      return { isValid: false, error: 'Invalid JSON format.' };
    }

    if (!parsed.data || typeof parsed.data !== 'object') {
      return { isValid: false, error: 'Backup does not contain a valid "data" property.' };
    }

    const { categories = [], expenses = [], budgets = [] } = parsed.data;
    if (!Array.isArray(categories) || !Array.isArray(expenses) || !Array.isArray(budgets)) {
      return { isValid: false, error: 'Data arrays (categories, expenses, budgets) are malformed.' };
    }

    return {
      isValid: true,
      data: {
        categories,
        expenses,
        budgets,
      },
    };
  } catch (err: any) {
    return { isValid: false, error: err.message || 'Failed to parse JSON file.' };
  }
}
