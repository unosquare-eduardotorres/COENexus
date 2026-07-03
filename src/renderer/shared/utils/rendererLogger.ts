type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  module: string;
  message: string;
  data?: unknown;
  error?: { message: string; stack?: string };
}

function createRendererLogger(module: string) {
  const log = (level: LogLevel, message: string, data?: unknown) => {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      module,
      message,
      ...(data instanceof Error
        ? { error: { message: data.message, stack: data.stack } }
        : data !== undefined
          ? { data }
          : {}),
    };

    const consoleFn =
      level === 'error'
        ? console.error
        : level === 'warn'
          ? console.warn
          : level === 'debug'
            ? console.debug
            : console.log;
    consoleFn(`[${entry.module}]`, message, data instanceof Error ? data : (data ?? ''));

    if (level === 'error' && window.api?.bug) {
      try {
        window.api.bug.report?.({
          message: `${module}: ${message}`,
          stack: entry.error?.stack,
          scope: 'Renderer',
          url: window.location.hash,
        });
      } catch {}
    }
  };

  return {
    debug: (msg: string, data?: unknown) => log('debug', msg, data),
    info: (msg: string, data?: unknown) => log('info', msg, data),
    warn: (msg: string, data?: unknown) => log('warn', msg, data),
    error: (msg: string, data?: unknown) => log('error', msg, data),
  };
}

export { createRendererLogger };
export type { LogEntry, LogLevel };
