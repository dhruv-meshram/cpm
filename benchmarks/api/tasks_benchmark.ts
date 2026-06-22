import { runBenchmark, saveResultToCsv, getAuthCookie, createSandboxProject, deleteSandboxProject, isMainModule } from './benchmark_utils';

export async function runTasksBenchmarks(baseUrl: string, durationSec: number, concurrency: number) {
  console.log('\n--- Running Tasks API Benchmarks ---');
  
  const cookie = await getAuthCookie(baseUrl);
  const sandbox = await createSandboxProject(baseUrl, cookie);
  const projectId = sandbox.id;

  // Setup a department to use for bulk move tests
  const deptRes = await fetch(`${baseUrl}/api/v1/projects/${projectId}/departments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': cookie,
    },
    body: JSON.stringify({
      name: 'Task Dept',
      description: 'Used for task move test',
      color: '#00bcd4',
    }),
  });
  if (!deptRes.ok) {
    throw new Error(`Failed to set up dept for task benchmarks: ${deptRes.status}`);
  }
  const dept = await deptRes.json();
  const departmentId = dept.id;

  // 1. List Tasks
  const listUrl = `${baseUrl}/api/v1/projects/${projectId}/tasks`;
  console.log(`Benchmarking GET ${listUrl}...`);
  const listResult = await runBenchmark(
    'tasks/list',
    listUrl,
    {
      method: 'GET',
      headers: { 'Cookie': cookie },
    },
    concurrency,
    durationSec
  );
  saveResultToCsv('tasks', listResult);
  console.log(`  Throughput: ${listResult.throughputRps} RPS | Avg Latency: ${listResult.avgLatencyMs} ms`);

  // 2. Create Task
  console.log(`Benchmarking POST ${listUrl}...`);
  const createResult = await runBenchmark(
    'tasks/create',
    listUrl,
    {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': cookie 
      },
      get body() {
        return JSON.stringify({
          title: `Bench Task ${Math.random().toString(36).substring(7)}`,
          description: 'Load testing task creation',
          duration: Math.floor(Math.random() * 10) + 1,
          state: 'TODO',
        });
      }
    },
    concurrency,
    durationSec
  );
  saveResultToCsv('tasks', createResult);
  console.log(`  Throughput: ${createResult.throughputRps} RPS | Avg Latency: ${createResult.avgLatencyMs} ms`);

  // Create a stable task for details, update, approval, and delete tests
  const setupTaskRes = await fetch(listUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': cookie,
    },
    body: JSON.stringify({
      title: 'Stable Task',
      description: 'Task for detail/approval tests',
      duration: 5,
      state: 'REVIEW',
    }),
  });
  if (!setupTaskRes.ok) {
    throw new Error(`Failed to create stable task: ${setupTaskRes.status}`);
  }
  const stableTask = await setupTaskRes.json();
  const taskId = stableTask.id;

  // 3. Get Task Detail
  const detailUrl = `${baseUrl}/api/v1/projects/${projectId}/tasks/${taskId}`;
  console.log(`Benchmarking GET ${detailUrl}...`);
  const detailResult = await runBenchmark(
    'tasks/detail',
    detailUrl,
    {
      method: 'GET',
      headers: { 'Cookie': cookie },
    },
    concurrency,
    durationSec
  );
  saveResultToCsv('tasks', detailResult);
  console.log(`  Throughput: ${detailResult.throughputRps} RPS | Avg Latency: ${detailResult.avgLatencyMs} ms`);

  // 4. Update Task
  console.log(`Benchmarking PUT ${detailUrl}...`);
  const updateResult = await runBenchmark(
    'tasks/update',
    detailUrl,
    {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': cookie 
      },
      body: JSON.stringify({
        title: 'Updated Stable Task',
        duration: 8,
      }),
    },
    concurrency,
    durationSec
  );
  saveResultToCsv('tasks', updateResult);
  console.log(`  Throughput: ${updateResult.throughputRps} RPS | Avg Latency: ${updateResult.avgLatencyMs} ms`);

  // 5. Task Approval (POST to tasks/[taskId]/approval)
  const approvalUrl = `${baseUrl}/api/v1/projects/${projectId}/tasks/${taskId}/approval`;
  console.log(`Benchmarking POST ${approvalUrl}...`);
  const approvalResult = await runBenchmark(
    'tasks/approval',
    approvalUrl,
    {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': cookie 
      },
      body: JSON.stringify({
        approved: true,
        feedback: 'Looks good'
      }),
    },
    concurrency,
    durationSec
  );
  saveResultToCsv('tasks', approvalResult);
  console.log(`  Throughput: ${approvalResult.throughputRps} RPS | Avg Latency: ${approvalResult.avgLatencyMs} ms`);

  // 6. Bulk Move Department
  const bulkMoveUrl = `${baseUrl}/api/v1/projects/${projectId}/tasks/bulk-move-department`;
  console.log(`Benchmarking POST ${bulkMoveUrl}...`);
  const bulkMoveResult = await runBenchmark(
    'tasks/bulk-move-dept',
    bulkMoveUrl,
    {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': cookie 
      },
      body: JSON.stringify({
        taskIds: [taskId],
        targetDepartmentId: departmentId,
      }),
    },
    concurrency,
    durationSec
  );
  saveResultToCsv('tasks', bulkMoveResult);
  console.log(`  Throughput: ${bulkMoveResult.throughputRps} RPS | Avg Latency: ${bulkMoveResult.avgLatencyMs} ms`);

  // 7. Bulk Import Tasks
  const bulkImportUrl = `${baseUrl}/api/v1/projects/${projectId}/tasks/bulk-import`;
  console.log(`Benchmarking POST ${bulkImportUrl}...`);
  const bulkImportResult = await runBenchmark(
    'tasks/bulk-import',
    bulkImportUrl,
    {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': cookie 
      },
      get body() {
        const idA = Math.random().toString(36).substring(7);
        const idB = Math.random().toString(36).substring(7);
        return JSON.stringify({
          tasks: [
            { id: idA, name: `Task_${idA}`, durationHours: 10 },
            { id: idB, name: `Task_${idB}`, durationHours: 20 }
          ],
          dependencies: [
            { from: idA, to: idB, type: 1 }
          ]
        });
      }
    },
    concurrency,
    durationSec
  );
  saveResultToCsv('tasks', bulkImportResult);
  console.log(`  Throughput: ${bulkImportResult.throughputRps} RPS | Avg Latency: ${bulkImportResult.avgLatencyMs} ms`);

  // 8. Delete Task
  console.log(`Benchmarking DELETE ${detailUrl}...`);
  const deleteResult = await runBenchmark(
    'tasks/delete',
    detailUrl,
    {
      method: 'DELETE',
      headers: { 'Cookie': cookie },
    },
    concurrency,
    durationSec
  );
  saveResultToCsv('tasks', deleteResult);
  console.log(`  Throughput: ${deleteResult.throughputRps} RPS | Avg Latency: ${deleteResult.avgLatencyMs} ms`);

  // Clean up sandbox project
  await deleteSandboxProject(baseUrl, cookie, projectId);
}

if (isMainModule(import.meta.url)) {
  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
  const duration = parseInt(process.env.DURATION || '3', 10);
  const concurrency = parseInt(process.env.CONCURRENCY || '5', 10);
  runTasksBenchmarks(baseUrl, duration, concurrency).catch(console.error);
}
