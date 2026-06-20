package handlers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

func HealthCheck(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status":    "ok",
		"service":   "ev-connect-backend",
		"timestamp": time.Now().UTC(),
		"version":   "1.0.0",
	})
}
