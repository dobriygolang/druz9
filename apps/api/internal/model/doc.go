// Package model contains SHARED types used across multiple domains.
//
// Правила пакета:
//  1. Новые типы, принадлежащие одному домену, создаются в internal/domain/<name>/model.go,
//     а НЕ здесь.
//  2. Здесь живут только типы, которые действительно используются из нескольких доменов
//     или из shared-инфраструктуры (middleware, server, realtime, cmd).
//  3. Если новый тип нужен только одному домену — он ДОЛЖЕН создаваться в папке этого домена,
//     иначе линтер depguard не поможет контрибьюторам держать границы.
//
// Примеры корректных обитателей этого пакета:
//   - User, Session, AuthState — используются аутентификацией всеми доменами.
//   - UploadObjectRequest, PresignOptions — shared-инфра S3.
//   - ProfileProgress, ProfileCompetency — используются profile и interviewprep.
//
// Примеры типов, которые ДОЛЖНЫ жить в своём домене:
//   - ArenaPlayer → internal/domain/arena/
//   - Podcast → internal/domain/podcast/
//   - Readiness → internal/domain/profile/ (уже переехал)
//
// Исторически в этом пакете много файлов, собранных ещё до доменного разделения
// (arena.go, code_editor.go и т.д.). Они постепенно уезжают к себе — см. CONTRIBUTING.md.
package model
