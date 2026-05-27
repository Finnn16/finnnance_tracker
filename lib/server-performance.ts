function isPerformanceLoggingEnabled() {
  return process.env.PERF_LOGGING === "true";
}

export async function measureServerOperation<T>(
  label: string,
  operation: () => Promise<T>,
) {
  if (!isPerformanceLoggingEnabled()) {
    return operation();
  }

  const startedAt = performance.now();

  try {
    return await operation();
  } finally {
    const duration = (performance.now() - startedAt).toFixed(1);
    console.info(`[perf] ${label}: ${duration}ms`);
  }
}
