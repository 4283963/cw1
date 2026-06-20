import client from './client'
import {
  ACCommand,
  ApiResponse,
  StartACRequest,
  StopACRequest,
  UpdateACStatusRequest,
} from '../types'

function sanitizeStartAC(data: StartACRequest): StartACRequest {
  return {
    vehicle_id: String(data.vehicle_id ?? ''),
    user_id: data.user_id ? String(data.user_id) : undefined,
    target_temp: Number(data.target_temp) || 24,
    mode: data.mode,
    fan_speed: Number(data.fan_speed) || 0,
  }
}

function sanitizeStopAC(data: StopACRequest): StopACRequest {
  return {
    vehicle_id: String(data.vehicle_id ?? ''),
    user_id: data.user_id ? String(data.user_id) : undefined,
    message: data.message ? String(data.message) : undefined,
  }
}

function sanitizeUpdateStatus(data: UpdateACStatusRequest): UpdateACStatusRequest {
  return {
    command_id: Number(data.command_id) as number,
    status: data.status,
    message: data.message ? String(data.message) : undefined,
  }
}

export const startAC = (
  data: StartACRequest,
): Promise<ApiResponse<ACCommand>> =>
  client.post('/ac/start', sanitizeStartAC(data))

export const stopAC = (data: StopACRequest): Promise<ApiResponse<ACCommand>> =>
  client.post('/ac/stop', sanitizeStopAC(data))

export const getACStatus = (
  vehicleId: string,
): Promise<ApiResponse<ACCommand | null>> =>
  client.get(`/ac/status/${encodeURIComponent(vehicleId)}`)

export const getACHistory = (
  vehicleId: string,
  limit = 20,
): Promise<ApiResponse<ACCommand[]>> =>
  client.get(`/ac/history/${encodeURIComponent(vehicleId)}`, {
    params: { limit: Number(limit) },
  })

export const getPendingACCommands = (
  vehicleId: string,
): Promise<ApiResponse<ACCommand[]>> =>
  client.get(`/ac/pending/${encodeURIComponent(vehicleId)}`)

export const updateACStatus = (
  data: UpdateACStatusRequest,
): Promise<ApiResponse<ACCommand>> =>
  client.put('/ac/status', sanitizeUpdateStatus(data))
