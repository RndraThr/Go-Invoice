package services

import (
	"errors"
	"strings"

	"github.com/ksm/go-invoice/internal/models"
	"gorm.io/gorm"
)

type ProjectService struct {
	DB *gorm.DB
}

func NewProjectService(db *gorm.DB) *ProjectService {
	return &ProjectService{DB: db}
}

func (s *ProjectService) CreateProject(project *models.Project) error {
	project.ID = strings.TrimSpace(project.ID)
	if project.ID == "" {
		return errors.New("project ID is required")
	}

	// Check if exists
	var existing models.Project
	if err := s.DB.Where("id = ?", project.ID).First(&existing).Error; err == nil {
		return errors.New("project with this ID already exists")
	}

	return s.DB.Create(project).Error
}

func (s *ProjectService) GetProjects(page, limit int, search string) ([]models.Project, int64, error) {
	var projects []models.Project
	var total int64

	query := s.DB.Model(&models.Project{})

	if search != "" {
		searchTerm := "%" + search + "%"
		query = query.Where("id LIKE ? OR company LIKE ? OR subject LIKE ? OR po_in_no LIKE ?", searchTerm, searchTerm, searchTerm, searchTerm)
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * limit
	if err := query.Order("created_at desc").Offset(offset).Limit(limit).Find(&projects).Error; err != nil {
		return nil, 0, err
	}

	return projects, total, nil
}

func (s *ProjectService) GetProjectByID(id string) (*models.Project, error) {
	var project models.Project
	if err := s.DB.Where("id = ?", id).First(&project).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("project not found")
		}
		return nil, err
	}
	return &project, nil
}

func (s *ProjectService) UpdateProject(id string, updates map[string]interface{}) error {
	var project models.Project
	if err := s.DB.Where("id = ?", id).First(&project).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("project not found")
		}
		return err
	}

	return s.DB.Model(&project).Updates(updates).Error
}

func (s *ProjectService) DeleteProject(id string) error {
	var project models.Project
	if err := s.DB.Where("id = ?", id).First(&project).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("project not found")
		}
		return err
	}

	// Option: Prevent deletion if invoices are attached
	// var invoiceCount int64
	// s.DB.Model(&models.Invoice{}).Where("project_id = ?", id).Count(&invoiceCount)
	// if invoiceCount > 0 {
	// 	return errors.New("cannot delete project because it has associated invoices")
	// }

	return s.DB.Delete(&project).Error
}
