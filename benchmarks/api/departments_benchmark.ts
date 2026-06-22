import { runBenchmark, saveResultToCsv, getAuthCookie, createSandboxProject, deleteSandboxProject, isMainModule } from './benchmark_utils';

export async function runDepartmentsBenchmarks(baseUrl: string, durationSec: number, concurrency: number) {
  console.log('\n--- Running Departments API Benchmarks ---');
  
  const cookie = await getAuthCookie(baseUrl);
  const sandbox = await createSandboxProject(baseUrl, cookie);
  const projectId = sandbox.id;

  // 1. List departments in the project
  const listUrl = `${baseUrl}/api/v1/projects/${projectId}/departments`;
  console.log(`Benchmarking GET ${listUrl}...`);
  const listResult = await runBenchmark(
    'departments/list',
    listUrl,
    {
      method: 'GET',
      headers: { 'Cookie': cookie },
    },
    concurrency,
    durationSec
  );
  saveResultToCsv('departments', listResult);
  console.log(`  Throughput: ${listResult.throughputRps} RPS | Avg Latency: ${listResult.avgLatencyMs} ms`);

  // 2. Create department in the project
  console.log(`Benchmarking POST ${listUrl}...`);
  const createResult = await runBenchmark(
    'departments/create',
    listUrl,
    {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': cookie 
      },
      get body() {
        return JSON.stringify({
          name: `Bench Dept ${Math.random().toString(36).substring(7)}`,
          description: 'Load testing department creation',
          color: '#' + Math.floor(Math.random() * 16777215).toString(16).padEnd(6, '0')
        });
      }
    },
    concurrency,
    durationSec
  );
  saveResultToCsv('departments', createResult);
  console.log(`  Throughput: ${createResult.throughputRps} RPS | Avg Latency: ${createResult.avgLatencyMs} ms`);

  // Setup a stable department for stats and delete benchmarks
  const createRes = await fetch(listUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': cookie,
    },
    body: JSON.stringify({
      name: 'Sandbox Department',
      description: 'Used for detail and deletion benchmarking',
      color: '#ff5722',
    }),
  });
  
  if (!createRes.ok) {
    throw new Error(`Could not set up sandbox department: ${createRes.status} ${await createRes.text()}`);
  }
  const stableDept = await createRes.json();
  const departmentId = stableDept.id;

  // 3. Department stats
  const statsUrl = `${baseUrl}/api/v1/departments/${departmentId}/stats`;
  console.log(`Benchmarking GET ${statsUrl}...`);
  const statsResult = await runBenchmark(
    'departments/stats',
    statsUrl,
    {
      method: 'GET',
      headers: { 'Cookie': cookie },
    },
    concurrency,
    durationSec
  );
  saveResultToCsv('departments', statsResult);
  console.log(`  Throughput: ${statsResult.throughputRps} RPS | Avg Latency: ${statsResult.avgLatencyMs} ms`);

  // 4. Delete department
  const deleteUrl = `${baseUrl}/api/v1/projects/${projectId}/departments/${departmentId}`;
  console.log(`Benchmarking DELETE ${deleteUrl}...`);
  const deleteResult = await runBenchmark(
    'departments/delete',
    deleteUrl,
    {
      method: 'DELETE',
      headers: { 'Cookie': cookie },
    },
    concurrency,
    durationSec
  );
  saveResultToCsv('departments', deleteResult);
  console.log(`  Throughput: ${deleteResult.throughputRps} RPS | Avg Latency: ${deleteResult.avgLatencyMs} ms`);

  // Clean up project
  await deleteSandboxProject(baseUrl, cookie, projectId);
}

if (isMainModule(import.meta.url)) {
  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
  const duration = parseInt(process.env.DURATION || '3', 10);
  const concurrency = parseInt(process.env.CONCURRENCY || '5', 10);
  runDepartmentsBenchmarks(baseUrl, duration, concurrency).catch(console.error);
}
