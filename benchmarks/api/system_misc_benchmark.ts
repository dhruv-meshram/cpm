import { runBenchmark, saveResultToCsv, getAuthCookie, isMainModule } from './benchmark_utils';

export async function runSystemMiscBenchmarks(baseUrl: string, durationSec: number, concurrency: number) {
  console.log('\n--- Running System Miscellaneous API Benchmarks ---');
  
  const cookie = await getAuthCookie(baseUrl);

  // 1. Search Query
  const searchUrl = `${baseUrl}/api/v1/search?q=Task&suggestions=true`;
  console.log(`Benchmarking GET ${searchUrl}...`);
  const searchResult = await runBenchmark(
    'system/search',
    searchUrl,
    {
      method: 'GET',
      headers: { 'Cookie': cookie },
    },
    concurrency,
    durationSec
  );
  saveResultToCsv('system_misc', searchResult);
  console.log(`  Throughput: ${searchResult.throughputRps} RPS | Avg Latency: ${searchResult.avgLatencyMs} ms`);

  // 2. Task Stats
  const statsUrl = `${baseUrl}/api/v1/stats/tasks`;
  console.log(`Benchmarking GET ${statsUrl}...`);
  const statsResult = await runBenchmark(
    'system/task-stats',
    statsUrl,
    {
      method: 'GET',
      headers: { 'Cookie': cookie },
    },
    concurrency,
    durationSec
  );
  saveResultToCsv('system_misc', statsResult);
  console.log(`  Throughput: ${statsResult.throughputRps} RPS | Avg Latency: ${statsResult.avgLatencyMs} ms`);

  // 3. Workload Analysis
  const workloadUrl = `${baseUrl}/api/v1/workload`;
  console.log(`Benchmarking GET ${workloadUrl}...`);
  const workloadResult = await runBenchmark(
    'system/workload',
    workloadUrl,
    {
      method: 'GET',
      headers: { 'Cookie': cookie },
    },
    concurrency,
    durationSec
  );
  saveResultToCsv('system_misc', workloadResult);
  console.log(`  Throughput: ${workloadResult.throughputRps} RPS | Avg Latency: ${workloadResult.avgLatencyMs} ms`);

  // 4. Cache Metrics
  const cacheUrl = `${baseUrl}/api/v1/cache/metrics`;
  console.log(`Benchmarking GET ${cacheUrl}...`);
  const cacheResult = await runBenchmark(
    'system/cache-metrics',
    cacheUrl,
    {
      method: 'GET',
      headers: { 'Cookie': cookie },
    },
    concurrency,
    durationSec
  );
  saveResultToCsv('system_misc', cacheResult);
  console.log(`  Throughput: ${cacheResult.throughputRps} RPS | Avg Latency: ${cacheResult.avgLatencyMs} ms`);
}

if (isMainModule(import.meta.url)) {
  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
  const duration = parseInt(process.env.DURATION || '3', 10);
  const concurrency = parseInt(process.env.CONCURRENCY || '5', 10);
  runSystemMiscBenchmarks(baseUrl, duration, concurrency).catch(console.error);
}
