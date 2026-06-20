package store

import (
	"cw1/backend/internal/models"
	"sync"
	"time"
)

var (
	acCommandsMu      sync.RWMutex
	acCommands        = make([]models.ACCommand, 0)
	acCommandSeq uint = 0

	vehicleStatusMu   sync.RWMutex
	vehicleStatusMap  = make(map[string]*models.VehicleStatus)

	vehicleHistoryMu  sync.RWMutex
	vehicleHistoryMap = make(map[string][]models.VehicleStatusHistory)
)

func SaveACCommand(cmd *models.ACCommand) error {
	acCommandsMu.Lock()
	defer acCommandsMu.Unlock()

	acCommandSeq++
	cmd.ID = acCommandSeq
	now := time.Now()
	cmd.CreatedAt = now
	cmd.UpdatedAt = now
	acCommands = append(acCommands, *cmd)
	return nil
}

func GetACCommandsByVehicleID(vehicleID string) ([]models.ACCommand, error) {
	acCommandsMu.RLock()
	defer acCommandsMu.RUnlock()

	result := make([]models.ACCommand, 0)
	for i := len(acCommands) - 1; i >= 0; i-- {
		if acCommands[i].VehicleID == vehicleID {
			result = append(result, acCommands[i])
		}
	}
	return result, nil
}

func GetLatestACCommand(vehicleID string) (*models.ACCommand, error) {
	acCommandsMu.RLock()
	defer acCommandsMu.RUnlock()

	for i := len(acCommands) - 1; i >= 0; i-- {
		if acCommands[i].VehicleID == vehicleID {
			cmd := acCommands[i]
			return &cmd, nil
		}
	}
	return nil, nil
}

func UpdateACCommandStatus(id uint, status models.ACStatus, message string) error {
	acCommandsMu.Lock()
	defer acCommandsMu.Unlock()

	for i := range acCommands {
		if acCommands[i].ID == id {
			acCommands[i].Status = status
			acCommands[i].Message = message
			now := time.Now()
			acCommands[i].UpdatedAt = now
			if status == models.ACStatusRunning {
				acCommands[i].StartTime = &now
			} else if status == models.ACStatusStopped {
				acCommands[i].StopTime = &now
			}
			return nil
		}
	}
	return nil
}

func GetPendingACCommands(vehicleID string) ([]models.ACCommand, error) {
	acCommandsMu.RLock()
	defer acCommandsMu.RUnlock()

	result := make([]models.ACCommand, 0)
	for i := len(acCommands) - 1; i >= 0; i-- {
		if acCommands[i].VehicleID == vehicleID && acCommands[i].Status == models.ACStatusPending {
			result = append(result, acCommands[i])
		}
	}
	return result, nil
}

func UpsertVehicleStatus(status *models.VehicleStatus) error {
	vehicleStatusMu.Lock()
	defer vehicleStatusMu.Unlock()

	existing, ok := vehicleStatusMap[status.VehicleID]
	now := time.Now()
	if ok {
		existing.Longitude = status.Longitude
		existing.Latitude = status.Latitude
		existing.BatteryLevel = status.BatteryLevel
		existing.RangeEstimate = status.RangeEstimate
		existing.IsLocked = status.IsLocked
		existing.IsCharging = status.IsCharging
		existing.LastGPSTime = now
		existing.UpdatedAt = now
		existing.ID = existing.ID
	} else {
		status.ID = 1
		status.CreatedAt = now
		status.UpdatedAt = now
		status.LastGPSTime = now
		vehicleStatusMap[status.VehicleID] = status
	}

	vehicleHistoryMu.Lock()
	defer vehicleHistoryMu.Unlock()
	history := models.VehicleStatusHistory{
		VehicleID:     status.VehicleID,
		Longitude:     status.Longitude,
		Latitude:      status.Latitude,
		BatteryLevel:  status.BatteryLevel,
		RangeEstimate: status.RangeEstimate,
		ReportedAt:    now,
	}
	vehicleHistoryMap[status.VehicleID] = append(vehicleHistoryMap[status.VehicleID], history)

	return nil
}

func GetVehicleStatus(vehicleID string) (*models.VehicleStatus, error) {
	vehicleStatusMu.RLock()
	defer vehicleStatusMu.RUnlock()

	status, ok := vehicleStatusMap[vehicleID]
	if !ok {
		return nil, nil
	}
	return status, nil
}

func GetVehicleStatusHistory(vehicleID string, limit int) ([]models.VehicleStatusHistory, error) {
	vehicleHistoryMu.RLock()
	defer vehicleHistoryMu.RUnlock()

	history, ok := vehicleHistoryMap[vehicleID]
	if !ok {
		return []models.VehicleStatusHistory{}, nil
	}

	if limit > 0 && len(history) > limit {
		start := len(history) - limit
		return history[start:], nil
	}
	return history, nil
}
