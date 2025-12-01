# Frontend Project Guidelines

## Project Description

**Adha KG - AI-Powered Student Helper** is a modern web application designed to help students streamline their learning process through intelligent document management and AI-powered interactions. The application enables users to:

- **Upload and Process PDF Documents**: Upload PDF files and extract text information for instant access and analysis
- **AI-Powered Chat**: Engage in intelligent conversations with uploaded documents using advanced AI technology
- **Streamlined Learning**: Simplify study workflows and enhance understanding of complex topics through interactive document exploration

Built with **Next.js** and **Supabase**, the application provides a secure, scalable platform for students to manage their study materials and interact with them through natural language conversations.

---

This document explains how to work with this project's frontend codebase.  
Please follow these instructions to ensure consistency and avoid common issues.

---

## Package Management: Use `pnpm` Instead of `npm`

We use [`pnpm`](https://pnpm.io/) for managing dependencies.  
**Do not use `npm` or `yarn` for installing packages.**

### Why pnpm?

- Faster installs and better disk space usage.
- Prevents dependency conflicts.
- Consistent environment for all contributors.

### Common pnpm Commands

- **Install all dependencies:**  
  Run this after cloning the repo or pulling new changes.
  ```
  pnpm install
  ```
  Example output:
  ```
  Packages: +120
  +
  Progress: resolved 120, reused 120, downloaded 0, added 120
  ```
- **Add a new package:**
  ```
  pnpm add axios
  ```
- **Remove a package:**
  ```
  pnpm remove lodash
  ```
- **Run a script:**
  ```
  pnpm run dev
  ```

**Never run `npm install` or `yarn install` in this project.**  
This can break your environment and cause issues for others.

---

## Git Workflow: Always Use Rebase for Merging

To keep a clean commit history, **always use rebase** when integrating changes from `main` or other branches.

### Why Rebase?

- Keeps history linear and readable.
- Makes it easier to track changes.
- Avoids unnecessary merge commits.

### Example Workflow

1. **Fetch latest changes:**
   ```
   git fetch origin
   ```
2. **Rebase your branch onto the latest main:**
   ```
   git rebase origin/main
   ```
3. **Resolve any conflicts, then continue:**

   ```
   git rebase --continue
   ```

4. **Push your changes (force push if necessary):**
   ```
   git push --force-with-lease
   ```

### Why Force Push?

- After rebasing, your local branch history changes and no longer matches the remote branch.
- Force pushing updates the remote branch to match your local changes.
- It ensures your rebased commits are reflected correctly on the remote.

**Do not use `git merge` for integrating changes from main.**  
**Do not push directly to `main`.**  
Always create a feature branch, make your changes, and open a pull request.

#### Example Branch Workflow

1. Create a new branch:
   ```
   git checkout -b feature/my-new-feature
   ```
2. Work on your changes and commit them.
3. Rebase onto main as shown above.
4. Push your branch:
   ```
   git push origin feature/my-new-feature
   ```
5. Open a pull request for review.

---

For more details, see the [pnpm documentation](https://pnpm.io/) and
