Perform the following steps in order to commit and push the current project changes to the remote repository.

## Steps

1. Run `git status --porcelain` to check the list of changed files.
   - If there are no changes, skip to step 5 to push any unpushed commits.

2. Run `git diff HEAD` to analyze the changes.
   - If there are no staged changes, also check unstaged changes with `git diff`.

3. Based on the changed files and content, write a commit message in Conventional Commits format in English.
   - Format: `type: subject` (choose from feat / fix / refactor / docs / chore)
   - Summarize the changes concisely
   - Example: `feat: add /report slash command`

4. Stage all changes with `git add -A`, then commit with `git commit -m "..."`.

5. Run `git push` to push to the remote repository.
   - If the upstream is not set, run `git push -u origin HEAD` instead.

6. After the push, run `git log --oneline -1` to verify and display the result.
