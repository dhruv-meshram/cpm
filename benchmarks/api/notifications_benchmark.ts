import { runBenchmark, saveResultToCsv, getAuthCookie, isMainModule } from './benchmark_utils';

export async function runNotificationsBenchmarks(baseUrl: string, durationSec: number, concurrency: number) {
  console.log('\n--- Running Notifications API Benchmarks ---');
  
  const cookie = await getAuthCookie(baseUrl);

  // 1. List Notifications
  const listUrl = `${baseUrl}/api/v1/notifications`;
  console.log(`Benchmarking GET ${listUrl}...`);
  const listResult = await runBenchmark(
    'notifications/list',
    listUrl,
    {
      method: 'GET',
      headers: { 'Cookie': cookie },
    },
    concurrency,
    durationSec
  );
  saveResultToCsv('notifications', listResult);
  console.log(`  Throughput: ${listResult.throughputRps} RPS | Avg Latency: ${listResult.avgLatencyMs} ms`);

  // 2. Unread count
  const countUrl = `${baseUrl}/api/v1/notifications/count`;
  console.log(`Benchmarking GET ${countUrl}...`);
  const countResult = await runBenchmark(
    'notifications/count',
    countUrl,
    {
      method: 'GET',
      headers: { 'Cookie': cookie },
    },
    concurrency,
    durationSec
  );
  saveResultToCsv('notifications', countResult);
  console.log(`  Throughput: ${countResult.throughputRps} RPS | Avg Latency: ${countResult.avgLatencyMs} ms`);

  // 3. Notification summary
  const summaryUrl = `${baseUrl}/api/v1/notifications/summary`;
  console.log(`Benchmarking GET ${summaryUrl}...`);
  const summaryResult = await runBenchmark(
    'notifications/summary',
    summaryUrl,
    {
      method: 'GET',
      headers: { 'Cookie': cookie },
    },
    concurrency,
    durationSec
  );
  saveResultToCsv('notifications', summaryResult);
  console.log(`  Throughput: ${summaryResult.throughputRps} RPS | Avg Latency: ${summaryResult.avgLatencyMs} ms`);
}

if (isMainModule(import.meta.url)) {
  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
  const duration = parseInt(process.env.DURATION || '3', 10);
  const concurrency = parseInt(process.env.CONCURRENCY || '5', 10);
  runNotificationsBenchmarks(baseUrl, duration, concurrency).catch(console.error);
}
