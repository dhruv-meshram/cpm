import { runBenchmark, saveResultToCsv, getAuthCookie, createSandboxProject, deleteSandboxProject, isMainModule } from './benchmark_utils';

export async function runCpmBenchmarks(baseUrl: string, durationSec: number, concurrency: number) {
  console.log('\n--- Running CPM Engine API Benchmarks ---');
  
  const cookie = await getAuthCookie(baseUrl);
  const sandbox = await createSandboxProject(baseUrl, cookie);
  const projectId = sandbox.id;

  // Add tasks and dependencies to form a simple graph
  const tasksUrl = `${baseUrl}/api/v1/projects/${projectId}/tasks`;
  const depsUrl = `${baseUrl}/api/v1/projects/${projectId}/dependencies`;

  const createTask = async (name: string, dur: number) => {
    const res = await fetch(tasksUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookie,
      },
      body: JSON.stringify({ title: name, duration: dur }),
    });
    if (!res.ok) throw new Error(`Setup error: failed to create task for CPM test`);
    return (await res.json()).id;
  };

  const idA = await createTask('Task A', 5);
  const idB = await createTask('Task B', 3);
  const idC = await createTask('Task C', 2);

  const createDep = async (from: string, to: string) => {
    const res = await fetch(depsUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookie,
      },
      body: JSON.stringify({ predecessorTaskId: from, successorTaskId: to }),
    });
    if (!res.ok) throw new Error(`Setup error: failed to create dependency for CPM test`);
  };

  await createDep(idA, idB);
  await createDep(idB, idC);

  // 1. Run CPM calculations
  const runCpmUrl = `${baseUrl}/api/v1/projects/${projectId}/cpm/run`;
  console.log(`Benchmarking POST ${runCpmUrl}...`);
  const runCpmResult = await runBenchmark(
    'cpm/run',
    runCpmUrl,
    {
      method: 'POST',
      headers: { 'Cookie': cookie },
    },
    concurrency,
    durationSec
  );
  saveResultToCsv('cpm', runCpmResult);
  console.log(`  Throughput: ${runCpmResult.throughputRps} RPS | Avg Latency: ${runCpmResult.avgLatencyMs} ms`);

  // Ensure calculations have run at least once so results exist
  await fetch(runCpmUrl, { method: 'POST', headers: { 'Cookie': cookie } });

  // 2. Fetch CPM metrics
  const metricsUrl = `${baseUrl}/api/v1/projects/${projectId}/cpm/metrics`;
  console.log(`Benchmarking GET ${metricsUrl}...`);
  const metricsResult = await runBenchmark(
    'cpm/metrics',
    metricsUrl,
    {
      method: 'GET',
      headers: { 'Cookie': cookie },
    },
    concurrency,
    durationSec
  );
  saveResultToCsv('cpm', metricsResult);
  console.log(`  Throughput: ${metricsResult.throughputRps} RPS | Avg Latency: ${metricsResult.avgLatencyMs} ms`);

  // 3. Fetch CPM results
  const resultsUrl = `${baseUrl}/api/v1/projects/${projectId}/cpm/results`;
  console.log(`Benchmarking GET ${resultsUrl}...`);
  const resultsResult = await runBenchmark(
    'cpm/results',
    resultsUrl,
    {
      method: 'GET',
      headers: { 'Cookie': cookie },
    },
    concurrency,
    durationSec
  );
  saveResultToCsv('cpm', resultsResult);
  console.log(`  Throughput: ${resultsResult.throughputRps} RPS | Avg Latency: ${resultsResult.avgLatencyMs} ms`);

  // 4. Export Project
  const exportUrl = `${baseUrl}/api/v1/projects/${projectId}/export`;
  console.log(`Benchmarking GET ${exportUrl}...`);
  const exportResult = await runBenchmark(
    'projects/export',
    exportUrl,
    {
      method: 'GET',
      headers: { 'Cookie': cookie },
    },
    concurrency,
    durationSec
  );
  saveResultToCsv('cpm', exportResult);
  console.log(`  Throughput: ${exportResult.throughputRps} RPS | Avg Latency: ${exportResult.avgLatencyMs} ms`);

  // Clean up
  await deleteSandboxProject(baseUrl, cookie, projectId);
}

if (isMainModule(import.meta.url)) {
  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
  const duration = parseInt(process.env.DURATION || '3', 10);
  const concurrency = parseInt(process.env.CONCURRENCY || '5', 10);
  runCpmBenchmarks(baseUrl, duration, concurrency).catch(console.error);
}
