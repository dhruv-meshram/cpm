import { runBenchmark, saveResultToCsv, getAuthCookie, isMainModule } from './benchmark_utils';

export async function runUsersBenchmarks(baseUrl: string, durationSec: number, concurrency: number) {
  console.log('\n--- Running Users API Benchmarks ---');
  
  const cookie = await getAuthCookie(baseUrl);

  // 1. Get current user profile
  const meUrl = `${baseUrl}/api/v1/users/me`;
  console.log(`Benchmarking GET ${meUrl}...`);
  const getMeResult = await runBenchmark(
    'users/me/get',
    meUrl,
    {
      method: 'GET',
      headers: { 'Cookie': cookie },
    },
    concurrency,
    durationSec
  );
  saveResultToCsv('users', getMeResult);
  console.log(`  Throughput: ${getMeResult.throughputRps} RPS | Avg Latency: ${getMeResult.avgLatencyMs} ms`);

  // 2. Update current user profile
  console.log(`Benchmarking PUT ${meUrl}...`);
  const putMeResult = await runBenchmark(
    'users/me/update',
    meUrl,
    {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': cookie 
      },
      body: JSON.stringify({
        name: 'benchmark_updated',
      }),
    },
    concurrency,
    durationSec
  );
  saveResultToCsv('users', putMeResult);
  console.log(`  Throughput: ${putMeResult.throughputRps} RPS | Avg Latency: ${putMeResult.avgLatencyMs} ms`);

  // 3. Update password (tested with invalid current password to benchmark hashing verification CPU latency safely)
  const passwordUrl = `${baseUrl}/api/v1/users/me/password`;
  console.log(`Benchmarking PUT ${passwordUrl} (safe verification load)...`);
  const passwordResult = await runBenchmark(
    'users/me/password',
    passwordUrl,
    {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': cookie 
      },
      body: JSON.stringify({
        currentPassword: 'WrongPassword123!',
        newPassword: 'NewPassword123!',
      }),
    },
    concurrency,
    durationSec
  );
  saveResultToCsv('users', passwordResult);
  console.log(`  Throughput: ${passwordResult.throughputRps} RPS | Avg Latency: ${passwordResult.avgLatencyMs} ms`);
}

if (isMainModule(import.meta.url)) {
  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
  const duration = parseInt(process.env.DURATION || '3', 10);
  const concurrency = parseInt(process.env.CONCURRENCY || '5', 10);
  runUsersBenchmarks(baseUrl, duration, concurrency).catch(console.error);
}
