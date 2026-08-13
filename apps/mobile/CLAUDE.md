@AGENTS.md

---

## Android Emulator Testing

When an Android emulator is running, Claude may control it through ADB for E2E testing without asking Darrell to tap through flows manually.

**Preferred ADB path:**
```
$HOME/android-sdk/platform-tools/adb
```
If that doesn't exist, use the Windows SDK bridge:
```
/mnt/c/Users/dpjr1/AppData/Local/Android/Sdk/platform-tools/adb.exe
```

**Before any test session:**
1. `adb devices` — confirm exactly one emulator/device is listed
2. `adb exec-out screencap -p > /tmp/screen.png` — establish current state

**Allowed ADB test actions:**
- `adb exec-out screencap -p` — screenshot
- `adb shell input tap <x> <y>` — tap
- `adb shell input swipe <x1> <y1> <x2> <y2> <ms>` — swipe
- `adb shell input text '<text>'` — type text
- `adb shell input keyevent <code>` — key events (4=back, 3=home, 66=enter)
- `adb shell am force-stop com.gshc.playerpass` — kill app
- `adb shell monkey -p com.gshc.playerpass -c android.intent.category.LAUNCHER 1` — relaunch
- `adb logcat -d -s ReactNativeJS:V` — read JS logs

**E2E test protocol:**
1. Take screenshot to see current state
2. Navigate/tap through the flow autonomously
3. Screenshot after each significant state change
4. Verify expected UI text (read from screenshot)
5. PASS/FAIL each behavior being tested
6. Stop on destructive/account-affecting actions unless the test account is explicitly marked disposable

**Test package ID:** `com.gshc.playerpass`

---

## Claude + Codex Collaboration

Codex is available as an MCP tool in this session. Claude is the orchestrator; Codex is the independent reviewer/second engineer.

**Tools available:**
- `mcp__codex__codex` — start a Codex session
- `mcp__codex__codex-reply` — continue an existing Codex thread by threadId

**Role split:**
- **Claude:** orchestration, repo state, implementation, emulator E2E, commits
- **Codex:** independent code review, bug finding, alternative implementation proposals, security/logic checks

**Workflow for non-trivial changes:**
1. Claude inspects the problem and implements a fix
2. Claude delegates an independent review to Codex (`mcp__codex__codex` with `sandbox: read-only`)
3. Claude compares findings — accept Codex corrections, flag disagreements
4. Claude applies fixes if needed and re-verifies TypeScript
5. Claude commits; Codex may review the diff

**Rules:**
- Never let both agents edit the same file concurrently
- If parallel work is needed, use separate git worktrees/branches
- Claude always makes the final commit decision
- Codex review findings should be labeled AGREE/PARTIAL/DISAGREE with rationale

---

## Overnight Autonomous Mode

When Darrell is away, Claude may work autonomously. Safe work only.

**Safe without asking:**
- Read repo, inspect files, search code
- Fix scoped bugs with TypeScript/lint verification
- Non-destructive refactors
- Codex reviews of changes before committing
- Android emulator E2E on the test account
- Small atomic commits with descriptive messages
- Update Obsidian ActiveWork and START-HERE

**Always stop and wait for Darrell before:**
- Production DB schema changes or migrations
- Clerk/Vercel/EAS key or secret changes
- DNS or domain changes
- App Store credential/provisioning changes
- Deleting real user data
- Billing or payment configuration
- Broad architecture changes
- Merging conflicting parallel work without review

**End of autonomous session:** write a summary to Obsidian START-HERE with:
- commits made (hash + description)
- PASS/FAIL for each tested behavior
- bugs found but not fixed (and why)
- exact human actions needed next
