package server

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"strings"

	profileerrors "api/internal/errors/profile"
	"api/internal/model"

	"github.com/google/uuid"
)

const adminUsersPrefix = "/api/admin/users/"

type adminUsersAuthorizer interface {
	AuthenticateByToken(context.Context, string) (*model.AuthState, error)
	CookieName() string
}

type adminUsersRepo interface {
	UpdateUserTrusted(ctx context.Context, userID uuid.UUID, isTrusted bool) error
}

type profileCacheInvalidator interface {
	InvalidateProfileCache(userID uuid.UUID)
}

func RegisterAdminUsersRoutes(
	srv interface{ HandlePrefix(prefix string, handler http.Handler) },
	repo adminUsersRepo,
	authorizer adminUsersAuthorizer,
	cacheInvalidator profileCacheInvalidator,
) {
	srv.HandlePrefix(adminUsersPrefix, adminUsersHandler(repo, authorizer, cacheInvalidator))
}

func adminUsersHandler(repo adminUsersRepo, authorizer adminUsersAuthorizer, cacheInvalidator profileCacheInvalidator) http.Handler {
	mux := http.NewServeMux()

	mux.HandleFunc(adminUsersPrefix, func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPatch {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}

		cookie, err := r.Cookie(authorizer.CookieName())
		if err != nil {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}

		authState, err := authorizer.AuthenticateByToken(r.Context(), cookie.Value)
		if err != nil || authState == nil || authState.User == nil {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}
		if !authState.User.IsAdmin {
			http.Error(w, "admin required", http.StatusForbidden)
			return
		}

		path := strings.TrimPrefix(r.URL.Path, adminUsersPrefix)
		if !strings.HasSuffix(path, "/trust") {
			http.Error(w, "not found", http.StatusNotFound)
			return
		}

		userIDRaw := strings.TrimSuffix(path, "/trust")
		userIDRaw = strings.TrimSuffix(userIDRaw, "/")

		userID, err := uuid.Parse(userIDRaw)
		if err != nil {
			http.Error(w, "bad user id", http.StatusBadRequest)
			return
		}

		var req struct {
			IsTrusted bool `json:"isTrusted"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "bad request", http.StatusBadRequest)
			return
		}

		if err := repo.UpdateUserTrusted(r.Context(), userID, req.IsTrusted); err != nil {
			if errors.Is(err, profileerrors.ErrUserNotFound) {
				http.Error(w, "user not found", http.StatusNotFound)
				return
			}
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		// Invalidate profile cache so updated trusted status is reflected immediately
		cacheInvalidator.InvalidateProfileCache(userID)

		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]any{
			"status":    "ok",
			"isTrusted": req.IsTrusted,
		})
	})

	return mux
}