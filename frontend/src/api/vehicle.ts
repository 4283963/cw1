import client from './client'
import {
  ApiResponse,
  ReportVehicleRequest,
  VehicleStatus,
  VehicleStatusHistory,
} from '../types'

function sanitizeReport(data: ReportVehicleRequest): ReportVehicleRequest {
  return {
    vehicle_id: String(data.vehicle_id ?? ''),
    longitude: Number(data.longitude) || 0,
    latitude: Number(data.latitude) || 0,
    battery_level: Number(data.battery_level) || 0,
    range_estimate: data.range_estimate != null
      ? Number(data.range_estimate)
      : undefined,
    is_locked: data.is_locked != null ? Boolean(data.is_locked) : undefined,
    is_charging:
      data.is_charging != null ? Boolean(data.is_charging) : undefined,
  }
}

export const reportVehicleStatus = (
  data: ReportVehicleRequest,
): Promise<ApiResponse<VehicleStatus>> =>
  client.post('/vehicle/report', sanitizeReport(data))

export const getVehicleStatus = (
  vehicleId: string,
): Promise<ApiResponse<VehicleStatus>> =>
  client.get(`/vehicle/status/${encodeURIComponent(vehicleId)}`)

export const getVehicleStatusHistory = (
  vehicleId: string,
  limit = 100,
): Promise<ApiResponse<VehicleStatusHistory[]>> =>
  client.get(`/vehicle/history/${encodeURIComponent(vehicleId)}`, {
    params: { limit: Number(limit) },
  })

export const simulateVehicleReport = (
  vehicleId: string,
  lng?: number,
  lat?: number,
): Promise<ApiResponse<VehicleStatus>> =>
  client.post('/vehicle/simulate', null, {
    params: {
      vehicle_id: String(vehicleId),
      lng: lng != null ? Number(lng) : undefined,
      lat: lat != null ? Number(lat) : undefined,
    },
  })
