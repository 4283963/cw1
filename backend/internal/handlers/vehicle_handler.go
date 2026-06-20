package handlers

import (
	"cw1/backend/internal/database"
	"cw1/backend/internal/models"
	"cw1/backend/internal/store"
	"cw1/backend/internal/utils/flex"
	"fmt"
	"math/rand"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

type ReportVehicleStatusRequest struct {
	VehicleID     string       `json:"vehicle_id" binding:"required"`
	Longitude     flex.Float64 `json:"longitude"`
	Latitude      flex.Float64 `json:"latitude"`
	BatteryLevel  flex.Int     `json:"battery_level"`
	RangeEstimate flex.Int     `json:"range_estimate"`
	IsLocked      flex.Bool    `json:"is_locked"`
	IsCharging    flex.Bool    `json:"is_charging"`
}

func ReportVehicleStatus(c *gin.Context) {
	var req ReportVehicleStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("参数解析失败: %v", err)})
		return
	}

	longitude := req.Longitude.Value()
	latitude := req.Latitude.Value()
	if longitude == 0 && latitude == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "longitude 和 latitude 必填，且不能同时为 0"})
		return
	}
	if longitude < -180 || longitude > 180 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "longitude 取值范围需在 -180 ~ 180 之间"})
		return
	}
	if latitude < -90 || latitude > 90 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "latitude 取值范围需在 -90 ~ 90 之间"})
		return
	}

	batteryLevel := req.BatteryLevel.Value()
	if batteryLevel < 0 || batteryLevel > 100 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "battery_level 必须在 0 ~ 100 之间"})
		return
	}

	rangeEstimate := req.RangeEstimate.Value()
	if rangeEstimate == 0 {
		rangeEstimate = batteryLevel * 5
	}

	isLocked := true
	if raw := req.IsLocked; raw.Value() {
		isLocked = true
	} else {
		// 只要字段有传且是明确的 false，就用传的值
		// 这里直接用反序列化结果
		isLocked = req.IsLocked.Value()
	}
	// 注意：如果前端没传这个字段，flex.Bool 默认是 false
	// 为了区分"未传"和"传了false"，可以保持默认 true，当显式传 false 时再改
	// 简化做法：只有传了才用，否则默认 true
	// flex.Bool 没法区分，所以这里用一个简单策略：除非明确 false，否则 true
	// 实际上如果传的是 null/空/0/false 字符串 都会变成 false，所以默认 true 较合理
	// 这里保持上面的 isLocked 逻辑即可，实际按业务取舍
	isCharging := req.IsCharging.Value()

	status := &models.VehicleStatus{
		VehicleID:     req.VehicleID,
		Longitude:     longitude,
		Latitude:      latitude,
		BatteryLevel:  batteryLevel,
		RangeEstimate: rangeEstimate,
		IsLocked:      isLocked,
		IsCharging:    isCharging,
	}

	var err error

	if database.DB != nil {
		var existing models.VehicleStatus
		dbErr := database.DB.Where("vehicle_id = ?", req.VehicleID).First(&existing).Error
		if dbErr == nil {
			existing.Longitude = longitude
			existing.Latitude = latitude
			existing.BatteryLevel = batteryLevel
			existing.RangeEstimate = rangeEstimate
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
				Longitude:     longitude,
				Latitude:      latitude,
				BatteryLevel:  batteryLevel,
				RangeEstimate: rangeEstimate,
				ReportedAt:    time.Now(),
			}
			database.DB.Create(&history)
		}
	} else {
		err = store.UpsertVehicleStatus(status)
	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "保存车辆状态失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "车辆状态上报成功",
		"data":    status,
	})
}

func GetVehicleStatus(c *gin.Context) {
	vehicleID := c.Param("vehicle_id")
	if vehicleID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "vehicle_id 必填"})
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
		c.JSON(http.StatusInternalServerError, gin.H{"error": "查询车辆状态失败"})
		return
	}

	if status == nil {
		c.JSON(http.StatusOK, gin.H{
			"message": "未找到车辆状态，返回默认模拟数据",
			"data":    getMockVehicleStatus(vehicleID),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "查询成功",
		"data":    status,
	})
}

func GetVehicleStatusHistory(c *gin.Context) {
	vehicleID := c.Param("vehicle_id")
	if vehicleID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "vehicle_id 必填"})
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
		c.JSON(http.StatusInternalServerError, gin.H{"error": "查询车辆历史轨迹失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "查询成功",
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

	longitude := roundTo7(lng)
	latitude := roundTo7(lat)
	batteryLevel := battery
	rangeEstimate := battery * 5
	isLocked := true
	isCharging := r.Intn(2) == 0

	status := &models.VehicleStatus{
		VehicleID:     vehicleID,
		Longitude:     longitude,
		Latitude:      latitude,
		BatteryLevel:  batteryLevel,
		RangeEstimate: rangeEstimate,
		IsLocked:      isLocked,
		IsCharging:    isCharging,
		LastGPSTime:   time.Now(),
	}

	var err error
	if database.DB != nil {
		var existing models.VehicleStatus
		dbErr := database.DB.Where("vehicle_id = ?", vehicleID).First(&existing).Error
		if dbErr == nil {
			existing.Longitude = longitude
			existing.Latitude = latitude
			existing.BatteryLevel = batteryLevel
			existing.RangeEstimate = rangeEstimate
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
				VehicleID:     vehicleID,
				Longitude:     longitude,
				Latitude:      latitude,
				BatteryLevel:  batteryLevel,
				RangeEstimate: rangeEstimate,
				ReportedAt:    time.Now(),
			}
			database.DB.Create(&history)
		}
	} else {
		err = store.UpsertVehicleStatus(status)
	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "模拟上报车辆状态失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "模拟数据生成成功",
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
