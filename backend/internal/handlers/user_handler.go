package handlers

import (
	"strconv"

	"github.com/gofiber/fiber/v2"
	"github.com/ksm/go-invoice/internal/services"
)

type UserHandler struct {
	Service *services.UserService
}

func NewUserHandler(service *services.UserService) *UserHandler {
	return &UserHandler{Service: service}
}

type CreateUserRequest struct {
	Name     string `json:"name"`
	Email    string `json:"email"`
	Password string `json:"password"`
	Role     string `json:"role"`
}

type UpdateUserRequest struct {
	Name     string `json:"name"`
	Email    string `json:"email"`
	Password string `json:"password"` // optional — only update if provided
	Role     string `json:"role"`
	Active   *bool  `json:"active"`
}

// ListUsers GET /api/users
func (h *UserHandler) ListUsers(c *fiber.Ctx) error {
	users, err := h.Service.ListUsers()
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Failed to fetch users"})
	}
	return c.JSON(fiber.Map{"success": true, "data": users})
}

// GetUser GET /api/users/:id
func (h *UserHandler) GetUser(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Invalid ID"})
	}
	user, err := h.Service.GetUserByID(uint(id))
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"success": false, "message": "User not found"})
	}
	return c.JSON(fiber.Map{"success": true, "data": user})
}
