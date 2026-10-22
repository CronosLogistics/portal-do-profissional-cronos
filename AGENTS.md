<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture rules
- Every portal page lives under `src/routes/_authenticated/` (whole portal requires login); only `/auth` and `/definir-senha` are public. Why: internal employee portal.
- Main menu modules are declared once in `src/lib/portal-modules.ts`; add a route + one entry there to add a module. Why: new modules without rebuilding navigation or auth.
- Roles live in `public.user_roles` (`admin`, `rh` = content editor, `funcionario`); account status in `public.profiles.is_active`. RLS uses `has_role` / `is_editor` / `is_active_user`. Why: permissions enforced in the database, not just the UI.
- User administration (invite, edit, activate/deactivate) runs only in `src/lib/users.functions.ts` server functions that call `requireAdmin` before using the admin client; deactivation also bans the auth user. Why: no client can grant itself access.
- Benefits/partners/rewards/offices/site texts are read live, read-only, from the legacy Espaço do Profissional database via `src/lib/legacy-content.server.ts`, inside `requireSupabaseAuth` server functions; relative file URLs are rewritten to the legacy site origin. Why: GP keeps editing in the legacy /admin, single source of content, and anonymous visitors cannot read through the portal.
- The portal admin parent renders a source-panel gateway for all content routes and mounts its Outlet only for user administration; content tabs link to the legacy editor. Why: local content forms must not save records that legacy-backed portal pages cannot display.
- Public sign-up is disabled; accounts are created only by admin invite, and users set their password at `/definir-senha` (also used for password reset). Why: admin-invite-only access model.

- Render portal navigation once through PortalShell in the authenticated parent layout; child pages contain only their content. Why: every existing and future module shares scalable navigation without duplicating the shell.
- Login registration runs once per session via `registrarAcesso` (src/lib/access.functions.ts) in the _authenticated gate; profile identity fields come from Microsoft (Graph /me or the verified auth identity), never from browser input. Why: the professionals table must mirror Entra, not user-editable data.
- Daily Entra sync lives in `src/lib/entra-sync.server.ts` (pure rules in `entra-sync.rules.ts`), triggered by the managed schedule calling `/api/public/jobs/entra-sync` or an admin's `syncNow`; it matches by `entra_oid` (email only before linking), mirrors name/email/employee ID/accountEnabled, bans disabled accounts, and records the run in the singleton `status_sincronizacao`. Why: Microsoft is the source of truth for professionals.
