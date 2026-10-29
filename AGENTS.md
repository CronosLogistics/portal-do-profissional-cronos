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
- Access is profile-based: `perfis` + `perfil_permissoes` (fixed catalog in `src/lib/permissions.ts`, mirrored by a DB CHECK) + `usuario_perfis`; RLS and server checks use `tem_permissao`/`usuario_tem_permissao` (legacy `has_role`/`is_editor` now delegate to it; `user_roles` is deprecated). DB triggers protect the system Administrador profile and its last active member. Why: admins grant access from the panel without code changes, enforced in the database.
- User administration (invite, edit, activate/deactivate) runs only in `src/lib/users.functions.ts` server functions that call `requireAdmin` before using the admin client; deactivation also bans the auth user. Why: no client can grant itself access.
- Benefits/partners/rewards/offices/site texts live only in this portal's database (migrated once from the legacy Espaço do Profissional), are read via `requireSupabaseAuth` server functions and edited in the internal /admin forms. Why: single, fully internal source of content.
- Public sign-up is disabled; accounts are created only by admin invite, and users set their password at `/definir-senha` (also used for password reset). Why: admin-invite-only access model.

- Render portal navigation once through PortalShell in the authenticated parent layout; child pages contain only their content. Why: every existing and future module shares scalable navigation without duplicating the shell.
- Login registration runs once per session via `registrarAcesso` (src/lib/access.functions.ts) in the _authenticated gate; profile identity fields come from Microsoft (Graph /me or the verified auth identity), never from browser input. Why: the professionals table must mirror Entra, not user-editable data.
- Daily Entra sync lives in `src/lib/entra-sync.server.ts` (pure rules in `entra-sync.rules.ts`), triggered by the managed schedule calling `/api/public/jobs/entra-sync` or an admin's `syncNow`; it matches by `entra_oid` (email only before linking), mirrors name/email/employee ID/accountEnabled, bans disabled accounts, and records the run (origin, who triggered it) in the singleton `status_sincronizacao`, guarded by a 10-minute `reservar_sincronizacao` lock. Why: Microsoft is the source of truth for professionals.
- Avisos (announcements) rules live in the database: RLS on `avisos`/`avisos_leituras`, the `avisos_antes_gravar` trigger (HTML sanitizing, "editado" mark, locked sender/date after publishing) and RPCs `listar_avisos`, `contar_nao_lidos`, `avisos_enviados`; the UI only calls them via `src/lib/avisos-client.ts`, and realtime/polling/tab-title run once in PortalShell via `useAvisosAoVivo`. Why: rules can't be bypassed from the browser console.
- Home carousel (`src/components/portal/HomeCarrossel.tsx`) has 4 fixed positions (Cronos Day, mural, Insider, compilado); each slide only renders when it has current content. Cronos Insider/compilado are `avisos` rows with `tipo` (locked after insert, Insider requires `avisos.insider`), the slide reads `insider_vigente()` (3 Brazil days), and both open in the large reader modal (`leitor-modal` via `AvisoLeitura`). Why: one source for the aviso, slide and bell, rules enforced in the database.
