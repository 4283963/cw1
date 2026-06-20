import { Link } from 'react-router-dom'

export default function Home() {
  const features = [
    {
      title: '远程空调预启',
      description: '上车即享舒适温度，预设目标温度、模式、风速，一键启动车辆空调系统',
      icon: '❄️',
      path: '/ac',
      gradient: 'from-blue-500 to-cyan-500',
      stats: [
        { label: '温度范围', value: '16-32°C' },
        { label: '支持模式', value: '制冷/制热/自动/通风' },
      ],
    },
    {
      title: '实时车辆寻车',
      description: '车机端模拟上报GPS经纬度和剩余电量，手机端地图实时查看车辆最新位置',
      icon: '📍',
      path: '/finder',
      gradient: 'from-emerald-500 to-teal-500',
      stats: [
        { label: '定位精度', value: '7位小数' },
        { label: '刷新频率', value: '实时推送' },
      ],
    },
  ]

  const techStack = [
    { name: 'React 18', icon: '⚛️' },
    { name: 'TypeScript', icon: '📘' },
    { name: 'Tailwind CSS', icon: '🎨' },
    { name: 'Go (Gin)', icon: '🐹' },
    { name: 'GORM + MySQL', icon: '🗄️' },
    { name: 'Leaflet 地图', icon: '🗺️' },
  ]

  return (
    <div className="space-y-8">
      <section className="text-center py-12 md:py-20">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-ev-primary/10 border border-ev-primary/30 text-ev-primary text-sm mb-6">
          <span className="w-2 h-2 rounded-full bg-ev-primary animate-pulse"></span>
          系统运行正常
        </div>
        <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
          <span className="bg-gradient-to-r from-ev-primary via-cyan-400 to-ev-accent bg-clip-text text-transparent">
            智能车机互联系统
          </span>
        </h1>
        <p className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto mb-8">
          新能源汽车 · 手机端与车机端无缝连接<br />
          远程空调预启 · 实时寻车定位
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link
            to="/ac"
            className="px-8 py-3 rounded-xl bg-gradient-to-r from-ev-primary to-ev-secondary hover:from-ev-secondary hover:to-ev-primary text-white font-medium shadow-lg shadow-ev-primary/25 transition-all hover:scale-105"
          >
            ❄️ 启动远程空调
          </Link>
          <Link
            to="/finder"
            className="px-8 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium border border-slate-600 transition-all hover:scale-105"
          >
            📍 查找我的车辆
          </Link>
        </div>
      </section>

      <section className="grid md:grid-cols-2 gap-6">
        {features.map((feature) => (
          <Link
            key={feature.path}
            to={feature.path}
            className="group relative overflow-hidden rounded-2xl bg-slate-800/50 border border-slate-700/50 p-8 hover:border-ev-primary/50 transition-all hover:-translate-y-1"
          >
            <div
              className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-5 transition-opacity`}
            />
            <div className="relative">
              <div
                className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center text-3xl mb-6 shadow-lg`}
              >
                {feature.icon}
              </div>
              <h2 className="text-2xl font-bold mb-3 text-white group-hover:text-ev-primary transition-colors">
                {feature.title}
                <span className="inline-block ml-2 group-hover:translate-x-1 transition-transform">
                  →
                </span>
              </h2>
              <p className="text-slate-400 mb-6 leading-relaxed">
                {feature.description}
              </p>
              <div className="grid grid-cols-2 gap-4">
                {feature.stats.map((stat) => (
                  <div key={stat.label} className="bg-slate-900/50 rounded-xl p-4">
                    <div className="text-ev-primary text-lg font-bold">
                      {stat.value}
                    </div>
                    <div className="text-slate-500 text-xs mt-1">
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Link>
        ))}
      </section>

      <section className="rounded-2xl bg-slate-800/50 border border-slate-700/50 p-8">
        <h3 className="text-xl font-bold mb-6 text-center text-slate-300">
          技术栈
        </h3>
        <div className="flex flex-wrap items-center justify-center gap-3">
          {techStack.map((tech) => (
            <div
              key={tech.name}
              className="px-5 py-2.5 rounded-xl bg-slate-900/50 border border-slate-700/50 text-sm text-slate-300 hover:border-ev-primary/50 hover:text-ev-primary transition-all"
            >
              <span className="mr-2">{tech.icon}</span>
              {tech.name}
            </div>
          ))}
        </div>
      </section>

      <section className="grid md:grid-cols-3 gap-4">
        {[
          {
            title: '🔐 安全可靠',
            desc: '指令全程加密传输，车辆身份唯一识别',
          },
          {
            title: '⚡ 快速响应',
            desc: 'Gin 高性能框架，毫秒级指令下发',
          },
          {
            title: '📱 多端适配',
            desc: '响应式设计，手机/平板/桌面均可使用',
          },
        ].map((item) => (
          <div
            key={item.title}
            className="rounded-xl bg-slate-800/30 border border-slate-700/30 p-5"
          >
            <div className="text-lg font-semibold mb-2 text-white">
              {item.title}
            </div>
            <div className="text-sm text-slate-400">{item.desc}</div>
          </div>
        ))}
      </section>
    </div>
  )
}
