import { runBenchmark, saveResultToCsv, getAuthCookie, isMainModule } from './benchmark_utils';

export async function runAuthBenchmarks(baseUrl: string, durationSec: number, concurrency: number) {
  console.log('\n--- Running Authentication API Benchmarks ---');
  
  // 1. Signup endpoint (we use randomized emails to avoid duplicate conflicts)
  const signupUrl = `${baseUrl}/api/v1/auth/signup`;
  console.log(`Benchmarking POST ${signupUrl}...`);
  const signupResult = await runBenchmark(
    'auth/signup',
    signupUrl,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      get body() {
        const id = Math.random().toString(36).substring(7);
        return JSON.stringify({
          name: `user_${id}`,
          email: `user_${id}@example.com`,
          password: 'Password123!',
        });
      }
    },
    concurrency,
    durationSec
  );
  saveResultToCsv('auth', signupResult);
  console.log(`  Throughput: ${signupResult.throughputRps} RPS | Avg Latency: ${signupResult.avgLatencyMs} ms`);

  // 2. Login endpoint
  const loginUrl = `${baseUrl}/api/v1/auth/login`;
  console.log(`Benchmarking POST ${loginUrl}...`);
  const loginResult = await runBenchmark(
    'auth/login',
    loginUrl,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test123@gmail.com',
        password: 'Password123!',
      }),
    },
    concurrency,
    durationSec
  );
  saveResultToCsv('auth', loginResult);
  console.log(`  Throughput: ${loginResult.throughputRps} RPS | Avg Latency: ${loginResult.avgLatencyMs} ms`);

  // Get a valid cookie to test session-based auth routes
  const cookie = await getAuthCookie(baseUrl);

  // 3. Token endpoint (Protected route check)
  const tokenUrl = `${baseUrl}/api/v1/auth/token`;
  console.log(`Benchmarking GET ${tokenUrl}...`);
  const tokenResult = await runBenchmark(
    'auth/token',
    tokenUrl,
    {
      method: 'GET',
      headers: { 'Cookie': cookie },
    },
    concurrency,
    durationSec
  );
  saveResultToCsv('auth', tokenResult);
  console.log(`  Throughput: ${tokenResult.throughputRps} RPS | Avg Latency: ${tokenResult.avgLatencyMs} ms`);

  // 4. Refresh token endpoint
  const refreshUrl = `${baseUrl}/api/v1/auth/refresh`;
  console.log(`Benchmarking POST ${refreshUrl}...`);
  const refreshResult = await runBenchmark(
    'auth/refresh',
    refreshUrl,
    {
      method: 'POST',
      headers: { 'Cookie': cookie },
    },
    concurrency,
    durationSec
  );
  saveResultToCsv('auth', refreshResult);
  console.log(`  Throughput: ${refreshResult.throughputRps} RPS | Avg Latency: ${refreshResult.avgLatencyMs} ms`);

  // 5. Logout endpoint
  const logoutUrl = `${baseUrl}/api/v1/auth/logout`;
  console.log(`Benchmarking POST ${logoutUrl}...`);
  const logoutResult = await runBenchmark(
    'auth/logout',
    logoutUrl,
    {
      method: 'POST',
      headers: { 'Cookie': cookie },
    },
    concurrency,
    durationSec
  );
  saveResultToCsv('auth', logoutResult);
  console.log(`  Throughput: ${logoutResult.throughputRps} RPS | Avg Latency: ${logoutResult.avgLatencyMs} ms`);
}

// Support running this script directly
if (isMainModule(import.meta.url)) {
  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
  const duration = parseInt(process.env.DURATION || '3', 10);
  const concurrency = parseInt(process.env.CONCURRENCY || '5', 10);
  runAuthBenchmarks(baseUrl, duration, concurrency).catch(console.error);
}
