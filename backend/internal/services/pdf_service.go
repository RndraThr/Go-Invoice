package services

import (
	"bytes"
	"fmt"
	"math"
	"strings"
	"time"

	"github.com/jung-kurt/gofpdf"
	"github.com/ksm/go-invoice/internal/models"
)

// GenerateInvoicePDF creates a PDF document for an Invoice based on the provided format
func GenerateInvoicePDF(invoice *models.Invoice) ([]byte, error) {
	pdf := gofpdf.New("P", "mm", "A4", "")
	pdf.AddPage()
	pdf.SetMargins(10, 10, 10)

	// --- 1. HEADER ---
	pdf.SetFont("Arial", "B", 14)
	pdf.CellFormat(190, 8, "INVOICE", "1", 1, "C", false, 0, "")

	// Client Info & Invoice No Box (Rect Box)
	pdf.SetFont("Arial", "", 9)
	yStart := pdf.GetY()
	pdf.Rect(10, yStart, 190, 30, "D") // Outer box for the header

	pdf.SetXY(12, yStart+2)
	pdf.CellFormat(90, 5, "Kepada Yth.", "0", 0, "L", false, 0, "")
	pdf.SetXY(120, pdf.GetY())
	pdf.CellFormat(68, 5, "Invoice No : "+invoice.InvoiceNumber, "0", 1, "L", false, 0, "")

	pdf.SetXY(12, pdf.GetY())

	// Client Name
	pdf.SetFont("Arial", "B", 9)
	pdf.SetXY(12, pdf.GetY())
	pdf.CellFormat(100, 5, invoice.ClientName, "0", 1, "L", false, 0, "")

	// Client Address (separate field)
	pdf.SetFont("Arial", "", 9)
	if invoice.ClientAddress != "" {
		addrLines := strings.Split(invoice.ClientAddress, "\n")
		for _, line := range addrLines {
			pdf.SetXY(12, pdf.GetY())
			pdf.CellFormat(100, 5, line, "0", 1, "L", false, 0, "")
		}
	}

	// Move cursor past the box
	pdf.SetXY(10, yStart+30)

	// --- 2. TABLE HEADER ---
	pdf.SetFont("Arial", "B", 9)
	pdf.CellFormat(10, 8, "No.", "1", 0, "C", false, 0, "")
	pdf.CellFormat(90, 8, "KETERANGAN", "1", 0, "C", false, 0, "")
	pdf.CellFormat(20, 8, "JUMLAH", "1", 0, "C", false, 0, "")
	pdf.CellFormat(35, 8, "UNIT PRICE", "LTR", 0, "C", false, 0, "")
	pdf.CellFormat(35, 8, "AMOUNT", "LTR", 1, "C", false, 0, "")

	// Sub-header for currency
	pdf.CellFormat(10, 5, "", "L R B", 0, "C", false, 0, "")
	pdf.CellFormat(90, 5, "", "L R B", 0, "C", false, 0, "")
	pdf.CellFormat(20, 5, "", "L R B", 0, "C", false, 0, "")
	pdf.CellFormat(35, 5, "(IDR)", "L R B", 0, "C", false, 0, "")
	pdf.CellFormat(35, 5, "(IDR)", "L R B", 1, "C", false, 0, "")

	// --- 3. MAIN TABLE DATA ---
	pdf.SetFont("Arial", "B", 9)
	pdf.CellFormat(10, 5, "", "L", 0, "C", false, 0, "")
	pdf.CellFormat(90, 5, fmt.Sprintf("Pembayaran %d%%", invoice.TerminNumber), "L R", 0, "L", false, 0, "")
	pdf.CellFormat(20, 5, "", "R", 0, "C", false, 0, "")
	pdf.CellFormat(35, 5, "", "R", 0, "R", false, 0, "")
	pdf.CellFormat(35, 5, "", "R", 1, "R", false, 0, "")

	pdf.CellFormat(10, 5, "", "L", 0, "C", false, 0, "")
	pdf.CellFormat(90, 5, "Surat Pemesanan Barang", "L R", 0, "L", false, 0, "")
	pdf.CellFormat(20, 5, "", "R", 0, "C", false, 0, "")
	pdf.CellFormat(35, 5, "", "R", 0, "R", false, 0, "")
	pdf.CellFormat(35, 5, "", "R", 1, "R", false, 0, "")

	pdf.CellFormat(10, 5, "", "L", 0, "C", false, 0, "")
	pdf.CellFormat(90, 5, fmt.Sprintf("Tanggal %s", invoice.InvoiceDate.Format("02 Jan 2006")), "L R", 0, "L", false, 0, "")
	pdf.CellFormat(20, 5, "", "R", 0, "C", false, 0, "")
	pdf.CellFormat(35, 5, "", "R", 0, "R", false, 0, "")
	pdf.CellFormat(35, 5, "", "R", 1, "R", false, 0, "")

	pdf.CellFormat(10, 5, "", "L", 0, "C", false, 0, "")
	pdf.CellFormat(90, 5, fmt.Sprintf("Project ID : %s", invoice.ProjectID), "L R", 0, "L", false, 0, "")
	pdf.CellFormat(20, 5, "", "R", 0, "C", false, 0, "")
	pdf.CellFormat(35, 5, "", "R", 0, "R", false, 0, "")
	pdf.CellFormat(35, 5, "", "R", 1, "R", false, 0, "")

	// Gap
	pdf.CellFormat(10, 5, "", "L", 0, "C", false, 0, "")
	pdf.CellFormat(90, 5, "", "L R", 0, "L", false, 0, "")
	pdf.CellFormat(20, 5, "", "R", 0, "C", false, 0, "")
	pdf.CellFormat(35, 5, "", "R", 0, "R", false, 0, "")
	pdf.CellFormat(35, 5, "", "R", 1, "R", false, 0, "")

	pdf.SetFont("Arial", "", 9)
	for i, item := range invoice.Items {
		descLines := strings.Split(item.Description, "\n")
		// Line 1: Item #, Desc 1, Qty, Unit Price, Total Price
		pdf.CellFormat(10, 5, fmt.Sprintf("%d", i+1), "L", 0, "C", false, 0, "")

		desc1 := ""
		if len(descLines) > 0 {
			desc1 = descLines[0]
		}
		pdf.CellFormat(90, 5, desc1, "L R", 0, "L", false, 0, "")

		pdf.CellFormat(20, 5, fmt.Sprintf("%.0f %s", item.Quantity, item.Unit), "R", 0, "C", false, 0, "")
		pdf.CellFormat(35, 5, formatIDRStr(item.UnitPrice), "R", 0, "R", false, 0, "")
		pdf.CellFormat(35, 5, formatIDRStr(item.TotalPrice), "R", 1, "R", false, 0, "")

		// Remaining description lines
		for j := 1; j < len(descLines); j++ {
			pdf.CellFormat(10, 5, "", "L", 0, "C", false, 0, "")
			pdf.CellFormat(90, 5, descLines[j], "L R", 0, "L", false, 0, "")
			pdf.CellFormat(20, 5, "", "R", 0, "C", false, 0, "")
			pdf.CellFormat(35, 5, "", "R", 0, "R", false, 0, "")
			pdf.CellFormat(35, 5, "", "R", 1, "R", false, 0, "")
		}

		// Spacer
		pdf.CellFormat(10, 5, "", "L", 0, "C", false, 0, "")
		pdf.CellFormat(90, 5, "", "L R", 0, "L", false, 0, "")
		pdf.CellFormat(20, 5, "", "R", 0, "C", false, 0, "")
		pdf.CellFormat(35, 5, "", "R", 0, "R", false, 0, "")
		pdf.CellFormat(35, 5, "", "R", 1, "R", false, 0, "")
	}

	// Fill empty space to make the table look uniform
	for pdf.GetY() < 160 {
		pdf.CellFormat(10, 5, "", "L", 0, "C", false, 0, "")
		pdf.CellFormat(90, 5, "", "L R", 0, "L", false, 0, "")
		pdf.CellFormat(20, 5, "", "R", 0, "C", false, 0, "")
		pdf.CellFormat(35, 5, "", "R", 0, "R", false, 0, "")
		pdf.CellFormat(35, 5, "", "R", 1, "R", false, 0, "")
	}

	// --- 4. TOTALS FOOTER ---
	// Close the bottom of the empty area
	pdf.CellFormat(10, 5, "", "L B", 0, "C", false, 0, "")
	pdf.CellFormat(90, 5, "", "L R B", 0, "L", false, 0, "")
	pdf.CellFormat(20, 5, "", "R B", 0, "C", false, 0, "")

	pdf.SetFont("Arial", "B", 9)
	pdf.CellFormat(35, 5, "SUB TOTAL", "1", 0, "R", false, 0, "")
	pdf.CellFormat(35, 5, formatIDRStr(invoice.Subtotal), "1", 1, "R", false, 0, "")

	if invoice.Discount > 0 {
		pdf.CellFormat(120, 5, "", "0", 0, "C", false, 0, "")
		pdf.CellFormat(35, 5, "DISCOUNT", "1", 0, "R", false, 0, "")
		pdf.CellFormat(35, 5, formatIDRStr(invoice.Discount), "1", 1, "R", false, 0, "")
	}

	pdf.CellFormat(120, 5, "", "0", 0, "C", false, 0, "")
	pdf.CellFormat(35, 5, fmt.Sprintf("PPN %.0f%%", invoice.TaxRate), "1", 0, "R", false, 0, "")
	pdf.CellFormat(35, 5, formatIDRStr(invoice.TaxAmount), "1", 1, "R", false, 0, "")

	pdf.CellFormat(120, 5, "", "0", 0, "C", false, 0, "")
	pdf.CellFormat(35, 5, "T O T A L", "1", 0, "R", false, 0, "")
	pdf.CellFormat(35, 5, formatIDRStr(invoice.GrandTotal), "1", 1, "R", false, 0, "")

	// --- 5. TERBILANG & NOTES & SIGNATURE ---
	pdf.Ln(5)
	pdf.SetFont("Arial", "", 9)
	pdf.CellFormat(190, 5, "Terbilang : "+Terbilang(invoice.GrandTotal)+" Rupiah", "0", 1, "L", false, 0, "")

	pdf.Ln(5)
	yNotes := pdf.GetY()
	pdf.SetFont("Arial", "", 8)

	// Default notes
	catatanLines := []string{
		"CATATAN :",
		"KAMI TIDAK MENERIMA PEMBEBANAN BIAYA BANK,",
		"HARAP PASTIKAN PEMBAYARAN SESUAI DENGAN",
		"NOMINAL INVOICE.",
		"PEMBAYARAN DITRANSFER KE REKENING",
		"BSI CABANG KCP BEKASI JATIASIH",
		"A/N : KIAN SANTANG MULIATAMA PT",
		"Rek. No. 7185595751 ( IDR )",
	}

	if invoice.Notes != "" {
		catatanLines = []string{"CATATAN :"} // always force prefix
		catatanLines = append(catatanLines, strings.Split(invoice.Notes, "\n")...)
	}

	// Notes Box
	boxHeight := float64(len(catatanLines)*5 + 5)
	pdf.Rect(10, yNotes, 85, boxHeight, "D")

	for i, line := range catatanLines {
		pdf.SetXY(12, yNotes+float64(i*5)+2.5)
		pdf.CellFormat(80, 5, line, "0", 0, "L", false, 0, "")
	}

	// Signature Area
	pdf.SetXY(120, yNotes+2)
	pdf.SetFont("Arial", "", 9)
	pdf.CellFormat(70, 5, fmt.Sprintf("Bekasi, %s", invoice.InvoiceDate.Format("02 Jan 2006")), "0", 1, "L", false, 0, "")
	pdf.SetXY(120, pdf.GetY())
	pdf.CellFormat(70, 5, "PT KIAN SANTANG MULIATAMA TBK", "0", 1, "L", false, 0, "")

	pdf.SetXY(120, pdf.GetY()+20)
	pdf.SetFont("Arial", "U", 9)
	pdf.CellFormat(70, 5, "Edy Nurhamid Amin", "0", 1, "L", false, 0, "")
	pdf.SetFont("Arial", "", 9)
	pdf.SetXY(120, pdf.GetY())
	pdf.CellFormat(70, 5, "Direktur Utama", "0", 1, "L", false, 0, "")

	// Write to buffer
	var buf bytes.Buffer
	err := pdf.Output(&buf)
	if err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}

// GenerateKwitansiPDF creates a KWITANSI document
func GenerateKwitansiPDF(invoice *models.Invoice) ([]byte, error) {
	pdf := gofpdf.New("P", "mm", "A4", "")
	pdf.AddPage()
	pdf.SetMargins(10, 10, 10)

	pdf.SetFont("Arial", "B", 14)
	pdf.SetXY(80, 20)
	pdf.CellFormat(50, 8, "KWITANSI", "1", 1, "C", false, 0, "")

	pdf.Ln(15)
	pdf.SetFont("Arial", "", 10)

	// Kwitansi No: temporary fallback to INV->KWI substitution until fully migrated
	kwiNo := strings.Replace(invoice.InvoiceNumber, "INV", "KWI", 1)

	pdf.CellFormat(40, 6, "No.", "0", 0, "L", false, 0, "")
	pdf.CellFormat(5, 6, ":", "0", 0, "C", false, 0, "")
	pdf.CellFormat(100, 6, kwiNo, "0", 1, "L", false, 0, "")

	pdf.CellFormat(40, 6, "SUDAH TERIMA DARI", "0", 0, "L", false, 0, "")
	pdf.CellFormat(5, 6, ":", "0", 0, "C", false, 0, "")

	lines := strings.Split(invoice.ClientName, "\n")
	if len(lines) > 0 {
		pdf.CellFormat(100, 6, lines[0], "0", 1, "L", false, 0, "")
		for i := 1; i < len(lines); i++ {
			pdf.CellFormat(45, 6, "", "0", 0, "L", false, 0, "") // 40 + 5
			pdf.CellFormat(100, 6, lines[i], "0", 1, "L", false, 0, "")
		}
	} else {
		pdf.CellFormat(100, 6, "", "0", 1, "L", false, 0, "")
	}

	pdf.Ln(5)

	// BANYAKNYA UANG
	pdf.SetFont("Arial", "", 10)
	pdf.CellFormat(40, 8, "BANYAKNYA UANG", "0", 0, "L", false, 0, "")
	pdf.CellFormat(5, 8, ":", "0", 0, "C", false, 0, "")
	pdf.SetFillColor(230, 230, 230)
	pdf.SetFont("Arial", "B", 10)
	pdf.CellFormat(145, 8, " "+Terbilang(invoice.GrandTotal)+" Rupiah", "1", 1, "L", true, 0, "")

	pdf.Ln(5)

	// UNTUK PEMBAYARAN
	pdf.SetFont("Arial", "", 10)
	pdf.CellFormat(40, 6, "UNTUK PEMBAYARAN", "0", 0, "L", false, 0, "")
	pdf.CellFormat(5, 6, ":", "0", 0, "C", false, 0, "")

	pdf.SetFont("Arial", "B", 10)
	pdf.CellFormat(100, 6, fmt.Sprintf("Pembayaran %d%%", invoice.TerminNumber), "0", 1, "L", false, 0, "")

	pdf.CellFormat(45, 6, "", "0", 0, "L", false, 0, "")
	pdf.CellFormat(100, 6, "Surat Pemesanan Barang", "0", 1, "L", false, 0, "")

	pdf.CellFormat(45, 6, "", "0", 0, "L", false, 0, "")
	pdf.CellFormat(100, 6, fmt.Sprintf("Tanggal %s", invoice.InvoiceDate.Format("02 Jan 2006")), "0", 1, "L", false, 0, "")

	pdf.CellFormat(45, 6, "", "0", 0, "L", false, 0, "")
	pdf.CellFormat(100, 6, fmt.Sprintf("Project ID : %s", invoice.ProjectID), "0", 1, "L", false, 0, "")

	pdf.Ln(5)
	pdf.SetFont("Arial", "", 10)
	for i, item := range invoice.Items {
		descLines := strings.Split(item.Description, "\n")
		itemNo := fmt.Sprintf("%d.", i+1)
		pdf.CellFormat(45, 6, "", "0", 0, "C", false, 0, "")
		pdf.CellFormat(10, 6, itemNo, "0", 0, "L", false, 0, "")

		desc1 := ""
		if len(descLines) > 0 {
			desc1 = descLines[0]
		}
		pdf.CellFormat(100, 6, desc1, "0", 0, "L", false, 0, "")
		pdf.CellFormat(30, 6, fmt.Sprintf("%.0f %s", item.Quantity, item.Unit), "0", 1, "R", false, 0, "")

		for j := 1; j < len(descLines); j++ {
			pdf.CellFormat(55, 6, "", "0", 0, "L", false, 0, "")
			pdf.CellFormat(100, 6, descLines[j], "0", 1, "L", false, 0, "")
		}
	}

	pdf.Ln(15)

	// JUMLAH
	pdf.CellFormat(20, 8, "JUMLAH", "0", 0, "L", false, 0, "")
	pdf.SetFillColor(230, 230, 230)
	pdf.SetFont("Arial", "B", 12)
	pdf.CellFormat(10, 8, "Rp", "L T B", 0, "L", true, 0, "")
	pdf.CellFormat(40, 8, formatIDRStrWithDecimal(invoice.GrandTotal), "R T B", 1, "R", true, 0, "")

	pdf.Ln(15)

	// BANK DETAILS & SIGNATURE
	yNotes := pdf.GetY()
	pdf.SetFont("Arial", "", 9)

	catatanLines := []string{
		"PEMBAYARAN DITRANSFER KE REKENING",
		"BSI CABANG KCP BEKASI JATIASIH",
		"A/N : KIAN SANTANG MULIATAMA PT",
		"Rek. No. 7185595751 ( IDR )",
	}

	for i, line := range catatanLines {
		pdf.SetXY(10, yNotes+float64(i*5))
		pdf.CellFormat(80, 5, line, "0", 0, "L", false, 0, "")
	}

	// Signature
	pdf.SetXY(120, yNotes)
	pdf.CellFormat(70, 5, fmt.Sprintf("Bekasi, %s", invoice.InvoiceDate.Format("02 Jan 2006")), "0", 1, "L", false, 0, "")
	pdf.SetXY(120, pdf.GetY())
	pdf.CellFormat(70, 5, "PT KIAN SANTANG MULIATAMA TBK", "0", 1, "L", false, 0, "")

	pdf.SetXY(120, pdf.GetY()+20)
	pdf.SetFont("Arial", "U", 9)
	pdf.CellFormat(70, 5, "Edy Nurhamid Amin", "0", 1, "L", false, 0, "")
	pdf.SetFont("Arial", "", 9)
	pdf.SetXY(120, pdf.GetY())
	pdf.CellFormat(70, 5, "Direktur Utama", "0", 1, "L", false, 0, "")

	// Write to buffer
	var buf bytes.Buffer
	err := pdf.Output(&buf)
	if err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}

// GenerateStandaloneKwitansiPDF creates a KWITANSI document from a Kwitansi model
func GenerateStandaloneKwitansiPDF(kwitansi *models.Kwitansi) ([]byte, error) {
	pdf := gofpdf.New("P", "mm", "A4", "")
	pdf.AddPage()
	pdf.SetMargins(10, 10, 10)

	pdf.SetFont("Arial", "B", 14)
	pdf.SetXY(80, 20)
	pdf.CellFormat(50, 8, "KWITANSI", "1", 1, "C", false, 0, "")

	pdf.Ln(15)
	pdf.SetFont("Arial", "", 10)

	pdf.CellFormat(40, 6, "No.", "0", 0, "L", false, 0, "")
	pdf.CellFormat(5, 6, ":", "0", 0, "C", false, 0, "")
	pdf.CellFormat(100, 6, kwitansi.KwitansiNumber, "0", 1, "L", false, 0, "")

	pdf.CellFormat(40, 6, "SUDAH TERIMA DARI", "0", 0, "L", false, 0, "")
	pdf.CellFormat(5, 6, ":", "0", 0, "C", false, 0, "")

	lines := strings.Split(kwitansi.ClientName, "\n")
	if len(lines) > 0 {
		pdf.CellFormat(100, 6, lines[0], "0", 1, "L", false, 0, "")
		for i := 1; i < len(lines); i++ {
			pdf.CellFormat(45, 6, "", "0", 0, "L", false, 0, "") // 40 + 5
			pdf.CellFormat(100, 6, lines[i], "0", 1, "L", false, 0, "")
		}
	} else {
		pdf.CellFormat(100, 6, "", "0", 1, "L", false, 0, "")
	}

	pdf.Ln(5)

	// BANYAKNYA UANG
	pdf.SetFont("Arial", "", 10)
	pdf.CellFormat(40, 8, "BANYAKNYA UANG", "0", 0, "L", false, 0, "")
	pdf.CellFormat(5, 8, ":", "0", 0, "C", false, 0, "")
	pdf.SetFillColor(230, 230, 230)
	pdf.SetFont("Arial", "B", 10)
	pdf.CellFormat(145, 8, " "+Terbilang(kwitansi.Amount)+" Rupiah", "1", 1, "L", true, 0, "")

	pdf.Ln(5)

	// UNTUK PEMBAYARAN
	pdf.SetFont("Arial", "", 10)
	pdf.CellFormat(40, 6, "UNTUK PEMBAYARAN", "0", 0, "L", false, 0, "")
	pdf.CellFormat(5, 6, ":", "0", 0, "C", false, 0, "")

	// Print purpose line by line if long
	purposeLines := strings.Split(kwitansi.Purpose, "\n")
	if len(purposeLines) > 0 {
		pdf.SetFont("Arial", "B", 10)
		pdf.CellFormat(100, 6, purposeLines[0], "0", 1, "L", false, 0, "")
		for i := 1; i < len(purposeLines); i++ {
			pdf.CellFormat(45, 6, "", "0", 0, "L", false, 0, "")
			pdf.CellFormat(100, 6, purposeLines[i], "0", 1, "L", false, 0, "")
		}
	} else {
		pdf.CellFormat(100, 6, "", "0", 1, "L", false, 0, "")
	}

	pdf.SetFont("Arial", "B", 10)
	pdf.CellFormat(45, 6, "", "0", 0, "L", false, 0, "")
	pdf.CellFormat(100, 6, fmt.Sprintf("Tanggal %s", kwitansi.KwitansiDate.Format("02 Jan 2006")), "0", 1, "L", false, 0, "")

	pdf.CellFormat(45, 6, "", "0", 0, "L", false, 0, "")
	pdf.CellFormat(100, 6, fmt.Sprintf("Project ID : %s", kwitansi.ProjectID), "0", 1, "L", false, 0, "")

	pdf.Ln(15)

	// JUMLAH
	pdf.CellFormat(20, 8, "JUMLAH", "0", 0, "L", false, 0, "")
	pdf.SetFillColor(230, 230, 230)
	pdf.SetFont("Arial", "B", 12)
	pdf.CellFormat(10, 8, "Rp", "L T B", 0, "L", true, 0, "")
	pdf.CellFormat(40, 8, formatIDRStrWithDecimal(kwitansi.Amount), "R T B", 1, "R", true, 0, "")

	pdf.Ln(15)

	// BANK DETAILS & SIGNATURE
	yNotes := pdf.GetY()
	pdf.SetFont("Arial", "", 9)

	catatanLines := []string{
		"PEMBAYARAN DITRANSFER KE REKENING",
		"BSI CABANG KCP BEKASI JATIASIH",
		"A/N : KIAN SANTANG MULIATAMA PT",
		"Rek. No. 7185595751 ( IDR )",
	}

	for i, line := range catatanLines {
		pdf.SetXY(10, yNotes+float64(i*5))
		pdf.CellFormat(80, 5, line, "0", 0, "L", false, 0, "")
	}

	// Signature
	pdf.SetXY(120, yNotes)
	pdf.CellFormat(70, 5, fmt.Sprintf("Bekasi, %s", time.Now().Format("02 Jan 2006")), "0", 1, "L", false, 0, "")
	pdf.SetXY(120, pdf.GetY())
	pdf.CellFormat(70, 5, "PT KIAN SANTANG MULIATAMA TBK", "0", 1, "L", false, 0, "")

	pdf.SetXY(120, pdf.GetY()+20)
	pdf.SetFont("Arial", "U", 9)
	pdf.CellFormat(70, 5, "Edy Nurhamid Amin", "0", 1, "L", false, 0, "")
	pdf.SetFont("Arial", "", 9)
	pdf.SetXY(120, pdf.GetY())
	pdf.CellFormat(70, 5, "Direktur Utama", "0", 1, "L", false, 0, "")

	// Write to buffer
	var buf bytes.Buffer
	err := pdf.Output(&buf)
	if err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}

// FORMAT HELPER FUNCTIONS

func formatIDRStr(amount float64) string {
	s := fmt.Sprintf("%.0f", amount)
	n := len(s)
	if n <= 3 {
		return s
	}
	out := ""
	for i, c := range s {
		if i > 0 && (n-i)%3 == 0 {
			out += "."
		}
		out += string(c)
	}
	return out
}

func formatIDRStrWithDecimal(amount float64) string {
	s := fmt.Sprintf("%.0f", amount)
	n := len(s)
	if n <= 3 {
		return s + ",00"
	}
	out := ""
	for i, c := range s {
		if i > 0 && (n-i)%3 == 0 {
			out += "."
		}
		out += string(c)
	}
	return out + ",00"
}

// Terbilang converts number to Indonesian words
func Terbilang(n float64) string {
	if n == 0 {
		return "Nol"
	}
	satuan := []string{"", "Satu", "Dua", "Tiga", "Empat", "Lima", "Enam", "Tujuh", "Delapan", "Sembilan", "Sepuluh", "Sebelas"}

	var res string
	nInt := int64(math.Round(n))

	if nInt < 12 {
		res = satuan[nInt]
	} else if nInt < 20 {
		res = Terbilang(float64(nInt-10)) + " Belas"
	} else if nInt < 100 {
		res = Terbilang(float64(nInt/10)) + " Puluh " + Terbilang(float64(nInt%10))
	} else if nInt < 200 {
		res = "Seratus " + Terbilang(float64(nInt-100))
	} else if nInt < 1000 {
		res = Terbilang(float64(nInt/100)) + " Ratus " + Terbilang(float64(nInt%100))
	} else if nInt < 2000 {
		res = "Seribu " + Terbilang(float64(nInt-1000))
	} else if nInt < 1000000 {
		res = Terbilang(float64(nInt/1000)) + " Ribu " + Terbilang(float64(nInt%1000))
	} else if nInt < 1000000000 {
		res = Terbilang(float64(nInt/1000000)) + " Juta " + Terbilang(float64(nInt%1000000))
	} else if nInt < 1000000000000 {
		res = Terbilang(float64(nInt/1000000000)) + " Milyar " + Terbilang(float64(nInt%1000000000))
	} else if nInt < 1000000000000000 {
		res = Terbilang(float64(nInt/1000000000000)) + " Triliun " + Terbilang(float64(nInt%1000000000000))
	}

	return strings.TrimSpace(strings.ReplaceAll(res, "  ", " "))
}
