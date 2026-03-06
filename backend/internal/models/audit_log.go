package models

import "time"

type AuditLog struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	InvoiceID uint      `gorm:"index" json:"invoice_id"`
	UserID    uint      `json:"user_id"`
	UserName  string    `gorm:"size:100" json:"user_name"`
	Action    string    `gorm:"size:50" json:"action"` // created, updated, submitted, approved, rejected, mark_sent, mark_paid
	Details   string    `gorm:"type:text" json:"details"`
	CreatedAt time.Time `json:"created_at"`
}
