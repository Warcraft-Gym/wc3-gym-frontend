### **Current State**
The Draft View currently displays all players sorted by MMR (low to high), and users manually filter players as needed during the captain-led drafting process.

### **Problem**
The current approach has three pain points that slow down the draft process:

1. **Unqualified Players Not Filtered** — Players without enough competitive games (current threshold: 20 games in current or last season) appear in the draft pool, requiring manual exclusion
2. **Misrepresented Skill Levels** — Some players have actual skill levels higher than their W3C MMR reflects (e.g., Grinchy from GNL, or players on losing streaks), and these need manual reassignment to higher-tier groups
3. **Off-Race Players Underrated** — Players with higher MMR on their main race appear at lower ratings, requiring manual adjustment

### **Solution Overview**
Introduce two enhancements:

1. **Player Filtering** — Add ability to filter out players who don't meet the minimum game requirement during the draft process
2. **Custom MMR Override** — Allow temporarily assigning custom MMR values that override the player's W3C MMR for drafting purposes only (optionally persist for matching logic)

### **Detailed Requirements**

#### **1. Player Filtering**
- [ ] Add filter toggle/control to exclude players with insufficient games played
- [ ] Configurable game threshold (currently 20, consider moving to current season only)
- [ ] Filter persists during draft session but doesn't permanently modify player data

#### **2. Custom MMR Override**
- [ ] Add UI to assign temporary custom MMR values to individual players
- [ ] Custom MMR overrides W3C MMR display/sorting during draft (when defined)
- [ ] Custom MMR is optional and only considered when explicitly set
- [ ] Allow option to persist custom MMR for use in matching logic (separate from display)
- [ ] Prevent sync issues (custom MMR and W3C MMR should remain independent)

#### **3. UI/UX Improvement (Optional)**
- [ ] Consider pagination approach:
  - Page 1: Players needed (teams × 1 player per round)
  - Subsequent pages: Players with custom MMR adjustments applied
  - Allows workflow: assign custom MMR → move to appropriate tier → continue draft

### **Acceptance Criteria**
- [ ] Players with < 20 games can be filtered from view
- [ ] Custom MMR can be assigned to individual players
- [ ] Custom MMR overrides sorting and display (when set)
- [ ] Custom MMR is optional and doesn't affect players without it assigned
- [ ] No data sync issues between custom MMR and W3C MMR
- [ ] Draft functionality continues to work with filtered/custom MMR players
