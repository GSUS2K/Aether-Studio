import net from 'node:net'
import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')
const frontendDir = path.join(rootDir, 'frontend')
const host = '127.0.0.1'
const portStart = Number.parseInt(process.env.AETHER_DEV_PORT || '5173', 10)

const isPortFree = (port) => new Promise((resolve) => {
  const server = net.createServer()
  server.unref()
  server.once('error', () => resolve(false))
  server.listen({ host, port }, () => {
    server.close(() => resolve(true))
  })
})

const findFreePort = async (startPort) => {
  for (let port = startPort; port < startPort + 100; port += 1) {
    if (await isPortFree(port)) return port
  }
  throw new Error(`Could not find a free port starting at ${startPort}`)
}

const waitForServer = (port) => new Promise((resolve, reject) => {
  const deadline = Date.now() + 30000

  const attempt = () => {
    const socket = net.createConnection({ host, port })
    socket.once('connect', () => {
      socket.end()
      resolve()
    })
    socket.once('error', () => {
      socket.destroy()
      if (Date.now() > deadline) {
        reject(new Error(`Timed out waiting for dev server on port ${port}`))
        return
      }
      setTimeout(attempt, 250)
    })
  }

  attempt()
})

const spawnProcess = (command, args, options = {}) => {
  const child = spawn(command, args, {
    stdio: 'inherit',
    shell: false,
    ...options,
  })

  child.on('error', (error) => {
    console.error(`[dev-all] Failed to start ${command}:`, error.message)
    process.exitCode = 1
    cleanup()
  })

  return child
}

let frontendProcess = null
let electronProcess = null
let shuttingDown = false

const cleanup = () => {
  if (shuttingDown) return
  shuttingDown = true
  for (const child of [electronProcess, frontendProcess]) {
    if (child && !child.killed) {
      child.kill('SIGTERM')
    }
  }
}

process.on('SIGINT', cleanup)
process.on('SIGTERM', cleanup)

const main = async () => {
  const port = await findFreePort(portStart)
  const devServerUrl = `http://${host}:${port}`

  console.log(`[dev-all] Using ${devServerUrl}`)

  frontendProcess = spawnProcess('npm', ['run', 'dev', '--', '--host', host, '--port', String(port), '--strictPort'], {
    cwd: frontendDir,
    env: {
      ...process.env,
      AETHER_DEV_SERVER_URL: devServerUrl,
      AETHER_DEV_PORT: String(port),
    },
  })

  const frontendExit = new Promise((resolve, reject) => {
    frontendProcess.on('exit', (code, signal) => {
      if (code === 0) {
        resolve()
      } else {
        reject(new Error(`Frontend exited with code ${code ?? signal}`))
      }
    })
  })

  await waitForServer(port)

  electronProcess = spawnProcess('npm', ['run', 'dev:electron'], {
    cwd: rootDir,
    env: {
      ...process.env,
      AETHER_DEV_SERVER_URL: devServerUrl,
      AETHER_DEV_PORT: String(port),
    },
  })

  electronProcess.on('exit', (code, signal) => {
    if (code !== 0 && code !== null) {
      console.error(`[dev-all] Electron exited with code ${code}`)
    } else if (signal) {
      console.error(`[dev-all] Electron exited with signal ${signal}`)
    }
    cleanup()
  })

  try {
    await Promise.race([
      frontendExit,
      new Promise((resolve) => electronProcess.on('exit', resolve)),
    ])
  } catch (error) {
    console.error('[dev-all]', error.message)
    cleanup()
    process.exitCode = 1
  }
}

main().catch((error) => {
  console.error('[dev-all]', error.message)
  process.exitCode = 1
  cleanup()
})