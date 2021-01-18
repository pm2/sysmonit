
const tx2 = require('tx2')
const SystemInfos = require('./src/SystemInfos.js')
const PM2Infos = require('./src/pm2.js')

class SysMonit {
  constructor() {
    this.sysinfos = new SystemInfos()
    this.report = {}
    this.pass = 0

    this.pm2infos = new PM2Infos()
    this.pm2_report = {}
  }

  start() {
    this.sysinfos.startCollection()
    this.report = this.sysinfos.report()

    this.pm2infos.startCollection()
    this.pm2_report = this.pm2infos.report()

    this.bindActions()

    setInterval(() => {
      if (this.pass++ < 4)
        this.bindMetrics()
      this.report = this.sysinfos.report()
      this.pm2_report = this.pm2infos.report()

      if (process.env.VERBOSE) {
        console.log(JSON.stringify(this.report, '', 2))
        console.log(JSON.stringify(this.pm2_report, '', 2))
      }
    }, 1000)
  }

  bindActions() {
    tx2.action('info', (cb) => {
      cb(this.sysinfos.report())
    })
  }

  bindMetrics() {
    tx2.metric('pm2:cpu', () => this.pm2_report.pm2.cpu)
    tx2.metric('pm2:mem', () => this.pm2_report.pm2.mem)

    tx2.metric('pm2:agent:cpu', () => this.pm2_report.agent.cpu)
    tx2.metric('pm2:agent:mem', () => this.pm2_report.agent.mem)

    /**
     * From Sysinfo
     */
    tx2.metric('cpu', () => this.report.cpu.load)
    tx2.metric('cpus', () => this.report.cpu.loads)
    tx2.metric('cpu:temp', () => this.report.cpu.temperature)
    tx2.metric('mem:total', () => this.report.mem.total)
    tx2.metric('mem:free', () => this.report.mem.free)
    tx2.metric('mem:active', () => this.report.mem.active)
    tx2.metric('mem:available', () => this.report.mem.available)
    tx2.metric('fd', () => this.report.fd.opened)
    tx2.metric('io:r', () => this.report.storage.io.read)
    tx2.metric('io:w', () => this.report.storage.io.write)

    this.report.storage.filesystems.forEach((fss, i) => {
      if (!fss.fs) return
      tx2.metric(`fs:use:${fss.mount}`, () => this.report.storage.filesystems[i].use)
      tx2.metric(`fs:size:${fss.mount}`, () => Math.floor(this.report.storage.filesystems[i].size / 1024 / 1024))
    })

    Object.keys(this.report.network).forEach(iface => {
      tx2.metric(`net:tx_5:${iface}`, () => this.report.network[iface].tx_5)
      tx2.metric(`net:rx_5:${iface}`, () => this.report.network[iface].rx_5)
      tx2.metric(`net:rx_errors_60:${iface}`, () => this.report.network[iface].rx_errors_60)
      tx2.metric(`net:tx_errors_60:${iface}`, () => this.report.network[iface].tx_errors_60)
      tx2.metric(`net:rx_dropped_60:${iface}`, () => this.report.network[iface].rx_dropped_60)
      tx2.metric(`net:tx_dropped_60:${iface}`, () => this.report.network[iface].tx_dropped_60)
    })

    if (this.report.graphics.memTotal) {
      tx2.metric('graphics:mem:total', () => this.report.graphics.memTotal)
      tx2.metric('graphics:mem:used', () => this.report.graphics.memUsed)
      tx2.metric('graphics:temp', () => this.report.graphics.temperature)
    }

    //tx2.transpose('report', () => this.report)
  }
}

if (require.main === module) {
  let sys = new SysMonit()
  sys.start()
}
