import { mkdirSync, appendFileSync, existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';

export interface BenchmarkResult {
  timestamp: string;
  endpoint: string;
  method: string;
  concurrency: number;
  durationSec: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  avgLatencyMs: number;
  medianLatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  throughputRps: number;
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: string;
}

/**
 * Ensures user is authenticated. Tries to login, and if the user doesn't exist,
 * signs them up first, then logs in. Returns the cookie header string.
 */
export async function getAuthCookie(baseUrl: string): Promise<string> {
  const email = 'test123@gmail.com';
  const password = 'Password123!';
  
  // Try logging in
  try {
    const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-bypass-rate-limit': 'true'
      },
      body: JSON.stringify({ email, password }),
    });
    
    if (res.status === 200) {
      const data = await res.json();
      return `accessToken=${data.accessToken}`;
    }
  } catch (err) {
    // console.warn('[benchmark] Direct login failed, attempting signup...');
  }

  // Signup
  try {
    await fetch(`${baseUrl}/api/v1/auth/signup`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-bypass-rate-limit': 'true'
      },
      body: JSON.stringify({ name: 'benchmark', email, password }),
    });
  } catch (err) {
    // console.warn('[benchmark] Signup failed or user already exists.');
  }

  // Try login again
  const loginRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'x-bypass-rate-limit': 'true'
    },
    body: JSON.stringify({ email, password }),
  });

  if (!loginRes.ok) {
    throw new Error(`Authentication failed with status ${loginRes.status}: ${await loginRes.text()}`);
  }

  const data = await loginRes.json();
  return `accessToken=${data.accessToken}`;
}

/**
 * Creates a sandbox project for testing project-dependent endpoints.
 */
export async function createSandboxProject(baseUrl: string, cookie: string): Promise<{ id: string; identifier: string }> {
  const res = await fetch(`${baseUrl}/api/v1/projects`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': cookie,
      'x-bypass-rate-limit': 'true',
    },
    body: JSON.stringify({
      name: `Benchmark Project ${Date.now()}`,
      description: 'Temporary workspace sandbox for API benchmarking',
      startDate: new Date().toISOString(),
    }),
  });

  if (!res.ok) {
    throw new Error(`Failed to create sandbox project: ${res.status} ${await res.text()}`);
  }

  const project = await res.json();
  return { id: project.id, identifier: project.identifier };
}

/**
 * Cleans up sandbox project.
 */
export async function deleteSandboxProject(baseUrl: string, cookie: string, projectId: string): Promise<void> {
  const res = await fetch(`${baseUrl}/api/v1/projects/${projectId}`, {
    method: 'DELETE',
    headers: { 
      'Cookie': cookie,
      'x-bypass-rate-limit': 'true'
    },  });
  if (!res.ok) {
    console.error(`[benchmark] Cleanup warning: Failed to delete sandbox project ${projectId}: ${res.status}`);
  }
}

/**
 * Helper to execute concurrent requests over a specific duration (seconds) or count.
 * Measures average, median, p95, p99 latencies, success/failure rate, and RPS throughput.
 */
export async function runBenchmark(
  name: string,
  url: string,
  options: RequestOptions,
  concurrency: number,
  durationSec: number
): Promise<BenchmarkResult> {
  const latencies: number[] = [];
  let successfulRequests = 0;
  let failedRequests = 0;
  
  const method = options.method || 'GET';
  const headers = {
    'x-bypass-rate-limit': 'true',
    ...(options.headers || {})
  };
  const body = options.body;

  const startTime = performance.now();
  const stopTime = startTime + durationSec * 1000;

  // Define a single worker loop
  const runWorker = async () => {
    while (performance.now() < stopTime) {
      const reqStart = performance.now();
      try {
        const fetchOptions: RequestInit = {
          method,
          headers,
          body,
        };
        const res = await fetch(url, fetchOptions);
        
        // Consume response body to ensure complete connection closure
        await res.text();
        
        const reqEnd = performance.now();
        latencies.push(reqEnd - reqStart);
        
        if (res.status >= 200 && res.status < 300) {
          successfulRequests++;
        } else {
          failedRequests++;
        }
      } catch (err) {
        const reqEnd = performance.now();
        latencies.push(reqEnd - reqStart);
        failedRequests++;
      }
    }
  };

  // Launch parallel workers representing concurrent users
  const workers: Promise<void>[] = [];
  for (let i = 0; i < concurrency; i++) {
    workers.push(runWorker());
  }

  await Promise.all(workers);
  const actualDurationMs = performance.now() - startTime;
  const actualDurationSec = actualDurationMs / 1000;

  const totalRequests = successfulRequests + failedRequests;
  
  // Calculate statistics
  let avgLatencyMs = 0;
  let medianLatencyMs = 0;
  let p95LatencyMs = 0;
  let p99LatencyMs = 0;

  if (latencies.length > 0) {
    latencies.sort((a, b) => a - b);
    const sum = latencies.reduce((acc, val) => acc + val, 0);
    avgLatencyMs = sum / latencies.length;
    medianLatencyMs = latencies[Math.floor(latencies.length * 0.5)];
    p95LatencyMs = latencies[Math.floor(latencies.length * 0.95)] || latencies[latencies.length - 1];
    p99LatencyMs = latencies[Math.floor(latencies.length * 0.99)] || latencies[latencies.length - 1];
  }

  const throughputRps = successfulRequests / actualDurationSec;

  return {
    timestamp: new Date().toISOString(),
    endpoint: name,
    method,
    concurrency,
    durationSec: Number(actualDurationSec.toFixed(2)),
    totalRequests,
    successfulRequests,
    failedRequests,
    avgLatencyMs: Number(avgLatencyMs.toFixed(2)),
    medianLatencyMs: Number(medianLatencyMs.toFixed(2)),
    p95LatencyMs: Number(p95LatencyMs.toFixed(2)),
    p99LatencyMs: Number(p99LatencyMs.toFixed(2)),
    throughputRps: Number(throughputRps.toFixed(2)),
  };
}

/**
 * Saves benchmark metrics to a CSV file in benchmarks/api/results/
 */
export function saveResultToCsv(fileName: string, result: BenchmarkResult): void {
  const resultsDir = join(process.cwd(), 'benchmarks', 'api', 'results');
  mkdirSync(resultsDir, { recursive: true });
  
  const csvPath = join(resultsDir, `${fileName}.csv`);
  const headers = 'timestamp,endpoint,method,concurrency,duration_sec,total_requests,successful_requests,failed_requests,avg_latency_ms,median_latency_ms,p95_latency_ms,p99_latency_ms,throughput_rps';
  
  if (!existsSync(csvPath)) {
    writeFileSync(csvPath, headers + '\n');
  }

  const row = [
    result.timestamp,
    result.endpoint,
    result.method,
    result.concurrency,
    result.durationSec,
    result.totalRequests,
    result.successfulRequests,
    result.failedRequests,
    result.avgLatencyMs,
    result.medianLatencyMs,
    result.p95LatencyMs,
    result.p99LatencyMs,
    result.throughputRps,
  ].join(',');

  appendFileSync(csvPath, row + '\n');
}

/**
 * Checks if a given file URL is the main entry point being executed.
 */
export function isMainModule(importMetaUrl: string): boolean {
  if (!process.argv[1]) return false;
  try {
    const mainPath = process.argv[1];
    const modulePath = fileURLToPath(importMetaUrl);
    return mainPath === modulePath || mainPath.endsWith(modulePath);
  } catch (e) {
    return false;
  }
}

