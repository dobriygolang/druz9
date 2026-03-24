# Use the official Go image as the base image
# Provides a minimal Alpine Linux environment with pre-installed Go
FROM golang:1.24.3-alpine

# Create a directory for our application
# This will be the working directory inside the container
RUN mkdir /friends

# Set the working directory for all subsequent commands
WORKDIR /friends

# Install runtime tools needed for healthchecks
RUN apk add --no-cache curl

# First copy go.mod and go.sum files
# This allows Docker to cache these layers and rebuild them
# only when dependencies change, which speeds up builds
COPY go.mod .
COPY go.sum .

# Download all dependencies
# This is done separately to utilize Docker layer caching
RUN go mod download

# Copy the rest of the application code
COPY . .

# Copy Docker-specific environment configuration
COPY cmd/config/.env.docker cmd/config/.env

# Expose the port that the application will run on
EXPOSE 8000

# Build the Go application from the cmd directory
# The -o flag specifies the output filename
RUN go build -o /friends/friends cmd/service/main.go
CMD ["./friends"]
