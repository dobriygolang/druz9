package guild

import v1 "api/pkg/api/guild/v1"

const (
	roleCreator = "creator"
	roleOfficer = "officer"
	roleMember  = "member"
)

func mapGuildMemberRole(role string) v1.GuildMemberRole {
	switch role {
	case roleCreator:
		return v1.GuildMemberRole_GUILD_MEMBER_ROLE_CREATOR
	case roleOfficer:
		return v1.GuildMemberRole_GUILD_MEMBER_ROLE_OFFICER
	case roleMember:
		return v1.GuildMemberRole_GUILD_MEMBER_ROLE_MEMBER
	default:
		return v1.GuildMemberRole_GUILD_MEMBER_ROLE_UNSPECIFIED
	}
}

func mapGuildActionType(actionType string) v1.GuildMemberActionType {
	switch actionType {
	case "daily":
		return v1.GuildMemberActionType_GUILD_MEMBER_ACTION_TYPE_DAILY
	case "duel":
		return v1.GuildMemberActionType_GUILD_MEMBER_ACTION_TYPE_DUEL
	case "mock":
		return v1.GuildMemberActionType_GUILD_MEMBER_ACTION_TYPE_MOCK
	default:
		return v1.GuildMemberActionType_GUILD_MEMBER_ACTION_TYPE_UNSPECIFIED
	}
}
