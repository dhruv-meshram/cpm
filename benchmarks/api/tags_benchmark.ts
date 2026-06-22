import { runBenchmark, saveResultToCsv, getAuthCookie, createSandboxProject, deleteSandboxProject, isMainModule } from './benchmark_utils';

export async function runTagsBenchmarks(baseUrl: string, durationSec: number, concurrency: number) {
  console.log('\n--- Running Tags API Benchmarks ---');
  
  const cookie = await getAuthCookie(baseUrl);
  const sandbox = await createSandboxProject(baseUrl, cookie);
  const projectId = sandbox.id;

  // 1. List tags in the project
  const listUrl = `${baseUrl}/api/v1/projects/${projectId}/tags`;
  console.log(`Benchmarking GET ${listUrl}...`);
  const listResult = await runBenchmark(
    'tags/list',
    listUrl,
    {
      method: 'GET',
      headers: { 'Cookie': cookie },
    },
    concurrency,
    durationSec
  );
  saveResultToCsv('tags', listResult);
  console.log(`  Throughput: ${listResult.throughputRps} RPS | Avg Latency: ${listResult.avgLatencyMs} ms`);

  // 2. Create tag in the project
  console.log(`Benchmarking POST ${listUrl}...`);
  const createResult = await runBenchmark(
    'tags/create',
    listUrl,
    {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': cookie 
      },
      get body() {
        return JSON.stringify({
          name: `Tag_${Math.random().toString(36).substring(7)}`,
          color: '#' + Math.floor(Math.random() * 16777215).toString(16).padEnd(6, '0')
        });
      }
    },
    concurrency,
    durationSec
  );
  saveResultToCsv('tags', createResult);
  console.log(`  Throughput: ${createResult.throughputRps} RPS | Avg Latency: ${createResult.avgLatencyMs} ms`);

  // Setup stable tag for delete benchmarking
  const createRes = await fetch(listUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': cookie,
    },
    body: JSON.stringify({
      name: 'SandboxTag',
      color: '#4caf50',
    }),
  });

  if (!createRes.ok) {
    throw new Error(`Could not set up sandbox tag: ${createRes.status} ${await createRes.text()}`);
  }
  const stableTag = await createRes.json();
  const tagId = stableTag.id;

  // 3. Delete tag
  const deleteUrl = `${baseUrl}/api/v1/projects/${projectId}/tags/${tagId}`;
  console.log(`Benchmarking DELETE ${deleteUrl}...`);
  const deleteResult = await runBenchmark(
    'tags/delete',
    deleteUrl,
    {
      method: 'DELETE',
      headers: { 'Cookie': cookie },
    },
    concurrency,
    durationSec
  );
  saveResultToCsv('tags', deleteResult);
  console.log(`  Throughput: ${deleteResult.throughputRps} RPS | Avg Latency: ${deleteResult.avgLatencyMs} ms`);

  // Clean up project
  await deleteSandboxProject(baseUrl, cookie, projectId);
}

if (isMainModule(import.meta.url)) {
  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
  const duration = parseInt(process.env.DURATION || '3', 10);
  const concurrency = parseInt(process.env.CONCURRENCY || '5', 10);
  runTagsBenchmarks(baseUrl, duration, concurrency).catch(console.error);
}
