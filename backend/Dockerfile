# Build stage
FROM golang:1.24.3-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN go build -o studybuddy ./cmd/studybuddy

# Runtime stage
FROM alpine:latest
RUN apk --no-cache add ca-certificates
WORKDIR /root/
COPY --from=builder /app/studybuddy .
COPY --from=builder /app/internal/db/*.sql ./internal/db/
RUN mkdir -p ./uploads
EXPOSE 8080
CMD ["./studybuddy"]