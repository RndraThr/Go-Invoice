package handlers

import (
	"encoding/json"
	"fmt"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/ksm/go-invoice/internal/models"
	"github.com/ksm/go-invoice/internal/services"
)

type ProjectHandler struct {
	Service *services.ProjectService
}

func NewProjectHandler(service *services.ProjectService) *ProjectHandler {
	return &ProjectHandler{Service: service}
}

// ListProjects GET /api/projects
func (h *ProjectHandler) ListProjects(c *fiber.Ctx) error {
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "10"))
	search := c.Query("search", "")

	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 10
	}

	projects, total, err := h.Service.GetProjects(page, limit, search)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": err.Error()})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data":    projects,
		"meta": fiber.Map{
			"page":  page,
			"limit": limit,
			"total": total,
		},
	})
}

// GetProject GET /api/projects/:id
func (h *ProjectHandler) GetProject(c *fiber.Ctx) error {
	id := c.Params("id")
	project, err := h.Service.GetProjectByID(id)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"success": false, "message": err.Error()})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data":    project,
	})
}

// CreateProject POST /api/projects
func (h *ProjectHandler) CreateProject(c *fiber.Ctx) error {
	var p models.Project

	// We might receive multipart/form-data because of file uploads, or JSON.
	// We'll support multipart/form-data for project creation with file.

	p.ID = c.FormValue("id")
	p.Type = models.ProjectType(c.FormValue("type", "PROJECT"))
	p.PICPO = c.FormValue("pic_po")
	p.POInNo = c.FormValue("po_in_no")
	p.Company = c.FormValue("company")
	p.ClientAddress = c.FormValue("client_address")
	p.Subject = c.FormValue("subject")

	qty, _ := strconv.Atoi(c.FormValue("qty", "1"))
	p.Qty = qty

	poValue, _ := strconv.ParseFloat(c.FormValue("po_value", "0"), 64)
	p.POValue = poValue

	paymentTermsJSON := c.FormValue("payment_terms", "[]")
	var terms []models.PaymentTerm
	if err := json.Unmarshal([]byte(paymentTermsJSON), &terms); err == nil {
		p.PaymentTerms = terms
	}

	// Handle File Upload
	file, err := c.FormFile("attachment")
	if err == nil && file != nil {
		// Save file
		filename := fmt.Sprintf("%s_%d%s", p.ID, time.Now().Unix(), filepath.Ext(file.Filename))
		savePath := filepath.Join("uploads", "projects", filename)

		if err := c.SaveFile(file, savePath); err == nil {
			p.AttachmentPath = savePath
		}
	}

	if p.ID == "" {
		// If it's a JSON request instead of multipart
		if err := c.BodyParser(&p); err != nil && p.ID == "" {
			return c.Status(400).JSON(fiber.Map{"success": false, "message": "Invalid request payload"})
		}
	}

	if err := h.Service.CreateProject(&p); err != nil {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": err.Error()})
	}

	return c.Status(201).JSON(fiber.Map{
		"success": true,
		"message": "Project created successfully",
		"data":    p,
	})
}

// UpdateProject PUT /api/projects/:id
func (h *ProjectHandler) UpdateProject(c *fiber.Ctx) error {
	id := c.Params("id")

	project, err := h.Service.GetProjectByID(id)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"success": false, "message": "Project not found"})
	}

	contentType := c.Get("Content-Type")
	if strings.Contains(contentType, "application/json") {
		var updates map[string]interface{}
		if err := c.BodyParser(&updates); err != nil {
			return c.Status(400).JSON(fiber.Map{"success": false, "message": "Invalid request body"})
		}
		delete(updates, "id")

		if pt, ok := updates["payment_terms"]; ok {
			b, _ := json.Marshal(pt)
			var terms []models.PaymentTerm
			if err := json.Unmarshal(b, &terms); err == nil {
				project.PaymentTerms = terms
			}
			delete(updates, "payment_terms")
		}

		if len(updates) > 0 {
			if err := h.Service.UpdateProject(id, updates); err != nil {
				return c.Status(400).JSON(fiber.Map{"success": false, "message": err.Error()})
			}
		}

		h.Service.DB.Save(project)
		return c.JSON(fiber.Map{"success": true, "message": "Project updated"})
	}

	// Multipart form-data update
	if t := c.FormValue("type"); t != "" {
		project.Type = models.ProjectType(t)
	}
	if v := c.FormValue("pic_po"); v != "" {
		project.PICPO = v
	}
	if v := c.FormValue("po_in_no"); v != "" {
		project.POInNo = v
	}
	if v := c.FormValue("company"); v != "" {
		project.Company = v
	}
	if v := c.FormValue("client_address"); v != "" {
		project.ClientAddress = v
	}
	if v := c.FormValue("subject"); v != "" {
		project.Subject = v
	}
	if qtyStr := c.FormValue("qty"); qtyStr != "" {
		qty, _ := strconv.Atoi(qtyStr)
		project.Qty = qty
	}
	if poValStr := c.FormValue("po_value"); poValStr != "" {
		poValue, _ := strconv.ParseFloat(poValStr, 64)
		project.POValue = poValue
	}
	if ptStr := c.FormValue("payment_terms"); ptStr != "" {
		var terms []models.PaymentTerm
		if err := json.Unmarshal([]byte(ptStr), &terms); err == nil {
			project.PaymentTerms = terms
		}
	}

	file, err := c.FormFile("attachment")
	if err == nil && file != nil {
		filename := fmt.Sprintf("%s_%d%s", project.ID, time.Now().Unix(), filepath.Ext(file.Filename))
		savePath := filepath.Join("uploads", "projects", filename)
		if err := c.SaveFile(file, savePath); err == nil {
			project.AttachmentPath = savePath
		}
	}

	if err := h.Service.DB.Save(project).Error; err != nil {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": err.Error()})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Project updated",
	})
}

// DeleteProject DELETE /api/projects/:id
func (h *ProjectHandler) DeleteProject(c *fiber.Ctx) error {
	id := c.Params("id")

	if err := h.Service.DeleteProject(id); err != nil {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": err.Error()})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Project deleted",
	})
}
