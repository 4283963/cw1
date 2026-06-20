package models

import "time"

type VehicleStatus struct {
	ID            uint      `gorm:"primaryKey" json:"id"`
	VehicleID     string    `gorm:"uniqueIndex;size:64;not null" json:"vehicle_id"`
	Longitude     float64   `gorm:"type:decimal(10,7);not null" json:"longitude"`
	Latitude      float64   `gorm:"type:decimal(10,7);not null" json:"latitude"`
	BatteryLevel  int       `gorm:"not null" json:"battery_level"`
	RangeEstimate int       `json:"range_estimate"`
	IsLocked      bool      `gorm:"default:true" json:"is_locked"`
	IsCharging    bool      `gorm:"default:false" json:"is_charging"`
	LastGPSTime   time.Time `json:"last_gps_time"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

type VehicleStatusHistory struct {
	ID            uint      `gorm:"primaryKey" json:"id"`
	VehicleID     string    `gorm:"index;size:64;not null" json:"vehicle_id"`
	Longitude     float64   `gorm:"type:decimal(10,7);not null" json:"longitude"`
	Latitude      float64   `gorm:"type:decimal(10,7);not null" json:"latitude"`
	BatteryLevel  int       `gorm:"not null" json:"battery_level"`
	RangeEstimate int       `json:"range_estimate"`
	ReportedAt    time.Time `gorm:"index" json:"reported_at"`
}
