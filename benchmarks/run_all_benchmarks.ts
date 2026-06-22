import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

function loadEnv() {
    const envPath = join(process.cwd(), '.env');
    if (existsSync(envPath)) {
        const envContent = readFileSync(envPath, 'utf-8');
        envContent.split('\n').forEach((line) => {
            const match = line.match(/^\s*([\w.\-]+)\s*=\s*(.*)?\s*$/);
            if (match) {
                const key = match[1];
                let value = match[2] || '';
                if (value.startsWith('"') && value.endsWith('"')) {
                    value = value.substring(1, value.length - 1);
                } else if (value.startsWith("'") && value.endsWith("'")) {
                    value = value.substring(1, value.length - 1);
                }
                process.env[key] = value;
            }
        });
    }
}


function runCmd(cmd: string, env: Record<string, string> = {}) {
    console.log(`> ${cmd}`);
    try {
        execSync(cmd, { stdio: 'inherit', env: { ...process.env, ...env } });
        return true;
    } catch (err) {
        console.error(`Command failed: ${cmd}`);
        return false;
    }
}

async function isServerRunning(url: string): Promise<boolean> {
    try {
        const res = await fetch(url, { method: 'HEAD' });
        return res.ok || res.status === 401 || res.status === 429;
    } catch {
        return false;
    }
}

async function main() {
    loadEnv();
    console.log('========================================================');
    console.log('         CPM UNIFIED BENCHMARKING SUITE RUNNER         ');
    console.log('========================================================\n');

    const projectRoot = process.cwd();
    const buildDir = join(projectRoot, 'build');

    // 1. Compile C++ Executables
    console.log('[1/4] Compiling C++ Engine and DB Benchmarks...');
    const compileSuccess = runCmd('cmake -S . -B build && cmake --build build --target cpm_benchmarks cpm_db_benchmarks');
    if (!compileSuccess) {
        console.error('Compilation failed. Please make sure libpq-dev is installed (sudo apt-get install libpq-dev).');
        process.exit(1);
    }
    console.log('Compilation succeeded.\n');

    // 2. Run Engine Benchmarks (C++)
    console.log('[2/4] Running CPM Engine C++ Benchmarks...');
    const engineBin = join(buildDir, 'benchmarks', 'cpm_engine', 'cpm_benchmarks');
    if (existsSync(engineBin)) {
        runCmd(engineBin);
    } else {
        console.error(`Engine benchmark binary not found at ${engineBin}\n`);
    }

    // 3. Run Database Benchmarks (C++)
    console.log('\n[3/4] Running CPM Database C++ Benchmarks...');
    const dbBin = join(buildDir, 'benchmarks', 'db', 'cpm_db_benchmarks');
    if (existsSync(dbBin)) {
        // Load DATABASE_URL if in environment or default to common dev URL
        const dbUrl = process.env.DATABASE_URL || 'postgresql://test:test@127.0.0.1:5432/cpm_test?schema=public';
        runCmd(dbBin, { DATABASE_URL: dbUrl });
    } else {
        console.error(`Database benchmark binary not found at ${dbBin}\n`);
    }

    // 4. Run API and Locust Benchmarks (Requires Server)
    console.log('\n[4/4] Running HTTP API & Locust Concurrency Benchmarks...');
    const targetUrl = 'http://localhost:3000';
    const serverActive = await isServerRunning(targetUrl);

    if (serverActive) {
        console.log(`Web server detected active at ${targetUrl}. Running API benchmarks...`);
        
        // Run HTTP API benchmarks
        runCmd('npx tsx benchmarks/api/benchmark_main.ts');

        // Run Locust in headless mode for a brief sanity run (10s)
        console.log('\nRunning Locust stress test (headless, 10s)...');
        const locustSuccess = runCmd('locust -f benchmarks/db/locustfile.py --host http://localhost:3000 --headless -u 10 -r 2 --run-time 10s');
        if (!locustSuccess) {
            console.log('Locust stress test skipped or failed (make sure `pip install locust` is run).');
        }
    } else {
        console.log('\n[!] Skipping Next.js API & Locust benchmarks because the web server is offline.');
        console.log(`    To run them, please start the server first in another shell:`);
        console.log('    $ DISABLE_RATE_LIMIT=true npm run dev');
    }

    console.log('\n========================================================');
    console.log('Unified Benchmarking Suite completed.');
    console.log('Results saved under:');
    console.log('  - C++ Engine: benchmarks/cpm_engine/results/');
    console.log('  - C++ Database: benchmarks/db/results/');
    console.log('  - HTTP API: benchmarks/api/results/');
    console.log('========================================================');
}

main().catch((err) => {
    console.error('Execution error:', err);
    process.exit(1);
});
