FROM golang:1.25-alpine AS builder

WORKDIR /app

# Install dependencies for CGO if needed (e.g. SQLite), otherwise optional.
RUN apk add --no-cache gcc musl-dev

# Copy go mod and sum files
COPY go.mod go.sum ./

# Download all dependencies.
RUN go mod download

# Copy the source code
COPY . .

# Build the application
# CGO_ENABLED=0 creates a statically linked binary for smaller alpine image
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o main ./cmd/server/main.go

# Run stage
FROM alpine:latest

WORKDIR /app

# Install CA certificates for external API calls (e.g., to Cost Control)
RUN apk --no-cache add ca-certificates tzdata

# Copy the Pre-built binary file from the previous stage
COPY --from=builder /app/main .

# Create uploads directory just in case
RUN mkdir -p /app/uploads

# Expose port (must match SERVER_PORT in env)
EXPOSE 8081

# Command to run the executable
CMD ["./main"]
