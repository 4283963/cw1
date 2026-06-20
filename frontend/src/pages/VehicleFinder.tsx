import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  Circle,
  useMap,
} from 'react-leaflet'
import L from 'leaflet'
import {
  getVehicleStatus,
  getVehicleStatusHistory,
  simulateVehicleReport,
  reportVehicleStatus,
} from '../api/vehicle'
import {
  DEFAULT_VEHICLE_ID,
  VehicleStatus,
  VehicleStatusHistory,
} from '../types'

const LOW_BATTERY_THRESHOLD = 15

function buildCarIcon(batteryLevel: number | null) {
  const lowBattery = batteryLevel !== null && batteryLevel < LOW_BATTERY_THRESHOLD
  return L.divIcon({
    className: 'custom-car-marker',
    html: `
      <div style="position: relative; width: 44px; height: 44px;">
        <div style="
          background: linear-gradient(135deg, ${lowBattery ? '#eab308, #ca8a04' : '#0ea5e9, #0284c7'});
          border-radius: 50%;
          width: 44px;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 22px;
          box-shadow: 0 0 0 4px rgba(${lowBattery ? '234, 179, 8' : '14, 165, 233'}, 0.2), 0 4px 12px rgba(0,0,0,0.3);
          border: 2px solid rgba(255,255,255,0.9);
        ">🚗</div>
        ${
          lowBattery
            ? `<div class="low-battery-blink" style="
                position: absolute;
                top: -10px;
                right: -10px;
                font-size: 20px;
                line-height: 1;
              ">🔋</div>`
            : ''
        }
      </div>
    `,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    popupAnchor: [0, -22],
  })
}

function AutoCenter({ position }: { position: [number, number] }) {
  const map = useMap()
  useEffect(() => {
    map.setView(position, map.getZoom(), { animate: true })
  }, [position, map])
  return null
}

function getBatteryColor(level: number) {
  if (level >= 60) return 'text-green-400'
  if (level >= 30) return 'text-yellow-400'
  return 'text-red-400'
}

function getBatteryBg(level: number) {
  if (level >= 60) return 'bg-green-500'
  if (level >= 30) return 'bg-yellow-500'
  return 'bg-red-500'
}

export default function VehicleFinder() {
  const [vehicleId, setVehicleId] = useState(DEFAULT_VEHICLE_ID)
  const [status, setStatus] = useState<VehicleStatus | null>(null)
  const [history, setHistory] = useState<VehicleStatusHistory[]>([])
  const [loading, setLoading] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [showTrail, setShowTrail] = useState(true)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(
    null,
  )
  const [simulateActive, setSimulateActive] = useState(false)
  const [manualLng, setManualLng] = useState('116.397')
  const [manualLat, setManualLat] = useState('39.908')
  const [manualBattery, setManualBattery] = useState(78)

  const position: [number, number] = useMemo(
    () => (status ? [status.latitude, status.longitude] : [39.908, 116.397]),
    [status],
  )

  const trailCoords: [number, number][] = useMemo(
    () => history.map((h) => [h.latitude, h.longitude]),
    [history],
  )

  const showToast = useCallback((type: 'success' | 'error', msg: string) => {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 3000)
  }, [])

  const fetchStatus = useCallback(async () => {
    try {
      const res = await getVehicleStatus(vehicleId)
      setStatus(res.data)
    } catch (err: any) {
      // ignore
    }
  }, [vehicleId])

  const fetchHistory = useCallback(async () => {
    try {
      const res = await getVehicleStatusHistory(vehicleId, 50)
      setHistory(res.data)
    } catch (err) {
      // ignore
    }
  }, [vehicleId])

  useEffect(() => {
    fetchStatus()
    fetchHistory()
  }, [fetchStatus, fetchHistory])

  useEffect(() => {
    if (!autoRefresh) return
    const timer = setInterval(fetchStatus, 3000)
    return () => clearInterval(timer)
  }, [autoRefresh, fetchStatus])

  useEffect(() => {
    if (!simulateActive) return
    const timer = setInterval(async () => {
      try {
        await simulateVehicleReport(
          vehicleId,
          status?.longitude,
          status?.latitude,
        )
        await fetchStatus()
        await fetchHistory()
      } catch (err) {
        // ignore
      }
    }, 5000)
    return () => clearInterval(timer)
  }, [simulateActive, vehicleId, status, fetchStatus, fetchHistory])

  const handleSimulateOnce = async () => {
    setLoading(true)
    try {
      await simulateVehicleReport(vehicleId)
      await fetchStatus()
      await fetchHistory()
      showToast('success', '模拟上报成功，位置已更新')
    } catch (err: any) {
      showToast('error', err.message || '模拟失败')
    } finally {
      setLoading(false)
    }
  }

  const handleManualReport = async () => {
    setLoading(true)
    try {
      await reportVehicleStatus({
        vehicle_id: vehicleId,
        longitude: Number(manualLng),
        latitude: Number(manualLat),
        battery_level: manualBattery,
        is_locked: true,
        is_charging: false,
      })
      await fetchStatus()
      await fetchHistory()
      showToast('success', '手动上报成功')
    } catch (err: any) {
      showToast('error', err.message || '上报失败')
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (t: string) => {
    const d = new Date(t)
    return d.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  const getDistanceFromCenter = () => {
    if (!status) return '计算中...'
    const baseLat = 39.908
    const baseLng = 116.397
    const R = 6371
    const dLat = ((status.latitude - baseLat) * Math.PI) / 180
    const dLng = ((status.longitude - baseLng) * Math.PI) / 180
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((baseLat * Math.PI) / 180) *
        Math.cos((status.latitude * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    const dist = R * c * 1000
    if (dist < 1000) return `${Math.round(dist)} 米`
    return `${(dist / 1000).toFixed(2)} 公里`
  }

  const handleNavigate = () => {
    if (!status) {
      showToast('error', '暂无车辆位置数据，无法导航')
      return
    }
    const { longitude, latitude } = status
    const amapUrl = `https://uri.amap.com/marker?position=${longitude},${latitude}&name=${encodeURIComponent('我的爱车')}&src=ev-connect&coordinate=gaode&callnative=1`
    window.open(amapUrl, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="space-y-6">
      {toast && (
        <div
          className={`fixed top-20 right-4 z-50 px-5 py-3 rounded-xl shadow-xl border transition-all ${
            toast.type === 'success'
              ? 'bg-green-500/20 text-green-400 border-green-500/40'
              : 'bg-red-500/20 text-red-400 border-red-500/40'
          }`}
        >
          {toast.msg}
        </div>
      )}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
            <span className="text-3xl">📍</span>
            实时车辆寻车
          </h1>
          <p className="text-slate-400 mt-2 text-sm">
            车机端上报 GPS 坐标和电量，地图实时显示车辆位置
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleNavigate}
            disabled={!status}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-orange-500 hover:to-yellow-500 text-white text-sm font-medium shadow-lg shadow-yellow-500/25 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <span>🧭</span> 一键导航到车辆
          </button>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">车辆ID:</span>
            <input
              type="text"
              value={vehicleId}
              onChange={(e) => setVehicleId(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-300 focus:border-ev-primary focus:outline-none w-40"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-ev-primary focus:ring-ev-primary"
            />
            自动刷新
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={showTrail}
              onChange={(e) => setShowTrail(e.target.checked)}
              className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-ev-primary focus:ring-ev-primary"
            />
            轨迹显示
          </label>
        </div>
      </div>

      {status && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-2xl bg-slate-800/50 border border-slate-700/50 p-5">
            <div className="flex items-center gap-2 text-slate-400 text-xs mb-2">
              <span>🔋</span> 剩余电量
            </div>
            <div className="flex items-end gap-3">
              <div className={`text-3xl font-bold ${getBatteryColor(status.battery_level)}`}>
                {status.battery_level}%
              </div>
              <div className="flex-1 h-3 rounded-full bg-slate-700 overflow-hidden mb-2">
                <div
                  className={`h-full ${getBatteryBg(status.battery_level)} transition-all duration-500`}
                  style={{ width: `${status.battery_level}%` }}
                />
              </div>
            </div>
            {status.battery_level < LOW_BATTERY_THRESHOLD && (
              <div className="mt-3 px-3 py-2 rounded-lg bg-yellow-500/15 border border-yellow-500/30 text-yellow-400 text-xs flex items-center gap-2">
                <span className="low-battery-blink">⚠️</span>
                电量过低，建议尽快充电
              </div>
            )}
          </div>
          <div className="rounded-2xl bg-slate-800/50 border border-slate-700/50 p-5">
            <div className="flex items-center gap-2 text-slate-400 text-xs mb-2">
              <span>🛣️</span> 预估续航
            </div>
            <div className="text-3xl font-bold text-ev-primary">
              {status.range_estimate}
              <span className="text-lg text-slate-400 ml-1">km</span>
            </div>
          </div>
          <div className="rounded-2xl bg-slate-800/50 border border-slate-700/50 p-5">
            <div className="flex items-center gap-2 text-slate-400 text-xs mb-2">
              <span>📍</span> 距离中心
            </div>
            <div className="text-3xl font-bold text-white">{getDistanceFromCenter()}</div>
            <button
              onClick={handleNavigate}
              className="mt-3 w-full py-2 rounded-lg bg-gradient-to-r from-yellow-500/20 to-orange-500/20 hover:from-yellow-500/30 hover:to-orange-500/30 border border-yellow-500/40 text-yellow-400 text-sm font-medium transition-all flex items-center justify-center gap-1.5"
            >
              <span>🧭</span> 一键导航
            </button>
          </div>
          <div className="rounded-2xl bg-slate-800/50 border border-slate-700/50 p-5">
            <div className="flex items-center gap-2 text-slate-400 text-xs mb-2">
              <span>⏱️</span> GPS 更新
            </div>
            <div className="text-lg font-bold text-slate-200">
              {formatTime(status.last_gps_time)}
            </div>
            <div className="flex items-center gap-3 mt-2 text-xs">
              <span
                className={`px-2 py-0.5 rounded-full ${
                  status.is_locked
                    ? 'bg-green-500/20 text-green-400'
                    : 'bg-red-500/20 text-red-400'
                }`}
              >
                {status.is_locked ? '🔒 已锁车' : '🔓 未锁车'}
              </span>
              <span
                className={`px-2 py-0.5 rounded-full ${
                  status.is_charging
                    ? 'bg-blue-500/20 text-blue-400'
                    : 'bg-slate-500/20 text-slate-400'
                }`}
              >
                {status.is_charging ? '⚡ 充电中' : '未充电'}
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-2xl overflow-hidden border border-slate-700/50 bg-slate-900 h-[500px] md:h-[600px]">
          <MapContainer
            center={position}
            zoom={15}
            style={{ height: '100%', width: '100%' }}
            scrollWheelZoom={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <AutoCenter position={position} />
            {showTrail && trailCoords.length > 1 && (
              <Polyline
                positions={trailCoords}
                color="#0ea5e9"
                weight={4}
                opacity={0.7}
                dashArray="8, 8"
              />
            )}
            {status && (
              <Circle
                center={position}
                radius={100}
                color="#0ea5e9"
                fillColor="#0ea5e9"
                fillOpacity={0.08}
                weight={2}
                opacity={0.5}
              />
            )}
            {status && (
              <Marker position={position} icon={buildCarIcon(status.battery_level)}>
                <Popup>
                  <div className="text-sm p-1 min-w-[200px]">
                    <div className="font-bold text-ev-primary text-base mb-2">
                      🚗 {status.vehicle_id}
                    </div>
                    <div className="space-y-1 text-slate-600">
                      <div>
                        🌐 经度: <span className="font-mono">{status.longitude.toFixed(7)}</span>
                      </div>
                      <div>
                        🌐 纬度: <span className="font-mono">{status.latitude.toFixed(7)}</span>
                      </div>
                      <div>
                        🔋 电量:{' '}
                        <span className={getBatteryColor(status.battery_level).replace('text-', '')}>
                          {status.battery_level}%
                        </span>
                      </div>
                      <div>
                        🛣️ 续航: {status.range_estimate} km
                      </div>
                      <div className="text-xs text-slate-400 pt-1 border-t mt-2">
                        更新: {formatTime(status.last_gps_time)}
                      </div>
                    </div>
                  </div>
                </Popup>
              </Marker>
            )}
          </MapContainer>
        </div>

        <div className="space-y-5">
          <div className="rounded-2xl bg-slate-800/50 border border-slate-700/50 p-5">
            <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
              <span>🤖</span> 模拟车机端上报
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-white">自动模拟</div>
                  <div className="text-xs text-slate-500">每 5 秒上报一次</div>
                </div>
                <button
                  onClick={() => setSimulateActive(!simulateActive)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    simulateActive
                      ? 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30'
                      : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30'
                  }`}
                >
                  {simulateActive ? '⏹ 停止模拟' : '▶ 开始模拟'}
                </button>
              </div>
              <button
                onClick={handleSimulateOnce}
                disabled={loading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-ev-primary to-ev-secondary hover:from-ev-secondary hover:to-ev-primary text-white font-medium shadow-lg shadow-ev-primary/25 transition-all disabled:opacity-60"
              >
                {loading ? '处理中...' : '🎲 单次随机上报'}
              </button>
            </div>
          </div>

          <div className="rounded-2xl bg-slate-800/50 border border-slate-700/50 p-5">
            <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
              <span>✍️</span> 手动上报数据
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">经度 (Longitude)</label>
                <input
                  type="number"
                  step="0.0000001"
                  value={manualLng}
                  onChange={(e) => setManualLng(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-sm text-slate-200 focus:border-ev-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">纬度 (Latitude)</label>
                <input
                  type="number"
                  step="0.0000001"
                  value={manualLat}
                  onChange={(e) => setManualLat(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-sm text-slate-200 focus:border-ev-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">
                  电量: <span className={getBatteryColor(manualBattery)}>{manualBattery}%</span>
                </label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={manualBattery}
                  onChange={(e) => setManualBattery(Number(e.target.value))}
                  className="w-full h-2 rounded-full appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, #ef4444 0%, #eab308 30%, #22c55e 60%, #22c55e 100%)`,
                  }}
                />
              </div>
              <button
                onClick={handleManualReport}
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-medium transition-all disabled:opacity-60 border border-slate-600"
              >
                📡 提交上报
              </button>
              <div className="text-xs text-slate-500 space-y-1 pt-2 border-t border-slate-700/50">
                <div>💡 示例坐标 (北京天安门):</div>
                <div className="font-mono">经度 116.3974280, 纬度 39.9092300</div>
              </div>
            </div>
          </div>

          {status && (
            <div className="rounded-2xl bg-slate-800/50 border border-slate-700/50 p-5">
              <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                <span>📊</span> 原始数据
              </h3>
              <div className="space-y-2 text-xs font-mono bg-slate-900/60 rounded-lg p-3 max-h-44 overflow-y-auto">
                <div className="flex justify-between">
                  <span className="text-slate-500">VehicleID:</span>
                  <span className="text-ev-primary">{status.vehicle_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Longitude:</span>
                  <span className="text-slate-200">{status.longitude.toFixed(7)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Latitude:</span>
                  <span className="text-slate-200">{status.latitude.toFixed(7)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Battery:</span>
                  <span className={getBatteryColor(status.battery_level)}>
                    {status.battery_level}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Range:</span>
                  <span className="text-slate-200">{status.range_estimate} km</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Locked:</span>
                  <span className="text-slate-200">{String(status.is_locked)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Charging:</span>
                  <span className="text-slate-200">{String(status.is_charging)}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl bg-slate-800/50 border border-slate-700/50 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-700/50 flex items-center justify-between">
          <h3 className="font-semibold text-white flex items-center gap-2">
            <span>📈</span> 位置上报历史轨迹
            <span className="text-xs font-normal text-slate-500 ml-2">
              (共 {history.length} 条记录)
            </span>
          </h3>
          <button
            onClick={fetchHistory}
            className="text-xs px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 transition-all"
          >
            🔄 刷新
          </button>
        </div>
        {history.length === 0 ? (
          <div className="p-10 text-center text-slate-500">
            暂无轨迹记录，点击上方按钮进行一次上报
          </div>
        ) : (
          <div className="max-h-64 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-slate-800/95 backdrop-blur">
                <tr className="text-slate-500 border-b border-slate-700/50">
                  <th className="text-left px-6 py-3 font-medium">时间</th>
                  <th className="text-left px-6 py-3 font-medium hidden md:table-cell">
                    经度
                  </th>
                  <th className="text-left px-6 py-3 font-medium hidden md:table-cell">
                    纬度
                  </th>
                  <th className="text-left px-6 py-3 font-medium">电量</th>
                  <th className="text-left px-6 py-3 font-medium hidden lg:table-cell">
                    续航
                  </th>
                </tr>
              </thead>
              <tbody>
                {[...history].reverse().map((h, idx, arr) => (
                  <tr
                    key={h.id || idx}
                    className={`border-b border-slate-700/30 hover:bg-slate-700/20 transition-colors ${
                      idx === 0 ? 'bg-ev-primary/5' : ''
                    }`}
                  >
                    <td className="px-6 py-3 text-slate-300 whitespace-nowrap">
                      {idx === 0 && (
                        <span className="inline-block w-2 h-2 rounded-full bg-ev-primary animate-pulse mr-2"></span>
                      )}
                      {formatTime(h.reported_at)}
                    </td>
                    <td className="px-6 py-3 font-mono text-slate-400 hidden md:table-cell">
                      {h.longitude.toFixed(7)}
                    </td>
                    <td className="px-6 py-3 font-mono text-slate-400 hidden md:table-cell">
                      {h.latitude.toFixed(7)}
                    </td>
                    <td className="px-6 py-3">
                      <span className={getBatteryColor(h.battery_level)}>
                        {h.battery_level}%
                      </span>
                    </td>
                    <td className="px-6 py-3 text-slate-300 hidden lg:table-cell">
                      {h.range_estimate} km
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
