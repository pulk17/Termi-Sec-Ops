/**
 * Console logger utility for capturing and broadcasting scan progress
 */

type LogLevel = 'info' | 'success' | 'error' | 'warning';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
  scanId?: string;
}

type LogListener = (entry: LogEntry) => void;

class ConsoleLogger {
  private listeners: Map<string, LogListener[]> = new Map();
  private originalConsole = {
    log: console.log,
    error: console.error,
    warn: console.warn,
    info: console.info,
  };

  constructor() {
    this.interceptConsole();
  }

  private interceptConsole() {
    // Intercept console.log
    console.log = (...args: any[]) => {
      this.originalConsole.log(...args);
      this.broadcastLog('info', args.join(' '));
    };

    // Intercept console.error
    console.error = (...args: any[]) => {
      this.originalConsole.error(...args);
      this.broadcastLog('error', args.join(' '));
    };

    // Intercept console.warn
    console.warn = (...args: any[]) => {
      this.originalConsole.warn(...args);
      this.broadcastLog('warning', args.join(' '));
    };

    // Intercept console.info
    console.info = (...args: any[]) => {
      this.originalConsole.info(...args);
      this.broadcastLog('info', args.join(' '));
    };
  }

  private broadcastLog(level: LogLevel, message: string) {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date(),
    };

    // Broadcast to all listeners
    this.listeners.forEach((listeners) => {
      listeners.forEach((listener) => listener(entry));
    });
  }

  addListener(scanId: string, listener: LogListener) {
    if (!this.listeners.has(scanId)) {
      this.listeners.set(scanId, []);
    }
    this.listeners.get(scanId)!.push(listener);
  }

  removeListener(scanId: string, listener: LogListener) {
    const listeners = this.listeners.get(scanId);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
      if (listeners.length === 0) {
        this.listeners.delete(scanId);
      }
    }
  }

  clearListeners(scanId: string) {
    this.listeners.delete(scanId);
  }

  restore() {
    console.log = this.originalConsole.log;
    console.error = this.originalConsole.error;
    console.warn = this.originalConsole.warn;
    console.info = this.originalConsole.info;
  }
}

// Singleton instance
export const consoleLogger = new ConsoleLogger();
