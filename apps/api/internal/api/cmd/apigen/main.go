package main

import (
	"bufio"
	"bytes"
	"flag"
	"fmt"
	"go/format"
	"os"
	"path/filepath"
	"regexp"
	"strings"
)

var (
	servicePattern = regexp.MustCompile(`^service\s+([A-Za-z0-9_]+)\s*\{`)
	rpcPattern     = regexp.MustCompile(`^rpc\s+([A-Za-z0-9_]+)\s*\(\s*([A-Za-z0-9_.]+)\s*\)\s+returns\s+\(\s*([A-Za-z0-9_.]+)\s*\)`)
	handlerPattern = regexp.MustCompile(`func\s+\([A-Za-z_][A-Za-z0-9_]*\s+\*Implementation\)\s+([A-Za-z0-9_]+)\s*\(`)
)

type method struct {
	Name     string
	Request  string
	Response string
}

type service struct {
	Domain  string
	Name    string
	Methods []method
}

func main() {
	protoRoot := flag.String("proto-root", "api", "proto root directory")
	outputRoot := flag.String("output-root", "internal/api", "generated transport layer root")
	flag.Parse()

	services, err := discoverServices(*protoRoot)
	if err != nil {
		exitf("discover services: %v", err)
	}

	for _, svc := range services {
		if err := generateService(*outputRoot, svc); err != nil {
			exitf("generate %s: %v", svc.Name, err)
		}
	}
}

func discoverServices(root string) ([]service, error) {
	var services []service

	err := filepath.WalkDir(root, func(path string, d os.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if d.IsDir() {
			if path != root && strings.Contains(path, string(filepath.Separator)+"adapter"+string(filepath.Separator)) {
				return filepath.SkipDir
			}
			return nil
		}
		if filepath.Ext(path) != ".proto" || strings.Contains(path, string(filepath.Separator)+"adapter"+string(filepath.Separator)) {
			return nil
		}

		svc, ok, parseErr := parseProto(path)
		if parseErr != nil {
			return parseErr
		}
		if ok {
			services = append(services, svc...)
		}
		return nil
	})
	if err != nil {
		return nil, err
	}

	return services, nil
}

func parseProto(path string) ([]service, bool, error) {
	file, err := os.Open(path)
	if err != nil {
		return nil, false, err
	}
	defer file.Close()

	domain := filepath.Base(filepath.Dir(filepath.Dir(path)))
	scanner := bufio.NewScanner(file)

	var services []service
	var current *service
	serviceDepth := 0

	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "//") {
			continue
		}

		if matches := servicePattern.FindStringSubmatch(line); len(matches) == 2 {
			services = append(services, service{
				Domain: domain,
				Name:   matches[1],
			})
			current = &services[len(services)-1]
			serviceDepth = 1
			continue
		}

		if current == nil {
			continue
		}

		matches := rpcPattern.FindStringSubmatch(line)
		if len(matches) != 4 {
			serviceDepth += strings.Count(line, "{")
			serviceDepth -= strings.Count(line, "}")
			if serviceDepth <= 0 {
				current = nil
				serviceDepth = 0
			}
			continue
		}

		current.Methods = append(current.Methods, method{
			Name:     matches[1],
			Request:  trimProtoType(matches[2]),
			Response: trimProtoType(matches[3]),
		})

		serviceDepth += strings.Count(line, "{")
		serviceDepth -= strings.Count(line, "}")
		if serviceDepth <= 0 {
			current = nil
			serviceDepth = 0
		}
	}

	if err := scanner.Err(); err != nil {
		return nil, false, err
	}

	return services, len(services) > 0, nil
}

func generateService(outputRoot string, svc service) error {
	dir := filepath.Join(outputRoot, svc.Domain)
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return err
	}

	serviceFile := filepath.Join(dir, "service.go")
	if _, err := os.Stat(serviceFile); os.IsNotExist(err) {
		content, renderErr := renderServiceFile(svc)
		if renderErr != nil {
			return renderErr
		}
		if writeErr := os.WriteFile(serviceFile, content, 0o600); writeErr != nil {
			return writeErr
		}
	}

	existingMethods, err := discoverExistingMethods(dir)
	if err != nil {
		return err
	}

	for _, m := range svc.Methods {
		if _, ok := existingMethods[m.Name]; ok {
			continue
		}
		methodFile := filepath.Join(dir, toSnakeCase(m.Name)+".go")
		if _, err := os.Stat(methodFile); err == nil {
			continue
		}

		content, renderErr := renderMethodFile(svc, m)
		if renderErr != nil {
			return renderErr
		}
		if writeErr := os.WriteFile(methodFile, content, 0o600); writeErr != nil {
			return writeErr
		}
	}

	generatedFile := filepath.Join(dir, "zz_generated_methods.go")
	if err := os.Remove(generatedFile); err != nil && !os.IsNotExist(err) {
		return err
	}

	return nil
}

func discoverExistingMethods(dir string) (map[string]struct{}, error) {
	entries, err := os.ReadDir(dir)
	if err != nil {
		return nil, err
	}

	methods := make(map[string]struct{})
	for _, entry := range entries {
		if entry.IsDir() || filepath.Ext(entry.Name()) != ".go" || entry.Name() == "zz_generated_methods.go" {
			continue
		}

		content, err := os.ReadFile(filepath.Join(dir, entry.Name()))
		if err != nil {
			return nil, err
		}
		matches := handlerPattern.FindAllStringSubmatch(string(content), -1)
		for _, match := range matches {
			if len(match) == 2 {
				methods[match[1]] = struct{}{}
			}
		}
	}

	return methods, nil
}

func renderServiceFile(svc service) ([]byte, error) {
	var buf bytes.Buffer
	fmt.Fprintf(&buf, "package %s\n\n", svc.Domain)
	fmt.Fprintf(&buf, "import (\n")
	fmt.Fprintf(&buf, "\tv1 \"api/pkg/api/%s/v1\"\n", svc.Domain)
	fmt.Fprintf(&buf, "\t\"google.golang.org/grpc\"\n")
	fmt.Fprintf(&buf, ")\n\n")

	fmt.Fprintf(&buf, "type Service interface{}\n\n")
	fmt.Fprintf(&buf, "// Implementation of %s service.\n", svc.Domain)
	fmt.Fprintf(&buf, "type Implementation struct {\n")
	fmt.Fprintf(&buf, "\tv1.Unimplemented%sServer\n", svc.Name)
	fmt.Fprintf(&buf, "\tservice Service\n")
	fmt.Fprintf(&buf, "}\n\n")
	fmt.Fprintf(&buf, "// New returns new instance of Implementation.\n")
	fmt.Fprintf(&buf, "func New(service Service) *Implementation {\n")
	fmt.Fprintf(&buf, "\treturn &Implementation{service: service}\n")
	fmt.Fprintf(&buf, "}\n\n")
	fmt.Fprintf(&buf, "// GetDescription returns grpc service description.\n")
	fmt.Fprintf(&buf, "func (i *Implementation) GetDescription() grpc.ServiceDesc {\n")
	fmt.Fprintf(&buf, "\treturn v1.%s_ServiceDesc\n", svc.Name)
	fmt.Fprintf(&buf, "}\n")
	return format.Source(buf.Bytes())
}

func renderMethodFile(svc service, m method) ([]byte, error) {
	var buf bytes.Buffer
	fmt.Fprintf(&buf, "package %s\n\n", svc.Domain)
	fmt.Fprintf(&buf, "import (\n")
	fmt.Fprintf(&buf, "\t\"context\"\n\n")
	fmt.Fprintf(&buf, "\tv1 \"api/pkg/api/%s/v1\"\n", svc.Domain)
	fmt.Fprintf(&buf, ")\n\n")
	fmt.Fprintf(&buf, "// %s stub. Please implement it.\n", m.Name)
	fmt.Fprintf(&buf, "func (i *Implementation) %s(ctx context.Context, req *v1.%s) (*v1.%s, error) {\n", m.Name, m.Request, m.Response)
	fmt.Fprintf(&buf, "\t_ = ctx\n")
	fmt.Fprintf(&buf, "\t_ = req\n")
	fmt.Fprintf(&buf, "\tpanic(\"TODO: implement %s\")\n", m.Name)
	fmt.Fprintf(&buf, "}\n")
	return format.Source(buf.Bytes())
}

func toSnakeCase(value string) string {
	var out []rune
	for i, r := range value {
		if i > 0 && r >= 'A' && r <= 'Z' {
			prev := rune(value[i-1])
			if (prev >= 'a' && prev <= 'z') || (prev >= '0' && prev <= '9') {
				out = append(out, '_')
			}
		}
		if r >= 'A' && r <= 'Z' {
			r = r - 'A' + 'a'
		}
		out = append(out, r)
	}
	return string(out)
}

func trimProtoType(value string) string {
	value = strings.TrimSpace(value)
	if idx := strings.LastIndex(value, "."); idx >= 0 {
		return value[idx+1:]
	}
	return value
}

func exitf(format string, args ...any) {
	_, _ = fmt.Fprintf(os.Stderr, format+"\n", args...)
	os.Exit(1)
}
