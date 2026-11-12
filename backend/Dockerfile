FROM golang:1.24-alpine AS builder
WORKDIR /src
RUN apk add --no-cache ca-certificates git
COPY go.mod go.sum* ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags='-s -w' -o /out/burilka-api ./cmd/api && \
    CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags='-s -w' -o /out/burilka-worker ./cmd/worker

FROM alpine:3.21
RUN apk add --no-cache ca-certificates tzdata && addgroup -S app && adduser -S -G app app
WORKDIR /app
COPY --from=builder /out/burilka-api /app/burilka-api
COPY --from=builder /out/burilka-worker /app/burilka-worker
COPY migrations /app/migrations
USER app
EXPOSE 8080
ENTRYPOINT ["/app/burilka-api"]
CMD ["serve"]