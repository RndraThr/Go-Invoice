package handlers

import (
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/ksm/go-invoice/internal/middleware"
	"github.com/ksm/go-invoice/internal/models"
	"github.com/ksm/go-invoice/internal/services"
)

type InvoiceHandler struct {
	Service *services.InvoiceService
}

func NewInvoiceHandler(service *services.InvoiceService) *InvoiceHandler {
	return &InvoiceHandler{Service: service}
}

// ---- Request DTOs ----

type CreateInvoiceRequest struct {
	ProjectID     string              `json:"project_id"`
	ProjectName   string              `json:"project_name"`
	ClientName    string              `json:"client_name"`
	ClientAddress string              `json:"client_address"`
	InvoiceNumber string              `json:"invoice_number"`
	InvoiceDate   string              `json:"invoice_date"` // YYYY-MM-DD
	DueDate       string              `json:"due_date"`     // YYYY-MM-DD
	TaxRate       float64             `json:"tax_rate"`
	Discount      float64             `json:"discount"`
	Notes         string              `json:"notes"`
	TerminNumber  int                 `json:"termin_number"`
	Items         []CreateItemRequest `json:"items"`
}

type CreateItemRequest struct {
	ItemCode    string  `json:"item_code"`
	Description string  `json:"description"`
	Quantity    float64 `json:"quantity"`
	Unit        string  `json:"unit"`
	UnitPrice   float64 `json:"unit_price"`
}

// ---- Handlers ----

// ListInvoices GET /api/invoices
func (h *InvoiceHandler) ListInvoices(c *fiber.Ctx) error {
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "10"))
	status := c.Query("status", "")
	search := c.Query("search", "")

	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 10
	}

	invoices, total, err := h.Service.GetInvoices(page, limit, status, search)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": err.Error()})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data":    invoices,
		"meta": fiber.Map{
			"page":  page,
			"limit": limit,
			"total": total,
		},
	})
}

// GetInvoice GET /api/invoices/:id
func (h *InvoiceHandler) GetInvoice(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Invalid ID"})
	}

	invoice, err := h.Service.GetInvoiceByID(uint(id))
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"success": false, "message": "Invoice not found"})
	}

	return c.JSON(fiber.Map{"success": true, "data": invoice})
}

// CreateInvoice POST /api/invoices
func (h *InvoiceHandler) CreateInvoice(c *fiber.Ctx) error {
	var req CreateInvoiceRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Invalid request body"})
	}

	user := c.Locals("user").(*middleware.UserClaims)

	invoiceDate, _ := time.Parse("2006-01-02", req.InvoiceDate)
	dueDate, _ := time.Parse("2006-01-02", req.DueDate)

	if invoiceDate.IsZero() {
		invoiceDate = time.Now()
	}
	if dueDate.IsZero() {
		dueDate = invoiceDate.AddDate(0, 1, 0) // default: 30 days
	}

	invoice := &models.Invoice{
		ProjectID:     req.ProjectID,
		ProjectName:   req.ProjectName,
		ClientName:    req.ClientName,
		ClientAddress: req.ClientAddress,
		InvoiceNumber: req.InvoiceNumber,
		CreatedBy:     user.UserID,
		CreatedByName: user.Name,
		InvoiceDate:   invoiceDate,
		DueDate:       dueDate,
		TaxRate:       req.TaxRate,
		Discount:      req.Discount,
		Notes:         req.Notes,
		TerminNumber:  req.TerminNumber,
	}

	if invoice.TaxRate == 0 {
		invoice.TaxRate = 11 // Default PPN 11%
	}
	if invoice.TerminNumber == 0 {
		invoice.TerminNumber = 1
	}

	// Map items
	for _, item := range req.Items {
		invoice.Items = append(invoice.Items, models.InvoiceItem{
			ItemCode:    item.ItemCode,
			Description: item.Description,
			Quantity:    item.Quantity,
			Unit:        item.Unit,
			UnitPrice:   item.UnitPrice,
		})
	}

	if err := h.Service.CreateInvoice(invoice); err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": err.Error()})
	}

	return c.Status(201).JSON(fiber.Map{"success": true, "data": invoice})
}

// UpdateInvoice PUT /api/invoices/:id
func (h *InvoiceHandler) UpdateInvoice(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Invalid ID"})
	}

	existing, err := h.Service.GetInvoiceByID(uint(id))
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"success": false, "message": "Invoice not found"})
	}

	var req CreateInvoiceRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Invalid request body"})
	}

	invoiceDate, _ := time.Parse("2006-01-02", req.InvoiceDate)
	dueDate, _ := time.Parse("2006-01-02", req.DueDate)

	existing.ProjectID = req.ProjectID
	existing.ProjectName = req.ProjectName
	existing.ClientName = req.ClientName
	existing.ClientAddress = req.ClientAddress
	if !invoiceDate.IsZero() {
		existing.InvoiceDate = invoiceDate
	}
	if !dueDate.IsZero() {
		existing.DueDate = dueDate
	}
	existing.TaxRate = req.TaxRate
	existing.Discount = req.Discount
	existing.Notes = req.Notes
	existing.TerminNumber = req.TerminNumber

	existing.Items = nil
	for _, item := range req.Items {
		existing.Items = append(existing.Items, models.InvoiceItem{
			InvoiceID:   existing.ID,
			ItemCode:    item.ItemCode,
			Description: item.Description,
			Quantity:    item.Quantity,
			Unit:        item.Unit,
			UnitPrice:   item.UnitPrice,
		})
	}

	if err := h.Service.UpdateInvoice(existing); err != nil {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": err.Error()})
	}

	return c.JSON(fiber.Map{"success": true, "data": existing})
}

// DeleteInvoice DELETE /api/invoices/:id
func (h *InvoiceHandler) DeleteInvoice(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Invalid ID"})
	}

	if err := h.Service.DeleteInvoice(uint(id)); err != nil {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": err.Error()})
	}

	return c.JSON(fiber.Map{"success": true, "message": "Invoice deleted"})
}

// SubmitForReview POST /api/invoices/:id/submit
func (h *InvoiceHandler) SubmitForReview(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Invalid ID"})
	}

	if err := h.Service.SubmitForReview(uint(id)); err != nil {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": err.Error()})
	}

	return c.JSON(fiber.Map{"success": true, "message": "Invoice submitted for review"})
}

// ApproveInvoice POST /api/invoices/:id/approve
func (h *InvoiceHandler) ApproveInvoice(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Invalid ID"})
	}

	if err := h.Service.ApproveInvoice(uint(id)); err != nil {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": err.Error()})
	}

	return c.JSON(fiber.Map{"success": true, "message": "Invoice approved"})
}

// RejectInvoice POST /api/invoices/:id/reject
func (h *InvoiceHandler) RejectInvoice(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Invalid ID"})
	}

	if err := h.Service.RejectInvoice(uint(id)); err != nil {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": err.Error()})
	}

	return c.JSON(fiber.Map{"success": true, "message": "Invoice rejected, returned to draft"})
}

// MarkAsSent POST /api/invoices/:id/mark-sent
func (h *InvoiceHandler) MarkAsSent(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Invalid ID"})
	}

	if err := h.Service.MarkAsSent(uint(id)); err != nil {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": err.Error()})
	}

	return c.JSON(fiber.Map{"success": true, "message": "Invoice ditandai sebagai sudah dikirim"})
}

// MarkAsPaid POST /api/invoices/:id/mark-paid
func (h *InvoiceHandler) MarkAsPaid(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Invalid ID"})
	}

	if err := h.Service.MarkAsPaid(uint(id)); err != nil {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": err.Error()})
	}

	return c.JSON(fiber.Map{"success": true, "message": "Invoice ditandai sebagai sudah dibayar"})
}

// GetDashboardStats GET /api/dashboard/stats
func (h *InvoiceHandler) GetDashboardStats(c *fiber.Ctx) error {
	stats, err := h.Service.GetDashboardStats()
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": err.Error()})
	}

	return c.JSON(fiber.Map{"success": true, "data": stats})
}

// DownloadInvoicePDF GET /api/invoices/:id/pdf
func (h *InvoiceHandler) DownloadInvoicePDF(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Invalid ID"})
	}

	invoice, err := h.Service.GetInvoiceByID(uint(id))
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"success": false, "message": "Invoice not found"})
	}

	// Generate PDF
	pdfBytes, err := services.GenerateInvoicePDF(invoice)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Failed to generate PDF: " + err.Error()})
	}

	// Set headers for inline viewing or download
	c.Set("Content-Type", "application/pdf")
	c.Set("Content-Disposition", `inline; filename="Invoice-`+invoice.InvoiceNumber+`.pdf"`)

	return c.Send(pdfBytes)
}

// DownloadInvoiceKwitansiPDF GET /api/invoices/:id/kwitansi
func (h *InvoiceHandler) DownloadInvoiceKwitansiPDF(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Invalid ID"})
	}

	invoice, err := h.Service.GetInvoiceByID(uint(id))
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"success": false, "message": "Invoice not found"})
	}

	// Generate PDF
	pdfBytes, err := services.GenerateKwitansiPDF(invoice)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Failed to generate Kwitansi PDF: " + err.Error()})
	}

	c.Set("Content-Type", "application/pdf")
	kwiNo := strings.Replace(invoice.InvoiceNumber, "INV", "KWI", 1)
	c.Set("Content-Disposition", `inline; filename="Kwitansi-`+kwiNo+`.pdf"`)

	return c.Send(pdfBytes)
}

// GetAuditLogs GET /api/invoices/:id/audit-logs
func (h *InvoiceHandler) GetAuditLogs(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Invalid ID"})
	}

	logs, err := h.Service.GetAuditLogs(uint(id))
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": err.Error()})
	}

	return c.JSON(fiber.Map{"success": true, "data": logs})
}

// UploadAttachment POST /api/invoices/:id/attachments
func (h *InvoiceHandler) UploadAttachment(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Invalid ID"})
	}

	// Parse file
	file, err := c.FormFile("file")
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "No file uploaded"})
	}

	// Create uploads directory if it doesn't exist
	uploadDir := "./uploads/invoices"
	if err := os.MkdirAll(uploadDir, os.ModePerm); err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Failed to create upload directory"})
	}

	// Generate safe filename
	fileName := fmt.Sprintf("%d_%d_%s", id, time.Now().Unix(), file.Filename)
	filePath := filepath.Join(uploadDir, fileName)

	// Save file to disk
	if err := c.SaveFile(file, filePath); err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Failed to save file"})
	}

	// Save to database
	fileType := filepath.Ext(file.Filename)
	if fileType != "" {
		fileType = fileType[1:] // remove dot
	}

	attachment, err := h.Service.UploadAttachment(uint(id), file.Filename, filePath, fileType)
	if err != nil {
		os.Remove(filePath) // Cleanup if DB fails
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Failed to save attachment record"})
	}

	return c.Status(201).JSON(fiber.Map{"success": true, "data": attachment})
}

// GetAttachments GET /api/invoices/:id/attachments
func (h *InvoiceHandler) GetAttachments(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Invalid ID"})
	}

	attachments, err := h.Service.GetAttachments(uint(id))
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": err.Error()})
	}

	return c.JSON(fiber.Map{"success": true, "data": attachments})
}

// DeleteAttachment DELETE /api/invoices/:id/attachments/:attachmentId
func (h *InvoiceHandler) DeleteAttachment(c *fiber.Ctx) error {
	invoiceID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Invalid Invoice ID"})
	}

	attachmentID, err := strconv.ParseUint(c.Params("attachmentId"), 10, 32)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Invalid Attachment ID"})
	}

	filePath, err := h.Service.DeleteAttachment(uint(attachmentID), uint(invoiceID))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": err.Error()})
	}

	// Delete file from disk
	if filePath != "" {
		os.Remove(filePath)
	}

	return c.JSON(fiber.Map{"success": true, "message": "Attachment deleted"})
}
