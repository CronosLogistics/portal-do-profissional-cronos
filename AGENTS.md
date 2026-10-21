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
- Content reads go through `requireSupabaseAuth` server functions (`content.functions.ts`, `partners.functions.ts`). Why: anonymous visitors must not read portal data.
- Public sign-up is disabled; accounts are created only by admin invite, and users set their password at `/definir-senha` (also used for password reset). Why: admin-invite-only access model.
