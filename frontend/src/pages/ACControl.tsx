import { useState, useEffect, useCallback } from 'react'
import {
  startAC,
  stopAC,
  getACStatus,
  getACHistory,
  updateACStatus,
} from '../api/ac'
import {
  ACCommand,
  ACMode,
  ACStatus,
  DEFAULT_USER_ID,
  DEFAULT_VEHICLE_ID,
} from '../types'

const MODE_OPTIONS: { value: ACMode; label: string; icon: string }[] = [
  { value: 'auto', label: '自动', icon: '🔄' },
  { value: 'cool', label: '制冷', icon: '❄️' },
  { value: 'heat', label: '制热', icon: '🔥' },
  { value: 'vent', label: '通风', icon: '🌀' },
]

const STATUS_COLORS: Record<ACStatus, string> = {
  pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  running: 'bg-green-500/20 text-green-400 border-green-500/30',
  stopped: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  failed: 'bg-red-500/20 text-red-400 border-red-500/30',
}

const STATUS_LABELS: Record<ACStatus, string> = {
  pending: '等待执行',
  running: '运行中',
  stopped: '已停止',
  failed: '失败',
}

export default function ACControl() {
  const [targetTemp, setTargetTemp] = useState(24)
  const [mode, setMode] = useState<ACMode>('auto')
  const [fanSpeed, setFanSpeed] = useState(3)
  const [loading, setLoading] = useState(false)
  const [currentCommand, setCurrentCommand] = useState<ACCommand | null>(null)
  const [history, setHistory] = useState<ACCommand[]>([])
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
  const [vehicleId, setVehicleId] = useState(DEFAULT_VEHICLE_ID)

  const isACOn = currentCommand?.status === 'running' || currentCommand?.status === 'pending'

  const showToast = useCallback((type: 'success' | 'error', msg: string) => {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 3000)
  }, [])

  const fetchStatus = useCallback(async () => {
    try {
      const res = await getACStatus(vehicleId)
      setCurrentCommand(res.data)
    } catch (err) {
      // ignore silent
    }
  }, [vehicleId])

  const fetchHistory = useCallback(async () => {
    try {
      const res = await getACHistory(vehicleId, 10)
      setHistory(res.data)
    } catch (err) {
      // ignore silent
    }
  }, [vehicleId])

  useEffect(() => {
    fetchStatus()
    fetchHistory()
    const timer = setInterval(fetchStatus, 5000)
    return () => clearInterval(timer)
  }, [fetchStatus, fetchHistory])

  const handleStart = async () => {
    setLoading(true)
    try {
      await startAC({
        vehicle_id: vehicleId,
        user_id: DEFAULT_USER_ID,
        target_temp: targetTemp,
        mode,
        fan_speed: fanSpeed,
      })
      showToast('success', `已发送启动指令：目标 ${targetTemp}°C`)
      await fetchStatus()
      await fetchHistory()
    } catch (err: any) {
      showToast('error', err.message || '启动失败')
    } finally {
      setLoading(false)
    }
  }

  const handleStop = async () => {
    setLoading(true)
    try {
      await stopAC({
        vehicle_id: vehicleId,
        user_id: DEFAULT_USER_ID,
      })
      showToast('success', '已发送关闭指令')
      await fetchStatus()
      await fetchHistory()
    } catch (err: any) {
      showToast('error', err.message || '关闭失败')
    } finally {
      setLoading(false)
    }
  }

  const simulateCarReceive = async () => {
    if (!currentCommand || currentCommand.status !== 'pending') return
    try {
      await updateACStatus({
        command_id: currentCommand.id,
        status: 'running',
        message: '车机已接收并启动空调',
      })
      showToast('success', '车机端：已接收指令并启动')
      await fetchStatus()
      await fetchHistory()
    } catch (err: any) {
      showToast('error', err.message || '模拟失败')
    }
  }

  const getTempColor = () => {
    if (targetTemp <= 20) return 'text-blue-400'
    if (targetTemp >= 28) return 'text-orange-400'
    return 'text-ev-primary'
  }

  const formatTime = (t: string | null) => {
    if (!t) return '-'
    const d = new Date(t)
    return d.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  return (
    <div className="space-y-6">
      {toast && (
        <div
          className={`fixed top-20 right-4 z-50 px-5 py-3 rounded-xl shadow-xl border transition-all animate-pulse ${
            toast.type === 'success'
              ? 'bg-green-500/20 text-green-400 border-green-500/40'
              : 'bg-red-500/20 text-red-400 border-red-500/40'
          }`}
        >
          {toast.msg}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
            <span className="text-3xl">❄️</span>
            远程空调预启
          </h1>
          <p className="text-slate-400 mt-2 text-sm">
            设置目标温度，提前启动车辆空调，上车即享舒适
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">车辆ID:</span>
          <input
            type="text"
            value={vehicleId}
            onChange={(e) => setVehicleId(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-300 focus:border-ev-primary focus:outline-none w-40"
          />
        </div>
      </div>

      <div
        className={`rounded-3xl p-8 md:p-12 border transition-all duration-500 ${
          isACOn
            ? 'ac-on-glow bg-gradient-to-br from-ev-primary/10 to-cyan-500/5 border-ev-primary/40'
            : 'bg-slate-800/50 border-slate-700/50'
        }`}
      >
        <div className="grid md:grid-cols-2 gap-10 items-center">
          <div className="text-center">
            <div className="mb-6">
              <div className="text-slate-400 text-sm mb-2">目标温度</div>
              <div className={`text-8xl md:text-9xl font-light temp-glow ${getTempColor()}`}>
                {targetTemp}
                <span className="text-4xl md:text-5xl align-top">°C</span>
              </div>
            </div>

            <div className="mt-8 space-y-5">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-slate-400">温度调节</span>
                  <span className="text-slate-500">16°C — 32°C</span>
                </div>
                <input
                  type="range"
                  min={16}
                  max={32}
                  step={0.5}
                  value={targetTemp}
                  onChange={(e) => setTargetTemp(Number(e.target.value))}
                  className="w-full h-3 rounded-full appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, #60a5fa 0%, #0ea5e9 37%, #22c55e 50%, #f97316 75%, #ef4444 100%)`,
                  }}
                />
                <div className="flex justify-between mt-2 gap-2">
                  {[16, 20, 24, 28, 32].map((t) => (
                    <button
                      key={t}
                      onClick={() => setTargetTemp(t)}
                      className={`flex-1 py-2 rounded-lg text-sm transition-all ${
                        targetTemp === t
                          ? 'bg-ev-primary text-white'
                          : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {t}°
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-sm text-slate-400 mb-2">模式选择</div>
                <div className="grid grid-cols-4 gap-2">
                  {MODE_OPTIONS.map((m) => (
                    <button
                      key={m.value}
                      onClick={() => setMode(m.value)}
                      className={`py-3 rounded-xl border transition-all ${
                        mode === m.value
                          ? 'bg-ev-primary/20 border-ev-primary text-ev-primary'
                          : 'bg-slate-700/30 border-slate-700 text-slate-300 hover:bg-slate-700/50'
                      }`}
                    >
                      <div className="text-2xl">{m.icon}</div>
                      <div className="text-xs mt-1">{m.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-slate-400">风速档位</span>
                  <span className="text-ev-primary font-medium">{fanSpeed} / 7</span>
                </div>
                <div className="grid grid-cols-7 gap-1.5">
                  {[1, 2, 3, 4, 5, 6, 7].map((f) => (
                    <button
                      key={f}
                      onClick={() => setFanSpeed(f)}
                      className={`aspect-square rounded-lg text-sm font-medium transition-all ${
                        fanSpeed >= f
                          ? 'bg-ev-primary text-white'
                          : 'bg-slate-700/30 text-slate-500 hover:bg-slate-700/50'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {currentCommand ? (
              <div className="rounded-2xl bg-slate-900/60 border border-slate-700/50 p-6">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="font-semibold text-white">当前状态</h3>
                  <span
                    className={`px-3 py-1 rounded-full text-xs border ${
                      STATUS_COLORS[currentCommand.status]
                    }`}
                  >
                    {STATUS_LABELS[currentCommand.status]}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="rounded-xl bg-slate-800/50 p-4">
                    <div className="text-slate-500 text-xs mb-1">目标温度</div>
                    <div className="text-xl font-bold text-white">
                      {currentCommand.target_temp}°C
                    </div>
                  </div>
                  <div className="rounded-xl bg-slate-800/50 p-4">
                    <div className="text-slate-500 text-xs mb-1">运行模式</div>
                    <div className="text-xl font-bold text-white">
                      {MODE_OPTIONS.find((m) => m.value === currentCommand.mode)?.label}
                    </div>
                  </div>
                  <div className="rounded-xl bg-slate-800/50 p-4">
                    <div className="text-slate-500 text-xs mb-1">风速档位</div>
                    <div className="text-xl font-bold text-white">
                      {currentCommand.fan_speed}
                    </div>
                  </div>
                  <div className="rounded-xl bg-slate-800/50 p-4">
                    <div className="text-slate-500 text-xs mb-1">指令创建</div>
                    <div className="text-sm font-medium text-slate-300">
                      {formatTime(currentCommand.created_at)}
                    </div>
                  </div>
                </div>
                {currentCommand.message && (
                  <div className="mt-4 p-3 rounded-lg bg-ev-primary/10 border border-ev-primary/30 text-sm text-ev-primary">
                    ℹ️ {currentCommand.message}
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-2xl bg-slate-900/60 border border-dashed border-slate-700 p-10 text-center">
                <div className="text-5xl mb-4">🚗💨</div>
                <div className="text-slate-400">暂无空调指令</div>
                <div className="text-slate-500 text-sm mt-2">设置温度后点击启动</div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={handleStart}
                disabled={loading}
                className="pulse-ring py-4 rounded-2xl bg-gradient-to-r from-ev-primary to-ev-secondary hover:from-ev-secondary hover:to-ev-primary text-white font-bold text-lg shadow-xl shadow-ev-primary/30 transition-all hover:scale-[1.02] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {loading ? '发送中...' : '🚀 启动空调'}
              </button>
              <button
                onClick={handleStop}
                disabled={loading}
                className="py-4 rounded-2xl bg-slate-700/80 hover:bg-slate-600 text-white font-bold text-lg border border-slate-600 transition-all hover:scale-[1.02] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {loading ? '发送中...' : '⏹ 关闭空调'}
              </button>
            </div>

            {currentCommand?.status === 'pending' && (
              <button
                onClick={simulateCarReceive}
                className="w-full py-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-medium text-sm transition-all"
              >
                🚗 模拟车机端：接收指令并执行
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-slate-800/50 border border-slate-700/50 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-700/50">
          <h3 className="font-semibold text-white flex items-center gap-2">
            <span>📋</span> 历史记录
          </h3>
        </div>
        {history.length === 0 ? (
          <div className="p-10 text-center text-slate-500">暂无历史记录</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-500 border-b border-slate-700/50">
                  <th className="text-left px-6 py-3 font-medium">创建时间</th>
                  <th className="text-left px-6 py-3 font-medium">温度</th>
                  <th className="text-left px-6 py-3 font-medium hidden md:table-cell">模式</th>
                  <th className="text-left px-6 py-3 font-medium hidden lg:table-cell">风速</th>
                  <th className="text-left px-6 py-3 font-medium">状态</th>
                  <th className="text-left px-6 py-3 font-medium hidden lg:table-cell">备注</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr
                    key={h.id}
                    className="border-b border-slate-700/30 hover:bg-slate-700/20 transition-colors"
                  >
                    <td className="px-6 py-4 text-slate-300 whitespace-nowrap">
                      {formatTime(h.created_at)}
                    </td>
                    <td className="px-6 py-4 text-white font-medium">
                      {h.target_temp}°C
                    </td>
                    <td className="px-6 py-4 text-slate-300 hidden md:table-cell">
                      {MODE_OPTIONS.find((m) => m.value === h.mode)?.icon}{' '}
                      {MODE_OPTIONS.find((m) => m.value === h.mode)?.label}
                    </td>
                    <td className="px-6 py-4 text-slate-300 hidden lg:table-cell">
                      {h.fan_speed} 档
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-md text-xs border ${
                          STATUS_COLORS[h.status]
                        }`}
                      >
                        {STATUS_LABELS[h.status]}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-400 hidden lg:table-cell max-w-[200px] truncate">
                      {h.message || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
