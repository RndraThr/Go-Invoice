package models

import (
	"database/sql/driver"
	"encoding/json"
	"errors"
	"time"
)

type ProjectType string

const (
	ProjectTypeProject ProjectType = "PROJECT"
	ProjectTypeRetail  ProjectType = "RETAIL"
)

type Project struct {
	ID            string      `gorm:"type:varchar(50);primaryKey" json:"id"` // e.g KSM-26P001 (Manual)
	Type          ProjectType `gorm:"type:enum('PROJECT','RETAIL');default:'PROJECT'" json:"type"`
	PICPO         string      `gorm:"type:varchar(100)" json:"pic_po"`
	POInNo        string      `gorm:"type:varchar(100)" json:"po_in_no"`
	Company       string      `gorm:"type:text" json:"company"`        // Client
	ClientAddress string      `gorm:"type:text" json:"client_address"` // Client Address
	Subject       string      `gorm:"type:text" json:"subject"`        // Description
	Qty           int         `gorm:"default:1" json:"qty"`
	POValue       float64     `gorm:"type:decimal(20,2)" json:"po_value"` // Exclude PPN 11%

	// Dynamic Payment Terms
	PaymentTerms []PaymentTerm `gorm:"serializer:json" json:"payment_terms"`

	AttachmentPath string `gorm:"type:varchar(255)" json:"attachment_path"` // Path to uploaded file

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

func (Project) TableName() string {
	return "projects"
}

type PaymentTerm struct {
	Name       string  `json:"name"`
	Percentage float64 `json:"percentage"`
}

// Implement Value/Scan for GORM if serializer:json is not working cleanly
func (p PaymentTerm) Value() (driver.Value, error) {
	return json.Marshal(p)
}

func (p *PaymentTerm) Scan(value interface{}) error {
	b, ok := value.([]byte)
	if !ok {
		return errors.New("type assertion to []byte failed")
	}
	return json.Unmarshal(b, &p)
}
