package telegram

type apiResponse[T any] struct {
	OK     bool   `json:"ok"`
	Result T      `json:"result"`
	Error  string `json:"description"`
}

type InlineKeyboardMarkup struct {
	InlineKeyboard [][]InlineKeyboardButton `json:"inline_keyboard"`
}

type InlineKeyboardButton struct {
	Text         string `json:"text"`
	CallbackData string `json:"callback_data,omitempty"`
	URL          string `json:"url,omitempty"`
}
