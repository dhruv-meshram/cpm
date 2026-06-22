import { runBenchmark, saveResultToCsv, getAuthCookie, createSandboxProject, deleteSandboxProject, isMainModule } from './benchmark_utils';

export async function runProjectsBenchmarks(baseUrl: string, durationSec: number, concurrency: number) {
  console.log('\n--- Running Projects API Benchmarks ---');
  
  const cookie = await getAuthCookie(baseUrl);

  // 1. List Projects
  const listUrl = `${baseUrl}/api/v1/projects`;
  console.log(`Benchmarking GET ${listUrl}...`);
  const listResult = await runBenchmark(
    'projects/list',
    listUrl,
    {
      method: 'GET',
      headers: { 'Cookie': cookie },
    },
    concurrency,
    durationSec
  );
  saveResultToCsv('projects', listResult);
  console.log(`  Throughput: ${listResult.throughputRps} RPS | Avg Latency: ${listResult.avgLatencyMs} ms`);

  // 2. Create Project
  console.log(`Benchmarking POST ${listUrl}...`);
  const createdProjectIds: string[] = [];
  const createResult = await runBenchmark(
    'projects/create',
    listUrl,
    {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': cookie 
      },
      get body() {
        return JSON.stringify({
          name: `Bench Project ${Math.random().toString(36).substring(7)}`,
          description: 'Load testing project creation',
          startDate: new Date().toISOString(),
        });
      }
    },
    concurrency,
    durationSec
  );
  saveResultToCsv('projects', createResult);
  console.log(`  Throughput: ${createResult.throughputRps} RPS | Avg Latency: ${createResult.avgLatencyMs} ms`);

  // Establish a stable sandbox project for detail queries
  const sandbox = await createSandboxProject(baseUrl, cookie);
  const projectId = sandbox.id;

  // 3. Get Project Detail
  const detailUrl = `${baseUrl}/api/v1/projects/${projectId}`;
  console.log(`Benchmarking GET ${detailUrl}...`);
  const detailResult = await runBenchmark(
    'projects/detail',
    detailUrl,
    {
      method: 'GET',
      headers: { 'Cookie': cookie },
    },
    concurrency,
    durationSec
  );
  saveResultToCsv('projects', detailResult);
  console.log(`  Throughput: ${detailResult.throughputRps} RPS | Avg Latency: ${detailResult.avgLatencyMs} ms`);

  // 4. Update Project (PUT)
  console.log(`Benchmarking PUT ${detailUrl}...`);
  const updateResult = await runBenchmark(
    'projects/update',
    detailUrl,
    {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': cookie 
      },
      body: JSON.stringify({
        name: `Updated Sandbox Project`,
        description: 'Updated load testing project description',
      }),
    },
    concurrency,
    durationSec
  );
  saveResultToCsv('projects', updateResult);
  console.log(`  Throughput: ${updateResult.throughputRps} RPS | Avg Latency: ${updateResult.avgLatencyMs} ms`);

  // 5. Project Overview
  const overviewUrl = `${baseUrl}/api/v1/projects/${projectId}/overview`;
  console.log(`Benchmarking GET ${overviewUrl}...`);
  const overviewResult = await runBenchmark(
    'projects/overview',
    overviewUrl,
    {
      method: 'GET',
      headers: { 'Cookie': cookie },
    },
    concurrency,
    durationSec
  );
  saveResultToCsv('projects', overviewResult);
  console.log(`  Throughput: ${overviewResult.throughputRps} RPS | Avg Latency: ${overviewResult.avgLatencyMs} ms`);

  // 6. Project Activity
  const activityUrl = `${baseUrl}/api/v1/projects/${projectId}/activity`;
  console.log(`Benchmarking GET ${activityUrl}...`);
  const activityResult = await runBenchmark(
    'projects/activity',
    activityUrl,
    {
      method: 'GET',
      headers: { 'Cookie': cookie },
    },
    concurrency,
    durationSec
  );
  saveResultToCsv('projects', activityResult);
  console.log(`  Throughput: ${activityResult.throughputRps} RPS | Avg Latency: ${activityResult.avgLatencyMs} ms`);

  // 7. Project Members
  const membersUrl = `${baseUrl}/api/v1/projects/${projectId}/members`;
  console.log(`Benchmarking GET ${membersUrl}...`);
  const membersResult = await runBenchmark(
    'projects/members/list',
    membersUrl,
    {
      method: 'GET',
      headers: { 'Cookie': cookie },
    },
    concurrency,
    durationSec
  );
  saveResultToCsv('projects', membersResult);
  console.log(`  Throughput: ${membersResult.throughputRps} RPS | Avg Latency: ${membersResult.avgLatencyMs} ms`);

  // 8. Project Roles
  const rolesUrl = `${baseUrl}/api/v1/projects/${projectId}/roles`;
  console.log(`Benchmarking GET ${rolesUrl}...`);
  const rolesResult = await runBenchmark(
    'projects/roles',
    rolesUrl,
    {
      method: 'GET',
      headers: { 'Cookie': cookie },
    },
    concurrency,
    durationSec
  );
  saveResultToCsv('projects', rolesResult);
  console.log(`  Throughput: ${rolesResult.throughputRps} RPS | Avg Latency: ${rolesResult.avgLatencyMs} ms`);

  // 9. Add Project Member (Benchmark adding simulated users)
  console.log(`Benchmarking POST ${membersUrl}...`);
  const addMemberResult = await runBenchmark(
    'projects/members/add',
    membersUrl,
    {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': cookie 
      },
      get body() {
        return JSON.stringify({
          email: `nonexistent_user_${Math.random().toString(36).substring(7)}@example.com`,
          role: 'Contributor'
        });
      }
    },
    concurrency,
    durationSec
  );
  saveResultToCsv('projects', addMemberResult);
  console.log(`  Throughput: ${addMemberResult.throughputRps} RPS | Avg Latency: ${addMemberResult.avgLatencyMs} ms`);

  // Cleanup
  console.log('Cleaning up sandbox projects...');
  await deleteSandboxProject(baseUrl, cookie, projectId);

  // Attempt cleanup of any other created projects if we can find them
  try {
    const listRes = await fetch(listUrl, { headers: { 'Cookie': cookie } });
    if (listRes.ok) {
      const listData = await listRes.json();
      const projList = listData.data || [];
      for (const p of projList) {
        if (p.name.startsWith('Bench Project ')) {
          await deleteSandboxProject(baseUrl, cookie, p.id);
        }
      }
    }
  } catch (e) {
    // Ignore cleanup errors
  }
}

if (isMainModule(import.meta.url)) {
  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
  const duration = parseInt(process.env.DURATION || '3', 10);
  const concurrency = parseInt(process.env.CONCURRENCY || '5', 10);
  runProjectsBenchmarks(baseUrl, duration, concurrency).catch(console.error);
}
