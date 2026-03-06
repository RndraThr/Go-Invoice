package handlers

import (
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/ksm/go-invoice/internal/middleware"
	"github.com/ksm/go-invoice/internal/models"
	"github.com/ksm/go-invoice/internal/services"
)

type KwitansiHandler struct {
	Service *services.KwitansiService
}

func NewKwitansiHandler(service *services.KwitansiService) *KwitansiHandler {
	return &KwitansiHandler{Service: service}
}

type CreateKwitansiRequest struct {
	ProjectID      string  `json:"project_id"`
	ProjectName    string  `json:"project_name"`
	InvoiceID      *uint   `json:"invoice_id"`
	InvoiceNumber  string  `json:"invoice_number"`
	ClientName     string  `json:"client_name"`
	ClientAddress  string  `json:"client_address"`
	KwitansiNumber string  `json:"kwitansi_number"`
	KwitansiDate   string  `json:"kwitansi_date"`
	Amount         float64 `json:"amount"`
	Purpose        string  `json:"purpose"`
	Notes          string  `json:"notes"`
}

// ListKwitansis GET /api/kwitansi
func (h *KwitansiHandler) ListKwitansis(c *fiber.Ctx) error {
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

	kwitansis, total, err := h.Service.GetKwitansis(page, limit, status, search)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": err.Error()})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data":    kwitansis,
		"meta": fiber.Map{
			"page":  page,
			"limit": limit,
			"total": total,
		},
	})
}

// GetKwitansi GET /api/kwitansi/:id
func (h *KwitansiHandler) GetKwitansi(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Invalid ID"})
	}

	kwitansi, err := h.Service.GetKwitansiByID(uint(id))
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"success": false, "message": "Kwitansi not found"})
	}

	return c.JSON(fiber.Map{"success": true, "data": kwitansi})
}

// CreateKwitansi POST /api/kwitansi
func (h *KwitansiHandler) CreateKwitansi(c *fiber.Ctx) error {
	var req CreateKwitansiRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Invalid request body"})
	}

	user := c.Locals("user").(*middleware.UserClaims)

	kwitansiDate, _ := time.Parse("2006-01-02", req.KwitansiDate)
	if kwitansiDate.IsZero() {
		kwitansiDate = time.Now()
	}

	kwitansi := &models.Kwitansi{
		ProjectID:      req.ProjectID,
		ProjectName:    req.ProjectName,
		InvoiceID:      req.InvoiceID,
		InvoiceNumber:  req.InvoiceNumber,
		ClientName:     req.ClientName,
		ClientAddress:  req.ClientAddress,
		KwitansiNumber: req.KwitansiNumber,
		CreatedBy:      user.UserID,
		CreatedByName:  user.Name,
		KwitansiDate:   kwitansiDate,
		Amount:         req.Amount,
		Purpose:        req.Purpose,
		Notes:          req.Notes,
	}

	if err := h.Service.CreateKwitansi(kwitansi); err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": err.Error()})
	}

	return c.Status(201).JSON(fiber.Map{"success": true, "data": kwitansi})
}

// UpdateKwitansi PUT /api/kwitansi/:id
func (h *KwitansiHandler) UpdateKwitansi(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Invalid ID"})
	}

	existing, err := h.Service.GetKwitansiByID(uint(id))
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"success": false, "message": "Kwitansi not found"})
	}

	var req CreateKwitansiRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Invalid request body"})
	}

	kwitansiDate, _ := time.Parse("2006-01-02", req.KwitansiDate)

	existing.ProjectID = req.ProjectID
	existing.ProjectName = req.ProjectName
	existing.InvoiceID = req.InvoiceID
	existing.InvoiceNumber = req.InvoiceNumber
	existing.ClientName = req.ClientName
	existing.ClientAddress = req.ClientAddress
	existing.KwitansiNumber = req.KwitansiNumber
	if !kwitansiDate.IsZero() {
		existing.KwitansiDate = kwitansiDate
	}
	existing.Amount = req.Amount
	existing.Purpose = req.Purpose
	existing.Notes = req.Notes

	if err := h.Service.UpdateKwitansi(existing); err != nil {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": err.Error()})
	}

	return c.JSON(fiber.Map{"success": true, "data": existing})
}

// DeleteKwitansi DELETE /api/kwitansi/:id
func (h *KwitansiHandler) DeleteKwitansi(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Invalid ID"})
	}

	if err := h.Service.DeleteKwitansi(uint(id)); err != nil {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": err.Error()})
	}

	return c.JSON(fiber.Map{"success": true, "message": "Kwitansi deleted"})
}

// SubmitForReview POST /api/kwitansi/:id/submit
func (h *KwitansiHandler) SubmitForReview(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Invalid ID"})
	}

	if err := h.Service.SubmitForReview(uint(id)); err != nil {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": err.Error()})
	}

	return c.JSON(fiber.Map{"success": true, "message": "Kwitansi submitted for review"})
}

// ApproveKwitansi POST /api/kwitansi/:id/approve
func (h *KwitansiHandler) ApproveKwitansi(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Invalid ID"})
	}

	if err := h.Service.ApproveKwitansi(uint(id)); err != nil {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": err.Error()})
	}

	return c.JSON(fiber.Map{"success": true, "message": "Kwitansi approved"})
}

// RejectKwitansi POST /api/kwitansi/:id/reject
func (h *KwitansiHandler) RejectKwitansi(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Invalid ID"})
	}

	if err := h.Service.RejectKwitansi(uint(id)); err != nil {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": err.Error()})
	}

	return c.JSON(fiber.Map{"success": true, "message": "Kwitansi rejected"})
}

// MarkAsSent POST /api/kwitansi/:id/mark-sent
func (h *KwitansiHandler) MarkAsSent(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Invalid ID"})
	}

	if err := h.Service.MarkAsSent(uint(id)); err != nil {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": err.Error()})
	}

	return c.JSON(fiber.Map{"success": true, "message": "Kwitansi marked as sent to client"})
}

// MarkAsPaid POST /api/kwitansi/:id/mark-paid
func (h *KwitansiHandler) MarkAsPaid(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Invalid ID"})
	}

	if err := h.Service.MarkAsPaid(uint(id)); err != nil {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": err.Error()})
	}

	return c.JSON(fiber.Map{"success": true, "message": "Kwitansi marked as paid"})
}

// DownloadKwitansiPDF GET /api/kwitansi/:id/pdf
func (h *KwitansiHandler) DownloadKwitansiPDF(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Invalid ID"})
	}

	kwitansi, err := h.Service.GetKwitansiByID(uint(id))
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"success": false, "message": "Kwitansi not found"})
	}

	pdfBytes, err := services.GenerateStandaloneKwitansiPDF(kwitansi)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Failed to generate PDF: " + err.Error()})
	}

	c.Set("Content-Type", "application/pdf")
	c.Set("Content-Disposition", fmt.Sprintf("inline; filename=KWITANSI_%s.pdf", strings.ReplaceAll(kwitansi.KwitansiNumber, "/", "_")))

	return c.Send(pdfBytes)
}
