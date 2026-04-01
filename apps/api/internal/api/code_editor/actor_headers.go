package code_editor

import (
	"context"
	"encoding/base64"
	"strings"

	"github.com/go-kratos/kratos/v2/transport"
	kratoshttp "github.com/go-kratos/kratos/v2/transport/http"
)

const codeEditorGuestNameHeader = "X-Code-Editor-Guest-Name"

func codeEditorGuestName(ctx context.Context) string {
	tr, ok := transport.FromServerContext(ctx)
	if !ok {
		return ""
	}

	httpTransport, ok := tr.(*kratoshttp.Transport)
	if !ok || httpTransport.Request() == nil {
		return ""
	}

	encoded := strings.TrimSpace(httpTransport.Request().Header.Get(codeEditorGuestNameHeader))
	if encoded == "" {
		return ""
	}

	decoded, err := base64.StdEncoding.DecodeString(encoded)
	if err != nil {
		return encoded
	}
	return string(decoded)
}
