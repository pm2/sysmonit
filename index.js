
const rx2 = require('rx2')
const SystemInfos = require('./src/SystemInfos.js')

class SysMonit {
  constructor() {
    this.sysinfos = new SystemInfos()
    this.report = {}
    this.pass = 0
  }

  bindActions() {
    rx2.action('info', (cb) => {
      cb(this.sysinfos.report())
    })
  }

  bindMetrics() {
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
      rx2.metric(`fs:${fss.mount}:use`, () => this.report.storage.filesystems[i].use)
      rx2.metric(`fs:${fss.mount}:size`, () => Math.floor(this.report.storage.filesystems[i].size / 1024 / 1024))
    })

    //rx2.metric(`net:default`, () => this.report.default_interface)

    Object.keys(this.report.network).forEach(iface => {
      rx2.metric(`net:${iface}:tx_5`, () => this.report.network[iface].tx_5)
      rx2.metric(`net:${iface}:rx_5`, () => this.report.network[iface].rx_5)
      rx2.metric(`net:${iface}:rx_errors_60`, () => this.report.network[iface].rx_errors_60)
      rx2.metric(`net:${iface}:tx_errors_60`, () => this.report.network[iface].tx_errors_60)
      rx2.metric(`net:${iface}:rx_dropped_60`, () => this.report.network[iface].rx_dropped_60)
      rx2.metric(`net:${iface}:tx_dropped_60`, () => this.report.network[iface].tx_dropped_60)
    })

    if (this.report.graphics.memTotal) {
      rx2.metric('graphics:mem:total', () => this.report.graphics.memTotal)
      rx2.metric('graphics:mem:used', () => this.report.graphics.memUsed)
      rx2.metric('graphics:temp', () => this.report.graphics.temperature)
    }

    //rx2.transpose('report', () => this.report)
  }

  start() {
    this.sysinfos.startCollection()

    this.report = this.sysinfos.report()

    this.bindActions()

    setInterval(() => {
      if (this.pass++ < 4)
        this.bindMetrics()
      this.report = this.sysinfos.report()
    }, 1000)
  }
}

if (require.main === module) {
  let sys = new SysMonit()
  sys.start()
}
