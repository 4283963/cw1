import client from './client'
import {
  ApiResponse,
  ReportVehicleRequest,
  VehicleStatus,
  VehicleStatusHistory,
} from '../types'

export const reportVehicleStatus = (
  data: ReportVehicleRequest,
): Promise<ApiResponse<VehicleStatus>> => client.post('/vehicle/report', data)

export const getVehicleStatus = (
  vehicleId: string,
): Promise<ApiResponse<VehicleStatus>> => client.get(`/vehicle/status/${vehicleId}`)

export const getVehicleStatusHistory = (
  vehicleId: string,
  limit = 100,
): Promise<ApiResponse<VehicleStatusHistory[]>> =>
  client.get(`/vehicle/history/${vehicleId}`, { params: { limit } })

export const simulateVehicleReport = (
  vehicleId: string,
  lng?: number,
  lat?: number,
): Promise<ApiResponse<VehicleStatus>> =>
  client.post('/vehicle/simulate', null, {
    params: {
      vehicle_id: vehicleId,
      lng,
      lat,
    },
  })
