package main

import (
	"fmt"
	"log"
	"os"

	"github.com/gofiber/fiber/v2"
	"github.com/joho/godotenv"
	"github.com/ksm/go-invoice/internal/config"
	"github.com/ksm/go-invoice/internal/handlers"
	"github.com/ksm/go-invoice/internal/middleware"
	"github.com/ksm/go-invoice/internal/models"
	"github.com/ksm/go-invoice/internal/routes"
	"github.com/ksm/go-invoice/internal/services"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func main() {
	// Load .env file (optional — won't fail if missing)
	_ = godotenv.Load()

	// Load config
	cfg := config.Load()

	// Connect to database
	db, err := gorm.Open(mysql.Open(cfg.DSN()), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})
	if err != nil {
		log.Fatalf("❌ Failed to connect to database: %v", err)
	}
	log.Println("✅ Database connected successfully")

	// Auto-migrate models
	if err := db.AutoMigrate(
		&models.Project{},
		&models.Invoice{},
		&models.Kwitansi{},
		&models.InvoiceItem{},
		&models.InvoiceAttachment{},
		&models.User{},
		&models.AuditLog{},
	); err != nil {
		log.Fatalf("❌ Failed to migrate database: %v", err)
	}
	log.Println("✅ Database migrated successfully")

	// Initialize services & handlers
	projectService := services.NewProjectService(db)
	projectHandler := handlers.NewProjectHandler(projectService)

	invoiceService := services.NewInvoiceService(db)
	invoiceHandler := handlers.NewInvoiceHandler(invoiceService)
	userService := services.NewUserService(db)
	userHandler := handlers.NewUserHandler(userService)
	authHandler := handlers.NewAuthHandler(cfg, userService)
	exportService := services.NewExportService(db)
	exportHandler := handlers.NewExportHandler(exportService)

	kwitansiService := services.NewKwitansiService(db)
	kwitansiHandler := handlers.NewKwitansiHandler(kwitansiService)

	// Ensure upload directories exist
	if err := os.MkdirAll("uploads/projects", 0755); err != nil {
		log.Printf("⚠️ Warning: Could not create uploads/projects directory: %v", err)
	}

	// Create Fiber app
	app := fiber.New(fiber.Config{
		AppName:      "KSM Invoice Out API v1.0",
		ErrorHandler: customErrorHandler,
	})

	// Setup global middleware
	middleware.SetupMiddleware(app)

	// Serve static uploads directory
	app.Static("/uploads", "./uploads")

	// Setup routes
	routes.SetupRoutes(app, cfg, invoiceHandler, authHandler, projectHandler, userHandler, exportHandler, kwitansiHandler)

	// Start server
	addr := fmt.Sprintf(":%s", cfg.ServerPort)
	log.Printf("🚀 KSM Invoice Out API starting on http://localhost%s", addr)
	if err := app.Listen(addr); err != nil {
		log.Fatalf("❌ Server failed to start: %v", err)
	}
}

func customErrorHandler(c *fiber.Ctx, err error) error {
	code := fiber.StatusInternalServerError
	if e, ok := err.(*fiber.Error); ok {
		code = e.Code
	}
	return c.Status(code).JSON(fiber.Map{
		"success": false,
		"message": err.Error(),
	})
}
