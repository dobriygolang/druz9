package guild

import "testing"

func TestCan(t *testing.T) {
	cases := []struct {
		name   string
		role   Role
		action Action
		want   bool
	}{
		{"creator edits settings", RoleCreator, ActionEditGuildSettings, true},
		{"officer edits settings", RoleOfficer, ActionEditGuildSettings, true},
		{"member cannot edit settings", RoleMember, ActionEditGuildSettings, false},

		{"only creator sets roles", RoleCreator, ActionSetMemberRole, true},
		{"officer cannot set roles", RoleOfficer, ActionSetMemberRole, false},
		{"member cannot set roles", RoleMember, ActionSetMemberRole, false},

		{"creator edits hall", RoleCreator, ActionEditGuildHall, true},
		{"officer edits hall", RoleOfficer, ActionEditGuildHall, true},
		{"member cannot edit hall", RoleMember, ActionEditGuildHall, false},

		{"creator spends bank", RoleCreator, ActionSpendGuildBank, true},
		{"officer spends bank", RoleOfficer, ActionSpendGuildBank, true},
		{"member cannot spend bank", RoleMember, ActionSpendGuildBank, false},

		{"any member donates", RoleMember, ActionDonateToGuildBank, true},
		{"officer donates", RoleOfficer, ActionDonateToGuildBank, true},
		{"creator donates", RoleCreator, ActionDonateToGuildBank, true},

		{"unknown role denied", Role("stranger"), ActionEditGuildSettings, false},
		{"empty role denied", Role(""), ActionDonateToGuildBank, false},
		{"unknown action denied", RoleCreator, Action("unknown"), false},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if got := Can(tc.role, tc.action); got != tc.want {
				t.Fatalf("Can(%q, %q) = %v, want %v", tc.role, tc.action, got, tc.want)
			}
		})
	}
}
