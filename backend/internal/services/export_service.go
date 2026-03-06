package services

import (
	"fmt"
	"time"

	"github.com/ksm/go-invoice/internal/models"
	"github.com/xuri/excelize/v2"
	"gorm.io/gorm"
)

type ExportService struct {
	DB *gorm.DB
}

func NewExportService(db *gorm.DB) *ExportService {
	return &ExportService{DB: db}
}

// ExportInvoicesToExcel generates an Excel file with invoice data.
func (s *ExportService) ExportInvoicesToExcel(status string) ([]byte, error) {
	var invoices []models.Invoice
	q := s.DB.Preload("Items").Order("created_at DESC")
	if status != "" && status != "all" {
		q = q.Where("status = ?", status)
	}
	if err := q.Find(&invoices).Error; err != nil {
		return nil, err
	}

	f := excelize.NewFile()
	sheet := "Invoices"
	f.SetSheetName("Sheet1", sheet)

	// Header style
	headerStyle, _ := f.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Bold: true, Size: 11, Color: "FFFFFF"},
		Fill:      excelize.Fill{Type: "pattern", Pattern: 1, Color: []string{"C69C3C"}},
		Alignment: &excelize.Alignment{Horizontal: "center", Vertical: "center"},
		Border: []excelize.Border{
			{Type: "bottom", Color: "000000", Style: 1},
		},
	})

	headers := []string{"No", "No. Invoice", "No. Kwitansi", "Klien", "Proyek", "Termin", "Subtotal", "PPN", "Diskon", "Grand Total", "Status", "Tanggal Invoice", "Jatuh Tempo"}
	for i, h := range headers {
		cell, _ := excelize.CoordinatesToCellName(i+1, 1)
		f.SetCellValue(sheet, cell, h)
		f.SetCellStyle(sheet, cell, cell, headerStyle)
	}

	// Column widths
	widths := map[string]float64{"A": 5, "B": 25, "C": 25, "D": 25, "E": 30, "F": 8, "G": 18, "H": 18, "I": 15, "J": 20, "K": 12, "L": 15, "M": 15}
	for col, w := range widths {
		f.SetColWidth(sheet, col, col, w)
	}

	// Data
	for i, inv := range invoices {
		row := i + 2
		kwiNo := "-"

		f.SetCellValue(sheet, fmt.Sprintf("A%d", row), i+1)
		f.SetCellValue(sheet, fmt.Sprintf("B%d", row), inv.InvoiceNumber)
		f.SetCellValue(sheet, fmt.Sprintf("C%d", row), kwiNo)
		f.SetCellValue(sheet, fmt.Sprintf("D%d", row), inv.ClientName)
		f.SetCellValue(sheet, fmt.Sprintf("E%d", row), inv.ProjectName)
		f.SetCellValue(sheet, fmt.Sprintf("F%d", row), inv.TerminNumber)
		f.SetCellValue(sheet, fmt.Sprintf("G%d", row), inv.Subtotal)
		f.SetCellValue(sheet, fmt.Sprintf("H%d", row), inv.TaxAmount)
		f.SetCellValue(sheet, fmt.Sprintf("I%d", row), inv.Discount)
		f.SetCellValue(sheet, fmt.Sprintf("J%d", row), inv.GrandTotal)
		f.SetCellValue(sheet, fmt.Sprintf("K%d", row), string(inv.Status))
		f.SetCellValue(sheet, fmt.Sprintf("L%d", row), inv.InvoiceDate.Format("02/01/2006"))
		f.SetCellValue(sheet, fmt.Sprintf("M%d", row), inv.DueDate.Format("02/01/2006"))
	}

	buf, err := f.WriteToBuffer()
	if err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}

// ExportKwitansiToExcel generates an Excel file focused on Kwitansi data.
func (s *ExportService) ExportKwitansiToExcel() ([]byte, error) {
	var invoices []models.Invoice
	q := s.DB.Where("status IN ?", []string{"approved", "sent", "paid"}).Order("created_at DESC")
	if err := q.Find(&invoices).Error; err != nil {
		return nil, err
	}

	f := excelize.NewFile()
	sheet := "Kwitansi"
	f.SetSheetName("Sheet1", sheet)

	headerStyle, _ := f.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Bold: true, Size: 11, Color: "FFFFFF"},
		Fill:      excelize.Fill{Type: "pattern", Pattern: 1, Color: []string{"2E8B57"}},
		Alignment: &excelize.Alignment{Horizontal: "center", Vertical: "center"},
	})

	headers := []string{"No", "No. Kwitansi", "No. Invoice", "Klien", "Proyek", "Grand Total", "Status", "Tanggal"}
	for i, h := range headers {
		cell, _ := excelize.CoordinatesToCellName(i+1, 1)
		f.SetCellValue(sheet, cell, h)
		f.SetCellStyle(sheet, cell, cell, headerStyle)
	}

	widths := map[string]float64{"A": 5, "B": 25, "C": 25, "D": 25, "E": 30, "F": 20, "G": 12, "H": 15}
	for col, w := range widths {
		f.SetColWidth(sheet, col, col, w)
	}

	for i, inv := range invoices {
		row := i + 2
		kwiNo := fmt.Sprintf("KWI-%s", inv.InvoiceNumber)
		f.SetCellValue(sheet, fmt.Sprintf("A%d", row), i+1)
		f.SetCellValue(sheet, fmt.Sprintf("B%d", row), kwiNo)
		f.SetCellValue(sheet, fmt.Sprintf("C%d", row), inv.InvoiceNumber)
		f.SetCellValue(sheet, fmt.Sprintf("D%d", row), inv.ClientName)
		f.SetCellValue(sheet, fmt.Sprintf("E%d", row), inv.ProjectName)
		f.SetCellValue(sheet, fmt.Sprintf("F%d", row), inv.GrandTotal)
		f.SetCellValue(sheet, fmt.Sprintf("G%d", row), string(inv.Status))
		f.SetCellValue(sheet, fmt.Sprintf("H%d", row), inv.InvoiceDate.Format("02/01/2006"))
	}

	buf, err := f.WriteToBuffer()
	if err != nil {
		return nil, err
	}

	_ = time.Now() // placeholder for potential date-based naming
	return buf.Bytes(), nil
}
