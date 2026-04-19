package guild

// Role is a stringly-typed guild role as stored in guild_members.role.
// Valid values: "creator", "officer", "member". Anything else is treated as
// non-member (no permissions).
type Role string

const (
	RoleCreator Role = "creator"
	RoleOfficer Role = "officer"
	RoleMember  Role = "member"
)

// Action enumerates guild operations that need permission checks.
// Adding a new action: append a constant + add a row to the matrix in Can.
type Action string

const (
	ActionEditGuildSettings Action = "edit_guild_settings"
	ActionSetMemberRole     Action = "set_member_role"
	ActionEjectMember       Action = "eject_member"
	ActionEditGuildHall     Action = "edit_guild_hall"
	ActionSpendGuildBank    Action = "spend_guild_bank"
	ActionDonateToGuildBank Action = "donate_to_guild_bank"
	ActionCreateGuildEvent  Action = "create_guild_event"
)

// Can returns true if a member with the given role is allowed to perform the
// action. Unknown roles and unknown actions return false. The matrix is the
// single source of truth — handlers must call Can() instead of inlining
// role checks.
func Can(role Role, action Action) bool {
	switch action {
	case ActionEditGuildSettings,
		ActionEditGuildHall,
		ActionSpendGuildBank,
		ActionEjectMember,
		ActionCreateGuildEvent:
		return role == RoleCreator || role == RoleOfficer
	case ActionSetMemberRole:
		return role == RoleCreator
	case ActionDonateToGuildBank:
		return role == RoleCreator || role == RoleOfficer || role == RoleMember
	}
	return false
}
