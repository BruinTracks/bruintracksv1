// controllers/scheduling_controller.js
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

// ESM __dirname shim
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

/**
 * POST /schedule
 * Spawns the Python scheduler, pipes in req.body, and returns its JSON output.
 */
export const scheduleCourses = (req, res) => {
  // adjust the path if your get_courses.py lives elsewhere
  const scriptPath = path.join(__dirname, '..', 'scheduler.py');

  const py = spawn('python3', [scriptPath], {
    stdio: ['pipe', 'pipe', 'inherit']
  });

  let stdout = '';
  py.stdout.on('data', chunk => {
    stdout += chunk.toString();
  });

  py.on('close', code => {
    if (code !== 0) {
      return res
        .status(500)
        .json({ error: `Scheduler script exited with code ${code}` });
    }
    try {
      const result = JSON.parse(stdout);
      res.json(result);
    } catch (err) {
      console.error('Failed to parse scheduler JSON:', err);
      res.status(500).json({ error: 'Invalid JSON from scheduler script' });
    }
  });

  // send request body as JSON on stdin
  py.stdin.write(JSON.stringify(req.body));
  py.stdin.end();
};