package handlers

import (
	"cw1/backend/internal/database"
	"cw1/backend/internal/models"
	"cw1/backend/internal/store"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type StartACRequest struct {
	VehicleID  string  `json:"vehicle_id" binding:"required"`
	UserID     string  `json:"user_id"`
	TargetTemp float64 `json:"target_temp" binding:"required,min=16,max=32"`
	Mode       string  `json:"mode"`
	FanSpeed   int     `json:"fan_speed" binding:"min=1,max=7"`
}

type StopACRequest struct {
	VehicleID string `json:"vehicle_id" binding:"required"`
	UserID    string `json:"user_id"`
	Message   string `json:"message"`
}

type UpdateACStatusRequest struct {
	CommandID uint           `json:"command_id" binding:"required"`
	Status    models.ACStatus `json:"status" binding:"required"`
	Message   string         `json:"message"`
}

func StartAC(c *gin.Context) {
	var req StartACRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.Mode == "" {
		req.Mode = "auto"
	}
	if req.FanSpeed == 0 {
		req.FanSpeed = 3
	}

	cmd := &models.ACCommand{
		VehicleID:  req.VehicleID,
		UserID:     req.UserID,
		TargetTemp: req.TargetTemp,
		Mode:       req.Mode,
		FanSpeed:   req.FanSpeed,
		Status:     models.ACStatusPending,
	}

	var err error
	if database.DB != nil {
		err = database.DB.Create(cmd).Error
	} else {
		err = store.SaveACCommand(cmd)
	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create AC command"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "AC command created successfully",
		"data":    cmd,
	})
}

func StopAC(c *gin.Context) {
	var req StopACRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var latestCmd *models.ACCommand
	var err error

	if database.DB != nil {
		var cmd models.ACCommand
		dbErr := database.DB.Where("vehicle_id = ?", req.VehicleID).
			Order("created_at desc").First(&cmd).Error
		if dbErr != nil && dbErr != gorm.ErrRecordNotFound {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to query AC command"})
			return
		}
		if dbErr == nil {
			latestCmd = &cmd
		}
	} else {
		latestCmd, err = store.GetLatestACCommand(req.VehicleID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
	}

	if latestCmd == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "No AC command found for vehicle"})
		return
	}

	msg := req.Message
	if msg == "" {
		msg = "User stopped AC"
	}

	if database.DB != nil {
		now := dbNow()
		database.DB.Model(latestCmd).Updates(map[string]interface{}{
			"status":    models.ACStatusStopped,
			"message":   msg,
			"stop_time": now,
		})
		latestCmd.Status = models.ACStatusStopped
		latestCmd.Message = msg
	} else {
		_ = store.UpdateACCommandStatus(latestCmd.ID, models.ACStatusStopped, msg)
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "AC stopped successfully",
		"data":    latestCmd,
	})
}

func GetACStatus(c *gin.Context) {
	vehicleID := c.Param("vehicle_id")
	if vehicleID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "vehicle_id is required"})
		return
	}

	var latestCmd *models.ACCommand
	var err error

	if database.DB != nil {
		var cmd models.ACCommand
		dbErr := database.DB.Where("vehicle_id = ?", vehicleID).
			Order("created_at desc").First(&cmd).Error
		if dbErr != nil && dbErr != gorm.ErrRecordNotFound {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to query AC command"})
			return
		}
		if dbErr == nil {
			latestCmd = &cmd
		}
	} else {
		latestCmd, err = store.GetLatestACCommand(vehicleID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
	}

	if latestCmd == nil {
		c.JSON(http.StatusOK, gin.H{
			"message": "No active AC command",
			"data":    nil,
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Success",
		"data":    latestCmd,
	})
}

func GetACHistory(c *gin.Context) {
	vehicleID := c.Param("vehicle_id")
	if vehicleID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "vehicle_id is required"})
		return
	}

	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))

	var commands []models.ACCommand
	var err error

	if database.DB != nil {
		err = database.DB.Where("vehicle_id = ?", vehicleID).
			Order("created_at desc").Limit(limit).Find(&commands).Error
	} else {
		commands, err = store.GetACCommandsByVehicleID(vehicleID)
		if err == nil && limit > 0 && len(commands) > limit {
			commands = commands[:limit]
		}
	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to query AC history"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Success",
		"data":    commands,
	})
}

func GetPendingACCommands(c *gin.Context) {
	vehicleID := c.Param("vehicle_id")
	if vehicleID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "vehicle_id is required"})
		return
	}

	var commands []models.ACCommand
	var err error

	if database.DB != nil {
		err = database.DB.Where("vehicle_id = ? AND status = ?", vehicleID, models.ACStatusPending).
			Order("created_at desc").Find(&commands).Error
	} else {
		commands, err = store.GetPendingACCommands(vehicleID)
	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to query pending commands"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Success",
		"data":    commands,
	})
}

func UpdateACStatus(c *gin.Context) {
	var req UpdateACStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	validStatuses := map[models.ACStatus]bool{
		models.ACStatusPending: true,
		models.ACStatusRunning: true,
		models.ACStatusStopped: true,
		models.ACStatusFailed:  true,
	}

	if !validStatuses[req.Status] {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid status"})
		return
	}

	var cmd models.ACCommand
	found := false

	if database.DB != nil {
		if dbErr := database.DB.First(&cmd, req.CommandID).Error; dbErr == nil {
			updates := map[string]interface{}{
				"status":  req.Status,
				"message": req.Message,
			}
			if req.Status == models.ACStatusRunning {
				updates["start_time"] = dbNow()
			} else if req.Status == models.ACStatusStopped {
				updates["stop_time"] = dbNow()
			}
			database.DB.Model(&cmd).Updates(updates)
			database.DB.First(&cmd, req.CommandID)
			found = true
		}
	} else {
		if err := store.UpdateACCommandStatus(req.CommandID, req.Status, req.Message); err == nil {
			cmds, _ := store.GetACCommandsByVehicleID(cmd.VehicleID)
			for _, c := range cmds {
				if c.ID == req.CommandID {
					cmd = c
					found = true
					break
				}
			}
			if !found {
				cmd.ID = req.CommandID
				cmd.Status = req.Status
				cmd.Message = req.Message
				found = true
			}
		}
	}

	if !found {
		c.JSON(http.StatusNotFound, gin.H{"error": "AC command not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "AC status updated successfully",
		"data":    cmd,
	})
}
