
const rx2 = require('rx2')
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
    rx2.action('info', (cb) => {
      cb(this.sysinfos.report())
    })
  }

  bindMetrics() {
    rx2.metric('pm2:cpu', () => this.pm2_report.pm2.cpu)
    rx2.metric('pm2:mem', () => this.pm2_report.pm2.mem)

    rx2.metric('pm2:agent:cpu', () => this.pm2_report.agent.cpu)
    rx2.metric('pm2:agent:mem', () => this.pm2_report.agent.mem)

    /**
     * From Sysinfo
     */
    rx2.metric('cpu', () => this.report.cpu.load)
    rx2.metric('cpus', () => this.report.cpu.loads)
    rx2.metric('cpu:temp', () => this.report.cpu.temperature)
    rx2.metric('mem:total', () => this.report.mem.total)
    rx2.metric('mem:free', () => this.report.mem.free)
    rx2.metric('mem:active', () => this.report.mem.active)
    rx2.metric('mem:available', () => this.report.mem.available)
    rx2.metric('fd', () => this.report.fd.opened)
    rx2.metric('io:r', () => this.report.storage.io.read)
    rx2.metric('io:w', () => this.report.storage.io.write)

    this.report.storage.filesystems.forEach((fss, i) => {
      if (!fss.fs) return
      rx2.metric(`fs:use:${fss.mount}`, () => this.report.storage.filesystems[i].use)
      rx2.metric(`fs:size:${fss.mount}`, () => Math.floor(this.report.storage.filesystems[i].size / 1024 / 1024))
    })

    Object.keys(this.report.network).forEach(iface => {
      rx2.metric(`net:tx_5:${iface}`, () => this.report.network[iface].tx_5)
      rx2.metric(`net:rx_5:${iface}`, () => this.report.network[iface].rx_5)
      rx2.metric(`net:rx_errors_60:${iface}`, () => this.report.network[iface].rx_errors_60)
      rx2.metric(`net:tx_errors_60:${iface}`, () => this.report.network[iface].tx_errors_60)
      rx2.metric(`net:rx_dropped_60:${iface}`, () => this.report.network[iface].rx_dropped_60)
      rx2.metric(`net:tx_dropped_60:${iface}`, () => this.report.network[iface].tx_dropped_60)
    })

    if (this.report.graphics.memTotal) {
      rx2.metric('graphics:mem:total', () => this.report.graphics.memTotal)
      rx2.metric('graphics:mem:used', () => this.report.graphics.memUsed)
      rx2.metric('graphics:temp', () => this.report.graphics.temperature)
    }

    //rx2.transpose('report', () => this.report)
  }
}

if (require.main === module) {
  let sys = new SysMonit()
  sys.start()
}
