package routes

import (
	"cw1/backend/internal/handlers"
	"cw1/backend/internal/middleware"

	"github.com/gin-gonic/gin"
)

func Register(r *gin.Engine) {
	r.Use(middleware.CORS())
	r.Use(gin.Logger())
	r.Use(gin.Recovery())

	api := r.Group("/api/v1")
	{
		api.GET("/health", handlers.HealthCheck)

		ac := api.Group("/ac")
		{
			ac.POST("/start", handlers.StartAC)
			ac.POST("/stop", handlers.StopAC)
			ac.GET("/status/:vehicle_id", handlers.GetACStatus)
			ac.GET("/history/:vehicle_id", handlers.GetACHistory)
			ac.GET("/pending/:vehicle_id", handlers.GetPendingACCommands)
			ac.PUT("/status", handlers.UpdateACStatus)
		}

		vehicle := api.Group("/vehicle")
		{
			vehicle.POST("/report", handlers.ReportVehicleStatus)
			vehicle.GET("/status/:vehicle_id", handlers.GetVehicleStatus)
			vehicle.GET("/history/:vehicle_id", handlers.GetVehicleStatusHistory)
			vehicle.POST("/simulate", handlers.SimulateVehicleReport)
		}
	}
}
