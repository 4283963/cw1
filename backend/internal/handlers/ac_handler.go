package handlers

import (
	"cw1/backend/internal/database"
	"cw1/backend/internal/models"
	"cw1/backend/internal/store"
	"cw1/backend/internal/utils/flex"
	"fmt"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type StartACRequest struct {
	VehicleID  string       `json:"vehicle_id" binding:"required"`
	UserID     string       `json:"user_id"`
	TargetTemp flex.Float64 `json:"target_temp"`
	Mode       string       `json:"mode"`
	FanSpeed   flex.Int     `json:"fan_speed"`
}

type StopACRequest struct {
	VehicleID string `json:"vehicle_id" binding:"required"`
	UserID    string `json:"user_id"`
	Message   string `json:"message"`
}

type UpdateACStatusRequest struct {
	CommandID flex.Uint      `json:"command_id"`
	Status    models.ACStatus `json:"status" binding:"required"`
	Message   string         `json:"message"`
}

func StartAC(c *gin.Context) {
	var req StartACRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("参数解析失败: %v", err)})
		return
	}

	targetTemp := req.TargetTemp.Value()
	if targetTemp < 16 || targetTemp > 32 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "target_temp 必须在 16 ~ 32 °C 之间"})
		return
	}

	fanSpeed := req.FanSpeed.Value()
	if fanSpeed == 0 {
		fanSpeed = 3
	}
	if fanSpeed < 1 || fanSpeed > 7 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "fan_speed 必须在 1 ~ 7 之间"})
		return
	}

	if req.Mode == "" {
		req.Mode = "auto"
	}
	validModes := map[string]bool{"auto": true, "cool": true, "heat": true, "vent": true}
	if !validModes[req.Mode] {
		c.JSON(http.StatusBadRequest, gin.H{"error": "mode 必须是 auto/cool/heat/vent 之一"})
		return
	}

	cmd := &models.ACCommand{
		VehicleID:  req.VehicleID,
		UserID:     req.UserID,
		TargetTemp: targetTemp,
		Mode:       req.Mode,
		FanSpeed:   fanSpeed,
		Status:     models.ACStatusPending,
	}

	var err error
	if database.DB != nil {
		err = database.DB.Create(cmd).Error
	} else {
		err = store.SaveACCommand(cmd)
	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "创建空调指令失败"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "空调指令创建成功",
		"data":    cmd,
	})
}

func StopAC(c *gin.Context) {
	var req StopACRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("参数解析失败: %v", err)})
		return
	}

	var latestCmd *models.ACCommand
	var err error

	if database.DB != nil {
		var cmd models.ACCommand
		dbErr := database.DB.Where("vehicle_id = ?", req.VehicleID).
			Order("created_at desc").First(&cmd).Error
		if dbErr != nil && dbErr != gorm.ErrRecordNotFound {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "查询空调指令失败"})
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
		c.JSON(http.StatusNotFound, gin.H{"error": "未找到该车辆的空调指令"})
		return
	}

	msg := req.Message
	if msg == "" {
		msg = "用户停止空调"
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
		"message": "空调停止指令已发送",
		"data":    latestCmd,
	})
}

func GetACStatus(c *gin.Context) {
	vehicleID := c.Param("vehicle_id")
	if vehicleID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "vehicle_id 必填"})
		return
	}

	var latestCmd *models.ACCommand
	var err error

	if database.DB != nil {
		var cmd models.ACCommand
		dbErr := database.DB.Where("vehicle_id = ?", vehicleID).
			Order("created_at desc").First(&cmd).Error
		if dbErr != nil && dbErr != gorm.ErrRecordNotFound {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "查询空调状态失败"})
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
			"message": "无活跃空调指令",
			"data":    nil,
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "查询成功",
		"data":    latestCmd,
	})
}

func GetACHistory(c *gin.Context) {
	vehicleID := c.Param("vehicle_id")
	if vehicleID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "vehicle_id 必填"})
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
		c.JSON(http.StatusInternalServerError, gin.H{"error": "查询空调历史失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "查询成功",
		"data":    commands,
	})
}

func GetPendingACCommands(c *gin.Context) {
	vehicleID := c.Param("vehicle_id")
	if vehicleID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "vehicle_id 必填"})
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
		c.JSON(http.StatusInternalServerError, gin.H{"error": "查询待执行指令失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "查询成功",
		"data":    commands,
	})
}

func UpdateACStatus(c *gin.Context) {
	var req UpdateACStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("参数解析失败: %v", err)})
		return
	}

	commandID := req.CommandID.Value()
	if commandID == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "command_id 必填且需为正整数"})
		return
	}

	validStatuses := map[models.ACStatus]bool{
		models.ACStatusPending: true,
		models.ACStatusRunning: true,
		models.ACStatusStopped: true,
		models.ACStatusFailed:  true,
	}

	if !validStatuses[req.Status] {
		c.JSON(http.StatusBadRequest, gin.H{"error": "status 值无效"})
		return
	}

	var cmd models.ACCommand
	found := false

	if database.DB != nil {
		if dbErr := database.DB.First(&cmd, commandID).Error; dbErr == nil {
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
			database.DB.First(&cmd, commandID)
			found = true
		}
	} else {
		if err := store.UpdateACCommandStatus(commandID, req.Status, req.Message); err == nil {
			cmds, _ := store.GetACCommandsByVehicleID(cmd.VehicleID)
			for _, c := range cmds {
				if c.ID == commandID {
					cmd = c
					found = true
					break
				}
			}
			if !found {
				cmd.ID = commandID
				cmd.Status = req.Status
				cmd.Message = req.Message
				found = true
			}
		}
	}

	if !found {
		c.JSON(http.StatusNotFound, gin.H{"error": "未找到该空调指令"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "空调状态更新成功",
		"data":    cmd,
	})
}
