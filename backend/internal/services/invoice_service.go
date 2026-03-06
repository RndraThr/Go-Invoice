package services

import (
	"fmt"
	"time"

	"github.com/ksm/go-invoice/internal/models"
	"gorm.io/gorm"
)

type InvoiceService struct {
	DB *gorm.DB
}

func NewInvoiceService(db *gorm.DB) *InvoiceService {
	return &InvoiceService{DB: db}
}

// GenerateInvoiceNumber creates a formatted invoice number: INV/{ROMAN_MONTH}/{YEAR}/{SEQ}
func (s *InvoiceService) GenerateInvoiceNumber() (string, error) {
	now := time.Now()
	month := toRomanMonth(int(now.Month()))
	year := now.Year()

	// Count existing invoices this year
	var count int64
	s.DB.Model(&models.Invoice{}).
		Where("YEAR(created_at) = ?", year).
		Count(&count)

	seq := fmt.Sprintf("%03d", count+1)
	return fmt.Sprintf("INV/%s/%d/%s", month, year, seq), nil
}

// CreateInvoice creates a new draft invoice with items
func (s *InvoiceService) CreateInvoice(invoice *models.Invoice) error {
	// Calculate totals
	s.calculateTotals(invoice)

	// Use manually provided invoice number, or auto-generate as fallback
	if invoice.InvoiceNumber == "" {
		number, err := s.GenerateInvoiceNumber()
		if err != nil {
			return err
		}
		invoice.InvoiceNumber = number
	}
	invoice.Status = models.StatusDraft

	return s.DB.Create(invoice).Error
}

// GetInvoices returns paginated list of invoices
func (s *InvoiceService) GetInvoices(page, limit int, status string, search string) ([]models.Invoice, int64, error) {
	var invoices []models.Invoice
	var total int64

	query := s.DB.Model(&models.Invoice{})

	if status != "" {
		query = query.Where("status = ?", status)
	}
	if search != "" {
		query = query.Where("invoice_number LIKE ? OR client_name LIKE ? OR project_name LIKE ?",
			"%"+search+"%", "%"+search+"%", "%"+search+"%")
	}

	query.Count(&total)

	offset := (page - 1) * limit
	err := query.Preload("Items").
		Order("created_at DESC").
		Offset(offset).Limit(limit).
		Find(&invoices).Error

	return invoices, total, err
}

// GetInvoiceByID returns an invoice with its items
func (s *InvoiceService) GetInvoiceByID(id uint) (*models.Invoice, error) {
	var invoice models.Invoice
	err := s.DB.Preload("Items").First(&invoice, id).Error
	if err != nil {
		return nil, err
	}
	return &invoice, nil
}

// UpdateInvoice updates a draft invoice
func (s *InvoiceService) UpdateInvoice(invoice *models.Invoice) error {
	if invoice.Status != models.StatusDraft {
		return fmt.Errorf("only draft invoices can be edited")
	}

	// Recalculate totals
	s.calculateTotals(invoice)

	// Delete old items and recreate
	s.DB.Where("invoice_id = ?", invoice.ID).Delete(&models.InvoiceItem{})

	return s.DB.Save(invoice).Error
}

// DeleteInvoice soft-deletes a draft invoice
func (s *InvoiceService) DeleteInvoice(id uint) error {
	var invoice models.Invoice
	if err := s.DB.First(&invoice, id).Error; err != nil {
		return err
	}
	if invoice.Status != models.StatusDraft {
		return fmt.Errorf("only draft invoices can be deleted")
	}
	return s.DB.Delete(&invoice).Error
}

// SubmitForReview transitions status from draft → review
func (s *InvoiceService) SubmitForReview(id uint) error {
	return s.transitionStatus(id, models.StatusDraft, models.StatusReview)
}

// ApproveInvoice transitions status from review → approved
func (s *InvoiceService) ApproveInvoice(id uint) error {
	return s.transitionStatus(id, models.StatusReview, models.StatusApproved)
}

// RejectInvoice transitions status from review → draft
func (s *InvoiceService) RejectInvoice(id uint) error {
	return s.transitionStatus(id, models.StatusReview, models.StatusDraft)
}

// MarkAsSent transitions status from approved → sent
func (s *InvoiceService) MarkAsSent(id uint) error {
	return s.transitionStatus(id, models.StatusApproved, models.StatusSent)
}

// MarkAsPaid transitions status from sent → paid
func (s *InvoiceService) MarkAsPaid(id uint) error {
	return s.transitionStatus(id, models.StatusSent, models.StatusPaid)
}

// GetDashboardStats returns overview statistics
func (s *InvoiceService) GetDashboardStats() (map[string]interface{}, error) {
	stats := make(map[string]interface{})

	var totalInvoices int64
	s.DB.Model(&models.Invoice{}).Count(&totalInvoices)

	var totalDraft int64
	s.DB.Model(&models.Invoice{}).Where("status = ?", models.StatusDraft).Count(&totalDraft)

	var totalReview int64
	s.DB.Model(&models.Invoice{}).Where("status = ?", models.StatusReview).Count(&totalReview)

	var totalApproved int64
	s.DB.Model(&models.Invoice{}).Where("status = ?", models.StatusApproved).Count(&totalApproved)

	var totalPaid int64
	s.DB.Model(&models.Invoice{}).Where("status = ?", models.StatusPaid).Count(&totalPaid)

	var totalRevenue float64
	s.DB.Model(&models.Invoice{}).Where("status = ?", models.StatusPaid).
		Select("COALESCE(SUM(grand_total), 0)").Scan(&totalRevenue)

	var totalOutstanding float64
	s.DB.Model(&models.Invoice{}).Where("status IN ?", []models.InvoiceStatus{
		models.StatusApproved, models.StatusSent,
	}).Select("COALESCE(SUM(grand_total), 0)").Scan(&totalOutstanding)

	var overdueCount int64
	s.DB.Model(&models.Invoice{}).
		Where("status IN ? AND due_date < ?", []models.InvoiceStatus{models.StatusSent, models.StatusApproved}, time.Now()).
		Count(&overdueCount)

	stats["total_invoices"] = totalInvoices
	stats["total_draft"] = totalDraft
	stats["total_review"] = totalReview
	stats["total_approved"] = totalApproved
	stats["total_paid"] = totalPaid
	stats["total_revenue"] = totalRevenue
	stats["total_outstanding"] = totalOutstanding
	stats["overdue_count"] = overdueCount

	return stats, nil
}

// --- Internal helpers ---

func (s *InvoiceService) calculateTotals(invoice *models.Invoice) {
	var subtotal float64
	for i := range invoice.Items {
		invoice.Items[i].TotalPrice = invoice.Items[i].Quantity * invoice.Items[i].UnitPrice
		subtotal += invoice.Items[i].TotalPrice
	}
	invoice.Subtotal = subtotal
	invoice.TaxAmount = (subtotal - invoice.Discount) * (invoice.TaxRate / 100)
	invoice.GrandTotal = subtotal - invoice.Discount + invoice.TaxAmount
}

func (s *InvoiceService) transitionStatus(id uint, from, to models.InvoiceStatus) error {
	var invoice models.Invoice
	if err := s.DB.First(&invoice, id).Error; err != nil {
		return err
	}
	if invoice.Status != from {
		return fmt.Errorf("invoice must be in '%s' status to transition to '%s', current: '%s'", from, to, invoice.Status)
	}
	return s.DB.Model(&invoice).Update("status", to).Error
}

func toRomanMonth(month int) string {
	romans := []string{"", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"}
	if month >= 1 && month <= 12 {
		return romans[month]
	}
	return "I"
}

// GetAuditLogs returns all audit logs for a specific invoice
func (s *InvoiceService) GetAuditLogs(invoiceID uint) ([]models.AuditLog, error) {
	var logs []models.AuditLog
	err := s.DB.Where("invoice_id = ?", invoiceID).Order("created_at DESC").Find(&logs).Error
	return logs, err
}

// LogAudit creates an audit log entry
func (s *InvoiceService) LogAudit(invoiceID uint, userID uint, userName, action, details string) {
	log := models.AuditLog{
		InvoiceID: invoiceID,
		UserID:    userID,
		UserName:  userName,
		Action:    action,
		Details:   details,
	}
	s.DB.Create(&log)
}

// UploadAttachment creates a new attachment record
func (s *InvoiceService) UploadAttachment(invoiceID uint, fileName, filePath, fileType string) (*models.InvoiceAttachment, error) {
	attachment := &models.InvoiceAttachment{
		InvoiceID: invoiceID,
		FileName:  fileName,
		FilePath:  filePath,
		FileType:  fileType,
		CreatedAt: time.Now(),
	}

	if err := s.DB.Create(attachment).Error; err != nil {
		return nil, err
	}
	return attachment, nil
}

// GetAttachments retrieves all attachments for an invoice
func (s *InvoiceService) GetAttachments(invoiceID uint) ([]models.InvoiceAttachment, error) {
	var attachments []models.InvoiceAttachment
	err := s.DB.Where("invoice_id = ?", invoiceID).Order("created_at DESC").Find(&attachments).Error
	return attachments, err
}

// DeleteAttachment removes the attachment record and returns the file path for physical deletion
func (s *InvoiceService) DeleteAttachment(attachmentID uint, invoiceID uint) (string, error) {
	var attachment models.InvoiceAttachment
	if err := s.DB.Where("id = ? AND invoice_id = ?", attachmentID, invoiceID).First(&attachment).Error; err != nil {
		return "", fmt.Errorf("attachment not found")
	}

	filePath := attachment.FilePath
	if err := s.DB.Delete(&attachment).Error; err != nil {
		return "", err
	}

	return filePath, nil
}
