package s3

import (
	"bytes"
	"context"
	"crypto/tls"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"path"
	"strings"
	"time"

	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"

	"api/internal/config"
	"api/internal/model"
)

var (
	errConfigRequired      = errors.New("s3 config is required")
	errEndpointRequired    = errors.New("s3 endpoint is required")
	errObjectKeyRequired   = errors.New("object key is required")
	errPublicEndpointInvalid = errors.New("S3_PUBLIC_ENDPOINT must include scheme and host")
)

type Service struct {
	client         *minio.Client
	presignClient  *minio.Client
	publicEndpoint *url.URL
	bucket         string
}

func New(cfg *config.S3) (*Service, error) {
	if cfg == nil {
		return nil, fmt.Errorf("%w", errConfigRequired)
	}

	endpoint := strings.TrimSpace(cfg.Endpoint)
	if endpoint == "" {
		return nil, fmt.Errorf("%w", errEndpointRequired)
	}

	publicEndpoint, err := parsePublicEndpoint(cfg.PublicEndpoint)
	if err != nil {
		return nil, err
	}

	endpoint = strings.TrimPrefix(endpoint, "http://")
	endpoint = strings.TrimPrefix(endpoint, "https://")

	clientOpts := &minio.Options{
		Creds:  credentials.NewStaticV4(cfg.AccessKey, cfg.SecretKey, ""),
		Secure: strings.HasPrefix(strings.TrimSpace(cfg.Endpoint), "https://"),
	}
	if cfg.SkipVerify {
		clientOpts.Transport = &http.Transport{
			TLSClientConfig: &tls.Config{InsecureSkipVerify: true}, //nolint:gosec
		}
	}
	client, err := minio.New(endpoint, clientOpts)
	if err != nil {
		return nil, fmt.Errorf("create minio client: %w", err)
	}

	var presignClient *minio.Client
	if publicEndpoint != nil && (publicEndpoint.Path == "" || publicEndpoint.Path == "/") {
		presignOpts := &minio.Options{
			Creds:  credentials.NewStaticV4(cfg.AccessKey, cfg.SecretKey, ""),
			Secure: publicEndpoint.Scheme == "https",
		}
		if cfg.SkipVerify {
			presignOpts.Transport = &http.Transport{
				TLSClientConfig: &tls.Config{InsecureSkipVerify: true}, //nolint:gosec
			}
		}
		presignClient, err = minio.New(publicEndpoint.Host, presignOpts)
		if err != nil {
			return nil, fmt.Errorf("create public presign client: %w", err)
		}
	}

	return &Service{
		client:         client,
		presignClient:  presignClient,
		publicEndpoint: publicEndpoint,
		bucket:         cfg.Bucket,
	}, nil
}

func (s *Service) EnsureBucket(ctx context.Context) error {
	exists, err := s.client.BucketExists(ctx, s.bucket)
	if err != nil {
		return fmt.Errorf("check bucket: %w", err)
	}
	if exists {
		return nil
	}
	if err := s.client.MakeBucket(ctx, s.bucket, minio.MakeBucketOptions{}); err != nil {
		return fmt.Errorf("make bucket: %w", err)
	}
	return nil
}

func (s *Service) UploadObject(
	ctx context.Context,
	input model.UploadObjectRequest,
) error {
	key := normalizeObjectKey(input.Key)
	if key == "" {
		return fmt.Errorf("%w", errObjectKeyRequired)
	}

	contentType := strings.TrimSpace(input.ContentType)
	if contentType == "" {
		contentType = "application/octet-stream"
	}

	_, err := s.client.PutObject(
		ctx,
		s.bucket,
		key,
		bytes.NewReader(input.Content),
		int64(len(input.Content)),
		minio.PutObjectOptions{ContentType: contentType},
	)
	if err != nil {
		return fmt.Errorf("upload object: %w", err)
	}
	return nil
}

func (s *Service) DeleteObject(ctx context.Context, objectKey string) error {
	key := normalizeObjectKey(objectKey)
	if key == "" {
		return nil
	}
	if err := s.client.RemoveObject(
		ctx,
		s.bucket,
		key,
		minio.RemoveObjectOptions{},
	); err != nil {
		return fmt.Errorf("delete object: %w", err)
	}
	return nil
}

func (s *Service) PresignGetObject(
	ctx context.Context,
	objectKey string,
	options model.PresignOptions,
) (string, error) {
	key := normalizeObjectKey(objectKey)
	if key == "" {
		return "", fmt.Errorf("%w", errObjectKeyRequired)
	}

	expiry := options.Expiry
	if expiry <= 0 {
		expiry = time.Hour
	}

	client := s.client
	if s.presignClient != nil {
		client = s.presignClient
	}

	u, err := client.PresignedGetObject(ctx, s.bucket, key, expiry, nil)
	if err != nil {
		return "", fmt.Errorf("presign object: %w", err)
	}
	if s.presignClient == nil && s.publicEndpoint != nil {
		u = replacePresignedEndpoint(u, s.publicEndpoint)
	}
	return u.String(), nil
}

func (s *Service) PresignPutObject(
	ctx context.Context,
	objectKey string,
	options model.PresignOptions,
) (string, error) {
	key := normalizeObjectKey(objectKey)
	if key == "" {
		return "", fmt.Errorf("%w", errObjectKeyRequired)
	}

	expiry := options.Expiry
	if expiry <= 0 {
		expiry = 15 * time.Minute
	}

	client := s.client
	if s.presignClient != nil {
		client = s.presignClient
	}

	u, err := client.PresignedPutObject(ctx, s.bucket, key, expiry)
	if err != nil {
		return "", fmt.Errorf("presign put object: %w", err)
	}
	if s.presignClient == nil && s.publicEndpoint != nil {
		u = replacePresignedEndpoint(u, s.publicEndpoint)
	}
	return u.String(), nil
}

func normalizeObjectKey(key string) string {
	key = strings.TrimSpace(key)
	key = strings.TrimPrefix(key, "/")
	key = path.Clean(key)
	if key == "." {
		return ""
	}
	return key
}

func parsePublicEndpoint(raw string) (*url.URL, error) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return nil, nil
	}
	u, err := url.Parse(raw)
	if err != nil {
		return nil, fmt.Errorf("parse S3_PUBLIC_ENDPOINT: %w", err)
	}
	if u.Scheme == "" || u.Host == "" {
		return nil, fmt.Errorf("%w", errPublicEndpointInvalid)
	}
	return u, nil
}

func replacePresignedEndpoint(u, publicEndpoint *url.URL) *url.URL {
	if u == nil || publicEndpoint == nil {
		return u
	}
	copyURL := *u
	copyURL.Scheme = publicEndpoint.Scheme
	copyURL.Host = publicEndpoint.Host
	if publicEndpoint.Path != "" && publicEndpoint.Path != "/" {
		basePath := strings.TrimSuffix(publicEndpoint.Path, "/")
		copyURL.Path = basePath + copyURL.Path
	}
	return &copyURL
}
