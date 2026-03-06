package handlers

import (
	"bytes"
	"encoding/json"
	"io"
	"log"
	"net/http"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"github.com/ksm/go-invoice/internal/config"
	"github.com/ksm/go-invoice/internal/middleware"
	"github.com/ksm/go-invoice/internal/models"
	"github.com/ksm/go-invoice/internal/services"
)

type AuthHandler struct {
	Cfg         *config.Config
	UserService *services.UserService
}

func NewAuthHandler(cfg *config.Config, userService *services.UserService) *AuthHandler {
	return &AuthHandler{Cfg: cfg, UserService: userService}
}

// ---- Request / Response DTOs ----

type LoginRequest struct {
	Email      string `json:"email"`
	Password   string `json:"password"`
	RememberMe bool   `json:"remember_me"`
}

type LoginResponse struct {
	AccessToken string                `json:"access_token"`
	User        middleware.UserClaims `json:"user"`
	ExpiresIn   int64                 `json:"expires_in"` // seconds
}

// costControlLoginResponse is the shape returned by Cost Control API /api/auth/login
type costControlLoginResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
	Data    struct {
		AccessToken  string `json:"access_token"`
		RefreshToken string `json:"refresh_token"`
	} `json:"data"`
}

type costControlMeResponse struct {
	Success bool `json:"success"`
	Data    struct {
		ID    string `json:"id"`
		Name  string `json:"name"`
		Email string `json:"email"`
		Role  string `json:"role"`
	} `json:"data"`
}

// devUsers are dummy accounts available when DEV_MODE=true
var devUsers = map[string]middleware.UserClaims{
	"admin@ksm.co.id":   {UserID: 1, Name: "Admin KSM", Email: "admin@ksm.co.id", Role: "admin"},
	"manager@ksm.co.id": {UserID: 2, Name: "Manager KSM", Email: "manager@ksm.co.id", Role: "manager"},
	"user@ksm.co.id":    {UserID: 3, Name: "Staff KSM", Email: "user@ksm.co.id", Role: "user"},
}

// Login POST /api/auth/login
func (h *AuthHandler) Login(c *fiber.Ctx) error {
	var req LoginRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"success": false,
			"message": "Invalid request body",
		})
	}

	if req.Email == "" || req.Password == "" {
		return c.Status(400).JSON(fiber.Map{
			"success": false,
			"message": "Email and password are required",
		})
	}

	var user *middleware.UserClaims

	// 1) Try local database users first
	if h.UserService != nil {
		if localUser, err := h.UserService.GetUserByEmail(req.Email); err == nil && localUser.Active {
			if localUser.CheckPassword(req.Password) {
				log.Printf("✅ Local user login: %s (%s)", localUser.Name, localUser.Role)
				user = &middleware.UserClaims{
					UserID: localUser.ID,
					Name:   localUser.Name,
					Email:  localUser.Email,
					Role:   localUser.Role,
				}
			}
		}
	}

	// 2) Try Cost Control API (SSO)
	var ssoErr error
	if user == nil {
		var ccToken string
		ccToken, ssoErr = h.loginViaCostControl(req.Email, req.Password)
		if ssoErr == nil {
			if extUser, err := h.fetchUserProfile(ccToken); err == nil {
				// SSO successful. Map to local user.
				if h.UserService != nil {
					localUser, err := h.UserService.GetUserByEmail(extUser.Data.Email)
					if err != nil {
						// User doesn't exist locally, create them
						newUser := &models.User{
							Name:   extUser.Data.Name,
							Email:  extUser.Data.Email,
							Role:   extUser.Data.Role,
							Active: true,
						}
						newUser.HashPassword("sso-managed") // Dummy password since auth is via SSO
						h.UserService.DB.Create(newUser)
						localUser = newUser
					} else {
						// Update role/name if changed in SSO
						localUser.Name = extUser.Data.Name
						localUser.Role = extUser.Data.Role
						h.UserService.DB.Save(localUser)
					}

					log.Printf("✅ SSO login successful, mapped to local user: %s (ID: %d)", localUser.Name, localUser.ID)
					user = &middleware.UserClaims{
						UserID: localUser.ID,
						Name:   localUser.Name,
						Email:  localUser.Email,
						Role:   localUser.Role,
					}
				}
			} else {
				ssoErr = err
			}
		}
	}

	// 3) Fallback to dev mode
	if user == nil && h.Cfg.DevMode {
		if devUser, ok := devUsers[req.Email]; ok && req.Password == "password" {
			log.Printf("⚠️  DEV MODE: Login as %s (%s)", devUser.Name, devUser.Role)
			user = &devUser
			ssoErr = nil // Clear sso error if dev mode login succeeds
		}
	}

	if user == nil {
		log.Printf("⚠️ Login failed for %s. SSO Error: %v", req.Email, ssoErr)

		// Determine the error message to send to the frontend
		errMsg := "Email atau password salah"

		// If SSO failed due to connection error (not a 401 unauthorized from CC)
		if ssoErr != nil {
			if fiberErr, ok := ssoErr.(*fiber.Error); ok {
				if fiberErr.Code != 401 {
					errMsg = fiberErr.Message
				} else {
					// It's a 401 from Cost Control, meaning wrong credentials, keep default message
				}
			} else {
				// It's a standard Go error (likely network/connection related)
				errMsg = "Sistem otentikasi Cost Control sedang offline atau tidak dapat dijangkau"
			}
		}

		return c.Status(401).JSON(fiber.Map{
			"success": false,
			"message": errMsg,
		})
	}

	if user == nil {
		log.Printf("⚠️ Login failed for %s", req.Email)
		return c.Status(401).JSON(fiber.Map{
			"success": false,
			"message": "Email atau password salah",
		})
	}

	// Generate our own JWT (7 days if remember_me, else 24h)
	expiry := 24 * time.Hour
	if req.RememberMe {
		expiry = 7 * 24 * time.Hour
	}
	token, err := h.generateJWT(user, expiry)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"success": false,
			"message": "Failed to generate token",
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data": LoginResponse{
			AccessToken: token,
			User:        *user,
			ExpiresIn:   int64(expiry.Seconds()),
		},
	})
}

func boolStr(b bool) string {
	if b {
		return "on"
	}
	return "off"
}

// GetMe GET /api/auth/me — returns current user from JWT (no external call needed)
func (h *AuthHandler) GetMe(c *fiber.Ctx) error {
	user := c.Locals("user").(*middleware.UserClaims)
	return c.JSON(fiber.Map{
		"success": true,
		"data":    user,
	})
}

// ---- Internal helpers ----

func (h *AuthHandler) loginViaCostControl(email, password string) (string, error) {
	body, _ := json.Marshal(map[string]string{
		"email":    email,
		"password": password,
	})

	req, err := http.NewRequest("POST", h.Cfg.CostControlAPIURL+"/api/auth/login", bytes.NewReader(body))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("ngrok-skip-browser-warning", "true") // Bypass ngrok warning

	resp, err := (&http.Client{}).Do(req)
	if err != nil {
		log.Printf("❌ Cost Control API POST error: %v", err)
		return "", err
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)
	log.Printf("🔍 Cost Control API POST Response: %s", string(respBody))

	var ccResp costControlLoginResponse
	if err := json.Unmarshal(respBody, &ccResp); err != nil {
		log.Printf("❌ Cost Control API JSON Unmarshal error: %v", err)
		return "", err
	}

	if !ccResp.Success || ccResp.Data.AccessToken == "" {
		msg := ccResp.Message
		if msg == "" {
			msg = "login failed"
		}
		log.Printf("❌ Cost Control API returned failure: %s", msg)
		return "", fiber.NewError(401, msg)
	}

	return ccResp.Data.AccessToken, nil
}

func (h *AuthHandler) fetchUserProfile(ccToken string) (*costControlMeResponse, error) {
	req, _ := http.NewRequest("GET", h.Cfg.CostControlAPIURL+"/api/auth/me", nil)
	req.Header.Set("Authorization", "Bearer "+ccToken)
	req.Header.Set("ngrok-skip-browser-warning", "true") // Bypass ngrok warning

	resp, err := (&http.Client{}).Do(req)
	if err != nil {
		log.Printf("❌ Cost Control API GET /me error: %v", err)
		return nil, err
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)
	log.Printf("🔍 Cost Control API GET /me Response: %s", string(respBody))

	var meResp costControlMeResponse
	if err := json.Unmarshal(respBody, &meResp); err != nil {
		log.Printf("❌ Cost Control API GET /me JSON Unmarshal error: %v", err)
		return nil, err
	}

	if !meResp.Success {
		log.Printf("❌ Cost Control API GET /me returned failure")
		return nil, fiber.NewError(401, "failed to get user profile")
	}

	return &meResp, nil
}

func (h *AuthHandler) generateJWT(user *middleware.UserClaims, expiry time.Duration) (string, error) {
	claims := jwt.MapClaims{
		"user_id": user.UserID,
		"name":    user.Name,
		"email":   user.Email,
		"role":    user.Role,
		"exp":     time.Now().Add(expiry).Unix(),
		"iat":     time.Now().Unix(),
		"iss":     "ksm-invoice-out",
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(h.Cfg.JWTSecret))
}
