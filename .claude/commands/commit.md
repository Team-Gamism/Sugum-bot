Perform the following steps in order to git commit the current project changes.

## Steps

1. Run `git status --porcelain` to check the list of changed files.
   - If there are no changes, notify "No changes to commit." and exit.

2. Run `git diff HEAD` to analyze the changes.
   - If there are no staged changes, also check unstaged changes with `git diff`.

3. Based on the changed files and content, write a commit message in Conventional Commits format in English.
   - Format: `type: subject` (choose from feat / fix / refactor / docs / chore)
   - Summarize the changes concisely
   - Example: `feat: add /report slash command`

4. Show me the generated commit message and proceed with the commit.

5. Stage all changes with `git add -A`, then commit with `git commit -m "..."`.

6. After the commit, run `git log --oneline -1` to verify and display the result.
