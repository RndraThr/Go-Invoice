package routes

import (
	"github.com/gofiber/fiber/v2"
	"github.com/ksm/go-invoice/internal/config"
	"github.com/ksm/go-invoice/internal/handlers"
	"github.com/ksm/go-invoice/internal/middleware"
)

func SetupRoutes(app *fiber.App, cfg *config.Config, invoiceHandler *handlers.InvoiceHandler, authHandler *handlers.AuthHandler, projectHandler *handlers.ProjectHandler, userHandler *handlers.UserHandler, exportHandler *handlers.ExportHandler, kwitansiHandler *handlers.KwitansiHandler) {
	api := app.Group("/api")

	// Health check (public)
	api.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"success": true,
			"message": "KSM Invoice Out API is running",
			"version": "1.0.0",
		})
	})

	// Auth routes (public)
	auth := api.Group("/auth")
	auth.Post("/login", authHandler.Login)

	// Serve static files for uploaded attachments
	app.Static("/uploads", "./uploads")

	// Protected routes
	protected := api.Group("", middleware.AuthMiddleware(cfg))

	// Projects
	projects := protected.Group("/projects")
	projects.Get("/", projectHandler.ListProjects)
	projects.Get("/:id", projectHandler.GetProject)
	projects.Post("/", projectHandler.CreateProject)
	projects.Put("/:id", projectHandler.UpdateProject)
	projects.Delete("/:id", projectHandler.DeleteProject)

	// Auth - protected
	protected.Get("/auth/me", authHandler.GetMe)

	// Invoices
	invoices := protected.Group("/invoices")
	invoices.Get("/", invoiceHandler.ListInvoices)
	invoices.Get("/:id", invoiceHandler.GetInvoice)
	invoices.Get("/:id/pdf", invoiceHandler.DownloadInvoicePDF)
	invoices.Get("/:id/kwitansi", invoiceHandler.DownloadInvoiceKwitansiPDF)
	invoices.Post("/", invoiceHandler.CreateInvoice)
	invoices.Put("/:id", invoiceHandler.UpdateInvoice)
	invoices.Delete("/:id", invoiceHandler.DeleteInvoice)

	// Invoice Attachments
	invoices.Get("/:id/attachments", invoiceHandler.GetAttachments)
	invoices.Post("/:id/attachments", invoiceHandler.UploadAttachment)
	invoices.Delete("/:id/attachments/:attachmentId", invoiceHandler.DeleteAttachment)

	// Status transitions
	invoices.Post("/:id/submit", invoiceHandler.SubmitForReview)
	invoices.Post("/:id/approve", middleware.RoleMiddleware("admin", "manager"), invoiceHandler.ApproveInvoice)
	invoices.Post("/:id/reject", middleware.RoleMiddleware("admin", "manager"), invoiceHandler.RejectInvoice)
	invoices.Post("/:id/mark-sent", invoiceHandler.MarkAsSent)
	invoices.Post("/:id/mark-paid", invoiceHandler.MarkAsPaid)

	// Users (admin only)
	users := protected.Group("/users", middleware.RoleMiddleware("admin"))
	users.Get("/", userHandler.ListUsers)
	users.Get("/:id", userHandler.GetUser)

	// Kwitansis
	kwitansis := protected.Group("/kwitansi")
	kwitansis.Get("/", kwitansiHandler.ListKwitansis)
	kwitansis.Get("/:id", kwitansiHandler.GetKwitansi)
	kwitansis.Get("/:id/pdf", kwitansiHandler.DownloadKwitansiPDF)
	kwitansis.Post("/", kwitansiHandler.CreateKwitansi)
	kwitansis.Put("/:id", kwitansiHandler.UpdateKwitansi)
	kwitansis.Delete("/:id", kwitansiHandler.DeleteKwitansi)
	kwitansis.Post("/:id/submit", kwitansiHandler.SubmitForReview)
	kwitansis.Post("/:id/approve", middleware.RoleMiddleware("admin", "manager", "procon"), kwitansiHandler.ApproveKwitansi)
	kwitansis.Post("/:id/reject", middleware.RoleMiddleware("admin", "manager", "procon"), kwitansiHandler.RejectKwitansi)
	kwitansis.Post("/:id/mark-sent", kwitansiHandler.MarkAsSent)
	kwitansis.Post("/:id/mark-paid", kwitansiHandler.MarkAsPaid)

	// Dashboard
	protected.Get("/dashboard/stats", invoiceHandler.GetDashboardStats)

	// Export
	exports := protected.Group("/export")
	exports.Get("/invoices", exportHandler.ExportInvoicesExcel)
	exports.Get("/kwitansi", exportHandler.ExportKwitansiExcel)

	// Audit logs
	invoices.Get("/:id/audit-logs", invoiceHandler.GetAuditLogs)
}
