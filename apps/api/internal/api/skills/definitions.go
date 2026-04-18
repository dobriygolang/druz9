package skills

// skillDef describes a single passive skill node in the skill tree.
type skillDef struct {
	ID          string
	Label       string
	Description string
	Branch      string
	Keystone    bool
	X           int32
	Y           int32
	// IDs of nodes that must be allocated before this one is reachable.
	Prereq []string
	Effect skillEffect
	// Gold cost to refund this node once allocated.
	RefundGold int32
}

type skillEffect struct {
	Type  string  // see SkillEffect.type in proto
	Value float64 // numeric magnitude
	Label string  // human-readable label
}

// Canvas is 1100×760. Center hub sits at (540, 400).
// Five branches radiate outward: NW=artisan, N=scholar, NE=warrior, SE=merchant, SW=monk.

var skillDefs = []skillDef{
	// ── Hub ──────────────────────────────────────────────────────────────────
	{
		ID: "artisan_core", Label: "Artisan\nCore", X: 540, Y: 400,
		Branch:      "hub",
		Description: "The origin of the Artisan's path. All branches stem from here.",
		Effect:      skillEffect{Type: "xp_multiplier", Value: 0.05, Label: "+5% all XP"},
		RefundGold:  0,
	},

	// ── Artisan branch (NW) ──────────────────────────────────────────────────
	{
		ID: "sharp_focus", Label: "Sharp\nFocus", X: 420, Y: 320,
		Branch:      "artisan",
		Prereq:      []string{"artisan_core"},
		Description: "Concentration sharpens each practice session.",
		Effect:      skillEffect{Type: "training_xp_multiplier", Value: 0.10, Label: "+10% training XP"},
		RefundGold:  50,
	},
	{
		ID: "deep_learner", Label: "Deep\nLearner", X: 310, Y: 255,
		Branch:      "artisan",
		Prereq:      []string{"sharp_focus"},
		Description: "Unlocks a second hint for free on every task.",
		Effect:      skillEffect{Type: "hint_count", Value: 1, Label: "+1 free hint"},
		RefundGold:  50,
	},
	{
		ID: "quick_study", Label: "Quick\nStudy", X: 215, Y: 195,
		Branch:      "artisan",
		Prereq:      []string{"deep_learner"},
		Description: "You absorb ideas faster, reducing early-warning timers.",
		Effect:      skillEffect{Type: "hint_timer_reduction_s", Value: 5, Label: "hint timer -5 s"},
		RefundGold:  50,
	},
	{
		ID: "knowledge_hoard", Label: "Knowledge\nHoard", X: 100, Y: 120,
		Branch: "artisan", Keystone: true,
		Prereq:      []string{"quick_study"},
		Description: "All experience gained is amplified by deep mastery of the craft.",
		Effect:      skillEffect{Type: "xp_multiplier", Value: 0.25, Label: "+25% all XP"},
		RefundGold:  150,
	},

	// ── Scholar branch (N) ───────────────────────────────────────────────────
	{
		ID: "studious", Label: "Studious", X: 540, Y: 295,
		Branch:      "scholar",
		Prereq:      []string{"artisan_core"},
		Description: "Interview prep sessions yield more experience.",
		Effect:      skillEffect{Type: "interview_xp_multiplier", Value: 0.20, Label: "+20% interview XP"},
		RefundGold:  50,
	},
	{
		ID: "mnemonics", Label: "Mnemonics", X: 540, Y: 210,
		Branch:      "scholar",
		Prereq:      []string{"studious"},
		Description: "Your editor remembers your preferred language between sessions.",
		Effect:      skillEffect{Type: "remember_language", Value: 1, Label: "persist editor language"},
		RefundGold:  50,
	},
	{
		ID: "reviewer", Label: "Reviewer", X: 540, Y: 140,
		Branch:      "scholar",
		Prereq:      []string{"mnemonics"},
		Description: "Grants one free AI code review per day.",
		Effect:      skillEffect{Type: "free_ai_review_daily", Value: 1, Label: "1 free AI review / day"},
		RefundGold:  50,
	},
	{
		ID: "sage", Label: "Sage", X: 540, Y: 55,
		Branch: "scholar", Keystone: true,
		Prereq:      []string{"reviewer"},
		Description: "Perfect submissions yield bonus XP scaled by task difficulty.",
		Effect:      skillEffect{Type: "perfect_submit_xp_bonus", Value: 1, Label: "XP × difficulty on perfect submit"},
		RefundGold:  150,
	},

	// ── Warrior branch (NE) ──────────────────────────────────────────────────
	{
		ID: "arena_veteran", Label: "Arena\nVeteran", X: 650, Y: 315,
		Branch:      "warrior",
		Prereq:      []string{"artisan_core"},
		Description: "Years in the arena grant extra seconds on every challenge.",
		Effect:      skillEffect{Type: "arena_time_bonus_pct", Value: 5, Label: "+5% arena time"},
		RefundGold:  50,
	},
	{
		ID: "iron_will", Label: "Iron Will", X: 740, Y: 245,
		Branch:      "warrior",
		Prereq:      []string{"arena_veteran"},
		Description: "Your first wrong answer in an arena match carries no penalty.",
		Effect:      skillEffect{Type: "arena_first_wa_no_penalty", Value: 1, Label: "1st WA no penalty"},
		RefundGold:  50,
	},
	{
		ID: "perfect_strike", Label: "Perfect\nStrike", X: 830, Y: 185,
		Branch:      "warrior",
		Prereq:      []string{"iron_will"},
		Description: "Solving a task on the first attempt grants a bonus XP reward.",
		Effect:      skillEffect{Type: "first_try_xp_bonus_pct", Value: 20, Label: "+20% XP on first try"},
		RefundGold:  50,
	},
	{
		ID: "gladiator", Label: "Gladiator", X: 960, Y: 110,
		Branch: "warrior", Keystone: true,
		Prereq:      []string{"perfect_strike"},
		Description: "Every arena victory yields half again as much gold.",
		Effect:      skillEffect{Type: "arena_gold_multiplier", Value: 0.50, Label: "+50% gold from arena wins"},
		RefundGold:  150,
	},

	// ── Merchant branch (SE) ─────────────────────────────────────────────────
	{
		ID: "treasure_hunter", Label: "Treasure\nHunter", X: 650, Y: 490,
		Branch:      "merchant",
		Prereq:      []string{"artisan_core"},
		Description: "A keen eye for value increases all gold income.",
		Effect:      skillEffect{Type: "gold_multiplier", Value: 0.15, Label: "+15% gold"},
		RefundGold:  50,
	},
	{
		ID: "hoarder", Label: "Hoarder", X: 745, Y: 565,
		Branch:      "merchant",
		Prereq:      []string{"treasure_hunter"},
		Description: "Your coffers grow larger to hold greater reserves.",
		Effect:      skillEffect{Type: "gold_cap_bonus", Value: 500, Label: "gold cap +500"},
		RefundGold:  50,
	},
	{
		ID: "appraiser", Label: "Appraiser", X: 835, Y: 620,
		Branch:      "merchant",
		Prereq:      []string{"hoarder"},
		Description: "You negotiate better prices in the shop.",
		Effect:      skillEffect{Type: "shop_discount_pct", Value: 10, Label: "-10% shop prices"},
		RefundGold:  50,
	},
	{
		ID: "midas_touch", Label: "Midas\nTouch", X: 960, Y: 690,
		Branch: "merchant", Keystone: true,
		Prereq:      []string{"appraiser"},
		Description: "Surplus experience beyond your current level is converted to gold.",
		Effect:      skillEffect{Type: "overflow_xp_to_gold", Value: 1, Label: "overflow XP → gold"},
		RefundGold:  150,
	},

	// ── Monk branch (SW) ─────────────────────────────────────────────────────
	{
		ID: "disciplined", Label: "Disciplined", X: 420, Y: 490,
		Branch:      "monk",
		Prereq:      []string{"artisan_core"},
		Description: "Discipline extends the grace period before your streak breaks.",
		Effect:      skillEffect{Type: "streak_grace_hours", Value: 12, Label: "streak grace +12 h"},
		RefundGold:  50,
	},
	{
		ID: "iron_streak", Label: "Iron\nStreak", X: 330, Y: 560,
		Branch:      "monk",
		Prereq:      []string{"disciplined"},
		Description: "A missed day only costs one streak point, never a full reset.",
		Effect:      skillEffect{Type: "streak_floor", Value: 1, Label: "streak -1 not 0 on miss"},
		RefundGold:  50,
	},
	{
		ID: "meditation", Label: "Meditation", X: 230, Y: 615,
		Branch:      "monk",
		Prereq:      []string{"iron_streak"},
		Description: "Daily contemplation amplifies the reward from daily challenges.",
		Effect:      skillEffect{Type: "daily_xp_multiplier", Value: 0.25, Label: "+25% daily challenge XP"},
		RefundGold:  50,
	},
	{
		ID: "ascetic", Label: "Ascetic", X: 100, Y: 695,
		Branch: "monk", Keystone: true,
		Prereq:      []string{"meditation"},
		Description: "A 7-day streak triples all XP gained until the streak breaks.",
		Effect:      skillEffect{Type: "streak7_xp_multiplier", Value: 2.0, Label: "3× XP during 7-day streak"},
		RefundGold:  150,
	},
}

// skillEdgeDefs encodes the traversal paths (prereq pairs → edges to draw).
var skillEdgeDefs = func() [][2]string {
	edges := make([][2]string, 0, 32)
	for _, def := range skillDefs {
		for _, prereq := range def.Prereq {
			edges = append(edges, [2]string{prereq, def.ID})
		}
	}
	return edges
}()

// findSkillDef returns a pointer into skillDefs by ID.
func findSkillDef(id string) *skillDef {
	for i := range skillDefs {
		if skillDefs[i].ID == id {
			return &skillDefs[i]
		}
	}
	return nil
}
