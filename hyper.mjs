import Hyperswarm from 'hyperswarm'
import {recurringAllSettled} from 'file://C:/Code/utils/index.mjs'

export async function hyperClient(name) {
  const swarm = new Hyperswarm()

  swarm.on('connection', (conn, info) => {
      conn.on('data', data => console.log('client got message:', data.toString()))

  })

  const topic = Buffer.alloc(32).fill(`***RunRepo***${name}***`)
  const discovery = swarm.join(topic, {
      server: false,
      client: true
  })
  await discovery.flushed()
  console.log(`client joined swarm`)
  return swarm
}

export async function hyperServer(name) {
  const swarm = new Hyperswarm()

  swarm.on('connection', (conn, info) => {
      serveAlerts(conn)
  })

  const topic = Buffer.alloc(32).fill(`***RunRepo***${name}***`)
  swarm.join(topic, {
      server: true,
      client: false
  })
  await swarm.flush()
  recurringAllSettled(async () => {
      await swarm.flush()
  }, 2500)
  console.log(`server ready`)
}

async function serveAlerts(conn) {
  recurringAllSettled(async () => {
      await conn.write(`${Date.now()}`)
  },
  5900)
}