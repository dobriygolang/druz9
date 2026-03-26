package geo

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"api/internal/config"
	geoerrors "api/internal/errors/geo"
	"api/internal/model"
	"api/internal/storage/postgres"

	"github.com/go-kratos/kratos/v2/log"
)

const defaultGeocoderURL = "https://nominatim.openstreetmap.org/search"

type Client struct {
	data       *postgres.Store
	baseURL    string
	userAgent  string
	language   string
	httpClient *http.Client
	log        *log.Helper
}

func NewClient(cfg *config.Bootstrap, dataLayer *postgres.Store, logger log.Logger) *Client {
	baseURL := defaultGeocoderURL
	userAgent := "druz9-api/1.0"
	language := "ru,en"

	if cfg != nil && cfg.External != nil && cfg.External.Geocoder != nil {
		if cfg.External.Geocoder.BaseURL != "" {
			baseURL = cfg.External.Geocoder.BaseURL
		}
		if cfg.External.Geocoder.UserAgent != "" {
			userAgent = cfg.External.Geocoder.UserAgent
		}
		if cfg.External.Geocoder.Language != "" {
			language = cfg.External.Geocoder.Language
		}
	}

	return &Client{
		data:      dataLayer,
		baseURL:   baseURL,
		userAgent: userAgent,
		language:  language,
		httpClient: &http.Client{
			Timeout: 5 * time.Second,
		},
		log: log.NewHelper(logger),
	}
}

func (c *Client) Resolve(ctx context.Context, query string, limit int) ([]*model.GeoCandidate, error) {
	if limit <= 0 {
		limit = 5
	}

	reqURL, err := url.Parse(c.baseURL)
	if err != nil {
		return nil, fmt.Errorf("parse geocoder base url: %w", err)
	}

	params := reqURL.Query()
	params.Set("q", query)
	params.Set("format", "jsonv2")
	params.Set("addressdetails", "1")
	params.Set("limit", strconv.Itoa(limit))
	reqURL.RawQuery = params.Encode()

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, reqURL.String(), nil)
	if err != nil {
		return nil, fmt.Errorf("build geocoder request: %w", err)
	}
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Accept-Language", c.language)
	req.Header.Set("User-Agent", c.userAgent)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("%w: %v", geoerrors.ErrResolve, err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("%w: geocoder returned status %d", geoerrors.ErrResolve, resp.StatusCode)
	}

	var payload []nominatimPlace
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		return nil, fmt.Errorf("decode geocoder response: %w", err)
	}

	candidates := make([]*model.GeoCandidate, 0, len(payload))
	for _, place := range payload {
		lat, err := strconv.ParseFloat(place.Lat, 64)
		if err != nil {
			continue
		}
		lng, err := strconv.ParseFloat(place.Lon, 64)
		if err != nil {
			continue
		}

		city := firstNonEmpty(
			place.Address.City,
			place.Address.Town,
			place.Address.Village,
			place.Address.Municipality,
			place.Address.County,
			place.Address.State,
		)
		region := buildRegionLabel(city, place.Address.State, place.Address.Country)
		if region == "" {
			region = place.DisplayName
		}

		candidates = append(candidates, &model.GeoCandidate{
			Region:      region,
			Country:     place.Address.Country,
			City:        city,
			Latitude:    lat,
			Longitude:   lng,
			DisplayName: place.DisplayName,
		})
	}

	return candidates, nil
}

type nominatimPlace struct {
	Lat         string           `json:"lat"`
	Lon         string           `json:"lon"`
	DisplayName string           `json:"display_name"`
	Address     nominatimAddress `json:"address"`
}

type nominatimAddress struct {
	City         string `json:"city"`
	Town         string `json:"town"`
	Village      string `json:"village"`
	Municipality string `json:"municipality"`
	County       string `json:"county"`
	State        string `json:"state"`
	Country      string `json:"country"`
}

func buildRegionLabel(city, state, country string) string {
	parts := make([]string, 0, 3)
	for _, part := range []string{city, state, country} {
		part = strings.TrimSpace(part)
		if part == "" {
			continue
		}
		if len(parts) > 0 && parts[len(parts)-1] == part {
			continue
		}
		parts = append(parts, part)
	}
	return strings.Join(parts, ", ")
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		value = strings.TrimSpace(value)
		if value != "" {
			return value
		}
	}
	return ""
}
