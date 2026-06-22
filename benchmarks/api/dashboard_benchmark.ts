import { runBenchmark, saveResultToCsv, getAuthCookie, isMainModule } from './benchmark_utils';

export async function runDashboardBenchmarks(baseUrl: string, durationSec: number, concurrency: number) {
  console.log('\n--- Running Dashboard API Benchmarks ---');
  
  const cookie = await getAuthCookie(baseUrl);

  // 1. Dashboard Stats
  const statsUrl = `${baseUrl}/api/v1/dashboard/stats`;
  console.log(`Benchmarking GET ${statsUrl}...`);
  const statsResult = await runBenchmark(
    'dashboard/stats',
    statsUrl,
    {
      method: 'GET',
      headers: { 'Cookie': cookie },
    },
    concurrency,
    durationSec
  );
  saveResultToCsv('dashboard', statsResult);
  console.log(`  Throughput: ${statsResult.throughputRps} RPS | Avg Latency: ${statsResult.avgLatencyMs} ms`);

  // 2. Dashboard Activity Feed
  const activityUrl = `${baseUrl}/api/v1/dashboard/activity`;
  console.log(`Benchmarking GET ${activityUrl}...`);
  const activityResult = await runBenchmark(
    'dashboard/activity',
    activityUrl,
    {
      method: 'GET',
      headers: { 'Cookie': cookie },
    },
    concurrency,
    durationSec
  );
  saveResultToCsv('dashboard', activityResult);
  console.log(`  Throughput: ${activityResult.throughputRps} RPS | Avg Latency: ${activityResult.avgLatencyMs} ms`);

  // 3. Dashboard Recent Projects
  const recentUrl = `${baseUrl}/api/v1/dashboard/recent-projects`;
  console.log(`Benchmarking GET ${recentUrl}...`);
  const recentResult = await runBenchmark(
    'dashboard/recent-projects',
    recentUrl,
    {
      method: 'GET',
      headers: { 'Cookie': cookie },
    },
    concurrency,
    durationSec
  );
  saveResultToCsv('dashboard', recentResult);
  console.log(`  Throughput: ${recentResult.throughputRps} RPS | Avg Latency: ${recentResult.avgLatencyMs} ms`);

  // 4. Dashboard Upcoming Milestones
  const milestonesUrl = `${baseUrl}/api/v1/dashboard/upcoming-milestones`;
  console.log(`Benchmarking GET ${milestonesUrl}...`);
  const milestonesResult = await runBenchmark(
    'dashboard/upcoming-milestones',
    milestonesUrl,
    {
      method: 'GET',
      headers: { 'Cookie': cookie },
    },
    concurrency,
    durationSec
  );
  saveResultToCsv('dashboard', milestonesResult);
  console.log(`  Throughput: ${milestonesResult.throughputRps} RPS | Avg Latency: ${milestonesResult.avgLatencyMs} ms`);
}

if (isMainModule(import.meta.url)) {
  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
  const duration = parseInt(process.env.DURATION || '3', 10);
  const concurrency = parseInt(process.env.CONCURRENCY || '5', 10);
  runDashboardBenchmarks(baseUrl, duration, concurrency).catch(console.error);
}
