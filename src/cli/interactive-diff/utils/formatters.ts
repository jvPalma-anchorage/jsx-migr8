/**
 * Utility functions for formatting data in the info panel
 */

/**
 * Format file size in human-readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Format duration in human-readable format
 */
export function formatDuration(milliseconds: number): string {
  if (milliseconds < 1000) {
    return `${Math.round(milliseconds)}ms`;
  }
  
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

/**
 * Format a number with appropriate suffixes (K, M, B)
 */
export function formatNumber(num: number): string {
  if (num >= 1000000000) {
    return `${(num / 1000000000).toFixed(1)}B`;
  } else if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  } else if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  } else {
    return num.toString();
  }
}

/**
 * Format percentage with appropriate precision
 */
export function formatPercentage(value: number, total: number, precision = 1): string {
  if (total === 0) return '0%';
  const percentage = (value / total) * 100;
  return `${percentage.toFixed(precision)}%`;
}

/**
 * Format a file path for display, truncating if necessary
 */
export function formatFilePath(path: string, maxLength = 60): string {
  if (path.length <= maxLength) return path;
  
  const parts = path.split('/');
  if (parts.length <= 2) return path;
  
  // Try to keep the filename and immediate parent directory
  const fileName = parts[parts.length - 1];
  const parentDir = parts[parts.length - 2];
  const truncated = `.../${parentDir}/${fileName}`;
  
  if (truncated.length <= maxLength) return truncated;
  
  // If still too long, just show the filename with ...
  return `.../${fileName}`;
}

/**
 * Format a list of items with proper grammar
 */
export function formatList(items: string[], conjunction = 'and'): string {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} ${conjunction} ${items[1]}`;
  
  return `${items.slice(0, -1).join(', ')}, ${conjunction} ${items[items.length - 1]}`;
}

/**
 * Format a timestamp as a relative time string
 */
export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  
  if (diff < 1000) return 'just now';
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  
  return `${Math.floor(diff / 86400000)}d ago`;
}

/**
 * Format JSON with syntax highlighting for terminal display
 */
export function formatJSON(obj: any, indent = 2): string {
  try {
    return JSON.stringify(obj, null, indent);
  } catch (error) {
    return String(obj);
  }
}

/**
 * Truncate text with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * Format a key-value pair for display
 */
export function formatKeyValue(key: string, value: any, separator = ': '): string {
  let formattedValue: string;
  
  if (typeof value === 'object' && value !== null) {
    formattedValue = formatJSON(value);
  } else if (typeof value === 'string') {
    formattedValue = `"${value}"`;
  } else {
    formattedValue = String(value);
  }
  
  return `${key}${separator}${formattedValue}`;
}

/**
 * Format a table row with proper alignment
 */
export function formatTableRow(columns: string[], widths: number[]): string {
  return columns
    .map((col, index) => {
      const width = widths[index] || 10;
      return col.padEnd(width).substring(0, width);
    })
    .join(' | ');
}

/**
 * Create a horizontal separator line
 */
export function createSeparator(char = '─', length = 80): string {
  return char.repeat(length);
}

/**
 * Format memory usage in human-readable format
 */
export function formatMemoryUsage(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${Math.round(size * 100) / 100} ${units[unitIndex]}`;
}

/**
 * Format throughput (items per second)
 */
export function formatThroughput(count: number, timeMs: number): string {
  if (timeMs === 0) return '∞ items/s';
  const itemsPerSecond = (count / timeMs) * 1000;
  return `${Math.round(itemsPerSecond * 100) / 100} items/s`;
}