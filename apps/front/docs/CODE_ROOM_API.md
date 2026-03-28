# CodeRoom API Contract

## Overview
Онлайн редактор кода Go с realtime синхронизацией. Два режима: "для всех" и "дуэль".

---

## Режимы комнаты
- `standard` — общая комната для всех
- `duel` — дуэль между двумя игроками

---

## HTTP API

### 1. Создать комнату
```
POST /api/code-rooms
```

**Request:**
```typescript
interface CreateCodeRoomRequest {
  title: string;
  mode: 'standard' | 'duel';
  language: 'go'; // для будущего расширения
}
```

**Response (201):**
```typescript
interface CodeRoom {
  id: string;
  title: string;
  mode: 'standard' | 'duel';
  language: 'go';
  inviteCode: string; // код для приглашения
  creatorId: string;
  participants: Participant[];
  code: string; // текущий код
  createdAt: string;
  status: 'waiting' | 'active' | 'finished';
}
```

### 2. Получить список комнат
```
GET /api/code-rooms?mode=standard
```

**Response (200):**
```typescript
interface ListCodeRoomsResponse {
  rooms: CodeRoom[];
  totalCount: number;
}
```

### 3. Получить комнату по ID
```
GET /api/code-rooms/:roomId
```

### 4. Присоединиться к комнате (по inviteCode)
```
POST /api/code-rooms/join
```

**Request:**
```typescript
interface JoinCodeRoomRequest {
  inviteCode: string;
}
```

### 5. Присоединиться к дуэли
```
POST /api/code-rooms/:roomId/duel/join
```
Доступно только для mode=duel, максимум 2 участника.

### 6. Запустить код
```
POST /api/code-rooms/:roomId/run
```

**Request:**
```typescript
interface RunCodeRequest {
  code: string;
}
```

**Response:**
```typescript
interface RunCodeResponse {
  output: string;
  error?: string;
  exitCode: number;
  executionTimeMs: number;
}
```

---

## WebSocket API

### Подключение
```
ws://host/wapi/code-rooms/:roomId?token=<auth_token>
```

### Сообщения от клиента -> сервер

#### 1. Синхронизация кода (изменение)
```typescript
// клиент отправляет при изменении кода (debounced ~50ms)
{
  type: 'code_change';
  code: string;
  cursorPosition?: { line: number; column: number };
  participantId: string;
}
```

#### 2. Я готов (готов к синхронизации)
```typescript
{
  type: 'ready';
  participantId: string;
}
```

### Сообщения от сервера -> клиент

#### 1. Полное состояние комнаты (при подключении)
```typescript
{
  type: 'room_state';
  room: CodeRoom;
  participants: Participant[];
}
```

#### 2. Изменение кода от другого участника
```typescript
{
  type: 'code_update';
  code: string;
  changedBy: string; // participantId
  cursorPosition?: { line: number; column: number };
}
```

#### 3. Участник присоединился
```typescript
{
  type: 'participant_joined';
  participant: Participant;
}
```

#### 4. Участник покинул
```typescript
{
  type: 'participant_left';
  participantId: string;
}
```

#### 5. Результат выполнения кода
```typescript
{
  type: 'code_result';
  output: string;
  error?: string;
  exitCode: number;
  executionTimeMs: number;
  runBy: string; // participantId
}
```

#### 6. Ошибка
```typescript
{
  type: 'error';
  message: string;
  code?: string;
}
```

---

## Типы данных

```typescript
interface Participant {
  id: string;
  userId: string | null; // null для гостя
  displayName: string; // никнейм или "Гость"
  isGuest: boolean;
  role: 'creator' | 'participant' | 'observer';
  isReady: boolean;
  joinedAt: string;
  // для дуэли
  score?: number;
}

interface CodeRoom {
  id: string;
  title: string;
  mode: 'standard' | 'duel';
  language: 'go';
  inviteCode: string;
  creatorId: string;
  code: string;
  status: 'waiting' | 'active' | 'finished';
  maxParticipants: number; // standard: 10, duel: 2
  participants: Participant[];
  createdAt: string;
  updatedAt: string;
}
```

---

## Поведение

### Режим "для всех"
1. Создатель создаёт комнату, получает inviteCode
2. Приглашает по inviteCode
3. Все видят один код, могут редактировать
4. Любой может нажать "Запустить"
5. Результат показывается всем

### Режим "дуэль"
1. Создатель создаёт дуэль, получает inviteCode
2. Второй игрок присоединяется по inviteCode
3. Оба видят код, оба могут редактировать (кто последний — того и результат)
4. Первый, чей код пройдёт тест — побеждает
5. После завершения комната переходит в статус finished

### Гость
- Если приглашённый не авторизован в системе — он Гость
- Гость не имеет userId, только displayName = "Гость"
- Гость может только редактировать код и запускать его

### Realtime синхронизация
- WebSocket соединение
- При изменении кода — отправка code_change
- Сервер рассылает code_update всем участникам
- Debounce на клиенте ~50ms для избежания флуда
- При подключении — получение полного room_state

---

## Валидация
- title: 1-100 символов
- inviteCode: 6-12 символов, alphanumeric
- maxParticipants standard: 10
- maxParticipants duel: 2