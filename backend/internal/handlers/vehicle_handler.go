package handlers

import (
	"cw1/backend/internal/database"
	"cw1/backend/internal/models"
	"cw1/backend/internal/store"
	"math/rand"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

type ReportVehicleStatusRequest struct {
	VehicleID     string  `json:"vehicle_id" binding:"required"`
	Longitude     float64 `json:"longitude" binding:"required"`
	Latitude      float64 `json:"latitude" binding:"required"`
	BatteryLevel  int     `json:"battery_level" binding:"required,min=0,max=100"`
	RangeEstimate int     `json:"range_estimate"`
	IsLocked      *bool   `json:"is_locked"`
	IsCharging    *bool   `json:"is_charging"`
}

func ReportVehicleStatus(c *gin.Context) {
	var req ReportVehicleStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.RangeEstimate == 0 {
		req.RangeEstimate = req.BatteryLevel * 5
	}

	isLocked := true
	if req.IsLocked != nil {
		isLocked = *req.IsLocked
	}
	isCharging := false
	if req.IsCharging != nil {
		isCharging = *req.IsCharging
	}

	status := &models.VehicleStatus{
		VehicleID:     req.VehicleID,
		Longitude:     req.Longitude,
		Latitude:      req.Latitude,
		BatteryLevel:  req.BatteryLevel,
		RangeEstimate: req.RangeEstimate,
		IsLocked:      isLocked,
		IsCharging:    isCharging,
	}

	var err error

	if database.DB != nil {
		var existing models.VehicleStatus
		dbErr := database.DB.Where("vehicle_id = ?", req.VehicleID).First(&existing).Error
		if dbErr == nil {
			existing.Longitude = req.Longitude
			existing.Latitude = req.Latitude
			existing.BatteryLevel = req.BatteryLevel
			existing.RangeEstimate = req.RangeEstimate
			existing.IsLocked = isLocked
			existing.IsCharging = isCharging
			existing.LastGPSTime = time.Now()
			existing.UpdatedAt = time.Now()
			err = database.DB.Save(&existing).Error
			status = &existing
		} else {
			status.LastGPSTime = time.Now()
			err = database.DB.Create(status).Error
		}

		if err == nil {
			history := models.VehicleStatusHistory{
				VehicleID:     req.VehicleID,
				Longitude:     req.Longitude,
				Latitude:      req.Latitude,
				BatteryLevel:  req.BatteryLevel,
				RangeEstimate: req.RangeEstimate,
				ReportedAt:    time.Now(),
			}
			database.DB.Create(&history)
		}
	} else {
		err = store.UpsertVehicleStatus(status)
	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save vehicle status"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Vehicle status reported successfully",
		"data":    status,
	})
}

func GetVehicleStatus(c *gin.Context) {
	vehicleID := c.Param("vehicle_id")
	if vehicleID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "vehicle_id is required"})
		return
	}

	var status *models.VehicleStatus
	var err error

	if database.DB != nil {
		var s models.VehicleStatus
		dbErr := database.DB.Where("vehicle_id = ?", vehicleID).First(&s).Error
		if dbErr == nil {
			status = &s
		}
	} else {
		status, err = store.GetVehicleStatus(vehicleID)
	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to query vehicle status"})
		return
	}

	if status == nil {
		c.JSON(http.StatusOK, gin.H{
			"message": "No status found for vehicle, returning default mock data",
			"data":    getMockVehicleStatus(vehicleID),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Success",
		"data":    status,
	})
}

func GetVehicleStatusHistory(c *gin.Context) {
	vehicleID := c.Param("vehicle_id")
	if vehicleID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "vehicle_id is required"})
		return
	}

	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "100"))

	var history []models.VehicleStatusHistory
	var err error

	if database.DB != nil {
		err = database.DB.Where("vehicle_id = ?", vehicleID).
			Order("reported_at desc").Limit(limit).Find(&history).Error
	} else {
		history, err = store.GetVehicleStatusHistory(vehicleID, limit)
	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to query vehicle history"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Success",
		"data":    history,
	})
}

func SimulateVehicleReport(c *gin.Context) {
	vehicleID := c.DefaultQuery("vehicle_id", "VIN-DEMO-001")
	baseLng, _ := strconv.ParseFloat(c.DefaultQuery("lng", "116.397"), 64)
	baseLat, _ := strconv.ParseFloat(c.DefaultQuery("lat", "39.908"), 64)

	src := rand.NewSource(time.Now().UnixNano())
	r := rand.New(src)

	lng := baseLng + (r.Float64()-0.5)*0.01
	lat := baseLat + (r.Float64()-0.5)*0.01
	battery := 50 + r.Intn(50)

	req := ReportVehicleStatusRequest{
		VehicleID:     vehicleID,
		Longitude:     roundTo7(lng),
		Latitude:      roundTo7(lat),
		BatteryLevel:  battery,
		RangeEstimate: battery * 5,
	}

	isLocked := true
	isCharging := r.Intn(2) == 0
	req.IsLocked = &isLocked
	req.IsCharging = &isCharging

	status := &models.VehicleStatus{
		VehicleID:     req.VehicleID,
		Longitude:     req.Longitude,
		Latitude:      req.Latitude,
		BatteryLevel:  req.BatteryLevel,
		RangeEstimate: req.RangeEstimate,
		IsLocked:      isLocked,
		IsCharging:    isCharging,
		LastGPSTime:   time.Now(),
	}

	var err error
	if database.DB != nil {
		var existing models.VehicleStatus
		dbErr := database.DB.Where("vehicle_id = ?", req.VehicleID).First(&existing).Error
		if dbErr == nil {
			existing.Longitude = req.Longitude
			existing.Latitude = req.Latitude
			existing.BatteryLevel = req.BatteryLevel
			existing.RangeEstimate = req.RangeEstimate
			existing.IsLocked = isLocked
			existing.IsCharging = isCharging
			existing.LastGPSTime = time.Now()
			existing.UpdatedAt = time.Now()
			err = database.DB.Save(&existing).Error
			status = &existing
		} else {
			err = database.DB.Create(status).Error
		}

		if err == nil {
			history := models.VehicleStatusHistory{
				VehicleID:     req.VehicleID,
				Longitude:     req.Longitude,
				Latitude:      req.Latitude,
				BatteryLevel:  req.BatteryLevel,
				RangeEstimate: req.RangeEstimate,
				ReportedAt:    time.Now(),
			}
			database.DB.Create(&history)
		}
	} else {
		err = store.UpsertVehicleStatus(status)
	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to simulate vehicle report"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Simulation data generated successfully",
		"data":    status,
	})
}

func getMockVehicleStatus(vehicleID string) *models.VehicleStatus {
	return &models.VehicleStatus{
		VehicleID:     vehicleID,
		Longitude:     116.3971280,
		Latitude:      39.9075000,
		BatteryLevel:  78,
		RangeEstimate: 390,
		IsLocked:      true,
		IsCharging:    false,
		LastGPSTime:   time.Now(),
		CreatedAt:     time.Now(),
		UpdatedAt:     time.Now(),
	}
}

func roundTo7(val float64) float64 {
	mult := 10000000.0
	return float64(int(val*mult+0.5)) / mult
}

func dbNow() *time.Time {
	now := time.Now()
	return &now
}
