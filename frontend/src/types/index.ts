export type ACStatus = 'pending' | 'running' | 'stopped' | 'failed'

export type ACMode = 'cool' | 'heat' | 'auto' | 'vent'

export interface ACCommand {
  id: number
  vehicle_id: string
  user_id: string
  target_temp: number
  mode: ACMode
  fan_speed: number
  status: ACStatus
  start_time: string | null
  stop_time: string | null
  message: string
  created_at: string
  updated_at: string
}

export interface StartACRequest {
  vehicle_id: string
  user_id?: string
  target_temp: number
  mode?: ACMode
  fan_speed?: number
}

export interface StopACRequest {
  vehicle_id: string
  user_id?: string
  message?: string
}

export interface UpdateACStatusRequest {
  command_id: number
  status: ACStatus
  message?: string
}

export interface VehicleStatus {
  id: number
  vehicle_id: string
  longitude: number
  latitude: number
  battery_level: number
  range_estimate: number
  is_locked: boolean
  is_charging: boolean
  last_gps_time: string
  created_at: string
  updated_at: string
}

export interface VehicleStatusHistory {
  id: number
  vehicle_id: string
  longitude: number
  latitude: number
  battery_level: number
  range_estimate: number
  reported_at: string
}

export interface ReportVehicleRequest {
  vehicle_id: string
  longitude: number
  latitude: number
  battery_level: number
  range_estimate?: number
  is_locked?: boolean
  is_charging?: boolean
}

export interface ApiResponse<T> {
  message: string
  data: T
}

export const DEFAULT_VEHICLE_ID = 'VIN-DEMO-001'
export const DEFAULT_USER_ID = 'USER-001'
