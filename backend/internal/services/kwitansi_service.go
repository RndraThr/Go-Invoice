package services

import (
	"fmt"
	"time"

	"github.com/ksm/go-invoice/internal/models"
	"gorm.io/gorm"
)

type KwitansiService struct {
	DB *gorm.DB
}

func NewKwitansiService(db *gorm.DB) *KwitansiService {
	return &KwitansiService{DB: db}
}

// GenerateKwitansiNumber creates a formatted kwitansi number: KWI/{ROMAN_MONTH}/{YEAR}/{SEQ}
func (s *KwitansiService) GenerateKwitansiNumber() (string, error) {
	now := time.Now()
	month := toRomanMonth(int(now.Month()))
	year := now.Year()

	var count int64
	s.DB.Model(&models.Kwitansi{}).
		Where("YEAR(created_at) = ?", year).
		Count(&count)

	seq := fmt.Sprintf("%03d", count+1)
	return fmt.Sprintf("KWI/%s/%d/%s", month, year, seq), nil
}

// CreateKwitansi creates a new draft kwitansi
func (s *KwitansiService) CreateKwitansi(kwitansi *models.Kwitansi) error {
	if kwitansi.KwitansiNumber == "" {
		number, err := s.GenerateKwitansiNumber()
		if err != nil {
			return err
		}
		kwitansi.KwitansiNumber = number
	}
	kwitansi.Status = models.KwitansiStatusDraft

	return s.DB.Create(kwitansi).Error
}

// GetKwitansis returns paginated list of kwitansis
func (s *KwitansiService) GetKwitansis(page, limit int, status string, search string) ([]models.Kwitansi, int64, error) {
	var kwitansis []models.Kwitansi
	var total int64

	query := s.DB.Model(&models.Kwitansi{})

	if status != "" {
		query = query.Where("status = ?", status)
	}
	if search != "" {
		query = query.Where("kwitansi_number LIKE ? OR invoice_number LIKE ? OR client_name LIKE ? OR project_name LIKE ?",
			"%"+search+"%", "%"+search+"%", "%"+search+"%", "%"+search+"%")
	}

	query.Count(&total)

	offset := (page - 1) * limit
	err := query.
		Order("created_at DESC").
		Offset(offset).Limit(limit).
		Find(&kwitansis).Error

	return kwitansis, total, err
}

// GetKwitansiByID returns a kwitansi
func (s *KwitansiService) GetKwitansiByID(id uint) (*models.Kwitansi, error) {
	var kwitansi models.Kwitansi
	err := s.DB.First(&kwitansi, id).Error
	if err != nil {
		return nil, err
	}
	return &kwitansi, nil
}

// UpdateKwitansi updates a draft kwitansi
func (s *KwitansiService) UpdateKwitansi(kwitansi *models.Kwitansi) error {
	if kwitansi.Status != models.KwitansiStatusDraft {
		return fmt.Errorf("only draft kwitansis can be edited")
	}
	return s.DB.Save(kwitansi).Error
}

// DeleteKwitansi soft-deletes a draft kwitansi
func (s *KwitansiService) DeleteKwitansi(id uint) error {
	var kwitansi models.Kwitansi
	if err := s.DB.First(&kwitansi, id).Error; err != nil {
		return err
	}
	if kwitansi.Status != models.KwitansiStatusDraft {
		return fmt.Errorf("only draft kwitansis can be deleted")
	}
	return s.DB.Delete(&kwitansi).Error
}

// transitionStatus safely changes the status of a kwitansi
func (s *KwitansiService) transitionStatus(id uint, from, to models.KwitansiStatus) error {
	var kwitansi models.Kwitansi
	if err := s.DB.First(&kwitansi, id).Error; err != nil {
		return err
	}
	if kwitansi.Status != from {
		return fmt.Errorf("kwitansi status goes from %s to %s, current is %s", from, to, kwitansi.Status)
	}

	kwitansi.Status = to
	return s.DB.Save(&kwitansi).Error
}

func (s *KwitansiService) SubmitForReview(id uint) error {
	return s.transitionStatus(id, models.KwitansiStatusDraft, models.KwitansiStatusReview)
}

func (s *KwitansiService) ApproveKwitansi(id uint) error {
	return s.transitionStatus(id, models.KwitansiStatusReview, models.KwitansiStatusApproved)
}

func (s *KwitansiService) RejectKwitansi(id uint) error {
	return s.transitionStatus(id, models.KwitansiStatusReview, models.KwitansiStatusDraft)
}

func (s *KwitansiService) MarkAsSent(id uint) error {
	return s.transitionStatus(id, models.KwitansiStatusApproved, models.KwitansiStatusSent)
}

func (s *KwitansiService) MarkAsPaid(id uint) error {
	return s.transitionStatus(id, models.KwitansiStatusSent, models.KwitansiStatusPaid)
}
