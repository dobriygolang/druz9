package training

import (
	"fmt"
	"strings"

	"api/internal/app/taskjudge"
	codeeditordomain "api/internal/domain/codeeditor"
	"api/internal/model"
	"api/internal/policy"
	v1 "api/pkg/api/training/v1"
)

type nodeDefinition struct {
	ID                string
	X                 int32
	Y                 int32
	Label             string
	Branch            string
	Keystone          bool
	InitiallyUnlocked bool
	Topics            []string
	Prereq            []string
	Unlocks           []string
	Title             string
	SpecialDesc       string
	Projects          int32
	Hours             string
	Rewards           []string
	Hints             []string
}

type edgeDefinition struct {
	From string
	To   string
}

type nodeProgress struct {
	Total  int32
	Solved int32
}

type branchPalette struct {
	Name  string
	Color string
}

var branchPalettes = map[string]branchPalette{
	"core":  {Name: "Core", Color: "var(--moss-1)"},
	"tree":  {Name: "Trees", Color: "var(--moss-2)"},
	"graph": {Name: "Graphs", Color: "var(--ember-1)"},
	"dp":    {Name: "DP", Color: "var(--parch-3)"},
	"meta":  {Name: "Systems", Color: "var(--ink-2)"},
}

var trainingNodes = []nodeDefinition{
	{ID: "arrays", X: 540, Y: 700, Label: "arrays\n& loops", Branch: "core", InitiallyUnlocked: true, Topics: []string{"array", "arrays", "loop", "loops"}, Unlocks: []string{"strings", "hashmap", "two-ptr"}, Title: "Core · Arrays & loops", Projects: 2, Hours: "4–6h", Hints: []string{"Start with straight iteration and indexing.", "Track state in a small fixed-size structure before adding extra abstractions."}},
	{ID: "strings", X: 420, Y: 640, Label: "strings", Branch: "core", Topics: []string{"string", "strings"}, Prereq: []string{"arrays"}, Unlocks: []string{"sorting", "two-ptr"}, Title: "Core · Strings", Projects: 2, Hours: "4–6h", Hints: []string{"Pay attention to rune vs byte boundaries.", "Look for prefix/suffix invariants before brute force."}},
	{ID: "hashmap", X: 660, Y: 640, Label: "hash\nmap", Branch: "core", Topics: []string{"hashmap", "hash_map", "map", "maps"}, Prereq: []string{"arrays"}, Unlocks: []string{"sliding"}, Title: "Core · Hash maps", Projects: 2, Hours: "4–6h", Hints: []string{"Reach for a map when direct indexing is unstable.", "Store only the minimum signal you need for the invariant."}},
	{ID: "sorting", X: 300, Y: 580, Label: "sorting", Branch: "core", Topics: []string{"sort", "sorting"}, Prereq: []string{"strings"}, Unlocks: []string{"tree-basics"}, Title: "Core · Sorting", Projects: 2, Hours: "4–6h", Hints: []string{"Sort first if it simplifies the invariant.", "After sorting, re-check whether two pointers collapse the search space."}},
	{ID: "two-ptr", X: 540, Y: 580, Label: "2-ptr", Branch: "core", Topics: []string{"two-ptr", "two_ptr", "two-pointers", "two_pointer"}, Prereq: []string{"arrays", "strings"}, Unlocks: []string{"sliding", "graph-basics"}, Title: "Core · Two pointers", Projects: 2, Hours: "4–6h", Hints: []string{"Move only one pointer per invariant break.", "Let the sorted order or window invariant justify each move."}},
	{ID: "sliding", X: 780, Y: 580, Label: "sliding\nwindow", Branch: "core", Topics: []string{"sliding", "sliding-window", "sliding_window"}, Prereq: []string{"hashmap", "two-ptr"}, Unlocks: []string{"dp-basics"}, Title: "Core · Sliding window", Projects: 2, Hours: "4–6h", Hints: []string{"Define the exact condition that makes the window valid.", "Only shrink once the window has already captured the target state."}},
	{ID: "tree-basics", X: 200, Y: 480, Label: "trees\nbasics", Branch: "tree", Topics: []string{"tree", "trees", "binary-tree", "binary_tree"}, Prereq: []string{"sorting"}, Unlocks: []string{"bst", "heap"}, Title: "Trees · Basics", Projects: 2, Hours: "4–6h", Hints: []string{"Choose DFS when the state is local to a path.", "Write the base case before thinking about the recursive step."}},
	{ID: "bst", X: 120, Y: 400, Label: "BST", Branch: "tree", Topics: []string{"bst", "binary-search-tree", "binary_search_tree"}, Prereq: []string{"tree-basics"}, Unlocks: []string{"segment", "tree-dp"}, Title: "Trees · Binary search trees", Projects: 2, Hours: "4–6h", Hints: []string{"Exploit ordering instead of scanning both branches.", "Write down the invariant for values allowed in each subtree."}},
	{ID: "heap", X: 240, Y: 380, Label: "heap", Branch: "tree", Topics: []string{"heap", "priority-queue", "priority_queue"}, Prereq: []string{"tree-basics"}, Unlocks: []string{"lca"}, Title: "Trees · Heap", Projects: 2, Hours: "4–6h", Hints: []string{"Use the heap to keep only the next best candidate.", "Push and pop around the same invariant, not around the whole dataset."}},
	{ID: "tree-dp", X: 160, Y: 290, Label: "tree\nDP", Branch: "tree", Topics: []string{"tree-dp", "tree_dp"}, Prereq: []string{"bst"}, Title: "Trees · Tree DP", Projects: 2, Hours: "5–7h", Hints: []string{"Ask what each recursive call should return to its parent.", "Bundle multiple return values if the parent needs more than one signal."}},
	{ID: "segment", X: 60, Y: 300, Label: "segment\ntree", Branch: "tree", Keystone: true, Topics: []string{"segment-tree", "segment_tree"}, Prereq: []string{"bst"}, Title: "Trees · Segment tree", Projects: 2, Hours: "5–7h", Hints: []string{"Think in ranges, not elements.", "Split only when the query range partially overlaps the node range."}},
	{ID: "lca", X: 280, Y: 260, Label: "LCA", Branch: "tree", Topics: []string{"lca", "lowest-common-ancestor", "lowest_common_ancestor"}, Prereq: []string{"heap"}, Title: "Trees · Lowest common ancestor", Projects: 2, Hours: "5–7h", Hints: []string{"Mark the first ancestor signal that sees both targets.", "Be explicit about the case where the current node is itself a target."}},
	{ID: "graph-basics", X: 460, Y: 480, Label: "graph\nbasics", Branch: "graph", Topics: []string{"graph", "graphs"}, Prereq: []string{"two-ptr"}, Unlocks: []string{"graph-bfs", "graph-dfs"}, Title: "Graphs · Basics", Projects: 2, Hours: "4–6h", Hints: []string{"Start by deciding the right graph representation.", "Reachability usually means adjacency list plus visited structure."}},
	{ID: "graph-bfs", X: 380, Y: 400, Label: "BFS", Branch: "graph", Topics: []string{"bfs", "graph-bfs", "graph_bfs"}, Prereq: []string{"graph-basics"}, Unlocks: []string{"dijkstra"}, Title: "Graphs · Breadth-first search", Projects: 2, Hours: "4–6h", Hints: []string{"Use BFS when distance in edges matters.", "Push to the queue exactly once per node."}},
	{ID: "graph-dfs", X: 540, Y: 400, Label: "DFS", Branch: "graph", Topics: []string{"dfs", "graph-dfs", "graph_dfs"}, Prereq: []string{"graph-basics"}, Unlocks: []string{"dijkstra", "union-find"}, Title: "Graphs · Depth-first search", SpecialDesc: "DFS, topological sort, cycle detection, connected components. Build speed and graph intuition before shortest paths.", Projects: 3, Hours: "6–8h", Rewards: []string{"+320 ✦", "+60 gold", "Graph Walker badge"}, Hints: []string{"Start with an adjacency list from the edge list.", "Each fresh DFS should consume exactly one connected component.", "Increment the answer when you launch DFS from an unvisited node."}},
	{ID: "dijkstra", X: 460, Y: 300, Label: "dijkstra", Branch: "graph", Topics: []string{"dijkstra", "shortest-path", "shortest_path"}, Prereq: []string{"graph-bfs", "graph-dfs"}, Unlocks: []string{"flow"}, Title: "Graphs · Dijkstra", Projects: 2, Hours: "5–7h", Hints: []string{"The heap stores the best known frontier state.", "Skip stale heap entries instead of updating in place."}},
	{ID: "flow", X: 540, Y: 200, Label: "max\nflow", Branch: "graph", Keystone: true, Topics: []string{"flow", "max-flow", "max_flow"}, Prereq: []string{"dijkstra"}, Unlocks: []string{"systems", "concurrency"}, Title: "Graphs · Max flow", Projects: 2, Hours: "6–8h", Hints: []string{"Residual capacity is the whole game.", "Augment until BFS can no longer find a path."}},
	{ID: "union-find", X: 620, Y: 320, Label: "union\nfind", Branch: "graph", Topics: []string{"union-find", "union_find", "dsu"}, Prereq: []string{"graph-dfs"}, Title: "Graphs · Union find", Projects: 2, Hours: "5–7h", Hints: []string{"Path compression and union by rank are the core optimizations.", "Model each merge as an edge that fuses components."}},
	{ID: "dp-basics", X: 740, Y: 480, Label: "DP\nbasics", Branch: "dp", Topics: []string{"dp", "dynamic-programming", "dynamic_programming"}, Prereq: []string{"sliding"}, Unlocks: []string{"knapsack", "dp-strings"}, Title: "DP · Basics", Projects: 2, Hours: "4–6h", Hints: []string{"Write the state definition before the transition.", "Memoized DFS and bottom-up DP are the same recurrence in different clothes."}},
	{ID: "knapsack", X: 860, Y: 420, Label: "knapsack", Branch: "dp", Topics: []string{"knapsack"}, Prereq: []string{"dp-basics"}, Unlocks: []string{"bitmask", "distributed"}, Title: "DP · Knapsack", Projects: 2, Hours: "5–7h", Hints: []string{"Capacity is the axis that usually drives the state.", "Think carefully about whether the item can be used once or many times."}},
	{ID: "dp-strings", X: 700, Y: 400, Label: "DP\nstrings", Branch: "dp", Topics: []string{"dp-strings", "dp_strings"}, Prereq: []string{"dp-basics"}, Unlocks: []string{"digit-dp"}, Title: "DP · Strings", Projects: 2, Hours: "5–7h", Hints: []string{"Index pairs are often the minimal sufficient state.", "If two prefixes matter, make them both explicit in the DP table."}},
	{ID: "bitmask", X: 960, Y: 360, Label: "bitmask\nDP", Branch: "dp", Keystone: true, Topics: []string{"bitmask", "bitmask-dp", "bitmask_dp"}, Prereq: []string{"knapsack"}, Title: "DP · Bitmask", Projects: 2, Hours: "6–8h", Hints: []string{"A mask is just a compressed subset state.", "Try transitions that add exactly one element to the mask."}},
	{ID: "digit-dp", X: 840, Y: 300, Label: "digit\nDP", Branch: "dp", Topics: []string{"digit-dp", "digit_dp"}, Prereq: []string{"dp-strings"}, Title: "DP · Digit DP", Projects: 2, Hours: "6–8h", Hints: []string{"The tight flag tells you whether you are still matching the prefix.", "Memoize only the state that matters after the tight branch splits."}},
	{ID: "systems", X: 540, Y: 90, Label: "systems\ndesign", Branch: "meta", Keystone: true, Topics: []string{"systems", "system-design", "system_design"}, Prereq: []string{"flow"}, Unlocks: []string{"concurrency", "distributed"}, Title: "Systems · Design", Projects: 2, Hours: "6–8h", Hints: []string{"State the bottleneck before picking an architecture.", "Start with read/write paths, then add scaling constraints."}},
	{ID: "concurrency", X: 400, Y: 140, Label: "concurr-\nency", Branch: "meta", Topics: []string{"concurrency", "parallelism"}, Prereq: []string{"flow", "systems"}, Title: "Systems · Concurrency", Projects: 2, Hours: "5–7h", Hints: []string{"Define ownership before introducing parallel work.", "Shared mutable state is the first thing to reduce."}},
	{ID: "distributed", X: 680, Y: 140, Label: "distri-\nbuted", Branch: "meta", Topics: []string{"distributed", "distributed-systems", "distributed_systems"}, Prereq: []string{"knapsack", "systems"}, Title: "Systems · Distributed systems", Projects: 2, Hours: "6–8h", Hints: []string{"Call out the consistency boundary explicitly.", "Failures and retries are part of the design, not an afterthought."}},
}

var trainingEdges = []edgeDefinition{
	{From: "arrays", To: "strings"}, {From: "arrays", To: "hashmap"}, {From: "arrays", To: "two-ptr"},
	{From: "strings", To: "sorting"}, {From: "strings", To: "two-ptr"},
	{From: "hashmap", To: "sliding"}, {From: "two-ptr", To: "sliding"},
	{From: "sorting", To: "tree-basics"}, {From: "tree-basics", To: "bst"}, {From: "tree-basics", To: "heap"},
	{From: "bst", To: "segment"}, {From: "bst", To: "tree-dp"}, {From: "heap", To: "lca"},
	{From: "two-ptr", To: "graph-basics"}, {From: "graph-basics", To: "graph-bfs"}, {From: "graph-basics", To: "graph-dfs"},
	{From: "graph-bfs", To: "dijkstra"}, {From: "graph-dfs", To: "dijkstra"}, {From: "graph-dfs", To: "union-find"},
	{From: "dijkstra", To: "flow"},
	{From: "sliding", To: "dp-basics"}, {From: "dp-basics", To: "knapsack"}, {From: "dp-basics", To: "dp-strings"},
	{From: "knapsack", To: "bitmask"}, {From: "dp-strings", To: "digit-dp"},
	{From: "flow", To: "systems"}, {From: "flow", To: "concurrency"}, {From: "knapsack", To: "distributed"},
	{From: "systems", To: "concurrency"}, {From: "systems", To: "distributed"},
}

func buildSkillTree(progress *model.ProfileProgress, tasks, solved []*codeeditordomain.Task) *v1.GetSkillTreeResponse {
	moduleProgress := buildNodeProgress(tasks, solved)
	currentNodeID := selectCurrentNode(moduleProgress)

	resp := &v1.GetSkillTreeResponse{
		SelectedNodeId: currentNodeID,
		BranchStats:    buildBranchStats(moduleProgress, currentNodeID),
		Nodes:          buildNodes(moduleProgress, currentNodeID),
		Edges:          buildEdges(),
		Modules:        buildModules(progress, moduleProgress, currentNodeID),
	}
	if resp.SelectedNodeId == "" && len(resp.Nodes) > 0 {
		resp.SelectedNodeId = resp.Nodes[0].GetId()
	}
	return resp
}

func buildTaskView(node *nodeDefinition, task *codeeditordomain.Task) *TaskView {
	if node == nil || task == nil {
		return nil
	}
	publicCases := sortCases(task.PublicTestCases)
	examples := make([]*v1.TrainingTaskExample, 0, minInt(2, len(publicCases)))
	visibleTests := make([]*v1.TrainingTestCase, 0, len(publicCases))
	for index, testCase := range publicCases {
		visibleTests = append(visibleTests, &v1.TrainingTestCase{
			Id:       testCase.ID.String(),
			Input:    testCase.Input,
			Expected: testCase.ExpectedOutput,
			Hidden:   false,
		})
		if index < 2 {
			examples = append(examples, &v1.TrainingTaskExample{
				Input:  testCase.Input,
				Output: testCase.ExpectedOutput,
			})
		}
	}

	return &TaskView{
		ModuleID:     node.ID,
		TaskID:       task.ID.String(),
		Title:        task.Title,
		Topic:        node.Title,
		Difficulty:   mapTaskDifficulty(task.Difficulty),
		Statement:    task.Statement,
		Examples:     examples,
		Constraints:  buildConstraints(task),
		StarterCodes: buildStarterCodes(task),
		VisibleTests: visibleTests,
		Hints:        append([]string(nil), node.Hints...),
		RewardLabels: rewardLabelsForNode(node, int32(len(task.PublicTestCases)+len(task.HiddenTestCases))),
		SourceTaskID: task.ID,
		SourceTask:   task,
	}
}

func expandJudgeResult(testCases []*model.CodeTestCase, judge taskjudge.Result) []*v1.TrainingTestResult {
	results := make([]*v1.TrainingTestResult, 0, len(testCases))
	for index, testCase := range sortCases(testCases) {
		status := v1.TrainingTestStatus_TRAINING_TEST_STATUS_PASS
		actual := testCase.ExpectedOutput
		if int32(index+1) > judge.PassedCount {
			status = v1.TrainingTestStatus_TRAINING_TEST_STATUS_FAIL
			if int32(index+1) == judge.FailedTestIndex {
				actual = judge.LastOutput
				if actual == "" {
					actual = judge.LastError
				}
			} else if int32(index+1) > judge.FailedTestIndex && judge.FailedTestIndex > 0 {
				actual = ""
			}
		}
		results = append(results, &v1.TrainingTestResult{
			Id:        testCase.ID.String(),
			Input:     testCase.Input,
			Expected:  testCase.ExpectedOutput,
			Hidden:    !testCase.IsPublic,
			Status:    status,
			RuntimeMs: judge.RuntimeMs,
			Actual:    actual,
		})
	}
	return results
}

func buildNodeProgress(tasks, solved []*codeeditordomain.Task) map[string]nodeProgress {
	progress := make(map[string]nodeProgress, len(trainingNodes))
	for _, node := range trainingNodes {
		progress[node.ID] = nodeProgress{}
	}
	for _, task := range tasks {
		for _, nodeID := range matchTaskNodes(task) {
			stats := progress[nodeID]
			stats.Total++
			progress[nodeID] = stats
		}
	}
	for _, task := range solved {
		for _, nodeID := range matchTaskNodes(task) {
			stats := progress[nodeID]
			if stats.Solved < stats.Total || stats.Total == 0 {
				stats.Solved++
			}
			progress[nodeID] = stats
		}
	}
	return progress
}

func selectCurrentNode(progress map[string]nodeProgress) string {
	var fallback string
	for _, node := range trainingNodes {
		if !nodeAvailable(node, progress) || nodeMastered(node.ID, progress) {
			continue
		}
		if progress[node.ID].Solved > 0 {
			return node.ID
		}
		if fallback == "" {
			fallback = node.ID
		}
	}
	if fallback != "" {
		return fallback
	}
	return "graph-dfs"
}

func buildBranchStats(progress map[string]nodeProgress, currentNodeID string) []*v1.TrainingBranchStat {
	order := []string{"core", "tree", "graph", "dp", "meta"}
	stats := make([]*v1.TrainingBranchStat, 0, len(order))
	for _, branch := range order {
		done := int32(0)
		total := int32(0)
		for _, node := range trainingNodes {
			if node.Branch != branch {
				continue
			}
			total++
			if nodeState(node, progress, currentNodeID) != "locked" {
				done++
			}
		}
		palette := branchPalettes[branch]
		stats = append(stats, &v1.TrainingBranchStat{
			Branch:     branch,
			Name:       palette.Name,
			Done:       done,
			Total:      total,
			ColorToken: palette.Color,
		})
	}
	return stats
}

func buildNodes(progress map[string]nodeProgress, currentNodeID string) []*v1.TrainingNode {
	nodes := make([]*v1.TrainingNode, 0, len(trainingNodes))
	for _, node := range trainingNodes {
		nodes = append(nodes, &v1.TrainingNode{
			Id:       node.ID,
			X:        node.X,
			Y:        node.Y,
			Label:    node.Label,
			State:    nodeState(node, progress, currentNodeID),
			Branch:   node.Branch,
			Keystone: node.Keystone,
		})
	}
	return nodes
}

func buildEdges() []*v1.TrainingEdge {
	edges := make([]*v1.TrainingEdge, 0, len(trainingEdges))
	for _, edge := range trainingEdges {
		edges = append(edges, &v1.TrainingEdge{FromNodeId: edge.From, ToNodeId: edge.To})
	}
	return edges
}

func buildModules(progressData *model.ProfileProgress, progress map[string]nodeProgress, currentNodeID string) []*v1.TrainingModule {
	modules := make([]*v1.TrainingModule, 0, len(trainingNodes))
	for _, node := range trainingNodes {
		stats := progress[node.ID]
		state := nodeState(node, progress, currentNodeID)
		progressPct, projectsDone := computeModuleProgress(stats, node.Projects, state == "current")
		rewards := rewardLabelsForNode(&node, stats.Total)
		description := node.SpecialDesc
		if description == "" {
			description = defaultDescription(node, state, stats.Total)
		}
		if node.ID == currentNodeID && progressData != nil && progressData.Overview.PracticePassedSessions > 0 && progressPct == nil {
			derived := int32(minInt(95, int(progressData.Overview.LevelProgress*100)))
			if derived > 0 {
				progressPct = &derived
				projectsDone = minInt32(node.Projects, maxInt32(1, int32((derived*node.Projects)/100)))
			}
		}
		modules = append(modules, &v1.TrainingModule{
			NodeId:       node.ID,
			Title:        node.Title,
			Description:  description,
			Tasks:        stats.Total,
			Projects:     node.Projects,
			Hours:        node.Hours,
			Rewards:      rewards,
			Prereq:       append([]string(nil), node.Prereq...),
			Unlocks:      append([]string(nil), node.Unlocks...),
			ProgressPct:  progressPct,
			TasksSolved:  minInt32(stats.Solved, stats.Total),
			ProjectsDone: projectsDone,
			ActionUrl:    "/training/task/" + node.ID,
		})
	}
	return modules
}

func rewardLabelsForNode(node *nodeDefinition, taskCount int32) []string {
	if node == nil {
		return []string{"+200 ✦", "+40 gold"}
	}
	if len(node.Rewards) > 0 {
		return append([]string(nil), node.Rewards...)
	}
	xp := 160 + taskCount*20
	gold := 20 + taskCount*5
	if xp <= 160 {
		xp = 200
	}
	if gold <= 20 {
		gold = 40
	}
	rewards := []string{fmt.Sprintf("+%d ✦", xp), fmt.Sprintf("+%d gold", gold)}
	if node.Keystone {
		rewards = append(rewards, "keystone unlock")
	}
	return rewards
}

func buildConstraints(task *codeeditordomain.Task) []string {
	constraints := []string{}
	switch task.Difficulty {
	case model.TaskDifficultyEasy:
		constraints = append(constraints, "Aim for a clear linear or near-linear solution.")
	case model.TaskDifficultyMedium:
		constraints = append(constraints, "Expect at least one data-structure or traversal invariant.")
	case model.TaskDifficultyHard:
		constraints = append(constraints, "Expect a composed state machine or multi-step optimization.")
	}
	if task.DurationSeconds > 0 {
		constraints = append(constraints, fmt.Sprintf("Recommended solve window: %d minutes.", maxInt(1, int(task.DurationSeconds/60))))
	}
	if len(task.PublicTestCases)+len(task.HiddenTestCases) > 0 {
		constraints = append(constraints, fmt.Sprintf("%d total tests in the live judge.", len(task.PublicTestCases)+len(task.HiddenTestCases)))
	}
	return constraints
}

func buildStarterCodes(task *codeeditordomain.Task) []*v1.TrainingStarterCode {
	if task == nil {
		return nil
	}
	starterGo := strings.TrimSpace(extractGoStarter(task))
	starterPython := strings.TrimSpace(extractPythonStarter(task))
	starterCodes := make([]*v1.TrainingStarterCode, 0, 2)
	if starterPython != "" {
		starterCodes = append(starterCodes, &v1.TrainingStarterCode{
			Language: v1.TrainingProgrammingLanguage_TRAINING_PROGRAMMING_LANGUAGE_PYTHON,
			Code:     ensureTrailingNewline(starterPython),
		})
	}
	if starterGo != "" {
		starterCodes = append(starterCodes, &v1.TrainingStarterCode{
			Language: v1.TrainingProgrammingLanguage_TRAINING_PROGRAMMING_LANGUAGE_GO,
			Code:     ensureTrailingNewline(starterGo),
		})
	}
	return starterCodes
}

func mapTaskDifficulty(value model.TaskDifficulty) v1.TrainingTaskDifficulty {
	switch value {
	case model.TaskDifficultyEasy:
		return v1.TrainingTaskDifficulty_TRAINING_TASK_DIFFICULTY_EASY
	case model.TaskDifficultyMedium:
		return v1.TrainingTaskDifficulty_TRAINING_TASK_DIFFICULTY_MEDIUM
	case model.TaskDifficultyHard:
		return v1.TrainingTaskDifficulty_TRAINING_TASK_DIFFICULTY_HARD
	default:
		return v1.TrainingTaskDifficulty_TRAINING_TASK_DIFFICULTY_UNSPECIFIED
	}
}

func mapProgrammingLanguage(value v1.TrainingProgrammingLanguage, fallback model.ProgrammingLanguage) (policy.Language, string) {
	switch value {
	case v1.TrainingProgrammingLanguage_TRAINING_PROGRAMMING_LANGUAGE_PYTHON:
		return policy.LanguagePython, "python"
	case v1.TrainingProgrammingLanguage_TRAINING_PROGRAMMING_LANGUAGE_GO:
		return policy.LanguageGo, "go"
	default:
		switch fallback {
		case model.ProgrammingLanguagePython:
			return policy.LanguagePython, "python"
		default:
			return policy.LanguageGo, "go"
		}
	}
}

func findNodeDefinition(moduleID string) *nodeDefinition {
	for _, node := range trainingNodes {
		if node.ID == moduleID {
			copied := node
			return &copied
		}
	}
	return nil
}

func nodeState(node nodeDefinition, progress map[string]nodeProgress, currentNodeID string) string {
	if !nodeAvailable(node, progress) {
		return "locked"
	}
	if node.ID == currentNodeID && !nodeMastered(node.ID, progress) {
		return "current"
	}
	return "unlocked"
}

func nodeAvailable(node nodeDefinition, progress map[string]nodeProgress) bool {
	if node.InitiallyUnlocked || len(node.Prereq) == 0 {
		return true
	}
	for _, prereq := range node.Prereq {
		if !nodeMastered(prereq, progress) {
			return false
		}
	}
	return true
}

func nodeMastered(nodeID string, progress map[string]nodeProgress) bool {
	stats, ok := progress[nodeID]
	return ok && stats.Total > 0 && stats.Solved >= stats.Total
}

func computeModuleProgress(stats nodeProgress, projects int32, visible bool) (*int32, int32) {
	if !visible || stats.Total == 0 || stats.Solved == 0 {
		return nil, 0
	}
	pct := int32((float64(stats.Solved) / float64(stats.Total)) * 100)
	if pct < 1 {
		pct = 1
	}
	if pct > 100 {
		pct = 100
	}
	done := int32((float64(pct) / 100) * float64(projects))
	if done == 0 && pct > 0 {
		done = 1
	}
	if done > projects {
		done = projects
	}
	return &pct, done
}

func defaultDescription(node nodeDefinition, state string, total int32) string {
	switch state {
	case "locked":
		return "Locked. Clear the prior nodes in this branch to unlock the module."
	case "current":
		if total > 0 {
			return fmt.Sprintf("Your current module. %d live tasks are already in the catalog for this topic.", total)
		}
		return "Your current module. The progression shell is ready, but the task catalog for this topic is still filling up."
	default:
		if total > 0 {
			return "A series of tasks and mini-projects on this topic."
		}
		return "This module is unlocked, but the task catalog for it is still sparse."
	}
}

func matchTaskNodes(task *codeeditordomain.Task) []string {
	if task == nil {
		return nil
	}
	seen := map[string]struct{}{}
	matches := make([]string, 0, 2)
	taskTopics := normalizeTopics(task.Topics)
	for _, node := range trainingNodes {
		for _, alias := range node.Topics {
			if _, ok := taskTopics[normalizeTopic(alias)]; ok {
				if _, exists := seen[node.ID]; !exists {
					seen[node.ID] = struct{}{}
					matches = append(matches, node.ID)
				}
				break
			}
		}
	}
	return matches
}

func sortCases(cases []*model.CodeTestCase) []*model.CodeTestCase {
	result := append([]*model.CodeTestCase(nil), cases...)
	for i := 0; i < len(result); i++ {
		for j := i + 1; j < len(result); j++ {
			if result[j].Order < result[i].Order {
				result[i], result[j] = result[j], result[i]
			}
		}
	}
	return result
}

func normalizeTopics(topics []string) map[string]struct{} {
	normalized := make(map[string]struct{}, len(topics))
	for _, topic := range topics {
		key := normalizeTopic(topic)
		if key != "" {
			normalized[key] = struct{}{}
		}
	}
	return normalized
}

func normalizeTopic(value string) string {
	value = strings.TrimSpace(strings.ToLower(value))
	value = strings.ReplaceAll(value, " ", "-")
	value = strings.ReplaceAll(value, "_", "-")
	return value
}

func extractGoStarter(task *codeeditordomain.Task) string {
	if task == nil {
		return "func solve(input string) string {\n\treturn \"\"\n}\n"
	}
	trimmed := strings.TrimSpace(task.StarterCode)
	if task.RunnerMode == model.RunnerModeFunctionIO {
		index := strings.Index(trimmed, "func solve(")
		if index >= 0 {
			snippet := strings.TrimSpace(trimmed[index:])
			if mainIndex := strings.Index(snippet, "\nfunc main("); mainIndex >= 0 {
				snippet = strings.TrimSpace(snippet[:mainIndex])
			}
			return snippet
		}
	}
	if trimmed != "" {
		return trimmed
	}
	return "func solve(input string) string {\n\treturn \"\"\n}\n"
}

func extractPythonStarter(task *codeeditordomain.Task) string {
	if task == nil {
		return "def solve(input: str) -> str:\n    return \"\"\n"
	}
	trimmed := strings.TrimSpace(task.StarterCode)
	index := strings.Index(trimmed, "def solve(")
	if index >= 0 {
		return strings.TrimSpace(trimmed[index:])
	}
	if trimmed != "" && task.Language == model.ProgrammingLanguagePython {
		return trimmed
	}
	return "def solve(input: str) -> str:\n    return \"\"\n"
}

func ensureTrailingNewline(value string) string {
	if value == "" {
		return value
	}
	if !strings.HasSuffix(value, "\n") {
		return value + "\n"
	}
	return value
}

func minInt(a, b int) int {
	if a < b {
		return a
	}
	return b
}

func minInt32(a, b int32) int32 {
	if a < b {
		return a
	}
	return b
}

func maxInt(a, b int) int {
	if a > b {
		return a
	}
	return b
}

func maxInt32(a, b int32) int32 {
	if a > b {
		return a
	}
	return b
}
