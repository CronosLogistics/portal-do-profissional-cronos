# Portal do Profissional Cronos

Build the portal in this new project. Espacodoprofissionalcronos is the starting point, Cadastro de Treinamento becomes the Treinamentos tab, and Cronos Insights is the model for login and user management.

## What was found
- **Espacodoprofissionalcronos**: public pages (Início, Benefícios, Recompensas, Parceiros, Categorias, partner detail pages) plus an admin area for editing content. Its records live in its own database.
- **Cadastro de Treinamento**: a guide page only (process timeline, gamification, scoring table, sign-up buttons). Every sign-up button opens a SharePoint form. It stores no data.
- **Cronos Insights**: email and password login, a set-password page reached from an email link, a user management page (invite, edit, turn accounts on or off, change roles) and two roles, admin and usuario.

## What gets built
1. **Base portal**: copy the screens, components, logo, hero video and visual style from Espacodoprofissionalcronos. Rename the app to "Portal do Profissional".
2. **Treinamentos tab**: add it to the main menu next to the current tabs, as its own page in the portal. It shows the guide with the same process, gamification, scoring table, images and SharePoint links, restyled to match the portal.
3. **Login**: the whole portal requires login. It includes a show/hide password option, field checks with clear error messages, "forgot password", a set-password page, logout and a session that stays signed in.
4. **User management (admins only)**: invite users by email, list and search users, edit name, employee ID and role, turn accounts on or off, block duplicate emails and ask for confirmation before admin actions. The invited person sets their own password from the email link.
5. **Roles**: Administrador and Funcionário. Permissions are checked on the server and in the database, not just by hiding buttons. Employees can only see their own profile. Admins manage users and content.
6. **Room for new modules**: one list defines the menu and module pages, so new areas (pendências, feedbacks, comunicados) can be added later without rebuilding the menu or login.
7. **Cronos colors**: Vinho #470C1F for the header and navigation, Cherry #AC145A for highlights and selected states, Cronos #E31C79 for main buttons and links, with white and light-gray backgrounds.

## What you'll need to do
- **Data**: open the Espacodoprofissionalcronos chat and export partners, benefits, rewards, categories, images and home-page content as CSV. Then upload the files here and I'll import them. Until then, the content pages show "nothing registered yet" messages instead of made-up content.
- **First admin**: after launch, tell me which email should be the first administrator.
- **Old logins**: accounts from the old apps can't be moved over, so users must be invited again.

## Technical details
- Enable Lovable Cloud and email login. Copy the base project's table structure (partners, benefits, benefit_images, reward_programs, categories, site content and storage buckets) in migrations.
- Use the Insights role pattern: an `app_role` enum (admin, funcionario), a separate `user_roles` table and a security-definer `has_role` function. Add a `profiles` table (name, email, employee ID, active flag) with row-level security limiting it to the user's own row or to admins.
- Admin operations (invite, deactivate, change role) run as server functions with `requireSupabaseAuth`. Each one checks `has_role` before using the admin client. Deactivated users are banned in auth and blocked in the database.
- All internal pages sit under the `_authenticated` layout. The admin area adds a second admin check. Asset pointers are re-uploaded from the source preview URL.
- Tests cover two rules: an employee cannot call the admin functions, and deactivated users are denied.
