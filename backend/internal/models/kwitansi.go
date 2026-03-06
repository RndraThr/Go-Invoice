package models

import (
	"time"

	"gorm.io/gorm"
)

// KwitansiStatus represents the lifecycle state of a kwitansi
type KwitansiStatus string

const (
	KwitansiStatusDraft     KwitansiStatus = "draft"
	KwitansiStatusReview    KwitansiStatus = "review"
	KwitansiStatusApproved  KwitansiStatus = "approved"
	KwitansiStatusSent      KwitansiStatus = "sent"
	KwitansiStatusPaid      KwitansiStatus = "paid"
	KwitansiStatusCancelled KwitansiStatus = "cancelled"
)

// Kwitansi represents the independent kwitansi record tied to a project
type Kwitansi struct {
	ID             uint           `gorm:"primarykey" json:"id"`
	InvoiceID      *uint          `gorm:"index" json:"invoice_id"`
	InvoiceNumber  string         `gorm:"size:50;index" json:"invoice_number"`
	ProjectID      string         `gorm:"size:50;index" json:"project_id"` // e.g. KSM-24P047
	ProjectName    string         `gorm:"size:255" json:"project_name"`    // denormalized project name
	ClientName     string         `gorm:"type:text" json:"client_name"`
	ClientAddress  string         `gorm:"type:text" json:"client_address"`
	CreatedBy      uint           `gorm:"index" json:"created_by"`
	CreatedByName  string         `gorm:"size:100" json:"created_by_name"`
	KwitansiNumber string         `gorm:"size:50;uniqueIndex" json:"kwitansi_number"` // KWI/II/2026/001
	KwitansiDate   time.Time      `json:"kwitansi_date"`
	Status         KwitansiStatus `gorm:"size:20;default:draft;index" json:"status"`
	Amount         float64        `gorm:"type:decimal(15,2);default:0" json:"amount"`
	Purpose        string         `gorm:"type:text" json:"purpose"` // "Untuk Pembayaran: ..."
	Notes          string         `gorm:"type:text" json:"notes"`
	CreatedAt      time.Time      `json:"created_at"`
	UpdatedAt      time.Time      `json:"updated_at"`
	DeletedAt      gorm.DeletedAt `gorm:"index" json:"-"`
}

func (Kwitansi) TableName() string { return "kwitansis" }
