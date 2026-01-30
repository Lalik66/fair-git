const { execSync } = require('child_process');
try {
  // Windows approach
  const result = execSync('netstat -ano | findstr :3002', { encoding: 'utf8' });
  const lines = result.trim().split('\n');
  const pids = new Set();
  for (const line of lines) {
    const parts = line.trim().split(/\s+/);
    const pid = parts[parts.length - 1];
    if (pid && pid !== '0') pids.add(pid);
  }
  for (const pid of pids) {
    try {
      execSync(`taskkill /F /PID ${pid}`, { encoding: 'utf8' });
      console.log(`Killed PID ${pid}`);
    } catch (e) {
      console.log(`Failed to kill PID ${pid}: ${e.message}`);
    }
  }
} catch (e) {
  console.log('No process found on port 3002 or error:', e.message);
}
