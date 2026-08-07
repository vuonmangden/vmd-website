export interface LogEntry {
  level: 'debug' | 'info' | 'warn' | 'error';
  timestamp: string;
  service: string;
  correlationId?: string;
  module?: string;
  event: string;
  data?: Record<string, unknown>;
  error?: string;
  stack?: string;
}

export class StructuredLogger {
  constructor(
    private readonly service: string,
    private readonly module?: string,
  ) {}

  debug(event: string, data?: Record<string, unknown>, correlationId?: string): void {
    this.log('debug', event, data, correlationId);
  }

  info(event: string, data?: Record<string, unknown>, correlationId?: string): void {
    this.log('info', event, data, correlationId);
  }

  warn(event: string, data?: Record<string, unknown>, correlationId?: string): void {
    this.log('warn', event, data, correlationId);
  }

  error(event: string, error?: Error | string, data?: Record<string, unknown>, correlationId?: string): void {
    const entry: LogEntry = {
      level: 'error',
      timestamp: new Date().toISOString(),
      service: this.service,
      event,
      ...(this.module ? { module: this.module } : {}),
      ...(correlationId ? { correlationId } : {}),
      ...(data ? { data } : {}),
      ...(error instanceof Error
        ? { error: error.message, stack: error.stack }
        : typeof error === 'string'
          ? { error }
          : {}),
    };
    process.stderr.write(JSON.stringify(entry) + '\n');
  }

  private log(
    level: 'debug' | 'info' | 'warn',
    event: string,
    data?: Record<string, unknown>,
    correlationId?: string,
  ): void {
    const entry: LogEntry = {
      level,
      timestamp: new Date().toISOString(),
      service: this.service,
      event,
      ...(this.module ? { module: this.module } : {}),
      ...(correlationId ? { correlationId } : {}),
      ...(data ? { data } : {}),
    };
    process.stdout.write(JSON.stringify(entry) + '\n');
  }
}
