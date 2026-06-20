import client from './client'
import {
  ACCommand,
  ApiResponse,
  StartACRequest,
  StopACRequest,
  UpdateACStatusRequest,
} from '../types'

export const startAC = (data: StartACRequest): Promise<ApiResponse<ACCommand>> =>
  client.post('/ac/start', data)

export const stopAC = (data: StopACRequest): Promise<ApiResponse<ACCommand>> =>
  client.post('/ac/stop', data)

export const getACStatus = (
  vehicleId: string,
): Promise<ApiResponse<ACCommand | null>> => client.get(`/ac/status/${vehicleId}`)

export const getACHistory = (
  vehicleId: string,
  limit = 20,
): Promise<ApiResponse<ACCommand[]>> =>
  client.get(`/ac/history/${vehicleId}`, { params: { limit } })

export const getPendingACCommands = (
  vehicleId: string,
): Promise<ApiResponse<ACCommand[]>> => client.get(`/ac/pending/${vehicleId}`)

export const updateACStatus = (
  data: UpdateACStatusRequest,
): Promise<ApiResponse<ACCommand>> => client.put('/ac/status', data)
