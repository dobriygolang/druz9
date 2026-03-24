#!/bin/sh -e
CGO_ENABLED=0

# Запуск go-lint
lint(){
  echo "run linter"
  go mod vendor
  golangci-lint run -v
  rm -Rf vendor
}

fmt() {
  echo "run go fmt"
  go fmt ./...
}

vet() {
  echo "run go vet"
  go vet ./...
}

# Запуск unit-тестов
unit(){
  echo "run unit tests"
  go test ./...
}

unit_race() {
  echo "run unit tests with race test"
  go test -race ./...
}

# Запуск всех тестов
test(){
  fmt
  vet
  unit
  unit_race
  lint
}

# Подтянуть зависимости
deps(){
  go get ./...
}

# Собрать исполняемый файл
build(){
  deps
  go build -o friends ./cmd/service/main.go
}

# Собрать docker образ
build_docker() {
  build
  docker build -t "${REPO_NAME:-friends}:local" .
  rm -f ./friends
}

# Команды для миграций
migrate_create(){
  migrate create -ext sql -dir internal/migrations "$name"
}

migrate_up(){
  migrate -path internal/migrations -database "$DATABASE_URL" up
}

migrate_down(){
  migrate -path internal/migrations -database "$DATABASE_URL" down
}

migrate_status(){
  migrate -path internal/migrations -database "$DATABASE_URL" version
}

migrate_force(){
  migrate -path internal/migrations -database "$DATABASE_URL" force "$version"
}

# Добавьте сюда список команд
using(){
  echo "Укажите команду при запуске: ./run.sh [command]"
  echo "Список команд:"
  echo "  unit - запустить unit-тесты"
  echo "  unit_race - запуск unit тестов с проверкой на data-race"
  echo "  lint - запустить все линтеры"
  echo "  test - запустить все тесты"
  echo "  deps - подтянуть зависимости"
  echo "  build - собрать приложение"
  echo "  build_docker - собрать локальный docker образ"
  echo "  fmt - форматирование кода при помощи 'go fmt'"
  echo "  vet - проверка правильности форматирования кода"
  echo "  migrate_create - создать новую миграцию (используйте name=имя_миграции)"
  echo "  migrate_up - применить все миграции"
  echo "  migrate_down - откатить последнюю миграцию"
  echo "  migrate_status - показать статус миграций"
  echo "  migrate_force - принудительно установить версию миграции (используйте version=номер)"
}


command="$1"
if [ -z "$command" ]
then
 using
 exit 0;
else
 $command $@
fi
