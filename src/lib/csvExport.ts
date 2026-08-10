import { Task, Category } from '../types';

/**
 * Converts an array of tasks into a RFC-4180 compliant CSV string
 * and triggers a client-side browser file download.
 */
export function exportTasksToCSV(
  tasks: Task[],
  categories: Category[] = [],
  filenamePrefix: string = 'tasks-export'
): void {
  if (!tasks || tasks.length === 0) {
    alert('No tasks available to export.');
    return;
  }

  const getCategoryName = (catId?: string) => {
    if (!catId) return '';
    const found = categories.find((c) => c.id === catId);
    return found ? found.name : catId;
  };

  const escapeCSVField = (val: any): string => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const headers = [
    'Task ID',
    'Title',
    'Description',
    'Status',
    'Priority',
    'Category',
    'Due Date',
    'Due Time',
    'Completed At',
    'Recurring Interval',
    'Tags',
    'Subtasks Total',
    'Subtasks Completed',
    'Created At',
  ];

  const rows = tasks.map((task) => {
    const categoryName = getCategoryName(task.categoryId);
    const status = task.completed ? 'Completed' : 'Pending';
    const tags = Array.isArray(task.tags) ? task.tags.join('; ') : '';
    const subtasksTotal = task.subtasks ? task.subtasks.length : 0;
    const subtasksCompleted = task.subtasks
      ? task.subtasks.filter((s) => s.completed).length
      : 0;

    return [
      escapeCSVField(task.id),
      escapeCSVField(task.title),
      escapeCSVField(task.description || ''),
      escapeCSVField(status),
      escapeCSVField(task.priority),
      escapeCSVField(categoryName),
      escapeCSVField(task.dueDate || ''),
      escapeCSVField(task.dueTime || ''),
      escapeCSVField(task.completedAt || ''),
      escapeCSVField(task.recurringInterval || 'none'),
      escapeCSVField(tags),
      escapeCSVField(subtasksTotal),
      escapeCSVField(subtasksCompleted),
      escapeCSVField(task.createdAt || ''),
    ].join(',');
  });

  const csvString = [headers.join(','), ...rows].join('\r\n');
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const downloadUrl = URL.createObjectURL(blob);

  const anchor = document.createElement('a');
  anchor.href = downloadUrl;
  const dateStamp = new Date().toISOString().split('T')[0];
  anchor.download = `${filenamePrefix}-${dateStamp}.csv`;

  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(downloadUrl);
}
