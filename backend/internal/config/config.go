package config

import (
	"fmt"
	"os"
)

type Config struct {
	DBHost     string
	DBPort     string
	DBUser     string
	DBPassword string
	DBName     string
	ServerPort string
	JWTSecret  string
	DevMode    bool

	// Cost Control API base URL for auth proxy
	CostControlAPIURL string
}

func Load() *Config {
	return &Config{
		DBHost:            getEnv("DB_HOST", "127.0.0.1"),
		DBPort:            getEnv("DB_PORT", "3306"),
		DBUser:            getEnv("DB_USER", "root"),
		DBPassword:        getEnv("DB_PASSWORD", ""),
		DBName:            getEnv("DB_NAME", "ksm_invoice"),
		ServerPort:        getEnv("SERVER_PORT", "8081"),
		JWTSecret:         getEnv("JWT_SECRET", "super_secret_ksm_invoice_key_2026"),
		DevMode:           getEnv("DEV_MODE", "false") == "true",
		CostControlAPIURL: getEnv("COST_CONTROL_API_URL", "http://localhost:8080"),
	}
}

func (c *Config) DSN() string {
	return fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?charset=utf8mb4&parseTime=True&loc=Local",
		c.DBUser, c.DBPassword, c.DBHost, c.DBPort, c.DBName)
}

func getEnv(key, fallback string) string {
	if value, ok := os.LookupEnv(key); ok {
		return value
	}
	return fallback
}
