import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

// The home folder a test server runs in, shared by the server and the tests.
export const e2eHome = (port) => path.join(fs.realpathSync(os.tmpdir()), `planner-e2e-${port}`)
