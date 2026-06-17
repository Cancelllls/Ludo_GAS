## 2024-05-19 - Expensive O(n²) path computations running during idle render loops
**Learning:** The game's render loop runs `getValidMoves` continuously to render glowing auras on tokens. This function contains nested loops and blocking checks (`hasOpponentBlockade`) that scan all tokens, making it O(n²) and expensive to run 60-120 times per second while idle.
**Action:** Add an internal memoization cache directly inside state objects that tracks variables like `remainingRoll` and `turnCount`, and nullify it when state mutates (e.g., `moveToken` or network syncs).
