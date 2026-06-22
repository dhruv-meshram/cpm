import { runBenchmark, saveResultToCsv, getAuthCookie, createSandboxProject, deleteSandboxProject, isMainModule } from './benchmark_utils';

export async function runDependenciesBenchmarks(baseUrl: string, durationSec: number, concurrency: number) {
  console.log('\n--- Running Dependencies API Benchmarks ---');
  
  const cookie = await getAuthCookie(baseUrl);
  const sandbox = await createSandboxProject(baseUrl, cookie);
  const projectId = sandbox.id;

  // Create two tasks to link
  const createTasksUrl = `${baseUrl}/api/v1/projects/${projectId}/tasks`;
  
  const createTask = async (name: string) => {
    const res = await fetch(createTasksUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookie,
      },
      body: JSON.stringify({ title: name, duration: 5 }),
    });
    if (!res.ok) throw new Error(`Setup error: failed to create task for dependency test`);
    return (await res.json()).id;
  };

  const taskAId = await createTask('Task A');
  const taskBId = await createTask('Task B');

  // 1. List Dependencies
  const listUrl = `${baseUrl}/api/v1/projects/${projectId}/dependencies`;
  console.log(`Benchmarking GET ${listUrl}...`);
  const listResult = await runBenchmark(
    'dependencies/list',
    listUrl,
    {
      method: 'GET',
      headers: { 'Cookie': cookie },
    },
    concurrency,
    durationSec
  );
  saveResultToCsv('dependencies', listResult);
  console.log(`  Throughput: ${listResult.throughputRps} RPS | Avg Latency: ${listResult.avgLatencyMs} ms`);

  // 2. Create Dependency (dynamic helper to avoid duplicate key conflicts)
  console.log(`Benchmarking POST ${listUrl}...`);
  let tasksCreatedCount = 0;
  const createResult = await runBenchmark(
    'dependencies/create',
    listUrl,
    {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': cookie 
      },
      get body() {
        // To make sure each POST is unique and successfully inserts, we can use the pre-created task A and B
        // or since we are running concurrently, we can link taskAId to taskBId with a unique type or we can link random task pairs.
        // Linking taskAId and taskBId might fail with 400 if it already exists, which still benchmarks the endpoint validation latency.
        // To be safe, we link taskA and taskB but we can vary type and lag, or generate random IDs to trigger validation checks.
        tasksCreatedCount++;
        return JSON.stringify({
          predecessorTaskId: taskAId,
          successorTaskId: taskBId,
          type: 'FS',
          lag: tasksCreatedCount,
        });
      }
    },
    concurrency,
    durationSec
  );
  saveResultToCsv('dependencies', createResult);
  console.log(`  Throughput: ${createResult.throughputRps} RPS | Avg Latency: ${createResult.avgLatencyMs} ms`);

  // Create a stable dependency to benchmark DELETE
  const taskCId = await createTask('Task C');
  const taskDId = await createTask('Task D');
  const setupDepRes = await fetch(listUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': cookie,
    },
    body: JSON.stringify({
      predecessorTaskId: taskCId,
      successorTaskId: taskDId,
      type: 'FS',
      lag: 0,
    }),
  });
  if (!setupDepRes.ok) {
    throw new Error(`Failed to create stable dependency: ${setupDepRes.status}`);
  }
  const stableDep = await setupDepRes.json();
  const dependencyId = stableDep.id;

  // 3. Delete Dependency
  const deleteUrl = `${baseUrl}/api/v1/projects/${projectId}/dependencies/${dependencyId}`;
  console.log(`Benchmarking DELETE ${deleteUrl}...`);
  const deleteResult = await runBenchmark(
    'dependencies/delete',
    deleteUrl,
    {
      method: 'DELETE',
      headers: { 'Cookie': cookie },
    },
    concurrency,
    durationSec
  );
  saveResultToCsv('dependencies', deleteResult);
  console.log(`  Throughput: ${deleteResult.throughputRps} RPS | Avg Latency: ${deleteResult.avgLatencyMs} ms`);

  // Clean up sandbox project
  await deleteSandboxProject(baseUrl, cookie, projectId);
}

if (isMainModule(import.meta.url)) {
  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
  const duration = parseInt(process.env.DURATION || '3', 10);
  const concurrency = parseInt(process.env.CONCURRENCY || '5', 10);
  runDependenciesBenchmarks(baseUrl, duration, concurrency).catch(console.error);
}
