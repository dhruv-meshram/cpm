import { spawnSync, spawn } from 'child_process';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

function runCmd(cmd: string, args: string[], env?: NodeJS.ProcessEnv) {
  console.log(`> ${cmd} ${args.join(' ')}`);
  const res = spawnSync(cmd, args, { stdio: 'inherit', env: { ...process.env, ...env } });
  if (res.error) throw res.error;
  if (res.status !== 0) throw new Error(`${cmd} ${args.join(' ')} exited ${res.status}`);
}

function tryRunDocker(containerName: string, port: string) {
  try {
    const res = spawnSync('docker', [
      'run', '--rm', '-d', '--name', containerName,
      '-e', 'POSTGRES_PASSWORD=test',
      '-e', 'POSTGRES_USER=test',
      '-e', 'POSTGRES_DB=cpm_test',
      '-p', `${port}:5432`,
      'postgres:15-alpine'
    ], { stdio: 'pipe' });
    if (res.error) return { ok: false, error: res.error };
    if (res.status !== 0) return { ok: false, error: new Error(res.stderr.toString()) };
    const id = res.stdout.toString().trim();
    return { ok: true, id };
  } catch (err: any) {
    return { ok: false, error: err };
  }
}

function findLatestReportDir() {
  const reportsDir = join(process.cwd(), 'reports');
  const entries = readdirSync(reportsDir, { withFileTypes: true }).filter((d) => d.isDirectory());
  if (entries.length === 0) return null;
  const dirs = entries.map((d) => ({ name: d.name, mtime: statSync(join(reportsDir, d.name)).mtimeMs }));
  dirs.sort((a, b) => b.mtime - a.mtime);
  return join(reportsDir, dirs[0].name);
}

async function main() {
  const manifestPath = process.argv[2] || 'scripts/db_benchmark_manifest.json';
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

  const requestedPort = process.env.BENCH_DB_PORT;
  const containerName = `cpm_test_bench_${Date.now()}`;

  console.log('Starting ephemeral Postgres container...');
  let port: string | undefined = undefined;
  const portsToTry = requestedPort ? [requestedPort] : Array.from({ length: 11 }, (_, i) => String(5433 + i));
  let containerId: string | undefined;
  for (const p of portsToTry) {
    const res = tryRunDocker(containerName, p);
    if (res.ok) {
      port = p;
      containerId = res.id;
      break;
    } else {
      console.log(`port ${p} not available or docker run failed: ${String(res.error)}`);
    }
  }
  if (!port) throw new Error('Failed to start Postgres container on any tried port');

  const databaseUrl = `postgresql://test:test@127.0.0.1:${port}/cpm_test?schema=public`;
  process.env.DATABASE_URL = databaseUrl;

  try {
    console.log('Waiting for database to accept connections (prisma db push)...');
    // retry prisma db push until DB is ready
    const maxAttempts = 30;
    let attempt = 0;
    while (attempt < maxAttempts) {
      try {
        runCmd('npx', ['prisma', 'db', 'push'], { DATABASE_URL: databaseUrl });
        break;
      } catch (err: any) {
        attempt++;
        console.log(`prisma db push attempt ${attempt} failed: ${String(err.message ?? err)}; retrying in 1s`);
        await new Promise((res) => setTimeout(res, 1000));
        if (attempt === maxAttempts) throw err;
      }
    }
    console.log('Seeding database...');
    runCmd('npm', ['run', 'db:seed'], { DATABASE_URL: databaseUrl });

    // Run defined tests from manifest sequentially
    for (const t of manifest.tests) {
      console.log(`Running test ${t.id}: ${t.name}`);
      runCmd('npm', ['run', t.command], { DATABASE_URL: databaseUrl });
    }

    // find latest report
    const latest = findLatestReportDir();
    if (latest) console.log(`Reports written to ${latest}`);
    else console.log('No report directory found');
  } catch (err: any) {
    console.error('Error during benchmark run:', err?.message ?? err);
    process.exitCode = 1;
  } finally {
    console.log('Stopping and removing container...');
    try {
      runCmd('docker', ['stop', containerName]);
    } catch (e) {
      console.error('Failed to stop container:', e);
    }
  }
}

main();
