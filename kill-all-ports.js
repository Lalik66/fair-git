const { execSync } = require('child_process');
const ports = [3000, 3001, 3002];
for (const port of ports) {
  try {
    const result = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf8' });
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
        console.log(`Port ${port}: Killed PID ${pid}`);
      } catch (e) {
        console.log(`Port ${port}: Failed to kill PID ${pid}`);
      }
    }
  } catch (e) {
    console.log(`Port ${port}: No process found`);
  }
}
