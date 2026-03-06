package handlers

import (
	"fmt"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/ksm/go-invoice/internal/services"
)

type ExportHandler struct {
	Service *services.ExportService
}

func NewExportHandler(service *services.ExportService) *ExportHandler {
	return &ExportHandler{Service: service}
}

// ExportInvoicesExcel GET /api/export/invoices
func (h *ExportHandler) ExportInvoicesExcel(c *fiber.Ctx) error {
	status := c.Query("status", "all")

	data, err := h.Service.ExportInvoicesToExcel(status)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Failed to generate Excel: " + err.Error()})
	}

	filename := fmt.Sprintf("Invoices_%s.xlsx", time.Now().Format("20060102"))
	c.Set("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	c.Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, filename))
	return c.Send(data)
}

// ExportKwitansiExcel GET /api/export/kwitansi
func (h *ExportHandler) ExportKwitansiExcel(c *fiber.Ctx) error {
	data, err := h.Service.ExportKwitansiToExcel()
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Failed to generate Excel: " + err.Error()})
	}

	filename := fmt.Sprintf("Kwitansi_%s.xlsx", time.Now().Format("20060102"))
	c.Set("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	c.Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, filename))
	return c.Send(data)
}
