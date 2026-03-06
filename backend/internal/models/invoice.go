package models

import (
	"time"

	"gorm.io/gorm"
)

// InvoiceStatus represents the lifecycle state of an invoice
type InvoiceStatus string

const (
	StatusDraft     InvoiceStatus = "draft"
	StatusReview    InvoiceStatus = "review"
	StatusApproved  InvoiceStatus = "approved"
	StatusSent      InvoiceStatus = "sent"
	StatusPaid      InvoiceStatus = "paid"
	StatusCancelled InvoiceStatus = "cancelled"
)

// Invoice represents the main invoice record
type Invoice struct {
	ID            uint           `gorm:"primarykey" json:"id"`
	ProjectID     string         `gorm:"size:50;index" json:"project_id"`           // from Cost Control: KSM-24P047
	ClientName    string         `gorm:"type:text" json:"client_name"`              // from Cost Control stakeholders
	ClientAddress string         `gorm:"type:text" json:"client_address"`           // from project master data
	CreatedBy     uint           `gorm:"index" json:"created_by"`                   // user ID from JWT
	CreatedByName string         `gorm:"size:100" json:"created_by_name"`           // denormalized user name
	InvoiceNumber string         `gorm:"size:50;uniqueIndex" json:"invoice_number"` // INV/II/2026/001
	InvoiceDate   time.Time      `json:"invoice_date"`
	DueDate       time.Time      `json:"due_date"`
	Status        InvoiceStatus  `gorm:"size:20;default:draft;index" json:"status"`
	Subtotal      float64        `gorm:"type:decimal(15,2);default:0" json:"subtotal"`
	TaxRate       float64        `gorm:"type:decimal(5,2);default:11" json:"tax_rate"` // PPN 11%
	TaxAmount     float64        `gorm:"type:decimal(15,2);default:0" json:"tax_amount"`
	Discount      float64        `gorm:"type:decimal(15,2);default:0" json:"discount"`
	GrandTotal    float64        `gorm:"type:decimal(15,2);default:0" json:"grand_total"`
	Notes         string         `gorm:"type:text" json:"notes"`
	TerminNumber  int            `gorm:"default:1" json:"termin_number"`
	ProjectName   string         `gorm:"size:255" json:"project_name"` // cached from Cost Control
	Items         []InvoiceItem  `gorm:"foreignKey:InvoiceID" json:"items"`
	CreatedAt     time.Time      `json:"created_at"`
	UpdatedAt     time.Time      `json:"updated_at"`
	DeletedAt     gorm.DeletedAt `gorm:"index" json:"-"`
}

// InvoiceItem represents a line item within an invoice
type InvoiceItem struct {
	ID          uint    `gorm:"primarykey" json:"id"`
	InvoiceID   uint    `gorm:"index" json:"invoice_id"`
	ItemCode    string  `gorm:"size:50" json:"item_code"` // from Cost Control master items
	Description string  `gorm:"size:500" json:"description"`
	Quantity    float64 `gorm:"type:decimal(10,2)" json:"quantity"`
	Unit        string  `gorm:"size:20" json:"unit"`
	UnitPrice   float64 `gorm:"type:decimal(15,2)" json:"unit_price"`
	TotalPrice  float64 `gorm:"type:decimal(15,2)" json:"total_price"`
}

// InvoiceAttachment represents an uploaded file linked to an invoice
type InvoiceAttachment struct {
	ID        uint      `gorm:"primarykey" json:"id"`
	InvoiceID uint      `gorm:"index" json:"invoice_id"`
	FileName  string    `gorm:"size:255" json:"file_name"`
	FilePath  string    `gorm:"size:500" json:"file_path"`
	FileType  string    `gorm:"size:50" json:"file_type"`
	CreatedAt time.Time `json:"created_at"`
}

// TableName overrides
func (Invoice) TableName() string           { return "invoices" }
func (InvoiceItem) TableName() string       { return "invoice_items" }
func (InvoiceAttachment) TableName() string { return "invoice_attachments" }
