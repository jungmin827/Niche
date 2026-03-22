export const logger = {
  info(message: string, meta?: unknown) {
    console.log(`[NichE] ${message}`, meta ?? '');
  },
  warn(message: string, meta?: unknown) {
    console.warn(`[NichE] ${message}`, meta ?? '');
  },
  error(message: string, meta?: unknown) {
    console.error(`[NichE] ${message}`, meta ?? '');
  },
};
