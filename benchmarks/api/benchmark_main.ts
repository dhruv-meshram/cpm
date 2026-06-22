import { runAuthBenchmarks } from './auth_benchmark';
import { runUsersBenchmarks } from './users_benchmark';
import { runProjectsBenchmarks } from './projects_benchmark';
import { runDepartmentsBenchmarks } from './departments_benchmark';
import { runTagsBenchmarks } from './tags_benchmark';
import { runTasksBenchmarks } from './tasks_benchmark';
import { runDependenciesBenchmarks } from './dependencies_benchmark';
import { runCpmBenchmarks } from './cpm_benchmark';
import { runDashboardBenchmarks } from './dashboard_benchmark';
import { runNotificationsBenchmarks } from './notifications_benchmark';
import { runSystemMiscBenchmarks } from './system_misc_benchmark';

interface BenchOptions {
  url: string;
  duration: number;
  concurrency: number;
  modules: string[];
  sweepConcurrency: boolean;
}

const MODULES_MAP: Record<string, (url: string, duration: number, concurrency: number) => Promise<void>> = {
  auth: runAuthBenchmarks,
  users: runUsersBenchmarks,
  projects: runProjectsBenchmarks,
  departments: runDepartmentsBenchmarks,
  tags: runTagsBenchmarks,
  tasks: runTasksBenchmarks,
  dependencies: runDependenciesBenchmarks,
  cpm: runCpmBenchmarks,
  dashboard: runDashboardBenchmarks,
  notifications: runNotificationsBenchmarks,
  system_misc: runSystemMiscBenchmarks,
};

function parseArgs(): BenchOptions {
  const args = process.argv.slice(2);
  const options: BenchOptions = {
    url: 'http://localhost:3000',
    duration: 5,
    concurrency: 5,
    modules: Object.keys(MODULES_MAP),
    sweepConcurrency: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--url' || arg === '-u') {
      options.url = args[++i];
    } else if (arg === '--duration' || arg === '-d') {
      options.duration = parseInt(args[++i], 10);
    } else if (arg === '--concurrency' || arg === '-c') {
      options.concurrency = parseInt(args[++i], 10);
    } else if (arg === '--api' || arg === '-a') {
      const val = args[++i];
      if (val !== 'all') {
        options.modules = val.split(',').map((m) => m.trim().toLowerCase());
      }
    } else if (arg === '--list' || arg === '-l') {
      console.log('Available benchmark modules:');
      Object.keys(MODULES_MAP).forEach((m) => console.log(`  - ${m}`));
      process.exit(0);
    } else if (arg === '--concurrency-sweep' || arg === '-s') {
      options.sweepConcurrency = true;
    } else if (arg === '--help' || arg === '-h') {
      console.log(`
CPM API Benchmarking Suite Orchestrator

Usage:
  npx tsx benchmarks/api/benchmark_main.ts [options]

Options:
  -u, --url <url>           Target API server URL (default: http://localhost:3000)
  -d, --duration <seconds>  Duration of benchmark run per endpoint in seconds (default: 5)
  -c, --concurrency <num>   Number of concurrent simulated users (default: 5)
  -a, --api <modules>       Comma-separated modules to run, e.g., "auth,tasks" (default: all)
  -s, --concurrency-sweep   Run benchmark sweeping through concurrency levels (1, 5, 10, 20, 50, 100)
  -l, --list                List available benchmark modules
  -h, --help                Show this help message
      `);
      process.exit(0);
    }
  }

  // Validate modules
  options.modules.forEach((mod) => {
    if (!MODULES_MAP[mod]) {
      console.error(`Error: Unknown module "${mod}". Run with --list to see options.`);
      process.exit(1);
    }
  });

  return options;
}

async function main() {
  const options = parseArgs();

  console.log('====================================================');
  console.log('            CPM API BENCHMARKING SUITE              ');
  console.log('====================================================');
  console.log(`Target Host: ${options.url}`);
  console.log(`Duration per endpoint: ${options.duration}s`);
  
  if (options.sweepConcurrency) {
    const sweepLevels = [1, 5, 10, 20, 50, 100];
    console.log(`Running Concurrency User Sweep: ${sweepLevels.join(', ')} users`);
    console.log('Running modules sequentially for each level...');
    
    for (const c of sweepLevels) {
      console.log(`\n>>> STARTING BENCHMARKS WITH CONCURRENCY LEVEL: ${c} <<<`);
      for (const mod of options.modules) {
        try {
          const runFn = MODULES_MAP[mod];
          await runFn(options.url, options.duration, c);
        } catch (err: any) {
          console.error(`[ERROR] Module "${mod}" failed to complete:`, err?.message || err);
        }
      }
    }
  } else {
    console.log(`Concurrency: ${options.concurrency} concurrent user(s)`);
    console.log(`Selected Modules: ${options.modules.join(', ')}`);
    
    for (const mod of options.modules) {
      try {
        const runFn = MODULES_MAP[mod];
        await runFn(options.url, options.duration, options.concurrency);
      } catch (err: any) {
        console.error(`[ERROR] Module "${mod}" failed to complete:`, err?.message || err);
      }
    }
  }

  console.log('\n====================================================');
  console.log('Benchmarks completed. Results saved in: /benchmarks/api/results/');
  console.log('====================================================');
}

main().catch((err) => {
  console.error('Fatal benchmark suite execution error:', err);
  process.exit(1);
});
