package models

import "time"

type ACStatus string

const (
	ACStatusPending  ACStatus = "pending"
	ACStatusRunning  ACStatus = "running"
	ACStatusStopped  ACStatus = "stopped"
	ACStatusFailed   ACStatus = "failed"
)

type ACCommand struct {
	ID            uint      `gorm:"primaryKey" json:"id"`
	VehicleID     string    `gorm:"index;size:64;not null" json:"vehicle_id"`
	UserID        string    `gorm:"size:64" json:"user_id"`
	TargetTemp    float64   `gorm:"not null" json:"target_temp"`
	Mode          string    `gorm:"size:32;default:auto" json:"mode"`
	FanSpeed      int       `gorm:"default:3" json:"fan_speed"`
	Status        ACStatus  `gorm:"size:32;default:pending" json:"status"`
	StartTime     *time.Time `json:"start_time"`
	StopTime      *time.Time `json:"stop_time"`
	Message       string    `gorm:"size:255" json:"message"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}
